import React, { useState } from 'react';
import { Icon } from './ui/Icon';
import type { SettingsTab } from '../App';
import BottomSheet from './BottomSheet';

interface BottomNavProps {
  activeTab: string;
  onTabSelect: (tab: any) => void;
  isConjuntoAdmin: boolean;
  onSettingsClick: (tab?: SettingsTab) => void;
  onHelpClick: () => void;
  onStartTour: () => void;
}

interface NavItem {
  id: string;
  icon: string;
  label: string;
}

const primaryItems: NavItem[] = [
  { id: 'Dashboard', icon: 'dashboard', label: 'Panel' },
  { id: 'Database', icon: 'database', label: 'Datos' },
  { id: 'CommonAreas', icon: 'calendar', label: 'Reservas' },
  { id: 'Finanzas', icon: 'dollarSign', label: 'Finanzas' },
  { id: 'Comunicaciones', icon: 'mail', label: 'Correos' },
];

const tabMap: Record<string, string> = {
  Dashboard: 'Centro de Control',
  Database: 'Base de datos',
  CommonAreas: 'Áreas comunes',
  Finanzas: 'Finanzas',
  Comunicaciones: 'Comunicaciones',
  Archivos: 'Archivos',
  Seguridad: 'Seguridad',
  PendingTasks: 'Tareas pendientes',
  DueDates: 'Vencimientos',
};

const secondaryTabs: NavItem[] = [
  { id: 'Archivos', icon: 'file-text', label: 'Archivos' },
  { id: 'Seguridad', icon: 'shield', label: 'Seguridad' },
  { id: 'PendingTasks', icon: 'checkSquare', label: 'Tareas' },
  { id: 'DueDates', icon: 'clock', label: 'Vencen' },
];

const BAR_HEIGHT = 'calc(64px + env(safe-area-inset-bottom, 0px))';

const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabSelect,
  isConjuntoAdmin,
  onSettingsClick,
  onHelpClick,
  onStartTour,
}) => {
  const [expanded, setExpanded] = useState(false);
  const swipeStartY = React.useRef<number | null>(null);

  const handleBarTouchStart = (e: React.TouchEvent) => {
    swipeStartY.current = e.touches[0].clientY;
  };

  const handleBarTouchMove = (e: React.TouchEvent) => {
    if (swipeStartY.current === null) return;
    const deltaY = e.touches[0].clientY - swipeStartY.current;
    if (deltaY < -20) {
      setExpanded(true);
      swipeStartY.current = null;
    }
  };

  const handleBarTouchEnd = () => {
    swipeStartY.current = null;
  };

  const isActiveTab = (id: string) =>
    id === activeTab || (id === 'Dashboard' && activeTab === 'Centro de Control');

  const handleTabPress = (id: string) => {
    onTabSelect(tabMap[id] || id);
    setExpanded(false);
  };

  const handleActionPress = (handler: () => void) => {
    handler();
    setExpanded(false);
  };

  const secondaryActions: { id: string; icon: string; label: string; handler: () => void }[] = [
    { id: 'Ajustes', icon: 'settings', label: 'Ajustes', handler: () => onSettingsClick() },
    { id: 'Soporte', icon: 'phone', label: 'Soporte', handler: onHelpClick },
    { id: 'Tour', icon: 'bot', label: 'Tour', handler: onStartTour },
    { id: 'Mi Perfil', icon: 'user', label: 'Mi Perfil', handler: () => onSettingsClick('Perfil') },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40">
      <BottomSheet
        isOpen={expanded}
        onClose={() => setExpanded(false)}
        title="Más opciones de gestión"
      >
        <div className="pb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-3">
            Módulos adicionales
          </p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {secondaryTabs.map((item) => {
              const isActive = isActiveTab(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabPress(item.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 min-w-0 min-h-[68px] rounded-2xl py-2.5 transition-all ${
                    isActive ? 'text-blue-600 bg-blue-50 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    name={item.icon}
                    className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-slate-500'}`}
                  />
                  <span className="text-[11px] text-center leading-tight">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-3">
            Acciones rápidas
          </p>
          <div className="grid grid-cols-4 gap-2">
            {secondaryActions.map((item) => (
              <button
                key={item.id}
                onClick={() => handleActionPress(item.handler)}
                className="flex flex-col items-center justify-center gap-1.5 min-w-0 min-h-[68px] rounded-2xl py-2.5 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Icon name={item.icon} className="w-6 h-6 text-slate-500" />
                <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>

      <div className="bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom,0px)]">
        <div 
          className="flex items-center justify-around h-[64px] px-1"
          onTouchStart={handleBarTouchStart}
          onTouchMove={handleBarTouchMove}
          onTouchEnd={handleBarTouchEnd}
        >
          {primaryItems.map((item) => {
            const isActive = isActiveTab(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleTabPress(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[52px] min-h-[48px] rounded-xl transition-colors ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon
                  name={item.icon}
                  className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
                />
                <span className={`text-[11px] font-medium ${isActive ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={expanded ? 'Contraer menú' : 'Ver más opciones'}
            className={`flex flex-col items-center justify-center gap-0.5 w-[44px] min-h-[48px] rounded-xl transition-colors ${
              expanded ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon
              name={expanded ? 'chevron-down' : 'chevron-up'}
              className={`w-6 h-6 ${expanded ? 'text-blue-600' : 'text-gray-500'}`}
            />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
