import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import HelpModal from './components/HelpModal';
import InitialSetupModal from './components/InitialSetupModal';
import SettingsModal from './components/SettingsModal';
import LoginView from './components/views/LoginView';
import { Tab, UserProfile, ConjuntoInfo, UserRole } from './types';
import { jwtDecode } from './utils/jwtDecode';
import { Icon } from './components/ui/Icon';
import AccessPointSelectionModal from './components/AccessPointSelectionModal';

// Declarations for Google Identity Services client
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
  const [conjuntoInfo, setConjuntoInfo] = useState<ConjuntoInfo | null>(null);

  useEffect(() => {
    // Check for persisted user session and conjunto info
    const storedUser = localStorage.getItem('paic_userProfile');
    const storedConjunto = localStorage.getItem('paic_conjuntoInfo');
    
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      
      // Compatibility fix for old user profiles without a role.
      if (!parsedUser.role) {
          parsedUser.role = UserRole.Admin;
          localStorage.setItem('paic_userProfile', JSON.stringify(parsedUser));
      }
      
      setUserProfile(parsedUser);

      if(parsedUser.role === UserRole.Guard){
        // Do not automatically show for guard on refresh, assume they already selected.
      }
    }
    if (storedConjunto) {
      setConjuntoInfo(JSON.parse(storedConjunto));
    } else if (storedUser) {
        // If user is logged in but no conjunto info, prompt for setup.
        setIsInitialSetupModalOpen(true);
    }
  }, []);
  
  const handleAuthSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('paic_userProfile', JSON.stringify(profile));
    
    if(profile.role === UserRole.Guard) {
      setIsAccessPointModalOpen(true);
    }

    const storedConjunto = localStorage.getItem('paic_conjuntoInfo');
    if (!storedConjunto && profile.role === UserRole.Admin) {
      setIsInitialSetupModalOpen(true);
    }
  };


  const handleGoogleLoginSuccess = useCallback((credentialResponse: any) => {
    const profileObject: any = jwtDecode(credentialResponse.credential);
    if (!profileObject) {
      console.error("Failed to decode profile from credential response.");
      return;
    }
    const newUserProfile: UserProfile = {
      name: profileObject.name,
      email: profileObject.email,
      picture: profileObject.picture,
      role: UserRole.Admin,
    };
    handleAuthSuccess(newUserProfile);
  }, []);

  const handleLogout = useCallback(() => {
    setUserProfile(null);
    localStorage.removeItem('paic_userProfile');
    if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.disableAutoSelect();
    }
  }, []);

  const handleSaveSetup = (info: ConjuntoInfo) => {
    setConjuntoInfo(info);
    localStorage.setItem('paic_conjuntoInfo', JSON.stringify(info));
    setIsInitialSetupModalOpen(false);
  };

  const handleSaveSettings = (updatedProfile: UserProfile, updatedConjunto: ConjuntoInfo) => {
    setUserProfile(updatedProfile);
    setConjuntoInfo(updatedConjunto);
    localStorage.setItem('paic_userProfile', JSON.stringify(updatedProfile));
    localStorage.setItem('paic_conjuntoInfo', JSON.stringify(updatedConjunto));
    setIsSettingsModalOpen(false);
  };

  if (!userProfile) {
    return <LoginView onAuthSuccess={handleAuthSuccess} onGoogleLoginSuccess={handleGoogleLoginSuccess} />;
  }
  
  const conjuntoName = conjuntoInfo?.name || "Conjunto Residencial";

  return (
    <div className="flex h-screen font-sans text-gray-800 bg-gray-50">
      <Chatbot isOpen={isChatbotOpen} setIsOpen={setIsChatbotOpen} userProfile={userProfile} />
      
      {userProfile.role === UserRole.Admin && (
        <div className={`fixed top-0 left-0 h-full z-20 transition-opacity duration-300 ease-in-out ${isChatbotOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <button
            onClick={() => setIsChatbotOpen(true)}
            className="absolute top-1/2 -translate-y-1/2 left-0 w-8 h-auto bg-blue-600 text-white py-4 px-1 rounded-r-lg shadow-lg hover:bg-blue-700 flex flex-col items-center gap-2 animate-subtle-pulse"
            aria-label="Abrir asistente"
          >
            <Icon name="bot" className="w-6 h-6" />
            <span style={{ writingMode: 'vertical-rl' }} className="font-semibold text-xs tracking-wider">
              ASISTENTE
            </span>
          </button>
        </div>
      )}

      <main className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isChatbotOpen ? 'ml-0 md:ml-[30%]' : (userProfile.role === UserRole.Admin ? 'ml-8' : 'ml-0')}`}>
        <Header 
            onHelpClick={() => setIsHelpModalOpen(true)} 
            userProfile={userProfile} 
            onLogout={handleLogout}
            onSettingsClick={() => setIsSettingsModalOpen(true)}
        />
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Dashboard activeTab={activeTab} setActiveTab={setActiveTab} conjuntoName={conjuntoName} userProfile={userProfile} />
        </div>
        <Footer activeTab={activeTab} setActiveTab={setActiveTab} userProfile={userProfile} />
      </main>

      {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} />}
      {isInitialSetupModalOpen && <InitialSetupModal onClose={() => setIsInitialSetupModalOpen(false)} onSaveSetup={handleSaveSetup} />}
      {isSettingsModalOpen && userProfile.role === UserRole.Admin && conjuntoInfo && (
          <SettingsModal 
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            onSave={handleSaveSettings}
            userProfile={userProfile}
            conjuntoInfo={conjuntoInfo}
          />
      )}
      {isAccessPointModalOpen && (
        <AccessPointSelectionModal 
          isOpen={isAccessPointModalOpen}
          onClose={() => setIsAccessPointModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;