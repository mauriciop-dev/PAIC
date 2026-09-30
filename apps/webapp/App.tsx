import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Chatbot from './components/Chatbot';
import DraggableChatButton from './components/DraggableChatButton';
import HelpModal from './components/HelpModal';
import InitialSetupModal from './components/InitialSetupModal';
import SettingsModal from './components/SettingsModal';
import LoginView from './components/views/LoginView';
import SuperAdminDashboard from './components/views/SuperAdminDashboard';
import KioskSecurityView from './components/views/KioskSecurityView';
import { Tab, UserProfile, ConjuntoInfo, UserRole, SuperAdminProfile, PackageLog, PlatformUser } from './types';
import { Icon, ToastProvider, useToast } from '@paic/ui';
import AccessPointSelectionModal from './components/AccessPointSelectionModal';
import { apiService } from './services/apiService';
import {
  setWriteAccessProvider,
  supabase,
  TRIAL_WRITE_BLOCKED_EVENT,
  TRIAL_WRITE_BLOCKED_MESSAGE,
} from './services/supabaseClient';

import { fromSupabase } from './utils/dbMappers';
import { Session } from '@supabase/supabase-js';
import OnboardingGuide from './components/OnboardingGuide';
import OnboardingModal from './components/OnboardingModal';
import DetailedOnboarding from './components/DetailedOnboarding';
import BottomNav from './components/BottomNav';
import { useOnboardingProgress } from './hooks/useOnboardingProgress';
import { analytics } from './services/analytics';
import { getPendingPlan, clearPendingPlan } from './components/PlansModal';
import {
  canWriteForAccount,
  isReadOnlyAccount,
  TRIAL_DEMO_EMAIL,
} from './services/trialAccess';

interface LoginError {
  title: string;
  message: string;
  type: 'sync' | 'config';
}

export type SettingsTab = 'Perfil' | 'Conjunto' | 'Puntos de Acceso' | 'Personal de Seguridad' | 'Gestionar Áreas' | 'Suscripción' | 'Usuarios' | 'Permisos de Usuario';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Dashboard);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isInitialSetupModalOpen, setIsInitialSetupModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAccessPointModalOpen, setIsAccessPointModalOpen] = useState(false);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [conjuntoInfo, setConjuntoInfo] = useState<ConjuntoInfo | null>(null);
  const [selectedAccessPointId, setSelectedAccessPointId] = useState<number | null>(null);
  const [isKioskMode, setIsKioskMode] = useState<boolean>(() => {
    return window.location.pathname.includes('/seguridad/kiosco') || 
           new URLSearchParams(window.location.search).get('view') === 'kiosco';
  });
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const { addToast } = useToast();
  const [accessClock, setAccessClock] = useState(Date.now());
  const lastBlockedToastAt = useRef(0);

  useEffect(() => {
    const handlePopState = () => {
      setIsKioskMode(
        window.location.pathname.includes('/seguridad/kiosco') ||
        new URLSearchParams(window.location.search).get('view') === 'kiosco'
      );
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (notification) {
      addToast(notification, 'info', 5000);
      setNotification(null);
    }
  }, [notification, addToast]);

  useEffect(() => {
    setWriteAccessProvider(() => canWriteForAccount(userProfile, conjuntoInfo));
  }, [userProfile, conjuntoInfo]);

  useEffect(() => {
    const handleBlockedWrite = () => {
      const now = Date.now();
      if (now - lastBlockedToastAt.current < 5000) return;
      lastBlockedToastAt.current = now;
      setNotification(TRIAL_WRITE_BLOCKED_MESSAGE);
    };
    window.addEventListener(TRIAL_WRITE_BLOCKED_EVENT, handleBlockedWrite);
    return () => window.removeEventListener(TRIAL_WRITE_BLOCKED_EVENT, handleBlockedWrite);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setAccessClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [activeDetailedTour, setActiveDetailedTour] = useState<number | null>(null);
  const [welcomePlanName, setWelcomePlanName] = useState<string | null>(null);
  const [initialSettingsTab, setInitialSettingsTab] = useState<SettingsTab>('Perfil');
  const loginTrackedRef = useRef(false);
  const processedPaymentRef = useRef<string | null>(null);

  const onboardingProgress = useOnboardingProgress(userProfile?.id || '');
  const isReadOnly = isReadOnlyAccount(userProfile, conjuntoInfo, accessClock);
  const showAnimatedButton = userProfile?.role === UserRole.Trial ||
    (userProfile?.role === UserRole.Subscriber && conjuntoInfo?.registrationDate && 
      (new Date().getTime() - new Date(conjuntoInfo.registrationDate).getTime()) < 44 * 24 * 60 * 60 * 1000);

  const handleLogout = useCallback(async () => {
    setWriteAccessProvider(() => true);
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

  // Catch specific configuration errors from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const errorDescription = params.get('error_description');

    if (errorDescription && errorDescription.includes('Database error saving new user')) {
      analytics.trackError('config_error', 'Database error saving new user');
      setLoginError({
        title: "Error de Configuración del Servidor",
        message: "No se pudo crear el perfil de usuario. Por favor contacta a soporte técnico.",
        type: 'config',
      });
      setIsLoadingSession(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Initial session recovery
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.get('error_description')) {
        setIsLoadingSession(false);
        return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
    });

    return () => {
        subscription?.unsubscribe();
    };
  }, []);

  // Fetch profile when session changes
  useEffect(() => {
    if (session === undefined) return;

    if (session === null) {
        setUserProfile(null);
        setConjuntoInfo(null);
        setIsLoadingSession(false);
        return;
    }

    let cancelled = false;

    const fetchProfileData = async () => {
        try {
            let profile = null;
            for (let i = 0; i < 5; i++) {
                if (cancelled) return;
                profile = await apiService.fetchUserProfile(session.user.id);
                if (profile) break;
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
                        let effectiveInfo = info;
                        if (info.subscriptionPlan === 'Paid' && info.planExpiresAt && new Date(info.planExpiresAt).getTime() < Date.now()) {
                            effectiveInfo = { ...info, subscriptionPlan: 'Free' as const, planName: undefined, planPrice: undefined };
                        }
                        setConjuntoInfo(effectiveInfo);
                    } else if (profile.role === UserRole.Trial || profile.role === UserRole.Subscriber) {
                        setIsInitialSetupModalOpen(true);
                    }
                } else if (profile.role === UserRole.Trial || profile.role === UserRole.Subscriber) {
                    setIsInitialSetupModalOpen(true);
                }
            } else {
                analytics.trackError('sync_error', 'Profile not found after retries');
                setLoginError({
                    title: "Error de Sincronización",
                    message: "No pudimos encontrar tu perfil. Por favor refresca la página.",
                    type: 'sync',
                });
                setUserProfile(null);
                setConjuntoInfo(null);
            }
        } catch (error) {
            analytics.trackError('fetch_error', 'Error fetching profile data');
            setLoginError({
                title: "Error de Datos",
                message: "Ocurrió un error al cargar tu cuenta.",
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
  
  // Post-payment redirection
  useEffect(() => {
    const handlePaymentReturn = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentId = urlParams.get('payment_id');
      const preapprovalId = urlParams.get('preapproval_id');
      const paymentStatus = urlParams.get('collection_status') || urlParams.get('status');
      if (!paymentId && !preapprovalId) {
        if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
          window.history.replaceState({}, document.title, window.location.pathname);
          clearPendingPlan();
          setNotification('El pago fue rechazado o cancelado. Puedes volver a intentarlo cuando quieras.');
        }
        return;
      }
      if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
        window.history.replaceState({}, document.title, window.location.pathname);
        clearPendingPlan();
        setNotification('El pago fue rechazado o cancelado. Puedes volver a intentarlo cuando quieras.');
        return;
      }
      if (!userProfile || !conjuntoInfo) return;

      const paymentKey = preapprovalId || paymentId!;
      if (processedPaymentRef.current === paymentKey) return;
      processedPaymentRef.current = paymentKey;
      window.history.replaceState({}, document.title, window.location.pathname);

      if (userProfile && conjuntoInfo && conjuntoInfo.subscriptionPlan === 'Free') {
        try {
          const pending = getPendingPlan();
          if (!pending || !userProfile.conjuntoId || (!paymentId && !preapprovalId)) {
            throw new Error('No encontramos los datos necesarios para verificar el pago.');
          }
          const { data, error } = await supabase.functions.invoke('activate-mp-subscription', {
            body: {
              conjuntoId: userProfile.conjuntoId,
              planName: pending.name,
              billing: pending.billing,
              paymentId: preapprovalId ? null : paymentId,
              preapprovalId,
            },
          });
          if (error) throw error;
          if (!data?.planName || !data?.planExpiresAt) {
            throw new Error(data?.error || 'Mercado Pago todavía no confirma la suscripción.');
          }

          const updatedConjunto: ConjuntoInfo = {
            ...conjuntoInfo,
            subscriptionPlan: 'Paid',
            planName: data.planName,
            planPrice: data.planPrice,
            planExpiresAt: data.planExpiresAt,
            preapprovalId: preapprovalId || conjuntoInfo.preapprovalId,
            lastPaymentId: paymentId || conjuntoInfo.lastPaymentId,
          };
          analytics.trackSubscription('Free', data.planName);
          setConjuntoInfo(updatedConjunto);
          clearPendingPlan();
          setWelcomePlanName(data.planName);
          setNotification(`¡Suscripción exitosa! Tu plan ${data.planName} está activo.`);

        } catch (error) {
            processedPaymentRef.current = null;
            console.error("Failed to update subscription status:", error);
            setNotification('Error al actualizar tu suscripción. Contacta a soporte.');
        }
      }
    };

    if(userProfile && conjuntoInfo) {
      handlePaymentReturn();
    }
  }, [userProfile, conjuntoInfo]);

  // Package realtime notifications
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

  const handleOpenOnboarding = () => {
    analytics.trackOnboarding('started');
    setShowOnboardingModal(true);
  };

  const handleSelectOption = (optionId: number) => {
    setShowOnboardingModal(false);
    if (optionId === 1) {
      setShowOnboarding(true);
    } else {
      setActiveDetailedTour(optionId);
    }
  };

  const handleDetailedTourComplete = (optionId: number) => {
    onboardingProgress.markComplete(optionId);
    setActiveDetailedTour(null);
    setShowOnboardingModal(true);
  };

  const handleDetailedTourClose = () => {
    setActiveDetailedTour(null);
    setShowOnboardingModal(true);
  };
  
  const handleSaveSetup = async (info: ConjuntoInfo) => {
    if (!userProfile) return;
    
    try {
        await apiService.addConjuntoInfo(info);
        const updatedProfile: UserProfile = { ...userProfile, conjuntoId: info.id, fullName: info.adminName };
        await apiService.updateUserProfile(updatedProfile);

        setUserProfile(updatedProfile);
        setConjuntoInfo(info);
        setIsInitialSetupModalOpen(false);
    } catch (error) {
        console.error("Error saving initial setup:", error);
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

  // Kiosk mode view for security stations
  if (isKioskMode) {
    return (
      <KioskSecurityView
        onStationDisconnect={() => {
          setIsKioskMode(false);
          window.history.pushState({}, '', '/?tab=porteria');
        }}
      />
    );
  }

  // Superadmin view
  if (userProfile && userProfile.role === UserRole.Admin) {
      const superAdminProfile: SuperAdminProfile = { name: userProfile.fullName, email: userProfile.email, role: UserRole.Admin };
      return <SuperAdminDashboard profile={superAdminProfile} onLogout={handleLogout} />;
  }

  // Login view
  if (!userProfile) {
    return (
      <LoginView
        onInternalAuthSuccess={handleInternalAuthSuccess}
        onStationAuthSuccess={() => {
          setIsKioskMode(true);
          window.history.pushState({}, '', '/seguridad/kiosco');
        }}
        onNavigateToKiosk={() => {
          setIsKioskMode(true);
          window.history.pushState({}, '', '/seguridad/kiosco');
        }}
      />
    );
  }
  
  const conjuntoName = conjuntoInfo?.name || "Conjunto Residencial";
  const isConjuntoAdmin = userProfile.role === UserRole.Trial || userProfile.role === UserRole.Subscriber;
  const needsAdminSetup = isConjuntoAdmin && !conjuntoInfo;

  return (
    <>
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

        {!needsAdminSetup && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userProfile={userProfile}
            onSettingsClick={handleSettingsClick}
            onSupportClick={() => setIsHelpModalOpen(true)}
            onTourClick={handleOpenOnboarding}
            conjuntoName={conjuntoName}
          />
        )}

        <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0 overflow-x-hidden w-full ${isChatbotOpen ? 'ml-0 md:ml-[30%]' : 'ml-0'}`}>
          <Header 
              onHelpClick={() => setIsHelpModalOpen(true)} 
              userProfile={userProfile}
              conjuntoInfo={conjuntoInfo} 
              onLogout={handleLogout} 
              onSettingsClick={handleSettingsClick} 
              activeTabName={activeTab}
              isReadOnly={isReadOnly}
          />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 bg-slate-50">
            <div className="max-w-screen-2xl mx-auto w-full">
              {needsAdminSetup ? (
                 <div className="text-center p-10 text-gray-600 bg-white rounded-2xl shadow-sm border border-gray-200">
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
        </div>

        {!needsAdminSetup && isConjuntoAdmin && (
          <BottomNav
            activeTab={activeTab}
            onTabSelect={setActiveTab}
            isConjuntoAdmin={isConjuntoAdmin}
            onSettingsClick={handleSettingsClick}
            onHelpClick={() => setIsHelpModalOpen(true)}
            onStartTour={() => { analytics.trackOnboarding('started'); setShowOnboardingModal(true); }}
          />
        )}
        {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} onStartTour={() => { analytics.trackOnboarding('started'); setIsHelpModalOpen(false); setShowOnboardingModal(true); }} />}
        
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

        <OnboardingModal
          isOpen={showOnboardingModal}
          onClose={() => setShowOnboardingModal(false)}
          onSelectOption={handleSelectOption}
          options={[
            { id: 1, label: 'Tour guiado', description: 'Recorrido general por toda la plataforma', icon: 'play', completed: false, glowing: false },
            ...onboardingProgress.getAll().map(p => ({
              id: p.id,
              label: [
                'Configuraciones Iniciales', 'Base de Datos', 'Áreas Comunes', 'Comunicaciones',
                'Archivos', 'Finanzas', 'Seguridad', 'Vencimientos', 'Tareas'
              ][p.id - 2],
              description: [
                'Configura tu copropiedad y crea usuarios',
                'Crea un nuevo residente o copropietario',
                'Realiza tu primera reserva de área común',
                'Envía tu primer comunicado a residentes',
                'Sube tu primer archivo al repositorio',
                'Agrega un ingreso a la contabilidad',
                'Registra un visitante y un paquete',
                'Agrega un vencimiento importante',
                'Crea una tarea y recibe alertas'
              ][p.id - 2],
              icon: 'check',
              completed: p.completed,
              glowing: !p.completed && onboardingProgress.getNextPending() === p.id,
            }))
          ]}
        />

        <DetailedOnboarding
          optionId={activeDetailedTour}
          onComplete={handleDetailedTourComplete}
          onClose={handleDetailedTourClose}
          userProfile={userProfile}
        />

        {welcomePlanName && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setWelcomePlanName(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                <Icon name="check" className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-800">¡Bienvenido al Plan {welcomePlanName}!</h2>
              <p className="mt-3 text-gray-600">
                Tu pago fue aprobado y tu suscripción ya está activa. Ahora tienes acceso completo a todos los módulos de PAIC para tu copropiedad.
              </p>
              <button
                onClick={() => setWelcomePlanName(null)}
                className="mt-6 w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                ¡Empezar a usar PAIC!
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);

export default App;
