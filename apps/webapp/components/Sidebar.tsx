import React, { useState, useMemo } from 'react';
import { Tab, UserProfile, UserRole } from '../types';
import { Icon } from '@paic/ui';
import { SettingsTab } from '../App';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  userProfile: UserProfile;
  onSettingsClick: (tab?: SettingsTab) => void;
  conjuntoName?: string;
}

const allTabs = [
  { id: Tab.Dashboard, label: "Centro de Control", icon: "dashboard" },
  { id: Tab.Database, label: "Base de datos", icon: "database" },
  { id: Tab.CommonAreas, label: "Áreas comunes", icon: "calendar" },
  { id: Tab.Comunicaciones, label: "Comunicaciones", icon: "mail" },
  { id: Tab.Archivos, label: "Archivos", icon: "file-text" },
  { id: Tab.Finanzas, label: "Finanzas", icon: "dollarSign" },
  { id: Tab.Seguridad, label: "Seguridad", icon: "shield" },
  { id: Tab.DueDates, label: "Vencimientos", icon: "clock" },
  { id: Tab.PendingTasks, label: "Tareas", icon: "checkSquare" },
  { id: Tab.PWA, label: "PWA residentes", icon: "smartphone" },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  userProfile, 
  onSettingsClick,
  conjuntoName
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const visibleTabs = useMemo(() => {
    if (!userProfile) return [];
    if (userProfile.role === UserRole.Internal) {
      return userProfile.permissions?.length > 0 
        ? allTabs.filter(tab => userProfile.permissions!.includes(tab.id)) 
        : [];
    }
    return allTabs;
  }, [userProfile]);

  const isConjuntoAdmin = userProfile.role === UserRole.Trial || userProfile.role === UserRole.Subscriber;

  return (
    <aside 
      className={`hidden md:flex flex-col bg-white border-r border-slate-200/80 transition-all duration-300 ease-in-out shrink-0 z-30 h-screen ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Sidebar Header / Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
              P
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-slate-800 tracking-tight block truncate">PAIC</span>
              <span className="text-[11px] font-medium text-slate-400 block truncate">{conjuntoName || 'Gestión Copropiedad'}</span>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="w-8 h-8 mx-auto rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            P
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ${
            collapsed ? 'hidden' : 'block'
          }`}
        >
          <Icon name="chevron-left" className="w-4 h-4" />
        </button>
      </div>

      {collapsed && (
        <div className="pt-2 flex justify-center flex-shrink-0">
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expandir barra lateral"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Icon name="chevron-right" className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Nav List - scrollable */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 min-h-0">
        {!collapsed && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 flex-shrink-0">
            Módulos Principales
          </p>
        )}

        {visibleTabs.map(tab => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={collapsed ? tab.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isSelected
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <div className={`shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                <Icon name={tab.icon} className="w-5 h-5" />
              </div>
              {!collapsed && <span className="truncate">{tab.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer / Settings - sticky al bottom del viewport */}
      {isConjuntoAdmin && (
        <div className="sticky bottom-0 p-3 border-t border-slate-100 bg-white/95 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={() => onSettingsClick()}
            title={collapsed ? 'Configuración' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <Icon name="settings" className="w-5 h-5 text-slate-400" />
            {!collapsed && <span>Configuración</span>}
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
