import React, { useState } from 'react';
import { UserProfile, ConjuntoInfo } from '../types';
import { Icon } from './ui/Icon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProfile: UserProfile, updatedConjunto: ConjuntoInfo) => void;
  userProfile: UserProfile;
  conjuntoInfo: ConjuntoInfo;
}

type SettingsTab = 'Perfil' | 'Conjunto';

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  userProfile,
  conjuntoInfo,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('Perfil');
  const [profileData, setProfileData] = useState<UserProfile>(userProfile);
  const [conjuntoData, setConjuntoData] = useState<ConjuntoInfo>(conjuntoInfo);
  const [hasChanges, setHasChanges] = useState(false);

  if (!isOpen) return null;

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };

  const handleConjuntoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConjuntoData(prev => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(profileData, conjuntoData);
    setHasChanges(false);
  };
  
  const renderProfileTab = () => (
    <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <img src={profileData.picture} alt="Avatar" className="w-16 h-16 rounded-full" />
            <div>
                <p className="font-bold text-lg text-gray-800">{profileData.name}</p>
                <p className="text-sm text-gray-600">{profileData.email}</p>
            </div>
        </div>
        <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Teléfono de Contacto</label>
            <input
                type="tel"
                id="phone"
                name="phone"
                value={profileData.phone || ''}
                onChange={handleProfileChange}
                placeholder="Agrega tu número de teléfono"
                className="mt-1 w-full p-2 border border-gray-300 rounded-md"
            />
        </div>
        <p className="text-xs text-gray-500">Tu nombre, correo y foto son gestionados por tu cuenta de Google.</p>
    </div>
  );

  const renderConjuntoTab = () => (
      <div className="space-y-4">
        <input type="text" name="name" value={conjuntoData.name} onChange={handleConjuntoChange} placeholder="Nombre del conjunto" className="w-full p-2 border border-gray-300 rounded-md" required />
        <input type="text" name="nit" value={conjuntoData.nit} onChange={handleConjuntoChange} placeholder="NIT" className="w-full p-2 border border-gray-300 rounded-md" required />
        <input type="text" name="address" value={conjuntoData.address} onChange={handleConjuntoChange} placeholder="Dirección del conjunto" className="w-full p-2 border border-gray-300 rounded-md" required />
        <input type="text" name="adminName" value={conjuntoData.adminName} onChange={handleConjuntoChange} placeholder="Nombre del administrador" className="w-full p-2 border border-gray-300 rounded-md" required />
        <input type="email" name="adminEmail" value={conjuntoData.adminEmail} onChange={handleConjuntoChange} placeholder="Correo del administrador" className="w-full p-2 border border-gray-300 rounded-md" required />
        <input type="tel" name="adminPhone" value={conjuntoData.adminPhone} onChange={handleConjuntoChange} placeholder="Teléfono del administrador" className="w-full p-2 border border-gray-300 rounded-md" required />
      </div>
  );


  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl w-11/12 md:w-1/2 lg:w-1/3 relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-6 border-b border-gray-200">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
              <Icon name="x" className="w-6 h-6"/>
            </button>
            <h2 className="text-2xl font-bold text-gray-800">Configuración</h2>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="p-6 overflow-y-auto">
                <div className="mb-6 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        {(['Perfil', 'Conjunto'] as SettingsTab[]).map(tab => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`${
                                    activeTab === tab
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                {activeTab === 'Perfil' ? renderProfileTab() : renderConjuntoTab()}
            </div>
            
            <footer className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-4">
                <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                Cancelar
                </button>
                <button
                type="submit"
                disabled={!hasChanges}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                Guardar Cambios
                </button>
            </footer>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;