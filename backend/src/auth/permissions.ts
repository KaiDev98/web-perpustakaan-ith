import type { AdminRole } from './auth.service.js';

export const PERMISSIONS = [
  'admin.me', 'auth.logout',
  'requests.summary.read', 'requests.literacy.read', 'requests.literacy.status',
  'requests.clearance.read', 'requests.clearance.status',
  'content.read', 'content.manage', 'navigation.read', 'navigation.manage',
  'resources.read', 'resources.manage', 'slides.read', 'slides.manage',
  'media.read', 'media.manage', 'settings.read', 'settings.manage',
  'study_programs.read', 'study_programs.manage', 'users.read', 'users.manage', 'audit.read',
] as const;
export type Permission = typeof PERMISSIONS[number];

const ADMIN_PERMISSIONS: readonly Permission[] = [
  'admin.me', 'auth.logout', 'requests.summary.read',
  'requests.literacy.read', 'requests.literacy.status',
  'requests.clearance.read', 'requests.clearance.status',
];

export function permissionsForRole(role: AdminRole): readonly Permission[] {
  if (role === 'SUPERADMIN') return PERMISSIONS;
  if (role === 'ADMIN') return ADMIN_PERMISSIONS;
  return [];
}

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
