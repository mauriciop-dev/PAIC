import React, { useState, useEffect } from 'react';
import { dataStore } from '../../data/dataStore';
import { DueDate } from '../../types';

type StatusFilter = 'Todos' | 'Pendiente' | 'Vencido' | 'Pagado';

const DueDatesView: React.FC = () => {
  const [dueDates, setDueDates] = useState<DueDate[]>(dataStore.getDueDates());
  const [filter, setFilter] = useState<StatusFilter>('Todos');

  useEffect(() => {
    const handleStoreChange = () => {
      setDueDates(dataStore.getDueDates());
    };
    const unsubscribe = dataStore.subscribe(handleStoreChange);
    return () => unsubscribe();
  }, []);
  
  const handleMarkAsPaid = (id: number) => {
      dataStore.updateDueDateStatus(id, 'Pagado');
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
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Vencimientos de Pagos</h2>
      <p className="text-gray-600 mb-6">
        Aquí puedes ver los vencimientos de pagos pendientes de la administración. El asistente te alertará sobre los próximos vencimientos.
      </p>

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
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <span className={`px-3 py-1 text-sm font-medium rounded-full w-24 text-center ${getStatusChipStyle(payment.status)}`}>
                  {payment.status}
                </span>
                {(payment.status === 'Pendiente' || payment.status === 'Vencido') && (
                     <button 
                        onClick={() => handleMarkAsPaid(payment.id)}
                        className="px-3 py-1 bg-green-500 text-white rounded-md text-sm font-semibold hover:bg-green-600 transition-colors"
                     >
                        Marcar como Pagado
                     </button>
                )}
              </div>
            </li>
          )) : (
              <li className="p-6 text-center text-gray-500">
                  No hay vencimientos que coincidan con el filtro seleccionado.
              </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default DueDatesView;