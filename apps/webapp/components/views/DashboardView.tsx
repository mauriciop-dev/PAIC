import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, BarChart, Bar } from 'recharts';
import { apiService } from '../../services/apiService';
// FIX: Imported missing types to resolve reference errors and improve type safety.
import { ChartData, DashboardSummary, NotificationItem, Tab, UserProfile, DueDate, Task, PackageLog, IncomeCategory, ExpenseCategory, VisitorLog, AccessPoint } from '../../types';
import { Icon } from '@paic/ui';
import { humanizeDueDateLabel } from '../../utils/notifications';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import ProgressRing from '../ProgressRing';

interface DashboardViewProps {
    setActiveTab: (tab: Tab) => void;
    userProfile: UserProfile;
}

interface DashboardSummaryWithProgress extends DashboardSummary {
    stats: DashboardSummary['stats'] & {
        taskProgress: { completed: number; total: number };
    };
}

interface TooltipData {
    content: string[];
    x: number;
    y: number;
}

const StatCard: React.FC<{ title: string; value: number | string; icon: string; iconBg?: string; iconColor?: string; }> = ({ 
    title, 
    value, 
    icon, 
    iconBg = 'bg-blue-50',
    iconColor = 'text-blue-600'
}) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
        <div className={`p-3.5 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
            <Icon name={icon} className="w-6 h-6" />
        </div>
        <div className="min-w-0">
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-0.5 truncate">{title}</h3>
        </div>
    </div>
);

const AlertStatCard: React.FC<{ title: string; value: number | string; subtitle?: string; isUrgent?: boolean }> = ({ 
    title, 
    value, 
    subtitle,
    isUrgent = true
}) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
        <div className={`p-3.5 rounded-2xl ${isUrgent ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'} flex items-center justify-center shrink-0`}>
            <Icon name="alert-triangle" className="w-6 h-6" />
        </div>
        <div className="min-w-0">
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">{value}</p>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1 truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
    </div>
);

const TasksStatCard: React.FC<{ title: string; pending: number; completed: number; total: number }> = ({ title, pending, completed, total }) => {
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
            <div className="shrink-0">
                <ProgressRing percentage={pct}>
                    <span className="text-sm font-bold text-slate-800">{pct}%</span>
                </ProgressRing>
            </div>
            <div className="min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
                <p className="text-sm font-medium text-slate-700 mt-0.5">{completed} de {total} listas</p>
                <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    {pending} pendientes
                </div>
            </div>
        </div>
    );
};

const NotificationCard: React.FC<{ item: NotificationItem; onClick: (tab: Tab) => void }> = ({ item, onClick }) => {
    const urgencyConfig = {
        high: {
            icon: 'alert-triangle',
            bgColor: 'bg-rose-50',
            textColor: 'text-rose-700',
            borderColor: 'border-rose-200'
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
            className={`w-full text-left p-3.5 flex items-start gap-3 rounded-xl border ${config.borderColor} ${config.bgColor} hover:shadow-sm hover:scale-[1.01] transition-all duration-200`}
        >
            <div className="p-1 rounded-lg shrink-0">
                <Icon name={iconMap[item.type]} className={`w-5 h-5 ${config.textColor}`} />
            </div>
            <div className="min-w-0">
                <p className={`font-semibold text-sm leading-snug ${config.textColor}`}>{item.text}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.details}</p>
            </div>
        </button>
    );
};


const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab, userProfile }) => {
    const [summary, setSummary] = useState<DashboardSummaryWithProgress | null>(null);
    const [chartData, setChartData] = useState<{ 
        monthlyIncomeVsExpense: ChartData[], 
        expensesByCategory: ChartData[],
        packageVolume: ChartData[],
        visitorTraffic: ChartData[]
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentChartIndex, setCurrentChartIndex] = useState(0);
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const isMobile = useMediaQuery('(max-width: 767px)');

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
            const todayForStats = new Date();
            todayForStats.setHours(0, 0, 0, 0); // Normalize to compare dates only

            const residentsInDebt = accountStatusData.filter(a => a.outstandingBalance > 0);
            const pendingTasks = tasksData.filter(t => !t.completed);
            const completedTasks = tasksData.filter(t => t.completed);
            const overduePayments = dueDatesData.filter(d => {
                if (d.status === 'Vencido') return true;
                if (d.status === 'Pendiente') {
                    // Adding 'T00:00:00' ensures the date is parsed in the local timezone,
                    // avoiding off-by-one day errors with UTC conversion.
                    const dueDate = new Date(d.dueDate + 'T00:00:00');
                    return dueDate < todayForStats;
                }
                return false;
            });
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
                    let overdue = false;
                    let dueSoon = false;
                    if (dayDiff < 0) {
                        urgency = 'high';
                        details = `Venció hace ${Math.abs(dayDiff)} día(s).`;
                        overdue = true;
                    } else if (dayDiff <= 3) {
                        urgency = 'high';
                        details = `Vence en ${dayDiff} día(s).`;
                        dueSoon = true;
                    }
                    const text = humanizeDueDateLabel(d.item, { overdue, dueSoon });
                    return { id: `d-${d.id}`, type: 'due-date', text, details, urgency, linkTo: Tab.DueDates };
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
                    taskProgress: { completed: completedTasks.length, total: tasksData.length },
                },
                notifications: allNotifications,
            });
    
            // --- Process Data for Charts ---
            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            const monthlyDataMap = new Map<string, { name: string, ingresos: number, gastos: number }>();

            incomesData.forEach(item => {
                const date = new Date(item.date + 'T00:00:00');
                const month = date.getMonth();
                const year = date.getFullYear();
                const key = `${year}-${String(month).padStart(2, '0')}`;
                const name = `${monthNames[month]} ${String(year).slice(2)}`;
                if (!monthlyDataMap.has(key)) monthlyDataMap.set(key, { name, ingresos: 0, gastos: 0 });
                monthlyDataMap.get(key)!.ingresos += item.amount;
            });

            expensesData.forEach(item => {
                const date = new Date(item.date + 'T00:00:00');
                const month = date.getMonth();
                const year = date.getFullYear();
                const key = `${year}-${String(month).padStart(2, '0')}`;
                const name = `${monthNames[month]} ${String(year).slice(2)}`;
                if (!monthlyDataMap.has(key)) monthlyDataMap.set(key, { name, ingresos: 0, gastos: 0 });
                monthlyDataMap.get(key)!.gastos += item.amount;
            });

            const monthlyIncomeVsExpense = Array.from(monthlyDataMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(entry => entry[1]);
            
            const expensesByCategory = Object.values(ExpenseCategory).map((cat, i) => ({
                name: cat,
                value: expensesData.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0),
                fill: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'][i % 5],
            })).filter(d => d.value > 0);

            // FIX: The reduce method was causing type inference errors in this environment. Switched to a forEach loop which is functionally equivalent and avoids the issue.
            const packageVolume = new Map<string, number>();
            packagesData.forEach(pkg => {
                const date = new Date(pkg.receivedDate);
                const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
                packageVolume.set(key, (packageVolume.get(key) || 0) + 1);
            });
            const packageVolumeChartData = Array.from(packageVolume.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([key, value]) => ({ name: `${monthNames[parseInt(key.split('-')[1])]} ${key.split('-')[0].slice(2)}`, value }));
            
            // FIX: Add explicit type to map callback parameter to help TS infer types correctly.
            // FIX: Explicitly setting the return type of the map callback to a tuple `[number, string]` ensures that the Map constructor correctly infers its generic types as `Map<number, string>`.
            const accessPointMap = new Map(accessPointsData.map((ap: AccessPoint): [number, string] => [ap.id, ap.name]));
            // FIX: The reduce method was causing type inference errors in this environment. Switched to a forEach loop which is functionally equivalent and avoids the issue.
            const visitorTraffic = new Map<string, number>();
            visitorsData.forEach(visitor => {
                const pointName = accessPointMap.get(visitor.accessPointId!) || 'Portería Desconocida';
                visitorTraffic.set(pointName, (visitorTraffic.get(pointName) || 0) + 1);
            });
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

    const compactFormatter = (value: number | string) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value as number);
    const moneyFormatter = (value: number | string) => `$${(value as number).toLocaleString()}`;

    const incomeExpenseLine = (data: ChartData[], months: number, dot: boolean) => (
        <LineChart data={data.slice(-months)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={compactFormatter} />
            <Tooltip formatter={moneyFormatter} />
            <Legend wrapperStyle={{fontSize: "12px"}}/>
            <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#2563eb" strokeWidth={2} dot={dot} />
            <Line type="monotone" dataKey="gastos" name="Gastos" stroke="#ef4444" strokeWidth={2} dot={dot} />
        </LineChart>
    );

    const incomeExpenseBar = (data: ChartData[], months: number) => (
        <BarChart data={data.slice(-months)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={compactFormatter} />
            <Tooltip formatter={moneyFormatter} />
            <Legend wrapperStyle={{fontSize: "12px"}}/>
            <Bar dataKey="ingresos" name="Ingresos" stackId="a" fill="#2563eb" />
            <Bar dataKey="gastos" name="Gastos" stackId="a" fill="#ef4444" />
        </BarChart>
    );

    const hasExpensesByCategory = chartData ? chartData.expensesByCategory.length > 0 : false;
    const hasPackageVolume = chartData ? chartData.packageVolume.length > 0 : false;
    const hasVisitorTraffic = chartData ? chartData.visitorTraffic.length > 0 : false;
    const hasMonthly = chartData ? chartData.monthlyIncomeVsExpense.length > 0 : false;

    const charts = chartData ? [
        {
            title: isMobile ? 'Ingresos vs Gastos · 6m' : 'Ingresos vs Gastos (Últimos 6 meses)',
            component: isMobile ? incomeExpenseBar(chartData.monthlyIncomeVsExpense, 6) : incomeExpenseLine(chartData.monthlyIncomeVsExpense, 6, true),
            show: hasMonthly,
        },
        {
            title: 'Gastos del Mes por Categoría',
            component: (
                <PieChart>
                    <Pie data={chartData.expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {chartData.expensesByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={moneyFormatter} />
                    <Legend wrapperStyle={{fontSize: "12px"}}/>
                </PieChart>
            ),
            show: hasExpensesByCategory,
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
            ),
            show: hasPackageVolume,
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
            ),
            show: hasVisitorTraffic,
        },
        {
            title: 'Comportamiento Histórico (Últimos 12 meses)',
            component: isMobile ? incomeExpenseBar(chartData.monthlyIncomeVsExpense, 12) : incomeExpenseLine(chartData.monthlyIncomeVsExpense, 12, false),
            show: hasMonthly,
        },
    ].filter(chart => chart.show).map(({ title, component }) => ({ title, component })) : [];

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
                <AlertStatCard title="Residentes en Mora" value={stats.residentsInDebt.count} />
            </div>
            <div onMouseEnter={(e) => handleMouseEnter(stats.pendingTasks.details, e)} onMouseLeave={handleMouseLeave}>
                <TasksStatCard
                    title="Tareas Pendientes"
                    pending={stats.pendingTasks.count}
                    completed={stats.taskProgress.completed}
                    total={stats.taskProgress.total}
                />
            </div>
            <div onMouseEnter={(e) => handleMouseEnter(stats.overduePayments.details, e)} onMouseLeave={handleMouseLeave}>
                <AlertStatCard title="Pagos Vencidos" value={stats.overduePayments.count} />
            </div>
            <div onMouseEnter={(e) => handleMouseEnter(stats.packagesToDeliver.details, e)} onMouseLeave={handleMouseLeave}>
                <StatCard title="Paquetes por Entregar" value={stats.packagesToDeliver.count} icon="package" iconColor="bg-blue-500" />
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-800 tracking-tight">Centro de Notificaciones</h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                        {notifications.length}
                    </span>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
                    {notifications.length > 0 ? (
                        notifications.map(item => (
                            <NotificationCard key={item.id} item={item} onClick={setActiveTab} />
                        ))
                    ) : (
                        <div className="text-center py-10 px-4 bg-slate-50/70 border border-slate-100 rounded-2xl flex flex-col items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                                <Icon name="check" className="w-5 h-5" />
                            </div>
                            <p className="text-sm font-medium text-slate-700">¡Todo al día!</p>
                            <p className="text-xs text-slate-400 mt-1">No hay alertas ni notificaciones pendientes.</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm h-[440px] flex flex-col">
                {charts.length === 0 ? (
                     <div className="text-center p-10 flex-grow flex flex-col justify-center items-center">
                        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                            <Icon name="alert-triangle" className="w-6 h-6"/>
                        </div>
                        <h3 className="text-base font-bold text-slate-800">Gráficos no disponibles</h3>
                        <p className="mt-1 text-xs text-slate-500 max-w-sm">Aún no hay suficientes registros en este período para proyectar las métricas visuales.</p>
                    </div>
                ) : (
                    <>
                        <div className={`${isMobile ? 'text-center mb-3' : 'flex justify-between items-center mb-4 pb-2 border-b border-slate-100'}`}>
                            <h3 className="text-base font-bold text-slate-800 tracking-tight">{charts[currentChartIndex].title}</h3>
                            {!isMobile && (
                                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200/60">
                                    <button 
                                        onClick={handlePrevChart} 
                                        aria-label="Gráfico anterior" 
                                        className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 hover:shadow-xs transition-all"
                                    >
                                        &lt;
                                    </button>
                                    <span className="text-xs font-semibold text-slate-600 px-1">{currentChartIndex + 1} / {charts.length}</span>
                                    <button 
                                        onClick={handleNextChart} 
                                        aria-label="Gráfico siguiente" 
                                        className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 hover:shadow-xs transition-all"
                                    >
                                        &gt;
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-h-0 pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                {charts[currentChartIndex].component}
                            </ResponsiveContainer>
                        </div>
                        {isMobile && (
                            <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-slate-100">
                                <button onClick={handlePrevChart} aria-label="Gráfico anterior" className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 min-h-[40px] min-w-[40px] transition-colors">
                                    &lt;
                                </button>
                                <span className="text-xs text-slate-600 font-semibold">{currentChartIndex + 1} / {charts.length}</span>
                                <button onClick={handleNextChart} aria-label="Gráfico siguiente" className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 min-h-[40px] min-w-[40px] transition-colors">
                                    &gt;
                                </button>
                            </div>
                        )}
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
