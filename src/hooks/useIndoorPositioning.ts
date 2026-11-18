import { useEffect, useRef, useState } from 'react';
import { Point } from '../types/parking';
import { pointAlong } from '../services/routing/instructions';

export interface PositionState {
  /** Distância percorrida sobre a rota atual (unidades de planta). */
  traveled: number;
  point: Point;
  heading: number;
  segmentIndex: number;
  arrived: boolean;
}

/**
 * Simula o posicionamento interno (beacons BLE / UWB) avançando o usuário
 * sobre a rota. Em produção, substituir por trilateração dos beacons e
 * "map matching" da posição estimada para o segmento de rota mais próximo.
 *
 * `speed` em unidades/s (carro ≈ 25 → 2,5 m/s; a pé ≈ 9 → 0,9 m/s).
 */
export function useIndoorPositioning(points: Point[], totalDistance: number, speed: number, paused: boolean) {
  const [traveled, setTraveled] = useState(0);
  const lastTs = useRef<number | null>(null);

  // Rota recalculada → reinicia a contagem sobre a nova polilinha.
  useEffect(() => {
    setTraveled(0);
    lastTs.current = null;
  }, [points]);

  useEffect(() => {
    if (paused || points.length < 2) {
      lastTs.current = null;
      return;
    }
    const id = setInterval(() => {
      const now = Date.now();
      const dt = lastTs.current == null ? 0 : (now - lastTs.current) / 1000;
      lastTs.current = now;
      setTraveled((t) => Math.min(totalDistance, t + dt * speed));
    }, 200);
    return () => clearInterval(id);
  }, [paused, points, totalDistance, speed]);

  const { point, heading, segmentIndex } = pointAlong(points, traveled);
  return {
    traveled,
    point,
    heading,
    segmentIndex,
    arrived: points.length >= 2 && traveled >= totalDistance - 0.5,
  } satisfies PositionState;
}
