import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, BarChart, Bar } from 'recharts';
import { apiService } from '../../services/apiService';
// FIX: Imported missing types to resolve reference errors and improve type safety.
import { ChartData, DashboardSummary, NotificationItem, Tab, UserProfile, DueDate, Task, PackageLog, IncomeCategory, ExpenseCategory, VisitorLog, AccessPoint } from '../../types';
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

const StatCard: React.FC<{ title: string; value: number | string; icon: string; iconColor: string; }> = ({ title, value, icon, iconColor }) => (
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
        const fetchDataAndProcess = async () => {
            if (!userProfile.conjuntoId) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
    
            // Fetch all raw data sources concurrently and gracefully handle individual failures.
            const [
                accountStatusData,
                tasksData,
                dueDatesData,
                packagesData,
                visitorsData,
                incomesData,
                expensesData,
                accessPointsData,
            ] = await Promise.all([
                apiService.fetchAccountStatus(userProfile.conjuntoId).catch(() => []),
                apiService.fetchTasks(userProfile.conjuntoId).catch(() => []),
                apiService.fetchDueDates(userProfile.conjuntoId).catch(() => []),
                apiService.fetchPackageLogs(userProfile.conjuntoId).catch(() => []),
                apiService.fetchVisitorLogs(userProfile.conjuntoId).catch(() => []),
                apiService.fetchIncomes(userProfile.conjuntoId).catch(() => []),
                apiService.fetchExpenses(userProfile.conjuntoId).catch(() => []),
                apiService.fetchAccessPoints(userProfile.conjuntoId).catch(() => []),
            ]);
    
            // --- Process Data for Stats Cards ---
            const residentsInDebt = accountStatusData.filter(a => a.outstandingBalance > 0);
            const pendingTasks = tasksData.filter(t => !t.completed);
            const overduePayments = dueDatesData.filter(d => d.status === 'Vencido');
            const packagesToDeliver = packagesData.filter(p => p.status === 'En recepción');
    
            // --- Process Data for Notifications ---
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const dueDateNotifications: NotificationItem[] = dueDatesData
                .filter(d => d.status !== 'Pagado')
                .map(d => {
                    const dueDate = new Date(d.dueDate + 'T00:00:00');
                    const timeDiff = dueDate.getTime() - today.getTime();
                    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                    let urgency: 'high' | 'medium' = 'medium';
                    let details = `Vence el ${d.dueDate}.`;
                    if (dayDiff < 0) {
                        urgency = 'high';
                        details = `Venció hace ${Math.abs(dayDiff)} día(s).`;
                    } else if (dayDiff <= 3) {
                        urgency = 'high';
                        details = `Vence en ${dayDiff} día(s).`;
                    }
                    return { id: `d-${d.id}`, type: 'due-date', text: d.item, details, urgency, linkTo: Tab.DueDates };
                });

            const taskNotifications: NotificationItem[] = pendingTasks
                .filter(t => t.dueDate)
                .map(t => ({
                    id: `t-${t.id}`,
                    type: 'task',
                    text: t.text,
                    details: `Vence el ${t.dueDate}`,
                    urgency: 'medium',
                    linkTo: Tab.PendingTasks
                }));
            
            const packageNotifications: NotificationItem[] = packagesToDeliver.map(p => ({
                id: `p-${p.id}`,
                type: 'package',
                text: `Paquete para Apto ${p.apartment}`,
                details: `Recibido de ${p.courier}`,
                urgency: 'low',
                linkTo: Tab.Seguridad
            }));
            
            const allNotifications = [...dueDateNotifications, ...taskNotifications, ...packageNotifications]
                .sort((a, b) => {
                    const urgencyOrder = { high: 1, medium: 2, low: 3 };
                    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
                })
                .slice(0, 5); // Limit to top 5 notifications
    
            setSummary({
                stats: {
                    residentsInDebt: { count: residentsInDebt.length, details: residentsInDebt.slice(0, 10).map(r => `Apto ${r.apartment}: $${r.outstandingBalance.toLocaleString()}`) },
                    pendingTasks: { count: pendingTasks.length, details: pendingTasks.slice(0, 10).map(t => t.text) },
                    overduePayments: { count: overduePayments.length, details: overduePayments.slice(0, 10).map(p => p.item) },
                    packagesToDeliver: { count: packagesToDeliver.length, details: packagesToDeliver.slice(0, 10).map(p => `Apto ${p.apartment} de ${p.courier}`) },
                },
                notifications: allNotifications,
            });
    
            // --- Process Data for Charts ---
            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            const monthlyDataMap = new Map<string, { name: string, ingresos: number, gastos: number }>();
            
            [...incomesData, ...expensesData].forEach(item => {
                const date = new Date(item.date + 'T00:00:00');
                const month = date.getMonth();
                const year = date.getFullYear();
                const key = `${year}-${String(month).padStart(2, '0')}`;
                const name = `${monthNames[month]} ${String(year).slice(2)}`;
                if (!monthlyDataMap.has(key)) monthlyDataMap.set(key, { name, ingresos: 0, gastos: 0 });
                if ('category' in item && Object.values(IncomeCategory).includes(item.category as any)) {
                    monthlyDataMap.get(key)!.ingresos += item.amount;
                } else {
                    monthlyDataMap.get(key)!.gastos += item.amount;
                }
            });

            const monthlyIncomeVsExpense = Array.from(monthlyDataMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(entry => entry[1]);
            
            const expensesByCategory = Object.values(ExpenseCategory).map((cat, i) => ({
                name: cat,
                value: expensesData.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0),
                fill: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'][i % 5],
            })).filter(d => d.value > 0);

            // FIX: The generic type argument on .reduce is not supported in this environment, causing type inference issues.
            // Explicitly typing the accumulator in the callback and the initial value Map resolves this.
            const packageVolume = packagesData.reduce((acc: Map<string, number>, pkg) => {
                const date = new Date(pkg.receivedDate);
                const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
                acc.set(key, (acc.get(key) || 0) + 1);
                return acc;
            }, new Map<string, number>());
            const packageVolumeChartData = Array.from(packageVolume.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([key, value]) => ({ name: `${monthNames[parseInt(key.split('-')[1])]} ${key.split('-')[0].slice(2)}`, value }));
            
            // FIX: Add explicit type to map callback parameter to help TS infer types correctly.
            // FIX: Explicitly setting the return type of the map callback to a tuple `[number, string]` ensures that the Map constructor correctly infers its generic types as `Map<number, string>`.
            const accessPointMap = new Map(accessPointsData.map((ap: AccessPoint): [number, string] => [ap.id, ap.name]));
            // FIX: The generic type argument on .reduce is not supported in this environment, causing type inference issues.
            // Explicitly typing the accumulator in the callback and the initial value Map resolves this.
            const visitorTraffic = visitorsData.reduce((acc: Map<string, number>, visitor) => {
                const pointName = accessPointMap.get(visitor.accessPointId!) || 'Portería Desconocida';
                acc.set(pointName, (acc.get(pointName) || 0) + 1);
                return acc;
            }, new Map<string, number>());
            const visitorTrafficChartData = Array.from(visitorTraffic.entries()).map(([name, value]) => ({ name, value }));

            setChartData({
                monthlyIncomeVsExpense,
                expensesByCategory,
                packageVolume: packageVolumeChartData,
                visitorTraffic: visitorTrafficChartData
            });
    
            setIsLoading(false);
        };
        fetchDataAndProcess();
    }, [userProfile.conjuntoId]);


    const handleMouseEnter = (content: string[], event: React.MouseEvent) => {
        if (!content || content.length === 0) return;
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setTooltip({
            content,
            x: rect.left + rect.width / 2,
            y: rect.top,
        });
    };

    const handleMouseLeave = () => {
        setTooltip(null);
    };

    if (isLoading) {
        return <div className="text-center p-10 text-gray-500">Cargando centro de control...</div>;
    }

    if (!summary) {
        return (
            <div className="text-center p-10 bg-red-50 border border-red-200 rounded-lg">
                <Icon name="alert-triangle" className="w-12 h-12 mx-auto text-red-500"/>
                <h3 className="mt-4 text-lg font-semibold text-red-800">Error Crítico al Cargar el Centro de Control</h3>
                <p className="mt-2 text-red-700">No se pudieron obtener los datos iniciales.</p>
            </div>
        );
    }
    
    const { stats, notifications } = summary;
    
    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

    const charts = chartData ? [
        {
            title: 'Ingresos vs Gastos (Últimos 6 meses)',
            component: (
                 <LineChart data={chartData.monthlyIncomeVsExpense.slice(-6)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                    <Tooltip formatter={(value) => `$${(value as number).toLocaleString()}`} />
                    <Legend wrapperStyle={{fontSize: "12px"}}/>
                    <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#2563eb" strokeWidth={2} />
                    <Line type="monotone" dataKey="gastos" name="Gastos" stroke="#ef4444" strokeWidth={2} />
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
                <BarChart data={chartData.packageVolume.slice(-6)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
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
                <LineChart data={chartData.monthlyIncomeVsExpense.slice(-12)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
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
    ].filter(chart => {
        if (chart.title.includes('Gastos') && chartData.expensesByCategory.length === 0) return false;
        if (chart.title.includes('Paquetes') && chartData.packageVolume.length === 0) return false;
        if (chart.title.includes('Visitantes') && chartData.visitorTraffic.length === 0) return false;
        if (chart.title.includes('Ingresos') && chartData.monthlyIncomeVsExpense.length === 0) return false;
        return true;
    }) : [];

    const handleNextChart = () => {
        if (charts.length === 0) return;
        setCurrentChartIndex((prevIndex) => (prevIndex + 1) % charts.length);
    };

    const handlePrevChart = () => {
        if (charts.length === 0) return;
        setCurrentChartIndex((prevIndex) => (prevIndex - 1 + charts.length) % charts.length);
    };


  return (
    <div className="space-y-6">
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
                {charts.length === 0 ? (
                     <div className="text-center p-10 flex-grow flex flex-col justify-center items-center">
                        <Icon name="alert-triangle" className="w-10 h-10 mx-auto text-yellow-500"/>
                        <h3 className="mt-4 text-md font-semibold text-yellow-800">Gráficos no disponibles</h3>
                        <p className="mt-1 text-sm text-yellow-700">No hay suficientes datos para generar los gráficos.</p>
                    </div>
                ) : (
                    <>
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
                    </>
                )}
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