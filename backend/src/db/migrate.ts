// Applies schema.sql. Run with: npm run migrate (requires DATABASE_URL).
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, getPool } from './pool.js';

const here = dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = await readFile(join(here, 'schema.sql'), 'utf8');
  const pool = getPool();
  await pool.query(sql);
  console.log('Migration applied.');
  await closePool();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
