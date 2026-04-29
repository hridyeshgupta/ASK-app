'use client';

// components/layout/sidebar.tsx
// Collapsible sidebar with navigation — role-based visibility for admin items
// Includes Gemini sparkle button for Custom Search (ASK-19)

import { useState } from 'react';
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
  SparklesIcon,
} from 'lucide-react';
import { SearchModal } from '@/components/layout/search-modal';

interface AppSidebarProps {
  module: Module;
}

export function AppSidebar({ module }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const moduleColor = module === 'ra' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400';

  const baseNavItems = [
    {
      title: 'Dashboard',
      href: `/${module}/dashboard`,
      icon: LayoutDashboardIcon,
    },
    {
      title: 'Report Generation',
      href: module === 'ra' ? `/${module}/generate` : `/${module}/report-generation`,
      icon: FilePlusIcon,
    },
    {
      title: 'Reports',
      href: `/${module}/history`,
      icon: HistoryIcon,
    },
  ];

  // Both modules get all nav items
  const navItems = baseNavItems;

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
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === `/${module}/dashboard`}
                  tooltip="Dashboard"
                >
                  <Link href={`/${module}/dashboard`}>
                    <LayoutDashboardIcon className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* ✨ Custom Search — Gemini sparkle button (ASK-19) */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  id="custom-search-trigger"
                  tooltip="Custom Search"
                  onClick={() => setSearchOpen(true)}
                  className="group/search"
                >
                  <div className="flex h-4 w-4 items-center justify-center">
                    <SparklesIcon className="h-4 w-4 text-violet-500 transition-transform group-hover/search:scale-110 group-hover/search:rotate-12" />
                  </div>
                  <span className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent font-medium">
                    Custom Search
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Report Generation */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === (module === 'ra' ? `/${module}/generate` : `/${module}/report-generation`)}
                  tooltip="Report Generation"
                >
                  <Link href={module === 'ra' ? `/${module}/generate` : `/${module}/report-generation`}>
                    <FilePlusIcon className="h-4 w-4" />
                    <span>Report Generation</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Reports */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === `/${module}/history`}
                  tooltip="Reports"
                >
                  <Link href={`/${module}/history`}>
                    <HistoryIcon className="h-4 w-4" />
                    <span>Reports</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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

      {/* Custom Search Modal (ASK-19) */}
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </Sidebar>
  );
}
