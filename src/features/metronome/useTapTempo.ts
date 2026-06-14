import { useCallback, useRef } from 'react';

/**
 * Tap tempo: averages the interval between recent taps to derive a BPM.
 * Taps that are too far apart reset the running average (treated as a new tempo).
 */
const MAX_TAP_GAP_MS = 2000;
const MAX_TAPS = 6;

export function useTapTempo(onBpm: (bpm: number) => void) {
  const tapsRef = useRef<number[]>([]);

  return useCallback(() => {
    const now = performance.now();
    const taps = tapsRef.current;
    const last = taps[taps.length - 1];

    if (last !== undefined && now - last > MAX_TAP_GAP_MS) {
      taps.length = 0; // gap too large -> start over
    }

    taps.push(now);
    if (taps.length > MAX_TAPS) taps.shift();

    if (taps.length >= 2) {
      const intervals = taps.slice(1).map((t, i) => t - taps[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      onBpm(60000 / avg);
    }
  }, [onBpm]);
}
