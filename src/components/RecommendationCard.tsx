import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SpotRecommendation } from '../services/recommendation/spotRecommender';
import { toMeters } from '../services/routing/pathfinder';
import { useTheme } from '../theme/ThemeProvider';
import { AccessibleButton } from './AccessibleButton';
import { AppText } from './AppText';
import { Card } from './Card';
import { Icon } from './Icon';

const CATEGORY_LABEL = { pcd: 'Vaga PCD', idoso: 'Vaga Idoso 60+', regular: 'Vaga comum' } as const;

export function RecommendationCard({
  rec,
  rank,
  onNavigate,
  onFocusOnMap,
}: {
  rec: SpotRecommendation;
  rank: number;
  onNavigate: () => void;
  onFocusOnMap?: () => void;
}) {
  const { colors } = useTheme();
  const { spot } = rec;
  const walk = toMeters(rec.walkRoute.distance);
  const drive = toMeters(rec.driveRoute.distance);
  const best = rank === 1;
  const summary = `${best ? 'Melhor opção. ' : `Opção ${rank}. `}${CATEGORY_LABEL[spot.category]} ${spot.label}, Setor ${spot.sectorId}. ${rec.reasons.join('. ')}. ${drive} metros de carro desde a entrada.`;

  return (
    <Card accent={best ? colors.accent : undefined} style={styles.card}>
      <View accessible accessibilityLabel={summary} style={styles.header}>
        <View style={[styles.badge, { backgroundColor: spot.category === 'regular' ? colors.surfaceAlt : colors.priority }]}>
          <AppText variant="title" weight="800" style={{ color: colors.bg }}>
            {spot.label}
          </AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="caption" tone={best ? 'accent' : 'muted'} weight="800">
            {best ? 'MELHOR VAGA PARA SEU PERFIL' : `OPÇÃO ${rank}`}
            {rec.fallback ? ' · SEM PRIORITÁRIA LIVRE' : ''}
          </AppText>
          <AppText variant="bodyLarge" weight="700">
            {CATEGORY_LABEL[spot.category]} · Setor {spot.sectorId}
          </AppText>
        </View>
      </View>
      <View style={styles.metrics} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Metric icon="walk" value={`${walk} m`} label={`até ${rec.elevatorLabel.replace('Elevador ', 'elev. ')}`} />
        <Metric icon="car" value={`${drive} m`} label="da entrada" />
        <Metric icon={spot.hasSideTransferArea ? 'wheelchair-accessibility' : 'slope-uphill'} value={spot.hasSideTransferArea ? 'Ampla' : 'Sem degraus'} label={spot.hasSideTransferArea ? 'faixa lateral' : 'rota'} />
      </View>
      <View style={styles.actions}>
        {onFocusOnMap ? (
          <AccessibleButton
            label="Ver no mapa"
            icon="map-search"
            variant="secondary"
            size="md"
            fullWidth={false}
            onPress={onFocusOnMap}
            accessibilityLabel={`Destacar vaga ${spot.label} no mapa`}
          />
        ) : null}
        <AccessibleButton
          label="Reservar e ir"
          icon="map-marker-path"
          size="md"
          style={styles.flex}
          onPress={onNavigate}
          accessibilityLabel={`Reservar vaga ${spot.label} e iniciar navegação`}
          hint="Bloqueia a vaga por 10 minutos e abre a navegação assistida"
        />
      </View>
    </Card>
  );
}

function Metric({ icon, value, label }: { icon: React.ComponentProps<typeof Icon>['name']; value: string; label: string }) {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.metric, { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm }]}>
      <Icon name={icon} size={20} color={colors.accent} />
      <AppText variant="body" weight="800">
        {value}
      </AppText>
      <AppText variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { minWidth: 64, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  flex: { flex: 1 },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, padding: 8, alignItems: 'center', gap: 2 },
  actions: { flexDirection: 'row', gap: 10 },
});
