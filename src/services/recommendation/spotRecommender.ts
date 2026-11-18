import { ENTRANCE_NODE_ID } from '../../data/mockFacility';
import { ParkingFacility, ParkingSpot } from '../../types/parking';
import { AccessibilityProfile } from '../../types/user';
import { findRoute, operationalElevatorNodes, Route } from '../routing/pathfinder';

export interface SpotRecommendation {
  spot: ParkingSpot;
  driveRoute: Route;
  walkRoute: Route;
  /** Nome do elevador mais próximo a pé (ex.: "Elevador A"). */
  elevatorLabel: string;
  score: number;
  /** Motivos legíveis, usados no card e lidos pelo leitor de tela. */
  reasons: string[];
  /** true quando não há vaga prioritária compatível livre e sugerimos uma comum. */
  fallback: boolean;
}

function isEligible(spot: ParkingSpot, profile: AccessibilityProfile, reservedForUserId?: string) {
  const available = spot.status === 'free' || (spot.status === 'reserved' && spot.id === reservedForUserId);
  if (!available) return false;
  if (spot.category === 'regular') return false;
  if (!profile.eligibleCategories.includes(spot.category)) return false;
  if (profile.requiresSideTransfer && !spot.hasSideTransferArea) return false;
  return true;
}

/**
 * Score = (dist. a pé até elevador operante × peso) + (dist. de carro × peso)
 *         + penalidade por categoria menos preferida.
 * Menor é melhor. Todas as rotas a pé evitam degraus e trechos bloqueados.
 */
export function recommendSpots(
  facility: ParkingFacility,
  profile: AccessibilityProfile,
  opts: { limit?: number; fromNodeId?: string; keepSpotId?: string } = {},
): SpotRecommendation[] {
  const { limit = 5, fromNodeId = ENTRANCE_NODE_ID, keepSpotId } = opts;
  const elevatorNodes = operationalElevatorNodes(facility);
  const nodeToElevator = new Map(facility.elevators.map((e) => [e.nodeId, e]));

  const evaluate = (spot: ParkingSpot, fallback: boolean): SpotRecommendation | null => {
    const driveRoute = findRoute(facility, fromNodeId, [spot.accessNodeId], { mode: 'vehicle', avoidStairs: true });
    const walkRoute = findRoute(facility, spot.accessNodeId, elevatorNodes, { mode: 'pedestrian', avoidStairs: true });
    if (!driveRoute || !walkRoute) return null;
    const categoryPenalty = fallback ? 400 : profile.eligibleCategories.indexOf(spot.category as 'pcd' | 'idoso') * 60;
    const score = walkRoute.distance * profile.walkWeight + driveRoute.distance * profile.driveWeight + categoryPenalty;
    const elevator = nodeToElevator.get(walkRoute.targetNodeId);
    const reasons = [
      `${Math.round(walkRoute.distance / 10)} m a pé até o ${elevator?.label ?? 'elevador'}`,
      'Rota sem degraus',
    ];
    if (spot.hasSideTransferArea) reasons.push('Faixa lateral de transferência');
    return {
      spot,
      driveRoute,
      walkRoute,
      elevatorLabel: elevator?.label ?? 'Elevador',
      score,
      reasons,
      fallback,
    };
  };

  let results = facility.spots
    .filter((s) => isEligible(s, profile, keepSpotId))
    .map((s) => evaluate(s, false))
    .filter((r): r is SpotRecommendation => r !== null);

  if (results.length === 0) {
    results = facility.spots
      .filter((s) => s.status === 'free' && s.category === 'regular')
      .map((s) => evaluate(s, true))
      .filter((r): r is SpotRecommendation => r !== null);
  }

  return results.sort((a, b) => a.score - b.score).slice(0, limit);
}
