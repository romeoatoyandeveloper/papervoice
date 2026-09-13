import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DEFAULT_VOICE, type VoiceGender } from '../config';

const VOICE_KEY = 'selectedVoice';

interface Settings {
  loaded: boolean;
  voice: VoiceGender;
  setVoice: (voice: VoiceGender) => void;
}

const SettingsContext = createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [voice, setVoiceState] = useState<VoiceGender>(DEFAULT_VOICE);

  useEffect(() => {
    AsyncStorage.getItem(VOICE_KEY)
      .then((v) => {
        if (v === 'male' || v === 'female') setVoiceState(v);
      })
      .catch((e) => __DEV__ && console.warn('AsyncStorage read failed', e))
      .finally(() => setLoaded(true));
  }, []);

  const setVoice = useCallback((v: VoiceGender) => {
    setVoiceState(v);
    AsyncStorage.setItem(VOICE_KEY, v).catch((e) => __DEV__ && console.warn('AsyncStorage write failed', e));
  }, []);

  const value = useMemo(() => ({ loaded, voice, setVoice }), [loaded, voice, setVoice]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
