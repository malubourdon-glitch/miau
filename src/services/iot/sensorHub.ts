import { FacilityStatus, SpotStatus } from '../../types/parking';

/**
 * Contrato de integração com a camada IoT. A implementação mock abaixo pode
 * ser trocada por um adaptador MQTT / WebSocket / SSE sem tocar na UI:
 * a UI só conhece o store, e o store só conhece `SensorEvent`.
 */
export type SensorEvent =
  | { type: 'spot'; spotId: string; status: SpotStatus; at: number }
  | { type: 'elevator'; elevatorId: string; status: FacilityStatus; at: number }
  | { type: 'edge'; edgeId: string; blocked: boolean; reason?: string; at: number };

export type SensorListener = (events: SensorEvent[]) => void;

export interface SensorHub {
  connect(): void;
  disconnect(): void;
  subscribe(listener: SensorListener): () => void;
}
