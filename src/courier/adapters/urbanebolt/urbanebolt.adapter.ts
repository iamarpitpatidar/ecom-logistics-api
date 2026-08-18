import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError, type AxiosRequestConfig, type Method } from 'axios';
import {
  CourierAdapter,
  type CreateOrderInternalDto,
  type CourierCreateOrderResponse,
  type CourierTrackingResponse,
  type CourierCancelResponse,
  type CourierServiceabilityResponse,
} from '@/courier/interfaces/courier-adapter.interface';
import {
  CourierApiException,
  CourierTimeoutException,
  CourierAuthException,
} from '@/common/exceptions/courier.exception';
import { UrbaneBoltMapper } from './urbanebolt.mapper.js';
import type {
  UrbaneBoltManifestResponse,
  UrbaneBoltTrackingResponse,
  UrbaneBoltCancelResponse,
  UrbaneBoltPincodeResponse,
} from './urbanebolt.types.js';

@Injectable()
export class UrbaneBoltAdapter extends CourierAdapter {
  readonly name = 'urbanebolt';
  private readonly logger = new Logger(UrbaneBoltAdapter.name);
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly customerCode: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly tokenTtlMs = 3600000;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.baseUrl = this.configService.get<string>(
      'couriers.urbanebolt.baseUrl',
      'https://uat.urbanebolt.in',
    );
    this.username = this.configService.get<string>('couriers.urbanebolt.username', '');
    this.password = this.configService.get<string>('couriers.urbanebolt.password', '');
    this.customerCode = this.configService.get<string>('couriers.urbanebolt.customerCode', '');
    this.maxRetries = this.configService.get<number>('couriers.urbanebolt.retryAttempts', 3);
    this.retryDelay = this.configService.get<number>('couriers.urbanebolt.retryDelay', 1000);
  }

  async authenticate(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/v1/auth/getToken/`, {
          username: this.username,
          password: this.password,
        }),
      );

      this.token = response.data.token;
      this.tokenExpiry = new Date(Date.now() + this.tokenTtlMs);
      this.logger.log('UrbaneBolt authentication successful');
    } catch (error) {
      this.token = null;
      this.tokenExpiry = null;
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || error.message
          : 'Authentication failed';
      this.logger.error(`UrbaneBolt authentication failed: ${message}`);
      throw new CourierAuthException(this.name, message, error);
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.token || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  private async makeRequest<T>(
    method: Method,
    url: string,
    data?: unknown,
    params?: Record<string, string>,
  ): Promise<T> {
    await this.ensureAuthenticated();

    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const config: AxiosRequestConfig = {
          method,
          url,
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          data,
          params,
        };

        const response = await firstValueFrom(this.httpService.request<T>(config));
        return response.data;
      } catch (error) {
        lastError = error;

        if (error instanceof AxiosError) {
          if (error.response?.status === 401 && attempt === 1) {
            this.logger.warn('UrbaneBolt token expired, re-authenticating');
            this.token = null;
            this.tokenExpiry = null;
            await this.ensureAuthenticated();
            continue;
          }

          if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            throw new CourierTimeoutException(
              this.name,
              `Request timed out: ${method} ${url}`,
              error,
            );
          }

          if (error.response && error.response.status >= 400 && error.response.status < 500) {
            break;
          }
        }

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          this.logger.warn(
            `UrbaneBolt request failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delay}ms`,
          );
          await this.sleep(delay);
        }
      }
    }

    const message =
      lastError instanceof AxiosError
        ? lastError.response?.data?.message || lastError.message
        : 'Request failed';
    throw new CourierApiException(this.name, message, lastError);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async createOrder(order: CreateOrderInternalDto): Promise<CourierCreateOrderResponse> {
    const payload = [UrbaneBoltMapper.toManifestPayload(order, this.customerCode)];

    const response = await this.makeRequest<UrbaneBoltManifestResponse>(
      'POST',
      `${this.baseUrl}/api/v1/services/manifest/`,
      payload,
    );

    const isSuccess = response.status === 'success' || response.status === '200';
    const firstItem = response.data?.[0];

    if (!isSuccess || !firstItem) {
      return { success: false, rawResponse: response };
    }

    return {
      success: true,
      courierOrderId: firstItem.order_id,
      awbNumber: firstItem.awb,
      rawResponse: response,
    };
  }

  async trackShipment(awbNumber: string): Promise<CourierTrackingResponse> {
    const response = await this.makeRequest<UrbaneBoltTrackingResponse>(
      'GET',
      `${this.baseUrl}/api/v1/services/tracking-pub/`,
      undefined,
      { awb: awbNumber },
    );

    return UrbaneBoltMapper.toTrackingResponse(response);
  }

  async cancelOrder(awbNumber: string): Promise<CourierCancelResponse> {
    const response = await this.makeRequest<UrbaneBoltCancelResponse>(
      'POST',
      `${this.baseUrl}/api/v1/services/cancel/`,
      { awbs: awbNumber },
    );

    return UrbaneBoltMapper.toCancelResponse(response);
  }

  async checkServiceability(pincodes: string[]): Promise<CourierServiceabilityResponse> {
    const response = await this.makeRequest<UrbaneBoltPincodeResponse>(
      'GET',
      `${this.baseUrl}/api/v1/location/pincodes/`,
      undefined,
      { pincodes: pincodes.join(',') },
    );

    const isSuccess = response.status === 'success' || response.status === '200';

    return {
      serviceable: isSuccess && Array.isArray(response.data) && response.data.length > 0,
      details: response.data,
      rawResponse: response,
    };
  }
}
