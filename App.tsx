
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import HelpModal from './components/HelpModal';
import InitialSetupModal from './components/InitialSetupModal';
import LoginView from './components/views/LoginView';
import { Tab, UserProfile } from './types';
import { jwtDecode } from './utils/jwtDecode';
import { Icon } from './components/ui/Icon';

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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [conjuntoName, setConjuntoName] = useState<string>("Conjunto Residencial 'El Mirador'");

  useEffect(() => {
    // Check for persisted user session
    const storedUser = localStorage.getItem('paic_userProfile');
    if (storedUser) {
      setUserProfile(JSON.parse(storedUser));
    }
  }, []);

  const handleLoginSuccess = useCallback((credentialResponse: any) => {
    const profileObject: any = jwtDecode(credentialResponse.credential);
    if (!profileObject) {
      console.error("Failed to decode profile from credential response.");
      return;
    }
    const newUserProfile: UserProfile = {
      name: profileObject.name,
      email: profileObject.email,
      picture: profileObject.picture,
    };
    setUserProfile(newUserProfile);
    localStorage.setItem('paic_userProfile', JSON.stringify(newUserProfile));

    // Optional: show initial setup only after first login
    const isFirstVisit = !localStorage.getItem('paic_visited');
    if (isFirstVisit) {
      setIsInitialSetupModalOpen(true);
      localStorage.setItem('paic_visited', 'true');
    }
  }, []);

  const handleLogout = useCallback(() => {
    setUserProfile(null);
    localStorage.removeItem('paic_userProfile');
    // It's good practice to also disable one-tap sign-in for a while after logout
    if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.disableAutoSelect();
    }
  }, []);

  if (!userProfile) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen font-sans text-gray-800 bg-gray-50">
      <Chatbot isOpen={isChatbotOpen} setIsOpen={setIsChatbotOpen} userProfile={userProfile} />
      
      {/* Trigger for the chatbot */}
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

      <main className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isChatbotOpen ? 'ml-0 md:ml-[30%]' : 'ml-8'}`}>
        <Header onHelpClick={() => setIsHelpModalOpen(true)} userProfile={userProfile} onLogout={handleLogout} />
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Dashboard activeTab={activeTab} conjuntoName={conjuntoName} />
        </div>
        <Footer activeTab={activeTab} setActiveTab={setActiveTab} />
      </main>

      {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} />}
      {isInitialSetupModalOpen && <InitialSetupModal onClose={() => setIsInitialSetupModalOpen(false)} />}
    </div>
  );
};

export default App;
