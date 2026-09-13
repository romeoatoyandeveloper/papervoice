import { Caprasimo_400Regular } from '@expo-google-fonts/caprasimo';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import {
  NotoSansArmenian_400Regular,
  NotoSansArmenian_500Medium,
  NotoSansArmenian_600SemiBold,
  NotoSansArmenian_700Bold,
} from '@expo-google-fonts/noto-sans-armenian';
import { setAudioModeAsync } from 'expo-audio';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ScanProvider } from '../src/state/ScanContext';
import { SettingsProvider, useSettings } from '../src/state/SettingsContext';
import { colors } from '../src/theme';

function Navigator() {
  const { loaded } = useSettings();
  const [fontsLoaded, fontError] = useFonts({
    Caprasimo_400Regular,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    NotoSansArmenian_400Regular,
    NotoSansArmenian_500Medium,
    NotoSansArmenian_600SemiBold,
    NotoSansArmenian_700Bold,
  });

  if (!loaded || (!fontsLoaded && !fontError)) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="camera" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen
        name="processing"
        options={{ presentation: 'transparentModal', animation: 'fade', gestureEnabled: false }}
      />
      {/* Sheets animate themselves (see BottomSheet) so the backdrop can stay put. */}
      <Stack.Screen
        name="result"
        options={{ presentation: 'transparentModal', animation: 'none', gestureEnabled: false }}
      />
      <Stack.Screen
        name="settings"
        options={{ presentation: 'transparentModal', animation: 'none', gestureEnabled: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Letters should be audible even with the ringer switch on silent.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' }).catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ScanProvider>
          <StatusBar style="dark" />
          <Navigator />
        </ScanProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
