import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

export const DRIZZLE = Symbol('DRIZZLE');
export type DrizzleDB = NodePgDatabase;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const pool = new pg.Pool({
          host: config.get<string>('database.host'),
          port: config.get<number>('database.port'),
          user: config.get<string>('database.username'),
          password: config.get<string>('database.password'),
          database: config.get<string>('database.name'),
        });

        return drizzle(pool, {
          logger: config.get<boolean>('database.logging'),
        });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
