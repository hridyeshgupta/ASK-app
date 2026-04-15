'use client';

// app/ra/admin/users/page.tsx
//  "User management module visible to admins only"

import { PageHeader } from '@/components/layout/page-header';
import { UserTable } from '@/components/admin/user-table';
import { InviteDialog } from '@/components/admin/invite-dialog';
import { RoleGuard } from '@/components/auth/role-guard';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlertIcon } from 'lucide-react';

// Hardcoded user data for static rendering
const DEMO_USERS = [
  { id: 'u1', name: 'Alex Morgan', email: 'alex@askplatform.com', role: 'super_admin' as const, status: 'active' as const },
  { id: 'u2', name: 'Sarah Chen', email: 'sarah@askplatform.com', role: 'ra_admin' as const, status: 'active' as const },
  { id: 'u3', name: 'James Wilson', email: 'james@askplatform.com', role: 'member' as const, status: 'active' as const },
  { id: 'u4', name: 'Emily Rodriguez', email: 'emily@askplatform.com', role: 'member' as const, status: 'active' as const },
  { id: 'u5', name: 'David Kim', email: 'david@askplatform.com', role: 'member' as const, status: 'invited' as const },
];

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <ShieldAlertIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
      <h2 className="text-lg font-semibold">Access Denied</h2>
      <p className="text-sm text-muted-foreground mt-1">
        You don&apos;t have permission to access user management.
      </p>
    </div>
  );
}

export default function RAUsersPage() {
  return (
    <RoleGuard requireAdmin module="ra" fallback={<AccessDenied />}>
      <div className="space-y-6">
        <PageHeader
          title="User Management"
          description="Manage RA module team members. Admins can invite members to their own vertical."
          actions={<InviteDialog module="ra" />}
        />

        <Card className="border-border/50">
          <CardContent className="p-0">
            <UserTable users={DEMO_USERS} />
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
