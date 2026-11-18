import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Splash: undefined;
  ProfileSetup: { editing?: boolean } | undefined;
  Dashboard: undefined;
  Navigation: { spotId: string; phase: 'drive' | 'walk' };
  Verification: { spotId: string };
  ReportObstacle: { sectorId?: string; edgeId?: string } | undefined;
  Settings: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
