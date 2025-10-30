import React, { useEffect, useRef } from 'react';

// FIX: Add global type for window.google to satisfy TypeScript compiler
declare global {
  interface Window {
    google: any;
  }
}

interface LoginViewProps {
  onLoginSuccess: (credentialResponse: any) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if the Google script has loaded
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.initialize({
        client_id: "455424573082-1r6qhqsg02npac6q41o1ib14p2a1adb6.apps.googleusercontent.com",
        callback: onLoginSuccess,
      });

      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular' }
        );
      }
      
      // Display the one-tap dialog for returning users
      window.google.accounts.id.prompt(); 
    }
  }, [onLoginSuccess]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md text-center max-w-sm mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-gray-800">Bienvenido a PAIC</h1>
        <p className="text-gray-600 mb-6">Inicia sesión con tu cuenta de Google para administrar tu conjunto residencial.</p>
        <div ref={googleButtonRef} className="flex justify-center"></div>
      </div>
    </div>
  );
};

export default LoginView;