import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface Settings {
  site_name: string;
  site_tagline: string;
  hero_title: string;
  hero_description: string;
  total_institutions: string;
  methodology_content: any;
  contact_email: string;
  [key: string]: any;
}

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  site_name: 'SociaLearn Index',
  site_tagline: 'The Global Benchmark for Digital Influence in Higher Education',
  hero_title: 'Ranking Universities by Social Media Influence',
  hero_description: 'Transparent, data-backed rankings of universities based on social media presence, engagement, and digital influence across all major platforms.',
  total_institutions: '500+',
  methodology_content: {},
  contact_email: 'hello@sociallearn-index.com',
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await apiService.get('/settings/public');
      if (response.success) {
        setSettings({ ...defaultSettings, ...response.data });
      } else {
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = async () => {
    setLoading(true);
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const value: SettingsContextType = {
    settings,
    loading,
    refreshSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
