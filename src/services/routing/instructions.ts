import { ParkingFacility, Point } from '../../types/parking';
import { nodeIndex, Route, toMeters, TravelMode } from './pathfinder';

export type ManeuverIcon =
  | 'arrow-up'
  | 'arrow-left-top'
  | 'arrow-right-top'
  | 'elevator-passenger'
  | 'slope-uphill'
  | 'walk'
  | 'car-brake-parking'
  | 'map-marker-check';

export interface RouteInstruction {
  id: string;
  /** Distância acumulada (unidades) a partir do início da rota em que a manobra acontece. */
  atDistance: number;
  text: string;
  /** Versão curta para falar em voz (TTS). */
  spoken: string;
  /** Texto exibido enquanto a manobra ainda está à frente (ex.: "Vaga B14 à frente"). */
  upcomingText?: string;
  icon: ManeuverIcon;
}

const segLen = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/**
 * Converte a rota (lista de nós) em instruções curvas/marcos.
 * Em coordenadas de tela (y para baixo), produto vetorial > 0 = curva à direita.
 */
export function buildInstructions(
  facility: ParkingFacility,
  route: Route,
  mode: TravelMode,
  destinationLabel: string,
): RouteInstruction[] {
  const nodes = nodeIndex(facility);
  const pts = route.points;
  const out: RouteInstruction[] = [];
  let acc = 0;
  let rampAnnounced = false;

  out.push({
    id: 'start',
    atDistance: 0,
    text: mode === 'vehicle' ? `Siga em frente pelo corredor até a vaga ${destinationLabel}` : 'Siga pela rota acessível destacada em verde',
    spoken: mode === 'vehicle' ? `Rota iniciada até a vaga ${destinationLabel}.` : 'Rota a pé iniciada. Siga pela rota acessível.',
    icon: mode === 'vehicle' ? 'arrow-up' : 'walk',
  });

  for (let i = 1; i < pts.length - 1; i++) {
    acc += segLen(pts[i - 1], pts[i]);
    const node = nodes.get(route.nodeIds[i]);
    const d1 = { x: pts[i].x - pts[i - 1].x, y: pts[i].y - pts[i - 1].y };
    const d2 = { x: pts[i + 1].x - pts[i].x, y: pts[i + 1].y - pts[i].y };
    const cross = d1.x * d2.y - d1.y * d2.x;
    const dot = d1.x * d2.x + d1.y * d2.y;
    const angle = Math.abs(Math.atan2(cross, dot)) * (180 / Math.PI);

    if (node?.kind === 'ramp' && !rampAnnounced) {
      rampAnnounced = true;
      out.push({
        id: `ramp-${i}`,
        atDistance: acc,
        text: 'Siga pela rampa acessível — os degraus à frente foram evitados',
        spoken: 'Siga pela rampa acessível. Degraus evitados.',
        icon: 'slope-uphill',
      });
      continue;
    }
    if (angle > 30) {
      const right = cross > 0;
      const side = right ? 'direita' : 'esquerda';
      const crossing = mode === 'pedestrian' && node?.kind === 'aisle' && Math.abs(d2.x) > Math.abs(d2.y);
      out.push({
        id: `turn-${i}`,
        atDistance: acc,
        text: crossing ? `Vire à ${side} e atravesse pela faixa de pedestres` : `Vire à ${side}`,
        spoken: crossing ? `Vire à ${side} e use a faixa de pedestres.` : `Vire à ${side}.`,
        icon: right ? 'arrow-right-top' : 'arrow-left-top',
      });
    }
  }

  const finalNode = nodes.get(route.targetNodeId);
  out.push({
    id: 'arrive',
    atDistance: route.distance,
    text:
      mode === 'vehicle'
        ? `Você chegou à vaga ${destinationLabel}`
        : `Você chegou ao ${finalNode?.label ?? destinationLabel}`,
    upcomingText: mode === 'vehicle' ? `Vaga ${destinationLabel} à frente` : `${finalNode?.label ?? destinationLabel} à frente`,
    spoken:
      mode === 'vehicle'
        ? `Você chegou à vaga ${destinationLabel}. Estacione com segurança.`
        : `Você chegou ao ${finalNode?.label ?? destinationLabel}.`,
    icon: mode === 'vehicle' ? 'car-brake-parking' : 'elevator-passenger',
  });
  return out;
}

export function describeDistance(units: number): string {
  const m = toMeters(units);
  return m <= 1 ? 'agora' : `em ${m} m`;
}

/** Posição sobre a polilinha após percorrer `distance` unidades. */
export function pointAlong(points: Point[], distance: number): { point: Point; segmentIndex: number; heading: number } {
  let remaining = Math.max(0, distance);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = segLen(a, b);
    if (remaining <= len || i === points.length - 2) {
      const t = len === 0 ? 0 : Math.min(1, remaining / len);
      return {
        point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        segmentIndex: i,
        heading: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      };
    }
    remaining -= len;
  }
  return { point: points[0] ?? { x: 0, y: 0 }, segmentIndex: 0, heading: -90 };
}
