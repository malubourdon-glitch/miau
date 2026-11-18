import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AccessibleButton } from '../components/AccessibleButton';
import { AppText } from '../components/AppText';
import { Icon, IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { ScreenProps } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeProvider';

const HIGHLIGHTS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'access-point', title: 'Vagas em tempo real', text: 'Sensores IoT mostram vagas prioritárias livres antes de você chegar.' },
  { icon: 'map-marker-path', title: 'Rotas sem barreiras', text: 'Caminhos sem degraus, com desvio automático de elevadores parados e bloqueios.' },
  { icon: 'shield-check', title: 'Vaga protegida', text: 'Credencial digital validada evita o uso irregular das vagas prioritárias.' },
];

export function SplashScreen({ navigation }: ScreenProps<'Splash'>) {
  const { colors, spacing, reduceMotion } = useTheme();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const hasUser = useAppStore((s) => s.user !== null);
  const pulse = useRef(new Animated.Value(0)).current;
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSystemReduceMotion).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (reduceMotion || systemReduceMotion) return;
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion, systemReduceMotion]);

  const enter = () => {
    completeOnboarding();
    navigation.replace(hasUser ? 'Dashboard' : 'ProfileSetup');
  };

  return (
    <Screen
      footer={
        <AccessibleButton
          label="Entrar agora"
          icon="arrow-right-top"
          onPress={enter}
          hint="Abre a configuração do seu perfil de acessibilidade"
        />
      }
    >
      <View style={[styles.hero, { marginTop: spacing.xl }]}>
        <View style={styles.logoWrap} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Animated.View
            style={[
              styles.pulse,
              {
                borderColor: colors.accent,
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.6] }) }],
              },
            ]}
          />
          <Svg width={120} height={120} viewBox="0 0 120 120">
            <Circle cx={60} cy={60} r={56} fill={colors.surface} stroke={colors.accent} strokeWidth={4} />
            {/* "P" estilizado com rota */}
            <Path d="M44 88 V32 h22 a16 16 0 0 1 0 32 h-22" fill="none" stroke={colors.accent} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={82} cy={84} r={7} fill={colors.priority} />
            <Path d="M66 64 Q78 70 82 84" fill="none" stroke={colors.priority} strokeWidth={3} strokeDasharray="2 5" strokeLinecap="round" />
          </Svg>
        </View>
        <AppText variant="display" center accessibilityRole="header">
          Spot<AppText variant="display" tone="accent">Finder</AppText>
        </AppText>
        <AppText variant="title" tone="muted" center weight="500">
          Acessibilidade que encontra caminhos.
        </AppText>
      </View>

      <View style={{ gap: spacing.md }}>
        {HIGHLIGHTS.map((h) => (
          <View
            key={h.title}
            accessible
            accessibilityLabel={`${h.title}. ${h.text}`}
            style={[styles.highlight, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.hIcon, { backgroundColor: colors.accentSoft }]}>
              <Icon name={h.icon} size={28} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyLarge" weight="700">
                {h.title}
              </AppText>
              <AppText variant="caption" tone="muted">
                {h.text}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 12 },
  logoWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  pulse: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 3 },
  highlight: { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1.5 },
  hIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
