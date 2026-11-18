import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AccessibleButton } from '../components/AccessibleButton';
import { AlertBanner } from '../components/AlertBanner';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { MapLegend } from '../components/MapLegend';
import { ParkingMap, SectorFilter, spotColor } from '../components/ParkingMap';
import { RecommendationCard } from '../components/RecommendationCard';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { ACCESSIBILITY_PROFILES } from '../data/profiles';
import { useRecommendations } from '../hooks/useRecommendations';
import { sensorHub } from '../hooks/useSensorFeed';
import { ScreenProps } from '../navigation/types';
import { SCRIPTED_BLOCKED_EDGE } from '../services/iot/mockSensorHub';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeProvider';
import { ParkingSpot } from '../types/parking';

type ViewMode = 'map' | 'list';

const STATUS_LABEL = { free: 'livre', occupied: 'ocupada', reserved: 'reservada' } as const;
const CATEGORY_LABEL = { pcd: 'PCD', idoso: 'Idoso', regular: 'Comum' } as const;

export function DashboardScreen({ navigation }: ScreenProps<'Dashboard'>) {
  const { colors, spacing, radius } = useTheme();
  const user = useAppStore((s) => s.user);
  const facility = useAppStore((s) => s.facility);
  const alerts = useAppStore((s) => s.alerts);
  const dismissAlert = useAppStore((s) => s.dismissAlert);
  const reserveSpot = useAppStore((s) => s.reserveSpot);
  const sensorConnected = useAppStore((s) => s.sensorConnected);
  const activeSpotId = useAppStore((s) => s.activeSpotId);

  const [mode, setMode] = useState<ViewMode>('map');
  const [sector, setSector] = useState<SectorFilter>('all');
  const [focusedSpotId, setFocusedSpotId] = useState<string | null>(null);

  const profile = ACCESSIBILITY_PROFILES[user?.profileId ?? 'wheelchair'];
  const recs = useRecommendations(3);
  const best = recs[0];

  const counts = useMemo(() => {
    let free = 0;
    let occupied = 0;
    let priority = 0;
    for (const s of facility.spots) {
      if (sector !== 'all' && s.sectorId !== sector) continue;
      if (s.status === 'free') {
        free++;
        if (s.category !== 'regular') priority++;
      } else occupied++;
    }
    return { free, occupied, priority };
  }, [facility.spots, sector]);

  const prioritySpots = useMemo(
    () =>
      facility.spots
        .filter((s) => s.category !== 'regular' && (sector === 'all' || s.sectorId === sector))
        .sort((a, b) => Number(a.status !== 'free') - Number(b.status !== 'free') || a.label.localeCompare(b.label)),
    [facility.spots, sector],
  );

  const focusedSpot = focusedSpotId ? facility.spots.find((s) => s.id === focusedSpotId) : undefined;
  const previewRec = recs.find((r) => r.spot.id === (focusedSpotId ?? best?.spot.id)) ?? best;
  const previewRoute = previewRec ? [...previewRec.driveRoute.points, ...previewRec.walkRoute.points.slice(1)] : undefined;

  const go = (spotId: string) => {
    reserveSpot(spotId);
    navigation.navigate('Navigation', { spotId, phase: 'drive' });
  };

  const elevatorsDown = facility.elevators.filter((e) => e.status !== 'operational');
  const mapDescription = `Mapa do ${facility.levels[0].name}, ${sector === 'all' ? 'todos os setores' : `Setor ${sector}`}. ${counts.priority} vagas prioritárias livres. ${
    best ? `Vaga recomendada: ${best.spot.label}, ${Math.round(best.walkRoute.distance / 10)} metros do ${best.elevatorLabel}.` : 'Nenhuma vaga compatível livre no momento.'
  } ${elevatorsDown.map((e) => `${e.label} em manutenção.`).join(' ')} Use a visão em lista para explorar vaga por vaga.`;

  return (
    <Screen>
      <ScreenHeader
        title={`Olá, ${user?.name?.split(' ')[0] ?? 'motorista'}`}
        subtitle={`${facility.name} · ${facility.levels[0].name} · Perfil: ${profile.title}`}
        actions={[
          { icon: 'flag', label: 'Reportar obstáculo', onPress: () => navigation.navigate('ReportObstacle') },
          { icon: 'tune-variant', label: 'Acessibilidade e perfil', onPress: () => navigation.navigate('Settings') },
        ]}
      />

      <View style={[styles.live, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill }]} accessible accessibilityLabel={sensorConnected ? `Sensores IoT ao vivo. ${facility.spots.length} vagas monitoradas.` : 'Sensores desconectados'}>
        <View style={[styles.dot, { backgroundColor: sensorConnected ? colors.accent : colors.occupied }]} />
        <AppText variant="caption" weight="700">
          {sensorConnected ? 'AO VIVO' : 'OFFLINE'}
        </AppText>
        <AppText variant="caption" tone="muted">
          {facility.spots.length} vagas com sensor
        </AppText>
      </View>

      {activeSpotId ? (
        <AccessibleButton
          label={`Retomar rota até a vaga ${activeSpotId.split('-').pop()}`}
          icon="map-marker-path"
          variant="secondary"
          onPress={() => navigation.navigate('Navigation', { spotId: activeSpotId, phase: 'drive' })}
        />
      ) : null}

      {alerts.slice(0, 2).map((a) => (
        <AlertBanner key={a.id} alert={a} onDismiss={() => dismissAlert(a.id)} />
      ))}

      {/* Alternância Mapa / Lista */}
      <View accessibilityRole="tablist" style={[styles.segment, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
        {(['map', 'list'] as const).map((m) => (
          <Segment key={m} label={m === 'map' ? 'Mapa' : 'Lista'} icon={m === 'map' ? 'map' : 'format-list-bulleted'} selected={mode === m} onPress={() => setMode(m)} />
        ))}
      </View>
      <View accessibilityRole="tablist" style={styles.chips}>
        {(['all', 'A', 'B'] as const).map((s) => (
          <Pressable
            key={s}
            accessibilityRole="tab"
            accessibilityState={{ selected: sector === s }}
            onPress={() => setSector(s)}
            style={[
              styles.chip,
              { borderRadius: radius.pill, borderColor: sector === s ? colors.accent : colors.border, backgroundColor: sector === s ? colors.accentSoft : 'transparent' },
            ]}
          >
            <AppText variant="body" weight="700" tone={sector === s ? 'accent' : 'default'}>
              {s === 'all' ? 'Todos' : `Setor ${s}`}
            </AppText>
          </Pressable>
        ))}
      </View>

      {mode === 'map' ? (
        <View style={{ gap: spacing.md }}>
          <ParkingMap
            facility={facility}
            sector={sector}
            routePoints={previewRoute}
            highlightSpotId={focusedSpotId ?? best?.spot.id}
            recommendedSpotIds={recs.map((r) => r.spot.id)}
            onSpotPress={(s) => setFocusedSpotId(s.id)}
            accessibilityLabel={mapDescription}
          />
          <MapLegend counts={counts} />
          {focusedSpot ? <SpotDetail spot={focusedSpot} eligible={recs.some((r) => r.spot.id === focusedSpot.id)} onGo={() => go(focusedSpot.id)} onClose={() => setFocusedSpotId(null)} /> : null}
        </View>
      ) : (
        <View style={{ gap: spacing.sm }} accessibilityRole="list">
          <AppText variant="title" accessibilityRole="header">
            Vagas prioritárias ({prioritySpots.filter((s) => s.status === 'free').length} livres)
          </AppText>
          {prioritySpots.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`Vaga ${s.label}, ${CATEGORY_LABEL[s.category]}, Setor ${s.sectorId}, ${STATUS_LABEL[s.status]}${s.hasSideTransferArea ? ', com faixa lateral de transferência' : ''}.`}
              accessibilityHint={s.status === 'free' ? 'Toque duas vezes para ver detalhes e reservar' : undefined}
              onPress={() => {
                setFocusedSpotId(s.id);
                setMode('map');
              }}
              style={[styles.listRow, { borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md }]}
            >
              <View style={[styles.listBadge, { borderColor: spotColor(s, colors) }]}>
                <AppText weight="800">{s.label}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="700">
                  {CATEGORY_LABEL[s.category]} · Setor {s.sectorId}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {s.hasSideTransferArea ? 'Faixa lateral ampliada' : 'Próxima ao elevador'}
                </AppText>
              </View>
              <AppText weight="800" style={{ color: spotColor(s, colors) }}>
                {STATUS_LABEL[s.status].toUpperCase()}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}

      <AppText variant="title" accessibilityRole="header">
        Recomendadas para você
      </AppText>
      {recs.length === 0 ? (
        <Card>
          <AppText>Nenhuma vaga compatível livre agora. Avisaremos assim que um sensor indicar uma vaga livre.</AppText>
        </Card>
      ) : (
        recs.map((r, i) => (
          <RecommendationCard
            key={r.spot.id}
            rec={r}
            rank={i + 1}
            onNavigate={() => go(r.spot.id)}
            onFocusOnMap={() => {
              setMode('map');
              setSector(r.spot.sectorId as SectorFilter);
              setFocusedSpotId(r.spot.id);
            }}
          />
        ))
      )}

      <DemoPanel />
    </Screen>
  );
}

function Segment({ label, icon, selected, onPress }: { label: string; icon: 'map' | 'format-list-bulleted'; selected: boolean; onPress: () => void }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.segBtn, { borderRadius: radius.sm, backgroundColor: selected ? colors.accent : 'transparent' }]}
    >
      <Icon name={icon} size={22} color={selected ? colors.textOnAccent : colors.text} />
      <AppText weight="700" tone={selected ? 'onAccent' : 'default'}>
        {label}
      </AppText>
    </Pressable>
  );
}

function SpotDetail({ spot, eligible, onGo, onClose }: { spot: ParkingSpot; eligible: boolean; onGo: () => void; onClose: () => void }) {
  const { colors } = useTheme();
  const canGo = spot.status === 'free' && eligible;
  return (
    <Card accent={spotColor(spot, colors)} accessibilityLiveRegion="polite">
      <AppText variant="title">
        Vaga {spot.label} · {CATEGORY_LABEL[spot.category]}
      </AppText>
      <AppText tone="muted">
        Setor {spot.sectorId} · {STATUS_LABEL[spot.status]}
        {spot.hasSideTransferArea ? ' · faixa lateral de 1,20 m' : ''}
      </AppText>
      {!canGo && spot.status === 'free' ? (
        <AppText variant="caption" tone="warning">
          Esta vaga não é compatível com o seu perfil ou credencial.
        </AppText>
      ) : null}
      <View style={styles.row}>
        <AccessibleButton label="Fechar" variant="secondary" size="md" fullWidth={false} onPress={onClose} />
        {canGo ? <AccessibleButton label="Reservar e ir" icon="map-marker-path" size="md" style={{ flex: 1 }} onPress={onGo} /> : null}
      </View>
    </Card>
  );
}

/** Painel para demonstrar a integração IoT sem esperar o roteiro automático. */
function DemoPanel() {
  const { spacing } = useTheme();
  const facility = useAppStore((s) => s.facility);
  const elevB = facility.elevators.find((e) => e.id === 'elev-B');
  const edge = facility.edges.find((e) => e.id === SCRIPTED_BLOCKED_EDGE);
  return (
    <Card style={{ gap: spacing.sm }}>
      <AppText variant="bodyLarge" weight="700" accessibilityRole="header">
        Painel de simulação IoT
      </AppText>
      <AppText variant="caption" tone="muted">
        Os sensores já disparam eventos sozinhos; use os botões para forçar cenários.
      </AppText>
      <AccessibleButton
        label={elevB?.status === 'operational' ? 'Colocar Elevador B em manutenção' : 'Liberar Elevador B'}
        icon="wrench"
        variant="secondary"
        size="md"
        onPress={() =>
          sensorHub.inject([{ type: 'elevator', elevatorId: 'elev-B', status: elevB?.status === 'operational' ? 'maintenance' : 'operational', at: Date.now() }])
        }
      />
      <AccessibleButton
        label={edge?.blocked ? 'Liberar faixa do Setor B' : 'Bloquear faixa do Setor B'}
        icon="cone"
        variant="secondary"
        size="md"
        onPress={() => sensorHub.inject([{ type: 'edge', edgeId: SCRIPTED_BLOCKED_EDGE, blocked: !edge?.blocked, reason: 'Limpeza em andamento', at: Date.now() }])}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  live: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, alignSelf: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  segment: { flexDirection: 'row', padding: 4, borderWidth: 1.5, gap: 4 },
  segBtn: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { minHeight: 48, paddingHorizontal: 18, justifyContent: 'center', borderWidth: 2 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 64, borderWidth: 1.5 },
  listBadge: { width: 56, height: 44, borderRadius: 10, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10 },
});
