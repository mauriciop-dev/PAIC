import React, { useState } from 'react';
import { CommonArea } from '../types';
import { Icon } from './ui/Icon';

interface ManageAreasModalProps {
  isOpen: boolean;
  onClose: () => void;
  areas: CommonArea[];
  onAddArea: (name: string) => Promise<void>;
  onRemoveArea: (id: string) => Promise<void>;
}

const ManageAreasModal: React.FC<ManageAreasModalProps> = ({ isOpen, onClose, areas, onAddArea, onRemoveArea }) => {
  const [newAreaName, setNewAreaName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddArea = async () => {
    if (!newAreaName.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddArea(newAreaName.trim());
      setNewAreaName('');
    } catch (error) {
      console.error("Failed to add area:", error);
      // Optionally show an error message to the user in the modal
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveArea = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta área?')) {
      try {
        await onRemoveArea(id);
      } catch (error) {
        console.error("Failed to remove area:", error);
        // Optionally show an error message in the modal
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl p-6 w-11/12 md:w-1/2 lg:w-1/3 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <Icon name="x" className="w-6 h-6"/>
        </button>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Gestionar Áreas Comunes</h2>
        
        <div className="space-y-4 mb-6">
            <h3 className="text-md font-semibold text-gray-700">Agregar Nueva Área</h3>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    placeholder="Nombre del área (ej. Parque Infantil)"
                    className="flex-1 p-2 border border-gray-300 rounded-md"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddArea()}
                    disabled={isSubmitting}
                />
                <button
                    onClick={handleAddArea}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300"
                    disabled={isSubmitting || !newAreaName.trim()}
                >
                    {isSubmitting ? 'Agregando...' : 'Agregar'}
                </button>
            </div>
        </div>

        <div>
            <h3 className="text-md font-semibold text-gray-700 mb-2">Áreas Existentes</h3>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {areas.length > 0 ? (
                    areas.map(area => (
                        <div key={area.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                            <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full ${area.color.bg} border ${area.color.border}`}></div>
                                <span className="text-gray-800">{area.name}</span>
                            </div>
                            <button
                                onClick={() => handleRemoveArea(area.id)}
                                className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                                Eliminar
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-sm">No hay áreas comunes definidas.</p>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default ManageAreasModal;
