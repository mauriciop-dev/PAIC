import React, { useState, useEffect } from 'react';
import { SuperAdminProfile, ConjuntoInfo } from '../../types';
import { apiService } from '../../services/apiService';
import { Icon } from '../ui/Icon';

interface SuperAdminDashboardProps {
    profile: SuperAdminProfile;
    onLogout: () => void;
}

const StatCard: React.FC<{ title: string; value: string; icon: string; iconColor: string; }> = ({ title, value, icon, iconColor }) => (
    <div className="bg-white p-5 rounded-lg shadow-md flex items-center gap-4">
        <div className={`p-3 rounded-full ${iconColor}`}>
            <Icon name={icon} className="w-6 h-6 text-white" />
        </div>
        <div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <h3 className="text-sm font-semibold text-gray-500">{title}</h3>
        </div>
    </div>
);


const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ profile, onLogout }) => {
    const [conjuntos, setConjuntos] = useState<ConjuntoInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await apiService.fetchAllConjuntos();
                setConjuntos(data);
            } catch (error) {
                console.error("Failed to fetch conjuntos", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const paidSubscriptions = conjuntos.filter(c => c.subscriptionPlan === 'Paid').length;
    
    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <Icon name="bot" className="w-8 h-8 text-purple-600" />
                    <h1 className="text-xl font-bold text-gray-800">Panel de Plataforma PAIC</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="font-semibold text-sm">{profile.name}</span>
                    <button
                        onClick={onLogout}
                        className="px-3 py-1.5 text-sm text-red-600 bg-red-100 rounded-md font-semibold hover:bg-red-200"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            <main className="p-6 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Conjuntos Registrados" value={String(conjuntos.length)} icon="briefcase" iconColor="bg-blue-500" />
                    <StatCard title="Suscripciones Activas" value={String(paidSubscriptions)} icon="shield-check" iconColor="bg-green-500" />
                    <StatCard title="Ingresos del Mes (MRR)" value="$0" icon="dollarSign" iconColor="bg-yellow-500" />
                    <StatCard title="Nuevos Suscriptores (Mes)" value="0" icon="trending-up" iconColor="bg-indigo-500" />
                </div>
                
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-4 border-b">
                        <h2 className="text-lg font-semibold text-gray-700">Gestión de Conjuntos Residenciales</h2>
                    </div>
                    {isLoading ? (
                        <div className="text-center p-10 text-gray-500">Cargando clientes...</div>
                    ) : (
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Nombre del Conjunto</th>
                                        <th scope="col" className="px-6 py-3">Administrador</th>
                                        <th scope="col" className="px-6 py-3">Plan de Suscripción</th>
                                        <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {conjuntos.map(conjunto => (
                                        <tr key={conjunto.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{conjunto.name}</td>
                                            <td className="px-6 py-4">{conjunto.adminEmail}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    conjunto.subscriptionPlan === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {conjunto.subscriptionPlan === 'Paid' ? 'Pagado' : 'Gratuito'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button className="font-medium text-blue-600 hover:underline">Ver Panel</button>
                                                <button className="font-medium text-gray-600 hover:underline">Gestionar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
