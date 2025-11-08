import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Icon } from '../ui/Icon';

const LoginView: React.FC = () => {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // For sign-up
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      if (isSigningUp) {
        // Sign Up for Admins
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              // The trigger will set the role to 'trial'
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setMessage('¡Registro exitoso! Por favor, revisa tu correo para confirmar tu cuenta.');
      } else {
        // Sign In for Internal Staff
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // onAuthStateChange in App.tsx will handle the navigation
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <div className="w-full max-w-md m-auto bg-white rounded-lg border border-gray-200 shadow-md py-10 px-12">
        <div className="flex flex-col items-center">
          <Icon name="bot" className="w-12 h-12 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800 mt-4">
            {isSigningUp ? 'Crea tu Cuenta de Administrador' : 'Bienvenido a PAIC'}
          </h1>
          <p className="text-gray-600 mt-2 text-center">
            {isSigningUp 
              ? 'Únete para empezar a gestionar tu conjunto.' 
              : 'Inicia sesión para acceder a tu panel.'}
          </p>
        </div>

        <div className="mt-8">
          <form onSubmit={handleAuthAction} className="space-y-4">
            {isSigningUp && (
              <div>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombre Completo" className="w-full p-3 border border-gray-300 rounded-lg" required />
              </div>
            )}
            <div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" className="w-full p-3 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" className="w-full p-3 border border-gray-300 rounded-lg" required />
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            {message && <p className="text-sm text-green-600 text-center">{message}</p>}
            <button type="submit" disabled={isLoading} className="w-full p-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center gap-2">
              <Icon name="log-in" className="w-5 h-5" />
              {isLoading ? 'Procesando...' : (isSigningUp ? 'Registrarse' : 'Iniciar Sesión')}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">O</span>
              </div>
            </div>
            <button onClick={handleGoogleSignIn} className="w-full mt-6 flex items-center justify-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.519-3.356-11.056-7.923l-6.571 4.819C9.656 39.663 16.318 44 24 44z"></path>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C41.383 36.641 44 31.023 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
              </svg>
              <span className="text-sm font-medium text-gray-700">Continuar como Administrador con Google</span>
            </button>
          </div>

          <div className="mt-8 text-center text-sm">
            <button onClick={() => { setIsSigningUp(!isSigningUp); setError(null); setMessage(null); }} className="font-medium text-blue-600 hover:underline">
              {isSigningUp ? '¿Ya tienes una cuenta? Inicia Sesión' : '¿Eres un administrador nuevo? Regístrate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;