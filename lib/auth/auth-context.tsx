'use client';

// lib/auth/auth-context.tsx
// React context for auth state — wired to Firebase Auth + Postgres user_profiles.
//
// Flow:
//   1. Firebase Auth tells us WHO the user is (uid, email, displayName)
//   2. We fetch their role + modules from Postgres user_profiles table
//   3. If no profile exists (first login), we create one with default role='member'

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/auth/firebase';
import type { User, UserRole, Module } from '@/lib/types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  activeModule: Module | null;
  setActiveModule: (module: Module) => void;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Fetch the user's profile (role, modules) from Postgres.
 * If no profile exists, create one with defaults.
 */
async function fetchOrCreateProfile(
  uid: string,
  displayName: string | null,
  email: string | null,
): Promise<{ role: UserRole; modules: Module[] }> {
  try {
    // Try to fetch existing profile
    const res = await fetch(`/api/user-profile?uid=${encodeURIComponent(uid)}`);
    if (!res.ok) throw new Error('Failed to fetch profile');

    const data = await res.json();

    if (data.profile) {
      // Profile exists — use the stored role and modules
      return {
        role: data.profile.role as UserRole,
        modules: (data.profile.modules || ['pc']) as Module[],
      };
    }

    // No profile yet (first login) — create one with defaults
    const createRes = await fetch('/api/user-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firebase_uid: uid,
        display_name: displayName,
        email: email,
        role: 'member',       // Default role for new users
        modules: ['pc'],      // Default module access
      }),
    });

    if (!createRes.ok) throw new Error('Failed to create profile');

    const createData = await createRes.json();
    return {
      role: (createData.profile?.role || 'member') as UserRole,
      modules: (createData.profile?.modules || ['pc']) as Module[],
    };
  } catch (err) {
    console.error('Error fetching user profile from DB:', err);
    // Fallback: let the user in with member role so the app doesn't break
    return { role: 'member', modules: ['pc'] };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true until Firebase resolves
  const [activeModule, setActiveModule] = useState<Module | null>(null);

  // Listen to Firebase auth state changes (handles page refresh, session persistence)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Step 1: Firebase gives us identity
        // Step 2: Postgres gives us role + modules
        const { role, modules } = await fetchOrCreateProfile(
          firebaseUser.uid,
          firebaseUser.displayName,
          firebaseUser.email,
        );

        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          role,
          modules,
          avatarUrl: firebaseUser.photoURL || undefined,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    // Fetch real role from DB
    const { role, modules } = await fetchOrCreateProfile(
      credential.user.uid,
      credential.user.displayName,
      credential.user.email,
    );

    setUser({
      id: credential.user.uid,
      email: credential.user.email || '',
      name: credential.user.displayName || credential.user.email?.split('@')[0] || 'User',
      role,
      modules,
      avatarUrl: credential.user.photoURL || undefined,
    });
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const credential = await signInWithPopup(auth, googleProvider);

    // Fetch real role from DB
    const { role, modules } = await fetchOrCreateProfile(
      credential.user.uid,
      credential.user.displayName,
      credential.user.email,
    );

    setUser({
      id: credential.user.uid,
      email: credential.user.email || '',
      name: credential.user.displayName || credential.user.email?.split('@')[0] || 'User',
      role,
      modules,
      avatarUrl: credential.user.photoURL || undefined,
    });
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setActiveModule(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        activeModule,
        setActiveModule,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
