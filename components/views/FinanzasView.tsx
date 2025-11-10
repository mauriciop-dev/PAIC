import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { apiService } from '../../services/apiService';
import { Expense, Provider, ExpenseCategory, Income, IncomeCategory, ChartData, UserProfile } from '../../types';

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

const expenseCategories: ExpenseCategory[] = ['Servicios', 'Mantenimiento', 'Nómina', 'Administrativos', 'Otros'];
const incomeCategories: IncomeCategory[] = ['Cuota de Administración', 'Multas', 'Alquiler de Áreas', 'Otros'];


const FinanzasView: React.FC<FinanzasViewProps> = ({ userProfile }) => {
    const [activeTab, setActiveTab] = useState<FinanzasTab>('Gastos');
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [chartData, setChartData] = useState<{ 
        monthlyIncomeVsExpense: ChartData[],
        expensesByCategory: ChartData[],
        packageVolume: ChartData[],
        visitorTraffic: ChartData[]
    } | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));


    // Form states
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Otros');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
    const [expenseProviderId, setExpenseProviderId] = useState<string>('');
    
    const [incomeDescription, setIncomeDescription] = useState('');
    const [incomeAmount, setIncomeAmount] = useState('');
    const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>('Cuota de Administración');
    const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
    
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

        const amountCleaned = expenseAmount.replace(/\./g, '');
        const newExpense: Omit<Expense, 'id'> = {
            description: expenseDescription,
            amount: parseFloat(amountCleaned),
            category: expenseCategory,
            date: expenseDate,
            providerId: expenseProviderId ? parseInt(expenseProviderId, 10) : null,
        };

        await apiService.addExpense(userProfile.conjuntoId, newExpense);
        
        setExpenseDescription('');
        setExpenseAmount('');
        setExpenseCategory('Otros');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setExpenseProviderId('');
        
        setFeedback("¡Gasto agregado exitosamente!");
        setTimeout(() => setFeedback(null), 3000);
        fetchData();
    };

    const handleAddIncome = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!incomeDescription || !incomeAmount || !userProfile.conjuntoId) {
            setFeedback("Por favor completa la descripción y el monto.");
            return;
        }

        const amountCleaned = incomeAmount.replace(/\./g, '');
        const newIncome: Omit<Income, 'id'> = {
            description: incomeDescription,
            amount: parseFloat(amountCleaned),
            category: incomeCategory,
            date: incomeDate,
        };

        await apiService.addIncome(userProfile.conjuntoId, newIncome);

        setIncomeDescription('');
        setIncomeAmount('');
        setIncomeCategory('Cuota de Administración');
        setIncomeDate(new Date().toISOString().split('T')[0]);

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
        if (!file || !userProfile.conjuntoId) return;

        setIsUploading(true);
        setUploadFeedback(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { cellDates: true });

                if (json.length === 0) {
                    throw new Error("El archivo está vacío o tiene un formato incorrecto.");
                }

                const sanitizeData = (data: any[], allowedKeys: Set<string>) => {
                    return data.map((row: any) =>
                        Object.keys(row).reduce((acc: any, key: string) => {
                            const lowerKey = key.toLowerCase();
                            if (allowedKeys.has(lowerKey)) {
                                acc[lowerKey] = row[key];
                            }
                            return acc;
                        }, {})
                    );
                };

                const formatDate = (dateValue: any): string | null => {
                     if (!dateValue) return null;
                     if (dateValue instanceof Date) {
                        const adjustedDate = new Date(dateValue.getTime() - (dateValue.getTimezoneOffset() * 60000));
                        return isNaN(adjustedDate.getTime()) ? null : adjustedDate.toISOString().split('T')[0];
                     }
                     const parsedDate = new Date(dateValue);
                     if (!isNaN(parsedDate.getTime())) {
                        const adjustedDate = new Date(parsedDate.getTime() - (parsedDate.getTimezoneOffset() * 60000));
                        return adjustedDate.toISOString().split('T')[0];
                     }
                     return null;
                };

                if (activeTab === 'Gastos') {
                    const expenseKeys = new Set(['description', 'amount', 'category', 'date', 'providerid']);
                    const sanitizedExpenses = sanitizeData(json, expenseKeys);

                    const providerNameToIdMap = new Map(providers.map(p => [p.company.toLowerCase(), p.id]));
                    const validExpenseCategories = new Set(expenseCategories);

                    const formattedExpenses = sanitizedExpenses.map((exp: any) => {
                        const mappedCategory = validExpenseCategories.has(exp.category) ? exp.category : 'Otros';
                        
                        const providerName = exp.providerid ? String(exp.providerid).toLowerCase() : null;
                        const mappedProviderId = providerName ? (providerNameToIdMap.get(providerName) || null) : null;

                        return {
                            description: exp.description || 'Sin descripción',
                            amount: parseFloat(exp.amount) || 0,
                            category: mappedCategory,
                            date: formatDate(exp.date) || new Date().toISOString().split('T')[0],
                            providerId: mappedProviderId,
                        }
                    });
                    await apiService.bulkInsertExpenses(userProfile.conjuntoId!, formattedExpenses);
                } else if (activeTab === 'Ingresos') {
                    const incomeKeys = new Set(['description', 'amount', 'category', 'date']);
                    const sanitizedIncomes = sanitizeData(json, incomeKeys);

                    const validIncomeCategories = new Set(incomeCategories);

                    const formattedIncomes = sanitizedIncomes.map((inc: any) => ({
                        description: inc.description || 'Sin descripción',
                        amount: parseFloat(inc.amount) || 0,
                        category: validIncomeCategories.has(inc.category) ? inc.category : 'Otros',
                        date: formatDate(inc.date) || new Date().toISOString().split('T')[0],
                    }));
                    await apiService.bulkInsertIncomes(userProfile.conjuntoId!, formattedIncomes);
                }

                setUploadFeedback({ type: 'success', text: `¡${json.length} registros cargados exitosamente!` });
                await fetchData();
            } catch (error: any) {
                setUploadFeedback({ type: 'error', text: `Error al cargar: ${error.message}` });
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setTimeout(() => setUploadFeedback(null), 7000);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDownloadTemplate = () => {
        const headers = activeTab === 'Gastos' 
            ? ['description', 'amount', 'category', 'date', 'providerId']
            : ['description', 'amount', 'category', 'date'];
        const filename = activeTab === 'Gastos' ? 'plantilla_gastos.xlsx' : 'plantilla_ingresos.xlsx';
        
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab);
        XLSX.writeFile(wb, filename);
    };

    const monthOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [];
        const today = new Date();
        for (let i = 0; i < 6; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const value = d.toISOString().slice(0, 7); // "YYYY-MM" format
            const label = d.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
            options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
        }
        return options;
    }, []);

    const { summary, charts } = useMemo(() => {
        if (!chartData || !expenses || !incomes) {
            return { summary: { thisMonthIncome: 0, thisMonthExpenses: 0, currentBalance: 0, budgetExecution: 0 }, charts: { expenseChartData: [], incomeVsExpenseData: [] } };
        }
    
        const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
        const currentMonth = selectedMonthNum - 1; // JS months are 0-indexed
        const currentYear = selectedYear;
    
        const thisMonthFilter = (item: { date: string }) => {
            if (!item.date) return false;
            const itemDate = new Date(item.date + 'T00:00:00Z');
            return itemDate.getUTCMonth() === currentMonth && itemDate.getUTCFullYear() === currentYear;
        };
    
        const thisMonthExpensesAmount = expenses.filter(thisMonthFilter).reduce((sum, e) => sum + e.amount, 0);
        const thisMonthIncomesAmount = incomes.filter(thisMonthFilter).reduce((sum, i) => sum + i.amount, 0);
    
        const budgetExecution = thisMonthIncomesAmount > 0 ? (thisMonthExpensesAmount / thisMonthIncomesAmount) * 100 : 0;
    
        const currentMonthExpensesForPie = expenses.filter(thisMonthFilter);
        const expensesByCategoryForPie: ChartData[] = currentMonthExpensesForPie.reduce((acc, expense) => {
            let category = acc.find(c => c.name === expense.category);
            if (!category) {
                category = { name: expense.category, value: 0, fill: '' };
                acc.push(category);
            }
            category.value += expense.amount;
            return acc;
        }, [] as ChartData[]).map((cat, i) => {
            const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];
            cat.fill = colors[i % colors.length];
            return cat;
        });
    
        return {
            summary: {
                thisMonthIncome: thisMonthIncomesAmount,
                thisMonthExpenses: thisMonthExpensesAmount,
                currentBalance: thisMonthIncomesAmount - thisMonthExpensesAmount,
                budgetExecution: Math.min(100, budgetExecution),
            },
            charts: {
                expenseChartData: expensesByCategoryForPie,
                incomeVsExpenseData: chartData.monthlyIncomeVsExpense,
            }
        };
    }, [expenses, incomes, chartData, selectedMonth]);

    const renderSummary = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Ingresos del Mes (Registrados)" value={`$${summary.thisMonthIncome.toLocaleString()}`} description="Suma de todos los ingresos guardados" />
                <StatCard title="Gastos del Mes" value={`$${summary.thisMonthExpenses.toLocaleString()}`} description="Pagos y compras registradas" />
                <StatCard title="Balance del Mes" value={`$${summary.currentBalance.toLocaleString()}`} description="Ingresos (registrados) vs. Gastos" />
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500">Ejecución Presupuestaria</h3>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{summary.budgetExecution.toFixed(1)}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${summary.budgetExecution}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Porcentaje de los ingresos gastados</p>
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
                    <h3 className="text-md font-semibold text-gray-700 mb-4">Ingresos (Registrados) vs. Gastos (Últimos 6 meses)</h3>
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={charts.incomeVsExpenseData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis fontSize={12} tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                            <Tooltip formatter={(value) => `$${(value as number).toLocaleString()}`} />
                            <Legend wrapperStyle={{fontSize: "12px"}}/>
                            <Line type="monotone" dataKey="ingresos" name="Ingresos (Registrados)" stroke="#2563eb" strokeWidth={2} />
                            <Line type="monotone" dataKey="gastos" name="Gastos (Registrados)" stroke="#ef4444" strokeWidth={2} />
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
                    <input type="text" placeholder="Descripción" value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" required />
                    <input type="text" inputMode="numeric" pattern="[0-9.]*" placeholder="Monto Ej: 150.000" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" required />
                    <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value as ExpenseCategory)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                        {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" required />
                    <select value={expenseProviderId} onChange={e => setExpenseProviderId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                        <option value="">Proveedor (Opcional)</option>
                        {providers.map(p => <option key={p.id} value={p.id}>{p.company}</option>)}
                    </select>
                    <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Agregar Gasto</button>
                    {feedback && <p className="text-sm text-green-600 text-center">{feedback}</p>}
                </form>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Últimos Gastos Registrados</h3>
                    <div className="flex items-center gap-4">
                        <button onClick={handleDownloadTemplate} className="text-xs font-medium text-blue-600 hover:underline">Descargar Plantilla</button>
                        <button onClick={handleUploadClick} disabled={isUploading} className="text-xs font-medium text-blue-600 hover:underline disabled:text-gray-400">
                            {isUploading ? 'Cargando...' : 'Cargar Información'}
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
                                <th scope="col" className="px-4 py-3">Proveedor</th>
                                <th scope="col" className="px-4 py-3 text-right">Monto</th>
                                <th scope="col" className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map(exp => {
                                const providerName = providers.find(p => p.id === exp.providerId)?.company || 'N/A';
                                return (
                                <tr key={exp.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-3">{exp.date}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{exp.description}</td>
                                    <td className="px-4 py-3">{exp.category}</td>
                                    <td className="px-4 py-3">{providerName}</td>
                                    <td className="px-4 py-3 text-right">${exp.amount.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleDeleteExpense(exp.id)} className="font-medium text-red-600 hover:underline">Eliminar</button>
                                    </td>
                                </tr>
                                );
                            })}
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
                    <input type="text" placeholder="Descripción" value={incomeDescription} onChange={e => setIncomeDescription(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" required />
                    <input type="text" inputMode="numeric" pattern="[0-9.]*" placeholder="Monto Ej: 250.000" value={incomeAmount} onChange={e => setIncomeAmount(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" required />
                    <select value={incomeCategory} onChange={e => setIncomeCategory(e.target.value as IncomeCategory)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                        {incomeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <input type="date" value={incomeDate} onChange={e => setIncomeDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" required />
                    <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Agregar Ingreso</button>
                    {feedback && <p className="text-sm text-green-600 text-center">{feedback}</p>}
                </form>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">Últimos Ingresos Registrados</h3>
                  <div className="flex items-center gap-4">
                    <button onClick={handleDownloadTemplate} className="text-xs font-medium text-blue-600 hover:underline">Descargar Plantilla</button>
                    <button onClick={handleUploadClick} disabled={isUploading} className="text-xs font-medium text-blue-600 hover:underline disabled:text-gray-400">
                        {isUploading ? 'Cargando...' : 'Cargar Información'}
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
                            {incomes.map(inc => (
                                <tr key={inc.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-3">{inc.date}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{inc.description}</td>
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

    const renderContent = () => {
        switch (activeTab) {
            case 'Resumen': return renderSummary();
            case 'Gastos': return renderExpenses();
            case 'Ingresos': return renderIncomes();
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
             <div className="mb-4 border-b border-gray-200 flex justify-between items-center flex-wrap gap-y-2">
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
                {activeTab === 'Resumen' && (
                    <div className="flex items-center gap-2 pr-1">
                        <label htmlFor="month-filter" className="text-sm font-medium text-gray-700">Mes:</label>
                        <select
                            id="month-filter"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="py-1 pl-2 pr-8 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            aria-label="Seleccionar mes a visualizar"
                        >
                            {monthOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
            {isLoading ? <div className="text-center p-10">Cargando datos financieros...</div> : renderContent()}
        </div>
    );
};

export default FinanzasView;