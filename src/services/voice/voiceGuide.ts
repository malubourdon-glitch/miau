import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Canal único de feedback não-visual:
 *  - leitor de tela (TalkBack/VoiceOver) via announceForAccessibility
 *  - voz sintetizada (TTS) para navegação assistida
 *  - háptico para manobras e alertas
 */
export interface AnnounceOptions {
  voice: boolean;
  haptics: boolean;
  /** Interrompe a fala atual (usado em alertas críticos). */
  interrupt?: boolean;
  kind?: 'info' | 'maneuver' | 'warning' | 'success';
}

let screenReaderOn = false;
AccessibilityInfo.isScreenReaderEnabled()
  .then((v) => (screenReaderOn = v))
  .catch(() => undefined);
AccessibilityInfo.addEventListener?.('screenReaderChanged', (v: boolean) => (screenReaderOn = v));

export function announce(message: string, opts: AnnounceOptions) {
  const { voice, haptics, interrupt = false, kind = 'info' } = opts;

  if (haptics && Platform.OS !== 'web') {
    if (kind === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    else if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    else if (kind === 'maneuver') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
  }

  // Se o TTS do app está ligado, ele fala; senão, delegamos ao leitor de tela
  // (evita duas vozes falando ao mesmo tempo).
  if (voice) {
    if (interrupt) Speech.stop();
    Speech.speak(message, { language: 'pt-BR', rate: 0.95, pitch: 1.0 });
  } else if (screenReaderOn) {
    AccessibilityInfo.announceForAccessibility(message);
  }
}

export function stopSpeaking() {
  Speech.stop();
}
