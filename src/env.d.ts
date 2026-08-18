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

    AUTH_SECRET?: string;
    AUTH_BASE_URL?: string;
    AUTH_BASE_PATH?: string;
    AUTH_SSO_ENABLED?: string;
    AUTH_SSO_CLIENT_ID?: string;
    AUTH_SSO_CLIENT_SECRET?: string;
    AUTH_SSO_DISCOVERY_URL?: string;
    AUTH_SCIM_ENABLED?: string;

    LOG_LEVEL?: string;
  }
}
