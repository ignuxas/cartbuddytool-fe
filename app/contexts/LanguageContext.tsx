"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from '../i18n/en.json';
import lt from '../i18n/lt.json';

type Language = 'en' | 'lt';
type Translations = typeof en;

// Helper to access nested keys using dot notation (e.g., 'common.dashboard')
const getNestedValue = (obj: any, key: string): string => {
  return key.split('.').reduce((o, i) => (o ? o[i] : null), obj) as string || key;
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Translations> = {
  en,
  lt,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'lt')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    const currentTranslations = translations[language];
    return getNestedValue(currentTranslations, key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
