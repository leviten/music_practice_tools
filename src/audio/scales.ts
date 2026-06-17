import { ROOT_NOTES, type RootNote } from './chords';

/**
 * Scale definitions for the Listen & Repeat ear-training tool.
 * Each scale is a set of semitone intervals from the root.
 */
export const SCALE_TYPES = {
  'major-pentatonic': { label: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
  'minor-pentatonic': { label: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
  ionian: { label: 'Ionian (Major)', intervals: [0, 2, 4, 5, 7, 9, 11] },
  dorian: { label: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { label: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  lydian: { label: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { label: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  aeolian: { label: 'Aeolian (Natural Minor)', intervals: [0, 2, 3, 5, 7, 8, 10] },
  locrian: { label: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10] },
  'harmonic-minor': { label: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
} as const;

export type ScaleType = keyof typeof SCALE_TYPES;

/** Difficulty levels for note selection. */
export type Difficulty = 1 | 2 | 3;

const BASE_OCTAVE = 4;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Convert a semitone offset above the root into a note name (e.g. "D#4"). */
function noteFromOffset(root: RootNote, offset: number): string {
  const abs = ROOT_NOTES.indexOf(root) + offset;
  return `${ROOT_NOTES[abs % 12]}${BASE_OCTAVE + Math.floor(abs / 12)}`;
}

/**
 * Generate a random melodic phrase of `count` notes.
 *
 * Difficulty:
 *  1 – scale notes only.
 *  2 – mostly scale notes (~70%), some non-scale / chromatic notes (~30%).
 *  3 – fully chromatic.
 *
 * Notes are drawn from one octave above the root (root..root+octave).
 */
export function generatePhrase(
  root: RootNote,
  scaleType: ScaleType,
  difficulty: Difficulty,
  count: number,
): string[] {
  const intervals = SCALE_TYPES[scaleType].intervals;
  const scaleSet = new Set<number>(intervals);
  const scaleOffsets = [...intervals, 12]; // include the octave root
  const chromaticOffsets = Array.from({ length: 13 }, (_, i) => i); // 0..12
  const nonScaleOffsets: number[] = [];
  for (let i = 0; i < 12; i += 1) {
    if (!scaleSet.has(i)) nonScaleOffsets.push(i);
  }

  const phrase: string[] = [];
  for (let i = 0; i < count; i += 1) {
    let offset: number;
    if (difficulty === 1) {
      offset = pick(scaleOffsets);
    } else if (difficulty === 2) {
      offset =
        Math.random() < 0.7 || nonScaleOffsets.length === 0
          ? pick(scaleOffsets)
          : pick(nonScaleOffsets);
    } else {
      offset = pick(chromaticOffsets);
    }
    phrase.push(noteFromOffset(root, offset));
  }
  return phrase;
}
