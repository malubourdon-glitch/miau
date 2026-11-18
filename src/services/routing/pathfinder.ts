import { ParkingFacility, Point, RouteEdge, RouteNode } from '../../types/parking';

export type TravelMode = 'vehicle' | 'pedestrian';

export interface RouteOptions {
  mode: TravelMode;
  /** Bloqueia trechos com degraus (sempre true para os perfis do SpotFinder). */
  avoidStairs: boolean;
}

export interface Route {
  nodeIds: string[];
  edgeIds: string[];
  points: Point[];
  /** Distância total em unidades de planta (÷10 = metros). */
  distance: number;
  targetNodeId: string;
}

type Adjacency = Map<string, { to: string; edge: RouteEdge; cost: number }[]>;

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const toMeters = (units: number) => Math.round(units / 10);

function edgeAllowed(edge: RouteEdge, opts: RouteOptions): boolean {
  if (edge.blocked) return false;
  if (opts.avoidStairs && edge.hasStairs) return false;
  if (opts.mode === 'vehicle') return edge.mode !== 'pedestrian';
  return edge.mode !== 'vehicle';
}

/**
 * Cache de adjacência por (facility, opções). A facility é imutável no store —
 * qualquer mudança de sensor gera um novo objeto, invalidando o cache naturalmente.
 */
const adjacencyCache = new WeakMap<ParkingFacility, Map<string, Adjacency>>();

export function buildAdjacency(facility: ParkingFacility, opts: RouteOptions): Adjacency {
  const key = `${opts.mode}|${opts.avoidStairs}`;
  let perFacility = adjacencyCache.get(facility);
  if (!perFacility) {
    perFacility = new Map();
    adjacencyCache.set(facility, perFacility);
  }
  const cached = perFacility.get(key);
  if (cached) return cached;

  const byId = new Map(facility.nodes.map((n) => [n.id, n]));
  const adj: Adjacency = new Map();
  for (const edge of facility.edges) {
    if (!edgeAllowed(edge, opts)) continue;
    const a = byId.get(edge.from);
    const b = byId.get(edge.to);
    if (!a || !b) continue;
    const cost = dist(a, b);
    if (!adj.has(a.id)) adj.set(a.id, []);
    if (!adj.has(b.id)) adj.set(b.id, []);
    adj.get(a.id)!.push({ to: b.id, edge, cost });
    adj.get(b.id)!.push({ to: a.id, edge, cost });
  }
  perFacility.set(key, adj);
  return adj;
}

/** Fila de prioridade mínima (heap binário) — O((V+E) log V). */
class MinHeap<T> {
  private items: { key: number; value: T }[] = [];
  get size() {
    return this.items.length;
  }
  push(key: number, value: T) {
    const a = this.items;
    a.push({ key, value });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].key <= a[i].key) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): { key: number; value: T } | undefined {
    const a = this.items;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].key < a[m].key) m = l;
        if (r < a.length && a[r].key < a[m].key) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Dijkstra multi-destino: retorna a rota mais curta de `fromId` até o
 * destino mais próximo dentre `targetIds` (ex.: qualquer elevador operante).
 */
export function findRoute(
  facility: ParkingFacility,
  fromId: string,
  targetIds: string[],
  opts: RouteOptions,
): Route | null {
  if (targetIds.length === 0) return null;
  const adj = buildAdjacency(facility, opts);
  const targets = new Set(targetIds);
  const best = new Map<string, number>([[fromId, 0]]);
  const prev = new Map<string, { node: string; edgeId: string }>();
  const heap = new MinHeap<string>();
  heap.push(0, fromId);

  let reached: string | null = null;
  while (heap.size > 0) {
    const { key: d, value: u } = heap.pop()!;
    if (d > (best.get(u) ?? Infinity)) continue;
    if (targets.has(u)) {
      reached = u;
      break;
    }
    for (const { to, edge, cost } of adj.get(u) ?? []) {
      const nd = d + cost;
      if (nd < (best.get(to) ?? Infinity)) {
        best.set(to, nd);
        prev.set(to, { node: u, edgeId: edge.id });
        heap.push(nd, to);
      }
    }
  }
  if (!reached) return null;

  const nodeIds: string[] = [reached];
  const edgeIds: string[] = [];
  let cur = reached;
  while (cur !== fromId) {
    const p = prev.get(cur)!;
    edgeIds.unshift(p.edgeId);
    nodeIds.unshift(p.node);
    cur = p.node;
  }
  const byId = nodeIndex(facility);
  return {
    nodeIds,
    edgeIds,
    points: nodeIds.map((id) => {
      const n = byId.get(id)!;
      return { x: n.x, y: n.y };
    }),
    distance: best.get(reached)!,
    targetNodeId: reached,
  };
}

const nodeIndexCache = new WeakMap<ParkingFacility, Map<string, RouteNode>>();
export function nodeIndex(facility: ParkingFacility): Map<string, RouteNode> {
  let idx = nodeIndexCache.get(facility);
  if (!idx) {
    idx = new Map(facility.nodes.map((n) => [n.id, n]));
    nodeIndexCache.set(facility, idx);
  }
  return idx;
}

/** Nós de elevadores operantes — destinos válidos da rota a pé. */
export function operationalElevatorNodes(facility: ParkingFacility): string[] {
  return facility.elevators.filter((e) => e.status === 'operational').map((e) => e.nodeId);
}
