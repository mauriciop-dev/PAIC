import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import HelpModal from './components/HelpModal';
import InitialSetupModal from './components/InitialSetupModal';
import LoginView from './components/views/LoginView';
import { Tab, UserProfile } from './types';
import { jwtDecode } from './utils/jwtDecode';

// FIX: Add global type for window.google to satisfy TypeScript compiler and fix errors on lines 49-50.
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

  useEffect(() => {
    // Check for persisted user session
    const storedUser = localStorage.getItem('paic_userProfile');
    if (storedUser) {
      setUserProfile(JSON.parse(storedUser));
    }
  }, []);

  const handleLoginSuccess = (credentialResponse: any) => {
    const profileObject: any = jwtDecode(credentialResponse.credential);
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
  };

  const handleLogout = () => {
    setUserProfile(null);
    localStorage.removeItem('paic_userProfile');
    // It's good practice to also disable one-tap sign-in for a while after logout
    if (window.google) {
        window.google.accounts.id.disableAutoSelect();
    }
  };

  if (!userProfile) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen font-sans text-gray-800 bg-gray-50">
      <Chatbot isOpen={isChatbotOpen} setIsOpen={setIsChatbotOpen} userProfile={userProfile} />
      
      <main className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isChatbotOpen ? 'ml-0 md:ml-[35%]' : 'ml-4 md:ml-8'}`}>
        <Header onHelpClick={() => setIsHelpModalOpen(true)} userProfile={userProfile} onLogout={handleLogout} />
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Dashboard activeTab={activeTab} />
        </div>
        <Footer activeTab={activeTab} setActiveTab={setActiveTab} />
      </main>

      {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} />}
      {isInitialSetupModalOpen && <InitialSetupModal onClose={() => setIsInitialSetupModalOpen(false)} />}
    </div>
  );
};

export default App;