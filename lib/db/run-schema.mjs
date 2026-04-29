// One-time script to create tables in Postgres
// Run with: DATABASE_URL="postgres://..." node lib/db/run-schema.mjs

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ Set DATABASE_URL environment variable first.');
  console.error('   Example: DATABASE_URL="postgres://user:pass@host:port/db" node lib/db/run-schema.mjs');
  process.exit(1);
}

const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
const client = new pg.Client({ connectionString: DATABASE_URL });

try {
  console.log('⏳ Connecting to Postgres...');
  await client.connect();
  console.log('✅ Connected!\n');

  console.log('⏳ Running schema.sql...');
  await client.query(sql);
  console.log('✅ Schema created successfully!\n');

  // Verify tables across all schemas
  const result = await client.query(
    "SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('pc', 'ra', 'public') ORDER BY schemaname, tablename"
  );
  console.log('📋 Tables in database:');
  result.rows.forEach(row => console.log(`   • ${row.schemaname}.${row.tablename}`));
  console.log(`\n✅ Done! ${result.rows.length} tables found.`);
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
