
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import HelpModal from './components/HelpModal';
import InitialSetupModal from './components/InitialSetupModal';
import SettingsModal from './components/SettingsModal';
import LoginView from './components/views/LoginView';
import SuperAdminDashboard from './components/views/SuperAdminDashboard';
import { Tab, UserProfile, ConjuntoInfo, UserRole, SuperAdminProfile, PackageLog } from './types';
import { jwtDecode } from './utils/jwtDecode';
import { Icon } from './components/ui/Icon';
import AccessPointSelectionModal from './components/AccessPointSelectionModal';
import { apiService } from './services/apiService';
import { supabase } from './services/supabaseClient';
import NotificationToast from './components/ui/NotificationToast';
import { fromSupabase } from './utils/dbMappers';

// FIX: Removed deprecated `aistudio` property from the global Window type to resolve a conflict.
// The API key is now handled via environment variables as per updated guidelines.
declare global {
  interface Window {
    google: any;
  }
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Dashboard);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isInitialSetupModalOpen, setIsInitialSetupModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAccessPointModalOpen, setIsAccessPointModalOpen] = useState(false);
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [superAdminProfile, setSuperAdminProfile] = useState<SuperAdminProfile | null>(null);
  const [conjuntoInfo, setConjuntoInfo] = useState<ConjuntoInfo | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  const handleLogout = useCallback(() => {
    supabase.removeAllChannels();
    setUserProfile(null);
    setSuperAdminProfile(null);
    setConjuntoInfo(null);
    localStorage.removeItem('paic_userProfile');
    localStorage.removeItem('paic_superAdminProfile');
    localStorage.removeItem('paic_conjuntoInfo');
    if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.disableAutoSelect();
    }
  }, []);

  useEffect(() => {
    const loadSession = async () => {
        const storedUser = localStorage.getItem('paic_userProfile');
        const storedSuperAdmin = localStorage.getItem('paic_superAdminProfile');

        if (storedSuperAdmin) {
            setSuperAdminProfile(JSON.parse(storedSuperAdmin));
            return;
        }

        if (storedUser) {
            const parsedUser: UserProfile = JSON.parse(storedUser);
            if (!parsedUser.role) { // Compatibility fix
                parsedUser.role = UserRole.Admin;
            }
            setUserProfile(parsedUser); // Set user profile immediately

            if (parsedUser.conjuntoId) {
                let infoToSet: ConjuntoInfo | null = null;
                const storedConjuntoRaw = localStorage.getItem('paic_conjuntoInfo');

                if (storedConjuntoRaw) {
                    try {
                        const parsed = JSON.parse(storedConjuntoRaw);
                        if (parsed && typeof parsed === 'object') {
                            infoToSet = parsed;
                        }
                    } catch (error) {
                        console.error('Could not parse conjuntoInfo from localStorage, fetching from API.', error);
                        localStorage.removeItem('paic_conjuntoInfo');
                    }
                }

                if (infoToSet) {
                    setConjuntoInfo(infoToSet);
                } else {
                    const infoFromApi = await apiService.fetchConjuntoInfo(parsedUser.conjuntoId);
                    if (infoFromApi) {
                        setConjuntoInfo(infoFromApi);
                        localStorage.setItem('paic_conjuntoInfo', JSON.stringify(infoFromApi));
                    } else {
                        // If info couldn't be fetched from API...
                        if (parsedUser.role === UserRole.Admin) {
                            setIsInitialSetupModalOpen(true);
                        } else {
                            // For non-admins, this is a critical error. They can't proceed.
                            console.error(`Could not fetch conjuntoInfo for non-admin user ${parsedUser.email}. Logging out.`);
                            handleLogout();
                        }
                    }
                }
            } else if (parsedUser.role === UserRole.Admin) {
                setIsInitialSetupModalOpen(true);
            }
        }
    };

    loadSession();
  }, [handleLogout]);

  useEffect(() => {
      if (userProfile?.role === UserRole.Admin && userProfile.conjuntoId) {
          const channel = supabase
              .channel('package-notifications')
              .on(
                  'postgres_changes',
                  { 
                      event: 'INSERT', 
                      schema: 'public', 
                      table: 'package_logs',
                      filter: `conjunto_id=eq.${userProfile.conjuntoId}`
                  },
                  (payload) => {
                      const newPackage = fromSupabase(payload.new) as PackageLog;
                      setNotification(`Nuevo paquete para Apto ${newPackage.apartment} de ${newPackage.courier}`);
                  }
              )
              .subscribe();

          return () => {
              supabase.removeChannel(channel);
          };
      }
  }, [userProfile]);
  
  const handleAuthSuccess = async (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('paic_userProfile', JSON.stringify(profile));
    
    if (profile.conjuntoId) {
        const info = await apiService.fetchConjuntoInfo(profile.conjuntoId);
        if (info) {
            setConjuntoInfo(info);
            localStorage.setItem('paic_conjuntoInfo', JSON.stringify(info));
        } else if (profile.role === UserRole.Admin) {
            setIsInitialSetupModalOpen(true);
        }
    } else if (profile.role === UserRole.Admin) {
        setIsInitialSetupModalOpen(true);
    }

    if (profile.role === UserRole.Guard) {
      setIsAccessPointModalOpen(true);
    }
  };

  const handleGoogleLoginSuccess = useCallback(async (credentialResponse: any) => {
    const profileObject: any = jwtDecode(credentialResponse.credential);
    if (!profileObject) {
      console.error("Failed to decode profile from credential response.");
      return;
    }
    
    const isSuperAdmin = await apiService.checkIfSuperAdmin(profileObject.email);
    if (isSuperAdmin) {
        const superAdmin: SuperAdminProfile = {
            name: profileObject.name,
            email: profileObject.email,
            role: UserRole.SuperAdmin,
        };
        setSuperAdminProfile(superAdmin);
        localStorage.setItem('paic_superAdminProfile', JSON.stringify(superAdmin));
        return; // End flow here for super admin
    }

    const existingUser = await apiService.findUserByEmail(profileObject.email);

    const newUserProfile: UserProfile = {
      name: profileObject.name,
      email: profileObject.email,
      picture: profileObject.picture,
      role: UserRole.Admin,
      conjuntoId: existingUser?.conjuntoId || 'conj-123'
    };
    handleAuthSuccess(newUserProfile);
  }, []);

  const handleSaveSetup = async (info: ConjuntoInfo) => {
    // 1. Persist the new info to our simulated backend
    await apiService.updateConjuntoInfo(info);

    // 2. Update the local state to trigger re-render
    setConjuntoInfo(info);
    localStorage.setItem('paic_conjuntoInfo', JSON.stringify(info));
    setIsInitialSetupModalOpen(false);

    // 3. Also, sync the admin name with the user profile for UI consistency
    if (userProfile && userProfile.name !== info.adminName) {
      const updatedProfile = { ...userProfile, name: info.adminName };
      setUserProfile(updatedProfile);
      localStorage.setItem('paic_userProfile', JSON.stringify(updatedProfile));
    }
  };

  const handleSaveSettings = (updatedProfile: UserProfile, updatedConjunto: ConjuntoInfo) => {
    setUserProfile(updatedProfile);
    setConjuntoInfo(updatedConjunto);
    localStorage.setItem('paic_userProfile', JSON.stringify(updatedProfile));
    localStorage.setItem('paic_conjuntoInfo', JSON.stringify(updatedConjunto));
    setIsSettingsModalOpen(false);
  };
  
  if (superAdminProfile) {
      return <SuperAdminDashboard profile={superAdminProfile} onLogout={handleLogout} />;
  }

  if (!userProfile) {
    return <LoginView onAuthSuccess={handleAuthSuccess} onGoogleLoginSuccess={handleGoogleLoginSuccess} />;
  }
  
  const conjuntoName = conjuntoInfo?.name || "Conjunto Residencial";
  const needsAdminSetup = userProfile.role === UserRole.Admin && !conjuntoInfo;

  return (
    <div className="flex h-screen font-sans text-gray-800 bg-gray-50">
      <NotificationToast message={notification} onClose={() => setNotification(null)} />
      <Chatbot isOpen={isChatbotOpen} setIsOpen={setIsChatbotOpen} userProfile={userProfile} />
      
      {userProfile.role === UserRole.Admin && (
        <div className={`fixed top-0 left-0 h-full z-20 transition-opacity duration-300 ease-in-out ${isChatbotOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <button onClick={() => setIsChatbotOpen(true)} className="absolute top-1/2 -translate-y-1/2 left-0 w-8 h-auto bg-blue-600 text-white py-4 px-1 rounded-r-lg shadow-lg hover:bg-blue-700 flex flex-col items-center gap-2 animate-subtle-pulse" aria-label="Abrir asistente">
            <Icon name="bot" className="w-6 h-6" />
            <span style={{ writingMode: 'vertical-rl' }} className="font-semibold text-xs tracking-wider">ASISTENTE</span>
          </button>
        </div>
      )}

      <main className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isChatbotOpen ? 'ml-0 md:ml-[30%]' : (userProfile.role === UserRole.Admin ? 'ml-8' : 'ml-0')}`}>
        <Header onHelpClick={() => setIsHelpModalOpen(true)} userProfile={userProfile} onLogout={handleLogout} onSettingsClick={() => setIsSettingsModalOpen(true)} />
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {needsAdminSetup ? (
             <div className="text-center p-10 text-gray-600">
                <Icon name="settings" className="w-12 h-12 mx-auto text-gray-400" />
                <h2 className="text-xl font-semibold mt-4">Configuración Inicial Requerida</h2>
                <p className="mt-2">
                    Bienvenido a PAIC. Por favor, completa la información de tu conjunto en el diálogo que ha aparecido.
                </p>
            </div>
          ) : (
            <Dashboard activeTab={activeTab} setActiveTab={setActiveTab} conjuntoName={conjuntoName} userProfile={userProfile} conjuntoInfo={conjuntoInfo} />
          )}
        </div>
        {!needsAdminSetup && <Footer activeTab={activeTab} setActiveTab={setActiveTab} userProfile={userProfile} />}
      </main>

      {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} />}
      {isInitialSetupModalOpen && (
        <InitialSetupModal 
            onClose={() => setIsInitialSetupModalOpen(false)} 
            onSaveSetup={handleSaveSetup} 
            conjuntoId={userProfile.conjuntoId || 'conj-123'} 
        />
      )}
      {isSettingsModalOpen && userProfile.role === UserRole.Admin && conjuntoInfo && (
          <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} onSave={handleSaveSettings} userProfile={userProfile} conjuntoInfo={conjuntoInfo} />
      )}
      {isAccessPointModalOpen && userProfile.conjuntoId && (
        <AccessPointSelectionModal isOpen={isAccessPointModalOpen} onClose={() => setIsAccessPointModalOpen(false)} conjuntoId={userProfile.conjuntoId} />
      )}
    </div>
  );
};

export default App;
