// lib/auth/rbac.ts
//  "Custom RBAC with four personas"

import type { UserRole, Module } from '@/lib/types/auth';

// Check if user has admin access
export function isAdmin(role: UserRole): boolean {
  return role === 'super_admin' || role === 'ra_admin' || role === 'pc_admin';
}

// Check if user is super admin
export function isSuperAdmin(role: UserRole): boolean {
  return role === 'super_admin';
}

// Check if user is admin for a specific module
export function isModuleAdmin(role: UserRole, module: Module): boolean {
  if (role === 'super_admin') return true;
  if (module === 'ra' && role === 'ra_admin') return true;
  if (module === 'pc' && role === 'pc_admin') return true;
  return false;
}

// Check if user has access to a specific module
export function hasModuleAccess(modules: Module[], module: Module): boolean {
  return modules.includes(module);
}

// Check if user can see admin nav items
//  "User management module visible to admins only"
export function canSeeAdminNav(role: UserRole, module: Module): boolean {
  return isModuleAdmin(role, module);
}

// Check if user can invite members
//  "admins can only invite members to their own vertical"
export function canInviteMembers(role: UserRole, module: Module): boolean {
  return isModuleAdmin(role, module);
}

// Check if user can assign/remove admins
//  "only super admin can assign or remove other admins"
export function canManageAdmins(role: UserRole): boolean {
  return isSuperAdmin(role);
}
