import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createMockFacility } from '../data/mockFacility';
import { SensorEvent } from '../services/iot/sensorHub';
import { LiveAlert, ParkingFacility } from '../types/parking';
import { A11ySettings, DigitalCredential, ObstacleReport, UserProfile } from '../types/user';
import { FONT_SCALE_MAX, FONT_SCALE_MIN } from '../theme/tokens';

interface AppState {
  // ── Persistido ──
  onboarded: boolean;
  user: UserProfile | null;
  settings: A11ySettings;

  // ── Tempo real (não persistido) ──
  facility: ParkingFacility;
  /** Incrementa quando algo que afeta rotas muda (elevador, bloqueio). */
  graphVersion: number;
  alerts: LiveAlert[];
  reports: ObstacleReport[];
  activeSpotId: string | null;
  sensorConnected: boolean;

  // ── Ações ──
  completeOnboarding: () => void;
  setUser: (user: UserProfile) => void;
  setCredential: (credential: DigitalCredential) => void;
  updateSettings: (patch: Partial<A11ySettings>) => void;
  applySensorEvents: (events: SensorEvent[]) => void;
  setSensorConnected: (v: boolean) => void;
  reserveSpot: (spotId: string) => void;
  releaseSpot: () => void;
  confirmParking: (spotId: string, verified: boolean) => void;
  pushAlert: (alert: Omit<LiveAlert, 'id' | 'createdAt'>) => void;
  dismissAlert: (id: string) => void;
  addReport: (report: Omit<ObstacleReport, 'id' | 'createdAt' | 'confirmations'>) => void;
  confirmReport: (id: string) => void;
  signOut: () => void;
}

const DEFAULT_SETTINGS: A11ySettings = {
  fontScale: 1.15,
  highContrast: false,
  reduceMotion: false,
  voiceGuidance: false,
  haptics: true,
};

let alertSeq = 0;
const newAlert = (a: Omit<LiveAlert, 'id' | 'createdAt'>): LiveAlert => ({
  ...a,
  id: `alert-${Date.now()}-${alertSeq++}`,
  createdAt: Date.now(),
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      user: null,
      settings: DEFAULT_SETTINGS,
      facility: createMockFacility(),
      graphVersion: 0,
      alerts: [],
      reports: [],
      activeSpotId: null,
      sensorConnected: false,

      completeOnboarding: () => set({ onboarded: true }),
      setUser: (user) => set({ user }),
      setCredential: (credential) => {
        const user = get().user;
        if (user) set({ user: { ...user, credential } });
      },
      updateSettings: (patch) =>
        set((s) => {
          const next = { ...s.settings, ...patch };
          next.fontScale = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Number(next.fontScale.toFixed(2))));
          return { settings: next };
        }),

      applySensorEvents: (events) =>
        set((s) => {
          let spots = s.facility.spots;
          let elevators = s.facility.elevators;
          let edges = s.facility.edges;
          let routingChanged = false;
          const alerts: LiveAlert[] = [];

          const spotUpdates = new Map<string, SensorEvent & { type: 'spot' }>();
          for (const ev of events) {
            if (ev.type === 'spot') {
              spotUpdates.set(ev.spotId, ev);
            } else if (ev.type === 'elevator') {
              const target = elevators.find((e) => e.id === ev.elevatorId);
              if (!target || target.status === ev.status) continue;
              elevators = elevators.map((e) => (e.id === ev.elevatorId ? { ...e, status: ev.status } : e));
              routingChanged = true;
              alerts.push(
                newAlert(
                  ev.status === 'maintenance'
                    ? {
                        severity: 'critical',
                        title: `${target.label} em manutenção`,
                        message: `Atenção: ${target.label} em manutenção. Redirecionando rota segura.`,
                        affectsRouting: true,
                      }
                    : {
                        severity: 'info',
                        title: `${target.label} liberado`,
                        message: `${target.label} voltou a operar normalmente.`,
                        affectsRouting: true,
                      },
                ),
              );
            } else if (ev.type === 'edge') {
              const target = edges.find((e) => e.id === ev.edgeId);
              if (!target || target.blocked === ev.blocked) continue;
              edges = edges.map((e) =>
                e.id === ev.edgeId ? { ...e, blocked: ev.blocked, blockedReason: ev.reason } : e,
              );
              routingChanged = true;
              alerts.push(
                newAlert(
                  ev.blocked
                    ? {
                        severity: 'warning',
                        title: 'Passagem bloqueada',
                        message: `Atenção: passagem temporariamente bloqueada (${ev.reason ?? 'obstáculo'}). Recalculando rota sem barreiras.`,
                        affectsRouting: true,
                      }
                    : {
                        severity: 'info',
                        title: 'Passagem liberada',
                        message: 'Uma passagem que estava bloqueada foi liberada.',
                        affectsRouting: true,
                      },
                ),
              );
            }
          }

          if (spotUpdates.size > 0) {
            spots = spots.map((spot) => {
              const ev = spotUpdates.get(spot.id);
              // Vaga reservada pelo usuário não é sobrescrita por leituras do sensor.
              if (!ev || spot.status === 'reserved' || spot.status === ev.status) return spot;
              return {
                ...spot,
                status: ev.status,
                updatedAt: ev.at,
                // Nova ocupação de vaga prioritária: credencial ainda não verificada.
                occupantVerified: ev.status === 'occupied' && spot.category !== 'regular' ? Math.random() > 0.2 : undefined,
              };
            });
          }

          return {
            facility: { ...s.facility, spots, elevators, edges },
            graphVersion: routingChanged ? s.graphVersion + 1 : s.graphVersion,
            alerts: alerts.length ? [...alerts, ...s.alerts].slice(0, 20) : s.alerts,
          };
        }),

      setSensorConnected: (v) => set({ sensorConnected: v }),

      reserveSpot: (spotId) =>
        set((s) => ({
          activeSpotId: spotId,
          facility: {
            ...s.facility,
            spots: s.facility.spots.map((sp) => {
              if (sp.id === spotId) return { ...sp, status: 'reserved' as const, updatedAt: Date.now() };
              if (sp.id === s.activeSpotId && sp.status === 'reserved') return { ...sp, status: 'free' as const };
              return sp;
            }),
          },
        })),

      releaseSpot: () =>
        set((s) => ({
          activeSpotId: null,
          facility: {
            ...s.facility,
            spots: s.facility.spots.map((sp) =>
              sp.id === s.activeSpotId && sp.status === 'reserved' ? { ...sp, status: 'free' as const } : sp,
            ),
          },
        })),

      confirmParking: (spotId, verified) =>
        set((s) => ({
          activeSpotId: s.activeSpotId === spotId ? null : s.activeSpotId,
          facility: {
            ...s.facility,
            spots: s.facility.spots.map((sp) =>
              sp.id === spotId ? { ...sp, status: 'occupied' as const, occupantVerified: verified, updatedAt: Date.now() } : sp,
            ),
          },
        })),

      pushAlert: (alert) => set((s) => ({ alerts: [newAlert(alert), ...s.alerts].slice(0, 20) })),
      dismissAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

      addReport: (report) =>
        set((s) => ({
          reports: [
            { ...report, id: `rep-${Date.now()}`, createdAt: Date.now(), confirmations: 1 },
            ...s.reports,
          ],
        })),
      confirmReport: (id) =>
        set((s) => ({
          reports: s.reports.map((r) => (r.id === id ? { ...r, confirmations: r.confirmations + 1 } : r)),
        })),

      signOut: () => set({ user: null, activeSpotId: null }),
    }),
    {
      name: 'spotfinder-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ onboarded: s.onboarded, user: s.user, settings: s.settings }),
    },
  ),
);

/** Selectors utilitários. */
export const selectSpot = (id: string | null | undefined) => (s: AppState) =>
  id ? s.facility.spots.find((sp) => sp.id === id) : undefined;
