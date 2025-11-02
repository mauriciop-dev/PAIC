
import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../services/apiService';
import { Resident, AccountStatus, Provider, InternalStaff, UserProfile, UserRole, PlatformUser, UserRoleDefinition } from '../../types';
import EditResidentModal from '../EditResidentModal';
import UserModal from '../UserModal';
import { Icon } from '../ui/Icon';

declare var XLSX: any;

enum DbTab {
  Residents = 'Residentes',
  AccountStatus = 'Estado de Cuentas',
  Providers = 'Proveedores',
  Internal = 'Internos',
  Users = 'Usuarios',
  Roles = 'Roles'
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
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [activeDbTab, setActiveDbTab] = useState<DbTab>(DbTab.Residents);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!userProfile.conjuntoId) return;
    setIsLoading(true);
    try {
      const [res, acc, prov, staff, users, customRoles] = await Promise.all([
        apiService.fetchResidents(userProfile.conjuntoId),
        apiService.fetchAccountStatus(userProfile.conjuntoId),
        apiService.fetchProviders(userProfile.conjuntoId),
        apiService.fetchInternalStaff(userProfile.conjuntoId),
        userProfile.role === UserRole.Admin ? apiService.fetchUsers(userProfile.conjuntoId) : Promise.resolve([]),
        userProfile.role === UserRole.Admin ? apiService.fetchRoles(userProfile.conjuntoId) : Promise.resolve([]),
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

  const handleEditResidentClick = (resident: Resident) => {
    setSelectedResident(resident);
    setIsEditModalOpen(true);
  };
  
  const handleUserModalOpen = (user: PlatformUser | null) => {
      setSelectedUser(user);
      setIsUserModalOpen(true);
  };

  const handleSaveChanges = async (updatedResident: Resident) => {
    if (!userProfile.conjuntoId) return;
    await apiService.updateResident(userProfile.conjuntoId, updatedResident);
    fetchData(); // Refresh data
    setIsEditModalOpen(false);
  };

  const handleDeleteResident = async (apartment: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar al residente del apartamento ${apartment}?`) && userProfile.conjuntoId) {
        await apiService.deleteResident(userProfile.conjuntoId, apartment);
        fetchData();
    }
  };
  
  const handleSaveUser = async (user: PlatformUser) => {
      if (!userProfile.conjuntoId) return;
      if(user.id) {
          await apiService.updateUser(userProfile.conjuntoId, user);
      } else {
          await apiService.addUser(userProfile.conjuntoId, user);
      }
      fetchData();
      setIsUserModalOpen(false);
  };
  
  const handleDeleteUser = async (userId: number) => {
      if(window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
          if (!userProfile.conjuntoId) return;
          await apiService.deleteUser(userProfile.conjuntoId, userId);
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
              const json = XLSX.utils.sheet_to_json(worksheet);

              if (json.length === 0) {
                  throw new Error("El archivo está vacío o tiene un formato incorrecto.");
              }
              
              if (!userProfile.conjuntoId) throw new Error("ID de conjunto no encontrado.");
              
              switch(activeDbTab) {
                  case DbTab.Residents:
                      await apiService.bulkUpsertResidents(userProfile.conjuntoId, json as Resident[]);
                      break;
                  case DbTab.AccountStatus:
                      await apiService.bulkUpsertAccountStatus(userProfile.conjuntoId, json as AccountStatus[]);
                      break;
                  case DbTab.Providers:
                      await apiService.bulkUpsertProviders(userProfile.conjuntoId, json as Provider[]);
                      break;
                  case DbTab.Internal:
                      await apiService.bulkUpsertInternalStaff(userProfile.conjuntoId, json as InternalStaff[]);
                      break;
                  default:
                      throw new Error(`La carga masiva para ${activeDbTab} no está implementada.`);
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
  
  const renderContent = () => {
      if (isLoading) {
          return <div className="text-center p-10 text-gray-500">Cargando datos...</div>;
      }
      
      const renderGenericTableActions = () => (
          <div className="space-x-2">
              <button className="text-xs font-medium text-blue-600 hover:underline">Editar</button>
              <button className="text-xs font-medium text-red-600 hover:underline">Eliminar</button>
          </div>
      );

      switch (activeDbTab) {
          case DbTab.Roles:
             return (
                 <p className="p-6 text-center text-gray-600">
                    Funcionalidad para gestionar roles y permisos estará disponible próximamente.
                 </p>
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
                                  <td className="px-6 py-4">{user.phone || 'N/A'}</td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === UserRole.Admin ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
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
                                     <button onClick={() => handleEditResidentClick(resident)} className="font-medium text-blue-600 hover:underline">Editar</button>
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
                              <th scope="col" className="px-6 py-3">Cuotas pendientes</th>
                              <th scope="col" className="px-6 py-3">Otros Cobros</th>
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
                                  <td className="px-6 py-4 text-right">{renderGenericTableActions()}</td>
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
                                  <td className="px-6 py-4 text-right">{renderGenericTableActions()}</td>
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
                              <tr key={staff.id} className="bg-white border-b hover:bg-gray-50">
                                  <td className="px-6 py-4 font-medium text-gray-900">{staff.name}</td>
                                  <td className="px-6 py-4">{staff.position}</td>
                                  <td className="px-6 py-4">{staff.email}</td>
                                  <td className="px-6 py-4">{staff.phone}</td>
                                  <td className="px-6 py-4 text-right">{renderGenericTableActions()}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              );
      }
  };

  const dbTabs = Object.values(DbTab).filter(tab => userProfile.role === UserRole.Admin || ![DbTab.Users, DbTab.Roles].includes(tab));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Base de Datos</h2>
      
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
        <div className="flex justify-between items-center p-4 border-b">
           <div className="flex items-center gap-4">
                {[DbTab.Residents, DbTab.AccountStatus, DbTab.Providers, DbTab.Internal].includes(activeDbTab) && (
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
           <button 
                onClick={() => {
                    if (activeDbTab === DbTab.Users) handleUserModalOpen(null);
                    else if (activeDbTab === DbTab.Roles) alert('Agregar nuevo rol');
                    else alert('Agregar nuevo registro');
                }}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors text-xs flex items-center gap-1">
              <Icon name="user-plus" className="w-4 h-4" />
              {activeDbTab === DbTab.Users ? 'Agregar Usuario' : activeDbTab === DbTab.Roles ? 'Agregar Rol' : 'Agregar Registro'}
            </button>
        </div>
        <div className="overflow-x-auto">
            {renderContent()}
        </div>
      </div>
      
      {isEditModalOpen && (
        <EditResidentModal
          resident={selectedResident}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveChanges}
        />
      )}
      {isUserModalOpen && (
          <UserModal
            isOpen={isUserModalOpen}
            onClose={() => setIsUserModalOpen(false)}
            onSave={handleSaveUser}
            userToEdit={selectedUser}
            availableRoles={roles}
          />
      )}
    </div>
  );
};

export default DatabaseView;