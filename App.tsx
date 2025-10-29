
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import HelpModal from './components/HelpModal';
import InitialSetupModal from './components/InitialSetupModal';
import { Tab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Dashboard);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isInitialSetupModalOpen, setIsInitialSetupModalOpen] = useState(false);

  useEffect(() => {
    // Simulate checking if it's the user's first visit
    const isFirstVisit = !localStorage.getItem('paic_visited');
    if (isFirstVisit) {
      setIsInitialSetupModalOpen(true);
      localStorage.setItem('paic_visited', 'true');
    }
  }, []);

  return (
    <div className="flex h-screen font-sans text-gray-800 bg-gray-50">
      <Chatbot isOpen={isChatbotOpen} setIsOpen={setIsChatbotOpen} />
      
      <main className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isChatbotOpen ? 'ml-0 md:ml-[35%]' : 'ml-4 md:ml-8'}`}>
        <Header onHelpClick={() => setIsHelpModalOpen(true)} />
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
