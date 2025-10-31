
import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { VisitorLog, PackageLog, Resident, UserProfile } from '../../types';

type SeguridadTab = 'Visitantes' | 'Paquetes';

interface SeguridadViewProps {
    userProfile: UserProfile;
}

const SeguridadView: React.FC<SeguridadViewProps> = ({ userProfile }) => {
    const [activeTab, setActiveTab] = useState<SeguridadTab>('Visitantes');
    const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([]);
    const [packageLogs, setPackageLogs] = useState<PackageLog[]>([]);
    const [residents, setResidents] = useState<Resident[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        if (!userProfile.conjuntoId) return;
        setIsLoading(true);
        try {
            // FIX: Pass conjuntoId to apiService calls.
            const [visitors, packages, res] = await Promise.all([
                apiService.fetchVisitorLogs(userProfile.conjuntoId),
                apiService.fetchPackageLogs(userProfile.conjuntoId),
                apiService.fetchResidents(userProfile.conjuntoId),
            ]);
            setVisitorLogs(visitors);
            setPackageLogs(packages);
            setResidents(res);
        } catch (error) {
            console.error("Failed to fetch security data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userProfile.conjuntoId]);
    
    const getStatusChipStyle = (status: VisitorLog['status'] | PackageLog['status']) => {
        switch (status) {
            case 'Autorizado': return 'bg-blue-100 text-blue-800';
            case 'Ingresó': return 'bg-yellow-100 text-yellow-800';
            case 'Salió': return 'bg-gray-100 text-gray-800';
            case 'En recepción': return 'bg-orange-100 text-orange-800';
            case 'Entregado': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const renderVisitorForm = () => (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Autorizar Visitante</h3>
            <form className="space-y-4">
                 <div>
                    <label htmlFor="visitorName" className="block text-sm font-medium text-gray-700">Nombre del Visitante</label>
                    <input type="text" id="visitorName" className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                </div>
                <div>
                    <label htmlFor="apartmentVisitor" className="block text-sm font-medium text-gray-700">Apartamento</label>
                    <select id="apartmentVisitor" className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white">
                        {residents.map(r => <option key={r.apartment} value={r.apartment}>Apto {r.apartment} - {r.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="visitDate" className="block text-sm font-medium text-gray-700">Fecha de Visita</label>
                    <input type="date" id="visitDate" defaultValue={new Date().toISOString().split('T')[0]} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                </div>
                <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                    Pre-Autorizar
                </button>
            </form>
        </div>
    );
    
    const renderPackageForm = () => (
         <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Registrar Paquete</h3>
            <form className="space-y-4">
                 <div>
                    <label htmlFor="apartmentPackage" className="block text-sm font-medium text-gray-700">Apartamento</label>
                    <select id="apartmentPackage" className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white">
                        {residents.map(r => <option key={r.apartment} value={r.apartment}>Apto {r.apartment} - {r.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="courier" className="block text-sm font-medium text-gray-700">Empresa de Transporte</label>
                    <input type="text" id="courier" placeholder="Ej: Servientrega" className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                </div>
                <div>
                    <label htmlFor="trackingNumber" className="block text-sm font-medium text-gray-700">Número de Guía (Opcional)</label>
                    <input type="text" id="trackingNumber" className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                    Registrar Recepción
                </button>
            </form>
        </div>
    );
    
    const renderVisitorsTable = () => (
         <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Fecha</th>
                            <th scope="col" className="px-6 py-3">Visitante</th>
                            <th scope="col" className="px-6 py-3">Apartamento</th>
                            <th scope="col" className="px-6 py-3">Estado</th>
                            <th scope="col" className="px-6 py-3">Hora Ingreso</th>
                            <th scope="col" className="px-6 py-3">Hora Salida</th>
                            <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visitorLogs.map(log => (
                            <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4">{log.date}</td>
                                <td className="px-6 py-4 font-medium text-gray-900">{log.visitorName}</td>
                                <td className="px-6 py-4">{log.apartment}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusChipStyle(log.status)}`}>
                                        {log.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{log.entryTime || 'N/A'}</td>
                                <td className="px-6 py-4">{log.exitTime || 'N/A'}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button className="font-medium text-blue-600 hover:underline text-xs">Registrar Ingreso</button>
                                     <button className="font-medium text-gray-600 hover:underline text-xs">Registrar Salida</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
    
    const renderPackagesTable = () => (
         <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Fecha Recepción</th>
                            <th scope="col" className="px-6 py-3">Apartamento</th>
                            <th scope="col" className="px-6 py-3">Transportadora</th>
                            <th scope="col" className="px-6 py-3">Estado</th>
                            <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {packageLogs.map(log => (
                            <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4">{log.receivedDate}</td>
                                <td className="px-6 py-4 font-medium text-gray-900">{log.apartment}</td>
                                <td className="px-6 py-4">{log.courier}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusChipStyle(log.status)}`}>
                                        {log.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                     <button className="font-medium text-green-600 hover:underline text-xs">Marcar Entregado</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );


    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Seguridad y Recepción</h2>
            <div className="mb-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {(['Visitantes', 'Paquetes'] as SeguridadTab[]).map(tab => (
                        <button
                          key={tab}
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
            
            {isLoading ? <div className="text-center p-10">Cargando datos...</div> : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        {activeTab === 'Visitantes' ? renderVisitorForm() : renderPackageForm()}
                    </div>
                    <div className="lg:col-span-2">
                        {activeTab === 'Visitantes' ? renderVisitorsTable() : renderPackagesTable()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SeguridadView;
