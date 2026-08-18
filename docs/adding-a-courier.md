# Adding a New Courier Partner

Adding a new courier requires **3 files** and **2 one-line changes**. No modifications to controllers, DTOs, services, or existing adapters.

## Step 1: Create the adapter

Create `src/courier/adapters/<name>/<name>.adapter.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  CourierAdapter,
  type CreateOrderInternalDto,
  type CourierCreateOrderResponse,
  type CourierTrackingResponse,
  type CourierCancelResponse,
  type CourierServiceabilityResponse,
} from '@/courier/interfaces/courier-adapter.interface';

@Injectable()
export class DelhiveryAdapter extends CourierAdapter {
  readonly name = 'delhivery';
  private readonly logger = new Logger(DelhiveryAdapter.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async authenticate(): Promise<void> {
    // Implement courier-specific auth (token fetch, API key validation, etc.)
  }

  async createOrder(order: CreateOrderInternalDto): Promise<CourierCreateOrderResponse> {
    // 1. Map internal DTO -> courier-specific payload
    // 2. Call courier API
    // 3. Map courier response -> CourierCreateOrderResponse
    return { success: true, awbNumber: '...', courierOrderId: '...', rawResponse: {} };
  }

  async trackShipment(awbNumber: string): Promise<CourierTrackingResponse> {
    // Call tracking API, map statuses to ShipmentStatus enum
    return { success: true, currentStatus: 'IN_TRANSIT', trackingEvents: [], rawResponse: {} };
  }

  async cancelOrder(awbNumber: string): Promise<CourierCancelResponse> {
    // Call cancel API
    return { success: true, message: 'Cancelled', rawResponse: {} };
  }

  async checkServiceability(pincodes: string[]): Promise<CourierServiceabilityResponse> {
    // Check if courier services the given pincodes
    return { serviceable: true, details: [], rawResponse: {} };
  }
}
```

## Step 2: Create the barrel export

Create `src/courier/adapters/<name>/index.ts`:

```typescript
export { DelhiveryAdapter } from './delhivery.adapter.js';
```

## Step 3: Register in CourierModule

In `src/courier/courier.module.ts`, add two references:

```typescript
import { DelhiveryAdapter } from './adapters/delhivery/index.js';

// In providers array:
providers: [
  UrbaneBoltAdapter,
  ShipCrazyAdapter,
  DelhiveryAdapter, // <-- add
  {
    provide: COURIER_ADAPTERS,
    useFactory: (urbanebolt, shipcrazy, delhivery) => [urbanebolt, shipcrazy, delhivery],
    inject: [UrbaneBoltAdapter, ShipCrazyAdapter, DelhiveryAdapter], // <-- add
  },
  CourierFactoryService,
],
```

## Step 4 (optional): Add config

If the courier needs credentials, add them to `src/config/configuration.ts`:

```typescript
couriers: {
  urbanebolt: { ... },
  delhivery: {
    baseUrl: process.env.DELHIVERY_BASE_URL,
    apiKey: process.env.DELHIVERY_API_KEY,
    timeout: parseInt(process.env.DELHIVERY_TIMEOUT ?? '30000', 10),
  },
},
```

## How it works

`CourierFactoryService` collects all adapters injected via the `COURIER_ADAPTERS` token at boot and indexes them by their `name` property. When a request comes in with `"courierPartner": "delhivery"`, the factory resolves the correct adapter — no switch statements, no routing changes.

## Tips

- Create a mapper class (`<name>.mapper.ts`) to isolate payload transformations.
- Create a types file (`<name>.types.ts`) for courier-specific API interfaces.
- Use `@/courier/interfaces/courier-adapter.interface` for imports (NOT the `@/courier` barrel — avoids circular deps).
- See `src/courier/adapters/urbanebolt/` for a full production example with retry logic, re-auth, and status mapping.
- See `src/courier/adapters/shipcrazy/` for a minimal mock implementation.
