import React, { useState, useEffect, useCallback } from 'react';
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

  const [notification, setNotification] = useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    supabase.removeAllChannels();
    await supabase.auth.signOut();
    // The onAuthStateChange listener will handle the state cleanup
    setUserProfile(null);
    setConjuntoInfo(null);
    setSelectedAccessPointId(null);
  }, []);

  useEffect(() => {
    setIsLoadingSession(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (!session) {
           setIsLoadingSession(false);
        }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        if (session?.user) {
            let profile = null;
            // Retry fetching the profile to account for potential replication delay or trigger latency.
            for (let i = 0; i < 3; i++) {
                profile = await apiService.fetchUserProfile(session.user.id);
                if (profile) break;
                console.warn(`Profile not found for new user, retrying... Attempt ${i + 1}`);
                await new Promise(res => setTimeout(res, 1000)); // Wait 1 second
            }

            if (profile) {
                setUserProfile(profile);
                if (profile.conjuntoId) {
                    const info = await apiService.fetchConjuntoInfo(profile.conjuntoId);
                    if (info) {
                        setConjuntoInfo(info);
                    } else if (profile.role === UserRole.Trial || profile.role === UserRole.Subscriber) {
                        setIsInitialSetupModalOpen(true);
                    }
                } else if (profile.role === UserRole.Trial || profile.role === UserRole.Subscriber) {
                    setIsInitialSetupModalOpen(true);
                }
            } else {
                console.error("User is logged in but profile data is missing after retries. Logging out.");
                await handleLogout();
            }
        } else {
            setUserProfile(null);
            setConjuntoInfo(null);
        }
        setIsLoadingSession(false);
    });
    
    return () => subscription.unsubscribe();
  }, [handleLogout]);
  
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
    
    // 1. Create/update conjunto info
    await apiService.updateConjuntoInfo(info);
    
    // 2. Update the user's profile with the new conjuntoId
    const updatedProfile: UserProfile = { ...userProfile, conjuntoId: info.id, fullName: info.adminName };
    await apiService.updateUserProfile(updatedProfile);

    // 3. Update local state
    setUserProfile(updatedProfile);
    setConjuntoInfo(info);
    setIsInitialSetupModalOpen(false);
  };


  const handleSaveSettings = async (updatedProfile: UserProfile, updatedConjunto: ConjuntoInfo) => {
    await apiService.updateUserProfile(updatedProfile);
    await apiService.updateConjuntoInfo(updatedConjunto);
    setUserProfile(updatedProfile);
    setConjuntoInfo(updatedConjunto);
    setIsSettingsModalOpen(false);
  };
  
  const handleInternalAuthSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    // You might want to fetch conjuntoInfo here as well if internal users need it
    if (profile.conjuntoId) {
      apiService.fetchConjuntoInfo(profile.conjuntoId).then(info => {
        if (info) setConjuntoInfo(info);
      });
    }
  };

  if (isLoadingSession) {
      return (
        <div className="flex h-screen items-center justify-center">
            <div className="text-center">
                <Icon name="bot" className="w-12 h-12 text-blue-600 animate-pulse mx-auto"/>
                <p className="text-gray-600 mt-2">Cargando PAIC...</p>
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