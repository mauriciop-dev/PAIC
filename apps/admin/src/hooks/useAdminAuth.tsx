import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@paic/supabase';
import { SuperAdminProfile } from '../types';
import { Session, User } from '@supabase/supabase-js';

interface AdminAuthContextType {
  user: SuperAdminProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SuperAdminProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      if (currentSession?.user) {
        // Verificar si es superadmin en la tabla de perfiles
        const { data: profile } = await supabase
          .from('platform_admins')
          .select('*')
          .eq('user_id', currentSession.user.id)
          .single();

        if (profile) {
          setUser({
            id: profile.id,
            user_id: profile.user_id,
            email: currentSession.user.email || '',
            nombre: profile.nombre,
            rol: profile.rol,
            permisos: profile.permisos,
            created_at: profile.created_at,
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error refreshing admin user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      refreshUser();
    });

    return () => subscription.unsubscribe();
  }, [refreshUser]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: new Error(error.message) };
    return { error: null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://admin.paicai.com.co/auth/callback',
      },
    });
    if (error) return { error: new Error(error.message) };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AdminAuthContext.Provider value={{
      user,
      session,
      isAuthenticated: !!user,
      isLoading,
      signIn,
      signInWithGoogle,
      signOut,
      refreshUser,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}