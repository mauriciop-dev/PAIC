import React from 'react';
import { Icon } from './ui/Icon';
import { SettingsTab } from '../App';

interface BottomNavProps {
  activeTab: string;
  onTabSelect: (tab: any) => void;
  isConjuntoAdmin: boolean;
  onSettingsClick: (tab?: SettingsTab) => void;
}

const bottomIcons: { id: any; icon: string; label: string }[] = [
  { id: 'Dashboard', icon: 'dashboard', label: 'Panel' },
  { id: 'CommonAreas', icon: 'calendar', label: 'Reservas' },
  { id: 'Finanzas', icon: 'dollarSign', label: 'Finanzas' },
  { id: 'Comunicaciones', icon: 'mail', label: 'Noticias' },
];

const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabSelect,
  isConjuntoAdmin,
  onSettingsClick,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-[64px] px-1">
        {bottomIcons.map((item) => {
          const isActive = item.id === activeTab || 
            (item.id === 'Dashboard' && (activeTab === 'Centro de Control'));
          return (
            <button
              key={item.id}
              onClick={() => {
                const tabs = {
                  Dashboard: 'Centro de Control',
                  CommonAreas: 'Áreas comunes',
                  Finanzas: 'Finanzas',
                  Comunicaciones: 'Comunicaciones',
                };
                onTabSelect((tabs as any)[item.id] || item.id);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] rounded-xl transition-colors ${
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon 
                name={item.icon as any} 
                className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} 
              />
              <span className={`text-[11px] font-medium ${isActive ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        {isConjuntoAdmin && (
          <button
            onClick={() => onSettingsClick('Perfil')}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] rounded-xl transition-colors ${
              false ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon name="settings" className="w-6 h-6 text-gray-500" />
            <span className="text-[11px] font-medium text-gray-500">Ajustes</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default BottomNav;