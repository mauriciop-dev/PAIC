
import React from 'react';

const payments = [
    { id: 1, item: 'Servicio de Vigilancia', dueDate: '2024-06-30', status: 'Pendiente' },
    { id: 2, item: 'Servicio de Aseo', dueDate: '2024-06-30', status: 'Pendiente' },
    { id: 3, item: 'Mantenimiento Ascensores', dueDate: '2024-07-05', status: 'Pendiente' },
    { id: 4, item: 'Seguro de Áreas Comunes', dueDate: '2024-05-31', status: 'Vencido' },
    { id: 5, item: 'Servicios Públicos (Agua, Luz)', dueDate: '2024-07-10', status: 'Pendiente' },
    { id: 6, item: 'Pago de Nómina', dueDate: '2024-06-28', status: 'Pagado' },
];

const DueDatesView: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Vencimientos de Pagos</h2>
       <p className="text-gray-600 mb-6">
        Aquí puedes ver los vencimientos de pagos pendientes de la administración. El asistente te alertará sobre los próximos vencimientos.
      </p>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {payments.map(payment => (
            <li key={payment.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
              <div>
                <p className="font-semibold text-gray-800">{payment.item}</p>
                <p className="text-sm text-gray-500">Vence: {payment.dueDate}</p>
              </div>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  payment.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                  payment.status === 'Vencido' ? 'bg-red-100 text-red-800' :
                  'bg-green-100 text-green-800'
              }`}>
                {payment.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DueDatesView;
