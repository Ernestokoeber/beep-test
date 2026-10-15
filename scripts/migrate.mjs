import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDirectory = resolve(root, 'migrations');
const rollback = process.argv.includes('--down');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL fehlt');
if (rollback && process.env.ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK !== 'yes') {
  throw new Error('Rollback ist destruktiv. Nur auf einer Datenbankkopie mit ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK=yes ausführen.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'development' ? undefined : { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000
});

const client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock(hashtext('courthub-schema-migrations'))");
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
  )`);

  const files = (await readdir(migrationsDirectory))
    .filter(file => /^\d{8}_\d{4}_[a-z0-9_]+\.sql$/.test(file))
    .sort();

  if (rollback) {
    const applied = await client.query('SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1');
    const version = applied.rows[0]?.version;
    if (!version) {
      console.log('keine Migration zum Zurückrollen');
    } else {
      const sql = await readFile(resolve(migrationsDirectory, `${version}.down.sql`), 'utf8');
      await client.query(sql);
      console.log('zurückgerollt', version);
    }
  } else for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    const applied = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [version]);
    if (applied.rowCount > 0) {
      console.log('übersprungen', version);
      continue;
    }
    const sql = await readFile(resolve(migrationsDirectory, file), 'utf8');
    await client.query(sql);
    console.log('angewendet', version);
  }
} finally {
  try { await client.query("SELECT pg_advisory_unlock(hashtext('courthub-schema-migrations'))"); } catch {}
  client.release();
  await pool.end();
}
