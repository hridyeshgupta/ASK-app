// lib/types/auth.ts
//  "four personas: super admin, RA admin, PC admin, member"
export type UserRole = 'super_admin' | 'ra_admin' | 'pc_admin' | 'member';

//  "Two module routes /ra/* and /pc/*"
export type Module = 'ra' | 'pc';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  modules: Module[];
  avatarUrl?: string;
}
