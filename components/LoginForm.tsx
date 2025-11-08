import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { apiService } from '../services/apiService';
import { Icon } from './ui/Icon';

interface LoginFormProps {
    onAuthSuccess: (userProfile: UserProfile) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onAuthSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            // FIX: Property 'authenticateUser' does not exist on type 'apiService'. This method is now implemented in apiService.
            const user = await apiService.authenticateUser(email, password);
            if (user) {
                // FIX: Object literal may only specify known properties, and 'name' does not exist in type 'UserProfile'.
                // Map the internal PlatformUser to the app's UserProfile state shape.
                const userProfile: UserProfile = {
                    id: `internal-${user.id}`, // Internal users don't have UUIDs, creating a unique string ID
                    fullName: user.name,
                    email: user.email,
                    role: UserRole.Internal, // All platform users are considered 'Internal' in the main app state
                    conjuntoId: user.conjuntoId
                };
                onAuthSuccess(userProfile);
            } else {
                setError('Correo o contraseña incorrectos.');
            }
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleLogin} className="space-y-4 pt-2">
            <div>
                <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="Correo electrónico" 
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                    required 
                />
            </div>
            <div>
                <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Contraseña" 
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                    required 
                />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full p-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center gap-2">
                <Icon name="log-in" className="w-5 h-5" />
                {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
        </form>
    );
};

export default LoginForm;