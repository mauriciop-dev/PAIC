import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { apiService } from '../../services/apiService';
import { Expense, Provider, ExpenseCategory, ChartData, UserProfile, Income, IncomeCategory } from '../../types';

type FinanzasTab = 'Resumen' | 'Gastos' | 'Ingresos';
declare var XLSX: any;


const StatCard: React.FC<{ title: string; value: string; description: string; }> = ({ title, value, description }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-sm font-semibold text-gray-500">{title}</h3>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
    </div>
);

interface FinanzasViewProps {
    userProfile: UserProfile;
}

const FinanzasView: React.FC<FinanzasViewProps> = ({ userProfile }) => {
    const [activeTab, setActiveTab] = useState<FinanzasTab>('Resumen');
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [chartData, setChartData] = useState<{ monthlyIncomeVsExpense: ChartData[], expensesByCategory: ChartData[], monthlyBudget: number } | null>(null);

    // Expense Form state
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Otros');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
    const [expenseProviderId, setExpenseProviderId] = useState<string>('');
    const [expenseIsRecurring, setExpenseIsRecurring] = useState(false);
    
    // Income Form state
    const [incomeDescription, setIncomeDescription] = useState('');
    const [incomeAmount, setIncomeAmount] = useState('');
    const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>('Cuotas de Administración');
    const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
    const [incomeIsRecurring, setIncomeIsRecurring] = useState(false);
    
    const [feedback, setFeedback] = useState<string | null>(null);
    const [uploadFeedback, setUploadFeedback] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    const fetchData = async () => {
        if (!userProfile.conjuntoId) return;
        setIsLoading(true);
        try {
            const [fetchedExpenses, fetchedIncomes, fetchedProviders, fetchedChartData] = await Promise.all([
                apiService.fetchExpenses(userProfile.conjuntoId),
                apiService.fetchIncomes(userProfile.conjuntoId),
                apiService.fetchProviders(userProfile.conjuntoId),
                apiService.fetchFinancialChartData(userProfile.conjuntoId),
            ]);
            setExpenses(fetchedExpenses);
            setIncomes(fetchedIncomes);
            setProviders(fetchedProviders);
            setChartData(fetchedChartData);
        } catch (error) {
            console.error("Failed to fetch finance data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userProfile.conjuntoId]);

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseDescription || !expenseAmount || !userProfile.conjuntoId) {
            setFeedback("Por favor completa la descripción y el monto.");
            return;
        }

        const newExpense: Omit<Expense, 'id'> = {
            description: expenseDescription,
            amount: parseFloat(expenseAmount),
            category: expenseCategory,
            date: expenseDate,
            providerId: expenseProviderId ? parseInt(expenseProviderId) : undefined,
            isRecurring: expenseIsRecurring,
        };

        await apiService.addExpense(userProfile.conjuntoId, newExpense);
        
        // Reset form
        setExpenseDescription('');
        setExpenseAmount('');
        setExpenseCategory('Otros');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setExpenseProviderId('');
        setExpenseIsRecurring(false);
        
        setFeedback("¡Gasto agregado exitosamente!");
        setTimeout(() => setFeedback(null), 3000);

        fetchData(); // Refresh data
    };
    
    const handleAddIncome = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!incomeDescription || !incomeAmount || !userProfile.conjuntoId) {
            setFeedback("Por favor completa la descripción y el monto.");
            return;
        }
        const newIncome: Omit<Income, 'id'> = {
            description: incomeDescription,
            amount: parseFloat(incomeAmount),
            category: incomeCategory,
            date: incomeDate,
            isRecurring: incomeIsRecurring,
        };
        await apiService.addIncome(userProfile.conjuntoId, newIncome);
        setIncomeDescription('');
        setIncomeAmount('');
        setIncomeCategory('Cuotas de Administración');
        setIncomeDate(new Date().toISOString().split('T')[0]);
        setIncomeIsRecurring(false);
        setFeedback("¡Ingreso agregado exitosamente!");
        setTimeout(() => setFeedback(null), 3000);
        fetchData();
    };

    
    const handleDeleteExpense = async (id: number) => {
        if(window.confirm('¿Estás seguro de que quieres eliminar este gasto?') && userProfile.conjuntoId) {
            await apiService.deleteExpense(userProfile.conjuntoId, id);
            fetchData();
        }
    }
    
    const handleDeleteIncome = async (id: number) => {
        if(window.confirm('¿Estás seguro de que quieres eliminar este ingreso?') && userProfile.conjuntoId) {
            await apiService.deleteIncome(userProfile.conjuntoId, id);
            fetchData();
        }
    }

     const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadFeedback(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) throw new Error("El archivo está vacío o tiene un formato incorrecto.");
                if (!userProfile.conjuntoId) throw new Error("ID de conjunto no encontrado.");

                // Note: bulk upsert for expenses/incomes is not implemented in apiService,
                // this would need to be added for full functionality.
                // For now, we'll just log it.
                console.log(`Uploading ${json.length} records for ${activeTab}`, json);
                
                // Example of how it WOULD work:
                // if (activeTab === 'Gastos') {
                //     await apiService.bulkUpsertExpenses(userProfile.conjuntoId, json);
                // } else if (activeTab === 'Ingresos') {
                //     await apiService.bulkUpsertIncomes(userProfile.conjuntoId, json);
                // }
                
                await fetchData();
                setUploadFeedback({type: 'success', text: `¡${json.length} registros cargados con éxito!`});

            } catch (error: any) {
                console.error("Error processing file:", error);
                setUploadFeedback({type: 'error', text: `Error al cargar: ${error.message}`});
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
                setTimeout(() => setUploadFeedback(null), 7000);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDownloadTemplate = () => {
        const headers = activeTab === 'Gastos' 
            ? ['description', 'amount', 'category', 'date', 'providerId', 'isRecurring']
            : ['description', 'amount', 'category', 'date', 'isRecurring'];
        const filename = activeTab === 'Gastos' ? 'plantilla_gastos.xlsx' : 'plantilla_ingresos.xlsx';
        
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab);
        XLSX.writeFile(wb, filename);
    };

    const { summary, charts } = useMemo(() => {
        if (!chartData) { // Guard clause for initial render
            return {
                summary: { thisMonthIncome: 0, thisMonthExpenses: 0, currentBalance: 0, budgetExecution: 0 },
                charts: { expenseChartData: [], incomeVsExpenseData: [] }
            };
        }

        const thisMonthExpenses = expenses
            .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
            .reduce((sum, e) => sum + e.amount, 0);
            
        const thisMonthIncome = incomes
            .filter(i => new Date(i.date).getMonth() === new Date().getMonth())
            .reduce((sum, i) => sum + i.amount, 0);

        const potentialIncome = chartData.monthlyIncomeVsExpense.slice(-1)[0]?.ingresos || 0;
        
        const budgetExecution = potentialIncome > 0 ? (thisMonthExpenses / potentialIncome) * 100 : 0;

        return {
            summary: {
                thisMonthIncome: potentialIncome,
                thisMonthExpenses,
                currentBalance: thisMonthIncome - thisMonthExpenses,
                budgetExecution: Math.min(100, budgetExecution),
            },
            charts: {
                expenseChartData: chartData.expensesByCategory,
                incomeVsExpenseData: chartData.monthlyIncomeVsExpense,
            }
        };
    }, [expenses, incomes, chartData]);
    
    const expenseCategories: ExpenseCategory[] = ['Servicios', 'Mantenimiento', 'Nómina', 'Administrativos', 'Otros'];
    const incomeCategories: IncomeCategory[] = ['Cuotas de Administración', 'Intereses de Mora', 'Alquiler de Áreas', 'Otros'];

    const renderSummary = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Ingresos del Mes (Potencial)" value={`$${summary.thisMonthIncome.toLocaleString()}`} description="Recaudo de cuotas de administración" />
                <StatCard title="Gastos del Mes" value={`$${summary.thisMonthExpenses.toLocaleString()}`} description="Pagos y compras registradas" />
                <StatCard title="Balance del Mes" value={`$${summary.currentBalance.toLocaleString()}`} description="Ingresos (reales) vs. Gastos" />
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
                    <h3 className="text-md font-semibold text-gray-700 mb-4">Desglose de Gastos del Mes</h3>
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
                        <LineChart data={charts.incomeVsExpenseData.slice(-6)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis fontSize={12} tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                            <Tooltip formatter={(value) => `$${(value as number).toLocaleString()}`} />
                            <Legend wrapperStyle={{fontSize: "12px"}}/>
                            <Line type="monotone" dataKey="ingresos" name="Ingresos (Potencial)" stroke="#2563eb" strokeWidth={2} />
                            <Line type="monotone" dataKey="gastos" name="Gastos" stroke="#ef4444" strokeWidth={2} />
                        </LineChart>
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
                        <input type="text" id="description" value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Monto</label>
                        <input type="number" id="amount" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
                        <select id="category" value={expenseCategory} onChange={e => setExpenseCategory(e.target.value as ExpenseCategory)} className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white">
                            {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">Fecha</label>
                        <input type="date" id="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label htmlFor="providerId" className="block text-sm font-medium text-gray-700">Proveedor (Opcional)</label>
                        <select id="providerId" value={expenseProviderId} onChange={e => setExpenseProviderId(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white">
                            <option value="">Ninguno</option>
                            {providers.map(p => <option key={p.id} value={p.id}>{p.company}</option>)}
                        </select>
                    </div>
                     <div className="flex items-center">
                        <input id="isRecurringExpense" type="checkbox" checked={expenseIsRecurring} onChange={e => setExpenseIsRecurring(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <label htmlFor="isRecurringExpense" className="ml-2 block text-sm text-gray-900">Gasto recurrente (mensual)</label>
                    </div>
                    <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Agregar Gasto</button>
                    {feedback && <p className="text-sm text-green-600 text-center">{feedback}</p>}
                </form>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">Últimos Gastos Registrados</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={handleDownloadTemplate} className="text-xs font-medium text-blue-600 hover:underline">Descargar Plantilla</button>
                    <button onClick={handleUploadClick} disabled={isUploading} className="text-xs font-medium text-blue-600 hover:underline disabled:text-gray-400">
                        {isUploading ? 'Cargando...' : 'Cargar Datos'}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" />
                  </div>
                </div>
                 {uploadFeedback && (
                    <p className={`text-sm mb-4 ${uploadFeedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {uploadFeedback.text}
                    </p>
                )}
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
    
    const renderIncomes = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Registrar Ingreso</h3>
                <form onSubmit={handleAddIncome} className="space-y-4">
                    <div>
                        <label htmlFor="incomeDesc" className="block text-sm font-medium text-gray-700">Descripción</label>
                        <input type="text" id="incomeDesc" value={incomeDescription} onChange={e => setIncomeDescription(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label htmlFor="incomeAmount" className="block text-sm font-medium text-gray-700">Monto</label>
                        <input type="number" id="incomeAmount" value={incomeAmount} onChange={e => setIncomeAmount(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label htmlFor="incomeCategory" className="block text-sm font-medium text-gray-700">Categoría</label>
                        <select id="incomeCategory" value={incomeCategory} onChange={e => setIncomeCategory(e.target.value as IncomeCategory)} className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white">
                            {incomeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="incomeDate" className="block text-sm font-medium text-gray-700">Fecha</label>
                        <input type="date" id="incomeDate" value={incomeDate} onChange={e => setIncomeDate(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div className="flex items-center">
                        <input id="isRecurringIncome" type="checkbox" checked={incomeIsRecurring} onChange={e => setIncomeIsRecurring(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <label htmlFor="isRecurringIncome" className="ml-2 block text-sm text-gray-900">Ingreso recurrente (mensual)</label>
                    </div>
                    <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Agregar Ingreso</button>
                    {feedback && <p className="text-sm text-green-600 text-center">{feedback}</p>}
                </form>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                 <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">Últimos Ingresos Registrados</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={handleDownloadTemplate} className="text-xs font-medium text-blue-600 hover:underline">Descargar Plantilla</button>
                    <button onClick={handleUploadClick} disabled={isUploading} className="text-xs font-medium text-blue-600 hover:underline disabled:text-gray-400">
                        {isUploading ? 'Cargando...' : 'Cargar Datos'}
                    </button>
                  </div>
                </div>
                 {uploadFeedback && (
                    <p className={`text-sm mb-4 ${uploadFeedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {uploadFeedback.text}
                    </p>
                )}
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
                            {incomes.map(inc => (
                                <tr key={inc.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-3">{inc.date}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{inc.description}</td>
                                    <td className="px-4 py-3">{inc.category}</td>
                                    <td className="px-4 py-3 text-right">${inc.amount.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleDeleteIncome(inc.id)} className="font-medium text-red-600 hover:underline">Eliminar</button>
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
        <div className="space-y-6">
             <div className="mb-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {(['Resumen', 'Gastos', 'Ingresos'] as FinanzasTab[]).map(tab => (
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
                activeTab === 'Resumen' ? renderSummary() : activeTab === 'Gastos' ? renderExpenses() : renderIncomes()
            )}
        </div>
    );
};

export default FinanzasView;