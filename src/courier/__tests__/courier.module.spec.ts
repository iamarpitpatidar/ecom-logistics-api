import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CourierModule } from '../courier.module.js';
import { CourierFactoryService } from '../courier-factory.service.js';

describe('CourierModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ couriers: { urbanebolt: { timeout: 5000 } } })],
        }),
        CourierModule,
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide CourierFactoryService', () => {
    const factory = module.get<CourierFactoryService>(CourierFactoryService);
    expect(factory).toBeDefined();
    expect(factory).toBeInstanceOf(CourierFactoryService);
  });

  it('should start with empty adapters when none registered', () => {
    const factory = module.get<CourierFactoryService>(CourierFactoryService);
    factory.onModuleInit();
    expect(factory.getSupportedCouriers()).toHaveLength(0);
  });
});
