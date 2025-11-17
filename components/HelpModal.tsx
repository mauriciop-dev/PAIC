
import React from 'react';
import { Icon } from './ui/Icon';

interface HelpModalProps {
  onClose: () => void;
  onStartTour: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose, onStartTour }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl p-8 w-11/12 md:w-1/2 lg:w-1/3 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <Icon name="x" className="w-6 h-6"/>
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Centro de Soporte</h2>
        <p className="text-gray-600 mb-6">Encuentra recursos útiles para sacar el máximo provecho de PAIC.</p>
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Videotutoriales</h3>
          <ul className="list-disc list-inside space-y-2 text-blue-600">
            <li><a href="https://www.youtube.com/watch?v=N-42ptIn9BU" target="_blank" rel="noopener noreferrer" className="hover:underline">Introducción y Primeros Pasos en PAIC</a></li>
            <li><a href="https://youtu.be/v5G11xzsKdw" target="_blank" rel="noopener noreferrer" className="hover:underline">Carga Masiva de Datos (Residentes, Cuentas, etc.)</a></li>
            <li><a href="https://youtu.be/WTYMghVqug8" target="_blank" rel="noopener noreferrer" className="hover:underline">Gestión de Áreas Comunes y Reservas</a></li>
            <li><a href="https://youtu.be/2ELjTFx20kM" target="_blank" rel="noopener noreferrer" className="hover:underline">Módulo de Comunicaciones: Envío de Correos</a></li>
            <li><a href="https://youtu.be/tF9auzMMegw" target="_blank" rel="noopener noreferrer" className="hover:underline">Módulo de Finanzas: Ingresos y Egresos</a></li>
            <li><a href="https://youtu.be/BVqTb9lsGCw" target="_blank" rel="noopener noreferrer" className="hover:underline">Módulo de Seguridad: Visitantes y Paquetería</a></li>
          </ul>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700">¿Necesitas un recorrido?</h3>
            <button onClick={onStartTour} className="mt-2 w-full text-left px-4 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md flex items-center gap-3 font-semibold">
                <Icon name="send" className="w-4 h-4" />
                Hacer el Tour Guiado de la Plataforma
            </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700">Contacto de Soporte</h3>
            <p className="text-gray-600 mt-2">
                <strong>Empresa:</strong> ProDig<br/>
                <strong>Teléfono:</strong> 3144897092<br/>
                <strong>Email:</strong> soporte@prodig.com
            </p>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
