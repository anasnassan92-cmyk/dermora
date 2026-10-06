/**
 * Database access with two drivers behind one tiny interface:
 *   - MySQL (mysql2) on Hostinger when DB_HOST is set
 *   - SQLite (node:sqlite, built into Node) locally and in tests
 * All SQL is written in the common subset of both: '?' placeholders, TEXT/VARCHAR ids
 * (UUIDs generated in code), ISO timestamps set by the app, JSON stored as text.
 */
import { config } from '../config.js';
import { MIGRATIONS } from './schema.js';

export type Row = Record<string, unknown>;

export interface Db {
  driver: 'mysql' | 'sqlite';
  all<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = Row>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

async function mysqlDb(): Promise<Db> {
  const mysql = await import('mysql2/promise');
  const pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
    connectionLimit: 5,
    charset: 'utf8mb4',
    multipleStatements: false,
  });
  return {
    driver: 'mysql',
    async all<T>(sql: string, params: unknown[] = []) {
      const [rows] = await pool.query(sql, params);
      return rows as T[];
    },
    async get<T>(sql: string, params: unknown[] = []) {
      const [rows] = await pool.query(sql, params);
      return (rows as T[])[0];
    },
    async run(sql: string, params: unknown[] = []) {
      const [res] = await pool.query(sql, params);
      return { changes: (res as { affectedRows?: number }).affectedRows ?? 0 };
    },
    async exec(sql: string) {
      await pool.query(sql);
    },
    async close() {
      await pool.end();
    },
  };
}

async function sqliteDb(file: string): Promise<Db> {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const norm = (params: unknown[]) => params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p ?? null)) as never[];
  return {
    driver: 'sqlite',
    async all<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...norm(params)) as T[];
    },
    async get<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).get(...norm(params)) as T | undefined;
    },
    async run(sql: string, params: unknown[] = []) {
      const r = db.prepare(sql).run(...norm(params));
      return { changes: Number(r.changes) };
    },
    async exec(sql: string) {
      db.exec(sql);
    },
    async close() {
      db.close();
    },
  };
}

let instance: Db | null = null;

export async function openDb(opts: { sqliteFile?: string } = {}): Promise<Db> {
  const db = config.db.host ? await mysqlDb() : await sqliteDb(opts.sqliteFile ?? config.db.sqliteFile);
  await migrate(db);
  instance = db;
  return db;
}

export function getDb(): Db {
  if (!instance) throw new Error('Database not opened');
  return instance;
}

/** Idempotent, versioned migrations, run on every start. */
async function migrate(db: Db): Promise<void> {
  await db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
  const row = await db.get<{ v: number | null }>('SELECT MAX(version) AS v FROM schema_version');
  const current = Number(row?.v ?? 0);
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    const statements = db.driver === 'mysql' ? m.mysql : m.sqlite;
    for (const stmt of statements) await db.exec(stmt);
    await db.run('INSERT INTO schema_version (version) VALUES (?)', [m.version]);
  }
}

export const now = () => new Date().toISOString();

export function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
