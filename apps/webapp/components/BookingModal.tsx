import React, { useState, useEffect } from 'react';
import { Reservation, CommonArea, UserProfile } from '../types';
import { apiService } from '../services/apiService';
import { Icon } from './ui/Icon';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reservation: Omit<Reservation, 'id'>) => Promise<void>;
  userProfile: UserProfile;
  commonAreas: CommonArea[];
}

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, onSave, userProfile, commonAreas }) => {
  const [formData, setFormData] = useState<Omit<Reservation, 'id'>>({
    apartment: '',
    residentName: '',
    commonAreaId: commonAreas.length > 0 ? commonAreas[0].id : '',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '10:00',
    email: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Debounced autofill effect
    const handler = setTimeout(async () => {
      if (formData.apartment.trim() && userProfile.conjuntoId) {
        const resident = await apiService.fetchResidentByApartment(userProfile.conjuntoId, formData.apartment.trim());
        if (resident) {
          setFormData(prev => ({
            ...prev,
            residentName: resident.name,
            email: resident.email,
            phone: resident.phone,
          }));
        }
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(handler);
  }, [formData.apartment, userProfile.conjuntoId]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error al guardar.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl p-8 w-11/12 md:w-1/2 lg:w-[32rem] relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <Icon name="x" className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Agregar Nueva Reserva</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="apartment" className="block text-sm font-medium text-gray-700">Apartamento</label>
              <input type="text" id="apartment" name="apartment" value={formData.apartment} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
              <label htmlFor="residentName" className="block text-sm font-medium text-gray-700">Nombre del Residente</label>
              <input type="text" id="residentName" name="residentName" value={formData.residentName} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
            </div>
          </div>
          <div>
            <label htmlFor="commonAreaId" className="block text-sm font-medium text-gray-700">Área a Reservar</label>
            <select id="commonAreaId" name="commonAreaId" value={formData.commonAreaId} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white" required>
              {commonAreas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">Fecha</label>
              <input type="date" id="date" name="date" value={formData.date} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Hora Inicio</label>
              <input type="time" id="startTime" name="startTime" value={formData.startTime} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">Hora Fin</label>
              <input type="time" id="endTime" name="endTime" value={formData.endTime} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Teléfono</label>
              <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</p>}
          <div className="mt-8 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
              {isLoading ? 'Guardando...' : 'Confirmar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;