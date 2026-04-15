'use client';

// components/auth/role-guard.tsx
//  "role-based nav visibility"

import { useAuth } from '@/lib/auth/auth-context';
import type { UserRole, Module } from '@/lib/types/auth';
import { isModuleAdmin } from '@/lib/auth/rbac';
import type { ReactNode } from 'react';

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requireAdmin?: boolean;
  module?: Module;
  fallback?: ReactNode;
}

export function RoleGuard({
  children,
  requiredRole,
  requireAdmin = false,
  module,
  fallback = null,
}: RoleGuardProps) {
  const { user } = useAuth();

  if (!user) return <>{fallback}</>;

  if (requiredRole && user.role !== requiredRole && user.role !== 'super_admin') {
    return <>{fallback}</>;
  }

  if (requireAdmin && module && !isModuleAdmin(user.role, module)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
