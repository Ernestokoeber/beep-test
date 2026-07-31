import pg from 'pg';

const { Pool } = pg;

let pool = globalThis.__beepTestPool;
if (!pool) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'development' ? undefined : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000
  });
  globalThis.__beepTestPool = pool;
}

export function query(text, params) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL fehlt');
  return pool.query(text, params);
}

export async function transaction(callback) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL fehlt');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
