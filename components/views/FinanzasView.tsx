import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Income, Expense, Provider, IncomeCategory, ExpenseCategory } from '../../types';
import { apiService } from '../../services/apiService';
import { Icon } from '../ui/Icon';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

interface FinanzasViewProps {
    userProfile: UserProfile;
}

type FinanzasTab = 'Resumen' | 'Ingresos' | 'Egresos';
type ModalState = {
    isOpen: boolean;
    type: 'income' | 'expense';
    data: Income | Expense | null;
};

const FinanzasView: React.FC<FinanzasViewProps> = ({ userProfile }) => {
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<FinanzasTab>('Resumen');
    const [modal, setModal] = useState<ModalState>({ isOpen: false, type: 'income', data: null });

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

    const formatCurrency = (value: number) => `$${value.toLocaleString('es-CO')}`;

    const financialSummary = useMemo(() => {
        const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
        const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
        const balance = totalIncome - totalExpense;
        return { totalIncome, totalExpense, balance };
    }, [incomes, expenses]);

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
        </div>
    );
    
    const renderTable = (type: 'income' | 'expense') => {
        const data = type === 'income' ? incomes : expenses;
        const columns = type === 'income' 
            ? ['Descripción', 'Categoría', 'Fecha', 'Monto']
            : ['Descripción', 'Categoría', 'Fecha', 'Monto'];

        return (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 flex justify-between items-center border-b">
                     <h3 className="text-lg font-semibold text-gray-700">{type === 'income' ? 'Registro de Ingresos' : 'Registro de Egresos'}</h3>
                     <button onClick={() => setModal({ isOpen: true, type, data: null})} className="px-3 py-1.5 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 text-xs flex items-center gap-1">
                        <Icon name="user-plus" className="w-4 h-4" />
                        Agregar {type === 'income' ? 'Ingreso' : 'Egreso'}
                    </button>
                </div>
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

            {isLoading ? <div className="text-center p-10">Cargando datos financieros...</div> : (
                <>
                    {activeTab === 'Resumen' && renderSummary()}
                    {activeTab === 'Ingresos' && renderTable('income')}
                    {activeTab === 'Egresos' && renderTable('expense')}
                </>
            )}

            {/* A simple inline modal for adding/editing */}
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
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
                     <input name="amount" type="number" value={formData.amount} onChange={handleChange} placeholder="Monto" className="w-full p-2 border border-gray-300 rounded-md" required />
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
