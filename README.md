# Multi-Courier Integration Platform

A production-grade NestJS backend for e-commerce logistics that provides a **unified API** across multiple courier partners. Couriers are pluggable — adding a new partner requires zero changes to controllers, DTOs, or business logic.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 11 |
| Language | TypeScript 6 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Queue | BullMQ + Redis 7 |
| Auth | better-auth (Bearer sessions) |
| Build | SWC |
| Test | Vitest |
| Lint/Format | oxlint + oxfmt |
| Package Manager | pnpm 11 |

## Quick Start

### Prerequisites

- Node.js >= 22
- pnpm >= 11
- PostgreSQL 16
- Redis 7

### Using Docker (recommended)

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:push
pnpm start:dev
```

### Manual Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your DB/Redis credentials

# 3. Push database schema
pnpm db:push

# 4. Run the server
pnpm start:dev
```

The API will be available at `http://localhost:3000/api/v1` and Swagger docs at `http://localhost:3000/docs`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `API_PREFIX` | API route prefix | `api/v1` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `DB_NAME` | Database name | `courier_platform` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `URBANEBOLT_BASE_URL` | UrbaneBolt API base URL | `https://uat.urbanebolt.in` |
| `URBANEBOLT_USERNAME` | UrbaneBolt auth username | — |
| `URBANEBOLT_PASSWORD` | UrbaneBolt auth password | — |
| `URBANEBOLT_CUSTOMER_CODE` | UrbaneBolt customer code | — |
| `URBANEBOLT_TIMEOUT` | Request timeout (ms) | `30000` |
| `URBANEBOLT_RETRY_ATTEMPTS` | Max retry attempts on failure | `3` |
| `URBANEBOLT_RETRY_DELAY` | Base delay between retries (ms) | `1000` |
| `BULK_CONCURRENCY` | Concurrent orders per batch chunk | `10` |
| `BULK_MAX_SIZE` | Max orders per bulk request | `100` |
| `LOG_LEVEL` | Logging level | `info` |

## API Endpoints

All endpoints are prefixed with `/api/v1` and require Bearer token authentication (except auth routes).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/orders` | Create a shipment order |
| GET | `/orders/:id` | Get order details + tracking history |
| GET | `/orders/track/:awb` | Track shipment by AWB number |
| POST | `/orders/cancel` | Cancel a shipment |
| POST | `/orders/bulk` | Submit up to 100 orders (async) |
| GET | `/orders/bulk/:batchId` | Get batch processing status |

## Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:cov
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm start:dev` | Start in development mode (watch) |
| `pnpm start:prod` | Start production build |
| `pnpm build` | Compile TypeScript via SWC |
| `pnpm test` | Run vitest suite |
| `pnpm lint` | Lint with oxlint |
| `pnpm format` | Format with oxfmt |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:push` | Push schema directly (dev) |
| `pnpm db:studio` | Open Drizzle Studio GUI |

## How to Add a New Courier

Adding a new courier requires **3 files** and **2 one-line changes**. No modifications to controllers, DTOs, services, or existing adapters.

See the full guide: [docs/adding-a-courier.md](docs/adding-a-courier.md)

## Documentation

| Document | Description |
|----------|-------------|
| [DESIGN.md](DESIGN.md) | Architecture, design patterns, DB schema, trade-offs |
| [docs/adding-a-courier.md](docs/adding-a-courier.md) | Step-by-step guide for integrating a new courier |
| [docs/enhancements.md](docs/enhancements.md) | Planned optimizations and improvements |
| [docs/postman-collection.json](docs/postman-collection.json) | Importable Postman collection for all endpoints |
| `/docs` (Swagger) | Interactive API docs at `http://localhost:3000/docs` |

## Included Courier Adapters

| Adapter | Purpose |
|---------|---------|
| `urbanebolt` | Production integration with UrbaneBolt UAT API |
| `shipcrazy` | Dummy/mock adapter for local development and testing (always succeeds) |

## Project Structure

```
src/
├── auth/            # better-auth integration, guards, decorators
├── bulk/            # BullMQ async batch processing
├── common/          # Shared DTOs, enums, filters, interceptors
├── config/          # Centralized configuration
├── courier/         # Pluggable courier architecture
│   ├── adapters/
│   │   ├── urbanebolt/   # Real courier integration
│   │   └── shipcrazy/    # Mock adapter for dev/test
│   └── interfaces/       # Abstract CourierAdapter contract
├── database/        # Drizzle ORM setup + schema
├── orders/          # Order CRUD, tracking, cancellation
└── main.ts          # Bootstrap + global middleware
```
