import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { AccessibleButton } from '../components/AccessibleButton';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { Icon, IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { ACCESSIBILITY_PROFILES } from '../data/profiles';
import { ScreenProps } from '../navigation/types';
import { announce } from '../services/voice/voiceGuide';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeProvider';
import { FONT_SCALE_MAX, FONT_SCALE_MIN, FONT_SCALE_STEP } from '../theme/tokens';
import { A11ySettings } from '../types/user';

export function SettingsScreen({ navigation }: ScreenProps<'Settings'>) {
  const { colors, spacing } = useTheme();
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const user = useAppStore((s) => s.user);
  const signOut = useAppStore((s) => s.signOut);
  const pct = Math.round(settings.fontScale * 100);

  const toggle = (key: keyof Omit<A11ySettings, 'fontScale'>, title: string, description: string, icon: IconName) => (
    <View style={[styles.toggleRow, { borderColor: colors.border }]}>
      <Icon name={icon} size={28} color={colors.accent} />
      <View style={styles.flex}>
        <AppText weight="700">{title}</AppText>
        <AppText variant="caption" tone="muted">
          {description}
        </AppText>
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityHint={description}
        value={settings[key]}
        onValueChange={(v) => update({ [key]: v })}
        trackColor={{ true: colors.accent, false: colors.metal }}
        thumbColor={colors.text}
        style={{ transform: [{ scale: 1.2 }] }}
      />
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title="Acessibilidade" subtitle="Ajustes aplicados em todo o app" onBack={() => navigation.goBack()} />

      <Card>
        <AppText variant="title" accessibilityRole="header">
          Tamanho do texto
        </AppText>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Tamanho do texto"
          accessibilityValue={{ text: `${pct}%` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) =>
            update({ fontScale: settings.fontScale + (e.nativeEvent.actionName === 'increment' ? FONT_SCALE_STEP : -FONT_SCALE_STEP) })
          }
          style={styles.scaleRow}
        >
          <AccessibleButton label="A−" accessibilityLabel="Diminuir texto" variant="secondary" fullWidth={false} disabled={settings.fontScale <= FONT_SCALE_MIN} onPress={() => update({ fontScale: settings.fontScale - FONT_SCALE_STEP })} />
          <AppText variant="headline" center style={styles.flex}>
            {pct}%
          </AppText>
          <AccessibleButton label="A+" accessibilityLabel="Aumentar texto" variant="secondary" fullWidth={false} disabled={settings.fontScale >= FONT_SCALE_MAX} onPress={() => update({ fontScale: settings.fontScale + FONT_SCALE_STEP })} />
        </View>
        <AppText tone="muted">Pré-visualização: Vaga A07 livre a 12 m do elevador.</AppText>
      </Card>

      <Card style={{ gap: spacing.xs }}>
        {toggle('highContrast', 'Alto contraste', 'Preto puro, bordas brancas e cores mais saturadas', 'contrast-box')}
        {toggle('voiceGuidance', 'Navegação por voz', 'Instruções faladas a cada manobra e alerta', 'account-voice')}
        {toggle('haptics', 'Vibração', 'Vibra em curvas, alertas e confirmações', 'vibrate')}
        {toggle('reduceMotion', 'Reduzir animações', 'Remove transições e efeitos de pulsação', 'motion-pause')}
        <AccessibleButton
          label="Testar voz"
          icon="volume-high"
          variant="ghost"
          size="md"
          onPress={() => announce('Em 20 metros, vire à direita. Elevador A a seguir.', { voice: true, haptics: settings.haptics, kind: 'maneuver' })}
        />
      </Card>

      <Card>
        <AppText variant="title" accessibilityRole="header">
          Perfil
        </AppText>
        <AppText>
          {user?.name} · {user ? ACCESSIBILITY_PROFILES[user.profileId].title : '—'}
        </AppText>
        <AppText variant="caption" tone="muted">
          Credencial: {user?.credential ? `${user.credential.number} (${user.credential.status === 'validated' ? 'validada' : 'pendente'})` : 'não cadastrada'}
        </AppText>
        <AccessibleButton label="Editar perfil" icon="account-question" variant="secondary" onPress={() => navigation.navigate('ProfileSetup', { editing: true })} />
        <AccessibleButton
          label="Sair"
          icon="logout"
          variant="danger"
          onPress={() => {
            signOut();
            navigation.reset({ index: 0, routes: [{ name: 'ProfileSetup' }] });
          }}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, borderBottomWidth: 1, paddingVertical: 8 },
  scaleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
