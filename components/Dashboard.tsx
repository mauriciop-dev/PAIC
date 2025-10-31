import React from 'react';
import { Tab } from '../types';
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
}

const Dashboard: React.FC<DashboardProps> = ({ activeTab, setActiveTab, conjuntoName }) => {
  const renderContent = () => {
    switch (activeTab) {
      case Tab.Dashboard:
        return <DashboardView conjuntoName={conjuntoName} setActiveTab={setActiveTab} />;
      case Tab.Database:
        return <DatabaseView />;
      case Tab.CommonAreas:
        return <CommonAreasView />;
      case Tab.DueDates:
        return <DueDatesView />;
      case Tab.PendingTasks:
          return <PendingTasksView />;
      case Tab.Comunicaciones:
          return <ComunicacionesView />;
      case Tab.Finanzas:
          return <FinanzasView />;
      case Tab.Seguridad:
          return <SeguridadView />;
      default:
        return <DashboardView conjuntoName={conjuntoName} setActiveTab={setActiveTab} />;
    }
  };

  return <div className="w-full h-full">{renderContent()}</div>;
};

export default Dashboard;