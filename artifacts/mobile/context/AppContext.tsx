import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const JURISDICTIONS = {
  IN: { code: 'IN', name: 'India', currency: '₹' },
  UK: { code: 'UK', name: 'England & Wales', currency: '£' },
  UAE: { code: 'UAE', name: 'United Arab Emirates', currency: 'AED' },
  US: { code: 'US', name: 'United States', currency: '$' },
};

export interface Matter {
  id: string;
  title: string;
}

export interface StoredDocument {
  id: string;
  title: string;
  documentType: string;
  content: string;
  analysisType: string;
  matterId: string | null;
  createdAt: string;
}

interface AppState {
  jurisdiction: string;
  language: string;
  isPremium: boolean;
  activeMatter: Matter | null;
  savedDocuments: StoredDocument[];
  setJurisdiction: (v: string) => void;
  setLanguage: (v: string) => void;
  setActiveMatter: (matter: Matter | null) => void;
  saveDocument: (doc: Omit<StoredDocument, 'id' | 'createdAt'>) => Promise<void>;
}

const AppContext = createContext<AppState>({
  jurisdiction: 'IN',
  language: 'English',
  isPremium: false,
  activeMatter: null,
  savedDocuments: [],
  setJurisdiction: () => {},
  setLanguage: () => {},
  setActiveMatter: () => {},
  saveDocument: async () => {},
});

const STORAGE_KEY = '@lawvise_prefs';
const VAULT_KEY = '@lawvise_vault';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [jurisdiction, setJurisdictionState] = useState('IN');
  const [language, setLanguageState] = useState('English');
  const [isPremium] = useState(false);
  const [activeMatter, setActiveMatter] = useState<Matter | null>(null);
  const [savedDocuments, setSavedDocuments] = useState<StoredDocument[]>([]);

  useEffect(() => {
    // Load preferences & vault items on startup
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        const prefs = JSON.parse(raw);
        if (prefs.jurisdiction) setJurisdictionState(prefs.jurisdiction);
        if (prefs.language) setLanguageState(prefs.language);
      }
    });

    AsyncStorage.getItem(VAULT_KEY).then((raw) => {
      if (raw) {
        try {
          setSavedDocuments(JSON.parse(raw));
        } catch { /* skip */ }
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

  const saveDocument = async (doc: Omit<StoredDocument, 'id' | 'createdAt'>) => {
    const newDoc: StoredDocument = {
      ...doc,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    const updated = [newDoc, ...savedDocuments];
    setSavedDocuments(updated);
    await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(updated));
  };

  return (
    <AppContext.Provider
      value={{
        jurisdiction,
        language,
        isPremium,
        activeMatter,
        savedDocuments,
        setJurisdiction,
        setLanguage,
        setActiveMatter,
        saveDocument,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
