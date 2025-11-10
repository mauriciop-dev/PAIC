import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserProfile, Income, Expense, Provider, IncomeCategory, ExpenseCategory } from '../../types';
import { apiService } from '../../services/apiService';
import { Icon } from '../ui/Icon';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

declare var XLSX: any;

interface FinanzasViewProps {
    userProfile: UserProfile;
}

type FinanzasTab = 'Resumen' | 'Ingresos' | 'Egresos';
type ModalState = {
    isOpen: boolean;
    type: 'income' | 'expense';
    data: Income | Expense | null;
};

// This function safely formats a Date object from Excel into 'YYYY-MM-DD' format, avoiding timezone issues.
const formatDate = (date: Date): string => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return ''; // Return empty string for invalid dates
    }
    // Use UTC methods to prevent the date from shifting due to local timezone offsets.
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // months are 0-indexed
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const FinanzasView: React.FC<FinanzasViewProps> = ({ userProfile }) => {
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<FinanzasTab>('Resumen');
    const [modal, setModal] = useState<ModalState>({ isOpen: false, type: 'income', data: null });
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    const fetchData = async () => {
        if (!userProfile.conjuntoId) return;
        setIsLoading(true);
        try {
            const [incomeData, expenseData] = await Promise.all([
                apiService.fetchIncomes(userProfile.conjuntoId),
                apiService.fetchExpenses(userProfile.conjuntoId),
            ]);
            setIncomes(incomeData);
            setExpenses(expenseData);
        } catch (error) {
            console.error("Failed to fetch financial data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userProfile.conjuntoId]);
    
    const handleSave = async (data: Income | Expense) => {
        if (!userProfile.conjuntoId) return;
        if (modal.type === 'income') {
            modal.data?.id
                ? await apiService.updateIncome(userProfile.conjuntoId, data as Income)
                : await apiService.addIncome(userProfile.conjuntoId, data as Omit<Income, 'id'>);
        } else {
            modal.data?.id
                ? await apiService.updateExpense(userProfile.conjuntoId, data as Expense)
                : await apiService.addExpense(userProfile.conjuntoId, data as Omit<Expense, 'id'>);
        }
        setModal({ isOpen: false, type: 'income', data: null });
        fetchData();
    };

    const handleDelete = async (id: number, type: 'income' | 'expense') => {
        if (!userProfile.conjuntoId || !window.confirm('¿Estás seguro de que quieres eliminar este registro?')) return;
        if (type === 'income') {
            await apiService.deleteIncome(userProfile.conjuntoId, id);
        } else {
            await apiService.deleteExpense(userProfile.conjuntoId, id);
        }
        fetchData();
    };
    
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleDownloadTemplate = () => {
        const templates = {
            Ingresos: { headers: ['description', 'category', 'date', 'amount'], filename: 'plantilla_ingresos.xlsx' },
            Egresos: { headers: ['description', 'category', 'date', 'amount'], filename: 'plantilla_egresos.xlsx' }
        };
        const config = templates[activeTab as keyof typeof templates];
        if (!config) return;
        const ws = XLSX.utils.aoa_to_sheet([config.headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab);
        XLSX.writeFile(wb, config.filename);
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
              const json = XLSX.utils.sheet_to_json(worksheet, { cellDates: true, raw: false });

              if (json.length === 0) throw new Error("El archivo está vacío o tiene un formato incorrecto.");
              if (!userProfile.conjuntoId) throw new Error("ID de conjunto no encontrado.");
              
              const keyMap = {
                  'descripción': 'description', 'descripcion': 'description',
                  'categoría': 'category', 'categoria': 'category',
                  'fecha': 'date',
                  'monto': 'amount', 'valor': 'amount',
              };

              const normalizedData = json.map(row => {
                  const normalizedRow: { [key: string]: any } = {};
                  for (const key in row) {
                      const lowerKey = key.toLowerCase().trim();
                      const mappedKey = keyMap[lowerKey as keyof typeof keyMap] || key;
                      normalizedRow[mappedKey] = row[key];
                  }
                  if (normalizedRow.date && normalizedRow.date instanceof Date) {
                      normalizedRow.date = formatDate(normalizedRow.date);
                  }
                  return normalizedRow;
              });

              if (activeTab === 'Ingresos') {
                  await apiService.bulkInsertIncomes(userProfile.conjuntoId, normalizedData as Omit<Income, 'id'>[]);
              } else if (activeTab === 'Egresos') {
                  await apiService.bulkInsertExpenses(userProfile.conjuntoId, normalizedData as Omit<Expense, 'id'>[]);
              }
              
              await fetchData();
              setFeedbackMessage({type: 'success', text: `¡${json.length} registros cargados exitosamente!`});

          } catch (error: any) {
              setFeedbackMessage({type: 'error', text: `Error al cargar: ${error.message}`});
          } finally {
              setIsUploading(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
              setTimeout(() => setFeedbackMessage(null), 7000);
          }
      };
      reader.readAsArrayBuffer(file);
    };

    const handleDeleteAll = async (type: 'income' | 'expense') => {
        if (!userProfile.conjuntoId) return;
        const typeSpanish = type === 'income' ? 'ingresos' : 'egresos';
        if (window.confirm(`¿Estás SEGURO de que quieres eliminar TODOS los ${typeSpanish}? Esta acción es irreversible.`)) {
            if (type === 'income') {
                await apiService.deleteAllIncomes(userProfile.conjuntoId);
            } else {
                await apiService.deleteAllExpenses(userProfile.conjuntoId);
            }
            fetchData();
        }
    };


    const formatCurrency = (value: number) => `$${value.toLocaleString('es-CO')}`;

    const financialSummary = useMemo(() => {
        const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
        const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
        const balance = totalIncome - totalExpense;
        return { totalIncome, totalExpense, balance };
    }, [incomes, expenses]);
    
    const chartData = useMemo(() => {
        if (isLoading) return null;
        const monthlyData: { [key: string]: { name: string, ingresos: number, egresos: number } } = {};
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        
        [...incomes, ...expenses].forEach(item => {
            const date = new Date(item.date);
            const monthName = months[date.getUTCMonth()]; // Use UTC month to match formatDate
            const year = date.getUTCFullYear();
            const key = `${year}-${date.getUTCMonth()}`;
            if (!monthlyData[key]) {
                monthlyData[key] = { name: `${monthName} ${String(year).slice(-2)}`, ingresos: 0, egresos: 0 };
            }
            if ('category' in item && Object.values(IncomeCategory).includes(item.category as any)) {
                 monthlyData[key].ingresos += item.amount;
            } else {
                 monthlyData[key].egresos += item.amount;
            }
        });

        const monthlyIncomeVsExpense = Object.values(monthlyData).sort((a, b) => a.name.localeCompare(b.name));

        const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];
        const groupByCategory = (items: (Income | Expense)[]) => Object.entries(items.reduce((acc, item) => {
                acc[item.category] = (acc[item.category] || 0) + item.amount;
                return acc;
            }, {} as Record<string, number>))
            .map(([name, value], index) => ({ name, value, fill: PIE_COLORS[index % PIE_COLORS.length] }));

        return {
            monthlyIncomeVsExpense,
            expensesByCategory: groupByCategory(expenses),
            incomesByCategory: groupByCategory(incomes),
        };
    }, [incomes, expenses, isLoading]);


    const renderSummary = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <p className="text-sm font-semibold text-green-700">Ingresos Totales</p>
                    <p className="text-3xl font-bold text-green-800">{formatCurrency(financialSummary.totalIncome)}</p>
                </div>
                 <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                    <p className="text-sm font-semibold text-red-700">Egresos Totales</p>
                    <p className="text-3xl font-bold text-red-800">{formatCurrency(financialSummary.totalExpense)}</p>
                </div>
                 <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-700">Saldo Actual</p>
                    <p className="text-3xl font-bold text-blue-800">{formatCurrency(financialSummary.balance)}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-md h-80 flex flex-col">
                    <h3 className="text-md font-semibold text-gray-700 mb-4">Ingresos vs Egresos (Últimos 12 meses)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={chartData?.monthlyIncomeVsExpense.slice(-12)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis fontSize={12} tickFormatter={(value) => new Intl.NumberFormat('es-CO', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                            <Legend wrapperStyle={{fontSize: "12px"}}/>
                            <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" />
                            <Bar dataKey="egresos" name="Egresos" fill="#ef4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md h-80 flex flex-col">
                    <h3 className="text-md font-semibold text-gray-700 mb-4">Distribución de Egresos</h3>
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData?.expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                {chartData?.expensesByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                            <Legend wrapperStyle={{fontSize: "12px"}}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
    
    const renderTable = (type: 'income' | 'expense') => {
        const data = type === 'income' ? incomes : expenses;
        const columns = ['Descripción', 'Categoría', 'Fecha', 'Monto'];

        return (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b">
                     <div className="flex items-center gap-2 flex-wrap">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" />
                        <button onClick={handleDownloadTemplate} className="text-sm font-medium text-blue-600 hover:underline">Descargar Plantilla</button>
                        <button onClick={handleUploadClick} disabled={isUploading} className="text-sm font-medium text-blue-600 hover:underline disabled:text-gray-400">
                            {isUploading ? 'Cargando...' : 'Cargar Archivo'}
                        </button>
                        <button onClick={() => handleDeleteAll(type)} className="text-sm font-medium text-red-600 hover:underline">
                            Eliminar Todos
                        </button>
                     </div>
                     <button onClick={() => setModal({ isOpen: true, type, data: null})} className="px-3 py-1.5 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 text-xs flex items-center gap-1">
                        <Icon name="user-plus" className="w-4 h-4" />
                        Agregar {type === 'income' ? 'Ingreso' : 'Egreso'}
                    </button>
                </div>
                 {feedbackMessage && (
                    <div className={`p-3 text-sm text-center ${feedbackMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {feedbackMessage.text}
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>{columns.map(col => <th key={col} scope="col" className="px-6 py-3">{col}</th>)}<th scope="col" className="px-6 py-3 text-right">Acciones</th></tr>
                        </thead>
                        <tbody>
                            {data.map(item => (
                                <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{item.description}</td>
                                    <td className="px-6 py-4">{item.category}</td>
                                    <td className="px-6 py-4">{item.date}</td>
                                    <td className="px-6 py-4 font-semibold">{formatCurrency(item.amount)}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => setModal({ isOpen: true, type, data: item })} className="font-medium text-blue-600 hover:underline">Editar</button>
                                        <button onClick={() => handleDelete(item.id, type)} className="font-medium text-red-600 hover:underline">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    };
    
    return (
        <div className="space-y-6">
            <div className="mb-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {(['Resumen', 'Ingresos', 'Egresos'] as FinanzasTab[]).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {isLoading ? <div className="text-center p-10 text-gray-500">Cargando datos financieros...</div> : (
                <>
                    {activeTab === 'Resumen' && renderSummary()}
                    {activeTab === 'Ingresos' && renderTable('income')}
                    {activeTab === 'Egresos' && renderTable('expense')}
                </>
            )}

            {modal.isOpen && <FinancialModal modalState={modal} onClose={() => setModal({isOpen: false, type: 'income', data: null})} onSave={handleSave} />}
        </div>
    );
};

const FinancialModal: React.FC<{modalState: ModalState, onClose: () => void, onSave: (data: any) => void}> = ({ modalState, onClose, onSave }) => {
    const { type, data } = modalState;
    const [formData, setFormData] = useState<any>(data || { description: '', amount: 0, category: '', date: new Date().toISOString().split('T')[0] });
    
    const isNew = !data?.id;
    const title = `${isNew ? 'Agregar' : 'Editar'} ${type === 'income' ? 'Ingreso' : 'Egreso'}`;
    const categories = type === 'income' ? Object.values(IncomeCategory) : Object.values(ExpenseCategory);

    useEffect(() => {
        if (data) {
            setFormData(data);
        } else {
            setFormData({
                description: '',
                amount: 0,
                category: categories[0],
                date: new Date().toISOString().split('T')[0]
            });
        }
    }, [data, type]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type: inputType } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: inputType === 'number' ? parseFloat(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl p-8 w-11/12 md:w-1/2 lg:w-1/3 relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"><Icon name="x" className="w-6 h-6"/></button>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <input name="description" value={formData.description} onChange={handleChange} placeholder="Descripción" className="w-full p-2 border border-gray-300 rounded-md" required />
                     <input name="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} placeholder="Monto" className="w-full p-2 border border-gray-300 rounded-md" required />
                     <select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md bg-white" required>
                        <option value="">Selecciona una categoría</option>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                     <input name="date" type="date" value={formData.date} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md" required />
                    <div className="mt-8 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FinanzasView;