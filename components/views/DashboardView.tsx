import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dataStore } from '../../data/dataStore';
import { ChartData } from '../../types';
import { monthlyCollectionData, pendingPaymentsData } from '../../data/mockData';

const ChartCard: React.FC<{title: string; data: ChartData[], type: 'pie' | 'bar'}> = ({ title, data, type }) => (
  <div className="bg-white p-4 rounded-lg shadow-md h-80 flex flex-col">
    <h3 className="text-md font-semibold text-gray-700 mb-4">{title}</h3>
    <div className="flex-1">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend wrapperStyle={{fontSize: "12px"}}/>
            <Bar dataKey="value" name="Valor" fill="#3b82f6" />
          </BarChart>
        ) : (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{fontSize: "12px"}}/>
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  </div>
);

const DashboardView: React.FC = () => {
    const [charts, setCharts] = useState<Array<{ title: string; data: ChartData[], type: 'pie' | 'bar' }>>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const updateCharts = () => {
            const residents = dataStore.getResidents();

            // 1. Estado de Cartera
            const alDiaCount = residents.filter(r => r.status === 'Al día').length;
            const enMoraCount = residents.length - alDiaCount;
            const accountStatusChart = {
                title: 'Estado de Cartera',
                data: [
                    { name: 'Al día', value: alDiaCount, fill: '#34d399' },
                    { name: 'En mora', value: enMoraCount, fill: '#f87171' },
                ],
                type: 'pie' as const
            };

            // 2. Cuotas Vencidas
            const oneInstallment = residents.filter(r => r.overdue_installments === 1).length;
            const twoInstallments = residents.filter(r => r.overdue_installments === 2).length;
            const threePlusInstallments = residents.filter(r => r.overdue_installments >= 3).length;
            const overdueInstallmentsChart = {
                title: 'Cuotas Vencidas por Apartamento',
                data: [
                    { name: '1 cuota', value: oneInstallment, fill: '#fde047' },
                    { name: '2 cuotas', value: twoInstallments, fill: '#f59e0b' },
                    { name: '3+ cuotas', value: threePlusInstallments, fill: '#ef4444' },
                ],
                type: 'pie' as const
            };
            
            // Keep static charts for now
            const monthlyCollectionChart = { title: 'Recaudo del Mes (Últimos 6 meses)', data: monthlyCollectionData, type: 'bar' as const };
            const pendingPaymentsChart = { title: 'Pagos Pendientes de la Administración', data: pendingPaymentsData, type: 'bar' as const };

            setCharts([
                accountStatusChart,
                overdueInstallmentsChart,
                monthlyCollectionChart,
                pendingPaymentsChart
            ]);
        };

        updateCharts(); // Initial calculation
        const unsubscribe = dataStore.subscribe(updateCharts);
        return () => unsubscribe();
    }, []);
    
    // Graceful loading state to prevent errors
    if (charts.length === 0) {
        return <div className="text-center p-10 text-gray-500">Cargando gráficos...</div>;
    }

    const chartsPerPage = 2;
    const totalPages = Math.ceil(charts.length / chartsPerPage);

    const goToPrevious = () => {
        setCurrentIndex(prev => (prev === 0 ? totalPages - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex(prev => (prev === totalPages - 1 ? 0 : prev + 1));
    };
    
    const startIndex = currentIndex * chartsPerPage;
    const selectedCharts = charts.slice(startIndex, startIndex + chartsPerPage);

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Dashboard Principal</h2>
            <div className="flex items-center gap-2">
                <button onClick={goToPrevious} className="p-2 rounded-md bg-white shadow-sm hover:bg-gray-100">&lt;</button>
                <span className="text-sm text-gray-600">{currentIndex + 1} / {totalPages}</span>
                <button onClick={goToNext} className="p-2 rounded-md bg-white shadow-sm hover:bg-gray-100">&gt;</button>
            </div>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {selectedCharts.map(chart => (
            <ChartCard key={chart.title} title={chart.title} data={chart.data} type={chart.type as 'pie' | 'bar'} />
        ))}
      </div>
    </div>
  );
};

export default DashboardView;