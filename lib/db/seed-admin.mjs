// One-time script to seed the admin user profile into Postgres.
// Run with: DATABASE_URL="postgres://..." node lib/db/seed-admin.mjs
//
// This ensures the first user gets super_admin role
// instead of the default 'member' role.

import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ Set DATABASE_URL environment variable first.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

// ──────────────────────────────────────────────────────────
// UPDATE THESE VALUES with your actual Firebase UID and email.
// You can find your Firebase UID in the Firebase Console:
//   → Authentication → Users → find your email → copy the "User UID"
//
// If you don't know your UID, leave this empty and the first
// login will auto-create you as 'member'. Then run this script
// after to upgrade.
// ──────────────────────────────────────────────────────────

const ADMIN_USERS = [
  {
    firebase_uid: '<YOUR_FIREBASE_UID>',
    display_name: '<YOUR_NAME>',
    email: '<YOUR_EMAIL>',
    role: 'super_admin',
    modules: ['ra', 'pc'],
  },
];

async function main() {
  try {
    console.log('⏳ Connecting to Postgres...');
    await client.connect();
    console.log('✅ Connected!\n');

    for (const user of ADMIN_USERS) {
      if (!user.firebase_uid || user.firebase_uid.startsWith('<')) {
        console.log(`⚠  Skipping ${user.display_name} — no firebase_uid set.`);
        console.log('   Find it in Firebase Console → Authentication → Users\n');
        continue;
      }

      await client.query(
        `INSERT INTO user_profiles (firebase_uid, display_name, email, role, modules)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (firebase_uid) DO UPDATE SET
           role = EXCLUDED.role,
           modules = EXCLUDED.modules,
           display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
           email = COALESCE(EXCLUDED.email, user_profiles.email)`,
        [user.firebase_uid, user.display_name, user.email, user.role, JSON.stringify(user.modules)]
      );

      console.log(`✅ ${user.display_name} → role: ${user.role}, modules: ${user.modules.join(', ')}`);
    }

    // Show all profiles
    const result = await client.query('SELECT firebase_uid, display_name, email, role, modules FROM user_profiles');
    console.log('\n📋 All user profiles:');
    console.table(result.rows);

    console.log('\n✅ Done!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
