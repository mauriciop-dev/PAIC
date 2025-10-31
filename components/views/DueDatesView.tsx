import React, { useState, useEffect } from 'react';
import { dataStore } from '../../data/dataStore';
import { DueDate } from '../../types';
import DueDateModal from '../DueDateModal';

type StatusFilter = 'Todos' | 'Pendiente' | 'Vencido' | 'Pagado';

const DueDatesView: React.FC = () => {
  const [dueDates, setDueDates] = useState<DueDate[]>(dataStore.getDueDates());
  const [filter, setFilter] = useState<StatusFilter>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDueDate, setEditingDueDate] = useState<DueDate | null>(null);

  useEffect(() => {
    const handleStoreChange = () => {
      setDueDates(dataStore.getDueDates());
    };
    const unsubscribe = dataStore.subscribe(handleStoreChange);
    return () => unsubscribe();
  }, []);
  
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
  
  const handleSaveDueDate = (dueDate: DueDate) => {
      if (editingDueDate) {
          dataStore.updateDueDate(dueDate);
      } else {
          // The store handles adding 'id' and 'status'
          const { id, status, ...newDueDateData } = dueDate;
          dataStore.addDueDate(newDueDateData);
      }
      handleCloseModal();
  };
  
  const handleDelete = (id: number) => {
      if (window.confirm('¿Estás seguro de que quieres eliminar este vencimiento? Esta acción no se puede deshacer.')) {
          dataStore.deleteDueDate(id);
      }
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
  
  const filteredDueDates = dueDates.filter(d => filter === 'Todos' || d.status === filter);

  return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Vencimientos de Pagos</h2>
                <p className="text-gray-600 mt-1">
                    Gestiona las obligaciones de pago de la administración.
                </p>
            </div>
            <button 
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
                Agregar Vencimiento
            </button>
        </div>

      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-700">Filtrar por:</span>
            {(['Todos', 'Pendiente', 'Vencido', 'Pagado'] as StatusFilter[]).map(status => (
                <button 
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                        filter === status ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    {status}
                </button>
            ))}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {filteredDueDates.length > 0 ? filteredDueDates.map(payment => (
            <li key={payment.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-gray-50">
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{payment.item}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryChipStyle(payment.category)}`}>{payment.category}</span>
                    <p className="text-sm text-gray-500">Vence: {payment.dueDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className={`px-3 py-1 text-sm font-medium rounded-full w-24 text-center ${getStatusChipStyle(payment.status)}`}>
                  {payment.status}
                </span>
                <button onClick={() => handleOpenEditModal(payment)} className="font-medium text-blue-600 hover:underline text-sm p-1">Editar</button>
                <button onClick={() => handleDelete(payment.id)} className="font-medium text-red-600 hover:underline text-sm p-1">Eliminar</button>
              </div>
            </li>
          )) : (
              <li className="p-6 text-center text-gray-500">
                  No hay vencimientos que coincidan con el filtro seleccionado.
              </li>
          )}
        </ul>
      </div>
      {isModalOpen && (
        <DueDateModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleSaveDueDate}
            dueDateToEdit={editingDueDate}
        />
      )}
    </div>
  );
};

export default DueDatesView;