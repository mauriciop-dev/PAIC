import React, { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../../config';
import { Icon } from '../ui/Icon';
import { UserProfile, SuperAdminProfile, UserRole } from '../../types';
import { apiService } from '../../services/apiService';

interface LoginViewProps {
  onAuthSuccess: (userProfile: UserProfile) => void;
  onGoogleLoginSuccess: (credentialResponse: any) => void;
  onSuperAdminLogin: (profile: SuperAdminProfile) => void;
}

type LoginMode = 'admin' | 'staff' | 'superadmin';

const LoginView: React.FC<LoginViewProps> = ({ onAuthSuccess, onGoogleLoginSuccess, onSuperAdminLogin }) => {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>('admin');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);

    const initializeGoogleSignIn = () => {
      if (window.google && googleButtonRef.current && googleButtonRef.current.childElementCount === 0) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: onGoogleLoginSuccess,
        });
        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', logo_alignment: 'left', width: '280' }
        );
      }
    };

    if (loginMode === 'admin') {
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
    }
  }, [onGoogleLoginSuccess, loginMode]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);
      try {
          if (loginMode === 'superadmin') {
              const admin = await apiService.authenticateSuperAdmin(email, password);
              if (admin) {
                  onSuperAdminLogin(admin);
              } else {
                  setError('Credenciales de SuperAdmin incorrectas.');
              }
          } else { // staff login
              const user = await apiService.authenticateUser(email, password);
              if (user) {
                  const userProfile: UserProfile = { name: user.name, email: user.email, role: user.role, conjuntoId: user.conjuntoId };
                  onAuthSuccess(userProfile);
              } else {
                  setError('Correo o contraseña incorrectos.');
              }
          }
      } catch (err) {
          setError('Ocurrió un error. Inténtalo de nuevo.');
      } finally {
          setIsLoading(false);
      }
  };
  
  const LoginForm = ({ title }: {title: string}) => (
       <form onSubmit={handleLogin} className="space-y-4 pt-2">
            <div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" className="w-full p-3 border border-gray-300 rounded-lg" required />
            </div>
            <div>
                 <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" className="w-full p-3 border border-gray-300 rounded-lg" required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full p-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center gap-2">
                <Icon name="log-in" className="w-5 h-5" />
                {isLoading ? 'Ingresando...' : title}
            </button>
        </form>
  )

  const renderContent = () => {
      switch(loginMode) {
          case 'admin':
              return (
                <>
                    <p className="text-gray-600">Inicia sesión con tu cuenta de Google para acceder al panel de administrador de tu conjunto.</p>
                    <div className="flex justify-center pt-2"><div ref={googleButtonRef}></div></div>
                </>
              );
          case 'staff':
              return (
                <>
                    <p className="text-gray-600">Ingresa con tus credenciales de personal para acceder a tus funciones.</p>
                    <LoginForm title="Iniciar Sesión" />
                </>
              );
          case 'superadmin':
               return (
                <>
                    <p className="text-gray-600">Acceso exclusivo para la administración de la plataforma PAIC.</p>
                    <LoginForm title="Acceder a Plataforma" />
                </>
              );
      }
  }


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
            
            <div className="bg-gray-100 p-1 rounded-full flex flex-col sm:flex-row">
                <button onClick={() => setLoginMode('admin')} className={`w-full sm:w-1/3 p-2 rounded-full font-semibold text-sm transition-colors ${loginMode === 'admin' ? 'bg-white shadow text-blue-700' : 'text-gray-600'}`}>Administrador</button>
                <button onClick={() => setLoginMode('staff')} className={`w-full sm:w-1/3 p-2 rounded-full font-semibold text-sm transition-colors ${loginMode === 'staff' ? 'bg-white shadow text-blue-700' : 'text-gray-600'}`}>Personal</button>
                <button onClick={() => setLoginMode('superadmin')} className={`w-full sm:w-1/3 p-2 rounded-full font-semibold text-sm transition-colors ${loginMode === 'superadmin' ? 'bg-white shadow text-purple-700' : 'text-gray-600'}`}>Plataforma</button>
            </div>
            
            {renderContent()}
        </div>

        {loginMode === 'admin' && (
            <div className="bg-white rounded-xl shadow-lg">
                <details className="p-6">
                    <summary className="font-semibold text-gray-700 cursor-pointer flex justify-between items-center">
                        ¿Problemas para iniciar sesión? (Error `origin_mismatch`)
                        <span className="text-gray-500 transform transition-transform duration-300 chevron-rotate">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </span>
                    </summary>
                    <div className="mt-4 text-left text-sm text-gray-600 space-y-3">
                        <p>Si ves un error <code className="text-xs bg-red-100 text-red-700 p-1 rounded">origin_mismatch</code>, significa que necesitas autorizar la URL de esta vista previa en tu configuración de Google Cloud.</p>
                        <p className="font-medium text-gray-700">1. Copia esta URL:</p>
                        <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-md">
                            <input type="text" value={origin} readOnly className="flex-grow bg-transparent text-gray-800 font-mono text-xs focus:outline-none" />
                            <button onClick={copyToClipboard} className="text-xs text-blue-600 hover:underline font-semibold w-16 text-right">{copied ? '¡Copiado!' : 'Copiar'}</button>
                        </div>
                        <p className="font-medium text-gray-700">2. Agrégala a tus "Orígenes de JavaScript autorizados" en:</p>
                        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">https://console.cloud.google.com/apis/credentials</a>
                    </div>
                </details>
            </div>
        )}
      </div>
    </div>
  );
};

export default LoginView;