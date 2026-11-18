import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { DashboardScreen } from '../screens/DashboardScreen';
import { NavigationScreen } from '../screens/NavigationScreen';
import { ProfileSetupScreen } from '../screens/ProfileSetupScreen';
import { ReportObstacleScreen } from '../screens/ReportObstacleScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { VerificationScreen } from '../screens/VerificationScreen';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeProvider';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { colors, reduceMotion } = useTheme();
  const onboarded = useAppStore((s) => s.onboarded);
  const hasUser = useAppStore((s) => s.user !== null);

  // Decidido uma única vez (após a hidratação do store) — evita "pulos" de tela.
  const initialRouteName = useMemo<keyof RootStackParamList>(
    () => (!onboarded ? 'Splash' : !hasUser ? 'ProfileSetup' : 'Dashboard'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const navTheme = useMemo(
    () => ({
      ...DarkTheme,
      colors: { ...DarkTheme.colors, background: colors.bg, card: colors.surface, text: colors.text, border: colors.border, primary: colors.accent },
    }),
    [colors],
  );

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          animation: reduceMotion ? 'none' : 'slide_from_right',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Navigation" component={NavigationScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Verification" component={VerificationScreen} />
        <Stack.Screen name="ReportObstacle" component={ReportObstacleScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
