# Planned Enhancements

## Performance

- **Idempotent upsert** — Replace SELECT-then-INSERT with `INSERT ... ON CONFLICT DO NOTHING RETURNING *` for race-free single-roundtrip idempotency.
- **Tracking dedup** — Add composite unique index `(order_id, event_timestamp, status)` on `tracking_history` so `onConflictDoNothing` actually triggers.
- **Streaming concurrency for bulk** — Replace chunked `for` loop with `p-limit` semaphore for lower wall-clock time.
- **Shared auth token** — Store courier tokens in Redis with TTL instead of per-instance memory (multi-container safe).
- **DB pool tuning** — Add configurable `max`, `min`, `idleTimeoutMillis` to pg Pool.

## Architecture

- **Auto-discovery for adapters** — Use `DiscoveryService` + `@CourierPartner('name')` decorator to eliminate manual registration in `courier.module.ts`.
- **Circuit breaker** — Add `opossum` per adapter to fail-fast after consecutive failures.
- **Batch completion webhook** — Optional `callbackUrl` in bulk DTO to push results instead of polling.
- **Dedicated worker entrypoint** — Separate BullMQ worker process from HTTP server in docker-compose.
- **Structured logging** — Wire up `nest-winston` with JSON transport for observability tooling.

## Code Quality

- **Fix exception filter field names** — `request.body?.order_id` / `courier_partner` should be `orderNumber` / `courierPartner` to match DTOs.
- **Structured validation errors** — Return per-field `{ field, message }` array instead of joined string.
- **Per-adapter timeouts** — Move HTTP timeout from module-level to per-request in each adapter.
- **Pincode as string** — Avoid `parseInt` which drops leading zeros.

## Security

- **Remove real credentials from `.env.example`** — Use placeholders only.
- **Restrict CORS origins** — Configure allowed origins from env instead of open `enableCors()`.
- **Fail on missing auth secret** — Throw at boot in production if `AUTH_SECRET` is unset.
- **Body size limit** — Add `express.json({ limit: '1mb' })` to prevent oversized payloads.

## Compliance with Spec

- **Route alignment** — Change tracking to `GET /orders/:id/track` and cancel to `POST /orders/:id/cancel` to match assignment spec.
- **Rate limiting** — Implement `@nestjs/throttler` guard (error code already exists).
- **Health check** — Register `@nestjs/terminus` health module (dependency already installed).
- **Committed migrations** — Generate and commit Drizzle migration SQL for production deployments.
