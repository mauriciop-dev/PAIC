
import React, { useState, useEffect } from 'react';
import { Tab } from '../types';
import { Icon } from './ui/Icon';

interface FooterProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const tabs = [
  { id: Tab.Dashboard, label: 'Dashboard', icon: 'dashboard' },
  { id: Tab.Database, label: 'Base de datos', icon: 'database' },
  { id: Tab.CommonAreas, label: 'Áreas comunes', icon: 'calendar' },
  { id: Tab.DueDates, label: 'Vencimientos', icon: 'clock' },
  { id: Tab.PendingTasks, label: 'Tareas pendientes', icon: 'checkSquare' },
];

const sliderItems = [
    { text: "Pagar servicio de vigilancia vence en 3 días", color: "red" },
    { text: "Revisar cotización de plomería", color: "yellow" },
    { text: "Soporte ProDig - 3144897092", color: "green" },
    { text: "Actualizar base de datos de residentes", color: "yellow" },
];

const Footer: React.FC<FooterProps> = ({ activeTab, setActiveTab }) => {
  const [currentItem, setCurrentItem] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentItem((prev) => (prev + 1) % sliderItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const trafficLightColor = {
      red: 'bg-red-500',
      yellow: 'bg-yellow-500',
      green: 'bg-green-500',
  }[sliderItems[currentItem].color] || 'bg-gray-500';

  return (
    <footer className="p-2 md:p-3 border-t border-gray-200 bg-white sticky bottom-0 z-10 flex justify-between items-center gap-4">
      <nav className="flex items-center gap-1 md:gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon name={tab.icon} className="w-5 h-5" />
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        ))}
      </nav>
      <div className="hidden sm:flex items-center gap-2 overflow-hidden flex-shrink min-w-0">
         <div className={`w-3 h-3 rounded-full ${trafficLightColor} flex-shrink-0`}></div>
         <p className="text-sm text-gray-700 truncate">{sliderItems[currentItem].text}</p>
      </div>
    </footer>
  );
};

export default Footer;
