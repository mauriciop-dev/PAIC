import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { CommonArea } from '../types';
import { Icon } from './ui/Icon';

interface ManageAreasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAreaUpdate: () => void; // Callback to refresh parent component
}

const ManageAreasModal: React.FC<ManageAreasModalProps> = ({ isOpen, onClose, onAreaUpdate }) => {
  const [areas, setAreas] = useState<CommonArea[]>([]);
  const [newAreaName, setNewAreaName] = useState('');

  const fetchAreas = async () => {
    const fetchedAreas = await apiService.fetchCommonAreas();
    setAreas(fetchedAreas);
  };

  useEffect(() => {
    if (isOpen) {
      fetchAreas();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddArea = async () => {
    if (newAreaName.trim()) {
      await apiService.addCommonArea(newAreaName.trim());
      setNewAreaName('');
      fetchAreas(); // Refresh list
      onAreaUpdate(); // Notify parent
    }
  };

  const handleRemoveArea = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta área?')) {
      await apiService.removeCommonArea(id);
      fetchAreas(); // Refresh list
      onAreaUpdate(); // Notify parent
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
                />
                <button
                    onClick={handleAddArea}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                    Agregar
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