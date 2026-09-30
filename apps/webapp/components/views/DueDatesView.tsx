import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { DueDate, UserProfile } from '../../types';
import DueDateModal from '../DueDateModal';
import ConfirmModal from '../ConfirmModal';
import SearchBar from '../SearchBar';
import { Icon } from '@paic/ui';

type StatusFilter = 'Todos' | 'Pendiente' | 'Vencido' | 'Pagado';

interface DueDatesViewProps {
    userProfile: UserProfile;
}

const DueDatesView: React.FC<DueDatesViewProps> = ({ userProfile }) => {
  const [allDueDates, setAllDueDates] = useState<DueDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDueDate, setEditingDueDate] = useState<DueDate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    if (!userProfile.conjuntoId) return;
    setIsLoading(true);
    try {
        // FIX: Pass conjuntoId to fetchDueDates.
        const data = await apiService.fetchDueDates(userProfile.conjuntoId);
        setAllDueDates(data);
    } catch(error) {
        console.error("Failed to fetch due dates:", error);
    } finally {
        setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [userProfile.conjuntoId]);
  
  const handleRefresh = async () => {
      setIsRefreshing(true);
      await fetchData();
      setIsRefreshing(false);
  };
  
  const handleOpenAddModal = () => {
      setEditingDueDate(null);
      setIsModalOpen(true);
  };
  
  const handleOpenEditModal = (dueDate: DueDate) => {
      setEditingDueDate(dueDate);
      setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
      setIsModalOpen(false);
      setEditingDueDate(null);
  };
  
  const handleSaveDueDate = async (dueDate: DueDate) => {
      if (!userProfile.conjuntoId) return;
      if (editingDueDate) {
          // FIX: Pass conjuntoId to updateDueDate.
          await apiService.updateDueDate(userProfile.conjuntoId, dueDate);
      } else {
          const { id, ...newDueDateData } = dueDate;
          // FIX: Pass conjuntoId to addDueDate.
          await apiService.addDueDate(userProfile.conjuntoId, newDueDateData);
      }
      fetchData(); // Refresh data
      handleCloseModal();
  };
  
  const handleDelete = async (id: number) => {
      if (!userProfile.conjuntoId) return;
      await apiService.deleteDueDate(userProfile.conjuntoId, id);
      fetchData();
      setDeleteTarget(null);
  };

  const getStatusChipStyle = (status: DueDate['status']) => {
    switch (status) {
      case 'Pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'Vencido': return 'bg-red-100 text-red-800';
      case 'Pagado': return 'bg-green-100 text-green-800';
    }
  };
  
  const getCategoryChipStyle = (category: DueDate['category']) => {
    switch(category) {
        case 'Servicios': return 'bg-blue-100 text-blue-800';
        case 'Mantenimiento': return 'bg-indigo-100 text-indigo-800';
        case 'Seguros': return 'bg-purple-100 text-purple-800';
        case 'Nómina': return 'bg-pink-100 text-pink-800';
        default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const filteredDueDates = allDueDates.filter(d =>
    (filter === 'Todos' || d.status === filter) &&
    (!searchQuery || `${d.item} ${d.category} ${d.dueDate} ${d.status}`.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
            <p className="text-sm font-medium text-slate-500">
                Gestiona las obligaciones y fechas límite de pago de la administración.
            </p>
            <div className="flex items-center gap-2">
                <button onClick={handleRefresh} className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors" aria-label="Refrescar datos">
                    <Icon name="refresh-cw" className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button 
                    onClick={handleOpenAddModal}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs hover:shadow-sm transition-all text-xs flex items-center gap-1.5"
                >
                    <Icon name="plus" className="w-3.5 h-3.5" />
                    Agregar Vencimiento
                </button>
            </div>
        </div>

      <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-1 w-full min-w-0">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Buscar por concepto, categoría o fecha..." />
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto p-1 bg-slate-100/80 rounded-xl">
            {(['Todos', 'Pendiente', 'Vencido', 'Pagado'] as StatusFilter[]).map(status => {
                const isSelected = filter === status;
                return (
                    <button 
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            isSelected ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        {status}
                    </button>
                );
            })}
        </div>
      </div>
      
      <div id="panel-vencimientos" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
            <div className="p-8 text-center text-slate-400">Cargando vencimientos...</div>
        ) : (
            <ul className="divide-y divide-slate-100">
              {filteredDueDates.length > 0 ? filteredDueDates.map(payment => (
                <li key={payment.id} className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{payment.item}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getCategoryChipStyle(payment.category)}`}>{payment.category}</span>
                        <p className="text-xs text-slate-400">Vence: {payment.dueDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full w-24 text-center ${getStatusChipStyle(payment.status)}`}>
                      {payment.status}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => handleOpenEditModal(payment)} className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">Editar</button>
                        <button onClick={() => setDeleteTarget(payment.id)} className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">Eliminar</button>
                    </div>
                  </div>
                </li>
              )) : (
                  <li className="p-8 text-center text-slate-400">
                      No hay vencimientos que coincidan con el filtro seleccionado.
                  </li>
              )}
            </ul>
        )}
      </div>
      {isModalOpen && (
        <DueDateModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleSaveDueDate}
            dueDateToEdit={editingDueDate}
        />
      )}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Eliminar Vencimiento"
        message="¿Estás seguro de que quieres eliminar este vencimiento? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteTarget !== null && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default DueDatesView;
