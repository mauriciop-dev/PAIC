import React, { useState, useEffect } from 'react';
import { AccessPoint } from '../types';
import { apiService } from '../services/apiService';
import { Icon } from './ui/Icon';

interface AccessPointSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AccessPointSelectionModal: React.FC<AccessPointSelectionModalProps> = ({ isOpen, onClose }) => {
    const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([]);
    const [selectedPoint, setSelectedPoint] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await apiService.fetchAccessPoints();
                setAccessPoints(data);
                if (data.length > 0) {
                    setSelectedPoint(String(data[0].id));
                }
            } catch (error) {
                console.error("Failed to fetch access points", error);
            } finally {
                setIsLoading(false);
            }
        };
        if(isOpen) {
            fetchData();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!selectedPoint) {
            alert('Por favor, selecciona un punto de acceso para continuar.');
            return;
        }
        // In a real app, you might save this selection to a session or global state.
        console.log(`User selected access point ID: ${selectedPoint}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center">
            <div
                className="bg-white rounded-lg shadow-2xl p-8 w-11/12 md:w-1/2 lg:w-1/3"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center">
                    <Icon name="map-pin" className="w-12 h-12 text-blue-600 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Selecciona tu Puesto</h2>
                    <p className="text-gray-600 mb-6">Por favor, indica en qué punto de acceso estás iniciando tu turno.</p>
                </div>
                
                <form onSubmit={handleSubmit}>
                    {isLoading ? (
                        <div className="text-center text-gray-500">Cargando puntos de acceso...</div>
                    ) : accessPoints.length > 0 ? (
                        <div className="space-y-4">
                             <select 
                                value={selectedPoint}
                                onChange={(e) => setSelectedPoint(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                             >
                                {accessPoints.map(point => (
                                    <option key={point.id} value={point.id}>{point.name}</option>
                                ))}
                            </select>
                            <button
                                type="submit"
                                className="w-full px-4 py-3 text-white bg-blue-600 rounded-lg font-bold hover:bg-blue-700"
                            >
                                Comenzar Turno
                            </button>
                        </div>
                    ) : (
                        <p className="text-center text-red-500 bg-red-50 p-3 rounded-md">
                            No hay puntos de acceso configurados. Por favor, contacta al administrador.
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
};

export default AccessPointSelectionModal;
