/**
 * seed-auth.ts
 * 
 * One-shot script to create the 3 demo accounts in Firebase Authentication.
 * Run once after deploying: npx tsx src/seed-auth.ts
 */

import admin from 'firebase-admin';

const PROJECT_ID = 'clarity-health-a9113e';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const DEMO_USERS = [
  {
    email: 'patient@clarity.com',
    password: 'Clarity2024!',
    displayName: 'Mxolisi Blessed Masuku',
  },
  {
    email: 'reviewer@clarity.com',
    password: 'Clarity2024!',
    displayName: 'Dr. Medical Reviewer',
  },
  {
    email: 'cimas_exec@cimas.co.zw',
    password: 'Clarity2024!',
    displayName: 'Cimas Executive',
  },
];

async function seed() {
  console.log('Seeding Firebase Auth demo users...');
  for (const u of DEMO_USERS) {
    try {
      const existing = await admin.auth().getUserByEmail(u.email).catch(() => null);
      if (existing) {
        // Update password in case it changed
        await admin.auth().updateUser(existing.uid, { password: u.password });
        console.log(`✓ Updated: ${u.email} (uid: ${existing.uid})`);
      } else {
        const created = await admin.auth().createUser({
          email: u.email,
          password: u.password,
          displayName: u.displayName,
          emailVerified: true,
        });
        console.log(`✓ Created: ${u.email} (uid: ${created.uid})`);
      }
    } catch (err: any) {
      console.error(`✗ Failed for ${u.email}:`, err.message);
    }
  }
  console.log('\nDone! Demo accounts are ready in Firebase Auth.');
  process.exit(0);
}

seed();
