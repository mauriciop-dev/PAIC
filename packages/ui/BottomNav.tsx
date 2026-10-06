import React, { useState } from 'react';
import { Icon } from './Icon';
import { BottomSheet } from './BottomSheet';

export interface NavItem {
  id: string;
  icon: string;
  label: string;
}

export interface BottomNavProps {
  activeTab: string;
  onTabSelect: (tab: string) => void;
  primaryItems: NavItem[];
  secondaryItems: NavItem[];
  actions: { id: string; icon: string; label: string; handler: () => void }[];
  isExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  badges?: Record<string, number>; // tabId -> count
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabSelect,
  primaryItems,
  secondaryItems,
  actions,
  isExpanded = false,
  onExpandChange,
}) => {
  const [expanded, setExpanded] = useState(isExpanded);
  const swipeStartY = React.useRef<number | null>(null);

  const handleExpandChange = (value: boolean) => {
    setExpanded(value);
    onExpandChange?.(value);
  };

  const handleBarTouchStart = (e: React.TouchEvent) => {
    swipeStartY.current = e.touches[0].clientY;
  };

  const handleBarTouchMove = (e: React.TouchEvent) => {
    if (swipeStartY.current === null) return;
    const deltaY = e.touches[0].clientY - swipeStartY.current;
    if (deltaY < -20) {
      handleExpandChange(true);
      swipeStartY.current = null;
    }
  };

  const handleBarTouchEnd = () => {
    swipeStartY.current = null;
  };

  const isActiveTab = (id: string) => id === activeTab;

  const handleTabPress = (id: string) => {
    onTabSelect(id);
    handleExpandChange(false);
  };

  const handleActionPress = (handler: () => void) => {
    handler();
    handleExpandChange(false);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40">
      <BottomSheet
        isOpen={expanded}
        onClose={() => handleExpandChange(false)}
        title="Más opciones"
      >
        <div className="pb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-3">
            Módulos adicionales
          </p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {secondaryItems.map((item) => {
              const isActive = isActiveTab(item.id);
              const badgeCount = badges?.[item.id] ?? 0;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabPress(item.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 min-w-0 min-h-[68px] rounded-2xl py-2.5 transition-all relative ${
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
                  {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-3">
            Acciones rápidas
          </p>
          <div className="grid grid-cols-4 gap-2">
            {actions.map((item) => (
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
            const badgeCount = badges?.[item.id] ?? 0;
            return (
              <button
                key={item.id}
                onClick={() => handleTabPress(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[52px] min-h-[48px] rounded-xl transition-colors relative ${
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
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => handleExpandChange(!expanded)}
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
