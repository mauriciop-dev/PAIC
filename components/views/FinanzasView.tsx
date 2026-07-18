import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiService } from '../../services/apiService';
import { UserProfile, Income, Expense, IncomeCategory, ExpenseCategory, ChartData, Provider } from '../../types';
import ConfirmModal from '../ConfirmModal';
import SearchBar from '../SearchBar';
import { Icon } from '../ui/Icon';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

declare var XLSX: any;

// Props interface
interface FinanzasViewProps {
    userProfile: UserProfile;
}

enum FinanzasTab {
    Resumen = 'Resumen',
    Ingresos = 'Ingresos',
    Gastos = 'Gastos',
}

// Separate components for Modals to keep code clean

// IncomeModal
interface IncomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (income: Income) => void;
    incomeToEdit: Income | null;
}
const IncomeModal: React.FC<IncomeModalProps> = ({ isOpen, onClose, onSave, incomeToEdit }) => {
    const [formData, setFormData] = useState<Omit<Income, 'id'>>({
        description: '',
        amount: 0,
        category: IncomeCategory.CuotaAdmin,
        date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (incomeToEdit) {
            setFormData({
                description: incomeToEdit.description,
                amount: incomeToEdit.amount,
                category: incomeToEdit.category,
                date: incomeToEdit.date,
            });
        } else {
            setFormData({
                description: '',
                amount: 0,
                category: IncomeCategory.CuotaAdmin,
                date: new Date().toISOString().split('T')[0],
            });
        }
    }, [incomeToEdit, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, id: incomeToEdit?.id || 0 });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl p-8 w-11/12 md:w-1/2 lg:w-1/3 relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"><Icon name="x" className="w-6 h-6"/></button>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">{incomeToEdit ? 'Editar Ingreso' : 'Agregar Ingreso'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" name="description" value={formData.description} onChange={handleChange} placeholder="Descripción" className="w-full p-2 border rounded" required />
                    <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="Monto" className="w-full p-2 border rounded" required />
                    <select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                        {Object.values(IncomeCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded" required />
                    <div className="mt-8 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ExpenseModal
interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (expense: Expense) => void;
    expenseToEdit: Expense | null;
}
const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSave, expenseToEdit }) => {
     const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
        description: '',
        amount: 0,
        category: ExpenseCategory.Servicios,
        date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (expenseToEdit) {
            setFormData({
                description: expenseToEdit.description,
                amount: expenseToEdit.amount,
                category: expenseToEdit.category,
                date: expenseToEdit.date,
            });
        } else {
            setFormData({
                description: '',
                amount: 0,
                category: ExpenseCategory.Servicios,
                date: new Date().toISOString().split('T')[0],
            });
        }
    }, [expenseToEdit, isOpen]);

    if (!isOpen) return null;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, id: expenseToEdit?.id || 0 });
    };

    return (
       <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl p-8 w-11/12 md:w-1/2 lg:w-1/3 relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"><Icon name="x" className="w-6 h-6"/></button>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">{expenseToEdit ? 'Editar Gasto' : 'Agregar Gasto'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" name="description" value={formData.description} onChange={handleChange} placeholder="Descripción" className="w-full p-2 border rounded" required />
                    <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="Monto" className="w-full p-2 border rounded" required />
                    <select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                        {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded" required />
                    <div className="mt-8 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const FinanzasView: React.FC<FinanzasViewProps> = ({ userProfile }) => {
    const [activeTab, setActiveTab] = useState<FinanzasTab>(FinanzasTab.Resumen);
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState<Income | null>(null);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async () => {
        if (!userProfile.conjuntoId) return;
        setIsLoading(true);
        try {
            const [incomesData, expensesData, providersData] = await Promise.all([
                apiService.fetchIncomes(userProfile.conjuntoId),
                apiService.fetchExpenses(userProfile.conjuntoId),
                apiService.fetchProviders(userProfile.conjuntoId),
            ]);
            setIncomes(incomesData);
            setExpenses(expensesData);
            setProviders(providersData);
        } catch (error) {
            console.error("Failed to fetch financial data:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, [userProfile.conjuntoId]);

    const handleOpenIncomeModal = (income: Income | null) => { setEditingIncome(income); setIsIncomeModalOpen(true); };
    const handleOpenExpenseModal = (expense: Expense | null) => { setEditingExpense(expense); setIsExpenseModalOpen(true); };
    const handleCloseModals = () => { setIsIncomeModalOpen(false); setIsExpenseModalOpen(false); setEditingIncome(null); setEditingExpense(null); };

    const handleSaveIncome = async (income: Income) => {
        if (!userProfile.conjuntoId) return;
        if (editingIncome) {
            await apiService.updateIncome(userProfile.conjuntoId, income);
        } else {
            const { id, ...newIncome } = income;
            await apiService.addIncome(userProfile.conjuntoId, newIncome);
        }
        fetchData();
        handleCloseModals();
    };

    const handleSaveExpense = async (expense: Expense) => {
        if (!userProfile.conjuntoId) return;
        if (editingExpense) {
            await apiService.updateExpense(userProfile.conjuntoId, expense);
        } else {
            const { id, ...newExpense } = expense;
            await apiService.addExpense(userProfile.conjuntoId, newExpense);
        }
        fetchData();
        handleCloseModals();
    };
    
    const handleDeleteIncome = async (id: number) => {
        if (!userProfile.conjuntoId) return;
        await apiService.deleteIncome(userProfile.conjuntoId, id);
        fetchData();
    };
    
    const handleDeleteAllIncomes = async () => {
        if (!userProfile.conjuntoId) return;
        await apiService.deleteAllIncomes(userProfile.conjuntoId);
        fetchData();
    };

    const handleDeleteExpense = async (id: number) => {
        if (!userProfile.conjuntoId) return;
        await apiService.deleteExpense(userProfile.conjuntoId, id);
        fetchData();
    };

    const handleDeleteAllExpenses = async () => {
        if (!userProfile.conjuntoId) return;
        await apiService.deleteAllExpenses(userProfile.conjuntoId);
        fetchData();
    };
    
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchData();
        setIsRefreshing(false);
    };

    // --- FILE UPLOAD LOGIC ---
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setFeedbackMessage(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const json = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: null });

              if (json.length === 0) throw new Error("El archivo está vacío o tiene un formato incorrecto.");
              if (!userProfile.conjuntoId) throw new Error("ID de conjunto no encontrado.");

              const keyMaps = {
                  [FinanzasTab.Ingresos]: { 'descripcion': 'description', 'monto': 'amount', 'categoria': 'category', 'fecha': 'date' },
                  [FinanzasTab.Gastos]: { 'descripcion': 'description', 'monto': 'amount', 'categoria': 'category', 'fecha': 'date', 'proveedorid': 'providerId' }
              };
              
              const normalizeKeys = (row: any, map: { [key: string]: string }) => {
                  const normalizedRow: { [key: string]: any } = {};
                  for (const key in row) {
                      const lowerKey = key.toLowerCase().replace(/ /g, '').replace(/_/g, '');
                      const mappedKey = map[lowerKey] || key;
                      normalizedRow[mappedKey] = row[key];
                  }
                  return normalizedRow;
              };
              
              const currentMap = keyMaps[activeTab as keyof typeof keyMaps];
              if (!currentMap) throw new Error(`La carga masiva para ${activeTab} no está implementada.`);
              
              const normalizedData = json.map(row => normalizeKeys(row, currentMap));
              
              const finalData = normalizedData.map((row: any) => {
                  const parsedDate = XLSX.SSF.parse_date_code(row.date);
                  const date = parsedDate ? `${parsedDate.y}-${String(parsedDate.m).padStart(2, '0')}-${String(parsedDate.d).padStart(2, '0')}` : new Date().toISOString().split('T')[0];
                  return { ...row, date, amount: Number(row.amount) };
              });

              if (activeTab === FinanzasTab.Ingresos) {
                  await apiService.bulkInsertIncomes(userProfile.conjuntoId, finalData as Omit<Income, 'id'>[]);
              } else if (activeTab === FinanzasTab.Gastos) {
                  const providerMap = new Map(providers.map(p => [p.company.toLowerCase(), p.id]));
                  const invalidProviderNames = new Set<string>();

                  const expensesToInsert = finalData.map((row: any) => {
                      if (row.providerId && typeof row.providerId === 'string') {
                          const providerIdNum = providerMap.get(row.providerId.toLowerCase());
                          if (providerIdNum) {
                              return { ...row, providerId: providerIdNum };
                          } else {
                              invalidProviderNames.add(row.providerId);
                              return { ...row, providerId: null };
                          }
                      }
                      return row;
                  });

                  if (invalidProviderNames.size > 0) {
                      throw new Error(`Los siguientes proveedores no existen en la base de datos: ${[...invalidProviderNames].join(', ')}. Por favor, agrégalos primero.`);
                  }
                  
                  await apiService.bulkInsertExpenses(userProfile.conjuntoId, expensesToInsert as Omit<Expense, 'id'>[]);
              }

              await fetchData();
              setFeedbackMessage({type: 'success', text: `¡${json.length} registros cargados exitosamente!`});

          } catch (error: any) {
              console.error("Error processing file:", error);
              setFeedbackMessage({type: 'error', text: `Error al cargar: ${error.message}`});
          } finally {
              setIsUploading(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
              setTimeout(() => setFeedbackMessage(null), 7000);
          }
      };
      reader.readAsArrayBuffer(file);
    };

    const handleDownloadTemplate = () => {
        const templates = {
            [FinanzasTab.Ingresos]: { headers: ['description', 'amount', 'category', 'date'], filename: 'plantilla_ingresos.xlsx' },
            [FinanzasTab.Gastos]: { headers: ['description', 'amount', 'category', 'date', 'providerId'], filename: 'plantilla_gastos.xlsx' },
            [FinanzasTab.Resumen]: null,
        };
        const templateConfig = templates[activeTab];
        if (!templateConfig) return;
        
        const ws = XLSX.utils.aoa_to_sheet([templateConfig.headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab);
        XLSX.writeFile(wb, templateConfig.filename);
    };

    const { totalIncomes, totalExpenses, balance } = useMemo(() => {
        const totalIncomes = incomes.reduce((sum, item) => sum + item.amount, 0);
        const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
        const balance = totalIncomes - totalExpenses;
        return { totalIncomes, totalExpenses, balance };
    }, [incomes, expenses]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
    };
    
    const chartData = useMemo(() => {
        const expenseByCategory: ChartData[] = Object.values(ExpenseCategory).map((cat, index) => {
            const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];
            return {
                name: cat,
                value: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0),
                fill: PIE_COLORS[index % PIE_COLORS.length]
            }
        }).filter(item => item.value > 0);

        const monthlyDataMap = new Map<string, { name: string, ingresos: number, gastos: number }>();
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        
        incomes.forEach(income => {
            const month = new Date(income.date + 'T00:00:00').getMonth();
            const year = new Date(income.date + 'T00:00:00').getFullYear();
            const key = `${year}-${month}`;
            const name = `${monthNames[month]} ${year}`;
            if (!monthlyDataMap.has(key)) monthlyDataMap.set(key, { name, ingresos: 0, gastos: 0 });
            monthlyDataMap.get(key)!.ingresos += income.amount;
        });

        expenses.forEach(expense => {
            const month = new Date(expense.date + 'T00:00:00').getMonth();
            const year = new Date(expense.date + 'T00:00:00').getFullYear();
            const key = `${year}-${month}`;
            const name = `${monthNames[month]} ${year}`;
            if (!monthlyDataMap.has(key)) monthlyDataMap.set(key, { name, ingresos: 0, gastos: 0 });
            monthlyDataMap.get(key)!.gastos += expense.amount;
        });
        
        // FIX: The year argument for the Date constructor must be a number, not a string.
        const monthlyData = Array.from(monthlyDataMap.values()).sort((a,b) => new Date(Number(a.name.split(' ')[1]), monthNames.indexOf(a.name.split(' ')[0])).getTime() - new Date(Number(b.name.split(' ')[1]), monthNames.indexOf(b.name.split(' ')[0])).getTime());

        return { expenseByCategory, monthlyData };
    }, [incomes, expenses]);
    
    const renderResumen = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-lg shadow-md text-center border border-green-200">
                    <h3 className="text-sm font-semibold text-gray-500">Ingresos Totales</h3>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncomes)}</p>
                </div>
                <div className="bg-white p-5 rounded-lg shadow-md text-center border border-red-200">
                    <h3 className="text-sm font-semibold text-gray-500">Egresos Totales</h3>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                </div>
                 <div className="bg-white p-5 rounded-lg shadow-md text-center border border-blue-200">
                    <h3 className="text-sm font-semibold text-gray-500">Saldo Actual</h3>
                    <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(balance)}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md h-80 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Distribución de Egresos por Categoría</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData.expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                {chartData.expenseByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend wrapperStyle={{fontSize: "12px"}}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md h-80 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Ingresos vs. Gastos</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.monthlyData.slice(-6)} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis fontSize={12} tickFormatter={(value) => new Intl.NumberFormat('es-CO', { notation: 'compact', compactDisplay: 'short' }).format(value as number)}/>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend wrapperStyle={{fontSize: "12px"}}/>
                            <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" />
                            <Bar dataKey="gastos" name="Gastos" fill="#ef4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
    
    const renderTable = (type: 'income' | 'expense') => {
        const data = (type === 'income' ? incomes : expenses).filter(item =>
            !searchQuery || `${item.description} ${item.category} ${item.date} ${item.amount}`.toLowerCase().includes(searchQuery.toLowerCase())
        );
        const columns = ['Descripción', 'Categoría', 'Fecha', 'Monto'];
        
        return (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b">
                     <div className="flex items-center gap-4">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept=".xlsx, .xls" />
                        <button onClick={handleDownloadTemplate} className="text-sm font-medium text-blue-600 hover:underline">Descargar Plantilla</button>
                        <button onClick={handleUploadClick} disabled={isUploading} className="text-sm font-medium text-blue-600 hover:underline disabled:text-gray-400">
                            {isUploading ? 'Cargando...' : 'Cargar Archivo'}
                        </button>
                        {feedbackMessage && <p className={`text-sm ${feedbackMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{feedbackMessage.text}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Buscar..." />
                        <button onClick={handleRefresh} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100" aria-label="Refrescar datos">
                            <Icon name="refresh-cw" className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={() => setConfirmAction(type === 'income' ? { title: 'Eliminar Todos los Ingresos', message: '¿ESTÁS SEGURO? Esta acción eliminará TODOS los registros de ingresos de forma permanente.', onConfirm: handleDeleteAllIncomes } : { title: 'Eliminar Todos los Gastos', message: '¿ESTÁS SEGURO? Esta acción eliminará TODOS los registros de gastos de forma permanente.', onConfirm: handleDeleteAllExpenses })} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md font-semibold text-xs hover:bg-red-200">Eliminar Todos</button>
                        <button onClick={() => type === 'income' ? handleOpenIncomeModal(null) : handleOpenExpenseModal(null)} className="px-3 py-1.5 bg-blue-600 text-white rounded-md font-semibold text-xs flex items-center gap-1">
                            Agregar {type === 'income' ? 'Ingreso' : 'Egreso'}
                        </button>
                    </div>
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                {columns.map(col => <th key={col} scope="col" className="px-6 py-3">{col}</th>)}
                                <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item: any) => (
                                <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{item.description}</td>
                                    <td className="px-6 py-4">{item.category}</td>
                                    <td className="px-6 py-4">{item.date}</td>
                                    <td className="px-6 py-4 font-semibold">{formatCurrency(item.amount)}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => type === 'income' ? handleOpenIncomeModal(item) : handleOpenExpenseModal(item)} className="font-medium text-blue-600 hover:underline">Editar</button>
                                        <button onClick={() => setConfirmAction(type === 'income' ? { title: 'Eliminar Ingreso', message: '¿Seguro que quieres eliminar este ingreso?', onConfirm: () => handleDeleteIncome(item.id) } : { title: 'Eliminar Gasto', message: '¿Seguro que quieres eliminar este gasto?', onConfirm: () => handleDeleteExpense(item.id) })} className="font-medium text-red-600 hover:underline">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="mb-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                  {Object.values(FinanzasTab).map(tab => {
                    const subtabId = 'subtab-finanzas-' + tab.toLowerCase().replace(/[áéíóú]/g, c => ({'á':'a','é':'e','í':'i','ó':'o','ú':'u'})[c] || c);
                    return (
                    <button
                      key={tab}
                      id={subtabId}
                      onClick={() => setActiveTab(tab)}
                      className={`${ activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                    >
                      {tab}
                    </button>
                    );
                  })}
                </nav>
            </div>
            
            {isLoading ? (
                <div className="text-center p-10 text-gray-500">Cargando datos...</div>
            ) : (
                <>
                    {activeTab === FinanzasTab.Resumen && renderResumen()}
                    {activeTab === FinanzasTab.Ingresos && renderTable('income')}
                    {activeTab === FinanzasTab.Gastos && renderTable('expense')}
                </>
            )}

            <IncomeModal isOpen={isIncomeModalOpen} onClose={handleCloseModals} onSave={handleSaveIncome} incomeToEdit={editingIncome} />
            <ExpenseModal isOpen={isExpenseModalOpen} onClose={handleCloseModals} onSave={handleSaveExpense} expenseToEdit={editingExpense} />
            <ConfirmModal
                isOpen={confirmAction !== null}
                title={confirmAction?.title || ''}
                message={confirmAction?.message || ''}
                confirmLabel="Eliminar"
                onConfirm={() => { confirmAction?.onConfirm(); setConfirmAction(null); }}
                onCancel={() => setConfirmAction(null)}
            />
        </div>
    );
};

export default FinanzasView;