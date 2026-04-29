// lib/prisma.ts
// Prisma client singleton for server-side use (API routes, server components).
//
// IMPORTANT: This file must ONLY be imported in server-side code:
//   - app/api/**/route.ts  (API routes)
//   - Server Components
//   - Server Actions
// Never import this in 'use client' components.

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/lib/generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Reuse the same client in development (avoid creating too many connections on hot reload)
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
