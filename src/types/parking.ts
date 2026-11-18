/**
 * Modelo de domínio do estacionamento.
 * Coordenadas em "unidades de planta" (1 unidade ≈ 10 cm) — o mesmo sistema
 * usado pelo SVG do mapa, pelo roteador e pelo posicionamento interno.
 */

export type Point = { x: number; y: number };

export type SpotCategory = 'pcd' | 'idoso' | 'regular';

/** Estado reportado pelo sensor IoT (ultrassônico/magnético) da vaga. */
export type SpotStatus = 'free' | 'occupied' | 'reserved';

export interface ParkingSpot {
  id: string; // ex.: "B1-A-07"
  label: string; // ex.: "A07"
  levelId: string;
  sectorId: string;
  category: SpotCategory;
  status: SpotStatus;
  /** Retângulo da vaga na planta. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Faixa lateral de transferência (≥ 1,20 m) para cadeirantes. */
  hasSideTransferArea: boolean;
  /** Nó do grafo de rotas que dá acesso à vaga. */
  accessNodeId: string;
  sensorId: string;
  /** Timestamp da última leitura do sensor. */
  updatedAt: number;
  /** Se ocupada, se a credencial do ocupante foi validada (antifraude). */
  occupantVerified?: boolean;
}

export type NodeKind =
  | 'entrance'
  | 'aisle'
  | 'spot-access'
  | 'elevator'
  | 'stairs'
  | 'ramp'
  | 'exit';

export interface RouteNode extends Point {
  id: string;
  kind: NodeKind;
  label?: string;
}

/** vehicle = só carro; pedestrian = só a pé; shared = via compartilhada. */
export type EdgeMode = 'vehicle' | 'pedestrian' | 'shared';

export interface RouteEdge {
  id: string;
  from: string;
  to: string;
  mode: EdgeMode;
  /** Trecho com degraus — proibido para perfis com restrição de mobilidade. */
  hasStairs: boolean;
  /** Bloqueio temporário (obra, obstáculo reportado, limpeza…). */
  blocked: boolean;
  blockedReason?: string;
}

export type FacilityStatus = 'operational' | 'maintenance';

export interface Elevator {
  id: string;
  nodeId: string;
  label: string; // "Elevador Setor A"
  sectorId: string;
  status: FacilityStatus;
}

export interface Sector {
  id: string;
  name: string; // "Setor A"
  bounds: { x: number; y: number; width: number; height: number };
}

export interface ParkingLevel {
  id: string;
  name: string; // "Nível B1"
  sectors: Sector[];
}

export interface ParkingFacility {
  id: string;
  name: string;
  kind: 'shopping' | 'aeroporto' | 'hospital';
  size: { width: number; height: number };
  levels: ParkingLevel[];
  nodes: RouteNode[];
  edges: RouteEdge[];
  elevators: Elevator[];
  spots: ParkingSpot[];
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface LiveAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  createdAt: number;
  /** Se o alerta invalida rotas ativas (dispara re-roteamento). */
  affectsRouting: boolean;
}
