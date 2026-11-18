import { AccessibilityProfile, AccessibilityProfileId } from '../types/user';

export const ACCESSIBILITY_PROFILES: Record<AccessibilityProfileId, AccessibilityProfile> = {
  wheelchair: {
    id: 'wheelchair',
    title: 'Cadeirante',
    description: 'Necessita de vaga com faixa lateral ampliada para transferência e rota sem degraus.',
    icon: 'wheelchair-accessibility',
    requiresSideTransfer: true,
    eligibleCategories: ['pcd'],
    walkWeight: 1.6,
    driveWeight: 0.25,
    voiceGuidance: false,
  },
  'reduced-mobility': {
    id: 'reduced-mobility',
    title: 'Idoso / Mobilidade reduzida',
    description: 'Prioriza a menor caminhada possível até o elevador, evitando rampas longas e escadas.',
    icon: 'human-cane',
    requiresSideTransfer: false,
    eligibleCategories: ['idoso', 'pcd'],
    walkWeight: 2.2,
    driveWeight: 0.2,
    voiceGuidance: false,
  },
  visual: {
    id: 'visual',
    title: 'Deficiência visual',
    description: 'Ativa navegação por voz assistida, vibração nas manobras e descrições detalhadas.',
    icon: 'eye-off-outline',
    requiresSideTransfer: false,
    eligibleCategories: ['pcd'],
    walkWeight: 1.8,
    driveWeight: 0.3,
    voiceGuidance: true,
  },
};

export const PROFILE_LIST = Object.values(ACCESSIBILITY_PROFILES);
