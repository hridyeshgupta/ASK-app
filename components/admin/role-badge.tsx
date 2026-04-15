'use client';

// components/admin/role-badge.tsx

import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/lib/types/auth';

const roleConfig: Record<UserRole, { label: string; variant: 'default' | 'secondary' | 'destructive'; className: string }> = {
  super_admin: { label: 'Super Admin', variant: 'default', className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  ra_admin: { label: 'RA Admin', variant: 'secondary', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  pc_admin: { label: 'PC Admin', variant: 'secondary', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  member: { label: 'Member', variant: 'secondary', className: 'bg-muted text-muted-foreground' },
};

interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleConfig[role];

  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}
