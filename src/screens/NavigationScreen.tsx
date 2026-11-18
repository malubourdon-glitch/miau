import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AccessibleButton } from '../components/AccessibleButton';
import { AlertBanner } from '../components/AlertBanner';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { InstructionPanel } from '../components/InstructionPanel';
import { ParkingMap, SectorFilter } from '../components/ParkingMap';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { ENTRANCE_NODE_ID } from '../data/mockFacility';
import { useAnnouncer } from '../hooks/useAnnouncer';
import { useIndoorPositioning } from '../hooks/useIndoorPositioning';
import { ScreenProps } from '../navigation/types';
import { buildInstructions } from '../services/routing/instructions';
import { findRoute, operationalElevatorNodes, Route, toMeters } from '../services/routing/pathfinder';
import { stopSpeaking } from '../services/voice/voiceGuide';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeProvider';
import { ParkingFacility, Point } from '../types/parking';

const SPEED = { drive: 30, walk: 10 }; // unidades/s → 3 m/s de carro, 1 m/s a pé

function computeRoute(facility: ParkingFacility, phase: 'drive' | 'walk', origin: string, spotAccessNode: string): Route | null {
  return phase === 'drive'
    ? findRoute(facility, origin, [spotAccessNode], { mode: 'vehicle', avoidStairs: true })
    : findRoute(facility, origin, operationalElevatorNodes(facility), { mode: 'pedestrian', avoidStairs: true });
}

export function NavigationScreen({ navigation, route: navRoute }: ScreenProps<'Navigation'>) {
  const { spotId, phase } = navRoute.params;
  const { spacing, colors } = useTheme();
  const say = useAnnouncer();

  const spot = useAppStore((s) => s.facility.spots.find((sp) => sp.id === spotId));
  const facility = useAppStore((s) => s.facility);
  const graphVersion = useAppStore((s) => s.graphVersion);
  const alerts = useAppStore((s) => s.alerts);
  const voiceOn = useAppStore((s) => s.settings.voiceGuidance);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const releaseSpot = useAppStore((s) => s.releaseSpot);

  const accessNode = spot?.accessNodeId ?? ENTRANCE_NODE_ID;
  const [origin, setOrigin] = useState(phase === 'drive' ? ENTRANCE_NODE_ID : accessNode);
  const [rerouteNonce, setRerouteNonce] = useState(0);
  const [traveledBefore, setTraveledBefore] = useState<Point[]>([]);
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [zoomed, setZoomed] = useState(true);

  // A rota NÃO depende de `facility` diretamente (que muda a cada leitura de sensor),
  // apenas da origem e de re-roteamentos explícitos → evita reiniciar a navegação à toa.
  const route = useMemo(
    () => computeRoute(useAppStore.getState().facility, phase, origin, accessNode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [origin, phase, accessNode, rerouteNonce],
  );
  const points = useMemo(() => route?.points ?? [], [route]);
  const pos = useIndoorPositioning(points, route?.distance ?? 0, fast ? SPEED[phase] * 3 : SPEED[phase], paused);

  const destinationLabel = spot?.label ?? '';
  const instructions = useMemo(
    () => (route ? buildInstructions(useAppStore.getState().facility, route, phase === 'drive' ? 'vehicle' : 'pedestrian', destinationLabel) : []),
    [route, phase, destinationLabel],
  );
  const upcoming = instructions.filter((i) => i.atDistance > pos.traveled + 1);
  const current = upcoming[0] ?? instructions[instructions.length - 1];
  const next = upcoming[1];
  const remaining = Math.max(0, (route?.distance ?? 0) - pos.traveled);

  // ── Re-roteamento em tempo real ────────────────────────────────────────
  const live = useRef({ route, seg: pos.segmentIndex, point: pos.point });
  live.current = { route, seg: pos.segmentIndex, point: pos.point };
  const firstGraph = useRef(true);
  useEffect(() => {
    if (firstGraph.current) {
      firstGraph.current = false;
      return;
    }
    const { route: r, seg, point } = live.current;
    if (!r) {
      setRerouteNonce((n) => n + 1); // tentar de novo (ex.: elevador voltou a operar)
      return;
    }
    const nextIdx = Math.min(seg + 1, r.nodeIds.length - 1);
    const fromNode = r.nodeIds[nextIdx];
    const candidate = computeRoute(useAppStore.getState().facility, phase, fromNode, accessNode);
    const oldRemaining = r.edgeIds.slice(nextIdx).join('|');
    if (candidate && candidate.edgeIds.join('|') === oldRemaining) return; // rota atual continua ótima

    const latest = useAppStore.getState().alerts.find((a) => a.affectsRouting);
    setTraveledBefore((prev) => [...prev, ...r.points.slice(0, nextIdx), point]);
    setOrigin(fromNode);
    setRerouteNonce((n) => n + 1);
    say(
      candidate
        ? `${latest?.message ?? 'Mudança detectada no trajeto.'} Nova rota calculada.`
        : 'Não há rota acessível disponível no momento. Aguarde ou solicite assistência.',
      'warning',
      true,
    );
  }, [graphVersion, phase, accessNode, say]);

  // ── Anúncios de manobra ────────────────────────────────────────────────
  const lastSpoken = useRef<string | null>(null);
  useEffect(() => {
    if (!route || instructions.length === 0) return;
    if (lastSpoken.current === null) {
      lastSpoken.current = 'start';
      say(instructions[0].spoken, 'info');
      return;
    }
    if (pos.arrived) {
      if (lastSpoken.current !== 'arrive') {
        lastSpoken.current = 'arrive';
        say(instructions[instructions.length - 1].spoken, 'success', true);
      }
      return;
    }
    if (current && current.id !== lastSpoken.current) {
      lastSpoken.current = current.id;
      const m = toMeters(current.atDistance - pos.traveled);
      say(`Em ${m} metros, ${current.spoken.charAt(0).toLowerCase()}${current.spoken.slice(1)}`, 'maneuver');
    }
  }, [current, pos.arrived, pos.traveled, route, instructions, say]);

  useEffect(() => () => stopSpeaking(), []);

  const traveledPoints = useMemo(
    () => [...traveledBefore, ...points.slice(0, pos.segmentIndex + 1), pos.point],
    [traveledBefore, points, pos.segmentIndex, pos.point],
  );

  const sector: SectorFilter = zoomed ? (pos.point.y < 500 ? 'A' : 'B') : 'all';
  const routingAlert = alerts.find((a) => a.affectsRouting && Date.now() - a.createdAt < 60_000);
  const currentEdgeId = route?.edgeIds[pos.segmentIndex];

  if (!spot) {
    return (
      <Screen>
        <ScreenHeader title="Vaga não encontrada" onBack={() => navigation.goBack()} />
      </Screen>
    );
  }

  const title = phase === 'drive' ? `Indo para a vaga ${spot.label}` : 'Rota a pé até o elevador';
  const etaSec = Math.round(remaining / SPEED[phase]);

  return (
    <Screen
      footer={
        <>
          {pos.arrived && route ? (
            phase === 'drive' ? (
              <AccessibleButton
                label="Cheguei — validar vaga"
                icon="shield-check"
                onPress={() => navigation.replace('Verification', { spotId })}
                hint="Abre a verificação de credencial antifraude"
              />
            ) : (
              <AccessibleButton label="Concluir trajeto" icon="check-circle" onPress={() => navigation.popToTop()} />
            )
          ) : (
            <View style={styles.row}>
              <AccessibleButton
                label={paused ? 'Retomar' : 'Pausar'}
                icon={paused ? 'play' : 'pause'}
                variant="secondary"
                size="md"
                style={styles.flex}
                onPress={() => setPaused((p) => !p)}
              />
              <AccessibleButton
                label={voiceOn ? 'Voz ligada' : 'Voz desligada'}
                accessibilityLabel={voiceOn ? 'Desligar navegação por voz' : 'Ligar navegação por voz'}
                icon={voiceOn ? 'volume-high' : 'volume-off'}
                variant="secondary"
                size="md"
                style={styles.flex}
                onPress={() => {
                  if (voiceOn) stopSpeaking();
                  updateSettings({ voiceGuidance: !voiceOn });
                }}
              />
            </View>
          )}
        </>
      }
    >
      <ScreenHeader
        title={title}
        subtitle={`${toMeters(remaining)} m restantes · ~${Math.max(1, Math.round(etaSec / 60))} min`}
        onBack={() => {
          if (phase === 'drive') releaseSpot();
          navigation.goBack();
        }}
        actions={[
          {
            icon: 'flag',
            label: 'Reportar obstáculo neste trecho',
            onPress: () => navigation.navigate('ReportObstacle', { sectorId: pos.point.y < 500 ? 'A' : 'B', edgeId: currentEdgeId }),
          },
        ]}
      />

      {routingAlert ? <AlertBanner alert={routingAlert} /> : null}

      {route && current ? (
        <InstructionPanel current={current} next={next} distanceToManeuver={current.atDistance - pos.traveled} arrived={pos.arrived} />
      ) : (
        <Card accent={colors.occupied}>
          <AppText variant="title" tone="danger">
            Sem rota acessível no momento
          </AppText>
          <AppText>
            Todos os caminhos sem barreiras estão bloqueados ou os elevadores estão em manutenção. A equipe do estacionamento já foi notificada.
          </AppText>
          <AccessibleButton label="Solicitar assistência" icon="account-voice" variant="danger" onPress={() => say('Assistência solicitada. Um atendente está a caminho.', 'success', true)} />
        </Card>
      )}

      <View style={{ gap: spacing.sm }}>
        <ParkingMap
          facility={facility}
          sector={sector}
          routePoints={points}
          traveledPoints={traveledPoints}
          userPosition={pos.point}
          highlightSpotId={spot.id}
          accessibilityLabel={`Mapa de navegação. ${current ? current.text : ''}. Faltam ${toMeters(remaining)} metros.`}
        />
        <View style={styles.row}>
          <AccessibleButton
            label={zoomed ? 'Ver planta inteira' : 'Aproximar no setor'}
            icon="crosshairs-gps"
            variant="ghost"
            size="md"
            style={styles.flex}
            onPress={() => setZoomed((z) => !z)}
          />
          <AccessibleButton
            label={fast ? 'Velocidade normal' : 'Acelerar simulação'}
            icon="lightning-bolt"
            variant="ghost"
            size="md"
            style={styles.flex}
            onPress={() => setFast((f) => !f)}
          />
        </View>
      </View>

      <Card>
        <AppText variant="caption" tone="muted" weight="700">
          GARANTIAS DESTA ROTA
        </AppText>
        <AppText>✓ Sem escadas ou degraus</AppText>
        <AppText>✓ Evita corredores bloqueados (atualização em tempo real)</AppText>
        {phase === 'walk' ? <AppText>✓ Termina em elevador operante</AppText> : <AppText>✓ Vaga reservada para você</AppText>}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
