import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { UserProfile, Income, Expense, Resident, DueDate, Task } from '../../types';

interface StatusViewProps {
    userProfile: UserProfile;
}

interface DashboardMetrics {
    totalResidents: number;
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    pendingDueDates: number;
    overdueDueDates: number;
    pendingTasks: number;
    completedTasks: number;
}

const StatusView: React.FC<StatusViewProps> = ({ userProfile }) => {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = async () => {
        if (!userProfile.conjuntoId) return;
        setIsLoading(true);
        setError(null);
        try {
            const conjuntoId = userProfile.conjuntoId;
            const [residents, incomes, expenses, dueDates, tasks] = await Promise.all([
                apiService.fetchResidents(conjuntoId),
                apiService.fetchIncomes(conjuntoId),
                apiService.fetchExpenses(conjuntoId),
                apiService.fetchDueDates(conjuntoId),
                apiService.fetchTasks(conjuntoId),
            ]);

            const totalIncome = incomes.reduce((sum: number, inc: Income) => sum + (inc.amount || 0), 0);
            const totalExpenses = expenses.reduce((sum: number, exp: Expense) => sum + (exp.amount || 0), 0);

            setMetrics({
                totalResidents: residents.length,
                totalIncome,
                totalExpenses,
                balance: totalIncome - totalExpenses,
                pendingDueDates: dueDates.filter((d: DueDate) => d.status === 'Pendiente').length,
                overdueDueDates: dueDates.filter((d: DueDate) => d.status === 'Vencido').length,
                pendingTasks: tasks.filter((t: Task) => !t.completed).length,
                completedTasks: tasks.filter((t: Task) => t.completed).length,
            });
        } catch (err) {
            console.error('Error fetching status metrics:', err);
            setError('Error al cargar las métricas de estado.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, [userProfile.conjuntoId]);

    if (isLoading) {
        return <div className="p-6 text-center text-gray-500">Cargando estado general...</div>;
    }

    if (error) {
        return <div className="p-6 text-center text-red-500">{error}</div>;
    }

    if (!metrics) {
        return <div className="p-6 text-center text-gray-500">No hay datos disponibles.</div>;
    }

    const cards = [
        { label: 'Residentes', value: metrics.totalResidents, color: 'bg-blue-500' },
        { label: 'Ingresos Totales', value: `$${metrics.totalIncome.toLocaleString()}`, color: 'bg-green-500' },
        { label: 'Gastos Totales', value: `$${metrics.totalExpenses.toLocaleString()}`, color: 'bg-red-500' },
        { label: 'Balance', value: `$${metrics.balance.toLocaleString()}`, color: metrics.balance >= 0 ? 'bg-emerald-500' : 'bg-red-600' },
        { label: 'Vencimientos Pendientes', value: metrics.pendingDueDates, color: 'bg-yellow-500' },
        { label: 'Vencimientos Vencidos', value: metrics.overdueDueDates, color: 'bg-orange-500' },
        { label: 'Tareas Pendientes', value: metrics.pendingTasks, color: 'bg-purple-500' },
        { label: 'Tareas Completadas', value: metrics.completedTasks, color: 'bg-teal-500' },
    ];

    return (
        <div>
            <p className="text-gray-600 mb-6">
                Panel de estado general del conjunto. Aquí puedes ver un resumen de todas las áreas.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card) => (
                    <div key={card.label} className="bg-white rounded-lg shadow-md p-5">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${card.color}`}></div>
                            <p className="text-sm font-medium text-gray-600">{card.label}</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-800 mt-2">{card.value}</p>
                    </div>
                ))}
            </div>
            <div className="mt-6 bg-white rounded-lg shadow-md p-5">
                <p className="text-sm text-gray-500">
                    Última actualización: {new Date().toLocaleString('es-CO')}
                </p>
            </div>
        </div>
    );
};

export default StatusView;
