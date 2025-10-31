import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dataStore } from '../../data/dataStore';
import { ChartData } from '../../types';
import { 
    monthlyCollectionData, 
    pendingPaymentsData,
    weeklyChatbotSummaryData,
    waterBillHistoryData,
    electricityBillHistoryData,
    gasBillHistoryData,
    phoneBillHistoryData,
    maintenanceHistoryData,
    securityBillHistoryData
} from '../../data/mockData';

interface DashboardViewProps {
    conjuntoName: string;
}

const ChartCard: React.FC<{title: string; data: ChartData[], type: 'pie' | 'bar'}> = ({ title, data, type }) => (
  <div className="bg-white p-4 rounded-lg shadow-md h-80 flex flex-col">
    <h3 className="text-md font-semibold text-gray-700 mb-4">{title}</h3>
    <div className="flex-1">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
            <Tooltip formatter={(value) => `$${(value as number).toLocaleString()}`} />
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

const DashboardView: React.FC<DashboardViewProps> = ({ conjuntoName }) => {
    const [charts, setCharts] = useState<Array<{ title: string; data: ChartData[], type: 'pie' | 'bar' }>>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const getChartsPerPage = () => {
        if (window.innerWidth >= 1280) return 4; // For xl screens and larger
        return 2; // For md and lg screens
    };

    const [chartsPerPage, setChartsPerPage] = useState(getChartsPerPage());

    useEffect(() => {
        const handleResize = () => {
            const newChartsPerPage = getChartsPerPage();
            if (chartsPerPage !== newChartsPerPage) {
                setCurrentIndex(0); // Reset index when layout changes
                setChartsPerPage(newChartsPerPage);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [chartsPerPage]);


    useEffect(() => {
        const updateCharts = () => {
            const residents = dataStore.getResidents();

            const allCharts = [
                // Page 1
                {
                    title: 'Estado de Cartera',
                    data: [
                        { name: 'Al día', value: residents.filter(r => r.status === 'Al día').length, fill: '#34d399' },
                        { name: 'En mora', value: residents.filter(r => r.status === 'En mora').length, fill: '#f87171' },
                    ],
                    type: 'pie' as const
                },
                {
                    title: 'Cuotas Vencidas por Apartamento',
                    data: [
                        { name: '1 cuota', value: residents.filter(r => r.overdue_installments === 1).length, fill: '#fde047' },
                        { name: '2 cuotas', value: residents.filter(r => r.overdue_installments === 2).length, fill: '#f59e0b' },
                        { name: '3+ cuotas', value: residents.filter(r => r.overdue_installments >= 3).length, fill: '#ef4444' },
                    ],
                    type: 'pie' as const
                },
                { title: 'Recaudo del Mes (Últimos 6 meses)', data: monthlyCollectionData, type: 'bar' as const },
                { title: 'Pagos Pendientes de la Administración', data: pendingPaymentsData, type: 'bar' as const },
                
                // Page 2
                { title: 'Resumen Semanal de Chatbot', data: weeklyChatbotSummaryData, type: 'pie' as const },
                { title: 'Histórico Pago Agua', data: waterBillHistoryData, type: 'bar' as const },
                { title: 'Histórico Pago Luz', data: electricityBillHistoryData, type: 'bar' as const },
                { title: 'Histórico Pago Gas', data: gasBillHistoryData, type: 'bar' as const },
                
                // Page 3
                { title: 'Histórico Pago Teléfono/Internet', data: phoneBillHistoryData, type: 'bar' as const },
                { title: 'Histórico Pago Mantenimiento', data: maintenanceHistoryData, type: 'bar' as const },
                { title: 'Histórico Pago Vigilancia', data: securityBillHistoryData, type: 'bar' as const },
            ];

            setCharts(allCharts);
        };

        updateCharts();
        const unsubscribe = dataStore.subscribe(updateCharts);
        return () => unsubscribe();
    }, []);
    
    if (charts.length === 0) {
        return <div className="text-center p-10 text-gray-500">Cargando gráficos...</div>;
    }

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
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{conjuntoName}</h2>
            <div className="flex items-center gap-2">
                <button onClick={goToPrevious} className="p-2 rounded-md bg-white shadow-sm hover:bg-gray-100 disabled:opacity-50" disabled={totalPages <= 1}>&lt;</button>
                <span className="text-sm text-gray-600">{totalPages > 1 ? `${currentIndex + 1} / ${totalPages}`: ''}</span>
                <button onClick={goToNext} className="p-2 rounded-md bg-white shadow-sm hover:bg-gray-100 disabled:opacity-50" disabled={totalPages <= 1}>&gt;</button>
            </div>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {selectedCharts.map(chart => (
            <ChartCard key={chart.title} title={chart.title} data={chart.data} type={chart.type as 'pie' | 'bar'} />
        ))}
      </div>
    </div>
  );
};

export default DashboardView;