import React, { useState, useEffect, useMemo } from 'react';
import { Tab, UserProfile, UserRole } from '../types';
import { Icon } from './ui/Icon';
import { apiService } from '../services/apiService';

interface NavBarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  userProfile: UserProfile;
}

const allTabs = [
  { id: Tab.Dashboard, label: 'Centro de Control', icon: 'dashboard', roles: [UserRole.Admin] },
  { id: Tab.Database, label: 'Base de datos', icon: 'database', roles: [UserRole.Admin] },
  { id: Tab.CommonAreas, label: 'Áreas comunes', icon: 'calendar', roles: [UserRole.Admin] },
  { id: Tab.Comunicaciones, label: 'Comunicaciones', icon: 'mail', roles: [UserRole.Admin] },
  { id: Tab.Finanzas, label: 'Finanzas', icon: 'dollarSign', roles: [UserRole.Admin, UserRole.Contador] },
  { id: Tab.Seguridad, label: 'Seguridad', icon: 'shield', roles: [UserRole.Admin, UserRole.Guard] },
  { id: Tab.DueDates, label: 'Vencimientos', icon: 'clock', roles: [UserRole.Admin] },
  { id: Tab.PendingTasks, label: 'Tareas', icon: 'checkSquare', roles: [UserRole.Admin] },
];

const NavBar: React.FC<NavBarProps> = ({ activeTab, setActiveTab, userProfile }) => {
  const [sliderItems, setSliderItems] = useState<{ text: string; color: 'red' | 'yellow' | 'green' }[]>([]);
  const [currentItem, setCurrentItem] = useState(0);

  const visibleTabs = useMemo(() => {
    // This needs to be adapted when custom roles are fully implemented
    return allTabs.filter(tab => (userProfile.role && tab.roles.includes(userProfile.role as UserRole)));
  }, [userProfile.role]);

  useEffect(() => {
    if (userProfile.role !== UserRole.Admin || !userProfile.conjuntoId) return;

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
            text = `VENCIDO: ${d.item}`;
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
    
    const intervalId = setInterval(updateSliderItems, 60000); // Refresh every minute
    return () => clearInterval(intervalId);

  }, [userProfile.role, userProfile.conjuntoId]);

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

  return (
    <nav className="p-2 md:px-4 border-b border-gray-200 bg-white sticky top-0 z-10 flex justify-between items-center gap-4 flex-wrap">
      <div className="flex items-center gap-1 md:gap-2 flex-wrap">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {userProfile.role === UserRole.Admin && sliderItems.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 overflow-hidden flex-shrink min-w-0">
             <div className={`w-3 h-3 rounded-full ${trafficLightColor} flex-shrink-0`}></div>
             <p className="text-sm text-gray-700 truncate">{sliderItems[currentItem].text}</p>
          </div>
      )}
    </nav>
  );
};

export default NavBar;