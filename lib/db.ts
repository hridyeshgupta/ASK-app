// lib/db.ts
// Postgres connection pool for server-side use (API routes, server components).
// Uses the 'pg' library. Connection string comes from .env.local (DATABASE_URL).
//
// IMPORTANT: This file must ONLY be imported in server-side code:
//   - app/api/**/route.ts  (API routes)
//   - Server Components
//   - Server Actions
// Never import this in 'use client' components.

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep connection pool small for serverless-like Next.js API routes
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Log connection errors (don't crash the process)
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err);
});

/**
 * Execute a SQL query against Postgres.
 * @example
 *   const { rows } = await query('SELECT * FROM companies WHERE module = $1', ['pc']);
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number | null }> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[DB] ${duration}ms | ${text.substring(0, 80)}...`);
  }

  return { rows: result.rows as T[], rowCount: result.rowCount };
}

/**
 * Get a client from the pool for transactions.
 * Remember to release() when done!
 */
export async function getClient() {
  const client = await pool.connect();
  return client;
}

export default pool;
