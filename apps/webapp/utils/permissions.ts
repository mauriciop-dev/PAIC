import { Tab, UserProfile } from "../types";

/**
 * Permission matrix mapping roles to allowed tabs
 * Keys must match the lowercase enum values from user_role enum
 */
export const ROLE_PERMISSIONS: Record<string, Tab[]> = {
  admin: [
    Tab.Dashboard,
    Tab.Database,
    Tab.CommonAreas,
    Tab.Comunicaciones,
    Tab.Archivos,
    Tab.Finanzas,
    Tab.Seguridad,
  ],
  subscriber: [
    Tab.Dashboard,
    Tab.Database,
    Tab.CommonAreas,
    Tab.Comunicaciones,
    Tab.Archivos,
    Tab.Finanzas,
    Tab.Seguridad,
  ],
  trial: [
    Tab.Dashboard,
    Tab.Database,
    Tab.CommonAreas,
    Tab.Comunicaciones,
    Tab.Archivos,
    Tab.Finanzas,
    Tab.Seguridad,
  ],
  internal: [
    Tab.Dashboard,
    Tab.Database,
    Tab.CommonAreas,
    Tab.Comunicaciones,
    Tab.Archivos,
  ],
  guard: [Tab.Seguridad],
  contador: [Tab.Finanzas],
  "punto de acceso": [Tab.Seguridad],
};

/**
 * Normalize role to lowercase for lookup
 */
function normalizeRole(role: string | undefined): string {
  return (role || "").toLowerCase();
}

/**
 * Check if a user has access to a specific tab
 */
export function hasTabAccess(userProfile: UserProfile | null, tab: Tab): boolean {
  if (!userProfile) return false;

  // Check explicit permissions first (if they exist on the profile)
  if (userProfile.permissions && userProfile.permissions.length > 0) {
    return userProfile.permissions.includes(tab);
  }

  // Fallback to role-based permissions (normalize to lowercase)
  const roleKey = normalizeRole(userProfile.role);
  const rolePermissions = ROLE_PERMISSIONS[roleKey] || [];
  return rolePermissions.includes(tab);
}

/**
 * Get all tabs accessible by a user
 */
export function getAccessibleTabs(userProfile: UserProfile | null): Tab[] {
  if (!userProfile) return [];

  if (userProfile.permissions && userProfile.permissions.length > 0) {
    return userProfile.permissions;
  }

  const roleKey = normalizeRole(userProfile.role);
  return ROLE_PERMISSIONS[roleKey] || [];
}

/**
 * Check if user has any access to financial modules
 */
export function hasFinanzasAccess(userProfile: UserProfile | null): boolean {
  return hasTabAccess(userProfile, Tab.Finanzas);
}

/**
 * Check if user has any access to security modules
 */
export function hasSeguridadAccess(userProfile: UserProfile | null): boolean {
  return hasTabAccess(userProfile, Tab.Seguridad);
}

/**
 * Check if user is admin (has full access)
 */
export function isAdmin(userProfile: UserProfile | null): boolean {
  const role = normalizeRole(userProfile?.role);
  return role === "admin" || role === "superadmin";
}

/**
 * Check if user is internal staff (Guard, Contador, etc.)
 */
export function isInternalStaff(userProfile: UserProfile | null): boolean {
  const role = normalizeRole(userProfile?.role);
  return role === "guard" || 
         role === "contador" || 
         role === "punto de acceso" ||
         role === "internal";
}
