import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CourierFactoryService } from '../courier-factory.service.js';
import { CourierAdapter, COURIER_ADAPTERS } from '../interfaces/courier-adapter.interface.js';

class FakeAdapterA extends CourierAdapter {
  readonly name = 'fake-a';
  authenticate = vi.fn().mockResolvedValue(undefined);
  createOrder = vi.fn().mockResolvedValue({ success: true, rawResponse: {} });
  trackShipment = vi.fn().mockResolvedValue({
    success: true,
    currentStatus: 'IN_TRANSIT',
    trackingEvents: [],
    rawResponse: {},
  });
  cancelOrder = vi.fn().mockResolvedValue({ success: true, rawResponse: {} });
  checkServiceability = vi
    .fn()
    .mockResolvedValue({ serviceable: true, details: [], rawResponse: {} });
}

class FakeAdapterB extends CourierAdapter {
  readonly name = 'fake-b';
  authenticate = vi.fn().mockResolvedValue(undefined);
  createOrder = vi.fn().mockResolvedValue({ success: true, rawResponse: {} });
  trackShipment = vi.fn().mockResolvedValue({
    success: true,
    currentStatus: 'DELIVERED',
    trackingEvents: [],
    rawResponse: {},
  });
  cancelOrder = vi.fn().mockResolvedValue({ success: true, rawResponse: {} });
  checkServiceability = vi
    .fn()
    .mockResolvedValue({ serviceable: true, details: [], rawResponse: {} });
}

describe('CourierFactoryService', () => {
  let service: CourierFactoryService;
  let adapterA: FakeAdapterA;
  let adapterB: FakeAdapterB;

  beforeEach(async () => {
    adapterA = new FakeAdapterA();
    adapterB = new FakeAdapterB();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourierFactoryService,
        { provide: COURIER_ADAPTERS, useValue: [adapterA, adapterB] },
      ],
    }).compile();

    service = module.get<CourierFactoryService>(CourierFactoryService);
    service.onModuleInit();
  });

  describe('getAdapter', () => {
    it('should return the correct adapter by name', () => {
      expect(service.getAdapter('fake-a')).toBe(adapterA);
      expect(service.getAdapter('fake-b')).toBe(adapterB);
    });

    it('should be case-insensitive', () => {
      expect(service.getAdapter('FAKE-A')).toBe(adapterA);
      expect(service.getAdapter('Fake-B')).toBe(adapterB);
    });

    it('should throw BadRequestException for unknown courier', () => {
      expect(() => service.getAdapter('unknown')).toThrow(BadRequestException);
    });

    it('should include supported couriers list in error', () => {
      try {
        service.getAdapter('nonexistent');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        expect(response.supported_couriers).toContain('fake-a');
        expect(response.supported_couriers).toContain('fake-b');
      }
    });
  });

  describe('getSupportedCouriers', () => {
    it('should return all registered courier names', () => {
      const couriers = service.getSupportedCouriers();
      expect(couriers).toHaveLength(2);
      expect(couriers).toContain('fake-a');
      expect(couriers).toContain('fake-b');
    });
  });

  describe('with no adapters registered', () => {
    it('should throw for any courier name', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [CourierFactoryService, { provide: COURIER_ADAPTERS, useValue: [] }],
      }).compile();

      const emptyService = module.get<CourierFactoryService>(CourierFactoryService);
      emptyService.onModuleInit();

      expect(() => emptyService.getAdapter('anything')).toThrow(BadRequestException);
      expect(emptyService.getSupportedCouriers()).toHaveLength(0);
    });
  });
});
