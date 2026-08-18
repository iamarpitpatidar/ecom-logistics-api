import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import configuration from './src/config/configuration.js';

const config = configuration();

export default defineConfig({
  schema: './src/database/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: config.database.host,
    port: config.database.port,
    user: config.database.username,
    password: config.database.password,
    database: config.database.name,
  },
});
