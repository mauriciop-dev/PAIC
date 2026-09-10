import React from "react";
import { Tab, UserProfile } from "../types";
import { hasTabAccess, getAccessibleTabs } from "../utils/permissions";

interface ProtectedTabProps {
  userProfile: UserProfile | null;
  children: (allowedTabs: Tab[]) => React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedTabs: React.FC<ProtectedTabProps> = ({
  userProfile,
  children,
  fallback,
}) => {
  const defaultFallback = (
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-200">
      <div className="text-center p-8">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2h10a2 2 0 002-2v-6M12 15l-4-4 4-4M8 9l4 4-4 4" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-700 mb-1">Acceso Restringido</h3>
        <p className="text-gray-500">No tienes permisos para acceder a esta secci&oacute;n.</p>
        <p className="text-xs text-gray-400 mt-2">Contacta a tu administrador para solicitar acceso.</p>
      </div>
    </div>
  );

  const renderFallback = fallback ?? defaultFallback;

  if (!userProfile) {
    return <>{renderFallback}</>;
  }

  const accessibleTabs = getAccessibleTabs(userProfile);
  
  if (accessibleTabs.length === 0) {
    return <>{fallback ?? defaultFallback}</>;
  }

  return <>{children(getAccessibleTabs(userProfile))}</>;
};

export function useTabAccess(tab: string) {
  return { hasTabAccess, getAccessibleTabs };
}

export default ProtectedTabs;
