import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { signInWithEmailAndPassword, getAuth } from 'firebase/auth';
import { productsData } from '../src/lib/data/products';
import { servicesData } from '../src/lib/data/services';
import { testimonialsData } from '../src/lib/data/testimonials';
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

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.filter((v) => v !== undefined) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = v && typeof v === 'object' ? stripUndefined(v) : v;
    }
    return out as T;
  }
  return value;
}

async function main(): Promise<void> {
  if (!config.projectId) {
    console.error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local');
    process.exit(1);
  }

  const app = getApps().length ? getApp() : initializeApp(config);
  const db = getFirestore(app);

  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (adminEmail && adminPassword) {
    const auth = getAuth(app);
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log(`Signed in as ${adminEmail} for seeding.`);
  } else {
    console.warn('ADMIN_SEED_EMAIL/PASSWORD not set; writes may be denied by rules.');
  }

  console.log(`Seeding Firestore for project: ${config.projectId}`);
  const counts = new Map<string, number>();

  const seedCollection = async (
    collection: string,
    docs: { id: string }[]
  ): Promise<void> => {
    for (let start = 0; start < docs.length; start += 450) {
      const batch = writeBatch(db);
      const chunk = docs.slice(start, start + 450);
      for (const docData of chunk) {
        const { id, ...rest } = docData;
        batch.set(doc(db, collection, id), stripUndefined(rest), { merge: true });
      }
      await batch.commit();
    }
    counts.set(collection, (counts.get(collection) ?? 0) + docs.length);
    console.log(`  seeded ${collection}: ${docs.length} docs`);
  };

  await seedCollection('products', productsData);
  await seedCollection('services', servicesData);
  await seedCollection('testimonials', testimonialsData.map((t) => ({ ...t, approved: true })));

  // Default settings.general (shipping values mirror the store).
  await setDoc(
    doc(db, 'settings', 'general'),
    {
      whatsappNumber: '+923001234567',
      contactPhone: '+923001234567',
      contactEmail: 'hello@greendecor.pk',
      address: 'Lahore, Pakistan',
      workingHours: 'Monday â€“ Saturday, 10:00 AM â€“ 7:00 PM',
      shippingFreeThreshold: 4000,
      shippingFlatFee: 350,
      currencyLabel: 'PKR',
      deliveryCities: ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'],
      supportedProvinces: ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan'],
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  console.log('  seeded settings/general');

  // Default siteContent/home draft shell.
  await setDoc(
    doc(db, 'siteContent', 'home'),
    {
      published: false,
      updatedAt: serverTimestamp(),
      content: {
        heroSlides: [],
        purpose: {
          heading: 'Why Green Decor?',
          subcopy: 'We craft green spaces that feel like home.',
          pillars: [
            { label: 'Premium Plants', icon: 'Leaf' },
            { label: 'Turnkey Landscaping', icon: 'Trees' },
            { label: 'Aquatic Biotopes', icon: 'Fish' },
            { label: 'Care & Support', icon: 'Wrench' },
          ],
          quote: 'Bringing nature closer to modern living.',
        },
        trustBar: {
          stats: [
            { number: '10k+', label: 'Happy Customers' },
            { number: '500+', label: 'Plant Varieties' },
            { number: '50+', label: 'Cities Served' },
            { number: '4.9', label: 'Average Rating' },
          ],
          note: 'Loved across Pakistan',
        },
        servicesGrid: {
          heading: 'Our Services',
          subcopy: 'From single pots to full outdoor transformations.',
          serviceIds: servicesData.map((s) => s.id),
        },
        footer: {
          about: 'Green Decor is Pakistan\u2019s botanical lifestyle and landscape studio.',
          hours: 'Mon â€“ Sat: 10 AM â€“ 7 PM',
          credits: 'Â© Green Decor. All rights reserved.',
        },
      },
    },
    { merge: true }
  );
  console.log('  seeded siteContent/home');

  console.log('Firestore seed complete.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
