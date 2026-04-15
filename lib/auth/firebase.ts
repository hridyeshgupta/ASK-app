// lib/auth/firebase.ts
// Firebase initialization
//  "Firebase Auth (email + SSO)"

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { FIREBASE_CONFIG } from '@/lib/constants';

// Initialize Firebase only once (prevent re-init during hot reload)
const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
