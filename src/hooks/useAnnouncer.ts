import { useCallback } from 'react';
import { announce, AnnounceOptions } from '../services/voice/voiceGuide';
import { useAppStore } from '../store/useAppStore';

/** Retorna `say(texto, tipo)` já respeitando as preferências de voz/háptico do usuário. */
export function useAnnouncer() {
  const voice = useAppStore((s) => s.settings.voiceGuidance);
  const haptics = useAppStore((s) => s.settings.haptics);
  return useCallback(
    (message: string, kind: AnnounceOptions['kind'] = 'info', interrupt = false) =>
      announce(message, { voice, haptics, kind, interrupt }),
    [voice, haptics],
  );
}
