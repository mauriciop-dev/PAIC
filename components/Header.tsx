
import React from 'react';

interface HeaderProps {
  onHelpClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHelpClick }) => {
  return (
    <header className="p-4 md:p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="flex justify-between items-center">
        <h1 className="text-lg md:text-xl font-bold text-gray-800">
          PAIC <span className="hidden sm:inline">- Plataforma de Administración Inteligente de Conjuntos</span>
        </h1>
        <div className="flex items-center gap-4">
          <div className="text-xs md:text-sm text-center">
            <div className="font-semibold bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">Prueba Gratuita - 14 días restantes</div>
            <button className="text-blue-600 hover:underline mt-1">Actualizar a Suscripción</button>
          </div>
          <button
            onClick={onHelpClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Ayuda
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
