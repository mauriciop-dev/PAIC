import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@paic/ui';

interface HeaderProps {
  onHelpClick?: () => void;
  onStartTour?: () => void;
  onOpenOnboarding?: () => void;
  showAnimatedButton?: boolean;
  userProfile: { name: string; email: string; avatarUrl?: string } | null;
  conjuntoInfo: any;
  onLogout: () => void;
  onSettingsClick: (tab?: string) => void;
  activeTabName: string;
}

export const Header: React.FC<HeaderProps> = ({
  onHelpClick,
  onStartTour,
  onOpenOnboarding,
  showAnimatedButton,
  userProfile,
  conjuntoInfo,
  onLogout,
  onSettingsClick,
  activeTabName,
}) => {
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

  if (!userProfile) return null;
  const isConjuntoAdmin = true;

  return (
    <>
      <style>{`
        @keyframes btn-soft-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5), 0 0 0 0 rgba(251, 146, 60, 0.2); }
          50% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0), 0 0 0 20px rgba(251, 146, 60, 0.15); }
        }
        @keyframes btn-gentle-shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-1.5px); }
          30% { transform: translateX(1.5px); }
          45% { transform: translateX(-1px); }
          60% { transform: translateX(1px); }
          75% { transform: translateX(-0.5px); }
          90% { transform: translateX(0.5px); }
        }
        .btn-animated-init {
          animation: btn-soft-pulse 2.5s ease-in-out infinite, btn-gentle-shake 4s ease-in-out 1s infinite;
        }
        .btn-animated-init:hover {
          animation: none;
          transform: scale(1.05);
        }
      `}</style>
    <header className="bg-white sticky top-0 z-20 shadow-sm border-b border-gray-200">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 md:py-4">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="min-w-0">
              <h1 id="paic-title" className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
                PAIC <span className="hidden sm:inline"> - Documentación</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs sm:text-sm font-semibold text-blue-600 truncate">{activeTabName}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div id="user-menu-dropdown" className="relative" ref={menuRef}>
              <button
                id="btn-avatar-usuario"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 rounded-full p-1.5 min-h-[48px] hover:bg-gray-100 transition-colors"
                aria-label="Menú de usuario"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300">
                  <Icon name="user" className="w-5 h-5 text-gray-600" />
                </div>
                <span className="hidden md:inline font-semibold text-sm text-gray-700">Docs User</span>
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-30 border border-gray-200 py-1">
                  <div className="p-3 border-b border-gray-100">
                    <p className="font-semibold text-sm text-gray-800 truncate">Documentación PAIC</p>
                    <p className="text-xs text-gray-500 truncate">docs@paicai.com.co</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => { onLogout(); setIsMenuOpen(false); }}
                      className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-md flex items-center gap-2 min-h-[44px]"
                    >
                      <Icon name="log-in" className="w-4 h-4 text-gray-500" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
    </>
  );
};

export default Header;