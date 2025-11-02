import React, { useState, useEffect } from 'react';
import { Provider } from '../types';
import { Icon } from './ui/Icon';

interface ProviderModalProps {
  isOpen: boolean;
  providerToEdit: Provider | null;
  onClose: () => void;
  onSave: (provider: Provider) => void;
}

const ProviderModal: React.FC<ProviderModalProps> = ({ isOpen, providerToEdit, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Provider>>({});
  const isNew = !providerToEdit;

  useEffect(() => {
    if (providerToEdit) {
      setFormData(providerToEdit);
    } else {
      setFormData({
        company: '',
        specialty: '',
        email: '',
        phone: '',
      });
    }
  }, [providerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...providerToEdit, ...formData } as Provider);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl p-8 w-11/12 md:w-1/2 lg:w-1/3 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <Icon name="x" className="w-6 h-6"/>
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{isNew ? 'Agregar Proveedor' : 'Editar Proveedor'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700">Empresa</label>
            <input type="text" id="company" name="company" value={formData.company || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
          </div>
           <div>
            <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">Especialidad</label>
            <input type="text" id="specialty" name="specialty" value={formData.specialty || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
            <input type="email" id="email" name="email" value={formData.email || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Teléfono</label>
            <input type="tel" id="phone" name="phone" value={formData.phone || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
          </div>
          <div className="mt-8 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProviderModal;