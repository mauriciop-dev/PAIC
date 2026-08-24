
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, ConjuntoInfo, AccessPoint, UserRole, CommonArea, PlatformUser, UserRoleDefinition, Tab } from '../types';
import { Icon } from './ui/Icon';
import { apiService } from '../services/apiService';
import { SettingsTab } from '../App';
import ConfirmModal from './ConfirmModal';
import UserModal from './UserModal';
import RoleModal from './RoleModal';
import PlansModal from './PlansModal';
import { findPlanByName, getPlanCapacityText } from '../services/plans';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  conjuntoInfo: ConjuntoInfo;
  initialTab?: SettingsTab;
  setConjuntoInfo: (info: ConjuntoInfo) => void;
  setUserProfile: (profile: UserProfile) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  conjuntoInfo,
  initialTab,
  setConjuntoInfo,
  setUserProfile
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'Perfil');
  const [profileData, setProfileData] = useState<UserProfile>(userProfile);
  const [conjuntoData, setConjuntoData] = useState<ConjuntoInfo>(conjuntoInfo);
  const [hasChanges, setHasChanges] = useState(false);

  // Detectar si el trial expiró
  const isTrialExpired = userProfile.role === UserRole.Trial 
    && userProfile.trialExpiresAt 
    && new Date(userProfile.trialExpiresAt).getTime() < Date.now()
    && conjuntoInfo.subscriptionPlan === 'Free';
  
  // States for different tabs
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([]);
  const [newAccessPointName, setNewAccessPointName] = useState('');

  const [commonAreas, setCommonAreas] = useState<CommonArea[]>([]);
  const [newAreaName, setNewAreaName] = useState('');

  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [roles, setRoles] = useState<UserRoleDefinition[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingUserPermissions, setEditingUserPermissions] = useState<PlatformUser | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  
  const [isLoadingTabData, setIsLoadingTabData] = useState(false);

  const fetchDataForTab = useCallback(async (tab: SettingsTab) => {
    if (!userProfile.conjuntoId) return;
    setIsLoadingTabData(true);
    try {
        switch(tab) {
            case 'Puntos de Acceso':
                setAccessPoints(await apiService.fetchAccessPoints(userProfile.conjuntoId));
                break;
            case 'Gestionar Áreas':
                setCommonAreas(await apiService.fetchCommonAreas(userProfile.conjuntoId));
                break;
            case 'Usuarios':
                setPlatformUsers(await apiService.fetchUsers(userProfile.conjuntoId));
                setRoles(await apiService.fetchRoles(userProfile.conjuntoId));
                break;
            case 'Permisos de Usuario':
                 const [users, userRoles] = await Promise.all([
                    apiService.fetchUsers(userProfile.conjuntoId),
                    apiService.fetchRoles(userProfile.conjuntoId)
                ]);
                setPlatformUsers(users);
                setRoles(userRoles);
                break;
        }
    } catch (error) {
        console.error(`Failed to fetch data for tab ${tab}:`, error);
    } finally {
        setIsLoadingTabData(false);
    }
  }, [userProfile.conjuntoId]);

  useEffect(() => {
    if (isOpen) {
        const tabToLoad = initialTab || 'Perfil';
        setActiveTab(tabToLoad);
        fetchDataForTab(tabToLoad);
    }
  }, [isOpen, initialTab, fetchDataForTab]);

  useEffect(() => {
      setConjuntoData(conjuntoInfo);
      setProfileData(userProfile);
  }, [conjuntoInfo, userProfile, isOpen])

  const handleTabClick = (tab: SettingsTab) => {
    setActiveTab(tab);
    fetchDataForTab(tab);
  }

  // --- Save general settings ---
  const handleSaveChanges = async () => {
    try {
        await apiService.updateUserProfile(profileData);
        await apiService.updateConjuntoInfo(conjuntoData);
        setUserProfile(profileData);
        setConjuntoInfo(conjuntoData);
        setHasChanges(false);
        onClose(); // Close modal on success
    } catch (error) {
        console.error("Error saving settings:", error);
    }
  };

  // --- Access Points Logic ---
  const handleAddAccessPoint = async () => { if (newAccessPointName.trim() && userProfile.conjuntoId) { await apiService.addAccessPoint(userProfile.conjuntoId, newAccessPointName.trim()); setNewAccessPointName(''); fetchDataForTab('Puntos de Acceso'); }};
  const handleDeleteAccessPoint = async (id: number) => { if(userProfile.conjuntoId) { await apiService.deleteAccessPoint(userProfile.conjuntoId, id); fetchDataForTab('Puntos de Acceso'); }};

  // --- Common Areas Logic ---
  const handleAddArea = async () => { if (newAreaName.trim() && userProfile.conjuntoId) { await apiService.addCommonArea(userProfile.conjuntoId, newAreaName.trim()); setNewAreaName(''); fetchDataForTab('Gestionar Áreas'); }};
  const handleRemoveArea = async (id: string) => { if (userProfile.conjuntoId) { await apiService.removeCommonArea(userProfile.conjuntoId, id); fetchDataForTab('Gestionar Áreas'); }};
  
  // --- Users & Roles Logic ---
  const handleUserModalOpen = (user: PlatformUser | null) => { setModalError(null); setSelectedUser(user); setIsUserModalOpen(true); };
  const handleOpenPermissionEditor = (user: PlatformUser) => { setModalError(null); setEditingUserPermissions(user); setIsRoleModalOpen(true);};
  const handleSaveUser = async (user: PlatformUser) => {
      if (!userProfile.conjuntoId) return;
      setModalError(null);
      try {
        if(user.id) { await apiService.updateUser(userProfile.conjuntoId, user); } 
        else { await apiService.addUser(userProfile.conjuntoId, user); }
        fetchDataForTab('Usuarios');
        setIsUserModalOpen(false);
      } catch (error: any) { setModalError(error.message); }
  };
  const handleDeleteUser = async (userId: number) => { if(userProfile.conjuntoId) { await apiService.deleteUser(userProfile.conjuntoId, userId); fetchDataForTab('Usuarios'); }};
  const handleSaveRole = async (role: UserRoleDefinition, userIdToAssign?: number) => {
    if (!userProfile.conjuntoId) return;
    setModalError(null);
    try {
        if (!userIdToAssign) throw new Error("Se debe seleccionar un usuario.");
        const user = platformUsers.find(u => u.id === userIdToAssign);
        if (!user) throw new Error("Usuario no encontrado.");
        const customRoleName = `Personalizado para ${user.name}`;
        const existingRoleDef = roles.find(r => r.name === user.role);

        if (existingRoleDef) { await apiService.updateRole(userProfile.conjuntoId, { ...existingRoleDef, permissions: role.permissions }); } 
        else { await apiService.addRole(userProfile.conjuntoId, { name: customRoleName, permissions: role.permissions }); }
        
        if (user.role !== customRoleName) { await apiService.updateUser(userProfile.conjuntoId, { ...user, role: customRoleName }); }
        
        await fetchDataForTab('Permisos de Usuario');
        setIsRoleModalOpen(false);
        setEditingUserPermissions(null);
    } catch (error: any) {
        console.error("Error saving role:", error);
        setModalError(error.message || "Ocurrió un error.");
        throw error;
    }
  };

  const getPermissionsForRole = (roleName: string, allCustomRoles: UserRoleDefinition[]): string[] => {
    switch (roleName) {
        case UserRole.Admin: case UserRole.Subscriber: case UserRole.Trial: return ['Todos'];
        case 'Guard': return [Tab.Seguridad];
        case 'Contador': return [Tab.Finanzas];
        default: const customRole = allCustomRoles.find(r => r.name === roleName); return customRole ? customRole.permissions : [];
    }
  };

  // --- Subscription Logic ---
  const handleUpgradeClick = () => {
    setPaymentError(null);
    setIsPlansModalOpen(true);
  };


  // --- Render Functions for each Tab ---

  const renderContent = () => {
      if (isLoadingTabData) {
          return <div className="text-center p-10 text-gray-500">Cargando...</div>;
      }
      switch(activeTab) {
        case 'Perfil': return renderProfileTab();
        case 'Conjunto': return renderConjuntoTab();
        case 'Puntos de Acceso': return renderAccessPointsTab();
        case 'Gestionar Áreas': return renderManageAreasTab();
        case 'Usuarios': return renderUsersTab();
        case 'Permisos de Usuario': return renderRolesTab();
        case 'Suscripción': return renderSubscriptionTab();
        default: return null;
      }
  };
  
  const renderProfileTab = () => (
    <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 p-5 bg-gray-50 rounded-xl">
            {profileData.avatarUrl ? <img src={profileData.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full" /> : <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center"><Icon name="user" className="w-10 h-10 text-gray-600" /></div>}
            <div className="text-center">
                <p className="font-bold text-lg text-gray-800">{profileData.fullName}</p>
                <p className="text-sm text-gray-600">{profileData.email}</p>
            </div>
        </div>
        <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700">Nombre</label>
            <input id="profile-name" type="text" value={profileData.fullName} onChange={(e) => {setProfileData(prev => ({...prev, fullName: e.target.value})); setHasChanges(true);}} className="mt-1 w-full p-2 border rounded" />
        </div>
        <div>
            <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700">Correo</label>
            <input id="profile-email" type="email" value={profileData.email} readOnly disabled className="mt-1 w-full p-2 border rounded bg-gray-50 text-gray-500" />
        </div>
        <p className="text-xs text-gray-500">Tu correo y foto son gestionados por tu proveedor de autenticación (ej. Google).</p>
    </div>
  );

  const renderConjuntoTab = () => (
      <div className="space-y-4">
        <input type="text" name="name" value={conjuntoData.name} onChange={(e) => {setConjuntoData(prev => ({...prev, name: e.target.value})); setHasChanges(true);}} placeholder="Nombre del conjunto" className="w-full p-2 border rounded" />
        <input type="text" name="nit" value={conjuntoData.nit} onChange={(e) => {setConjuntoData(prev => ({...prev, nit: e.target.value})); setHasChanges(true);}} placeholder="NIT" className="w-full p-2 border rounded" />
        <input type="text" name="address" value={conjuntoData.address} onChange={(e) => {setConjuntoData(prev => ({...prev, address: e.target.value})); setHasChanges(true);}} placeholder="Dirección" className="w-full p-2 border rounded" />
        <input type="text" name="adminName" value={conjuntoData.adminName} onChange={(e) => {setConjuntoData(prev => ({...prev, adminName: e.target.value})); setHasChanges(true);}} placeholder="Nombre del admin" className="w-full p-2 border rounded" />
        <input type="email" name="adminEmail" value={conjuntoData.adminEmail} onChange={(e) => {setConjuntoData(prev => ({...prev, adminEmail: e.target.value})); setHasChanges(true);}} placeholder="Correo del admin" className="w-full p-2 border rounded" />
        <input type="tel" name="adminPhone" value={conjuntoData.adminPhone} onChange={(e) => {setConjuntoData(prev => ({...prev, adminPhone: e.target.value})); setHasChanges(true);}} placeholder="Teléfono del admin" className="w-full p-2 border rounded" />
      </div>
  );

  const renderAccessPointsTab = () => (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <input type="text" value={newAccessPointName} onChange={(e) => setNewAccessPointName(e.target.value)} placeholder="Nombre del punto de acceso" className="flex-1 p-2 border rounded-md"/>
        <button onClick={handleAddAccessPoint} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Agregar</button>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {accessPoints.map(point => (
          <div key={point.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
            <span className="text-gray-800">{point.name}</span>
            <button onClick={() => setConfirmAction({ title: 'Eliminar Punto de Acceso', message: '¿Seguro que quieres eliminar este punto de acceso?', onConfirm: () => handleDeleteAccessPoint(point.id) })} className="text-red-500 hover:text-red-700 text-sm">Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderManageAreasTab = () => (
      <div>
        <div className="flex items-center gap-2 mb-4">
            <input type="text" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} placeholder="Nombre del área" className="flex-1 p-2 border rounded-md"/>
            <button onClick={handleAddArea} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Agregar</button>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
            {commonAreas.map(area => (<div key={area.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md"> <span className="text-gray-800">{area.name}</span> <button onClick={() => setConfirmAction({ title: 'Eliminar Área Común', message: '¿Seguro que quieres eliminar esta área común?', onConfirm: () => handleRemoveArea(area.id) })} className="text-red-500 hover:text-red-700 text-sm">Eliminar</button></div>))}
        </div>
      </div>
  );

  const renderUsersTab = () => (
      <div>
        <div className="flex justify-end mb-4"><button onClick={() => handleUserModalOpen(null)} className="px-3 py-1.5 bg-blue-600 text-white rounded-md font-semibold text-xs flex items-center gap-1"><Icon name="user-plus" className="w-4 h-4"/>Agregar Usuario</button></div>
        <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0"><tr><th className="px-6 py-3">Nombre</th><th className="px-6 py-3">Correo</th><th className="px-6 py-3">Rol</th><th className="px-6 py-3 text-right">Acciones</th></tr></thead>
                <tbody>{platformUsers.map(user => (<tr key={user.id} className="bg-white border-b hover:bg-gray-50"><td className="px-6 py-4">{user.name}</td><td className="px-6 py-4">{user.email}</td><td className="px-6 py-4">{user.role}</td><td className="px-6 py-4 text-right space-x-2"><button onClick={() => handleUserModalOpen(user)} className="font-medium text-blue-600 hover:underline">Editar</button><button onClick={() => setConfirmAction({ title: 'Eliminar Usuario', message: '¿Seguro que quieres eliminar este usuario?', onConfirm: () => handleDeleteUser(user.id) })} className="font-medium text-red-600 hover:underline">Eliminar</button></td></tr>))}</tbody>
            </table>
        </div>
      </div>
  );

  const renderRolesTab = () => (
     <div className="overflow-x-auto max-h-96">
        <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0"><tr><th className="px-6 py-3">Usuario</th><th className="px-6 py-3">Permisos</th><th className="px-6 py-3 text-right">Acciones</th></tr></thead>
            <tbody>
                {platformUsers.map(user => (<tr key={user.id} className="bg-white border-b hover:bg-gray-50"><td className="px-6 py-4">{user.name} ({user.role})</td><td className="px-6 py-4">{getPermissionsForRole(user.role as string, roles).join(', ') || 'Sin permisos'}</td><td className="px-6 py-4 text-right"><button onClick={() => handleOpenPermissionEditor(user)} className="font-medium text-blue-600 hover:underline">Editar Permisos</button></td></tr>))}
            </tbody>
        </table>
    </div>
  );

  const renderSubscriptionTab = () => {
      const isPaid = conjuntoInfo.subscriptionPlan === 'Paid';
      const currentPlan = findPlanByName(conjuntoInfo.planName);
      return (
          <div className="space-y-6">
              {isTrialExpired && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon name="alert-triangle" className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-amber-800">Tu periodo de prueba ha terminado</p>
                      <p className="text-sm text-amber-700 mt-0.5">No te preocupes, puedes elegir cualquiera de nuestros planes para seguir disfrutando de PAIC.</p>
                    </div>
                  </div>
                </div>
              )}
              <div className={`p-6 rounded-lg border ${isPaid ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <h3 className="text-lg font-bold">Estado de tu Suscripción</h3>
                  {isPaid ? (
                      <>
                          <p className={`text-2xl font-extrabold mt-2 ${isPaid ? 'text-green-700' : 'text-yellow-700'}`}>
                              {currentPlan ? `Plan ${currentPlan.name}` : 'Plan Pro'}
                          </p>
                          {currentPlan && (
                              <p className="mt-1 text-sm text-green-700 font-medium">
                                  {getPlanCapacityText(currentPlan)}
                              </p>
                          )}
                          <p className="mt-2 text-green-600">
                              {conjuntoInfo.planExpiresAt
                                  ? conjuntoInfo.preapprovalId
                                      ? `Tu suscripción se renueva automáticamente cada mes/año mediante Mercado Pago. El periodo actual vence el ${new Date(conjuntoInfo.planExpiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}.`
                                      : `Tu plan vence el ${new Date(conjuntoInfo.planExpiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}.`
                                  : 'Tu suscripción está activa. ¡Gracias por confiar en PAIC!'}
                          </p>
                      </>
                  ) : (
                      <>
                          <p className={`text-2xl font-extrabold mt-2 ${isPaid ? 'text-green-700' : 'text-yellow-700'}`}>
                              Plan Gratis
                          </p>
                          <p className="mt-1 text-sm text-yellow-700 font-medium">
                              {currentPlan ? getPlanCapacityText(currentPlan) : 'Este plan te permite administrar una copropiedad con PAIC.'}
                          </p>
                          <p className="mt-2 text-yellow-600">Disfruta de todas las funciones Pro durante tu periodo de prueba.</p>
                      </>
                  )}
              </div>
              <div className="p-6 bg-white rounded-lg shadow-md border">
                  <h3 className="text-lg font-bold text-gray-800">Mejora tu plan</h3>
                  <p className="mt-2 text-gray-600">Dependiendo de la cantidad de unidades a administrar, selecciona el plan ideal para tu copropiedad. Todos los planes incluyen acceso a todos los módulos.</p>
                  <button
                      onClick={handleUpgradeClick}
                      className="mt-4 w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                      <Icon name="credit-card" className="w-5 h-5" />
                      Mejorar plan ahora
                  </button>
                  {paymentError && <p className="text-sm text-red-600 text-center mt-3">{paymentError}</p>}
              </div>
          </div>
      );
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-end md:items-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-lg shadow-2xl w-full md:w-2/3 lg:w-[48rem] relative flex flex-col max-h-[95vh] md:max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <header className="p-4 md:p-6 border-b"><button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"><Icon name="x" className="w-6 h-6"/></button><h2 className="text-xl md:text-2xl font-bold text-gray-800">Configuración</h2></header>

        <div className="flex flex-1 overflow-hidden md:flex-row">
                <nav className="hidden md:block w-48 border-r p-4">
                    <ul className="space-y-1">
                        {(['Perfil', 'Conjunto', 'Gestionar Áreas', 'Puntos de Acceso', 'Usuarios', 'Permisos de Usuario', 'Suscripción'] as SettingsTab[]).map(tab => {
                            const subtabId = 'subtab-config-' + tab.toLowerCase().replace(/\s+/g, '-').replace(/[áéíóú]/g, c => ({'á':'a','é':'e','í':'i','ó':'o','ú':'u'})[c] || c);
                            return (
                            <li key={tab}><button id={subtabId} onClick={() => handleTabClick(tab)} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md ${activeTab === tab ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>{tab}</button></li>
                            );
                        })}
                    </ul>
                </nav>
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 md:p-6 overflow-y-auto">
                    {renderContent()}
                </div>
                {(activeTab === 'Perfil' || activeTab === 'Conjunto') && (
                    <footer className="p-4 border-t bg-gray-50 mt-auto flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Cancelar</button>
                        <button type="button" onClick={handleSaveChanges} disabled={!hasChanges} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300">Guardar Cambios</button>
                    </footer>
                )}
            </main>
        </div>
        {/* Mobile: bottom scrollable tabs */}
        <div className="md:hidden border-t border-gray-200 bg-white overflow-x-auto touch-pan-x pb-[env(safe-area-inset-bottom)]">
             <nav className="flex space-x-2 px-4 py-2 w-max" aria-label="Tabs de configuración">
                 {(['Perfil', 'Conjunto', 'Gestionar Áreas', 'Puntos de Acceso', 'Usuarios', 'Permisos de Usuario', 'Suscripción'] as SettingsTab[]).map(tab => {
                     const subtabId = 'subtab-config-' + tab.toLowerCase().replace(/\s+/g, '-').replace(/[áéíóú]/g, c => ({'á':'a','é':'e','í':'i','ó':'o','ú':'u'})[c] || c);
                     return (
                     <button key={tab} id={subtabId} onClick={() => handleTabClick(tab)} className={`whitespace-nowrap px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>{tab}</button>
                     );
                 })}
             </nav>
            </div>
        
        {isUserModalOpen && <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSave={handleSaveUser} userToEdit={selectedUser} availableRoles={roles} error={modalError} />}
        {isRoleModalOpen && editingUserPermissions && <RoleModal isOpen={isRoleModalOpen} onClose={() => {setIsRoleModalOpen(false); setEditingUserPermissions(null);}} onSave={handleSaveRole} userToEdit={editingUserPermissions} allRoles={roles} error={modalError} />}
        <ConfirmModal
          isOpen={confirmAction !== null}
          title={confirmAction?.title || ''}
          message={confirmAction?.message || ''}
          confirmLabel="Eliminar"
          onConfirm={() => { confirmAction?.onConfirm(); setConfirmAction(null); }}
          onCancel={() => setConfirmAction(null)}
        />
        <PlansModal isOpen={isPlansModalOpen} onClose={() => setIsPlansModalOpen(false)} conjuntoInfo={conjuntoInfo} />
      </div>
    </div>
  );
};

export default SettingsModal;
