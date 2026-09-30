import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, ConjuntoInfo, CommonArea, PlatformUser, UserRoleDefinition, Tab, Estacion, Vigilante, AccessPoint } from '../types';
import { Icon } from './ui/Icon';
import { apiService } from '../services/apiService';
import { SettingsTab } from '../App';
import ConfirmModal from './ConfirmModal';
import UserModal from './UserModal';
import RoleModal from './RoleModal';
import PlansModal from './PlansModal';
import { findPlanByName, getPlanCapacityText } from '../services/plans';
import { isReadOnlyAccount } from '../services/trialAccess';

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
  const isExpiredTrial = isReadOnlyAccount(userProfile, conjuntoInfo);
  
  // --- Estaciones (Puntos de Acceso Físicos) ---
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [newEstacionCodigo, setNewEstacionCodigo] = useState('');
  const [newEstacionNombre, setNewEstacionNombre] = useState('');
  const [newEstacionPassword, setNewEstacionPassword] = useState('');
  const [editingEstacion, setEditingEstacion] = useState<Estacion | null>(null);
  const [editEstacionCodigo, setEditEstacionCodigo] = useState('');
  const [editEstacionNombre, setEditEstacionNombre] = useState('');
  const [editEstacionPassword, setEditEstacionPassword] = useState('');
  const [estacionError, setEstacionError] = useState<string | null>(null);
  const [estacionSuccess, setEstacionSuccess] = useState<string | null>(null);

  // --- Personal de Seguridad (Vigilantes) ---
  const [vigilantes, setVigilantes] = useState<Vigilante[]>([]);
  const [newVigilanteCedula, setNewVigilanteCedula] = useState('');
  const [newVigilanteNombre, setNewVigilanteNombre] = useState('');
  const [newVigilantePin, setNewVigilantePin] = useState('');
  const [editingVigilante, setEditingVigilante] = useState<Vigilante | null>(null);
  const [editVigilanteCedula, setEditVigilanteCedula] = useState('');
  const [editVigilanteNombre, setEditVigilanteNombre] = useState('');
  const [editVigilantePin, setEditVigilantePin] = useState('');
  const [vigilanteError, setVigilanteError] = useState<string | null>(null);
  const [vigilanteSuccess, setVigilanteSuccess] = useState<string | null>(null);

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
                setEstaciones(await apiService.fetchEstaciones(userProfile.conjuntoId));
                break;
            case 'Personal de Seguridad':
                setVigilantes(await apiService.fetchVigilantes(userProfile.conjuntoId));
                break;
            case 'Gestionar Áreas':
                setCommonAreas(await apiService.fetchCommonAreas(userProfile.conjuntoId));
                break;
            case 'Usuarios':
                const [uList, uRoles] = await Promise.all([
                    apiService.fetchUsers(userProfile.conjuntoId),
                    apiService.fetchRoles(userProfile.conjuntoId)
                ]);
                setPlatformUsers(uList);
                setRoles(uRoles);
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
  }, [conjuntoInfo, userProfile, isOpen]);

  const handleTabClick = (tab: SettingsTab) => {
    setActiveTab(tab);
    fetchDataForTab(tab);
  };

  // --- Save general settings ---
  const handleSaveChanges = async () => {
    try {
        await apiService.updateUserProfile(profileData);
        await apiService.updateConjuntoInfo(conjuntoData);
        setUserProfile(profileData);
        setConjuntoInfo(conjuntoData);
        setHasChanges(false);
        onClose();
    } catch (error) {
        console.error("Error saving settings:", error);
    }
  };

  // --- Estaciones Handlers ---
  const handleAddEstacion = async () => {
    if (!newEstacionNombre.trim() || !newEstacionCodigo.trim() || !newEstacionPassword.trim() || !userProfile.conjuntoId) {
      setEstacionError('Complete todos los campos de la estación.');
      return;
    }
    setEstacionError(null);
    setEstacionSuccess(null);
    try {
      await apiService.addEstacion(
        userProfile.conjuntoId,
        newEstacionCodigo.trim(),
        newEstacionNombre.trim(),
        newEstacionPassword.trim()
      );
      setNewEstacionCodigo('');
      setNewEstacionNombre('');
      setNewEstacionPassword('');
      setEstacionSuccess(`Estación agregada exitosamente.`);
      setTimeout(() => setEstacionSuccess(null), 3000);
      await fetchDataForTab('Puntos de Acceso');
    } catch (err: any) {
      console.error("Error adding estacion:", err);
      setEstacionError(err.message || "Error al agregar la estación.");
    }
  };

  const handleOpenEditEstacion = (est: Estacion) => {
    setEditingEstacion(est);
    setEditEstacionCodigo(est.codigo_estacion);
    setEditEstacionNombre(est.nombre);
    setEditEstacionPassword('');
    setEstacionError(null);
  };

  const handleSaveEditEstacion = async () => {
    if (!editingEstacion || !userProfile.conjuntoId) return;
    setEstacionError(null);
    try {
      await apiService.updateEstacion(
        userProfile.conjuntoId,
        editingEstacion.id,
        editEstacionCodigo.trim(),
        editEstacionNombre.trim(),
        editEstacionPassword.trim() || undefined
      );
      setEditingEstacion(null);
      setEstacionSuccess(`Estación "${editEstacionNombre}" actualizada.`);
      setTimeout(() => setEstacionSuccess(null), 3000);
      await fetchDataForTab('Puntos de Acceso');
    } catch (err: any) {
      console.error("Error updating estacion:", err);
      setEstacionError(err.message || "Error al actualizar la estación.");
    }
  };

  const handleDeleteEstacion = async (id: string) => {
    try {
      await apiService.deleteEstacion(id);
      fetchDataForTab('Puntos de Acceso');
    } catch (err: any) {
      setEstacionError(err.message || "Error al eliminar la estación.");
    }
  };

  // --- Vigilantes Handlers ---
  const handleAddVigilante = async () => {
    if (!newVigilanteCedula.trim() || !newVigilanteNombre.trim() || !newVigilantePin.trim() || !userProfile.conjuntoId) {
      setVigilanteError('Complete todos los campos del vigilante.');
      return;
    }
    if (newVigilantePin.trim().length !== 6) {
      setVigilanteError('El PIN de seguridad debe ser de exactamente 6 dígitos.');
      return;
    }
    setVigilanteError(null);
    setVigilanteSuccess(null);
    try {
      await apiService.addVigilante(
        userProfile.conjuntoId,
        newVigilanteCedula.trim(),
        newVigilanteNombre.trim(),
        newVigilantePin.trim()
      );
      setNewVigilanteCedula('');
      setNewVigilanteNombre('');
      setNewVigilantePin('');
      setVigilanteSuccess(`Vigilante registrado exitosamente con PIN de 6 dígitos.`);
      setTimeout(() => setVigilanteSuccess(null), 3000);
      await fetchDataForTab('Personal de Seguridad');
    } catch (err: any) {
      console.error("Error adding vigilante:", err);
      setVigilanteError(err.message || "Error al agregar vigilante.");
    }
  };

  const handleOpenEditVigilante = (vig: Vigilante) => {
    setEditingVigilante(vig);
    setEditVigilanteCedula(vig.cedula);
    setEditVigilanteNombre(vig.nombre_completo);
    setEditVigilantePin('');
    setVigilanteError(null);
  };

  const handleSaveEditVigilante = async () => {
    if (!editingVigilante || !userProfile.conjuntoId) return;
    if (editVigilantePin.trim() && editVigilantePin.trim().length !== 6) {
      setVigilanteError('Si modifica el PIN, debe contener exactamente 6 dígitos.');
      return;
    }
    setVigilanteError(null);
    try {
      await apiService.updateVigilante(
        userProfile.conjuntoId,
        editingVigilante.id,
        editVigilanteCedula.trim(),
        editVigilanteNombre.trim(),
        editVigilantePin.trim() || undefined
      );
      setEditingVigilante(null);
      setVigilanteSuccess(`Vigilante "${editVigilanteNombre}" actualizado.`);
      setTimeout(() => setVigilanteSuccess(null), 3000);
      await fetchDataForTab('Personal de Seguridad');
    } catch (err: any) {
      console.error("Error updating vigilante:", err);
      setVigilanteError(err.message || "Error al actualizar vigilante.");
    }
  };

  const handleDeleteVigilante = async (id: string) => {
    try {
      await apiService.deleteVigilante(id);
      fetchDataForTab('Personal de Seguridad');
    } catch (err: any) {
      setVigilanteError(err.message || "Error al eliminar vigilante.");
    }
  };

  // --- Common Areas Logic ---
  const handleAddArea = async () => {
    if (newAreaName.trim() && userProfile.conjuntoId) {
      await apiService.addCommonArea(userProfile.conjuntoId, newAreaName.trim());
      setNewAreaName('');
      fetchDataForTab('Gestionar Áreas');
    }
  };
  const handleRemoveArea = async (id: string) => {
    if (userProfile.conjuntoId) {
      await apiService.removeCommonArea(userProfile.conjuntoId, id);
      fetchDataForTab('Gestionar Áreas');
    }
  };
  
  // --- Users & Roles Logic ---
  const handleUserModalOpen = (user: PlatformUser | null) => {
    setModalError(null);
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };
  const handleOpenPermissionEditor = (user: PlatformUser) => {
    setModalError(null);
    setEditingUserPermissions(user);
    setIsRoleModalOpen(true);
  };
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
  const handleDeleteUser = async (userId: number) => {
    if(userProfile.conjuntoId) {
      await apiService.deleteUser(userProfile.conjuntoId, userId);
      fetchDataForTab('Usuarios');
    }
  };
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
        case 'admin': case 'subscriber': case 'trial': return ['Todos'];
        case 'Guard': return [Tab.Seguridad];
        case 'Contador': return [Tab.Finanzas];
        default: const customRole = allCustomRoles.find(r => r.name === roleName); return customRole ? customRole.permissions : [];
    }
  };

  const handleUpgradeClick = () => {
    setIsPlansModalOpen(true);
  };

  const renderContent = () => {
      switch(activeTab) {
        case 'Perfil': return renderProfileTab();
        case 'Conjunto': return renderConjuntoTab();
        case 'Puntos de Acceso': return renderEstacionesTab();
        case 'Personal de Seguridad': return renderVigilantesTab();
        case 'Gestionar Áreas': return renderManageAreasTab();
        case 'Usuarios': return renderUsersTab();
        case 'Permisos de Usuario': return renderRolesTab();
        case 'Suscripción': return renderSubscriptionTab();
        default: return null;
      }
  };
  
  const renderProfileTab = () => (
    <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 p-6 bg-gradient-to-b from-blue-50 to-slate-50 rounded-2xl border border-slate-100">
            {profileData.avatarUrl
                ? <img src={profileData.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-2xl shadow-sm" />
                : <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center"><Icon name="user" className="w-10 h-10 text-blue-600" /></div>
            }
            <div className="text-center">
                <p className="font-bold text-lg text-gray-900">{profileData.fullName}</p>
                <p className="text-sm text-gray-500">{profileData.email}</p>
            </div>
        </div>
        <div>
            <label htmlFor="profile-name" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Nombre</label>
            <input id="profile-name" type="text" value={profileData.fullName} onChange={(e) => {setProfileData(prev => ({...prev, fullName: e.target.value})); setHasChanges(true);}} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
        </div>
        <div>
            <label htmlFor="profile-email" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Correo electrónico</label>
            <input id="profile-email" type="email" value={profileData.email} readOnly disabled className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 cursor-not-allowed" />
        </div>
        <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 p-3 rounded-xl">Tu correo y foto son gestionados por tu proveedor de autenticación (ej. Google) y no pueden modificarse aquí.</p>
    </div>
  );

  const inputCls = "w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all";
  const labelCls = "block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5";

  const renderConjuntoTab = () => (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nombre del Conjunto</label>
            <input type="text" name="name" value={conjuntoData.name} onChange={(e) => {setConjuntoData(prev => ({...prev, name: e.target.value})); setHasChanges(true);}} placeholder="Ej: Conjunto Residencial Los Pinos" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>NIT</label>
            <input type="text" name="nit" value={conjuntoData.nit} onChange={(e) => {setConjuntoData(prev => ({...prev, nit: e.target.value})); setHasChanges(true);}} placeholder="Ej: 900.123.456-7" className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Dirección</label>
          <input type="text" name="address" value={conjuntoData.address} onChange={(e) => {setConjuntoData(prev => ({...prev, address: e.target.value})); setHasChanges(true);}} placeholder="Dirección completa" className={inputCls} />
        </div>
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Datos del Administrador</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Nombre</label>
              <input type="text" name="adminName" value={conjuntoData.adminName} onChange={(e) => {setConjuntoData(prev => ({...prev, adminName: e.target.value})); setHasChanges(true);}} placeholder="Nombre completo" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Correo</label>
              <input type="email" name="adminEmail" value={conjuntoData.adminEmail} onChange={(e) => {setConjuntoData(prev => ({...prev, adminEmail: e.target.value})); setHasChanges(true);}} placeholder="admin@ejemplo.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input type="tel" name="adminPhone" value={conjuntoData.adminPhone} onChange={(e) => {setConjuntoData(prev => ({...prev, adminPhone: e.target.value})); setHasChanges(true);}} placeholder="+57 300 000 0000" className={inputCls} />
            </div>
          </div>
        </div>
      </div>
  );

  const renderEstacionesTab = () => (
    <div className="space-y-4">
      {estacionSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
          <Icon name="check" className="w-4 h-4" />
          <span>{estacionSuccess}</span>
        </div>
      )}
      {estacionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <Icon name="alert-triangle" className="w-4 h-4" />
          <span>{estacionError}</span>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Icon name="shield" className="w-4 h-4 text-blue-600" />
          <span>Configurar Nueva Estación / Portería</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">ID / Código de Estación *</label>
            <input
              type="text"
              value={newEstacionCodigo}
              onChange={(e) => setNewEstacionCodigo(e.target.value.toUpperCase())}
              placeholder="Ej: EST-TORRE1"
              className="w-full p-2.5 border rounded-lg text-sm uppercase font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Descriptivo *</label>
            <input
              type="text"
              value={newEstacionNombre}
              onChange={(e) => setNewEstacionNombre(e.target.value)}
              placeholder="Ej: Portería Principal Calle 100"
              className="w-full p-2.5 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Contraseña de Estación *</label>
            <input
              type="password"
              value={newEstacionPassword}
              onChange={(e) => setNewEstacionPassword(e.target.value)}
              placeholder="Contraseña del puesto"
              className="w-full p-2.5 border rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleAddEstacion}
            disabled={!newEstacionNombre.trim() || !newEstacionCodigo.trim() || !newEstacionPassword.trim()}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            <Icon name="plus" className="w-4 h-4" />
            Guardar Estación
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-80 border rounded-xl">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 font-bold">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre de la Estación</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {estaciones.map(est => (
              <tr key={est.id} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-bold text-blue-700">{est.codigo_estacion}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{est.nombre}</td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => handleOpenEditEstacion(est)} className="font-medium text-blue-600 hover:underline text-xs mr-2">
                    Editar
                  </button>
                  <button onClick={() => setConfirmAction({ title: 'Eliminar Estación', message: `¿Seguro que quieres eliminar la estación ${est.nombre}?`, onConfirm: () => handleDeleteEstacion(est.id) })} className="font-medium text-red-500 hover:underline text-xs">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {estaciones.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-6 text-gray-500">No hay estaciones configuradas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderVigilantesTab = () => (
    <div className="space-y-4">
      {vigilanteSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
          <Icon name="check" className="w-4 h-4" />
          <span>{vigilanteSuccess}</span>
        </div>
      )}
      {vigilanteError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <Icon name="alert-triangle" className="w-4 h-4" />
          <span>{vigilanteError}</span>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Icon name="user-check" className="w-4 h-4 text-blue-600" />
          <span>Registrar Personal de Seguridad (Vigilante)</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Cédula de Ciudadanía *</label>
            <input
              type="text"
              value={newVigilanteCedula}
              onChange={(e) => setNewVigilanteCedula(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 1020304050"
              className="w-full p-2.5 border rounded-lg text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Completo *</label>
            <input
              type="text"
              value={newVigilanteNombre}
              onChange={(e) => setNewVigilanteNombre(e.target.value)}
              placeholder="Ej: Carlos Andrés Pérez"
              className="w-full p-2.5 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">PIN de Seguridad (6 Dígitos) *</label>
            <input
              type="password"
              maxLength={6}
              value={newVigilantePin}
              onChange={(e) => setNewVigilantePin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full p-2.5 border rounded-lg text-sm font-mono tracking-widest text-center"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleAddVigilante}
            disabled={!newVigilanteCedula.trim() || !newVigilanteNombre.trim() || newVigilantePin.length !== 6}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            <Icon name="plus" className="w-4 h-4" />
            Registrar Vigilante
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-80 border rounded-xl">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 font-bold">
            <tr>
              <th className="px-4 py-3">Cédula</th>
              <th className="px-4 py-3">Nombre Completo</th>
              <th className="px-4 py-3">PIN</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vigilantes.map(vig => (
              <tr key={vig.id} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-bold text-gray-900">{vig.cedula}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{vig.nombre_completo}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">•••••• (Encriptado)</td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => handleOpenEditVigilante(vig)} className="font-medium text-blue-600 hover:underline text-xs mr-2">
                    Editar / Resetear PIN
                  </button>
                  <button onClick={() => setConfirmAction({ title: 'Eliminar Vigilante', message: `¿Seguro que quieres eliminar a ${vig.nombre_completo}?`, onConfirm: () => handleDeleteVigilante(vig.id) })} className="font-medium text-red-500 hover:underline text-xs">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {vigilantes.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-6 text-gray-500">No hay vigilantes registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
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
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Nombre</th>
                    <th className="px-6 py-3">Correo</th>
                    <th className="px-6 py-3">Rol</th>
                    <th className="px-6 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {platformUsers.map(user => (
                    <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-800">{user.name}</td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4">{user.role}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleUserModalOpen(user)} className="font-medium text-blue-600 hover:underline">Editar</button>
                        <button onClick={() => setConfirmAction({ title: 'Eliminar Usuario', message: '¿Seguro que quieres eliminar este usuario?', onConfirm: () => handleDeleteUser(user.id) })} className="font-medium text-red-600 hover:underline">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                  {platformUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-gray-500">No hay usuarios registrados.</td>
                    </tr>
                  )}
                </tbody>
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
              {isExpiredTrial && (
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
                          <p className="mt-2 text-yellow-600">
                            {isExpiredTrial
                              ? 'Tu acceso actual es de solo lectura. Elige un plan para volver a realizar cambios.'
                              : 'Disfruta de todas las funciones Pro durante tu periodo de prueba.'}
                          </p>
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
  
  const allTabs: SettingsTab[] = [
    'Perfil',
    'Conjunto',
    'Gestionar Áreas',
    'Puntos de Acceso',
    'Personal de Seguridad',
    'Usuarios',
    'Permisos de Usuario',
    'Suscripción'
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-end md:items-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:w-3/4 lg:w-[52rem] relative flex flex-col max-h-[95vh] md:max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <header className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Configuración</h2>
            <p className="text-xs text-gray-400 mt-0.5">Gestiona el perfil, conjunto y módulos del sistema.</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
            <Icon name="x" className="w-5 h-5"/>
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden md:flex-row">
          <nav className="hidden md:block w-56 border-r p-4 bg-gray-50/50">
            <ul className="space-y-1">
              {allTabs.map(tab => {
                const subtabId = 'subtab-config-' + tab.toLowerCase().replace(/\s+/g, '-').replace(/[áéíóú]/g, c => ({'á':'a','é':'e','í':'i','ó':'o','ú':'u'})[c] || c);
                return (
                  <li key={tab}>
                    <button
                      id={subtabId}
                      onClick={() => handleTabClick(tab)}
                      className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                        activeTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {tab}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 md:p-6 overflow-y-auto">
              {isLoadingTabData ? (
                <div className="text-center py-12 text-gray-400">
                  <Icon name="refresh-cw" className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-xs">Cargando...</p>
                </div>
              ) : (
                renderContent()
              )}
            </div>
            {(activeTab === 'Perfil' || activeTab === 'Conjunto') && (
              <footer className="p-4 border-t border-gray-100 bg-gray-50/70 mt-auto flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 font-semibold rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={handleSaveChanges} disabled={!hasChanges} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 font-bold rounded-xl shadow-sm shadow-blue-500/20 transition-all">
                  Guardar Cambios
                </button>
              </footer>
            )}
          </main>
        </div>

        {/* Mobile bottom scrollable tabs */}
        <div className="md:hidden border-t border-gray-200 bg-white overflow-x-auto touch-pan-x pb-[env(safe-area-inset-bottom)]">
          <nav className="flex space-x-2 px-4 py-2 w-max" aria-label="Tabs de configuración">
            {allTabs.map(tab => {
              const subtabId = 'subtab-config-' + tab.toLowerCase().replace(/\s+/g, '-').replace(/[áéíóú]/g, c => ({'á':'a','é':'e','í':'i','ó':'o','ú':'u'})[c] || c);
              return (
                <button
                  key={tab}
                  id={subtabId}
                  onClick={() => handleTabClick(tab)}
                  className={`whitespace-nowrap px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Modal: Editar Estación */}
        {editingEstacion && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex justify-center items-center p-4" onClick={() => setEditingEstacion(null)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Editar Estación / Portería</h3>
                <button onClick={() => setEditingEstacion(null)} className="text-gray-400 hover:text-gray-600">
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>
              {estacionError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                  {estacionError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Código de Estación *</label>
                  <input
                    type="text"
                    value={editEstacionCodigo}
                    onChange={e => setEditEstacionCodigo(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border rounded-lg text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de la Estación *</label>
                  <input
                    type="text"
                    value={editEstacionNombre}
                    onChange={e => setEditEstacionNombre(e.target.value)}
                    className="w-full p-2.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nueva Contraseña (Opcional)</label>
                  <input
                    type="password"
                    value={editEstacionPassword}
                    onChange={e => setEditEstacionPassword(e.target.value)}
                    className="w-full p-2.5 border rounded-lg text-sm"
                    placeholder="Dejar vacío para no cambiar"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingEstacion(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditEstacion}
                  disabled={!editEstacionCodigo.trim() || !editEstacionNombre.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Editar / Resetear PIN Vigilante */}
        {editingVigilante && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex justify-center items-center p-4" onClick={() => setEditingVigilante(null)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Editar Vigilante / Resetear PIN</h3>
                <button onClick={() => setEditingVigilante(null)} className="text-gray-400 hover:text-gray-600">
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>
              {vigilanteError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                  {vigilanteError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cédula de Ciudadanía *</label>
                  <input
                    type="text"
                    value={editVigilanteCedula}
                    onChange={e => setEditVigilanteCedula(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2.5 border rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    value={editVigilanteNombre}
                    onChange={e => setEditVigilanteNombre(e.target.value)}
                    className="w-full p-2.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Resetear PIN (6 Dígitos - Opcional)</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={editVigilantePin}
                    onChange={e => setEditVigilantePin(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2.5 border rounded-lg text-sm font-mono text-center tracking-widest"
                    placeholder="Nuevo PIN de 6 dígitos"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Deje vacío si no desea modificar el PIN actual.</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingVigilante(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditVigilante}
                  disabled={!editVigilanteCedula.trim() || !editVigilanteNombre.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {isUserModalOpen && <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSave={handleSaveUser} userToEdit={selectedUser} availableRoles={roles} accessPoints={estaciones as any} error={modalError} />}
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
