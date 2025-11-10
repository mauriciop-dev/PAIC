

import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../services/apiService';
import { Resident, AccountStatus, Provider, InternalStaff, UserProfile, UserRole, PlatformUser, UserRoleDefinition, Tab } from '../../types';
import ResidentModal from '../ResidentModal';
import ProviderModal from '../ProviderModal';
import InternalStaffModal from '../InternalStaffModal';
import AccountStatusModal from '../AccountStatusModal';
import RoleModal from '../RoleModal';
import UserModal from '../UserModal';
import { Icon } from '../ui/Icon';

declare var XLSX: any;

enum DbTab {
  Residents = 'Residentes',
  AccountStatus = 'Estado de Cuentas',
  Providers = 'Proveedores',
  Internal = 'Internos',
  Users = 'Usuarios',
  Roles = 'Permisos de usuario'
}

interface DatabaseViewProps {
    userProfile: UserProfile;
}

const DatabaseView: React.FC<DatabaseViewProps> = ({ userProfile }) => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [accountStatus, setAccountStatus] = useState<AccountStatus[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [internalStaff, setInternalStaff] = useState<InternalStaff[]>([]);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [roles, setRoles] = useState<UserRoleDefinition[]>([]);
  
  const [isResidentModalOpen, setIsResidentModalOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);

  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<InternalStaff | null>(null);

  const [isAccountStatusModalOpen, setIsAccountStatusModalOpen] = useState(false);
  const [selectedAccountStatus, setSelectedAccountStatus] = useState<AccountStatus | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingUserPermissions, setEditingUserPermissions] = useState<PlatformUser | null>(null);
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  
  const [activeDbTab, setActiveDbTab] = useState<DbTab>(DbTab.Residents);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!userProfile.conjuntoId) return;
    setIsLoading(true);
    try {
      const isFullAdmin = userProfile.role === UserRole.Trial || userProfile.role === UserRole.Subscriber;
      const [res, acc, prov, staff, users, customRoles] = await Promise.all([
        apiService.fetchResidents(userProfile.conjuntoId),
        apiService.fetchAccountStatus(userProfile.conjuntoId),
        apiService.fetchProviders(userProfile.conjuntoId),
        apiService.fetchInternalStaff(userProfile.conjuntoId),
        isFullAdmin ? apiService.fetchUsers(userProfile.conjuntoId) : Promise.resolve([]),
        isFullAdmin ? apiService.fetchRoles(userProfile.conjuntoId) : Promise.resolve([]),
      ]);
      setResidents(res);
      setAccountStatus(acc);
      setProviders(prov);
      setInternalStaff(staff);
      setPlatformUsers(users);
      setRoles(customRoles);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userProfile.conjuntoId]);

  // Modal Handlers
  const handleUserModalOpen = (user: PlatformUser | null) => { setModalError(null); setSelectedUser(user); setIsUserModalOpen(true); };
  const handleResidentModalOpen = (resident: Resident | null) => { setSelectedResident(resident); setIsResidentModalOpen(true); };
  const handleProviderModalOpen = (provider: Provider | null) => { setSelectedProvider(provider); setIsProviderModalOpen(true); };
  const handleStaffModalOpen = (staff: InternalStaff | null) => { setSelectedStaff(staff); setIsStaffModalOpen(true); };
  const handleAccountStatusModalOpen = (account: AccountStatus | null) => { setSelectedAccountStatus(account); setIsAccountStatusModalOpen(true); };
  
  const handleOpenPermissionEditor = (user: PlatformUser) => {
      setModalError(null);
      setEditingUserPermissions(user);
      setIsRoleModalOpen(true);
  };

  // Save Handlers
  const handleSaveUser = async (user: PlatformUser) => {
      if (!userProfile.conjuntoId) return;
      setModalError(null);
      try {
        if(user.id) {
            await apiService.updateUser(userProfile.conjuntoId, user);
        } else {
            await apiService.addUser(userProfile.conjuntoId, user);
        }
        fetchData();
        setIsUserModalOpen(false);
      } catch (error: any) {
        setModalError(error.message);
      }
  };
  
  const handleSaveResident = async (resident: Resident) => {
    if (!userProfile.conjuntoId) return;
    if (selectedResident) {
        await apiService.updateResident(userProfile.conjuntoId, resident);
    } else {
        await apiService.addResident(userProfile.conjuntoId, resident);
    }
    fetchData();
    setIsResidentModalOpen(false);
  };
  
  const handleSaveProvider = async (provider: Provider) => {
    if (!userProfile.conjuntoId) return;
    if (selectedProvider) {
        await apiService.updateProvider(userProfile.conjuntoId, provider);
    } else {
        await apiService.addProvider(userProfile.conjuntoId, provider);
    }
    fetchData();
    setIsProviderModalOpen(false);
  };

  const handleSaveStaff = async (staff: InternalStaff) => {
    if (!userProfile.conjuntoId) return;
    if (selectedStaff) {
        await apiService.updateInternalStaff(userProfile.conjuntoId, staff);
    } else {
        await apiService.addInternalStaff(userProfile.conjuntoId, staff);
    }
    fetchData();
    setIsStaffModalOpen(false);
  };
  
  const handleSaveAccountStatus = async (account: AccountStatus) => {
    if (!userProfile.conjuntoId) return;
    if (selectedAccountStatus) {
        await apiService.updateAccountStatus(userProfile.conjuntoId, account);
    } else {
        await apiService.addAccountStatus(userProfile.conjuntoId, account);
    }
    fetchData();
    setIsAccountStatusModalOpen(false);
  };
  
  const handleSaveRole = async (role: UserRoleDefinition, userIdToAssign?: number) => {
    if (!userProfile.conjuntoId) return;
    setModalError(null);

    try {
        if (!userIdToAssign) {
            throw new Error("Se debe seleccionar un usuario para asignar los permisos.");
        }
        const user = platformUsers.find(u => u.id === userIdToAssign);
        if (!user) {
            throw new Error("Usuario no encontrado.");
        }

        const customRoleName = `Personalizado para ${user.name}`;
        const existingRoleDef = roles.find(r => r.name === user.role);

        if (existingRoleDef) {
            // A role for this user already exists. Update it.
            const updatedRole = {
                ...existingRoleDef,
                permissions: role.permissions,
            };
            await apiService.updateRole(userProfile.conjuntoId, updatedRole);
        } else {
            // No custom role exists for this user. Create it and assign it.
            const newRolePayload: Omit<UserRoleDefinition, 'id'> = {
                name: customRoleName,
                permissions: role.permissions,
            };
            await apiService.addRole(userProfile.conjuntoId, newRolePayload);
        }
        
        // Ensure the user is assigned this custom role.
        if (user.role !== customRoleName) {
            const userToUpdate = { ...user, role: customRoleName };
            await apiService.updateUser(userProfile.conjuntoId, userToUpdate);
        }
        
        await fetchData();
        setIsRoleModalOpen(false);
        setEditingUserPermissions(null);

    } catch (error: any) {
        console.error("Error saving role:", error);
        setModalError(error.message || "Ocurrió un error inesperado.");
        // Do not close modal on error
        throw error;
    }
  };

  // Delete Handlers
  const handleDeleteUser = async (userId: number) => {
      if(window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
          if (!userProfile.conjuntoId) return;
          await apiService.deleteUser(userProfile.conjuntoId, userId);
          fetchData();
      }
  };
  
  const handleDeleteResident = async (apartment: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar al residente del apartamento ${apartment}?`) && userProfile.conjuntoId) {
        await apiService.deleteResident(userProfile.conjuntoId, apartment);
        fetchData();
    }
  };
  
  const handleDeleteProvider = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este proveedor?') && userProfile.conjuntoId) {
        await apiService.deleteProvider(userProfile.conjuntoId, id);
        fetchData();
    }
  };

  const handleDeleteStaff = async (name: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar a este miembro del personal?') && userProfile.conjuntoId) {
        await apiService.deleteInternalStaff(userProfile.conjuntoId, name);
        fetchData();
    }
  };
  
  const handleDeleteAccountStatus = async (apartment: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el estado de cuenta del apartamento ${apartment}?`) && userProfile.conjuntoId) {
        await apiService.deleteAccountStatus(userProfile.conjuntoId, apartment);
        fetchData();
    }
  };
  
  const handleDeleteRole = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este rol?') && userProfile.conjuntoId) {
        await apiService.deleteRole(userProfile.conjuntoId, id);
        fetchData();
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setFeedbackMessage(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const json = XLSX.utils.sheet_to_json(worksheet, { cellDates: true, raw: false }); // raw:false helps with dates

              if (json.length === 0) {
                  throw new Error("El archivo está vacío o tiene un formato incorrecto.");
              }
              
              if (!userProfile.conjuntoId) throw new Error("ID de conjunto no encontrado.");
              
              const keyMaps = {
                  [DbTab.Residents]: {
                      'apartamento': 'apartment', 'apto': 'apartment',
                      'nombre': 'name',
                      'correo': 'email', 'e-mail': 'email',
                      'telefono': 'phone', 'celular': 'phone',
                  },
                  [DbTab.AccountStatus]: {
                      'apartamento': 'apartment', 'apto': 'apartment',
                      'fecha ultimo pago': 'lastPaymentDate', 'fechaultimopago': 'lastPaymentDate',
                      'valor cuota': 'adminFeeValue', 'valorcuota': 'adminFeeValue',
                      'cuotas pendientes': 'pendingInstallments', 'cuotaspendientes': 'pendingInstallments',
                      'otros cargos': 'otherCharges', 'otroscargos': 'otherCharges',
                      'saldo pendiente': 'outstandingBalance', 'saldopendiente': 'outstandingBalance',
                  },
                  [DbTab.Providers]: {
                      'empresa': 'company', 'nombre o empresa': 'company',
                      'especialidad': 'specialty',
                      'correo': 'email', 'e-mail': 'email',
                      'telefono': 'phone', 'celular': 'phone',
                  },
                  [DbTab.Internal]: {
                       'nombre': 'name',
                       'cargo': 'position', 'puesto': 'position',
                       'correo': 'email', 'e-mail': 'email',
                       'telefono': 'phone', 'celular': 'phone',
                  }
              };

              const normalizeKeys = (row: any, map: { [key: string]: string }) => {
                  const normalizedRow: { [key: string]: any } = {};
                  for (const key in row) {
                      const lowerKey = key.toLowerCase().replace(/ /g, '');
                      const mappedKey = map[lowerKey] || key; // Fallback to original key if no mapping found
                      normalizedRow[mappedKey] = row[key];
                  }
                  return normalizedRow;
              };

              const currentMap = keyMaps[activeDbTab as keyof typeof keyMaps];
              if (!currentMap) {
                   throw new Error(`La carga masiva para ${activeDbTab} no está implementada.`);
              }
              
              const normalizedData = json.map(row => normalizeKeys(row, currentMap));

              switch(activeDbTab) {
                  case DbTab.Residents:
                      if (!normalizedData[0] || !normalizedData[0].apartment) throw new Error("El archivo debe contener una columna 'Apartamento'.");
                      await apiService.bulkUpsertResidents(userProfile.conjuntoId, normalizedData as Resident[]);
                      break;
                  case DbTab.AccountStatus:
                      if (!normalizedData[0] || !normalizedData[0].apartment) throw new Error("El archivo debe contener una columna 'Apartamento'.");
                      const formattedAccounts = normalizedData.map((account: any) => ({
                          ...account,
                          lastPaymentDate: account.lastPaymentDate ? new Date(account.lastPaymentDate).toISOString().split('T')[0] : null,
                      }));
                      await apiService.bulkUpsertAccountStatus(userProfile.conjuntoId, formattedAccounts as AccountStatus[]);
                      break;
                  case DbTab.Providers:
                      if (!normalizedData[0] || !normalizedData[0].company) throw new Error("El archivo debe contener una columna 'Empresa' o 'Nombre o Empresa'.");
                      await apiService.bulkUpsertProviders(userProfile.conjuntoId, normalizedData as Provider[]);
                      break;
                  case DbTab.Internal:
                       if (!normalizedData[0] || !normalizedData[0].name) throw new Error("El archivo debe contener una columna 'Nombre'.");
                      await apiService.bulkUpsertInternalStaff(userProfile.conjuntoId, normalizedData as InternalStaff[]);
                      break;
              }
              
              await fetchData();
              setFeedbackMessage({type: 'success', text: `¡${json.length} registros de ${activeDbTab} cargados exitosamente!`});

          } catch (error: any) {
              console.error("Error processing file:", error);
              setFeedbackMessage({type: 'error', text: `Error al cargar: ${error.message}`});
          } finally {
              setIsUploading(false);
              if (fileInputRef.current) {
                  fileInputRef.current.value = '';
              }
              setTimeout(() => setFeedbackMessage(null), 7000);
          }
      };
      reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
      const templates = {
          [DbTab.Residents]: {
              headers: ['apartment', 'name', 'email', 'phone'],
              filename: 'plantilla_residentes.xlsx'
          },
          [DbTab.AccountStatus]: {
              headers: ['apartment', 'lastPaymentDate', 'adminFeeValue', 'pendingInstallments', 'otherCharges', 'outstandingBalance'],
              filename: 'plantilla_estado_de_cuentas.xlsx'
          },
          [DbTab.Providers]: {
              headers: ['company', 'specialty', 'email', 'phone'],
              filename: 'plantilla_proveedores.xlsx'
          },
          [DbTab.Internal]: {
              headers: ['name', 'position', 'email', 'phone'],
              filename: 'plantilla_personal_interno.xlsx'
          },
          [DbTab.Users]: null,
          [DbTab.Roles]: null
      };

      const templateConfig = templates[activeDbTab];
      if (!templateConfig) {
          alert(`La descarga de plantilla para ${activeDbTab} no está disponible.`);
          return;
      }
      
      const ws = XLSX.utils.aoa_to_sheet([templateConfig.headers]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, activeDbTab);
      XLSX.writeFile(wb, templateConfig.filename);
  };
  
    const renderTableActions = () => {
        const canManageData = [DbTab.Residents, DbTab.AccountStatus, DbTab.Providers, DbTab.Internal].includes(activeDbTab);
        const isUserManagement = userProfile.role === UserRole.Trial || userProfile.role === UserRole.Subscriber;

        return (
            <div className="flex justify-between items-center p-4 border-b">
                <div className="flex items-center gap-4">
                    {canManageData && (
                        <>
                            <button onClick={handleDownloadTemplate} className="text-sm font-medium text-blue-600 hover:underline">Descargar Plantilla</button>
                            <button onClick={handleUploadClick} disabled={isUploading} className="text-sm font-medium text-blue-600 hover:underline disabled:text-gray-400">
                                {isUploading ? 'Cargando...' : 'Cargar Información'}
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" />
                        </>
                    )}
                    {feedbackMessage && (
                        <p className={`text-sm ${feedbackMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {feedbackMessage.text}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {activeDbTab === DbTab.Users && isUserManagement && (
                        <button 
                            onClick={() => handleUserModalOpen(null)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors text-xs flex items-center gap-1">
                          <Icon name="user-plus" className="w-4 h-4" />
                          Agregar Usuario
                        </button>
                    )}
                    {canManageData && (
                        <button 
                            onClick={() => {
                                switch(activeDbTab) {
                                    case DbTab.Residents: handleResidentModalOpen(null); break;
                                    case DbTab.AccountStatus: handleAccountStatusModalOpen(null); break;
                                    case DbTab.Providers: handleProviderModalOpen(null); break;
                                    case DbTab.Internal: handleStaffModalOpen(null); break;
                                }
                            }}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors text-xs flex items-center gap-1">
                          <Icon name="user-plus" className="w-4 h-4" />
                          Agregar Registro
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const getPermissionsForRole = (roleName: string, allCustomRoles: UserRoleDefinition[]): string[] => {
        switch (roleName) {
            case UserRole.Admin:
            case UserRole.Subscriber:
            case UserRole.Trial:
                return ['Todos'];
            case 'Guard':
                return [Tab.Seguridad];
            case 'Contador':
                return [Tab.Finanzas];
            default:
                const customRole = allCustomRoles.find(r => r.name === roleName);
                return customRole ? customRole.permissions : [];
        }
    };


  const renderContent = () => {
      if (isLoading) {
          return <div className="text-center p-10 text-gray-500">Cargando datos...</div>;
      }

      switch (activeDbTab) {
          case DbTab.Roles:
             return (
                 <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Nombre de Usuario</th>
                            <th scope="col" className="px-6 py-3">Permisos Asignados</th>
                            <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {platformUsers.map((user) => {
                            const userPermissions = getPermissionsForRole(user.role as string, roles);
                            const permissionsText = userPermissions.join(', ') || 'Sin permisos definidos';

                            return (
                                <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{user.name} ({user.role})</td>
                                    <td className="px-6 py-4">{permissionsText}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                       <button onClick={() => handleOpenPermissionEditor(user)} className="font-medium text-blue-600 hover:underline">Editar Permisos</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                 </table>
             );
          case DbTab.Users:
             return (
                  <table className="w-full text-sm text-left text-gray-500">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                              <th scope="col" className="px-6 py-3">Nombre</th>
                              <th scope="col" className="px-6 py-3">Correo</th>
                              <th scope="col" className="px-6 py-3">Teléfono</th>
                              <th scope="col" className="px-6 py-3">Rol</th>
                              <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody>
                          {platformUsers.map((user) => (
                              <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                  <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                                  <td className="px-6 py-4">{user.email}</td>
                                  <td className="px-6 py-4">{user.phoneNumber || 'N/A'}</td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role.startsWith('Personalizado') ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                      {user.role}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right space-x-2">
                                     <button onClick={() => handleUserModalOpen(user)} className="font-medium text-blue-600 hover:underline">Editar</button>
                                     <button onClick={() => handleDeleteUser(user.id)} className="font-medium text-red-600 hover:underline">Eliminar</button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              );
          case DbTab.Residents:
              return (
                  <table className="w-full text-sm text-left text-gray-500">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                              <th scope="col" className="px-6 py-3">Apartamento</th>
                              <th scope="col" className="px-6 py-3">Nombre</th>
                              <th scope="col" className="px-6 py-3">Correo</th>
                              <th scope="col" className="px-6 py-3">Teléfono</th>
                              <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody>
                          {residents.map((resident) => (
                              <tr key={resident.apartment} className="bg-white border-b hover:bg-gray-50">
                                  <td className="px-6 py-4 font-medium text-gray-900">{resident.apartment}</td>
                                  <td className="px-6 py-4">{resident.name}</td>
                                  <td className="px-6 py-4">{resident.email}</td>
                                  <td className="px-6 py-4">{resident.phone}</td>
                                  <td className="px-6 py-4 text-right space-x-2">
                                     <button onClick={() => handleResidentModalOpen(resident)} className="font-medium text-blue-600 hover:underline">Editar</button>
                                     <button onClick={() => handleDeleteResident(resident.apartment)} className="font-medium text-red-600 hover:underline">Eliminar</button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              );
          case DbTab.AccountStatus:
              return (
                  <table className="w-full text-sm text-left text-gray-500">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                              <th scope="col" className="px-6 py-3">Apartamento</th>
                              <th scope="col" className="px-6 py-3">Fecha último pago</th>
                              <th scope="col" className="px-6 py-3">Valor Cuota</th>
                              <th scope="col" className="px-6 py-3">Cuotas Pendientes</th>
                              <th scope="col" className="px-6 py-3">Otros Cargos</th>
                              <th scope="col" className="px-6 py-3">Saldo pendiente</th>
                              <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody>
                          {accountStatus.map((account) => (
                              <tr key={account.apartment} className="bg-white border-b hover:bg-gray-50">
                                  <td className="px-6 py-4 font-medium text-gray-900">{account.apartment}</td>
                                  <td className="px-6 py-4">{account.lastPaymentDate}</td>
                                  <td className="px-6 py-4">${account.adminFeeValue.toLocaleString()}</td>
                                  <td className="px-6 py-4">{account.pendingInstallments}</td>
                                  <td className="px-6 py-4">${account.otherCharges.toLocaleString()}</td>
                                  <td className="px-6 py-4 font-semibold">${account.outstandingBalance.toLocaleString()}</td>
                                  <td className="px-6 py-4 text-right space-x-2">
                                      <button onClick={() => handleAccountStatusModalOpen(account)} className="font-medium text-blue-600 hover:underline">Editar</button>
                                      <button onClick={() => handleDeleteAccountStatus(account.apartment)} className="font-medium text-red-600 hover:underline">Eliminar</button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              );
            case DbTab.Providers:
              return (
                   <table className="w-full text-sm text-left text-gray-500">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                              <th scope="col" className="px-6 py-3">Nombre o Empresa</th>
                              <th scope="col" className="px-6 py-3">Especialidad</th>
                              <th scope="col" className="px-6 py-3">Correo</th>
                              <th scope="col" className="px-6 py-3">Teléfono</th>
                              <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody>
                          {providers.map((provider) => (
                              <tr key={provider.id} className="bg-white border-b hover:bg-gray-50">
                                  <td className="px-6 py-4 font-medium text-gray-900">{provider.company}</td>
                                  <td className="px-6 py-4">{provider.specialty}</td>
                                  <td className="px-6 py-4">{provider.email}</td>
                                  <td className="px-6 py-4">{provider.phone}</td>
                                  <td className="px-6 py-4 text-right space-x-2">
                                      <button onClick={() => handleProviderModalOpen(provider)} className="font-medium text-blue-600 hover:underline">Editar</button>
                                      <button onClick={() => handleDeleteProvider(provider.id)} className="font-medium text-red-600 hover:underline">Eliminar</button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              );
            case DbTab.Internal:
              return (
                   <table className="w-full text-sm text-left text-gray-500">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                              <th scope="col" className="px-6 py-3">Nombre</th>
                              <th scope="col" className="px-6 py-3">Cargo</th>
                              <th scope="col" className="px-6 py-3">Correo</th>
                              <th scope="col" className="px-6 py-3">Teléfono</th>
                              <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody>
                          {internalStaff.map((staff) => (
                              <tr key={staff.name} className="bg-white border-b hover:bg-gray-50">
                                  <td className="px-6 py-4 font-medium text-gray-900">{staff.name}</td>
                                  <td className="px-6 py-4">{staff.position}</td>
                                  <td className="px-6 py-4">{staff.email}</td>
                                  <td className="px-6 py-4">{staff.phone}</td>
                                  <td className="px-6 py-4 text-right space-x-2">
                                     <button onClick={() => handleStaffModalOpen(staff)} className="font-medium text-blue-600 hover:underline">Editar</button>
                                     <button onClick={() => handleDeleteStaff(staff.name)} className="font-medium text-red-600 hover:underline">Eliminar</button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              );
      }
  };

  const isFullAdmin = userProfile.role === UserRole.Trial || userProfile.role === UserRole.Subscriber;
  const dbTabs = Object.values(DbTab).filter(tab => isFullAdmin || ![DbTab.Users, DbTab.Roles].includes(tab));

  return (
    <div className="space-y-6">
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {dbTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveDbTab(tab)}
              className={`${
                activeDbTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {renderTableActions()}
        <div className="overflow-x-auto">
            {renderContent()}
        </div>
      </div>
      
      {isResidentModalOpen && (
        <ResidentModal
          isOpen={isResidentModalOpen}
          residentToEdit={selectedResident}
          onClose={() => setIsResidentModalOpen(false)}
          onSave={handleSaveResident}
        />
      )}
      {isProviderModalOpen && (
        <ProviderModal
          isOpen={isProviderModalOpen}
          providerToEdit={selectedProvider}
          onClose={() => setIsProviderModalOpen(false)}
          onSave={handleSaveProvider}
        />
      )}
      {isStaffModalOpen && (
        <InternalStaffModal
          isOpen={isStaffModalOpen}
          staffToEdit={selectedStaff}
          onClose={() => setIsStaffModalOpen(false)}
          onSave={handleSaveStaff}
        />
      )}
      {isAccountStatusModalOpen && (
        <AccountStatusModal
          isOpen={isAccountStatusModalOpen}
          accountToEdit={selectedAccountStatus}
          onClose={() => setIsAccountStatusModalOpen(false)}
          onSave={handleSaveAccountStatus}
        />
      )}
      {isRoleModalOpen && editingUserPermissions && (
        <RoleModal
          isOpen={isRoleModalOpen}
          onClose={() => { setIsRoleModalOpen(false); setEditingUserPermissions(null); }}
          onSave={handleSaveRole}
          userToEdit={editingUserPermissions}
          allRoles={roles}
          error={modalError}
        />
      )}
      {isUserModalOpen && (
          <UserModal
            isOpen={isUserModalOpen}
            onClose={() => setIsUserModalOpen(false)}
            onSave={handleSaveUser}
            userToEdit={selectedUser}
            availableRoles={roles}
            error={modalError}
          />
      )}
    </div>
  );
};

export default DatabaseView;