export type AccessibilityProfileId = 'wheelchair' | 'reduced-mobility' | 'visual';

export interface AccessibilityProfile {
  id: AccessibilityProfileId;
  title: string;
  description: string;
  icon: string;
  /** Exige vaga com faixa lateral de transferência. */
  requiresSideTransfer: boolean;
  /** Categorias de vaga elegíveis, em ordem de preferência. */
  eligibleCategories: ('pcd' | 'idoso')[];
  /** Peso da caminhada (vaga → elevador) no score de recomendação. */
  walkWeight: number;
  /** Peso do trajeto de carro (entrada → vaga). */
  driveWeight: number;
  /** Navegação por voz ativada por padrão. */
  voiceGuidance: boolean;
}

export type CredentialStatus = 'none' | 'pending' | 'validated' | 'rejected' | 'expired';

export interface DigitalCredential {
  number: string; // nº da credencial municipal (ex.: "SP-PCD-123456")
  holderName: string;
  plate: string;
  category: 'pcd' | 'idoso';
  expiresAt: string; // ISO date
  status: CredentialStatus;
  /** Token assinado devolvido pelo serviço de validação (mock). */
  token?: string;
}

export interface UserProfile {
  name: string;
  profileId: AccessibilityProfileId;
  credential?: DigitalCredential;
}

export interface A11ySettings {
  /** Multiplicador de fonte do app (independente da fonte do sistema). */
  fontScale: number;
  highContrast: boolean;
  reduceMotion: boolean;
  voiceGuidance: boolean;
  haptics: boolean;
}

export type ObstacleCategory =
  | 'blocked-aisle'
  | 'elevator-down'
  | 'wet-floor'
  | 'irregular-parking'
  | 'other';

export interface ObstacleReport {
  id: string;
  category: ObstacleCategory;
  description: string;
  sectorId: string;
  edgeId?: string;
  createdAt: number;
  confirmations: number;
}
