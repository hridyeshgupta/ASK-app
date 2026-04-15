'use client';

// components/layout/sidebar.tsx
// Collapsible sidebar with navigation — role-based visibility for admin items

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { canSeeAdminNav } from '@/lib/auth/rbac';
import type { Module } from '@/lib/types/auth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  LayoutDashboardIcon,
  FilePlusIcon,
  HistoryIcon,
  UsersIcon,
  SettingsIcon,
} from 'lucide-react';

interface AppSidebarProps {
  module: Module;
}

export function AppSidebar({ module }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const moduleColor = module === 'ra' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400';

  const navItems = [
    {
      title: 'Dashboard',
      href: `/${module}/dashboard`,
      icon: LayoutDashboardIcon,
    },
    {
      title: 'Generate Report',
      href: `/${module}/generate`,
      icon: FilePlusIcon,
    },
    {
      title: 'Report History',
      href: `/${module}/history`,
      icon: HistoryIcon,
    },
  ];

  //  "User management module visible to admins only"
  const showAdmin = user ? canSeeAdminNav(user.role, module) : false;

  const adminItems = [
    {
      title: 'Users',
      href: `/${module}/admin/users`,
      icon: UsersIcon,
    },
  ];

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border/50 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <span className="text-sm font-bold">A</span>
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">ASK Platform</span>
            <span className={`text-xs ${moduleColor}`}>
              {module === 'ra' ? 'Research Analyst' : 'Private Credit'}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin section — hidden for member role */}
        {showAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <SettingsIcon className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
