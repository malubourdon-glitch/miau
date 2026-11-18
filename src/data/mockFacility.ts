import {
  EdgeMode,
  Elevator,
  ParkingFacility,
  ParkingSpot,
  RouteEdge,
  RouteNode,
  SpotCategory,
} from '../types/parking';

/**
 * Planta mock do Nível B1 (orientação retrato, pensada para telas de celular).
 * 1 unidade = 10 cm  →  600 × 1000 unidades = 60 m × 100 m.
 *
 *        x:  30   90 125 160 220  300  380 440 475 510 570
 *            ┌────┬───────┬────┬──────┬────┬───────┬────┐
 *  Setor A   │col1│ Corr. │col2│Passa-│col3│ Corr. │col4│
 *  (y<500)   │    │   W   │    │ rela │    │   E   │    │
 *            │    │       │    │ [ElA]│    │       │    │  ← elevador A (y=250)
 *            │    │       │    │ ▤▤▤  │    │       │    │  ← degraus + rampa (y≈500)
 *  Setor B   │    │       │    │ [ElB]│    │       │    │  ← elevador B (y=750)
 *  (y≥500)   │    │   ▲   │    │      │    │       │    │
 *            └────┴─Entr.─┴────┴──────┴────┴───────┴────┘
 *
 * Faixas de pedestre horizontais ligam Corredor W → Passarela → Corredor E
 * nos pontos CROSSWALKS_Y. As colunas 2 e 3 deixam um vão nesses pontos.
 */

export const LEVEL_ID = 'B1';
export const FACILITY_SIZE = { width: 600, height: 1000 };

export const AISLE_W_X = 125;
export const AISLE_E_X = 475;
export const WALKWAY_X = 300;
export const TOP_CONNECTOR_Y = 25;
export const ENTRANCE = { x: AISLE_W_X, y: 990 };
export const ELEVATOR_A_Y = 250;
export const ELEVATOR_B_Y = 750;
export const STAIRS_TOP_Y = 470;
export const STAIRS_BOTTOM_Y = 530;
export const RAMP_X = 338;

export const CROSSWALKS_Y = [150, ELEVATOR_A_Y, 380, 620, ELEVATOR_B_Y, 860];
const CROSSWALK_GAP = 36;

const SPOT_DEPTH = 60;
const SPOT_WIDTH: Record<SpotCategory, number> = { regular: 32, idoso: 34, pcd: 48 };
const SPOT_RANGE = { start: 50, end: 950 };

type ColumnDef = { key: 'c1' | 'c2' | 'c3' | 'c4'; x: number; aisleX: number; aisleKey: 'W' | 'E'; gaps: boolean };

const COLUMNS: ColumnDef[] = [
  { key: 'c1', x: 30, aisleX: AISLE_W_X, aisleKey: 'W', gaps: false },
  { key: 'c2', x: 160, aisleX: AISLE_W_X, aisleKey: 'W', gaps: true },
  { key: 'c3', x: 380, aisleX: AISLE_E_X, aisleKey: 'E', gaps: true },
  { key: 'c4', x: 510, aisleX: AISLE_E_X, aisleKey: 'E', gaps: false },
];

/** Regras de distribuição das vagas prioritárias (≈ 2% PCD + 5% idoso, concentradas perto dos elevadores). */
function categoryFor(col: ColumnDef['key'], y: number): SpotCategory {
  const nearElevator = [ELEVATOR_A_Y, ELEVATOR_B_Y].find((ey) => Math.abs(y - ey) < 95);
  if ((col === 'c2' || col === 'c3') && nearElevator !== undefined) {
    // PCD imediatamente antes do elevador, idosos imediatamente depois.
    return y < nearElevator ? 'pcd' : 'idoso';
  }
  if (col === 'c1' && y > 880) return 'pcd'; // próximas à entrada, mas longe do elevador
  if (col === 'c4' && y < 120) return 'idoso';
  return 'regular';
}

const sectorOf = (y: number) => (y < 500 ? 'A' : 'B');
const nodeId = (lane: 'W' | 'E' | 'P', y: number) => `n-${lane}-${Math.round(y)}`;

// Pseudo-aleatório determinístico → mesma ocupação inicial em todos os ambientes (bom para testes).
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function createMockFacility(seed = 42): ParkingFacility {
  const rand = seeded(seed);
  const now = Date.now();
  const spots: ParkingSpot[] = [];
  const counters: Record<string, number> = { A: 0, B: 0 };

  // ── Vagas ──────────────────────────────────────────────────────────────
  for (const col of COLUMNS) {
    let y = SPOT_RANGE.start;
    while (y < SPOT_RANGE.end) {
      const category = categoryFor(col.key, y);
      const width = SPOT_WIDTH[category];
      if (col.gaps) {
        const hit = CROSSWALKS_Y.find((cy) => y + width > cy - CROSSWALK_GAP / 2 && y < cy + CROSSWALK_GAP / 2);
        if (hit !== undefined) {
          y = hit + CROSSWALK_GAP / 2;
          continue;
        }
      }
      if (y + width > 492 && y < 508) {
        y = 508; // divisa entre setores
        continue;
      }
      if (y + width > SPOT_RANGE.end) break;
      const centerY = y + width / 2;
      const sector = sectorOf(centerY);
      counters[sector] += 1;
      const label = `${sector}${String(counters[sector]).padStart(2, '0')}`;
      const occupiedChance = category === 'regular' ? 0.72 : 0.45;
      spots.push({
        id: `${LEVEL_ID}-${label}`,
        label,
        levelId: LEVEL_ID,
        sectorId: sector,
        category,
        status: rand() < occupiedChance ? 'occupied' : 'free',
        x: col.x,
        y,
        width: SPOT_DEPTH,
        height: width,
        hasSideTransferArea: category === 'pcd',
        accessNodeId: nodeId(col.aisleKey, centerY),
        sensorId: `iot-${label.toLowerCase()}`,
        updatedAt: now,
        occupantVerified: category !== 'regular' ? rand() > 0.15 : undefined,
      });
      y += width + 2;
    }
  }

  // ── Nós ────────────────────────────────────────────────────────────────
  const nodes = new Map<string, RouteNode>();
  const addNode = (n: RouteNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
    return n.id;
  };

  const aisleYs: Record<'W' | 'E', Set<number>> = {
    W: new Set([TOP_CONNECTOR_Y, ...CROSSWALKS_Y]),
    E: new Set([TOP_CONNECTOR_Y, ...CROSSWALKS_Y]),
  };
  aisleYs.W.add(ENTRANCE.y);
  aisleYs.E.add(ENTRANCE.y);
  for (const s of spots) {
    const lane = s.accessNodeId.split('-')[1] as 'W' | 'E';
    aisleYs[lane].add(Math.round(s.y + s.height / 2));
  }

  for (const lane of ['W', 'E'] as const) {
    const x = lane === 'W' ? AISLE_W_X : AISLE_E_X;
    for (const y of aisleYs[lane]) {
      let kind: RouteNode['kind'] = 'aisle';
      let label: string | undefined;
      if (lane === 'W' && y === ENTRANCE.y) {
        kind = 'entrance';
        label = 'Entrada';
      } else if (lane === 'E' && y === ENTRANCE.y) {
        kind = 'exit';
        label = 'Saída de veículos';
      } else if (!CROSSWALKS_Y.includes(y) && y !== TOP_CONNECTOR_Y) {
        kind = 'spot-access';
      }
      addNode({ id: nodeId(lane, y), x, y, kind, label });
    }
  }

  const walkwayYs = [...CROSSWALKS_Y, STAIRS_TOP_Y, STAIRS_BOTTOM_Y].sort((a, b) => a - b);
  for (const y of walkwayYs) {
    const isElevator = y === ELEVATOR_A_Y || y === ELEVATOR_B_Y;
    addNode({
      id: nodeId('P', y),
      x: WALKWAY_X,
      y,
      kind: isElevator ? 'elevator' : y === STAIRS_TOP_Y || y === STAIRS_BOTTOM_Y ? 'stairs' : 'aisle',
      label: isElevator ? (y === ELEVATOR_A_Y ? 'Elevador A' : 'Elevador B') : undefined,
    });
  }
  addNode({ id: 'n-R-1', x: RAMP_X, y: STAIRS_TOP_Y + 10, kind: 'ramp', label: 'Rampa acessível' });
  addNode({ id: 'n-R-2', x: RAMP_X, y: STAIRS_BOTTOM_Y - 10, kind: 'ramp', label: 'Rampa acessível' });

  // ── Arestas ────────────────────────────────────────────────────────────
  const edges: RouteEdge[] = [];
  const addEdge = (from: string, to: string, mode: EdgeMode, hasStairs = false) =>
    edges.push({ id: `e-${from}__${to}`, from, to, mode, hasStairs, blocked: false });

  for (const lane of ['W', 'E'] as const) {
    const ys = [...aisleYs[lane]].sort((a, b) => a - b);
    for (let i = 0; i < ys.length - 1; i++) addEdge(nodeId(lane, ys[i]), nodeId(lane, ys[i + 1]), 'shared');
  }
  addEdge(nodeId('W', TOP_CONNECTOR_Y), nodeId('E', TOP_CONNECTOR_Y), 'vehicle');

  for (const cy of CROSSWALKS_Y) {
    addEdge(nodeId('W', cy), nodeId('P', cy), 'pedestrian');
    addEdge(nodeId('P', cy), nodeId('E', cy), 'pedestrian');
  }

  for (let i = 0; i < walkwayYs.length - 1; i++) {
    const a = walkwayYs[i];
    const b = walkwayYs[i + 1];
    const isStairs = a === STAIRS_TOP_Y && b === STAIRS_BOTTOM_Y;
    addEdge(nodeId('P', a), nodeId('P', b), 'pedestrian', isStairs);
  }
  // Desvio acessível pela rampa (mais longo que os degraus, mas sem barreiras).
  addEdge(nodeId('P', STAIRS_TOP_Y), 'n-R-1', 'pedestrian');
  addEdge('n-R-1', 'n-R-2', 'pedestrian');
  addEdge('n-R-2', nodeId('P', STAIRS_BOTTOM_Y), 'pedestrian');

  const elevators: Elevator[] = [
    { id: 'elev-A', nodeId: nodeId('P', ELEVATOR_A_Y), label: 'Elevador Setor A', sectorId: 'A', status: 'operational' },
    { id: 'elev-B', nodeId: nodeId('P', ELEVATOR_B_Y), label: 'Elevador Setor B', sectorId: 'B', status: 'operational' },
  ];

  return {
    id: 'shopping-central',
    name: 'Shopping Central',
    kind: 'shopping',
    size: FACILITY_SIZE,
    levels: [
      {
        id: LEVEL_ID,
        name: 'Nível B1',
        sectors: [
          { id: 'A', name: 'Setor A', bounds: { x: 0, y: 0, width: 600, height: 500 } },
          { id: 'B', name: 'Setor B', bounds: { x: 0, y: 500, width: 600, height: 500 } },
        ],
      },
    ],
    nodes: [...nodes.values()],
    edges,
    elevators,
    spots,
  };
}

export const ENTRANCE_NODE_ID = nodeId('W', ENTRANCE.y);
