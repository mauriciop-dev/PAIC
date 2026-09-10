import React, { Suspense, lazy } from "react";
import { Tab, UserProfile, ConjuntoInfo } from "../types";
import { hasTabAccess } from "../utils/permissions";

const DashboardView = lazy(() => import("./views/DashboardView"));
const DatabaseView = lazy(() => import("./views/DatabaseView"));
const CommonAreasView = lazy(() => import("./views/CommonAreasView"));
const DueDatesView = lazy(() => import("./views/DueDatesView"));
const PendingTasksView = lazy(() => import("./views/PendingTasksView"));
const ComunicacionesView = lazy(() => import("./views/ComunicacionesView"));
const ArchivosView = lazy(() => import("./views/ArchivosView"));
const FinanzasView = lazy(() => import("./views/FinanzasView"));
const SeguridadView = lazy(() => import("./views/SeguridadView"));
const PwaAdminView = lazy(() => import("./views/PwaAdminView"));

interface DashboardProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  conjuntoName: string;
  userProfile: UserProfile;
  conjuntoInfo: ConjuntoInfo | null;
  selectedAccessPointId: number | null;
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="animate-pulse flex flex-col items-center gap-3">
      <div className="w-8 h-8 bg-blue-200 rounded-full"></div>
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </div>
  </div>
);

const AccessDeniedFallback = ({ tabName }: { tabName: string }) => (
  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-200">
    <div className="text-center p-8">
      <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6M12 15l-4-4 4-4M8 9l4 4-4 4" />
      </svg>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">Acceso Restringido</h3>
      <p className="text-gray-500">No tienes permisos para acceder a <strong>{tabName}</strong>.</p>
      <p className="text-xs text-gray-400 mt-2">Contacta a tu administrador para solicitar acceso.</p>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ activeTab, setActiveTab, conjuntoName, userProfile, conjuntoInfo, selectedAccessPointId }) => {
  const renderContent = () => {
    if (!conjuntoInfo) {
      return <div className="text-center p-10">Cargando informaci&oacute;n del conjunto...</div>;
    }

    // Check if user has access to the active tab
    if (!hasTabAccess(userProfile, activeTab)) {
      return <AccessDeniedFallback tabName={activeTab} />;
    }

    switch (activeTab) {
      case Tab.Dashboard:
        return <DashboardView setActiveTab={setActiveTab} userProfile={userProfile} />;
      case Tab.Database:
        return <DatabaseView userProfile={userProfile} />;
      case Tab.CommonAreas:
        return <CommonAreasView userProfile={userProfile} />;
      case Tab.DueDates:
        return <DueDatesView userProfile={userProfile} />;
      case Tab.PendingTasks:
        return <PendingTasksView userProfile={userProfile} />;
      case Tab.Comunicaciones:
        return <ComunicacionesView userProfile={userProfile} conjuntoInfo={conjuntoInfo} />;
      case Tab.Archivos:
        return <ArchivosView userProfile={userProfile} conjuntoInfo={conjuntoInfo} />;
      case Tab.Finanzas:
        return <FinanzasView userProfile={userProfile} />;
      case Tab.Seguridad:
        return <SeguridadView userProfile={userProfile} selectedAccessPointId={selectedAccessPointId} />;
      case Tab.PWA:
        return <PwaAdminView userProfile={userProfile} conjuntoInfo={conjuntoInfo} />;
      default:
        return <DashboardView setActiveTab={setActiveTab} userProfile={userProfile} />;
    }
  };

  return (
    <div className="w-full h-full">
      <Suspense fallback={<LoadingFallback />}>
        {renderContent()}
      </Suspense>
    </div>
  );
};

export default Dashboard;
