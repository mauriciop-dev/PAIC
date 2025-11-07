import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, BarChart, Bar } from 'recharts';
import { apiService } from '../../services/apiService';
import { ChartData, DashboardSummary, NotificationItem, Tab, UserProfile } from '../../types';
import { Icon } from '../ui/Icon';

interface DashboardViewProps {
    setActiveTab: (tab: Tab) => void;
    userProfile: UserProfile;
}

interface TooltipData {
    content: string[];
    x: number;
    y: number;
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


const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab, userProfile }) => {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [chartData, setChartData] = useState<{ 
        monthlyIncomeVsExpense: ChartData[], 
        expensesByCategory: ChartData[],
        packageVolume: ChartData[],
        visitorTraffic: ChartData[]
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentChartIndex, setCurrentChartIndex] = useState(0);
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!userProfile.conjuntoId) return;
            setIsLoading(true);
            try {
                const [summaryData, chartDataResult] = await Promise.all([
                    apiService.fetchDashboardSummary(userProfile.conjuntoId),
                    apiService.fetchFinancialChartData(userProfile.conjuntoId),
                ]);
                setSummary(summaryData);
                if (chartDataResult) {
                    setChartData({
                        monthlyIncomeVsExpense: chartDataResult.monthlyIncomeVsExpense,
                        expensesByCategory: chartDataResult.expensesByCategory,
                        packageVolume: chartDataResult.packageVolume,
                        visitorTraffic: chartDataResult.visitorTraffic,
                    });
                }
            } catch (error) {
                console.error("Failed to fetch dashboard summary", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [userProfile.conjuntoId]);

    const handleMouseEnter = (content: string[], event: React.MouseEvent) => {
        if (!content || content.length === 0) return;
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setTooltip({
            content,
            x: rect.left + rect.width / 2, // Center of the card
            y: rect.top, // Top edge of the card
        });
    };

    const handleMouseLeave = () => {
        setTooltip(null);
    };

    if (isLoading || !summary || !chartData) {
        return <div className="text-center p-10 text-gray-500">Cargando centro de control...</div>;
    }
    
    const { stats, notifications } = summary;
    
    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

    const charts = [
        {
            title: 'Ingresos vs Gastos (Últimos 6 meses)',
            component: (
                 <LineChart data={chartData.monthlyIncomeVsExpense.slice(-6)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                    <Tooltip formatter={(value) => `$${(value as number).toLocaleString()}`} />
                    <Legend wrapperStyle={{fontSize: "12px"}}/>
                    <Line type="monotone" dataKey="ingresos" name="Ingresos (Registrados)" stroke="#2563eb" strokeWidth={2} />
                    <Line type="monotone" dataKey="gastos" name="Gastos (Registrados)" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
            )
        },
        {
            title: 'Gastos del Mes por Categoría',
            component: (
                <PieChart>
                    <Pie data={chartData.expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {chartData.expensesByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `$${(value as number).toLocaleString()}`} />
                    <Legend wrapperStyle={{fontSize: "12px"}}/>
                </PieChart>
            )
        },
        {
            title: 'Volumen de Paquetes (Últimos 6 meses)',
            component: (
                <BarChart data={chartData.packageVolume} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{fontSize: "12px"}}/>
                    <Bar dataKey="value" name="Paquetes" fill="#82ca9d" />
                </BarChart>
            )
        },
        {
            title: 'Tráfico de Visitantes por Portería',
            component: (
               <PieChart>
                    <Pie data={chartData.visitorTraffic} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {chartData.visitorTraffic.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} visitantes`} />
                    <Legend wrapperStyle={{fontSize: "12px"}}/>
                </PieChart>
            )
        },
        {
            title: 'Comportamiento Histórico (Últimos 12 meses)',
            component: (
                <LineChart data={chartData.monthlyIncomeVsExpense} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                    <Tooltip formatter={(value) => `$${(value as number).toLocaleString()}`} />
                    <Legend wrapperStyle={{fontSize: "12px"}}/>
                    <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#2563eb" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="gastos" name="Gastos" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
            )
        },
    ];

    const handleNextChart = () => {
        setCurrentChartIndex((prevIndex) => (prevIndex + 1) % charts.length);
    };

    const handlePrevChart = () => {
        setCurrentChartIndex((prevIndex) => (prevIndex - 1 + charts.length) % charts.length);
    };


  return (
    <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div onMouseEnter={(e) => handleMouseEnter(stats.residentsInDebt.details, e)} onMouseLeave={handleMouseLeave}>
                <StatCard title="Residentes en Mora" value={stats.residentsInDebt.count} icon="users" iconColor="bg-red-500" />
            </div>
            <div onMouseEnter={(e) => handleMouseEnter(stats.pendingTasks.details, e)} onMouseLeave={handleMouseLeave}>
                <StatCard title="Tareas Pendientes" value={stats.pendingTasks.count} icon="checkSquare" iconColor="bg-yellow-500" />
            </div>
            <div onMouseEnter={(e) => handleMouseEnter(stats.overduePayments.details, e)} onMouseLeave={handleMouseLeave}>
                <StatCard title="Pagos Vencidos" value={stats.overduePayments.count} icon="alert-triangle" iconColor="bg-orange-500" />
            </div>
            <div onMouseEnter={(e) => handleMouseEnter(stats.packagesToDeliver.details, e)} onMouseLeave={handleMouseLeave}>
                <StatCard title="Paquetes por Entregar" value={stats.packagesToDeliver.count} icon="package" iconColor="bg-blue-500" />
            </div>
        </div>
        
        {/* Main Grid: Notifications + Chart Carousel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">{charts[currentChartIndex].title}</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevChart} className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800">
                            &lt;
                        </button>
                        <span className="text-xs text-gray-500">{currentChartIndex + 1} / {charts.length}</span>
                        <button onClick={handleNextChart} className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800">
                            &gt;
                        </button>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                    {charts[currentChartIndex].component}
                </ResponsiveContainer>
            </div>
        </div>

        {tooltip && (
            <div
                style={{
                    position: 'fixed',
                    left: `${tooltip.x}px`,
                    top: `${tooltip.y}px`,
                    transform: 'translate(-50%, -100%)',
                    marginTop: '-10px',
                }}
                className="z-50 w-60 p-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg max-h-64 overflow-y-auto"
            >
                <ul className="list-disc list-inside">
                    {tooltip.content.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
            </div>
        )}
    </div>
  );
};

export default DashboardView;