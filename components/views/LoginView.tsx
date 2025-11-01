import React, { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../../config';
import { Icon } from '../ui/Icon';
import { UserProfile, SuperAdminProfile, UserRole } from '../../types';
import { apiService } from '../../services/apiService';

interface LoginViewProps {
  onAuthSuccess: (userProfile: UserProfile) => void;
  onGoogleLoginSuccess: (credentialResponse: any) => void;
}

type LoginMode = 'admin' | 'staff';

const LoginView: React.FC<LoginViewProps> = ({ onAuthSuccess, onGoogleLoginSuccess }) => {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [loginMode, setLoginMode] = useState<LoginMode>('admin');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
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

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);
      try {
          const user = await apiService.authenticateUser(email, password);
          if (user) {
              const userProfile: UserProfile = { name: user.name, email: user.email, role: user.role, conjuntoId: user.conjuntoId };
              onAuthSuccess(userProfile);
          } else {
              setError('Correo o contraseña incorrectos.');
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
                    <p className="text-gray-600">Inicia sesión con tu cuenta de Google para acceder al panel de administrador.</p>
                    <div className="flex justify-center pt-4"><div ref={googleButtonRef}></div></div>
                </>
              );
          case 'staff':
              return (
                <>
                    <p className="text-gray-600">Ingresa con tus credenciales de personal para acceder a tus funciones.</p>
                    <LoginForm title="Iniciar Sesión" />
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
            
            <div className="bg-gray-100 p-1 rounded-full flex">
                <button onClick={() => setLoginMode('admin')} className={`w-1/2 p-2 rounded-full font-semibold text-sm transition-colors ${loginMode === 'admin' ? 'bg-white shadow text-blue-700' : 'text-gray-600'}`}>Administrador</button>
                <button onClick={() => setLoginMode('staff')} className={`w-1/2 p-2 rounded-full font-semibold text-sm transition-colors ${loginMode === 'staff' ? 'bg-white shadow text-blue-700' : 'text-gray-600'}`}>Personal</button>
            </div>
            
            {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default LoginView;
