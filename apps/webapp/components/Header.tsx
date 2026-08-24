
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, UserRole, ConjuntoInfo } from '../types';
import { Icon } from './ui/Icon';
import { SettingsTab } from '../App';

interface HeaderProps {
  onHelpClick: () => void;
  onStartTour: () => void;
  onOpenOnboarding?: () => void;
  showAnimatedButton?: boolean;
  userProfile: UserProfile | null;
  conjuntoInfo: ConjuntoInfo | null;
  onLogout: () => void;
  onSettingsClick: (tab?: SettingsTab) => void;
  activeTabName: string;
}

const Header: React.FC<HeaderProps> = ({ 
  onHelpClick, 
  onStartTour,
  onOpenOnboarding,
  showAnimatedButton,
  userProfile, 
  conjuntoInfo, 
  onLogout, 
  onSettingsClick, 
  activeTabName 
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
  const isConjuntoAdmin = userProfile.role === UserRole.Trial || userProfile.role === UserRole.Subscriber;
  const isTrialActive = userProfile.role === UserRole.Trial && userProfile.trialExpiresAt;

  let daysRemaining = 0;
  if (isTrialActive) {
      const trialEndDate = new Date(userProfile.trialExpiresAt!);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      trialEndDate.setHours(0, 0, 0, 0);
      const diffTime = trialEndDate.getTime() - today.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 24)));
  }

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
          {/* Left section: Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="min-w-0">
              <h1 id="paic-title" className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
                PAIC <span className="hidden sm:inline">- Plataforma de Administración Inteligente de Copropiedades</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs sm:text-sm font-semibold text-blue-600 truncate">{activeTabName}</p>
                {conjuntoInfo && (
                  <span className="hidden sm:inline text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full truncate">
                    {conjuntoInfo.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right section: Trial badge, Support, Tour & User Profile */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <button
              id="btn-soporte"
              onClick={onHelpClick}
              className="hidden lg:block px-4 py-2.5 min-h-[44px] bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-colors text-sm"
            >
              Soporte
            </button>
            {isTrialActive && daysRemaining >= 0 && (
              <button
                onClick={() => onSettingsClick('Suscripción')}
                className="hidden lg:flex flex-col items-center px-3 py-2 min-h-[44px] bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-all text-xs cursor-pointer"
                title={`${daysRemaining} días restantes de prueba`}
              >
                <span className="font-bold text-green-700 leading-tight">Disfruta</span>
                <span className="font-extrabold text-green-800 text-lg leading-none">{daysRemaining}</span>
                <span className="font-medium text-green-600 leading-tight">días</span>
              </button>
            )}
            {showAnimatedButton && onOpenOnboarding ? (
              <button
                id="btn-inicia-aqui"
                onClick={onOpenOnboarding}
                className="hidden lg:flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-lg font-bold text-sm shadow-lg btn-animated-init"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Inicia aquí
              </button>
            ) : (
              <button
                id="btn-tour-guiado"
                onClick={onOpenOnboarding || onStartTour}
                className="hidden lg:flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-amber-100 text-amber-700 rounded-lg font-semibold hover:bg-amber-200 transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Tour Guiado
              </button>
            )}
            
            <div id="user-menu-dropdown" className="relative" ref={menuRef}>
              <button 
                id="btn-avatar-usuario" 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="flex items-center gap-2 rounded-full p-1.5 min-h-[48px] hover:bg-gray-100 transition-colors"
                aria-label="Menú de usuario"
              >
                {userProfile.avatarUrl ? (
                  <img src={userProfile.avatarUrl} alt="User Avatar" className="w-8 h-8 rounded-full border border-gray-200 object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300">
                    <Icon name="user" className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                <span className="hidden md:inline font-semibold text-sm text-gray-700">{userProfile.fullName}</span>
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-30 border border-gray-200 py-1">
                  <div className="p-3 border-b border-gray-100">
                     <p className="font-semibold text-sm text-gray-800 truncate">{userProfile.fullName}</p>
                     <p className="text-xs text-gray-500 truncate">{userProfile.email}</p>
                  </div>
                  {isConjuntoAdmin && conjuntoInfo && (
                    <div className="p-3 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-600">
                            Suscripción: <span className={conjuntoInfo.subscriptionPlan === 'Paid' ? 'text-green-700 font-bold' : 'text-yellow-700 font-bold'}>
                                {conjuntoInfo.subscriptionPlan === 'Paid' ? 'Pro' : 'Trial'}
                            </span>
                        </p>
                    </div>
                   )}
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
