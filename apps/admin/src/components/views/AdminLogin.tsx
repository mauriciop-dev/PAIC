import React, { useState } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Button, Input, Card } from '@paic/ui';
import { Icon } from '@paic/ui';

export function AdminLogin() {
  const { signIn, isLoading: authLoading } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center mx-auto mb-4">
            <Icon name="shield-check" className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PAIC Admin</h1>
          <p className="mt-2 text-gray-500">Consola de Superadministración</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@paicai.com.co"
              required
              autoComplete="email"
              disabled={isLoading || authLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={isLoading || authLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading || authLoading}
            variant="primary"
          >
            {isLoading || authLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Iniciando sesión...
              </span>
            ) : (
              'Acceder a la Consola'
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            Solo para superadministradores de la plataforma PAIC
          </p>
        </div>
      </Card>
    </div>
  );
}