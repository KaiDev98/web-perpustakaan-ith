import { Global, Inject, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql, { type Pool } from 'mysql2/promise';
import type { AppEnv } from '../config/env.js';
import * as schema from './schema.js';

export const DB_POOL = Symbol('DB_POOL');
export const DB = Symbol('DB');
export type AppDatabase = MySql2Database<typeof schema>;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  constructor(
    @Inject(DB_POOL) private readonly pool: Pool,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async isReady(): Promise<boolean> {
    try {
      await this.pool.query({
        sql: 'SELECT 1',
        timeout: this.config.get('DB_READY_TIMEOUT_MS', { infer: true }),
      });
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DB_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>): Pool => mysql.createPool({
        host: config.get('DB_HOST', { infer: true }),
        port: config.get('DB_PORT', { infer: true }),
        database: config.get('DB_NAME', { infer: true }),
        user: config.get('DB_USER', { infer: true }),
        password: config.get('DB_PASSWORD', { infer: true }),
        connectionLimit: config.get('DB_POOL_LIMIT', { infer: true }),
        connectTimeout: config.get('DB_CONNECT_TIMEOUT_MS', { infer: true }),
        waitForConnections: true,
        enableKeepAlive: true,
        timezone: 'Z',
      }),
    },
    {
      provide: DB,
      inject: [DB_POOL],
      useFactory: (pool: Pool): AppDatabase => drizzle({ client: pool, schema, mode: 'default' }),
    },
    DatabaseService,
  ],
  exports: [DB, DB_POOL, DatabaseService],
})
export class DatabaseModule {}
