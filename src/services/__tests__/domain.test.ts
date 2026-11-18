import { createMockFacility, ENTRANCE_NODE_ID } from '../../data/mockFacility';
import { ACCESSIBILITY_PROFILES } from '../../data/profiles';
import { verifyCredential } from '../credential/credentialService';
import { recommendSpots } from '../recommendation/spotRecommender';
import { buildInstructions } from '../routing/instructions';
import { findRoute, operationalElevatorNodes } from '../routing/pathfinder';
import { ParkingFacility } from '../../types/parking';

const withElevator = (f: ParkingFacility, id: string, status: 'operational' | 'maintenance'): ParkingFacility => ({
  ...f,
  elevators: f.elevators.map((e) => (e.id === id ? { ...e, status } : e)),
});
const withBlocked = (f: ParkingFacility, edgeId: string): ParkingFacility => ({
  ...f,
  edges: f.edges.map((e) => (e.id === edgeId ? { ...e, blocked: true } : e)),
});

describe('mock facility', () => {
  const f = createMockFacility();
  it('gera vagas prioritárias nos dois setores, com IDs únicos', () => {
    expect(new Set(f.spots.map((s) => s.id)).size).toBe(f.spots.length);
    for (const sector of ['A', 'B']) {
      expect(f.spots.some((s) => s.sectorId === sector && s.category === 'pcd')).toBe(true);
      expect(f.spots.some((s) => s.sectorId === sector && s.category === 'idoso')).toBe(true);
    }
  });
  it('toda vaga é alcançável de carro a partir da entrada', () => {
    for (const s of f.spots) {
      expect(findRoute(f, ENTRANCE_NODE_ID, [s.accessNodeId], { mode: 'vehicle', avoidStairs: true })).not.toBeNull();
    }
  });
});

describe('pathfinder', () => {
  const f = createMockFacility();
  const from = 'n-P-380'; // passarela, Setor A, logo acima dos degraus
  const toB = ['n-P-750'];

  it('evita degraus usando a rampa quando avoidStairs=true', () => {
    const r = findRoute(f, from, toB, { mode: 'pedestrian', avoidStairs: true })!;
    expect(r.nodeIds).toContain('n-R-1');
    expect(r.edgeIds.some((id) => f.edges.find((e) => e.id === id)!.hasStairs)).toBe(false);
  });

  it('usa os degraus (mais curto) quando não há restrição', () => {
    const r = findRoute(f, from, toB, { mode: 'pedestrian', avoidStairs: false })!;
    expect(r.nodeIds).not.toContain('n-R-1');
  });

  it('nunca usa trecho bloqueado', () => {
    const blocked = withBlocked(f, 'e-n-R-1__n-R-2');
    const r = findRoute(blocked, from, toB, { mode: 'pedestrian', avoidStairs: true });
    // única ligação acessível entre os setores pela passarela está bloqueada → contorna pelos corredores
    expect(r).not.toBeNull();
    expect(r!.edgeIds).not.toContain('e-n-R-1__n-R-2');
  });

  it('carro não usa passarela de pedestres', () => {
    const r = findRoute(f, ENTRANCE_NODE_ID, ['n-E-25'], { mode: 'vehicle', avoidStairs: true })!;
    expect(r.nodeIds.some((id) => id.startsWith('n-P-'))).toBe(false);
  });

  it('redireciona para outro elevador quando um entra em manutenção', () => {
    const spotNearB = f.spots.find((s) => s.sectorId === 'B' && s.category === 'pcd')!;
    const normal = findRoute(f, spotNearB.accessNodeId, operationalElevatorNodes(f), { mode: 'pedestrian', avoidStairs: true })!;
    expect(normal.targetNodeId).toBe('n-P-750');
    const down = withElevator(f, 'elev-B', 'maintenance');
    const rerouted = findRoute(down, spotNearB.accessNodeId, operationalElevatorNodes(down), { mode: 'pedestrian', avoidStairs: true })!;
    expect(rerouted.targetNodeId).toBe('n-P-250');
  });
});

describe('recomendação', () => {
  const f = createMockFacility();
  it('cadeirante só recebe vagas PCD com faixa lateral', () => {
    const recs = recommendSpots(f, ACCESSIBILITY_PROFILES.wheelchair, { limit: 10 });
    expect(recs.length).toBeGreaterThan(0);
    recs.forEach((r) => {
      expect(r.spot.category).toBe('pcd');
      expect(r.spot.hasSideTransferArea).toBe(true);
      expect(r.spot.status).toBe('free');
    });
  });
  it('ordena pelo score (menor caminhada pesa mais)', () => {
    const recs = recommendSpots(f, ACCESSIBILITY_PROFILES['reduced-mobility'], { limit: 10 });
    for (let i = 1; i < recs.length; i++) expect(recs[i].score).toBeGreaterThanOrEqual(recs[i - 1].score);
  });
  it('sugere vaga comum (fallback) quando não há prioritária livre', () => {
    const full: ParkingFacility = {
      ...f,
      spots: f.spots.map((s) => (s.category === 'regular' ? s : { ...s, status: 'occupied' as const })),
    };
    const recs = recommendSpots(full, ACCESSIBILITY_PROFILES.wheelchair);
    expect(recs[0]?.fallback).toBe(true);
  });
});

describe('instruções', () => {
  it('anuncia a rampa e termina no elevador', () => {
    const f = createMockFacility();
    const r = findRoute(f, 'n-P-380', ['n-P-750'], { mode: 'pedestrian', avoidStairs: true })!;
    const ins = buildInstructions(f, r, 'pedestrian', 'B10');
    expect(ins.some((i) => i.icon === 'slope-uphill')).toBe(true);
    expect(ins[ins.length - 1].text).toContain('Elevador B');
  });
});

describe('credencial antifraude', () => {
  jest.useFakeTimers();
  const run = (p: Promise<unknown>) => {
    jest.advanceTimersByTime(2000);
    return p;
  };
  const future = new Date(Date.now() + 864e5).toISOString();
  const pcdSpot = createMockFacility().spots.find((s) => s.category === 'pcd')!;

  it('aprova credencial PCD válida em vaga PCD com placa correta', async () => {
    const r = (await run(verifyCredential({ number: 'SP-PCD-123456', plate: 'ABC1D23', category: 'pcd', expiresAt: future }, pcdSpot, 'ABC-1D23'))) as Awaited<ReturnType<typeof verifyCredential>>;
    expect(r.approved).toBe(true);
    expect(r.token).toMatch(/^SF-[0-9A-F]{8}$/);
  });
  it('recusa credencial de idoso em vaga PCD', async () => {
    const r = (await run(verifyCredential({ number: 'SP-IDO-123456', plate: 'ABC1D23', category: 'idoso', expiresAt: future }, pcdSpot))) as Awaited<ReturnType<typeof verifyCredential>>;
    expect(r.failure).toBe('category-mismatch');
  });
  it('recusa placa divergente da lida pela câmera', async () => {
    const r = (await run(verifyCredential({ number: 'SP-PCD-123456', plate: 'ABC1D23', category: 'pcd', expiresAt: future }, pcdSpot, 'XYZ9A99'))) as Awaited<ReturnType<typeof verifyCredential>>;
    expect(r.failure).toBe('plate-mismatch');
  });
  it('recusa credencial vencida', async () => {
    const r = (await run(verifyCredential({ number: 'SP-PCD-123456', plate: 'ABC1D23', category: 'pcd', expiresAt: '2020-01-01' }, pcdSpot))) as Awaited<ReturnType<typeof verifyCredential>>;
    expect(r.failure).toBe('expired');
  });
});
