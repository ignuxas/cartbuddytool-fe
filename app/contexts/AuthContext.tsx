"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { config } from '@/lib/config';
import type { Session } from '@supabase/supabase-js';

export type UserRole = 'super_admin' | 'user';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  created_at?: string;
  refine_ai_daily_limit?: number;
  refine_ai_remaining?: number;
  projects?: string[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: Session | null;
  user: AppUser | null;
  accessToken: string | null;
  /** @deprecated Use accessToken instead */
  authKey: string | null;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string) => Promise<{ error?: string; requiresConfirmation?: boolean }>;
  loginWithGoogle: () => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (token: string): Promise<AppUser | null> => {
    try {
      const res = await fetch(`${config.serverUrl}/api/auth/me/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        return data.user as AppUser;
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
    return null;
  }, []);

  const handleSession = useCallback(async (newSession: Session | null) => {
    setSession(newSession);
    if (newSession?.access_token) {
      const profile = await fetchProfile(newSession.access_token);
      setUser(profile);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      handleSession(initialSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        await handleSession(newSession);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return {};
    } catch (e: any) {
      return { error: e.message || 'Login failed' };
    }
  };

  const register = async (email: string, password: string): Promise<{ error?: string; requiresConfirmation?: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (data.user && !data.session) return { requiresConfirmation: true };
      return {};
    } catch (e: any) {
      return { error: e.message || 'Registration failed' };
    }
  };

  const loginWithGoogle = async (): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) return { error: error.message };
      return {};
    } catch (e: any) {
      return { error: e.message || 'Google login failed' };
    }
  };

  const logout = async () => {
    if (session?.access_token) {
      try {
        await fetch(`${config.serverUrl}/api/auth/logout/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (e) { /* ignore */ }
    }
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (session?.access_token) {
      const profile = await fetchProfile(session.access_token);
      if (profile) setUser(profile);
    }
  };

  const isAuthenticated = !!session && !!user;
  const accessToken = session?.access_token || null;
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        session,
        user,
        accessToken,
        authKey: accessToken, // backward compat
        isSuperAdmin,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Backward compatibility
export const useAuthContext = useAuth;
