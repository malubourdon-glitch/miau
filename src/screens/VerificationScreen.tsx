import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { AccessibleButton } from '../components/AccessibleButton';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { Icon, IconName } from '../components/Icon';
import { LabeledInput } from '../components/LabeledInput';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAnnouncer } from '../hooks/useAnnouncer';
import { ScreenProps } from '../navigation/types';
import { verifyCredential, VerificationResult } from '../services/credential/credentialService';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeProvider';

/** Janela para validar a credencial após o sensor detectar o veículo. */
const VALIDATION_WINDOW_S = 180;

type Phase = 'detecting' | 'awaiting' | 'verifying' | 'approved' | 'rejected' | 'timeout';

export function VerificationScreen({ navigation, route }: ScreenProps<'Verification'>) {
  const { spotId } = route.params;
  const { colors } = useTheme();
  const say = useAnnouncer();
  const spot = useAppStore((s) => s.facility.spots.find((sp) => sp.id === spotId));
  const user = useAppStore((s) => s.user);
  const reports = useAppStore((s) => s.reports);
  const setCredential = useAppStore((s) => s.setCredential);
  const confirmParking = useAppStore((s) => s.confirmParking);
  const releaseSpot = useAppStore((s) => s.releaseSpot);
  const pushAlert = useAppStore((s) => s.pushAlert);
  const confirmReport = useAppStore((s) => s.confirmReport);

  const [phase, setPhase] = useState<Phase>('detecting');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(VALIDATION_WINDOW_S);
  const [credNumber, setCredNumber] = useState(user?.credential?.number ?? '');
  const [plate, setPlate] = useState(user?.credential?.plate ?? '');
  // Placa lida pela câmera LPR da vaga (mock: igual à cadastrada, ou desconhecida).
  const detectedPlate = useRef(user?.credential?.plate ?? 'ABC1D23').current;

  // 1) Sensor IoT confirma a presença do veículo.
  useEffect(() => {
    const t = setTimeout(() => {
      setPhase('awaiting');
      say(`Veículo detectado na vaga ${spot?.label}. Valide sua credencial em até 3 minutos.`, 'info');
    }, 1500);
    return () => clearTimeout(t);
  }, [say, spot?.label]);

  // 2) Janela antifraude.
  const waiting = phase === 'awaiting' || phase === 'rejected';
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [waiting]);
  useEffect(() => {
    if (secondsLeft === 0 && waiting) {
      setPhase('timeout');
      if (spot) confirmParking(spot.id, false);
      pushAlert({
        severity: 'critical',
        title: 'Vaga sem credencial validada',
        message: `Vaga ${spot?.label}: tempo de validação esgotado. A administração do estacionamento foi notificada.`,
        affectsRouting: false,
      });
      say('Tempo de validação esgotado. A administração foi notificada.', 'warning', true);
    }
  }, [secondsLeft, waiting, spot, confirmParking, pushAlert, say]);

  const validate = useCallback(async () => {
    if (!spot) return;
    setPhase('verifying');
    const number = credNumber.trim().toUpperCase();
    const credential = {
      number,
      plate: plate.trim().toUpperCase(),
      category: (number.includes('-IDO-') ? 'idoso' : 'pcd') as 'pcd' | 'idoso',
      expiresAt: user?.credential?.expiresAt ?? new Date(Date.now() + 365 * 864e5).toISOString(),
    };
    const r = await verifyCredential(credential, spot, detectedPlate);
    setResult(r);
    if (r.approved) {
      setPhase('approved');
      confirmParking(spot.id, true);
      setCredential({ ...credential, holderName: user?.name ?? '', status: 'validated', token: r.token });
      say('Credencial validada. Uso da vaga autorizado.', 'success', true);
    } else {
      setPhase('rejected');
      say(`Credencial recusada. ${r.message}`, 'warning', true);
    }
  }, [spot, credNumber, plate, user, detectedPlate, confirmParking, setCredential, say]);

  const mmss = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const sectorReports = useMemo(() => reports.filter((r) => r.sectorId === spot?.sectorId).slice(0, 3), [reports, spot?.sectorId]);

  if (!spot) return null;

  const statusView: Record<Phase, { icon: IconName; color: string; title: string; text: string }> = {
    detecting: { icon: 'access-point', color: colors.priority, title: 'Aguardando sensor…', text: `Conectando ao sensor ${spot.sensorId}.` },
    awaiting: { icon: 'timer-sand', color: colors.warning, title: 'Veículo detectado', text: `Valide sua credencial em ${mmss} para manter a vaga.` },
    verifying: { icon: 'shield-check', color: colors.priority, title: 'Validando credencial…', text: 'Consultando o órgão emissor.' },
    approved: { icon: 'shield-check', color: colors.accent, title: 'Uso autorizado', text: result?.message ?? '' },
    rejected: { icon: 'shield-alert', color: colors.occupied, title: 'Credencial recusada', text: `${result?.message ?? ''} Tempo restante: ${mmss}.` },
    timeout: { icon: 'close-octagon', color: colors.occupied, title: 'Tempo esgotado', text: 'A vaga foi sinalizada como uso irregular para a administração.' },
  };
  const sv = statusView[phase];

  return (
    <Screen
      footer={
        phase === 'approved' ? (
          <AccessibleButton
            label="Rota a pé até o elevador"
            icon="walk"
            onPress={() => navigation.replace('Navigation', { spotId, phase: 'walk' })}
          />
        ) : phase === 'awaiting' || phase === 'rejected' || phase === 'verifying' ? (
          <AccessibleButton label="Validar credencial" icon="card-account-details-star" busy={phase === 'verifying'} onPress={validate} />
        ) : phase === 'timeout' ? (
          <AccessibleButton
            label="Voltar ao mapa"
            variant="secondary"
            onPress={() => {
              releaseSpot();
              navigation.popToTop();
            }}
          />
        ) : null
      }
    >
      <ScreenHeader title={`Vaga ${spot.label}`} subtitle={`Setor ${spot.sectorId} · Vaga ${spot.category === 'pcd' ? 'PCD' : spot.category === 'idoso' ? 'Idoso 60+' : 'comum'}`} />

      <Card accent={sv.color} accessible accessibilityRole="alert" accessibilityLiveRegion="assertive" accessibilityLabel={`${sv.title}. ${sv.text}`}>
        <View style={styles.statusRow}>
          <View style={[styles.statusIcon, { borderColor: sv.color }]}>
            <Icon name={sv.icon} size={40} color={sv.color} />
          </View>
          <View style={styles.flex}>
            <AppText variant="headline" style={{ color: sv.color }}>
              {sv.title}
            </AppText>
            <AppText>{sv.text}</AppText>
          </View>
        </View>
        {waiting ? (
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <View style={[styles.progressFill, { backgroundColor: colors.warning, width: `${(secondsLeft / VALIDATION_WINDOW_S) * 100}%` }]} />
          </View>
        ) : null}
      </Card>

      <Card>
        <AppText variant="caption" tone="muted" weight="700">
          LEITURAS DA VAGA
        </AppText>
        <Row label="Sensor de presença" value={phase === 'detecting' ? 'Conectando…' : 'Veículo presente'} />
        <Row label="Placa lida (câmera LPR)" value={phase === 'detecting' ? '—' : detectedPlate} />
        <Row label="Faixa lateral" value={spot.hasSideTransferArea ? 'Sim, 1,20 m' : 'Não'} />
      </Card>

      {phase === 'approved' && result?.token ? (
        <Card accent={colors.accent}>
          <AppText variant="title">Comprovante digital</AppText>
          <View style={styles.proofRow}>
            <ProofCode token={result.token} />
            <View style={styles.flex}>
              <AppText variant="caption" tone="muted">
                Código de autorização
              </AppText>
              <AppText variant="title" tone="accent" selectable>
                {result.token}
              </AppText>
              <AppText variant="caption" tone="muted">
                Validado em {new Date(result.checkedAt).toLocaleTimeString('pt-BR')}. Apresente a um fiscal se solicitado.
              </AppText>
            </View>
          </View>
        </Card>
      ) : null}

      {(phase === 'awaiting' || phase === 'rejected') && (
        <Card>
          <AppText variant="title" accessibilityRole="header">
            Credencial digital
          </AppText>
          <LabeledInput label="Nº da credencial" value={credNumber} onChangeText={setCredNumber} autoCapitalize="characters" placeholder="SP-PCD-123456" helper="Credencial municipal de estacionamento (PCD ou Idoso)" />
          <LabeledInput label="Placa do veículo" value={plate} onChangeText={setPlate} autoCapitalize="characters" placeholder="ABC1D23" />
        </Card>
      )}

      <Card>
        <AppText variant="title" accessibilityRole="header">
          Ajude a comunidade
        </AppText>
        <AppText tone="muted">Viu um obstáculo, elevador parado ou carro sem credencial em vaga prioritária?</AppText>
        <AccessibleButton
          label="Reportar obstáculo"
          icon="flag"
          variant="secondary"
          onPress={() => navigation.navigate('ReportObstacle', { sectorId: spot.sectorId })}
        />
        {sectorReports.map((r) => (
          <View key={r.id} style={[styles.report, { borderColor: colors.border }]}>
            <AppText style={styles.flex} variant="caption">
              {r.description || 'Obstáculo reportado'} · {r.confirmations} confirmação(ões)
            </AppText>
            <AccessibleButton label="Confirmar" icon="thumb-up" size="md" variant="ghost" fullWidth={false} onPress={() => confirmReport(r.id)} accessibilityLabel={`Confirmar relato: ${r.description}`} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dataRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText tone="muted">{label}</AppText>
      <AppText weight="700">{value}</AppText>
    </View>
  );
}

/** Código visual determinístico derivado do token (mock de QR code). */
function ProofCode({ token }: { token: string }) {
  const { colors } = useTheme();
  const N = 13;
  const cells = useMemo(() => {
    let h = 2166136261;
    const out: boolean[] = [];
    for (let i = 0; i < N * N; i++) {
      h ^= token.charCodeAt(i % token.length) + i;
      h = Math.imul(h, 16777619) >>> 0;
      out.push((h & 1) === 1);
    }
    return out;
  }, [token]);
  const finder = (x: number, y: number) => (x < 3 && y < 3) || (x >= N - 3 && y < 3) || (x < 3 && y >= N - 3);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Código visual do comprovante ${token}`} style={{ backgroundColor: '#FFFFFF', padding: 6, borderRadius: 8 }}>
      <Svg width={96} height={96} viewBox={`0 0 ${N} ${N}`}>
        {cells.map((on, i) => {
          const x = i % N;
          const y = Math.floor(i / N);
          return on || finder(x, y) ? <Rect key={i} x={x} y={y} width={1} height={1} fill={colors.bg} /> : null;
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusIcon: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: 10, borderRadius: 5 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  proofRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  report: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 8, gap: 8 },
});
