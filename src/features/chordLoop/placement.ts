import type { ChordStep } from '../../audio/progressions';

/** The chord covering a given beat, if any. */
export function coveringStep(
  steps: ChordStep[],
  beat: number,
): ChordStep | undefined {
  return steps.find(
    (s) => beat >= s.startBeat && beat < s.startBeat + s.lengthBeats,
  );
}

/** Build the list of free [start, end) intervals not occupied by `others`. */
function freeIntervals(
  others: ChordStep[],
  totalBeats: number,
): [number, number][] {
  const occ = others
    .map((s) => [s.startBeat, s.startBeat + s.lengthBeats] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const free: [number, number][] = [];
  let cursor = 0;
  for (const [a, b] of occ) {
    if (a > cursor) free.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < totalBeats) free.push([cursor, totalBeats]);
  return free;
}

/**
 * Find the start position closest to `desiredStart` where a block of `length`
 * beats fits without overlapping `others` and stays within the timeline.
 * Returns null if it doesn't fit anywhere.
 */
export function clampStart(
  others: ChordStep[],
  desiredStart: number,
  length: number,
  totalBeats: number,
): number | null {
  const fits = freeIntervals(others, totalBeats).filter(
    ([a, b]) => b - a >= length,
  );
  if (fits.length === 0) return null;
  let bestStart = 0;
  let bestDist = Infinity;
  for (const [a, b] of fits) {
    const s = Math.min(Math.max(desiredStart, a), b - length);
    const d = Math.abs(s - desiredStart);
    if (d < bestDist) {
      bestDist = d;
      bestStart = s;
    }
  }
  return bestStart;
}

/**
 * The maximum length a chord starting at `start` may have before it would hit
 * the next chord or the end of the timeline.
 */
export function maxLengthFrom(
  others: ChordStep[],
  start: number,
  totalBeats: number,
): number {
  let limit = totalBeats;
  for (const s of others) {
    if (s.startBeat >= start && s.startBeat < limit) limit = s.startBeat;
  }
  return Math.max(1, limit - start);
}
