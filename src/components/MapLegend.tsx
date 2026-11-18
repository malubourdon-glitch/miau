import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';

/** Legenda com cor + forma + texto (nunca só cor — WCAG 1.4.1). */
export function MapLegend({ counts }: { counts: { free: number; occupied: number; priority: number } }) {
  const { colors } = useTheme();
  const items = [
    { color: colors.accent, label: 'Livres', value: counts.free, symbol: '' },
    { color: colors.occupied, label: 'Ocupadas', value: counts.occupied, symbol: '' },
    { color: colors.priority, label: 'Prioritárias livres', value: counts.priority, symbol: '♿' },
  ];
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Legenda: ${counts.free} vagas livres, ${counts.occupied} ocupadas, ${counts.priority} prioritárias livres.`}
    >
      {items.map((i) => (
        <View key={i.label} style={styles.item}>
          <View style={[styles.swatch, { borderColor: i.color, backgroundColor: `${i.color}44` }]}>
            {i.symbol ? <AppText variant="caption">{i.symbol}</AppText> : null}
          </View>
          <AppText variant="caption" tone="muted">
            {i.label} <AppText variant="caption" weight="800">{i.value}</AppText>
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
