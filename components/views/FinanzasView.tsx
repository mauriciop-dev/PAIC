import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiService } from '../../services/apiService';
import { Expense, Provider, ExpenseCategory, ChartData } from '../../types';
import { monthlyCollectionData, monthlyBudget } from '../../data/mockData';

type FinanzasTab = 'Resumen' | 'Gastos';

const StatCard: React.FC<{ title: string; value: string; description: string; }> = ({ title, value, description }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-sm font-semibold text-gray-500">{title}</h3>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
    </div>
);

const FinanzasView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<FinanzasTab>('Resumen');
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<ExpenseCategory>('Otros');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [providerId, setProviderId] = useState<string>('');
    
    const [feedback, setFeedback] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [fetchedExpenses, fetchedProviders] = await Promise.all([
                apiService.fetchExpenses(),
                apiService.fetchProviders(),
            ]);
            setExpenses(fetchedExpenses);
            setProviders(fetchedProviders);
        } catch (error) {
            console.error("Failed to fetch finance data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount) {
            setFeedback("Por favor completa la descripción y el monto.");
            return;
        }

        const newExpense: Omit<Expense, 'id'> = {
            description,
            amount: parseFloat(amount),
            category,
            date,
            providerId: providerId ? parseInt(providerId) : undefined,
        };

        await apiService.addExpense(newExpense);
        
        // Reset form
        setDescription('');
        setAmount('');
        setCategory('Otros');
        setDate(new Date().toISOString().split('T')[0]);
        setProviderId('');
        
        setFeedback("¡Gasto agregado exitosamente!");
        setTimeout(() => setFeedback(null), 3000);

        fetchData(); // Refresh data
    };
    
    const handleDeleteExpense = async (id: number) => {
        if(window.confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
            await apiService.deleteExpense(id);
            fetchData();
        }
    }

    const { summary, charts } = useMemo(() => {
        const currentMonth = new Date().toLocaleString('default', { month: 'short' }).charAt(0).toUpperCase() + new Date().toLocaleString('default', { month: 'short' }).slice(1);
        const thisMonthIncome = monthlyCollectionData.find(m => m.name === currentMonth)?.value || 0;
        const thisMonthExpenses = expenses
            .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
            .reduce((sum, e) => sum + e.amount, 0);
        
        const budgetExecution = (thisMonthExpenses / monthlyBudget) * 100;

        const expenseByCategory = expenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
            return acc;
        }, {} as Record<ExpenseCategory, number>);

        const expenseChartData = Object.entries(expenseByCategory).map(([name, value], index) => ({
            name,
            value,
            fill: ['#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#10b981'][index % 5]
        }));
        
        const incomeVsExpenseData: ChartData[] = monthlyCollectionData.map(month => {
            // Simplified: Mocking monthly expenses for chart
            const mockExpense = month.value * (0.6 + Math.random() * 0.2);
            return {
                name: month.name,
                value: 0, // not used directly in this chart
                ingresos: month.value,
                gastos: mockExpense,
                fill: '' // not used
            }
        });

        return {
            summary: {
                thisMonthIncome,
                thisMonthExpenses,
                currentBalance: 50000, // Mock data
                budgetExecution: Math.min(100, budgetExecution),
            },
            charts: {
                expenseChartData,
                incomeVsExpenseData,
            }
        };
    }, [expenses]);
    
    const expenseCategories: ExpenseCategory[] = ['Servicios', 'Mantenimiento', 'Nómina', 'Administrativos', 'Otros'];

    const renderSummary = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Ingresos del Mes" value={`$${summary.thisMonthIncome.toLocaleString()}`} description="Recaudo de cuotas de administración" />
                <StatCard title="Gastos del Mes" value={`$${summary.thisMonthExpenses.toLocaleString()}`} description="Pagos y compras registradas" />
                <StatCard title="Saldo Actual (Estimado)" value={`$${summary.currentBalance.toLocaleString()}`} description="Balance en cuentas bancarias" />
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500">Ejecución Presupuestaria</h3>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{summary.budgetExecution.toFixed(1)}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${summary.budgetExecution}%` }}></div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-4 rounded-lg shadow-md h-80 flex flex-col">
                    <h3 className="text-md font-semibold text-gray-700 mb-4">Desglose de Gastos (Total)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={charts.expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            {charts.expenseChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `$${(value as number).toLocaleString()}`} />
                        <Legend wrapperStyle={{fontSize: "12px"}}/>
                      </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md h-80 flex flex-col">
                    <h3 className="text-md font-semibold text-gray-700 mb-4">Ingresos vs. Gastos (Últimos 6 meses)</h3>
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={charts.incomeVsExpenseData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis fontSize={12} tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                            <Tooltip formatter={(value) => `$${(value as number).toLocaleString()}`} />
                            <Legend wrapperStyle={{fontSize: "12px"}}/>
                            <Bar dataKey="ingresos" name="Ingresos" fill="#3b82f6" />
                            <Bar dataKey="gastos" name="Gastos" fill="#ef4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );

    const renderExpenses = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Registrar Gasto</h3>
                <form onSubmit={handleAddExpense} className="space-y-4">
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
                        <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Monto</label>
                        <input type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
                        <select id="category" value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white">
                            {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">Fecha</label>
                        <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label htmlFor="providerId" className="block text-sm font-medium text-gray-700">Proveedor (Opcional)</label>
                        <select id="providerId" value={providerId} onChange={e => setProviderId(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white">
                            <option value="">Ninguno</option>
                            {providers.map(p => <option key={p.id} value={p.id}>{p.company}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Agregar Gasto</button>
                    {feedback && <p className="text-sm text-green-600 text-center">{feedback}</p>}
                </form>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Últimos Gastos Registrados</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3">Fecha</th>
                                <th scope="col" className="px-4 py-3">Descripción</th>
                                <th scope="col" className="px-4 py-3">Categoría</th>
                                <th scope="col" className="px-4 py-3 text-right">Monto</th>
                                <th scope="col" className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map(exp => (
                                <tr key={exp.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-3">{exp.date}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{exp.description}</td>
                                    <td className="px-4 py-3">{exp.category}</td>
                                    <td className="px-4 py-3 text-right">${exp.amount.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleDeleteExpense(exp.id)} className="font-medium text-red-600 hover:underline">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );


    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Finanzas</h2>
             <div className="mb-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {(['Resumen', 'Gastos'] as FinanzasTab[]).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`${
                            activeTab === tab
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                        >
                          {tab}
                        </button>
                    ))}
                </nav>
            </div>
            {isLoading ? <div className="text-center p-10">Cargando datos financieros...</div> : (
                activeTab === 'Resumen' ? renderSummary() : renderExpenses()
            )}
        </div>
    );
};

export default FinanzasView;
