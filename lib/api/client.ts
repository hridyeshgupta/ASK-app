// lib/api/client.ts
// Base HTTP client with auth headers and base URL

import { RA_API_BASE, PC_API_BASE } from '@/lib/constants';
import type { Module } from '@/lib/types/auth';
import { auth } from '@/lib/auth/firebase';

function getBaseUrl(module: Module): string {
  return module === 'ra' ? RA_API_BASE : PC_API_BASE;
}

export async function apiClient<T>(
  module: Module,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getBaseUrl(module);
  const url = `${baseUrl}${endpoint}`;

  // Attach Firebase ID token for backend verification
  let authToken = '';
  if (auth.currentUser) {
    authToken = await auth.currentUser.getIdToken();
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export { getBaseUrl };
