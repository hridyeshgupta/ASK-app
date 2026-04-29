// Verify all table schemas match our design
// Run with: DATABASE_URL="postgres://..." node lib/db/verify-schema.mjs

import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ Set DATABASE_URL environment variable first.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

try {
  await client.connect();

  const tables = [
    'pc.companies', 'pc.upload_jobs', 'pc.generation_jobs', 'pc.output_files',
    'ra.companies', 'ra.upload_jobs', 'ra.generation_jobs', 'ra.output_files',
    'public.user_profiles'
  ];

  for (const table of tables) {
    const [schema, name] = table.split('.');
    const r = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_schema = $1 AND table_name = $2 
       ORDER BY ordinal_position`,
      [schema, name]
    );
    console.log(`\n═══ ${table} (${r.rows.length} columns) ═══`);
    r.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = col.column_default ? ` [default: ${col.column_default}]` : '';
      console.log(`  ${col.column_name.padEnd(22)} ${col.data_type.padEnd(30)} ${nullable}${def}`);
    });
  }
} catch (err) {
  console.error('❌ Error:', err.message);
} finally {
  await client.end();
}
