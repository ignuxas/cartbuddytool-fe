import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const AUTH_COOKIE_NAME = 'cartbuddy_auth_key';
const COOKIE_EXPIRY_DAYS = 7;

interface AuthContextType {
  isAuthenticated: boolean;
  authKey: string | null;
  isLoading: boolean;
  login: (key: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authKey, setAuthKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  const setCookie = (name: string, value: string, days: number) => {
    if (typeof document === 'undefined') return;
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  };

  const removeCookie = (name: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  };

  useEffect(() => {
    const savedKey = getCookie(AUTH_COOKIE_NAME);
    if (savedKey) {
      setAuthKey(savedKey);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = (key: string) => {
    setAuthKey(key);
    setIsAuthenticated(true);
    setCookie(AUTH_COOKIE_NAME, key, COOKIE_EXPIRY_DAYS);
  };

  const logout = () => {
    setAuthKey(null);
    setIsAuthenticated(false);
    removeCookie(AUTH_COOKIE_NAME);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, authKey, isLoading, login, logout }}>
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

// For backwards compatibility
export const useAuthContext = useAuth;

