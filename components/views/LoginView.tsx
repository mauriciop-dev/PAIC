
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Icon } from '../ui/Icon';
import LoginForm from '../LoginForm';
import { PlatformUser } from '../../types';

interface LoginViewProps {
  onInternalAuthSuccess: (user: PlatformUser) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onInternalAuthSuccess }) => {
  const [view, setView] = useState<'admin' | 'internal'>('admin');
  const [error, setError] = useState<string | null>(null);
  const [isMarketingFlow, setIsMarketingFlow] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('source') === 'marketing') {
      setIsMarketingFlow(true);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) setError(error.message);
  };
  
  const TabButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`w-1/2 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
        active ? 'border-blue-600 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );

  const renderAdminView = () => (
    <div className="mt-8 text-center">
      <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
        <svg className="w-5 h-5" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.519-3.356-11.056-7.923l-6.571 4.819C9.656 39.663 16.318 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C41.383 36.641 44 31.023 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
        </svg>
        <span className="text-sm font-medium text-gray-700">Continuar con Google</span>
      </button>
      <p className="text-center text-xs text-gray-500 mt-4">
        {isMarketingFlow
          ? "Crea tu cuenta de prueba o inicia sesión con un solo clic."
          : "Usa tu cuenta de Google para registrarte o iniciar sesión de forma segura."
        }
      </p>
    </div>
  );

  const renderInternalView = () => (
      <div className="mt-8">
          <p className="text-center text-sm text-gray-500 mb-4">
              Tu cuenta es creada por el administrador de tu conjunto.
          </p>
          <LoginForm onAuthSuccess={onInternalAuthSuccess} />
      </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <div className="w-full max-w-md m-auto bg-white rounded-lg border border-gray-200 shadow-md">
        <div className="flex">
            <TabButton active={view === 'admin'} onClick={() => setView('admin')}>Soy Administrador</TabButton>
            <TabButton active={view === 'internal'} onClick={() => setView('internal')}>Soy Personal Interno</TabButton>
        </div>

        <div className="py-8 px-12">
            <div className="flex flex-col items-center">
                <Icon name="bot" className="w-10 h-10 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-800 mt-3 text-center">
                    {view === 'admin' 
                        ? (isMarketingFlow ? 'Empieza tu prueba gratuita de 14 días' : 'Acceso para Administradores')
                        : 'Acceso para Personal'
                    }
                </h1>
            </div>

            {error && <p className="text-sm text-red-600 text-center mt-4">{error}</p>}
            
            {view === 'admin' ? renderAdminView() : renderInternalView()}
        </div>
      </div>
    </div>
  );
};

export default LoginView;