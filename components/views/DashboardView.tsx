

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiService } from '../../services/apiService';
import { ChartData, DashboardSummary, NotificationItem, Tab, UserProfile } from '../../types';
import { 
    monthlyCollectionData, 
    pendingPaymentsData,
} from '../../data/mockData';
import { Icon } from '../ui/Icon';

interface DashboardViewProps {
    conjuntoName: string;
    setActiveTab: (tab: Tab) => void;
    userProfile: UserProfile;
}

const StatCard: React.FC<{ title: string; value: number; icon: string; iconColor: string; }> = ({ title, value, icon, iconColor }) => (
    <div className="bg-white p-5 rounded-lg shadow-md flex items-center gap-4">
        <div className={`p-3 rounded-full ${iconColor}`}>
            <Icon name={icon} className="w-6 h-6 text-white" />
        </div>
        <div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <h3 className="text-sm font-semibold text-gray-500">{title}</h3>
        </div>
    </div>
);

const NotificationCard: React.FC<{ item: NotificationItem; onClick: (tab: Tab) => void }> = ({ item, onClick }) => {
    const urgencyConfig = {
        high: {
            icon: 'alert-triangle',
            bgColor: 'bg-red-50',
            textColor: 'text-red-800',
            borderColor: 'border-red-200'
        },
        medium: {
            icon: 'clock',
            bgColor: 'bg-yellow-50',
            textColor: 'text-yellow-800',
            borderColor: 'border-yellow-200'
        },
        low: {
            icon: 'package',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-800',
            borderColor: 'border-blue-200'
        }
    };
    
    const iconMap = {
        'due-date': 'alert-triangle',
        'task': 'checkSquare',
        'package': 'package'
    };

    const config = urgencyConfig[item.urgency];

    return (
        <button
            onClick={() => onClick(item.linkTo)}
            className={`w-full text-left p-3 flex items-start gap-3 rounded-lg border ${config.borderColor} ${config.bgColor} hover:shadow-sm transition-shadow`}
        >
            <Icon name={iconMap[item.type]} className={`w-5 h-5 mt-1 flex-shrink-0 ${config.textColor}`} />
            <div>
                <p className={`font-semibold text-sm ${config.textColor}`}>{item.text}</p>
                <p className="text-xs text-gray-500">{item.details}</p>
            </div>
        </button>
    );
};


const DashboardView: React.FC<DashboardViewProps> = ({ conjuntoName, setActiveTab, userProfile }) => {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!userProfile.conjuntoId) return;
            setIsLoading(true);
            try {
                // FIX: Pass conjuntoId to fetchDashboardSummary.
                const summaryData = await apiService.fetchDashboardSummary(userProfile.conjuntoId);
                setSummary(summaryData);
            } catch (error) {
                console.error("Failed to fetch dashboard summary", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [userProfile.conjuntoId]);

    if (isLoading) {
        return <div className="text-center p-10 text-gray-500">Cargando centro de control...</div>;
    }
    
    if (!summary) {
        return <div className="text-center p-10 text-red-500">No se pudieron cargar los datos del dashboard.</div>;
    }
    
    const { stats, notifications } = summary;

  return (
    <div className="space-y-8">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Centro de Control de {conjuntoName}</h2>
            <p className="text-gray-600">Un resumen de las actividades y alertas más importantes.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Residentes en Mora" value={stats.residentsInDebt} icon="users" iconColor="bg-red-500" />
            <StatCard title="Tareas Pendientes" value={stats.pendingTasks} icon="checkSquare" iconColor="bg-yellow-500" />
            <StatCard title="Pagos Vencidos" value={stats.overduePayments} icon="alert-triangle" iconColor="bg-orange-500" />
            <StatCard title="Paquetes por Entregar" value={stats.packagesToDeliver} icon="package" iconColor="bg-blue-500" />
        </div>
        
        {/* Main Grid: Notifications + Key Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Centro de Notificaciones</h3>
                <div className="space-y-3">
                    {notifications.length > 0 ? (
                        notifications.map(item => (
                            <NotificationCard key={item.id} item={item} onClick={setActiveTab} />
                        ))
                    ) : (
                        <p className="text-sm text-center text-gray-500 p-4 bg-gray-50 rounded-md">¡Todo en orden! No hay notificaciones urgentes.</p>
                    )}
                </div>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md h-96 flex flex-col">
                 <h3 className="text-lg font-semibold text-gray-700 mb-4">Recaudo vs Pagos Pendientes</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyCollectionData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                        <Tooltip formatter={(value) => `$${(value as number).toLocaleString()}`} />
                        <Legend wrapperStyle={{fontSize: "12px"}}/>
                        <Bar dataKey="value" name="Recaudo Mensual" fill="#3b82f6" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

         {/* Collapsible section for more charts */}
        <details className="bg-white rounded-lg shadow-md">
            <summary className="p-6 font-semibold text-gray-700 cursor-pointer flex justify-between items-center">
                Ver Más Gráficos de Análisis
                <span className="text-gray-500 transform transition-transform duration-300 chevron-rotate">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </span>
            </summary>
            <div className="p-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg h-80 flex flex-col">
                        <h3 className="text-md font-semibold text-gray-700 mb-4">Pagos Pendientes de la Administración</h3>
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                                <Pie data={pendingPaymentsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {pendingPaymentsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip formatter={(value) => `$${(value as number).toLocaleString()}`} />
                                <Legend wrapperStyle={{fontSize: "12px"}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Add another chart here if needed */}
                </div>
            </div>
        </details>
    </div>
  );
};

export default DashboardView;