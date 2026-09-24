'use client';

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { serializeForWrite } from '@/lib/firestore/serialize';

export interface DbResult<T> {
  data: T | null;
  error: string | null;
}

export async function createDoc(
  collectionName: string,
  data: object,
  id?: string
): Promise<DbResult<{ id: string }>> {
  try {
    const payload = { ...serializeForWrite(data), createdAt: serverTimestamp() };
    if (id) {
      await setDoc(doc(db, collectionName, id), payload);
      return { data: { id }, error: null };
    }
    const ref = await addDoc(collection(db, collectionName), payload);
    return { data: { id: ref.id }, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to create document' };
  }
}

export async function updateDocById(
  collectionName: string,
  id: string,
  data: object
): Promise<DbResult<{ id: string }>> {
  try {
    const payload = serializeForWrite(data) as Record<string, unknown>;
    await updateDoc(doc(db, collectionName, id), payload);
    return { data: { id }, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to update document' };
  }
}

export async function deleteDocById(
  collectionName: string,
  id: string
): Promise<DbResult<{ id: string }>> {
  try {
    await deleteDoc(doc(db, collectionName, id));
    return { data: { id }, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to delete document' };
  }
}

export async function setDocById(
  collectionName: string,
  id: string,
  data: object
): Promise<DbResult<{ id: string }>> {
  try {
    const payload = serializeForWrite(data) as Record<string, unknown>;
    await setDoc(doc(db, collectionName, id), payload, { merge: true });
    return { data: { id }, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to save document' };
  }
}

export async function fetchDocRaw(collectionName: string, id: string): Promise<Record<string, unknown> | null> {
  const snap = await getDoc(doc(db, collectionName, id));
  return snap.exists() ? snap.data() : null;
}

export { serverTimestamp };