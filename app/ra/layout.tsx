'use client';

// app/ra/layout.tsx
// RA sidebar nav (role-based visibility)
//  "Two module routes /ra/*"

import { AuthGuard } from '@/components/auth/auth-guard';
import { AppSidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default function RALayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar module="ra" />
        <SidebarInset>
          <Topbar module="ra" />
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
