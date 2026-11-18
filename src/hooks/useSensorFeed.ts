import { useEffect } from 'react';
import { MockSensorHub } from '../services/iot/mockSensorHub';
import { useAppStore } from '../store/useAppStore';

/** Instância única do hub — trocar por `new MqttSensorHub(...)` em produção. */
export const sensorHub = new MockSensorHub({
  getSnapshot: () => useAppStore.getState().facility,
  tickMs: 3000,
  spotChangesPerTick: 2,
});

/** Conecta o feed IoT ao store enquanto o app estiver montado. */
export function useSensorFeed() {
  const apply = useAppStore((s) => s.applySensorEvents);
  const setConnected = useAppStore((s) => s.setSensorConnected);

  useEffect(() => {
    const unsubscribe = sensorHub.subscribe(apply);
    sensorHub.connect();
    setConnected(true);
    return () => {
      unsubscribe();
      sensorHub.disconnect();
      setConnected(false);
    };
  }, [apply, setConnected]);
}
