import { ParkingFacility } from '../../types/parking';
import { SensorEvent, SensorHub, SensorListener } from './sensorHub';

export interface MockSensorHubOptions {
  /** Retorna o estado atual (para o simulador escolher vagas coerentes). */
  getSnapshot: () => ParkingFacility;
  tickMs?: number;
  /** Mudanças de vaga por tick (média). */
  spotChangesPerTick?: number;
  /** Ativa o roteiro de incidentes (elevador em manutenção, corredor bloqueado). */
  scriptedIncidents?: boolean;
}

/** Faixa de pedestres do Setor B usada no incidente roteirizado. */
export const SCRIPTED_BLOCKED_EDGE = 'e-n-P-620__n-E-620';

/**
 * Simula a rede de sensores do estacionamento:
 *  - sensores ultrassônicos de vaga (entrada/saída de veículos)
 *  - status de elevadores (BMS do prédio)
 *  - bloqueios de corredor (operação / limpeza)
 */
export class MockSensorHub implements SensorHub {
  private listeners = new Set<SensorListener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private readonly opts: Required<MockSensorHubOptions>;

  constructor(opts: MockSensorHubOptions) {
    this.opts = { tickMs: 3000, spotChangesPerTick: 2, scriptedIncidents: true, ...opts };
  }

  connect() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.opts.tickMs);
    if (this.opts.scriptedIncidents) this.scheduleIncidents();
  }

  disconnect() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.timeouts.forEach(clearTimeout);
    this.timeouts = [];
  }

  subscribe(listener: SensorListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Dispara manualmente um evento (usado pelo painel de demonstração). */
  inject(events: SensorEvent[]) {
    this.emit(events);
  }

  private emit(events: SensorEvent[]) {
    if (events.length === 0) return;
    this.listeners.forEach((l) => l(events));
  }

  private tick() {
    const facility = this.opts.getSnapshot();
    // Vagas reservadas pelo app ficam "travadas" — o sensor não as libera.
    const candidates = facility.spots.filter((s) => s.status !== 'reserved');
    const n = Math.max(1, Math.round(this.opts.spotChangesPerTick * (0.5 + Math.random())));
    const events: SensorEvent[] = [];
    for (let i = 0; i < n; i++) {
      const spot = candidates[Math.floor(Math.random() * candidates.length)];
      if (!spot) continue;
      events.push({
        type: 'spot',
        spotId: spot.id,
        status: spot.status === 'free' ? 'occupied' : 'free',
        at: Date.now(),
      });
    }
    this.emit(events);
  }

  private scheduleIncidents() {
    const at = (ms: number, events: () => SensorEvent[]) =>
      this.timeouts.push(setTimeout(() => this.emit(events()), ms));

    at(25_000, () => [{ type: 'elevator', elevatorId: 'elev-B', status: 'maintenance', at: Date.now() }]);
    at(45_000, () => [
      { type: 'edge', edgeId: SCRIPTED_BLOCKED_EDGE, blocked: true, reason: 'Limpeza em andamento', at: Date.now() },
    ]);
    at(110_000, () => [{ type: 'elevator', elevatorId: 'elev-B', status: 'operational', at: Date.now() }]);
    at(130_000, () => [{ type: 'edge', edgeId: SCRIPTED_BLOCKED_EDGE, blocked: false, at: Date.now() }]);
  }
}
