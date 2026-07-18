
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, UserRole, ConjuntoInfo } from '../types';
import { Icon } from './ui/Icon';
import { SettingsTab } from '../App';

interface HeaderProps {
  onHelpClick: () => void;
  onStartTour: () => void;
  userProfile: UserProfile | null;
  conjuntoInfo: ConjuntoInfo | null;
  onLogout: () => void;
  onSettingsClick: (tab?: SettingsTab) => void;
  activeTabName: string;
}

const Header: React.FC<HeaderProps> = ({ onHelpClick, userProfile, conjuntoInfo, onLogout, onSettingsClick, activeTabName }) => {
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
      // Set hours to 0 to compare dates only
      today.setHours(0, 0, 0, 0);
      trialEndDate.setHours(0, 0, 0, 0);
      const diffTime = trialEndDate.getTime() - today.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 24)));
  }

  return (
    <header className="bg-white sticky top-0 z-20 shadow-sm">
      <div className="p-4 md:px-6 md:pt-6 md:pb-2 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h1 id="paic-title" className="text-lg md:text-xl font-bold text-gray-800">
              PAIC <span className="hidden sm:inline">- Plataforma de Administración Inteligente de Conjuntos</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-md font-semibold text-blue-600">{activeTabName}</p>
                {conjuntoInfo && (
                    <span className="hidden sm:inline text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {conjuntoInfo.name}
                    </span>
                )}
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0 pt-1">
             {isTrialActive && daysRemaining > 0 && (
                <div className="hidden sm:block text-center">
                    <button
                        onClick={() => onSettingsClick('Suscripción')}
                        className="px-3 py-1.5 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors text-xs shadow-sm"
                    >
                        Actualiza a Pro
                    </button>
                    <p className="text-xs text-gray-500 mt-0.5">{daysRemaining} días restantes</p>
                </div>
            )}
            <button
              id="btn-soporte"
              onClick={onHelpClick}
              className="hidden sm:block px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-colors"
            >
              Soporte
            </button>
            <button
              id="btn-tour-guiado"
              onClick={onStartTour}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-semibold hover:bg-amber-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Tour Guiado
            </button>
            
            <div id="user-menu-dropdown" className="relative" ref={menuRef}>
              <button id="btn-avatar-usuario" onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100">
                {userProfile.avatarUrl ? (
                   <img src={userProfile.avatarUrl} alt="User Avatar" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <Icon name="user" className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                <span className="hidden md:inline font-semibold text-sm">{userProfile.fullName}</span>
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border border-gray-100">
                  <div className="p-3 border-b">
                     <p className="font-semibold text-sm text-gray-800">{userProfile.fullName}</p>
                     <p className="text-xs text-gray-500">{userProfile.email}</p>
                  </div>
                  {isConjuntoAdmin && conjuntoInfo && (
                    <div className="p-3 border-b">
                        <p className="text-xs font-semibold text-gray-600">
                            Suscripción: <span className={conjuntoInfo.subscriptionPlan === 'Paid' ? 'text-green-700 font-bold' : 'text-yellow-700 font-bold'}>
                                {conjuntoInfo.subscriptionPlan === 'Paid' ? 'Pro' : 'Trial'}
                            </span>
                        </p>
                    </div>
                   )}
                  <div className="p-1">
                    {/* The main settings button is now the gear icon in the NavBar */}
                    <button
                      onClick={() => { onLogout(); setIsMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-md flex items-center gap-2"
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
  );
};

export default Header;
