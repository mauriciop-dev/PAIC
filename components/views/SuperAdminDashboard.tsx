import React, { useState, useEffect } from 'react';
import { SuperAdminProfile, ConjuntoInfo, PlatformStats, SuperAdminChartData, UserRole } from '../../types';
import { apiService } from '../../services/apiService';
import { Icon } from '../ui/Icon';
import FileManagerModal from '../FileManagerModal'; // Import the new modal
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';


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
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [chartData, setChartData] = useState<SuperAdminChartData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
    const [selectedConjunto, setSelectedConjunto] = useState<ConjuntoInfo | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [conjuntosData, statsData, charts] = await Promise.all([
                    apiService.fetchAllConjuntos(),
                    apiService.fetchPlatformStats(),
                    apiService.fetchSuperAdminChartData(),
                ]);
                setConjuntos(conjuntosData);
                setStats(statsData);
                setChartData(charts);
            } catch (error) {
                console.error("Failed to fetch platform data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleManageFiles = (conjunto: ConjuntoInfo) => {
        setSelectedConjunto(conjunto);
        setIsFilesModalOpen(true);
    };
    
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <StatCard title="Copropiedades Registradas" value={stats?.totalConjuntos.toString() ?? '...'} icon="briefcase" iconColor="bg-blue-500" />
                    <StatCard title="Total Residentes" value={stats?.totalResidents.toString() ?? '...'} icon="users" iconColor="bg-teal-500" />
                    <StatCard title="Suscripciones Activas" value={stats?.paidSubscriptions.toString() ?? '...'} icon="shield-check" iconColor="bg-green-500" />
                    <StatCard title="Ingresos (MRR)" value={stats ? stats.monthlyRecurringRevenue.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }) : '...'} icon="dollarSign" iconColor="bg-yellow-500" />
                    <StatCard title="Nuevos (Mes)" value={stats?.newThisMonth.toString() ?? '...'} icon="trending-up" iconColor="bg-indigo-500" />
                </div>

                {/* --- ANALYTICS CHARTS --- */}
                <div className="bg-white p-4 rounded-lg shadow-md h-80 flex flex-col">
                    <h3 className="text-md font-semibold text-gray-700 mb-4">Uso Mensual del Asistente IA</h3>
                    {isLoading || !chartData ? <div className="text-center pt-10">Cargando...</div> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.chatbotUsage} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} allowDecimals={false} />
                                <Tooltip />
                                <Legend wrapperStyle={{fontSize: "12px"}}/>
                                <Bar dataKey="value" name="Interacciones" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
                
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-4 border-b">
                        <h2 className="text-lg font-semibold text-gray-700">Gestión de Copropiedades Residenciales</h2>
                    </div>
                    {isLoading ? (
                        <div className="text-center p-10 text-gray-500">Cargando clientes...</div>
                    ) : (
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Nombre de la Copropiedad</th>
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
                                            <td className="px-6 py-4 text-right space-x-4">
                                                <button className="font-medium text-blue-600 hover:underline">Ver Panel</button>
                                                <button onClick={() => handleManageFiles(conjunto)} className="font-medium text-purple-600 hover:underline">Gestionar Archivos</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {isFilesModalOpen && selectedConjunto && (
                <FileManagerModal
                    isOpen={isFilesModalOpen}
                    onClose={() => setIsFilesModalOpen(false)}
                    conjunto={selectedConjunto}
                />
            )}
        </div>
    );
};

export default SuperAdminDashboard;