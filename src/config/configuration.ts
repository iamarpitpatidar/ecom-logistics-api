export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'courier_platform',
    logging: process.env.DB_LOGGING === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  couriers: {
    urbanebolt: {
      baseUrl: process.env.URBANEBOLT_BASE_URL || 'https://uat.urbanebolt.in',
      username: process.env.URBANEBOLT_USERNAME,
      password: process.env.URBANEBOLT_PASSWORD,
      customerCode: process.env.URBANEBOLT_CUSTOMER_CODE,
      timeout: parseInt(process.env.URBANEBOLT_TIMEOUT ?? '30000', 10),
      retryAttempts: parseInt(process.env.URBANEBOLT_RETRY_ATTEMPTS ?? '3', 10),
      retryDelay: parseInt(process.env.URBANEBOLT_RETRY_DELAY ?? '1000', 10),
    },
  },
  bulk: {
    concurrency: parseInt(process.env.BULK_CONCURRENCY ?? '10', 10),
    maxSize: parseInt(process.env.BULK_MAX_SIZE ?? '100', 10),
  },
  logLevel: process.env.LOG_LEVEL || 'info',
});
