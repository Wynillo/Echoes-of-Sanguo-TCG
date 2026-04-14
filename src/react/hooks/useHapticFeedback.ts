import { useRef, useCallback } from 'react';

interface HapticConfig {
  enabled: boolean;
  duration: number;
  strength: 'light' | 'medium' | 'heavy';
}

const STRENGTH_MAP: Record<string, number> = {
  light: 0.3,
  medium: 0.6,
  heavy: 1.0,
};

export function useHapticFeedback(config: HapticConfig = { enabled: true, duration: 50, strength: 'light' }) {
  const timeoutRef = useRef<number | null>(null);
  const lastVibrateRef = useRef<number>(0);
  const MIN_VIBRATE_GAP = 30;

  const vibrate = useCallback((
    duration = config.duration, 
    strength = config.strength
  ) => {
    if (!config.enabled) return;
    
    const now = Date.now();
    if (now - lastVibrateRef.current < MIN_VIBRATE_GAP) return;
    
    lastVibrateRef.current = now;

    if (navigator.vibrate) {
      const actualDuration = Math.round(duration * STRENGTH_MAP[strength]);
      navigator.vibrate(actualDuration);
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
    }, duration);
  }, [config.enabled, config.duration, config.strength]);

  const vibratePatterns = {
    onCardDraw: () => vibrate(30, 'light'),
    onCardPlay: () => vibrate(50, 'medium'),
    onAttack: () => {
      vibrate(50, 'medium');
      setTimeout(() => vibrate(50, 'medium'), 80);
    },
    onDamage: () => {
      vibrate(100, 'heavy');
      setTimeout(() => vibrate(100, 'heavy'), 150);
    },
    onPhaseChange: () => vibrate(40, 'light'),
    onTurnEnd: () => vibrate(60, 'medium'),
    onVictory: () => {
      vibrate(200, 'heavy');
      setTimeout(() => vibrate(200, 'heavy'), 250);
      setTimeout(() => vibrate(300, 'heavy'), 500);
    },
    onDefeat: () => {
      vibrate(150, 'heavy');
      setTimeout(() => vibrate(150, 'heavy'), 200);
    },
  };

  return { vibrate, vibratePatterns };
}
