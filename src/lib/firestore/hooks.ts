'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  QueryConstraint,
  orderBy,
  limit as limitQuery,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { deserializeDoc } from '@/lib/firestore/serialize';

export interface UseFirestoreCollectionOptions {
  where?: QueryConstraint[];
  live?: boolean;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
}

export interface UseFirestoreCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFirestoreCollection<T extends object>(
  collectionName: string,
  options?: UseFirestoreCollectionOptions
): UseFirestoreCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const where = options?.where;
  const orderByField = options?.orderByField;
  const orderDirection = options?.orderDirection;
  const cap = options?.limit;
  const live = options?.live !== false;

  const buildQuery = useCallback(() => {
    const ref = collection(db, collectionName);
    const constraints: QueryConstraint[] = [...(where ?? [])];
    if (orderByField) {
      constraints.push(orderBy(orderByField, orderDirection ?? 'asc'));
    }
    if (cap) {
      constraints.push(limitQuery(cap));
    }
    return constraints.length ? query(ref, ...constraints) : ref;
  }, [collectionName, where, orderByField, orderDirection, cap]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(buildQuery());
      const docs = snap.docs.map((d) => deserializeDoc<T>({ id: d.id, ...d.data() }));
      setData(docs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch collection');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    if (!live) {
      refetch();
      return;
    }
    const unsub = onSnapshot(
      buildQuery(),
      (snap) => {
        const docs = snap.docs.map((d) => deserializeDoc<T>({ id: d.id, ...d.data() }));
        setData(docs);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(e instanceof Error ? e.message : 'Failed to fetch collection');
        setLoading(false);
      }
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildQuery]);

  return { data, loading, error, refetch };
}

export interface UseFirestoreDocResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFirestoreDoc<T extends object>(
  collectionName: string,
  docId: string | null | undefined
): UseFirestoreDocResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!docId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, collectionName, docId));
      if (snap.exists()) {
        setData(deserializeDoc<T>({ id: snap.id, ...snap.data() }));
      } else {
        setData(null);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch document');
    } finally {
      setLoading(false);
    }
  }, [collectionName, docId]);

  useEffect(() => {
    if (!docId) {
      setLoading(false); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, collectionName, docId),
      (snap) => {
        if (snap.exists()) {
          setData(deserializeDoc<T>({ id: snap.id, ...snap.data() }));
        } else {
          setData(null);
        }
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(e instanceof Error ? e.message : 'Failed to fetch document');
        setLoading(false);
      }
    );
    return unsub;
  }, [collectionName, docId]);

  return { data, loading, error, refetch };
}