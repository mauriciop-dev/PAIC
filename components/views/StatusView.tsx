
import React from 'react';
import { accountStatusDetailsData } from '../../data/mockData';
import { AccountStatus } from '../../types';

const StatusView: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Estado de Cuentas</h2>
      <p className="text-gray-600 mb-6">
        Consulta el estado de cuenta detallado de cada apartamento.
      </p>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
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
                    {accountStatusDetailsData.map((account: AccountStatus) => (
                        <tr key={account.apartment} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{account.apartment}</td>
                            <td className="px-6 py-4">{account.lastPaymentDate}</td>
                            <td className="px-6 py-4">{account.pendingInstallments}</td>
                            <td className="px-6 py-4">${account.outstandingBalance.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default StatusView;
