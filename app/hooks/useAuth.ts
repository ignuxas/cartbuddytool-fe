import { useState, useEffect } from 'react';

const AUTH_COOKIE_NAME = 'cartbuddy_auth_key';
const COOKIE_EXPIRY_DAYS = 7;

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authKey, setAuthKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Get cookie value
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  // Set cookie with expiry
  const setCookie = (name: string, value: string, days: number) => {
    if (typeof document === 'undefined') return;
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  };

  // Remove cookie
  const removeCookie = (name: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  };

  // Check authentication status on mount
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
    setAuthKey('');
    setIsAuthenticated(false);
    removeCookie(AUTH_COOKIE_NAME);
  };

  return {
    isAuthenticated,
    authKey,
    isLoading,
    login,
    logout
  };
}
