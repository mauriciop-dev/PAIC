
import React from 'react';
import { Icon } from './ui/Icon';

interface InitialSetupModalProps {
  onClose: () => void;
}

const InitialSetupModal: React.FC<InitialSetupModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center">
      <div 
        className="bg-white rounded-lg shadow-2xl p-8 w-11/12 md:w-1/2 lg:w-1/3 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Bienvenido a PAIC!</h2>
        <p className="text-gray-600 mb-6">Comencemos registrando la información básica de tu conjunto residencial.</p>
        
        <form onSubmit={(e) => { e.preventDefault(); onClose(); }}>
            <div className="space-y-4">
                <input type="text" placeholder="Nombre del conjunto" className="w-full p-2 border border-gray-300 rounded-md" required />
                <input type="text" placeholder="NIT" className="w-full p-2 border border-gray-300 rounded-md" required />
                <input type="text" placeholder="Dirección del conjunto" className="w-full p-2 border border-gray-300 rounded-md" required />
                <input type="text" placeholder="Nombre del administrador" className="w-full p-2 border border-gray-300 rounded-md" required />
                <input type="email" placeholder="Correo del administrador" className="w-full p-2 border border-gray-300 rounded-md" required />
                <input type="tel" placeholder="Teléfono del administrador" className="w-full p-2 border border-gray-300 rounded-md" required />
            </div>
            <div className="mt-8 flex justify-end gap-4">
                <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                    Omitir
                </button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    Guardar y Continuar
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default InitialSetupModal;
