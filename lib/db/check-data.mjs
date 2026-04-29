// Quick utility to check row counts across all tables.
// Run with: DATABASE_URL="postgres://..." node lib/db/check-data.mjs

import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ Set DATABASE_URL environment variable first.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const tables = ['pc.companies', 'ra.companies', 'pc.upload_jobs', 'ra.upload_jobs',
    'pc.generation_jobs', 'ra.generation_jobs', 'pc.output_files',
    'ra.output_files', 'public.user_profiles'];

for (const t of tables) {
    const r = await client.query(`SELECT count(*) FROM ${t}`);
    console.log(`${t}: ${r.rows[0].count} rows`);
}
await client.end();
