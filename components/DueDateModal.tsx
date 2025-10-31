import React, { useState, useEffect } from 'react';
import { DueDate } from '../types';
import { Icon } from './ui/Icon';

interface DueDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dueDate: DueDate) => void;
  dueDateToEdit: DueDate | null;
}

const categories: DueDate['category'][] = ['Servicios', 'Mantenimiento', 'Seguros', 'Nómina', 'Otros'];

const DueDateModal: React.FC<DueDateModalProps> = ({ isOpen, onClose, onSave, dueDateToEdit }) => {
  const [formData, setFormData] = useState<Omit<DueDate, 'id'>>({
    item: '',
    category: 'Servicios',
    dueDate: '',
    status: 'Pendiente',
  });

  useEffect(() => {
    if (dueDateToEdit) {
      setFormData({
          item: dueDateToEdit.item,
          category: dueDateToEdit.category,
          dueDate: dueDateToEdit.dueDate,
          status: dueDateToEdit.status,
      });
    } else {
      // Reset for new entry
      setFormData({
        item: '',
        category: 'Servicios',
        dueDate: new Date().toISOString().split('T')[0], // Today's date
        status: 'Pendiente',
      });
    }
  }, [dueDateToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: DueDate = {
      ...formData,
      id: dueDateToEdit?.id || 0, // Id will be ignored for new items
    };
    onSave(payload);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl p-8 w-11/12 md:w-1/2 lg:w-1/3 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <Icon name="x" className="w-6 h-6"/>
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {dueDateToEdit ? 'Editar Vencimiento' : 'Agregar Nuevo Vencimiento'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="item" className="block text-sm font-medium text-gray-700">Ítem</label>
              <input
                type="text"
                id="item"
                name="item"
                value={formData.item}
                onChange={handleChange}
                className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                placeholder="Ej: Pago de Vigilancia"
                required
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white"
                required
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Fecha de Vencimiento</label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DueDateModal;
