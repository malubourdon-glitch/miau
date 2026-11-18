import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSensorFeed } from './src/hooks/useSensorFeed';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppStore } from './src/store/useAppStore';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { darkPalette } from './src/theme/tokens';

function useHydrated() {
  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAppStore.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}

function SensorBridge() {
  useSensorFeed();
  return null;
}

export default function App() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: darkPalette.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={darkPalette.accent} size="large" accessibilityLabel="Carregando SpotFinder" />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SensorBridge />
        <RootNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
