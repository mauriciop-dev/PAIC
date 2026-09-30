import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiService } from '../../services/apiService';
import { UserProfile, Income, Expense, IncomeCategory, ExpenseCategory, ChartData, Provider } from '../../types';
import ConfirmModal from '../ConfirmModal';
import SearchBar from '../SearchBar';
import { Icon } from '@paic/ui';
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
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg border border-slate-100 relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                    <Icon name="x" className="w-5 h-5"/>
                </button>
                <h2 className="text-xl font-bold text-slate-900 mb-6 tracking-tight">{incomeToEdit ? 'Editar Ingreso' : 'Agregar Ingreso'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Descripción</label>
                        <input type="text" name="description" value={formData.description} onChange={handleChange} placeholder="Ej. Cuota administración Apto 101" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm" required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Monto ($)</label>
                        <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="0" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm" required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Categoría</label>
                        <select name="category" value={formData.category} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm">
                            {Object.values(IncomeCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Fecha</label>
                        <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm" required />
                    </div>
                    <div className="mt-8 pt-2 flex justify-end gap-3 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                        <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors">Guardar</button>
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
       <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg border border-slate-100 relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                    <Icon name="x" className="w-5 h-5"/>
                </button>
                <h2 className="text-xl font-bold text-slate-900 mb-6 tracking-tight">{expenseToEdit ? 'Editar Gasto' : 'Agregar Gasto'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Descripción</label>
                        <input type="text" name="description" value={formData.description} onChange={handleChange} placeholder="Ej. Pago servicios públicos" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm" required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Monto ($)</label>
                        <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="0" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm" required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Categoría</label>
                        <select name="category" value={formData.category} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm">
                            {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Fecha</label>
                        <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm" required />
                    </div>
                    <div className="mt-8 pt-2 flex justify-end gap-3 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                        <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors">Guardar</button>
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
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Icon name="arrow-up-right" className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ingresos Totales</h3>
                        <p className="text-2xl font-extrabold text-emerald-600 tracking-tight mt-0.5">{formatCurrency(totalIncomes)}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <Icon name="arrow-down-right" className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Egresos Totales</h3>
                        <p className="text-2xl font-extrabold text-rose-600 tracking-tight mt-0.5">{formatCurrency(totalExpenses)}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${balance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center shrink-0`}>
                        <Icon name="dollar-sign" className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Saldo Disponible</h3>
                        <p className={`text-2xl font-extrabold tracking-tight mt-0.5 ${balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                            {formatCurrency(balance)}
                        </p>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm h-88 flex flex-col">
                    <h3 className="text-base font-bold text-slate-800 tracking-tight mb-4 pb-2 border-b border-slate-100">Distribución de Egresos por Categoría</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={chartData.expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                                    {chartData.expenseByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend wrapperStyle={{fontSize: "12px"}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm h-88 flex flex-col">
                    <h3 className="text-base font-bold text-slate-800 tracking-tight mb-4 pb-2 border-b border-slate-100">Comparativa Ingresos vs. Gastos (6 Meses)</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.monthlyData.slice(-6)} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
                                <YAxis fontSize={12} stroke="#94a3b8" tickFormatter={(value) => new Intl.NumberFormat('es-CO', { notation: 'compact', compactDisplay: 'short' }).format(value as number)}/>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend wrapperStyle={{fontSize: "12px"}}/>
                                <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
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
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-100 bg-slate-50/50">
                     <div className="flex items-center gap-3">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept=".xlsx, .xls" />
                        <button onClick={handleDownloadTemplate} className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                            Plantilla Excel
                        </button>
                        <button onClick={handleUploadClick} disabled={isUploading} className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-50">
                            {isUploading ? 'Cargando...' : 'Cargar Archivo'}
                        </button>
                        {feedbackMessage && <p className={`text-xs font-medium ${feedbackMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{feedbackMessage.text}</p>}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Buscar registros..." />
                        <button onClick={handleRefresh} className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors" aria-label="Refrescar datos">
                            <Icon name="refresh-cw" className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={() => setConfirmAction(type === 'income' ? { title: 'Eliminar Todos los Ingresos', message: '¿ESTÁS SEGURO? Esta acción eliminará TODOS los registros de ingresos de forma permanente.', onConfirm: handleDeleteAllIncomes } : { title: 'Eliminar Todos los Gastos', message: '¿ESTÁS SEGURO? Esta acción eliminará TODOS los registros de gastos de forma permanente.', onConfirm: handleDeleteAllExpenses })} className="px-3 py-2 bg-rose-50 text-rose-700 rounded-xl font-semibold text-xs hover:bg-rose-100 transition-colors">
                            Vaciar
                        </button>
                        <button onClick={() => type === 'income' ? handleOpenIncomeModal(null) : handleOpenExpenseModal(null)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all">
                            <Icon name="plus" className="w-3.5 h-3.5" />
                            Agregar {type === 'income' ? 'Ingreso' : 'Egreso'}
                        </button>
                    </div>
                </div>
                 <div className="md:hidden space-y-3 p-4">
                    {data.map((item: any) => (
                      <div key={item.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="font-semibold text-slate-900 text-sm truncate flex-1">{item.description}</p>
                          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 flex-shrink-0">{item.category}</span>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">{item.date}</p>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                          <p className={`text-base font-extrabold tracking-tight ${type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(item.amount)}</p>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => type === 'income' ? handleOpenIncomeModal(item) : handleOpenExpenseModal(item)} className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl py-1.5 px-3 transition-colors">Editar</button>
                            <button onClick={() => setConfirmAction(type === 'income' ? { title: 'Eliminar Ingreso', message: '¿Seguro que quieres eliminar este ingreso?', onConfirm: () => handleDeleteIncome(item.id) } : { title: 'Eliminar Gasto', message: '¿Seguro que quieres eliminar este gasto?', onConfirm: () => handleDeleteExpense(item.id) })} className="text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl py-1.5 px-3 transition-colors">Eliminar</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {data.length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        <Icon name="dollarSign" className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm font-medium">No se encontraron {type === 'income' ? 'ingresos' : 'gastos'}</p>
                      </div>
                    )}
                 </div>
                 <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                            <tr>
                                {columns.map(col => <th key={col} scope="col" className="px-6 py-3.5 font-semibold">{col}</th>)}
                                <th scope="col" className="px-6 py-3.5 text-right font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.map((item: any) => (
                                <tr key={item.id} className="bg-white hover:bg-slate-50/70 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-800">{item.description}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{item.date}</td>
                                    <td className={`px-6 py-4 font-bold ${type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(item.amount)}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => type === 'income' ? handleOpenIncomeModal(item) : handleOpenExpenseModal(item)} className="font-semibold text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">Editar</button>
                                        <button onClick={() => setConfirmAction(type === 'income' ? { title: 'Eliminar Ingreso', message: '¿Seguro que quieres eliminar este ingreso?', onConfirm: () => handleDeleteIncome(item.id) } : { title: 'Eliminar Gasto', message: '¿Seguro que quieres eliminar este gasto?', onConfirm: () => handleDeleteExpense(item.id) })} className="font-semibold text-xs text-rose-600 hover:text-rose-800 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors">Eliminar</button>
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
            <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-2xl w-fit">
                {Object.values(FinanzasTab).map(tab => {
                    const isSelected = activeTab === tab;
                    const subtabId = 'subtab-finanzas-' + tab.toLowerCase().replace(/[áéíóú]/g, c => ({'á':'a','é':'e','í':'i','ó':'o','ú':'u'})[c] || c);
                    return (
                        <button
                          key={tab}
                          id={subtabId}
                          onClick={() => setActiveTab(tab)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            isSelected 
                              ? 'bg-white text-blue-600 shadow-xs' 
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                          }`}
                        >
                          {tab}
                        </button>
                    );
                })}
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
