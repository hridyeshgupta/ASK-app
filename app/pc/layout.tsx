'use client';

// app/pc/layout.tsx
// PC sidebar nav
//  "Two module routes /pc/*"

import { AuthGuard } from '@/components/auth/auth-guard';
import { AppSidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default function PCLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar module="pc" />
        <SidebarInset>
          <Topbar module="pc" />
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
