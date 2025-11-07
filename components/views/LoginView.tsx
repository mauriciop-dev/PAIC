import React, { useEffect, useRef, useState } from 'react';
import { UserProfile } from '../../types';
import LoginForm from '../LoginForm';
import { Icon } from '../ui/Icon';
import { GOOGLE_CLIENT_ID } from '../../config';

declare global {
  interface Window {
    google: any;
  }
}

interface LoginViewProps {
  onAuthSuccess: (profile: UserProfile) => void;
  onGoogleLoginSuccess: (credentialResponse: any) => void;
}

type LoginType = 'Administrador' | 'Personal';

const LoginView: React.FC<LoginViewProps> = ({ onAuthSuccess, onGoogleLoginSuccess }) => {
  const [loginType, setLoginType] = useState<LoginType>('Administrador');
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [isGoogleScriptLoaded, setIsGoogleScriptLoaded] = useState(false);

  useEffect(() => {
    if (window.google?.accounts?.id) {
        setIsGoogleScriptLoaded(true);
    } else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            setIsGoogleScriptLoaded(true);
        };
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }
  }, []);

  useEffect(() => {
    if (isGoogleScriptLoaded && googleButtonRef.current) {
        try {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: onGoogleLoginSuccess,
            });
            window.google.accounts.id.renderButton(
                googleButtonRef.current,
                { theme: 'outline', size: 'large', type: 'standard', text: 'signin_with', shape: 'pill', locale: 'es' }
            );
        } catch (error) {
            console.error("Error initializing or rendering Google button:", error);
        }
    }
  }, [isGoogleScriptLoaded, onGoogleLoginSuccess]);


  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <div className="w-full max-w-md m-auto bg-white rounded-lg border border-gray-200 shadow-md py-10 px-12">
        <div className="flex flex-col items-center">
            <Icon name="bot" className="w-12 h-12 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800 mt-4">Bienvenido a PAIC</h1>
        </div>
        
        <div className="mt-8">
            <div className="p-1 bg-gray-100 rounded-full flex">
                <button
                    onClick={() => setLoginType('Administrador')}
                    className={`w-1/2 py-2 text-sm font-semibold rounded-full transition-colors ${loginType === 'Administrador' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}
                >
                    Administrador
                </button>
                <button
                    onClick={() => setLoginType('Personal')}
                    className={`w-1/2 py-2 text-sm font-semibold rounded-full transition-colors ${loginType === 'Personal' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}
                >
                    Personal
                </button>
            </div>
        </div>
        
        <div className="mt-6">
            <div style={{ display: loginType === 'Administrador' ? 'block' : 'none' }}>
                <div className="text-center">
                    <p className="text-gray-600 mb-4">Inicia sesión con tu cuenta de Google para acceder al panel de administrador.</p>
                    <div id="google-signin-button" ref={googleButtonRef} className="flex justify-center"></div>
                </div>
            </div>

            <div style={{ display: loginType === 'Personal' ? 'block' : 'none' }}>
                <LoginForm onAuthSuccess={onAuthSuccess} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;