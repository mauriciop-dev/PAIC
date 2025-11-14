import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import NavBar from './components/NavBar';
import Chatbot from './components/Chatbot';
import HelpModal from './components/HelpModal';
import InitialSetupModal from './components/InitialSetupModal';
import SettingsModal from './components/SettingsModal';
import LoginView from './components/views/LoginView';
import SuperAdminDashboard from './components/views/SuperAdminDashboard';
import { Tab, UserProfile, ConjuntoInfo, UserRole, SuperAdminProfile, PackageLog, PlatformUser } from './types';
import { Icon } from './components/ui/Icon';
import AccessPointSelectionModal from './components/AccessPointSelectionModal';
import { apiService } from './services/apiService';
import { supabase } from './services/supabaseClient';
import NotificationToast from './components/ui/NotificationToast';
import { fromSupabase } from './utils/dbMappers';
import { Session } from '@supabase/supabase-js';

interface LoginError {
  title: string;
  message: string;
  type: 'sync' | 'config';
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Dashboard);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isInitialSetupModalOpen, setIsInitialSetupModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAccessPointModalOpen, setIsAccessPointModalOpen] = useState(false);
  
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [conjuntoInfo, setConjuntoInfo] = useState<ConjuntoInfo | null>(null);
  const [selectedAccessPointId, setSelectedAccessPointId] = useState<number | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [loginError, setLoginError] = useState<LoginError | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  // Use a ref to track the current session inside the auth listener without causing re-renders.
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const handleLogout = useCallback(async () => {
    supabase.removeAllChannels();
    await supabase.auth.signOut();
    setUserProfile(null);
    setConjuntoInfo(null);
    setSelectedAccessPointId(null);
    setLoginError(null);
    setSession(null);
  }, []);

  // Effect to catch specific configuration errors from the URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const errorDescription = params.get('error_description');

    if (errorDescription && errorDescription.includes('Database error saving new user')) {
      setLoginError({
        title: "Error de Configuración del Servidor",
        message: "No se pudo crear el perfil de usuario. Esto suele ocurrir si una cuenta fue eliminada y se intenta registrar de nuevo. Por favor, contacta a soporte técnico e informa del error 'DB_SAVE_USER_CONFLICT' para reactivar tu cuenta.",
        type: 'config',
      });
      setIsLoadingSession(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);


  // Robust session initialization and listener effect
  useEffect(() => {
    if (loginError) {
        setIsLoadingSession(false);
        return;
    }

    const setupSessionAndProfile = async () => {
        try {
            // STEP 1: Actively and safely fetch the current session state.
            const { data, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
            const currentSession = data.session;

            // Update state based on the fetched session.
            setLoginError(null);
            setSession(currentSession);

            if (currentSession?.user) {
                // User is logged in, now fetch their application profile.
                let profile = null;
                // Retry loop to handle DB replication lag after sign-up.
                for (let i = 0; i < 5; i++) {
                    profile = await apiService.fetchUserProfile(currentSession.user.id);
                    if (profile) break;
                    console.warn(`Profile not found, retrying... Attempt ${i + 1}`);
                    await new Promise(res => setTimeout(res, 2000));
                }

                if (profile) {
                    setUserProfile(profile);
                    // After getting the profile, fetch the associated "conjunto" info.
                    if (profile.conjuntoId) {
                        const info = await apiService.fetchConjuntoInfo(profile.conjuntoId);
                        if (info) {
                            setConjuntoInfo(info);
                        } else if (profile.role === UserRole.Trial || profile.role === UserRole.Subscriber) {
                            // Admin user has no conjunto, force initial setup.
                            setIsInitialSetupModalOpen(true);
                        }
                    } else if (profile.role === UserRole.Trial || profile.role === UserRole.Subscriber) {
                        // Admin user has no conjuntoId in their profile, force initial setup.
                        setIsInitialSetupModalOpen(true);
                    }
                } else {
                    // This is a critical error state: user is authenticated but has no profile.
                    console.error("User is logged in but profile data is missing after retries.");
                    setLoginError({
                        title: "Error de Sincronización",
                        message: "No pudimos encontrar tu perfil. Esto puede ser un problema de sincronización. Por favor, refresca la página. Si el problema persiste, contacta a soporte.",
                        type: 'sync',
                    });
                    setUserProfile(null);
                    setConjuntoInfo(null);
                }
            } else {
                // No session, so clear user profile and conjunto info.
                setUserProfile(null);
                setConjuntoInfo(null);
            }
        } catch (e: any) {
            console.error("Critical error during session setup:", e);
            setLoginError({
                title: "Error Crítico de Sesión",
                message: "Ocurrió un error inesperado. Por favor, refresca la página. Si el problema persiste, contacta a soporte.",
                type: 'sync',
            });
        }
    };
    
    // Initializer function to wrap the setup and loading state.
    const initializeApp = async () => {
        setIsLoadingSession(true);
        supabase.removeAllChannels(); // Aggressively clean any lingering connections to prevent freezes.
        await setupSessionAndProfile();
        setIsLoadingSession(false); // This is guaranteed to run, preventing freezes.
    };
    
    initializeApp();

    // STEP 3: Set up a safe listener for future auth state changes.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
        // If the user's session changes (e.g., login in another tab, or logout),
        // the simplest and most robust way to ensure the app is in a consistent state
        // is to perform a full page reload. This avoids race conditions with the initial load.
        if (sessionRef.current?.user?.id !== currentSession?.user?.id) {
            window.location.reload();
        } else {
            // For events like token refreshes where the user is the same, just update the session object.
            setSession(currentSession);
        }
    });

    return () => {
        // Clean up the listener when the component unmounts.
        authListener?.subscription?.unsubscribe();
    };
  }, [loginError]); // Effect dependency
  
  // Effect to handle post-payment redirection
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('collection_status');

      if (paymentStatus === 'approved' && userProfile && conjuntoInfo && conjuntoInfo.subscriptionPlan === 'Free') {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);

          const updatedConjunto = { ...conjuntoInfo, subscriptionPlan: 'Paid' as const, planPrice: 140000 };
          await apiService.updateConjuntoInfo(updatedConjunto);
          
          const updatedProfile = { ...userProfile, role: UserRole.Subscriber };
          await apiService.updateUserProfile(updatedProfile);
          
          setConjuntoInfo(updatedConjunto);
          setUserProfile(updatedProfile);
          setNotification('¡Suscripción exitosa! Has mejorado al Plan Pro.');

        } catch (error) {
            console.error("Failed to update subscription status:", error);
            setNotification('Error al actualizar tu suscripción. Contacta a soporte.');
        }
      }
    };

    if(userProfile && conjuntoInfo) {
      handlePaymentSuccess();
    }
  }, [userProfile, conjuntoInfo]);

  useEffect(() => {
      if (userProfile && (userProfile.role === UserRole.Trial || userProfile.role === UserRole.Subscriber) && userProfile.conjuntoId) {
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
  

  const handleSaveSetup = async (info: ConjuntoInfo) => {
    if (!userProfile) return;
    
    try {
        // 1. Create conjunto info using the new, explicit 'add' function.
        await apiService.addConjuntoInfo(info);
        
        // 2. Update the user's profile with the new conjuntoId
        const updatedProfile: UserProfile = { ...userProfile, conjuntoId: info.id, fullName: info.adminName };
        await apiService.updateUserProfile(updatedProfile);

        // 3. Update local state
        setUserProfile(updatedProfile);
        setConjuntoInfo(info);
        setIsInitialSetupModalOpen(false);
    } catch (error) {
        console.error("Error saving initial setup:", error);
        // Re-throw the error so the modal component can catch it and display a message.
        throw error;
    }
  };


  const handleSaveSettings = async (updatedProfile: UserProfile, updatedConjunto: ConjuntoInfo) => {
    await apiService.updateUserProfile(updatedProfile);
    await apiService.updateConjuntoInfo(updatedConjunto);
    setUserProfile(updatedProfile);
    setConjuntoInfo(updatedConjunto);
    setIsSettingsModalOpen(false);
  };
  
  const handleInternalAuthSuccess = async (platformUser: PlatformUser) => {
      if (!platformUser.conjuntoId) return;

      const roles = await apiService.fetchRoles(platformUser.conjuntoId);
      const userRoleDef = roles.find(r => r.name === platformUser.role);

      let permissions: Tab[] = [];
      if (userRoleDef) {
          permissions = userRoleDef.permissions;
      } else {
          // Handle predefined static roles
          if (platformUser.role === 'Guard') {
              permissions = [Tab.Seguridad];
          } else if (platformUser.role === 'Contador') {
              permissions = [Tab.Finanzas];
          }
      }
      
      const profile: UserProfile = {
          id: `internal-${platformUser.id}`,
          fullName: platformUser.name,
          email: platformUser.email,
          role: UserRole.Internal,
          conjuntoId: platformUser.conjuntoId,
          permissions: permissions,
      };

      setUserProfile(profile);

      if (profile.conjuntoId) {
          const info = await apiService.fetchConjuntoInfo(profile.conjuntoId);
          if (info) setConjuntoInfo(info);
      }
  };

  if (isLoadingSession) {
      return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="text-center">
                <Icon name="bot" className="w-12 h-12 text-blue-600 animate-pulse mx-auto"/>
                <p className="text-gray-600 mt-2">Cargando PAIC...</p>
            </div>
        </div>
      );
  }
  
  if (loginError) {
      return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="text-center p-8 bg-white shadow-lg rounded-lg max-w-md mx-4">
                <Icon name="alert-triangle" className="w-12 h-12 text-red-500 mx-auto"/>
                <h2 className="text-xl font-bold text-gray-800 mt-4">
                    {loginError.title}
                </h2>
                <p className="text-gray-600 mt-2">{loginError.message}</p>
                <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                    {loginError.type === 'sync' && (
                         <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                            Refrescar Página
                        </button>
                    )}
                    <button onClick={handleLogout} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300">
                        Ir a Inicio
                    </button>
                </div>
            </div>
        </div>
      );
  }

  if (userProfile && userProfile.role === UserRole.Admin) {
      const superAdminProfile: SuperAdminProfile = { name: userProfile.fullName, email: userProfile.email, role: UserRole.Admin };
      return <SuperAdminDashboard profile={superAdminProfile} onLogout={handleLogout} />;
  }

  if (!userProfile) {
    return <LoginView onInternalAuthSuccess={handleInternalAuthSuccess} />;
  }
  
  const conjuntoName = conjuntoInfo?.name || "Conjunto Residencial";
  const isConjuntoAdmin = userProfile.role === UserRole.Trial || userProfile.role === UserRole.Subscriber;
  const needsAdminSetup = isConjuntoAdmin && !conjuntoInfo;

  return (
    <div className="flex h-screen font-sans text-gray-800 bg-gray-50">
      <NotificationToast message={notification} onClose={() => setNotification(null)} />
      
      {isConjuntoAdmin && (
          <Chatbot isOpen={isChatbotOpen} setIsOpen={setIsChatbotOpen} userProfile={userProfile} conjuntoInfo={conjuntoInfo} />
      )}
      
      {isConjuntoAdmin && (
        <div className={`fixed top-0 left-0 h-full z-20 transition-opacity duration-300 ease-in-out ${isChatbotOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <button onClick={() => setIsChatbotOpen(true)} className="absolute top-1/2 -translate-y-1/2 left-0 w-8 h-auto bg-blue-600 text-white py-4 px-1 rounded-r-lg shadow-lg hover:bg-blue-700 flex flex-col items-center gap-2 animate-subtle-pulse" aria-label="Abrir asistente">
            <Icon name="bot" className="w-6 h-6" />
            <span style={{ writingMode: 'vertical-rl' }} className="font-semibold text-xs tracking-wider">ASISTENTE</span>
          </button>
        </div>
      )}

      <main className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isChatbotOpen ? 'ml-0 md:ml-[30%]' : (isConjuntoAdmin ? 'ml-8' : 'ml-0')}`}>
        <Header 
            onHelpClick={() => setIsHelpModalOpen(true)} 
            userProfile={userProfile} 
            onLogout={handleLogout} 
            onSettingsClick={() => setIsSettingsModalOpen(true)} 
            activeTabName={activeTab}
        />
        {!needsAdminSetup && <NavBar activeTab={activeTab} setActiveTab={setActiveTab} userProfile={userProfile} />}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-100">
          {needsAdminSetup ? (
             <div className="text-center p-10 text-gray-600">
                <Icon name="settings" className="w-12 h-12 mx-auto text-gray-400" />
                <h2 className="text-xl font-semibold mt-4">Configuración Inicial Requerida</h2>
                <p className="mt-2">
                    Bienvenido a PAIC. Por favor, completa la información de tu conjunto en el diálogo que ha aparecido.
                </p>
            </div>
          ) : (
            <Dashboard activeTab={activeTab} setActiveTab={setActiveTab} conjuntoName={conjuntoName} userProfile={userProfile} conjuntoInfo={conjuntoInfo} selectedAccessPointId={selectedAccessPointId} />
          )}
        </div>
      </main>

      {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} />}
      {isInitialSetupModalOpen && (
        <InitialSetupModal 
            onClose={() => setIsInitialSetupModalOpen(false)} 
            onSaveSetup={handleSaveSetup} 
            userProfile={userProfile}
        />
      )}
      {isSettingsModalOpen && isConjuntoAdmin && conjuntoInfo && (
          <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} onSave={handleSaveSettings} userProfile={userProfile} conjuntoInfo={conjuntoInfo} />
      )}
       {isAccessPointModalOpen && userProfile.conjuntoId && (
        <AccessPointSelectionModal isOpen={isAccessPointModalOpen} onClose={() => setIsAccessPointModalOpen(false)} conjuntoId={userProfile.conjuntoId} onSelect={setSelectedAccessPointId} />
      )}
    </div>
  );
};

export default App;