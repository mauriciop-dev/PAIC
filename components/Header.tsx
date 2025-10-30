import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';

interface HeaderProps {
  onHelpClick: () => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHelpClick, userProfile, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="p-4 md:p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="flex justify-between items-center">
        <h1 className="text-lg md:text-xl font-bold text-gray-800">
          PAIC <span className="hidden sm:inline">- Plataforma de Administración Inteligente de Conjuntos</span>
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={onHelpClick}
            className="hidden sm:block px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-colors"
          >
            Ayuda
          </button>
          
          {userProfile && (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100">
                <img src={userProfile.picture} alt="User Avatar" className="w-8 h-8 rounded-full" />
                <span className="hidden md:inline font-semibold text-sm">{userProfile.name}</span>
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border border-gray-100">
                  <div className="p-3 border-b">
                     <p className="font-semibold text-sm text-gray-800">{userProfile.name}</p>
                     <p className="text-xs text-gray-500">{userProfile.email}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={onLogout}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-md"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
