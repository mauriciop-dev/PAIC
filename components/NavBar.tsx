

import React, { useState, useEffect, useMemo } from 'react';
import { Tab, UserProfile, UserRole } from '../types';
import { Icon } from './ui/Icon';
import { apiService } from '../services/apiService';
import { SettingsTab } from '../App';

interface NavBarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  userProfile: UserProfile;
  onSettingsClick: (tab?: SettingsTab) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onHelpClick?: () => void;
  onStartTour?: () => void;
}

const allTabs = [
  { id: Tab.Dashboard, label: 'Centro de Control', icon: 'dashboard', roles: [UserRole.Trial, UserRole.Subscriber] },
  { id: Tab.Database, label: 'Base de datos', icon: 'database', roles: [UserRole.Trial, UserRole.Subscriber] },
  { id: Tab.CommonAreas, label: 'Áreas comunes', icon: 'calendar', roles: [UserRole.Trial, UserRole.Subscriber] },
  { id: Tab.Comunicaciones, label: 'Comunicaciones', icon: 'mail', roles: [UserRole.Trial, UserRole.Subscriber] },
  { id: Tab.Archivos, label: 'Archivos', icon: 'file-text', roles: [UserRole.Trial, UserRole.Subscriber] },
  { id: Tab.Finanzas, label: 'Finanzas', icon: 'dollarSign', roles: [UserRole.Trial, UserRole.Subscriber, UserRole.Internal] },
  { id: Tab.Seguridad, label: 'Seguridad', icon: 'shield', roles: [UserRole.Trial, UserRole.Subscriber, UserRole.Internal] },
  { id: Tab.DueDates, label: 'Vencimientos', icon: 'clock', roles: [UserRole.Trial, UserRole.Subscriber] },
  { id: Tab.PendingTasks, label: 'Tareas', icon: 'checkSquare', roles: [UserRole.Trial, UserRole.Subscriber] },
];

const NavBar: React.FC<NavBarProps> = ({ 
  activeTab, 
  setActiveTab, 
  userProfile, 
  onSettingsClick,
  isMobileOpen = false,
  onCloseMobile,
  onHelpClick,
  onStartTour
}) => {
  const [sliderItems, setSliderItems] = useState<{ text: string; color: 'red' | 'yellow' | 'green' }[]>([]);
  const [currentItem, setCurrentItem] = useState(0);

  const visibleTabs = useMemo(() => {
    if (!userProfile) return [];

    if (userProfile.role === UserRole.Internal) {
        if (userProfile.permissions && userProfile.permissions.length > 0) {
            return allTabs.filter(tab => userProfile.permissions!.includes(tab.id));
        }
        return [];
    }

    return allTabs.filter(tab => tab.roles.includes(userProfile.role));
  }, [userProfile]);

  const isConjuntoAdmin = userProfile.role === UserRole.Trial || userProfile.role === UserRole.Subscriber;

  useEffect(() => {
    if (!isConjuntoAdmin || !userProfile.conjuntoId) return;

    const updateSliderItems = async () => {
      const [dueDates, tasks] = await Promise.all([
        apiService.fetchDueDates(userProfile.conjuntoId!),
        apiService.fetchTasks(userProfile.conjuntoId!),
      ]);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const urgentDueDates = dueDates
        .filter(d => d.status === 'Pendiente' || d.status === 'Vencido')
        .map(d => {
          const dueDate = new Date(d.dueDate);
          const timeDiff = dueDate.getTime() - today.getTime();
          const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

          let text = '';
          let color: 'red' | 'yellow' = 'yellow';

          if (d.status === 'Vencido') {
            text = `VENCIDO: ${d.item} hace ${Math.abs(dayDiff)} día(s)`;
            color = 'red';
          } else if (dayDiff <= 3) {
            text = `PAGO: ${d.item} vence en ${dayDiff} día(s)`;
            color = 'red';
          } else {
            text = `PAGO: ${d.item} vence el ${d.dueDate}`;
            color = 'yellow';
          }
          return { text, color, date: dueDate };
        });
      
      const urgentTasks = tasks
          .filter(t => !t.completed && t.dueDate)
          .map(t => {
              const dueDate = new Date(t.dueDate);
              const timeDiff = dueDate.getTime() - today.getTime();
              const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
              
              let text = `TAREA: ${t.text}`;
              let color: 'red' | 'yellow' = 'yellow';

              if (dayDiff < 0) {
                  text += ' (Vencida)';
                  color = 'red';
              } else if (dayDiff <= 3) {
                  text += ` (Vence en ${dayDiff} día(s))`;
                  color = 'red';
              }
              
              return { text, color, date: dueDate };
          });

      const staticItems = [
          { text: "Soporte ProDig - 3144897092", color: 'green' as const, date: new Date(9999,0,1) },
      ];
      
      const allUrgentItems = [...urgentDueDates, ...urgentTasks].sort((a,b) => a.date.getTime() - b.date.getTime());

      const combinedItems = [...allUrgentItems.slice(0, 4), ...staticItems];
      setSliderItems(combinedItems);
      setCurrentItem(0);
    };

    updateSliderItems();
    
    const intervalId = setInterval(updateSliderItems, 60000);
    return () => clearInterval(intervalId);

  }, [isConjuntoAdmin, userProfile.conjuntoId]);

  useEffect(() => {
    if (sliderItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentItem((prev) => (prev + 1) % sliderItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [sliderItems]);
  
  const trafficLightColor = sliderItems[currentItem] 
    ? {
        red: 'bg-red-500',
        yellow: 'bg-yellow-500',
        green: 'bg-green-500',
      }[sliderItems[currentItem].color] || 'bg-gray-500'
    : 'bg-gray-500';

  const handleTabClick = (tabId: Tab) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* 1. Mobile Drawer (Slide-over with Backdrop Blur) - < 768px */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-in-out" 
            onClick={onCloseMobile} 
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out border-r border-gray-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  P
                </div>
                <div>
                  <h2 className="font-bold text-gray-800 text-base">PAIC</h2>
                  <p className="text-xs text-gray-500">Menú Principal</p>
                </div>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Cerrar menú"
              >
                <Icon name="x" className="w-6 h-6" />
              </button>
            </div>

            {/* Drawer Links List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-400 px-3 uppercase tracking-wider mb-2">Módulos</p>
              {visibleTabs.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all min-h-[48px] ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md font-semibold'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
                    }`}
                  >
                    <Icon name={tab.icon} className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}

              {isConjuntoAdmin && (
                <>
                  <hr className="my-3 border-gray-200" />
                  <p className="text-xs font-semibold text-gray-400 px-3 uppercase tracking-wider mb-2">Herramientas</p>
                  <button
                    onClick={() => {
                      onSettingsClick();
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 min-h-[48px]"
                  >
                    <Icon name="settings" className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <span>Configuración</span>
                  </button>
                </>
              )}

              {(onHelpClick || onStartTour) && (
                <>
                  <hr className="my-3 border-gray-200" />
                  <p className="text-xs font-semibold text-gray-400 px-3 uppercase tracking-wider mb-2">Ayuda y Guía</p>
                  {onHelpClick && (
                    <button
                      onClick={() => {
                        onHelpClick();
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 min-h-[48px]"
                    >
                      <Icon name="user" className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span>Soporte Técnico</span>
                    </button>
                  )}
                  {onStartTour && (
                    <button
                      onClick={() => {
                        onStartTour();
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 min-h-[48px]"
                    >
                      <Icon name="bot" className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <span>Tour Guiado por Voz</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Drawer Footer */}
            {isConjuntoAdmin && sliderItems.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${trafficLightColor} flex-shrink-0`} />
                <p className="text-xs text-gray-700 truncate">{sliderItems[currentItem].text}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Horizontal Navbar for Tablet (768px+) and Desktop (> 1024px) */}
      <nav id="main-navbar" className="hidden md:block border-b border-gray-200 bg-white sticky top-[65px] z-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-2 flex justify-between items-center gap-4 overflow-x-auto">
          <div id="main-navigation-tabs" className="flex items-center gap-1.5 lg:gap-2 min-w-max">
            {visibleTabs.map((tab) => {
              const tabId = 'tab-' + tab.id.toLowerCase().replace(/\s+/g, '-').replace(/[áéíóú]/g, c => ({'á':'a','é':'e','í':'i','ó':'o','ú':'u'})[c] || c);
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={tabId}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap min-h-[40px] ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title={tab.label}
                >
                  <Icon name={tab.icon} className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                  <span className="hidden lg:inline">{tab.label}</span>
                  <span className="lg:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
            {isConjuntoAdmin && (
              <button
                id="btn-configuracion"
                onClick={() => onSettingsClick()}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
                aria-label="Abrir configuración"
                title="Configuración"
              >
                <Icon name="settings" className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>

          {isConjuntoAdmin && sliderItems.length > 0 && (
            <div className="hidden xl:flex items-center gap-2 overflow-hidden flex-shrink min-w-0 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              <div className={`w-2.5 h-2.5 rounded-full ${trafficLightColor} flex-shrink-0 animate-pulse`} />
              <p className="text-xs font-medium text-gray-700 truncate max-w-xs">{sliderItems[currentItem].text}</p>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default NavBar;