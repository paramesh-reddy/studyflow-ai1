import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import { DatabaseSync } from 'node:sqlite';
import { runPgMigrations, runSqliteMigrations } from './migrations.ts';

export interface DbClient {
  dialect: 'postgres' | 'sqlite';
  pgvectorEnabled: boolean;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  execute(sql: string, params?: unknown[]): Promise<{ rowCount: number }>;
  transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>;
}

let activeClient: DbClient | null = null;
let pgPool: Pool | null = null;
let sqliteDb: DatabaseSync | null = null;

function convertPgParamsToSqlite(sql: string, params: unknown[]): { sql: string; params: Array<string | number | null> } {
  const orderedParams: Array<string | number | null> = [];
  const convertedSql = sql.replace(/\$(\d+)/g, (_match, numStr: string) => {
    const idx = Number(numStr) - 1;
    const val = params[idx];
    if (val === undefined || val === null) {
      orderedParams.push(null);
    } else if (typeof val === 'boolean') {
      orderedParams.push(val ? 1 : 0);
    } else if (val instanceof Date) {
      orderedParams.push(val.toISOString());
    } else {
      orderedParams.push(val as string | number);
    }
    return '?';
  });
  return { sql: convertedSql, params: orderedParams };
}

function createPgClientFromQueryable(
  queryable: Pool | PoolClient,
  pgvectorEnabled: boolean,
  isInTx: boolean = false
): DbClient {
  return {
    dialect: 'postgres',
    pgvectorEnabled,
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
      const res = await queryable.query(sql, params);
      return res.rows as T[];
    },
    async queryOne<T = Record<string, unknown>>(
      sql: string,
      params: unknown[] = []
    ): Promise<T | undefined> {
      const res = await queryable.query(sql, params);
      return res.rows[0] as T | undefined;
    },
    async execute(sql: string, params: unknown[] = []): Promise<{ rowCount: number }> {
      const res = await queryable.query(sql, params);
      return { rowCount: res.rowCount ?? 0 };
    },
    async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
      if (isInTx) {
        return fn(this);
      }
      const client = await (queryable as Pool).connect();
      try {
        await client.query('BEGIN');
        const txClient = createPgClientFromQueryable(client, pgvectorEnabled, true);
        const result = await fn(txClient);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

function createSqliteClient(db: DatabaseSync, isInTx: boolean = false): DbClient {
  return {
    dialect: 'sqlite',
    pgvectorEnabled: false,
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
      const converted = convertPgParamsToSqlite(sql, params);
      return db.prepare(converted.sql).all(...converted.params) as T[];
    },
    async queryOne<T = Record<string, unknown>>(
      sql: string,
      params: unknown[] = []
    ): Promise<T | undefined> {
      const converted = convertPgParamsToSqlite(sql, params);
      return db.prepare(converted.sql).get(...converted.params) as T | undefined;
    },
    async execute(sql: string, params: unknown[] = []): Promise<{ rowCount: number }> {
      const converted = convertPgParamsToSqlite(sql, params);
      const info = db.prepare(converted.sql).run(...converted.params);
      return { rowCount: Number(info.changes || 0) };
    },
    async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
      if (isInTx) {
        return fn(this);
      }
      db.exec('BEGIN;');
      try {
        const txClient = createSqliteClient(db, true);
        const result = await fn(txClient);
        db.exec('COMMIT;');
        return result;
      } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
      }
    },
  };
}

export async function initDatabase(): Promise<DbClient> {
  if (activeClient) return activeClient;

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    pgPool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });
    pgPool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err.message);
    });
    const pgvectorEnabled = await runPgMigrations(pgPool);
    activeClient = createPgClientFromQueryable(pgPool, pgvectorEnabled);
    return activeClient;
  }

  sqliteDb = new DatabaseSync(':memory:');
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  runSqliteMigrations(sqliteDb);
  activeClient = createSqliteClient(sqliteDb);
  return activeClient;
}

export function createIsolatedDatabase(dbPath: string = ':memory:'): DbClient {
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  runSqliteMigrations(db);
  sqliteDb = db;
  activeClient = createSqliteClient(db);
  return activeClient;
}

export function getDb(): DbClient {
  if (!activeClient) {
    throw new Error('Database has not been initialized. Call initDatabase() first.');
  }
  return activeClient;
}

export async function closeDb(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
  activeClient = null;
}

export function toIsoString(val: string | Date | null | undefined): string | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

export function toBool(val: boolean | number | null | undefined): boolean {
  return val === true || val === 1;
}
