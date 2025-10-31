import React, { useState, useEffect } from 'react';
import { dataStore } from '../../data/dataStore';
import { Resident, AccountStatus } from '../../types';
import EditResidentModal from '../EditResidentModal';

enum DbTab {
  Residents = 'Residentes',
  AccountStatus = 'Estado de Cuentas',
  Providers = 'Proveedores',
  Internal = 'Internos',
}

const DatabaseView: React.FC = () => {
  const [residents, setResidents] = useState<Resident[]>(dataStore.getResidents());
  const [accountStatus, setAccountStatus] = useState<AccountStatus[]>(dataStore.getAccountStatus());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [activeDbTab, setActiveDbTab] = useState<DbTab>(DbTab.Residents);
  
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    const handleStoreChange = () => {
        setResidents(dataStore.getResidents());
        setAccountStatus(dataStore.getAccountStatus());
    };
    const unsubscribe = dataStore.subscribe(handleStoreChange);
    return () => unsubscribe();
  }, []);

  const handleEditClick = (resident: Resident) => {
    setSelectedResident(resident);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setSelectedResident(null);
  };

  const handleSaveChanges = (updatedResident: Resident) => {
    dataStore.updateResident(updatedResident);
    handleCloseModal();
  };

  const handleSimulateUpload = () => {
    setIsLoading(true);
    setFeedbackMessage(null);

    // Simulate file processing
    setTimeout(() => {
      if (activeDbTab === DbTab.Residents) {
        dataStore.loadNewResidentData();
      } else if (activeDbTab === DbTab.AccountStatus) {
        dataStore.loadNewAccountStatusData();
      }
      
      setIsLoading(false);
      setFeedbackMessage({type: 'success', text: `¡Datos de ${activeDbTab} actualizados exitosamente!`});
      // Clear message after some time
      setTimeout(() => setFeedbackMessage(null), 5000);
    }, 1500);
  };
  
  const renderContent = () => {
      switch (activeDbTab) {
          case DbTab.Residents:
              return (
                  <table className="w-full text-sm text-left text-gray-500">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                              <th scope="col" className="px-6 py-3">Apartamento</th>
                              <th scope="col" className="px-6 py-3">Nombre</th>
                              <th scope="col" className="px-6 py-3">Correo</th>
                              <th scope="col" className="px-6 py-3">Teléfono</th>
                              <th scope="col" className="px-6 py-3">Estado</th>
                              <th scope="col" className="px-6 py-3">Acciones</th>
                          </tr>
                      </thead>
                      <tbody>
                          {residents.map((resident: Resident) => (
                              <tr key={resident.apartment} className="bg-white border-b hover:bg-gray-50">
                                  <td className="px-6 py-4 font-medium text-gray-900">{resident.apartment}</td>
                                  <td className="px-6 py-4">{resident.name}</td>
                                  <td className="px-6 py-4">{resident.email}</td>
                                  <td className="px-6 py-4">{resident.phone}</td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${resident.status === 'Al día' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                          {resident.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">
                                      <button onClick={() => handleEditClick(resident)} className="font-medium text-blue-600 hover:underline">Editar</button>
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
                              <th scope="col" className="px-6 py-3">Cuotas pendientes</th>
                              <th scope="col" className="px-6 py-3">Saldo pendiente</th>
                          </tr>
                      </thead>
                      <tbody>
                          {accountStatus.map((account: AccountStatus) => (
                              <tr key={account.apartment} className="bg-white border-b hover:bg-gray-50">
                                  <td className="px-6 py-4 font-medium text-gray-900">{account.apartment}</td>
                                  <td className="px-6 py-4">{account.lastPaymentDate}</td>
                                  <td className="px-6 py-4">{account.pendingInstallments}</td>
                                  <td className="px-6 py-4">${account.outstandingBalance.toLocaleString()}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              );
          default:
              return (
                <div className="text-center py-10 text-gray-500">
                    <p>La funcionalidad para {activeDbTab} estará disponible próximamente.</p>
                </div>
              );
      }
  };

  const dbTabs = [DbTab.Residents, DbTab.AccountStatus, DbTab.Providers, DbTab.Internal];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Base de Datos</h2>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Simular Carga de Información</h3>
        <p className="text-sm text-gray-600 mb-4">
          Haz clic en el botón para simular una carga de datos y actualizar la tabla de <span className="font-semibold">{activeDbTab}</span> con nueva información de ejemplo.
        </p>
        <div className="flex items-center gap-4">
            <button 
                onClick={handleSimulateUpload} 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                disabled={isLoading || (activeDbTab !== DbTab.Residents && activeDbTab !== DbTab.AccountStatus)}
            >
                {isLoading ? 'Cargando...' : 'Simular Carga de Datos'}
            </button>
        </div>
        {feedbackMessage && (
          <p className={`text-sm mt-4 ${feedbackMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {feedbackMessage.text}
          </p>
        )}
      </div>

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
        <div className="overflow-x-auto">
            {renderContent()}
        </div>
      </div>
      
      {isEditModalOpen && (
        <EditResidentModal
          resident={selectedResident}
          onClose={handleCloseModal}
          onSave={handleSaveChanges}
        />
      )}
    </div>
  );
};

export default DatabaseView;