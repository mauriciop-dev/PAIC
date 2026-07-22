
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import NavBar from './components/NavBar';
import Chatbot from './components/Chatbot';
import DraggableChatButton from './components/DraggableChatButton';
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
import OnboardingGuide from './components/OnboardingGuide';
import { analytics } from './services/analytics';

interface LoginError {
  title: string;
  message: string;
  type: 'sync' | 'config';
}

export type SettingsTab = 'Perfil' | 'Conjunto' | 'Puntos de Acceso' | 'Gestionar Áreas' | 'Suscripción' | 'Usuarios' | 'Permisos de Usuario';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Dashboard);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isInitialSetupModalOpen, setIsInitialSetupModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAccessPointModalOpen, setIsAccessPointModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined means "not yet determined"
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [conjuntoInfo, setConjuntoInfo] = useState<ConjuntoInfo | null>(null);
  const [selectedAccessPointId, setSelectedAccessPointId] = useState<number | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [initialSettingsTab, setInitialSettingsTab] = useState<SettingsTab>('Perfil');
  const loginTrackedRef = useRef(false);

  const handleLogout = useCallback(async () => {
    supabase.removeAllChannels();
    await supabase.auth.signOut();
    setUserProfile(null);
    setConjuntoInfo(null);
    setSelectedAccessPointId(null);
    setLoginError(null);
    setSession(null);
  }, []);

  // Track UTM/source params on first load
  useEffect(() => {
    analytics.trackUTM();
  }, []);

  // Track section views on tab change
  useEffect(() => {
    if (userProfile) {
      analytics.trackSectionView(activeTab, userProfile.role);
    }
  }, [activeTab, userProfile]);

  // Effect to catch specific configuration errors from the URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const errorDescription = params.get('error_description');

    if (errorDescription && errorDescription.includes('Database error saving new user')) {
      analytics.trackError('config_error', 'Database error saving new user');
      setLoginError({
        title: "Error de Configuración del Servidor",
        message: "No se pudo crear el perfil de usuario. Esto suele ocurrir si una cuenta fue eliminada y se intenta registrar de nuevo. Por favor, contacta a soporte técnico e informa del error 'DB_SAVE_USER_CONFLICT' para reactivar tu cuenta.",
        type: 'config',
      });
      setIsLoadingSession(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Effect #1: Runs ONCE on mount. Gets the initial session via getSession()
  // and sets up the auth listener for subsequent changes.
  useEffect(() => {
    // Do not run if a config error was already detected from the URL
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.get('error_description')) {
        setIsLoadingSession(false);
        return;
    }

    // getSession() explicitly recovers the session from storage or URL hash,
    // handling the OAuth redirect callback properly.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
    });

    return () => {
        subscription?.unsubscribe();
    };
  }, []);

  // Effect #2: Runs whenever the `session` state changes. It is responsible for
  // fetching all user-dependent application data. This separation of concerns is key.
  useEffect(() => {
    // If session is `undefined`, it means the listener hasn't fired yet. We wait.
    if (session === undefined) {
        return;
    }

    // If session is `null`, the user is logged out. Clear all data and finish loading.
    if (session === null) {
        setUserProfile(null);
        setConjuntoInfo(null);
        setIsLoadingSession(false);
        return;
    }

    // A session exists. Fetch the corresponding application profile and data.
    let cancelled = false;

    const fetchProfileData = async () => {
        try {
            let profile = null;
            // Retry loop to handle DB replication lag after sign-up.
            for (let i = 0; i < 5; i++) {
                if (cancelled) return;
                profile = await apiService.fetchUserProfile(session.user.id);
                if (profile) break;
                console.warn(`Profile not found, retrying... Attempt ${i + 1}`);
                await new Promise(res => setTimeout(res, 2000));
            }

            if (cancelled) return;

            if (profile) {
                if (!loginTrackedRef.current) {
                  loginTrackedRef.current = true;
                  if (profile.email !== 'demo@paicai.com.co') {
                    analytics.trackLogin('google', profile.role);
                  }
                }
                analytics.setUserId(profile.id);
                analytics.trackPageView(activeTab);
                setUserProfile(profile);
                if (profile.conjuntoId) {
                    const info = await apiService.fetchConjuntoInfo(profile.conjuntoId);
                    if (cancelled) return;
                    if (info) {
                        setConjuntoInfo(info);
                    } else if (profile.role === UserRole.Trial || profile.role === UserRole.Subscriber) {
                        setIsInitialSetupModalOpen(true);
                    }
                } else if (profile.role === UserRole.Trial || profile.role === UserRole.Subscriber) {
                    setIsInitialSetupModalOpen(true);
                }
            } else {
                analytics.trackError('sync_error', 'Profile not found after retries');
                console.error("User is logged in but profile data is missing after retries.");
                setLoginError({
                    title: "Error de Sincronización",
                    message: "No pudimos encontrar tu perfil. Esto puede ser un problema de sincronización. Por favor, refresca la página. Si el problema persiste, contacta a soporte.",
                    type: 'sync',
                });
                setUserProfile(null);
                setConjuntoInfo(null);
            }
        } catch (error) {
            analytics.trackError('fetch_error', 'Error fetching profile data');
            console.error("Error fetching profile data:", error);
            setLoginError({
                title: "Error de Datos",
                message: "Ocurrió un error al cargar la información de tu cuenta. Por favor, intenta de nuevo.",
                type: 'sync',
            });
        } finally {
             if (!cancelled) {
                setIsLoadingSession(false);
            }
        }
    };

    fetchProfileData();

    return () => {
        cancelled = true;
    };
  }, [session]);
  
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
          
          analytics.trackSubscription('Free', 'Paid');
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
  
  const handleOnboardingComplete = () => {
    analytics.trackOnboarding('completed');
    setShowOnboarding(false);
  };
  
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

  const handleSettingsClick = (tab: SettingsTab = 'Perfil') => {
    setInitialSettingsTab(tab);
    setIsSettingsModalOpen(true);
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

      analytics.trackLogin('internal', 'internal');
      analytics.setUserId(profile.id);
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
    <>
      <NotificationToast message={notification} onClose={() => setNotification(null)} />
      <div className="flex min-h-screen font-sans text-gray-800 bg-gray-50 overflow-x-hidden">
        
      {isConjuntoAdmin && (
          <Chatbot isOpen={isChatbotOpen} setIsOpen={setIsChatbotOpen} userProfile={userProfile} conjuntoInfo={conjuntoInfo} />
      )}
      
      {isConjuntoAdmin && (
        <DraggableChatButton 
          isChatbotOpen={isChatbotOpen} 
          onClick={() => setIsChatbotOpen(true)} 
        />
      )}

      <main className={`flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0 overflow-x-hidden w-full ${isChatbotOpen ? 'ml-0 md:ml-[30%]' : 'ml-0'}`}>
        <Header 
            onHelpClick={() => setIsHelpModalOpen(true)} 
            onStartTour={() => { analytics.trackOnboarding('started'); setShowOnboarding(true); }}
            userProfile={userProfile}
            conjuntoInfo={conjuntoInfo} 
            onLogout={handleLogout} 
            onSettingsClick={handleSettingsClick} 
            activeTabName={activeTab}
            onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            isMobileMenuOpen={isMobileMenuOpen}
        />
        {!needsAdminSetup && (
          <NavBar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            userProfile={userProfile} 
            onSettingsClick={handleSettingsClick}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            onHelpClick={() => setIsHelpModalOpen(true)}
            onStartTour={() => { analytics.trackOnboarding('started'); setShowOnboarding(true); }}
          />
        )}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 bg-gray-100">
          <div className="max-w-screen-2xl mx-auto w-full">
            {needsAdminSetup ? (
               <div className="text-center p-10 text-gray-600 bg-white rounded-xl shadow-sm border border-gray-200">
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
        </div>
      </main>

      {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} onStartTour={() => { analytics.trackOnboarding('started'); setIsHelpModalOpen(false); setShowOnboarding(true); }} />}
      
      {isInitialSetupModalOpen && (
        <InitialSetupModal 
            onClose={() => setIsInitialSetupModalOpen(false)} 
            onSaveSetup={handleSaveSetup} 
            userProfile={userProfile}
        />
      )}
      
      {isSettingsModalOpen && isConjuntoAdmin && conjuntoInfo && (
          <SettingsModal 
            isOpen={isSettingsModalOpen} 
            onClose={() => setIsSettingsModalOpen(false)} 
            userProfile={userProfile} 
            conjuntoInfo={conjuntoInfo} 
            initialTab={initialSettingsTab}
            setConjuntoInfo={setConjuntoInfo}
            setUserProfile={setUserProfile}
          />
      )}
      
       {isAccessPointModalOpen && userProfile.conjuntoId && (
        <AccessPointSelectionModal isOpen={isAccessPointModalOpen} onClose={() => setIsAccessPointModalOpen(false)} conjuntoId={userProfile.conjuntoId} onSelect={setSelectedAccessPointId} />
      )}
      
      <OnboardingGuide isOpen={showOnboarding} onClose={handleOnboardingComplete} userProfile={userProfile} />
    </div>
    </>
  );
};

export default App;
