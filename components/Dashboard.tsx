import React from 'react';
import { Tab } from '../types';
import DashboardView from './views/DashboardView';
import DatabaseView from './views/DatabaseView';
import CommonAreasView from './views/CommonAreasView';
import DueDatesView from './views/DueDatesView';
import PendingTasksView from './views/PendingTasksView';
import ComunicacionesView from './views/ComunicacionesView';
import FinanzasView from './views/FinanzasView';

interface DashboardProps {
  activeTab: Tab;
  conjuntoName: string;
}

const Dashboard: React.FC<DashboardProps> = ({ activeTab, conjuntoName }) => {
  const renderContent = () => {
    switch (activeTab) {
      case Tab.Dashboard:
        return <DashboardView conjuntoName={conjuntoName} />;
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
      default:
        return <DashboardView conjuntoName={conjuntoName} />;
    }
  };

  return <div className="w-full h-full">{renderContent()}</div>;
};

export default Dashboard;