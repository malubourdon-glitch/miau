import React from 'react';
import { StyleSheet, View } from 'react-native';
import { describeDistance, RouteInstruction } from '../services/routing/instructions';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** Painel de manobra: ícone grande + texto grande + distância. Lido como uma unidade. */
export function InstructionPanel({
  current,
  next,
  distanceToManeuver,
  arrived = false,
}: {
  arrived?: boolean;
  current: RouteInstruction;
  next?: RouteInstruction;
  distanceToManeuver: number;
}) {
  const { colors, radius, spacing } = useTheme();
  const dist = arrived ? 'Chegou' : describeDistance(distanceToManeuver);
  const text = !arrived && current.upcomingText ? current.upcomingText : current.text;
  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${text}, ${dist}.${next ? ` Depois: ${next.text}.` : ''}`}
      style={[styles.box, { backgroundColor: colors.accent, borderRadius: radius.lg, padding: spacing.lg }]}
    >
      <View style={styles.row}>
        <Icon name={current.icon} size={56} color={colors.textOnAccent} />
        <View style={styles.flex}>
          <AppText variant="display" tone="onAccent">
            {dist}
          </AppText>
          <AppText variant="title" tone="onAccent" weight="800">
            {text}
          </AppText>
        </View>
      </View>
      {next ? (
        <View style={[styles.next, { borderTopColor: 'rgba(4,19,13,0.25)' }]}>
          <AppText variant="caption" tone="onAccent" weight="700">
            DEPOIS
          </AppText>
          <Icon name={next.icon} size={22} color={colors.textOnAccent} />
          <AppText variant="body" tone="onAccent" style={styles.flex} numberOfLines={2}>
            {next.text}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  flex: { flex: 1 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, paddingTop: 10 },
});
