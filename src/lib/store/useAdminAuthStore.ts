'use client';

import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile, UserRole } from '@/types';
import { deserializeDoc } from '@/lib/firestore/serialize';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { serverTimestamp } from '@/lib/firestore/crud';

interface AdminAuthStore {
  adminUser: UserProfile | null;
  isAdmin: boolean;
  isAuthReady: boolean;
  loginError: string | null;
  init: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  updatePassword: (email: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  clearLoginError: () => void;
}

async function loadProfile(uid: string, fallbackEmail: string, fallbackName: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
  if (snap.exists()) {
    return deserializeDoc<UserProfile>({ uid: snap.id, ...snap.data() });
  }
  // Auto-bootstrap: if the user doc is missing, create it with role 'customer'.
  const profile: UserProfile = {
    uid,
    name: fallbackName || 'Green Decor User',
    email: fallbackEmail,
    role: 'customer' as UserRole,
    status: 'active',
    addresses: [],
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, COLLECTIONS.users, uid), {
    uid,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    status: profile.status,
    addresses: [],
    createdAt: serverTimestamp(),
  });
  return profile;
}

export const useAdminAuthStore = create<AdminAuthStore>((set) => ({
  adminUser: null,
  isAdmin: false,
  isAuthReady: false,
  loginError: null,

  init: () => {
    onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        set({ adminUser: null, isAdmin: false, isAuthReady: true });
        return;
      }
      const profile = await loadProfile(fbUser.uid, fbUser.email || '', fbUser.displayName || '');
      set({
        adminUser: profile,
        isAdmin: profile?.role === 'admin' && profile.status === 'active',
        isAuthReady: true,
      });
    });
  },

  login: async (email, password) => {
    set({ loginError: null });
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const profile = await loadProfile(
        credential.user.uid,
        credential.user.email || '',
        credential.user.displayName || ''
      );
      if (profile?.role !== 'admin') {
        await signOut(auth);
        set({ adminUser: null, isAdmin: false, isAuthReady: true });
        return { success: false, message: 'Access denied. This account is not an admin.' };
      }
      if (profile.status !== 'active') {
        await signOut(auth);
        set({ adminUser: null, isAdmin: false, isAuthReady: true });
        return { success: false, message: 'This account has been disabled.' };
      }
      set({ adminUser: profile, isAdmin: true, isAuthReady: true });
      return { success: true, message: 'Welcome back!' };
    } catch (e) {
      const code = (e as { code?: string }).code;
      const message =
        code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
          ? 'Invalid email or password.'
          : e instanceof Error
            ? e.message
            : 'Login failed.';
      set({ loginError: message });
      return { success: false, message };
    }
  },

  updatePassword: async (email, newPassword) => {
    const profile = useAdminAuthStore.getState().adminUser;
    const currentEmail = (profile?.email ?? auth.currentUser?.email ?? '').trim().toLowerCase();
    if (!currentEmail) {
      return { success: false, message: 'Could not verify the signed-in account.' };
    }
    if (email.trim().toLowerCase() !== currentEmail) {
      return { success: false, message: 'This email does not match the signed-in account.' };
    }
    const user = auth.currentUser;
    if (!user) {
      return { success: false, message: 'You are not signed in.' };
    }
    try {
      await updatePassword(user, newPassword);
      return { success: true, message: 'Password updated.' };
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/requires-recent-login') {
        return {
          success: false,
          message: 'Session expired. Sign out and sign in again, then retry changing the password.',
        };
      }
      if (code === 'auth/weak-password') {
        return { success: false, message: 'New password is too weak. Use at least 6 characters.' };
      }
      return { success: false, message: e instanceof Error ? e.message : 'Could not update password.' };
    }
  },

  logout: async () => {
    await signOut(auth);
    set({ adminUser: null, isAdmin: false, isAuthReady: true });
  },

  clearLoginError: () => set({ loginError: null }),
}));