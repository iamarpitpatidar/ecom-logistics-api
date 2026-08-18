import { BadRequestException, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CourierAdapter, COURIER_ADAPTERS } from './interfaces/courier-adapter.interface.js';

@Injectable()
export class CourierFactoryService implements OnModuleInit {
  private readonly adaptersMap = new Map<string, CourierAdapter>();

  constructor(
    @Inject(COURIER_ADAPTERS)
    private readonly adapters: CourierAdapter[],
  ) {}

  onModuleInit() {
    for (const adapter of this.adapters) {
      this.adaptersMap.set(adapter.name.toLowerCase(), adapter);
    }
  }

  getAdapter(courierPartner: string): CourierAdapter {
    const adapter = this.adaptersMap.get(courierPartner.toLowerCase());

    if (!adapter) {
      throw new BadRequestException({
        message: `Courier partner "${courierPartner}" is not supported`,
        supported_couriers: this.getSupportedCouriers(),
      });
    }

    return adapter;
  }

  getSupportedCouriers(): string[] {
    return Array.from(this.adaptersMap.keys());
  }
}
