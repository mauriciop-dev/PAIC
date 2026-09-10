import { Tab, UserProfile } from "../types";

/**
 * Permission matrix mapping roles to allowed tabs
 */
export const ROLE_PERMISSIONS: Record<string, Tab[]> = {
  Admin: [
    Tab.Dashboard,
    Tab.Database,
    Tab.CommonAreas,
    Tab.Comunicaciones,
    Tab.Archivos,
    Tab.Finanzas,
    Tab.Seguridad,
  ],
  Subscriber: [
    Tab.Dashboard,
    Tab.Database,
    Tab.CommonAreas,
    Tab.Comunicaciones,
    Tab.Archivos,
    Tab.Finanzas,
    Tab.Seguridad,
  ],
  Trial: [
    Tab.Dashboard,
    Tab.Database,
    Tab.CommonAreas,
    Tab.Comunicaciones,
    Tab.Archivos,
    Tab.Finanzas,
    Tab.Seguridad,
  ],
  Internal: [
    Tab.Dashboard,
    Tab.Database,
    Tab.CommonAreas,
    Tab.Comunicaciones,
    Tab.Archivos,
  ],
  Guard: [Tab.Seguridad],
  Contador: [Tab.Finanzas],
  "Punto de Acceso": [Tab.Seguridad],
};

/**
 * Check if a user has access to a specific tab
 */
export function hasTabAccess(userProfile: UserProfile | null, tab: Tab): boolean {
  if (!userProfile) return false;

  // Check explicit permissions first
  if (userProfile.permissions && userProfile.permissions.length > 0) {
    return userProfile.permissions.includes(tab);
  }

  // Fallback to role-based permissions
  const roleKey = String(userProfile.role);
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

  const roleKey = String(userProfile.role);
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
  const role = String(userProfile?.role);
  return role === "Admin" || role === "SuperAdmin";
}

/**
 * Check if user is internal staff (Guard, Contador, etc.)
 */
export function isInternalStaff(userProfile: UserProfile | null): boolean {
  const role = String(userProfile?.role);
  return role === "Guard" || 
         role === "Contador" || 
         role === "Punto de Acceso" ||
         role === "Internal";
}
