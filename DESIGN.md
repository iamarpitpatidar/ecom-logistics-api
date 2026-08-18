# Design Document

## Architecture Overview

The platform follows a **modular monolith** architecture built on NestJS. Each domain concern (orders, courier integration, bulk processing, auth) lives in its own module with clear boundaries and explicit exports.

```
┌──────────────────────────────────────────────────────────┐
│                     API Layer                             │
│   OrdersController    BulkController    AuthMiddleware    │
└────────────┬─────────────┬──────────────────────────────-┘
             │             │
┌────────────▼─────────────▼───────────────────────────────┐
│                  Service Layer                            │
│        OrdersService         BulkService                 │
└────────────┬─────────────────────┬───────────────────────┘
             │                     │
┌────────────▼─────────────────────▼───────────────────────┐
│              CourierFactoryService                        │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│   │UrbaneBolt  │  │ ShipCrazy  │  │  Future    │        │
│   │ Adapter    │  │  Adapter   │  │  Adapter   │        │
│   └────────────┘  └────────────┘  └────────────┘        │
└──────────────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────┐
│              Persistence Layer                            │
│   PostgreSQL (Drizzle ORM)      Redis (BullMQ)           │
└──────────────────────────────────────────────────────────┘
```

## Design Pattern: Strategy + Factory + Adapter

### Why this combination?

**Strategy Pattern** — Each courier implements the same abstract interface (`CourierAdapter`). The system selects the correct strategy at runtime based on the `courier_partner` field in the request.

**Factory Pattern** — `CourierFactoryService` maintains a registry of all adapters (discovered via DI at boot) and resolves the correct one by name. Callers never instantiate adapters directly.

**Adapter Pattern** — Each courier's raw API has a different contract (request format, response shape, authentication flow). The adapter translates between our internal normalized DTO and the external API, completely hiding courier-specific details from the rest of the system.

### Why not a simple if/else or switch?

- **Open/Closed Principle** — Adding a courier means adding a class, not modifying existing branching logic.
- **Testability** — Each adapter is independently unit-testable without coupling to others.
- **Separation of concerns** — Courier-specific mapping logic lives in its own directory, not scattered across services.

## Database Schema

### `orders` table

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| courier_partner | VARCHAR | e.g. "urbanebolt" |
| courier_order_id | VARCHAR | ID returned by courier API |
| awb_number | VARCHAR | Air Waybill / tracking number |
| order_number | VARCHAR (UNIQUE) | Idempotency key |
| status | ENUM | ShipmentStatus values |
| customer_code | VARCHAR | — |
| service_type | VARCHAR | FORWARD / REVERSE |
| pay_mode | VARCHAR | PREPAID / COD |
| declared_value | NUMERIC(10,2) | — |
| collectable_value | NUMERIC(10,2) | — |
| weight | NUMERIC(10,3) | kg |
| dimensions | JSONB | `{height, length, breadth}` |
| sender | JSONB | Full address object |
| receiver | JSONB | Full address object |
| return_address | JSONB | Full address object |
| invoice | JSONB | `{number, date, value}` |
| request_payload | JSONB | Audit: what was sent to courier |
| response_payload | JSONB | Audit: what courier returned |
| error_message | TEXT | Failure reason (if any) |
| batch_id | VARCHAR | Links to bulk batch job |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | Auto-updated |

**Indexes:** awb_number, order_number, batch_id, courier_partner, status.

### `tracking_history` table (append-only)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| order_id | UUID (FK) | References orders.id |
| awb_number | VARCHAR | Denormalized for fast lookup |
| status | VARCHAR | Status at this point in time |
| status_description | TEXT | Human-readable description |
| location | VARCHAR | Where the event occurred |
| raw_payload | JSONB | Full courier response for this event |
| event_timestamp | TIMESTAMPTZ | When the event actually happened |
| created_at | TIMESTAMPTZ | When we recorded it |

**Indexes:** order_id, awb_number, event_timestamp.

### Why JSONB for addresses?

Courier address schemas vary wildly. Storing as JSONB avoids schema migrations every time a new courier needs an extra field (e.g. `landmark`, `company_name`). The TypeScript interface enforces structure at the application layer while the DB remains flexible.

## Bulk Processing

### Design Choice: Async queue with batch ID polling

When a client posts 100 orders, the endpoint immediately returns a `batchId` and enqueues the work into BullMQ. The client polls `GET /orders/bulk/:batchId` for status.

### Why not synchronous processing?

- A single HTTP request processing 100 courier API calls would take 30-60 seconds (each external call ~300-600ms).
- HTTP timeouts, connection drops, and gateway limits make this fragile.
- The queue approach lets the system remain responsive and enables horizontal scaling via dedicated worker processes.

### Concurrency control

Orders within a batch are processed in configurable chunks (default: 10 concurrent). `Promise.allSettled` ensures partial failures don't kill the entire batch — each order gets an independent success/failure result.

### Idempotency

The `order_number` column has a UNIQUE constraint. Submitting the same order twice returns a conflict error, preventing duplicate shipments.

## Error Handling Strategy

All errors are normalized into a single shape:

```json
{
  "success": false,
  "error": {
    "code": "COURIER_TIMEOUT",
    "message": "Request to UrbaneBolt timed out after 30000ms",
    "request_id": "uuid",
    "details": []
  }
}
```

**Error codes:** `VALIDATION_ERROR`, `COURIER_NOT_FOUND`, `COURIER_API_ERROR`, `COURIER_TIMEOUT`, `COURIER_AUTH_FAILED`, `ORDER_NOT_FOUND`, `ORDER_ALREADY_EXISTS`, `ORDER_CANNOT_CANCEL`, `BULK_PARTIAL_FAILURE`, `INTERNAL_ERROR`.

Courier-specific errors (raw 4xx/5xx) are caught inside adapters and re-thrown as typed exceptions (`CourierApiException`, `CourierTimeoutException`, `CourierAuthException`). The global exception filter maps these to the normalized response shape. Raw courier error details never leak to the client.

## Retry & Re-auth

The UrbaneBolt adapter implements:
- **Exponential backoff** on 5xx/timeout errors (configurable attempts + base delay).
- **Automatic re-authentication** on 401 — clears the cached token, re-authenticates, retries the original request once.
- **Circuit-breaking** — after max retries exhausted, the failure is persisted with error context for later reconciliation.

## Trade-offs

| Decision | Pro | Con |
|----------|-----|-----|
| Async bulk via BullMQ | Non-blocking, horizontally scalable, resilient to failures | Requires Redis, adds polling complexity for clients |
| JSONB for addresses/payloads | Schema-flexible, no migrations for new courier fields | Harder to query individual address fields (mitigated by indexes on key columns) |
| Abstract class over interface for CourierAdapter | Enables instanceof checks in factory, clearer DI contract | Slightly less flexible than pure interfaces for composition |
| Global module for CourierFactory | Any module can resolve couriers without explicit imports | Tight coupling potential (mitigated by only exporting the factory, not adapters) |
| SWC over tsc for build | ~10x faster compilation | Doesn't type-check (separate `tsc --noEmit` step needed for CI) |
| Drizzle over TypeORM | Type-safe queries, lightweight, no runtime schema sync magic | Smaller ecosystem, less opinionated migration tooling |
| better-auth over Passport | Modern, lightweight, built-in session management | Newer library, smaller community |
