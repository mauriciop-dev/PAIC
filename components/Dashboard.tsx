import React from 'react';
import { Tab, UserProfile, ConjuntoInfo } from '../types';
import DashboardView from './views/DashboardView';
import DatabaseView from './views/DatabaseView';
import CommonAreasView from './views/CommonAreasView';
import DueDatesView from './views/DueDatesView';
import PendingTasksView from './views/PendingTasksView';
import ComunicacionesView from './views/ComunicacionesView';
import FinanzasView from './views/FinanzasView';
import SeguridadView from './views/SeguridadView';

interface DashboardProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  conjuntoName: string;
  userProfile: UserProfile;
  conjuntoInfo: ConjuntoInfo | null;
}

const Dashboard: React.FC<DashboardProps> = ({ activeTab, setActiveTab, conjuntoName, userProfile, conjuntoInfo }) => {
  const renderContent = () => {
    // FIX: Wait for the full conjuntoInfo object to be loaded, not just the ID on the user profile.
    // This makes the loading state more accurate on page refresh.
    if (!conjuntoInfo) {
        return <div className="text-center p-10">Cargando información del conjunto...</div>;
    }
      
    switch (activeTab) {
      case Tab.Dashboard:
        return <DashboardView conjuntoName={conjuntoName} setActiveTab={setActiveTab} userProfile={userProfile} />;
      case Tab.Database:
        return <DatabaseView userProfile={userProfile} />;
      case Tab.CommonAreas:
        return <CommonAreasView userProfile={userProfile} />;
      case Tab.DueDates:
        return <DueDatesView userProfile={userProfile} />;
      case Tab.PendingTasks:
          return <PendingTasksView userProfile={userProfile} />;
      case Tab.Comunicaciones:
          return <ComunicacionesView userProfile={userProfile} />;
      case Tab.Finanzas:
          return <FinanzasView userProfile={userProfile} />;
      case Tab.Seguridad:
          return <SeguridadView userProfile={userProfile} />;
      default:
        return <DashboardView conjuntoName={conjuntoName} setActiveTab={setActiveTab} userProfile={userProfile} />;
    }
  };

  return <div className="w-full h-full">{renderContent()}</div>;
};

export default Dashboard;