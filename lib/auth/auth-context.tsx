'use client';

// lib/auth/auth-context.tsx
// React context for auth state — wired to Firebase Auth

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/auth/firebase';
import type { User, Module } from '@/lib/types/auth';

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

// Map Firebase user to our app's User type
// TODO: Once backend has a GET /me endpoint, fetch role + modules from there
function mapFirebaseUser(firebaseUser: import('firebase/auth').User): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    role: 'super_admin', // TODO: Fetch real role from backend after login
    modules: ['ra', 'pc'] as Module[], // TODO: Fetch real module access from backend
    avatarUrl: firebaseUser.photoURL || undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true until Firebase resolves
  const [activeModule, setActiveModule] = useState<Module | null>(null);

  // Listen to Firebase auth state changes (handles page refresh, session persistence)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(mapFirebaseUser(firebaseUser));
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    setUser(mapFirebaseUser(credential.user));
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const credential = await signInWithPopup(auth, googleProvider);
    setUser(mapFirebaseUser(credential.user));
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
