import React, { useState } from 'react';
import { View } from 'react-native';
import { AccessibleButton } from '../components/AccessibleButton';
import { AppText } from '../components/AppText';
import { IconName } from '../components/Icon';
import { LabeledInput } from '../components/LabeledInput';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SelectableOption } from '../components/SelectableOption';
import { ACCESSIBILITY_PROFILES, PROFILE_LIST } from '../data/profiles';
import { ScreenProps } from '../navigation/types';
import { CREDENTIAL_PATTERN, PLATE_PATTERN } from '../services/credential/credentialService';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeProvider';
import { AccessibilityProfileId } from '../types/user';

export function ProfileSetupScreen({ navigation, route }: ScreenProps<'ProfileSetup'>) {
  const { spacing } = useTheme();
  const editing = route.params?.editing ?? false;
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [name, setName] = useState(user?.name ?? '');
  const [profileId, setProfileId] = useState<AccessibilityProfileId | null>(user?.profileId ?? null);
  const [credNumber, setCredNumber] = useState(user?.credential?.number ?? '');
  const [plate, setPlate] = useState(user?.credential?.plate ?? '');
  const [submitted, setSubmitted] = useState(false);

  const credFilled = credNumber.trim().length > 0 || plate.trim().length > 0;
  const credError =
    submitted && credFilled && !CREDENTIAL_PATTERN.test(credNumber.trim().toUpperCase())
      ? 'Formato esperado: UF-PCD-000000 ou UF-IDO-000000'
      : undefined;
  const plateError =
    submitted && credFilled && !PLATE_PATTERN.test(plate.trim().toUpperCase()) ? 'Placa inválida (ex.: ABC1D23)' : undefined;
  const nameError = submitted && name.trim().length < 2 ? 'Informe como podemos te chamar' : undefined;

  const save = () => {
    setSubmitted(true);
    if (!profileId || name.trim().length < 2 || (credFilled && (!CREDENTIAL_PATTERN.test(credNumber.trim().toUpperCase()) || !PLATE_PATTERN.test(plate.trim().toUpperCase())))) {
      return;
    }
    const number = credNumber.trim().toUpperCase();
    setUser({
      name: name.trim(),
      profileId,
      credential: credFilled
        ? {
            number,
            plate: plate.trim().toUpperCase(),
            holderName: name.trim(),
            category: number.includes('-IDO-') ? 'idoso' : 'pcd',
            // Mock: validade de 2 anos. Em produção vem do órgão emissor.
            expiresAt: user?.credential?.expiresAt ?? new Date(Date.now() + 2 * 365 * 864e5).toISOString(),
            status: 'pending',
          }
        : undefined,
    });
    // O perfil define padrões de acessibilidade (o usuário pode mudar depois).
    if (ACCESSIBILITY_PROFILES[profileId].voiceGuidance) updateSettings({ voiceGuidance: true, haptics: true });
    if (editing) navigation.goBack();
    else navigation.replace('Dashboard');
  };

  return (
    <Screen footer={<AccessibleButton label={editing ? 'Salvar perfil' : 'Continuar'} icon="check-circle" onPress={save} disabled={!profileId} />}>
      <ScreenHeader
        title={editing ? 'Editar perfil' : 'Seu perfil de acessibilidade'}
        subtitle="Usamos isso para escolher a vaga e a rota ideais para você."
        onBack={editing ? () => navigation.goBack() : undefined}
      />

      <LabeledInput label="Nome" value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder="Como devemos te chamar?" error={nameError} returnKeyType="next" />

      <View accessibilityRole="radiogroup" accessibilityLabel="Perfil de necessidade" style={{ gap: spacing.md }}>
        <AppText variant="title" accessibilityRole="header">
          Qual é a sua necessidade?
        </AppText>
        {PROFILE_LIST.map((p) => (
          <SelectableOption
            key={p.id}
            title={p.title}
            description={p.description}
            icon={p.icon as IconName}
            selected={profileId === p.id}
            onSelect={() => setProfileId(p.id)}
          />
        ))}
        {submitted && !profileId ? (
          <AppText tone="danger" variant="caption" accessibilityLiveRegion="polite">
            Selecione um perfil para continuar.
          </AppText>
        ) : null}
      </View>

      <View style={{ gap: spacing.md }}>
        <AppText variant="title" accessibilityRole="header">
          Credencial digital (opcional)
        </AppText>
        <AppText variant="caption" tone="muted">
          Necessária para usar vagas prioritárias. Pode ser adicionada depois, na hora de estacionar.
        </AppText>
        <LabeledInput label="Nº da credencial" value={credNumber} onChangeText={setCredNumber} autoCapitalize="characters" placeholder="SP-PCD-123456" error={credError} />
        <LabeledInput label="Placa do veículo" value={plate} onChangeText={setPlate} autoCapitalize="characters" placeholder="ABC1D23" error={plateError} />
      </View>
    </Screen>
  );
}
