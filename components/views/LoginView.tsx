import React, { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../../config';
import { Icon } from '../ui/Icon';

interface LoginViewProps {
  onLoginSuccess: (credentialResponse: any) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);

    const initializeGoogleSignIn = () => {
      if (window.google && googleButtonRef.current && googleButtonRef.current.childElementCount === 0) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: onLoginSuccess,
        });
        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', logo_alignment: 'left', width: '280' }
        );
      }
    };

    if (document.getElementById('google-identity-script')) {
      initializeGoogleSignIn();
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleSignIn;
    
    document.body.appendChild(script);

  }, [onLoginSuccess]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 font-sans p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="p-8 bg-white rounded-xl shadow-lg text-center space-y-6">
            <div className="flex justify-center">
                <div className="p-3 bg-blue-100 rounded-full">
                    <Icon name="bot" className="w-10 h-10 text-blue-600" />
                </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Bienvenido a PAIC</h1>
            <p className="text-gray-600">
              Tu Plataforma de Administración Inteligente de Conjuntos. Por favor, inicia sesión para continuar.
            </p>
            <div className="flex justify-center pt-2">
                <div ref={googleButtonRef}></div>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg">
            <details className="p-6">
                <summary className="font-semibold text-gray-700 cursor-pointer flex justify-between items-center">
                    ¿Problemas para iniciar sesión? (Error `origin_mismatch`)
                    <span className="text-gray-500 transform transition-transform duration-300 chevron-rotate">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </span>
                </summary>
                <div className="mt-4 text-left text-sm text-gray-600 space-y-3">
                    <p>
                      Si ves un error <code className="text-xs bg-red-100 text-red-700 p-1 rounded">origin_mismatch</code>, significa que necesitas autorizar la URL de esta vista previa en tu configuración de Google Cloud.
                    </p>
                    <p className="font-medium text-gray-700">1. Copia esta URL:</p>
                    <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-md">
                        <input 
                            type="text" 
                            value={origin} 
                            readOnly 
                            className="flex-grow bg-transparent text-gray-800 font-mono text-xs focus:outline-none"
                        />
                        <button onClick={copyToClipboard} className="text-xs text-blue-600 hover:underline font-semibold w-16 text-right">
                            {copied ? '¡Copiado!' : 'Copiar'}
                        </button>
                    </div>
                    <p className="font-medium text-gray-700">2. Agrégala a tus "Orígenes de JavaScript autorizados" en:</p>
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                        https://console.cloud.google.com/apis/credentials
                    </a>
                    <p className="text-xs text-gray-500 pt-2">
                        Después de agregarla y guardar, espera un minuto y vuelve a intentar iniciar sesión.
                    </p>
                </div>
            </details>
        </div>
      </div>
    </div>
  );
};

export default LoginView;