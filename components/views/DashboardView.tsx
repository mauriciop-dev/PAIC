
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { accountStatusData, monthlyCollectionData, pendingPaymentsData, overdueInstallmentsData } from '../../data/mockData';
import { ChartData } from '../../types';

const charts = [
  { title: 'Estado de Cartera', data: accountStatusData, type: 'pie' },
  { title: 'Cuotas Vencidas por Apartamento', data: overdueInstallmentsData, type: 'pie' },
  { title: 'Recaudo del Mes (Últimos 6 meses)', data: monthlyCollectionData, type: 'bar' },
  { title: 'Pagos Pendientes de la Administración', data: pendingPaymentsData, type: 'bar' },
];

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
    const [currentIndex, setCurrentIndex] = useState(0);
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
