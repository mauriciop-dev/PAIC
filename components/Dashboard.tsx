import React, { Suspense, lazy } from 'react';
import { Tab, UserProfile, ConjuntoInfo } from '../types';

const DashboardView = lazy(() => import('./views/DashboardView'));
const DatabaseView = lazy(() => import('./views/DatabaseView'));
const CommonAreasView = lazy(() => import('./views/CommonAreasView'));
const DueDatesView = lazy(() => import('./views/DueDatesView'));
const PendingTasksView = lazy(() => import('./views/PendingTasksView'));
const ComunicacionesView = lazy(() => import('./views/ComunicacionesView'));
const ArchivosView = lazy(() => import('./views/ArchivosView'));
const FinanzasView = lazy(() => import('./views/FinanzasView'));
const SeguridadView = lazy(() => import('./views/SeguridadView'));

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

const Dashboard: React.FC<DashboardProps> = ({ activeTab, setActiveTab, conjuntoName, userProfile, conjuntoInfo, selectedAccessPointId }) => {
  const renderContent = () => {
    if (!conjuntoInfo) {
        return <div className="text-center p-10">Cargando información del conjunto...</div>;
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
