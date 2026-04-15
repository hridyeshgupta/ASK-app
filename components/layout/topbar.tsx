'use client';

// components/layout/topbar.tsx
// Top bar with module indicator, switch module button, user avatar + logout

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import type { Module } from '@/lib/types/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ArrowLeftRightIcon, LogOutIcon, UserIcon } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

interface TopbarProps {
  module: Module;
}

export function Topbar({ module }: TopbarProps) {
  const { user, logout, setActiveModule } = useAuth();
  const router = useRouter();

  const handleSwitchModule = () => {
    const otherModule: Module = module === 'ra' ? 'pc' : 'ra';
    setActiveModule(otherModule);
    router.push(`/${otherModule}/dashboard`);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const moduleLabel = module === 'ra' ? 'Research Analyst' : 'Private Credit';
  const moduleColor = module === 'ra' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400';
  const moduleBg = module === 'ra' ? 'bg-blue-500/10' : 'bg-emerald-500/10';

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 bg-background/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />

      {/* Module Indicator */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${moduleColor} ${moduleBg}`}>
          {module.toUpperCase()}
        </span>
        <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
          {moduleLabel}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Switch Module Button */}
        {user && user.modules.length > 1 && (
          <Button
            id="switch-module"
            variant="ghost"
            size="sm"
            onClick={handleSwitchModule}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftRightIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Switch Module</span>
          </Button>
        )}

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Avatar + Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full" id="user-menu">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOutIcon className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
