import { initializeApp, getApps, getApp } from 'firebase/app';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { loadEnv } from './loadEnv';

loadEnv();

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const adminEmail = process.env.ADMIN_SEED_EMAIL;
const adminPassword = process.env.ADMIN_SEED_PASSWORD;

async function main(): Promise<void> {
  if (!adminEmail || !adminPassword) {
    console.error(
      'Missing ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD. Add them to `.env.local`.'
    );
    process.exit(1);
  }
  if (!config.projectId) {
    console.error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local');
    process.exit(1);
  }

  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);

  let uid: string;
  try {
    const cred = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    uid = cred.user.uid;
    console.log(` Created admin auth user: ${adminEmail}`);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      uid = cred.user.uid;
      console.log(` Admin auth user already exists; signed in: ${adminEmail}`);
    } else if (code === 'auth/operation-not-allowed') {
      console.error(
        'Firebase Email/Password authentication is not enabled. ' +
          'Enable "Email/Password" provider in Firebase Console > Authentication > Sign-in method.'
      );
      process.exit(1);
    } else {
      console.error(` Failed to create/sign-in admin: ${code ?? (e as Error).message}`);
      process.exit(1);
    }
  }

  const name = process.env.ADMIN_SEED_NAME || 'Green Decor Admin';
  await setDoc(
    doc(db, 'users', uid),
    {
      uid,
      name,
      email: adminEmail,
      role: 'admin',
      status: 'active',
      addresses: [],
      lastLogin: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  console.log(` Wrote users/${uid} with role=admin`);
  console.log('Seeding complete. You can now sign in at /admin/login');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});