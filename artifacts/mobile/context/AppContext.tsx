import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  jurisdiction: string;
  language: string;
  isPremium: boolean;
  setJurisdiction: (v: string) => void;
  setLanguage: (v: string) => void;
}

const AppContext = createContext<AppState>({
  jurisdiction: 'India',
  language: 'English',
  isPremium: false,
  setJurisdiction: () => {},
  setLanguage: () => {},
});

const STORAGE_KEY = '@lawvise_prefs';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [jurisdiction, setJurisdictionState] = useState('India');
  const [language, setLanguageState] = useState('English');
  const [isPremium] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        const prefs = JSON.parse(raw);
        if (prefs.jurisdiction) setJurisdictionState(prefs.jurisdiction);
        if (prefs.language) setLanguageState(prefs.language);
      }
    });
  }, []);

  const save = (update: Partial<{ jurisdiction: string; language: string }>) => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const existing = raw ? JSON.parse(raw) : {};
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...update }));
    });
  };

  const setJurisdiction = (v: string) => {
    setJurisdictionState(v);
    save({ jurisdiction: v });
  };

  const setLanguage = (v: string) => {
    setLanguageState(v);
    save({ language: v });
  };

  return (
    <AppContext.Provider value={{ jurisdiction, language, isPremium, setJurisdiction, setLanguage }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
