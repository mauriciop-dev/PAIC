import React, { useState, useEffect } from 'react';
import { AccountStatus } from '../types';
import { Icon } from './ui/Icon';

interface AccountStatusModalProps {
  isOpen: boolean;
  accountToEdit: AccountStatus | null;
  onClose: () => void;
  onSave: (account: AccountStatus) => void;
}

const AccountStatusModal: React.FC<AccountStatusModalProps> = ({ isOpen, accountToEdit, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<AccountStatus>>({});
  const isNew = !accountToEdit;

  useEffect(() => {
    if (accountToEdit) {
      setFormData(accountToEdit);
    } else {
      setFormData({
        apartment: '',
        lastPaymentDate: new Date().toISOString().split('T')[0],
        adminFeeValue: 0,
        pendingInstallments: 0,
        otherCharges: 0,
        outstandingBalance: 0,
      });
    }
  }, [accountToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...accountToEdit, ...formData } as AccountStatus);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl p-8 w-11/12 md:w-1/2 lg:w-1/3 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <Icon name="x" className="w-6 h-6"/>
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{isNew ? 'Agregar Estado de Cuenta' : 'Editar Estado de Cuenta'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
            <label htmlFor="apartment" className="block text-sm font-medium text-gray-700">Apartamento</label>
            <input type="text" id="apartment" name="apartment" value={formData.apartment || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100" required disabled={!isNew} />
            
            <label htmlFor="lastPaymentDate" className="block text-sm font-medium text-gray-700">Fecha Último Pago</label>
            <input type="date" id="lastPaymentDate" name="lastPaymentDate" value={formData.lastPaymentDate || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />

            <label htmlFor="adminFeeValue" className="block text-sm font-medium text-gray-700">Valor Cuota Admin.</label>
            <input type="number" id="adminFeeValue" name="adminFeeValue" value={formData.adminFeeValue || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
            
            <label htmlFor="pendingInstallments" className="block text-sm font-medium text-gray-700">Cuotas Pendientes</label>
            <input type="number" id="pendingInstallments" name="pendingInstallments" value={formData.pendingInstallments || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />

            <label htmlFor="otherCharges" className="block text-sm font-medium text-gray-700">Otros Cargos</label>
            <input type="number" id="otherCharges" name="otherCharges" value={formData.otherCharges || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />

            <label htmlFor="outstandingBalance" className="block text-sm font-medium text-gray-700">Saldo Pendiente</label>
            <input type="number" id="outstandingBalance" name="outstandingBalance" value={formData.outstandingBalance || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
            
          <div className="mt-8 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default AccountStatusModal;