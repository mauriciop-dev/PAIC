
import React from 'react';
import { Tab } from '../types';
import DashboardView from './views/DashboardView';
import DatabaseView from './views/DatabaseView';
import CommonAreasView from './views/CommonAreasView';
import DueDatesView from './views/DueDatesView';
import PendingTasksView from './views/PendingTasksView';
import StatusView from './views/StatusView';

interface DashboardProps {
  activeTab: Tab;
}

const Dashboard: React.FC<DashboardProps> = ({ activeTab }) => {
  const renderContent = () => {
    switch (activeTab) {
      case Tab.Dashboard:
        return <DashboardView />;
      case Tab.Database:
        return <DatabaseView />;
      case Tab.Status:
        return <StatusView />;
      case Tab.CommonAreas:
        return <CommonAreasView />;
      case Tab.DueDates:
        return <DueDatesView />;
      case Tab.PendingTasks:
          return <PendingTasksView />;
      default:
        return <DashboardView />;
    }
  };

  return <div className="w-full h-full">{renderContent()}</div>;
};

export default Dashboard;
