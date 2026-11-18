import React, { useState } from 'react';
import { View } from 'react-native';
import { AccessibleButton } from '../components/AccessibleButton';
import { AppText } from '../components/AppText';
import { IconName } from '../components/Icon';
import { LabeledInput } from '../components/LabeledInput';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SelectableOption } from '../components/SelectableOption';
import { useAnnouncer } from '../hooks/useAnnouncer';
import { sensorHub } from '../hooks/useSensorFeed';
import { ScreenProps } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeProvider';
import { ObstacleCategory } from '../types/user';

const CATEGORIES: { id: ObstacleCategory; title: string; description: string; icon: IconName }[] = [
  { id: 'blocked-aisle', title: 'Passagem bloqueada', description: 'Carrinhos, obra, objeto no caminho', icon: 'cone' },
  { id: 'elevator-down', title: 'Elevador parado', description: 'Fora de serviço ou porta com defeito', icon: 'elevator' },
  { id: 'wet-floor', title: 'Piso escorregadio', description: 'Água, óleo ou limpeza sem sinalização', icon: 'water' },
  { id: 'irregular-parking', title: 'Uso irregular de vaga', description: 'Veículo sem credencial em vaga prioritária', icon: 'car' },
  { id: 'other', title: 'Outro problema', description: 'Iluminação, sinalização, rampa danificada…', icon: 'dots-horizontal' },
];

/** Relatos que afetam a rota entram no grafo como bloqueios (confirmados pela operação em produção). */
export function ReportObstacleScreen({ navigation, route }: ScreenProps<'ReportObstacle'>) {
  const { spacing } = useTheme();
  const say = useAnnouncer();
  const addReport = useAppStore((s) => s.addReport);
  const facility = useAppStore((s) => s.facility);
  const [category, setCategory] = useState<ObstacleCategory | null>(null);
  const [sectorId, setSectorId] = useState(route.params?.sectorId ?? 'A');
  const [description, setDescription] = useState('');
  const edgeId = route.params?.edgeId;

  const submit = () => {
    if (!category) return;
    const cat = CATEGORIES.find((c) => c.id === category)!;
    addReport({ category, description: description.trim() || cat.title, sectorId, edgeId });

    if ((category === 'blocked-aisle' || category === 'wet-floor') && edgeId) {
      const edge = facility.edges.find((e) => e.id === edgeId);
      // Corredores de veículos não são fechados por relato individual — apenas trechos de pedestre.
      if (edge && edge.mode === 'pedestrian') {
        sensorHub.inject([{ type: 'edge', edgeId, blocked: true, reason: `relato da comunidade: ${cat.title.toLowerCase()}`, at: Date.now() }]);
      }
    }
    if (category === 'elevator-down') {
      const elevator = facility.elevators.find((e) => e.sectorId === sectorId);
      if (elevator) sensorHub.inject([{ type: 'elevator', elevatorId: elevator.id, status: 'maintenance', at: Date.now() }]);
    }
    say('Obrigado! Seu relato foi enviado e já ajuda outras pessoas.', 'success', true);
    navigation.goBack();
  };

  return (
    <Screen footer={<AccessibleButton label="Enviar relato" icon="flag" disabled={!category} onPress={submit} />}>
      <ScreenHeader title="Reportar obstáculo" subtitle="Seu relato atualiza as rotas de toda a comunidade." onBack={() => navigation.goBack()} />

      <View accessibilityRole="radiogroup" accessibilityLabel="Tipo de problema" style={{ gap: spacing.sm }}>
        <AppText variant="title" accessibilityRole="header">
          O que você encontrou?
        </AppText>
        {CATEGORIES.map((c) => (
          <SelectableOption key={c.id} compact title={c.title} description={c.description} icon={c.icon} selected={category === c.id} onSelect={() => setCategory(c.id)} />
        ))}
      </View>

      <View accessibilityRole="radiogroup" accessibilityLabel="Setor" style={{ gap: spacing.sm }}>
        <AppText variant="title" accessibilityRole="header">
          Onde?
        </AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {facility.levels[0].sectors.map((s) => (
            <View key={s.id} style={{ flex: 1 }}>
              <SelectableOption compact title={s.name} selected={sectorId === s.id} onSelect={() => setSectorId(s.id)} />
            </View>
          ))}
        </View>
        {edgeId ? (
          <AppText variant="caption" tone="muted">
            Localização do seu trajeto atual será anexada automaticamente.
          </AppText>
        ) : null}
      </View>

      <LabeledInput label="Detalhes (opcional)" value={description} onChangeText={setDescription} placeholder="Ex.: carrinhos de compra bloqueando a faixa" multiline style={{ minHeight: 96, textAlignVertical: 'top', paddingTop: 12 }} />
    </Screen>
  );
}
