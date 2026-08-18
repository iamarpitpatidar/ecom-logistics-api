declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: string;
    PORT?: string;
    API_PREFIX?: string;

    DB_HOST?: string;
    DB_PORT?: string;
    DB_USERNAME?: string;
    DB_PASSWORD?: string;
    DB_NAME?: string;
    DB_LOGGING?: string;

    REDIS_HOST?: string;
    REDIS_PORT?: string;

    URBANEBOLT_BASE_URL?: string;
    URBANEBOLT_USERNAME?: string;
    URBANEBOLT_PASSWORD?: string;
    URBANEBOLT_CUSTOMER_CODE?: string;
    URBANEBOLT_TIMEOUT?: string;
    URBANEBOLT_RETRY_ATTEMPTS?: string;
    URBANEBOLT_RETRY_DELAY?: string;

    BULK_CONCURRENCY?: string;
    BULK_MAX_SIZE?: string;

    LOG_LEVEL?: string;
  }
}
