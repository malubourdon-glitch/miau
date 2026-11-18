import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { LiveAlert } from '../types/parking';
import { AppText } from './AppText';
import { Icon } from './Icon';

/**
 * Banner de alerta em tempo real. `accessibilityLiveRegion` faz o TalkBack
 * ler a mudança automaticamente; no iOS o anúncio é feito pelo useAnnouncer.
 */
export function AlertBanner({ alert, onDismiss }: { alert: LiveAlert; onDismiss?: () => void }) {
  const { colors, radius, spacing } = useTheme();
  const tone = {
    critical: { fg: colors.occupied, bg: colors.occupiedSoft, icon: 'alert-octagon' as const },
    warning: { fg: colors.warning, bg: colors.warningSoft, icon: 'alert' as const },
    info: { fg: colors.priority, bg: colors.prioritySoft, icon: 'information' as const },
  }[alert.severity];

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion={alert.severity === 'info' ? 'polite' : 'assertive'}
      accessibilityLabel={alert.message}
      style={[styles.box, { backgroundColor: tone.bg, borderColor: tone.fg, borderRadius: radius.md, padding: spacing.md }]}
    >
      <Icon name={tone.icon} size={28} color={tone.fg} />
      <View style={styles.text}>
        <AppText variant="body" weight="800" style={{ color: tone.fg }}>
          {alert.title}
        </AppText>
        <AppText variant="caption">{alert.message}</AppText>
      </View>
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dispensar alerta"
          onPress={onDismiss}
          hitSlop={12}
          style={styles.close}
        >
          <Icon name="close" size={24} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2 },
  text: { flex: 1, gap: 2 },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
