

import React, { useState, useEffect } from 'react';
import { UserProfile, ConjuntoInfo, AccessPoint, UserRole } from '../types';
import { Icon } from './ui/Icon';
import { apiService } from '../services/apiService';
import { mercadoPagoService } from '../services/mercadoPagoService';

type SettingsTab = 'Perfil' | 'Conjunto' | 'Puntos de Acceso' | 'Suscripción';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProfile: UserProfile, updatedConjunto: ConjuntoInfo) => void;
  userProfile: UserProfile;
  conjuntoInfo: ConjuntoInfo;
  initialTab?: SettingsTab;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  userProfile,
  conjuntoInfo,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'Perfil');
  const [profileData, setProfileData] = useState<UserProfile>(userProfile);
  const [conjuntoData, setConjuntoData] = useState<ConjuntoInfo>(conjuntoInfo);
  const [hasChanges, setHasChanges] = useState(false);
  const [isRedirectingToPayment, setIsRedirectingToPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Access Points state
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([]);
  const [newAccessPointName, setNewAccessPointName] = useState('');

  useEffect(() => {
    if (isOpen) {
        setActiveTab(initialTab || 'Perfil');
    }
  }, [isOpen, initialTab])

  useEffect(() => {
    const fetchAccessPoints = async () => {
        if (activeTab === 'Puntos de Acceso' && userProfile.conjuntoId) {
            const data = await apiService.fetchAccessPoints(userProfile.conjuntoId);
            setAccessPoints(data);
        }
    };
    fetchAccessPoints();
  }, [activeTab, userProfile.conjuntoId]);

  useEffect(() => {
      setConjuntoData(conjuntoInfo);
      setProfileData(userProfile);
  }, [conjuntoInfo, userProfile, isOpen])


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
  
  const handleAddAccessPoint = async () => {
      if (newAccessPointName.trim() && userProfile.conjuntoId) {
          await apiService.addAccessPoint(userProfile.conjuntoId, newAccessPointName.trim());
          setNewAccessPointName('');
          const data = await apiService.fetchAccessPoints(userProfile.conjuntoId); // Refresh
          setAccessPoints(data);
      }
  };

  const handleDeleteAccessPoint = async (id: number) => {
      if(window.confirm('¿Estás seguro de que quieres eliminar este punto de acceso?') && userProfile.conjuntoId) {
          await apiService.deleteAccessPoint(userProfile.conjuntoId, id);
          const data = await apiService.fetchAccessPoints(userProfile.conjuntoId); // Refresh
          setAccessPoints(data);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(profileData, conjuntoData);
    setHasChanges(false);
  };
  
  const handleUpgradeClick = async () => {
    setIsRedirectingToPayment(true);
    setPaymentError(null);
    try {
        const checkoutUrl = await mercadoPagoService.createPreference(conjuntoData);
        if (checkoutUrl) {
            window.location.href = checkoutUrl;
        } else {
            throw new Error('No se recibió una URL de pago.');
        }
    } catch (error: any) {
        console.error("Payment initiation failed:", error);
        setPaymentError(error.message || 'No se pudo iniciar el pago. Intenta de nuevo.');
        setIsRedirectingToPayment(false);
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            {profileData.avatarUrl ? (
                <img src={profileData.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full" />
            ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <Icon name="user" className="w-8 h-8 text-gray-600" />
                </div>
            )}
            <div>
                <p className="font-bold text-lg text-gray-800">{profileData.fullName}</p>
                <p className="text-sm text-gray-600">{profileData.email}</p>
            </div>
        </div>
        <p className="text-xs text-gray-500">Tu nombre, correo y foto son gestionados por tu proveedor de autenticación (ej. Google).</p>
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

  const renderAccessPointsTab = () => (
      <div>
        <div className="flex items-center gap-2 mb-4">
            <input 
                type="text"
                value={newAccessPointName}
                onChange={(e) => setNewAccessPointName(e.target.value)}
                placeholder="Nombre del punto de acceso"
                className="flex-1 p-2 border border-gray-300 rounded-md"
            />
            <button
                type="button"
                onClick={handleAddAccessPoint}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
            >
                Agregar
            </button>
        </div>
        <div className="space-y-2">
            {accessPoints.map(point => (
                <div key={point.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                    <span className="text-gray-800">{point.name}</span>
                    <button type="button" onClick={() => handleDeleteAccessPoint(point.id)} className="text-red-500 hover:text-red-700 font-medium text-sm">Eliminar</button>
                </div>
            ))}
        </div>
      </div>
  );

  const renderSubscriptionTab = () => (
    <div>
        {conjuntoData.subscriptionPlan === 'Paid' ? (
            <div className="text-center p-8 bg-green-50 border border-green-200 rounded-lg">
                <Icon name="shield-check" className="w-12 h-12 mx-auto text-green-500" />
                <h3 className="text-xl font-bold text-green-800 mt-4">Plan Pro Activo</h3>
                <p className="text-gray-600 mt-2">
                    Tu suscripción está activa. Disfruta de todas las funcionalidades de PAIC sin límites.
                </p>
                <p className="text-sm text-gray-500 mt-4">
                    Precio: ${conjuntoData.planPrice?.toLocaleString('es-CO')} COP / Mes
                </p>
            </div>
        ) : (
            <div className="border border-gray-200 rounded-lg p-6">
                 <h3 className="text-xl font-bold text-gray-800">Mejora al Plan Pro</h3>
                 <p className="text-gray-600 mt-2">
                    Desbloquea todo el potencial de PAIC con nuestro plan Pro.
                 </p>
                 <div className="my-6 text-center">
                    <span className="text-4xl font-extrabold text-blue-600">$140.000</span>
                    <span className="text-lg font-medium text-gray-500"> COP / mes</span>
                 </div>
                 <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2"><Icon name="checkSquare" className="w-4 h-4 text-green-500" /> Asistente IA sin límites</li>
                    <li className="flex items-center gap-2"><Icon name="checkSquare" className="w-4 h-4 text-green-500" /> Módulos completos de gestión</li>
                    <li className="flex items-center gap-2"><Icon name="checkSquare" className="w-4 h-4 text-green-500" /> Soporte prioritario</li>
                 </ul>
                 <button
                    type="button"
                    onClick={handleUpgradeClick}
                    disabled={isRedirectingToPayment}
                    className="mt-6 w-full px-4 py-3 text-white bg-blue-600 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2 disabled:bg-blue-300"
                 >
                    <Icon name="credit-card" className="w-5 h-5" />
                    {isRedirectingToPayment ? 'Redirigiendo a Mercado Pago...' : 'Mejorar Plan Ahora'}
                 </button>
                 {paymentError && <p className="text-xs text-red-600 mt-2 text-center">{paymentError}</p>}
                 <p className="text-xs text-gray-500 mt-2 text-center">Serás redirigido a la pasarela de pagos segura de Mercado Pago.</p>
            </div>
        )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl w-11/12 md:w-1/2 lg:w-[40rem] relative flex flex-col max-h-[90vh]"
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
                        {(['Perfil', 'Conjunto', 'Puntos de Acceso', 'Suscripción'] as SettingsTab[]).map(tab => (
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

                {activeTab === 'Perfil' && renderProfileTab()}
                {activeTab === 'Conjunto' && renderConjuntoTab()}
                {activeTab === 'Puntos de Acceso' && renderAccessPointsTab()}
                {activeTab === 'Suscripción' && renderSubscriptionTab()}
            </div>
            
            {(activeTab === 'Perfil' || activeTab === 'Conjunto') && (
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
            )}
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
