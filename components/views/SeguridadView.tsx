import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { VisitorLog, PackageLog, Resident, UserProfile, AccessPoint, UserRole } from '../../types';

type SeguridadTab = 'Visitantes' | 'Paquetes';

interface SeguridadViewProps {
    userProfile: UserProfile;
    selectedAccessPointId: number | null;
}

// Helper to format time consistently as HH:mm
const formatTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

const SeguridadView: React.FC<SeguridadViewProps> = ({ userProfile, selectedAccessPointId }) => {
    const [activeTab, setActiveTab] = useState<SeguridadTab>('Visitantes');
    const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([]);
    const [packageLogs, setPackageLogs] = useState<PackageLog[]>([]);
    const [residents, setResidents] = useState<Resident[]>([]);
    const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingLogId, setUpdatingLogId] = useState<number | null>(null);

    // Package Form State
    const [pkgApartment, setPkgApartment] = useState('');
    const [pkgCourier, setPkgCourier] = useState('');
    const [pkgTracking, setPkgTracking] = useState('');
    const [isSubmittingPackage, setIsSubmittingPackage] = useState(false);
    const [packageFeedback, setPackageFeedback] = useState<string | null>(null);

    // Visitor Form State
    const [visitorName, setVisitorName] = useState('');
    const [visitorApartment, setVisitorApartment] = useState('');
    const [visitorDate, setVisitorDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmittingVisitor, setIsSubmittingVisitor] = useState(false);
    const [visitorFeedback, setVisitorFeedback] = useState<string | null>(null);
    
    // Shared feedback state for table actions
    const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);


    const fetchData = async () => {
        if (!userProfile.conjuntoId) return;
        setIsLoading(true);
        try {
            const [visitors, packages, res, points] = await Promise.all([
                apiService.fetchVisitorLogs(userProfile.conjuntoId),
                apiService.fetchPackageLogs(userProfile.conjuntoId),
                apiService.fetchResidents(userProfile.conjuntoId),
                apiService.fetchAccessPoints(userProfile.conjuntoId),
            ]);
            setVisitorLogs(visitors.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id));
            setPackageLogs(packages);
            setResidents(res);
            setAccessPoints(points);
            if (res.length > 0) {
                if (!pkgApartment) setPkgApartment(res[0].apartment);
                if (!visitorApartment) setVisitorApartment(res[0].apartment);
            }
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

    const handleRegisterPackage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pkgApartment || !pkgCourier || !userProfile.conjuntoId) return;

        setIsSubmittingPackage(true);
        setPackageFeedback(null);
        try {
            await apiService.addPackageLog(userProfile.conjuntoId, {
                apartment: pkgApartment,
                courier: pkgCourier,
                trackingNumber: pkgTracking || undefined,
            });
            
            setPkgCourier('');
            setPkgTracking('');
            
            setPackageFeedback('¡Paquete registrado exitosamente!');
            setTimeout(() => setPackageFeedback(null), 3000);
            
            fetchData();
        } catch (error) {
            console.error("Error registering package:", error);
            setPackageFeedback("Error al registrar el paquete.");
        } finally {
            setIsSubmittingPackage(false);
        }
    };

    const handleMarkDelivered = async (packageId: number) => {
        if (!userProfile.conjuntoId) return;
        await apiService.updatePackageLogStatus(userProfile.conjuntoId, packageId, 'Entregado');
        fetchData();
    };

    const handleAuthorizeVisitor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!visitorName || !visitorApartment || !userProfile.conjuntoId) return;

        setIsSubmittingVisitor(true);
        setVisitorFeedback(null);
        try {
            await apiService.addVisitorLog(userProfile.conjuntoId, {
                visitorName,
                apartment: visitorApartment,
                date: visitorDate,
                status: 'Autorizado',
            });
            
            setVisitorName('');
            setVisitorFeedback('¡Visitante autorizado exitosamente!');
            setTimeout(() => setVisitorFeedback(null), 3000);
            
            fetchData();
        } catch (error) {
            console.error("Error authorizing visitor:", error);
            setVisitorFeedback("Error al autorizar al visitante.");
        } finally {
            setIsSubmittingVisitor(false);
        }
    };

    const handleRegisterEntry = async (logId: number) => {
        if (!userProfile.conjuntoId || updatingLogId) return;
        setUpdatingLogId(logId);
        setActionFeedback(null);
        try {
            const now = formatTime(new Date());

            const updates: Partial<Omit<VisitorLog, 'id'>> = {
                status: 'Ingresó' as const,
                entryTime: now,
            };

            await apiService.updateVisitorLog(userProfile.conjuntoId, logId, updates);
            
            setVisitorLogs(prevLogs => 
                prevLogs.map(log => 
                    log.id === logId 
                        ? { ...log, ...updates } 
                        : log
                )
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
            console.error("Failed to register entry:", error);
            setActionFeedback({ type: 'error', text: `Error al registrar ingreso: ${message}` });
            setTimeout(() => setActionFeedback(null), 5000);
        } finally {
            setUpdatingLogId(null);
        }
    };

    const handleRegisterExit = async (logId: number) => {
        if (!userProfile.conjuntoId || updatingLogId) return;
        setUpdatingLogId(logId);
        setActionFeedback(null);
        try {
            const now = formatTime(new Date());
            
            const updates = {
                status: 'Salió' as const,
                exitTime: now,
            };

            await apiService.updateVisitorLog(userProfile.conjuntoId, logId, updates);
            
            // Local state update instead of refetch
            setVisitorLogs(prevLogs => 
                prevLogs.map(log => 
                    log.id === logId 
                        ? { ...log, ...updates } 
                        : log
                )
            );
        } catch (error) {
             const message = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
             console.error("Failed to register exit:", error);
             setActionFeedback({ type: 'error', text: `Error al registrar salida: ${message}` });
             setTimeout(() => setActionFeedback(null), 5000);
        } finally {
            setUpdatingLogId(null);
        }
    };

    const renderVisitorForm = () => (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Autorizar Ingreso de Visitante</h3>
            <form onSubmit={handleAuthorizeVisitor} className="space-y-4">
                 <div>
                    <label htmlFor="visitorName" className="block text-sm font-medium text-gray-700">Nombre del Visitante</label>
                    <input type="text" id="visitorName" value={visitorName} onChange={e => setVisitorName(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                </div>
                <div>
                    <label htmlFor="apartmentVisitor" className="block text-sm font-medium text-gray-700">Apartamento</label>
                    <select id="apartmentVisitor" value={visitorApartment} onChange={e => setVisitorApartment(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white">
                        {residents.map(r => <option key={r.apartment} value={r.apartment}>Apto {r.apartment} - {r.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="visitDate" className="block text-sm font-medium text-gray-700">Fecha de Visita</label>
                    <input type="date" id="visitDate" value={visitorDate} onChange={e => setVisitorDate(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                </div>
                <button type="submit" disabled={isSubmittingVisitor} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300">
                    {isSubmittingVisitor ? 'Autorizando...' : 'Autorizar Ingreso'}
                </button>
                {visitorFeedback && <p className="text-sm text-green-600 text-center">{visitorFeedback}</p>}
            </form>
        </div>
    );
    
    const renderPackageForm = () => (
         <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Registrar Paquete</h3>
            <form onSubmit={handleRegisterPackage} className="space-y-4">
                 <div>
                    <label htmlFor="apartmentPackage" className="block text-sm font-medium text-gray-700">Apartamento</label>
                    <select id="apartmentPackage" value={pkgApartment} onChange={e => setPkgApartment(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white">
                        {residents.map(r => <option key={r.apartment} value={r.apartment}>Apto {r.apartment} - {r.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="courier" className="block text-sm font-medium text-gray-700">Empresa de Transporte</label>
                    <input type="text" id="courier" value={pkgCourier} onChange={e => setPkgCourier(e.target.value)} placeholder="Ej: Servientrega" className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                </div>
                <div>
                    <label htmlFor="trackingNumber" className="block text-sm font-medium text-gray-700">Número de Guía (Opcional)</label>
                    <input type="text" id="trackingNumber" value={pkgTracking} onChange={e => setPkgTracking(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <button type="submit" disabled={isSubmittingPackage} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300">
                    {isSubmittingPackage ? 'Registrando...' : 'Registrar Recepción'}
                </button>
                {packageFeedback && <p className="text-sm text-green-600 text-center">{packageFeedback}</p>}
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
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
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
                                <td className="px-6 py-4 text-center">
                                     {log.status === 'Autorizado' && (
                                         <button 
                                            onClick={() => handleRegisterEntry(log.id)}
                                            disabled={updatingLogId === log.id}
                                            className="font-medium text-blue-600 hover:underline text-xs disabled:text-gray-400 disabled:cursor-wait">
                                            {updatingLogId === log.id ? 'Registrando...' : 'Registrar Ingreso'}
                                         </button>
                                     )}
                                     {log.status === 'Ingresó' && (
                                         <button 
                                            onClick={() => handleRegisterExit(log.id)}
                                            disabled={updatingLogId === log.id}
                                            className="font-medium text-green-600 hover:underline text-xs disabled:text-gray-400 disabled:cursor-wait">
                                            {updatingLogId === log.id ? 'Registrando...' : 'Registrar Salida'}
                                         </button>
                                     )}
                                     {log.status === 'Salió' && (
                                         <span className="text-gray-500 text-xs font-medium">Visita Completada</span>
                                     )}
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
                                <td className="px-6 py-4">{new Date(log.receivedDate).toLocaleString('es-CO')}</td>
                                <td className="px-6 py-4 font-medium text-gray-900">{log.apartment}</td>
                                <td className="px-6 py-4">{log.courier}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusChipStyle(log.status)}`}>
                                        {log.status}
                                    </span>

                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                     <button 
                                        onClick={() => handleMarkDelivered(log.id)}
                                        disabled={log.status === 'Entregado'}
                                        className="font-medium text-green-600 hover:underline text-xs disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed">
                                        Marcar Entregado
                                     </button>
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

            {actionFeedback && (
                <div className={`p-3 mb-4 rounded-md text-sm ${actionFeedback.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {actionFeedback.text}
                </div>
            )}
            
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