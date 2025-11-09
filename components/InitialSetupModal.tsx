
import React, { useState, useEffect } from 'react';
import { Icon } from './ui/Icon';
import { ConjuntoInfo, UserProfile } from '../types';

interface InitialSetupModalProps {
  onClose: () => void;
  onSaveSetup: (info: ConjuntoInfo) => Promise<void>;
  userProfile: UserProfile;
}

const InitialSetupModal: React.FC<InitialSetupModalProps> = ({ onClose, onSaveSetup, userProfile }) => {
  const [formData, setFormData] = useState<Omit<ConjuntoInfo, 'id' | 'subscriptionPlan'>>({
    name: '',
    nit: '',
    address: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
        setFormData(prev => ({
            ...prev,
            adminName: userProfile.fullName,
            adminEmail: userProfile.email,
        }));
    }
  }, [userProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
        const newConjuntoId = `conj-${Date.now()}`;
        const completeInfo: ConjuntoInfo = {
            ...formData,
            id: userProfile.conjuntoId || newConjuntoId,
            subscriptionPlan: 'Free', // Default plan
        };
        await onSaveSetup(completeInfo);
        // The parent component handles closing the modal on success.
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
        console.error("Failed to save initial setup:", err);
        setError(`Error al guardar: ${errorMessage}. Revisa que todos los datos sean correctos. Si el problema persiste, puede ser un problema de base de datos y deberías contactar a soporte.`);
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center">
      <div 
        className="bg-white rounded-lg shadow-2xl p-8 w-11/12 md:w-1/2 lg:w-1/3 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Bienvenido a PAIC!</h2>
        <p className="text-gray-600 mb-6">Comencemos registrando la información básica de tu conjunto residencial.</p>
        
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nombre del conjunto" className="w-full p-2 border border-gray-300 rounded-md" required />
                <input type="text" name="nit" value={formData.nit} onChange={handleChange} placeholder="NIT" className="w-full p-2 border border-gray-300 rounded-md" required />
                <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Dirección del conjunto" className="w-full p-2 border border-gray-300 rounded-md" required />
                <input type="text" name="adminName" value={formData.adminName} onChange={handleChange} placeholder="Nombre del administrador" className="w-full p-2 border border-gray-300 rounded-md" required />
                <input type="email" name="adminEmail" value={formData.adminEmail} onChange={handleChange} placeholder="Correo del administrador" className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100" required disabled />
                <input type="tel" name="adminPhone" value={formData.adminPhone} onChange={handleChange} placeholder="Teléfono del administrador" className="w-full p-2 border border-gray-300 rounded-md" required />
            </div>
            
            {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
                    {error}
                </div>
            )}

            <div className="mt-8 flex justify-end gap-4">
                <button 
                    type="submit" 
                    disabled={isLoading} 
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-wait transition-colors"
                >
                    {isLoading ? 'Guardando...' : 'Guardar y Continuar'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default InitialSetupModal;
