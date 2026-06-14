/**
 * Shared music-theory helpers used by Chord Drone and Chord Loop.
 *
 * A chord is described by a root note (pitch class) and a quality (interval set).
 * `buildChord` turns that into concrete note names (e.g. "C4", "E4", "G4") that
 * Tone.js synths understand.
 */

export const ROOT_NOTES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export type RootNote = (typeof ROOT_NOTES)[number];

/** Chord qualities mapped to semitone intervals from the root. */
export const CHORD_QUALITIES = {
  root: { label: 'Root only', intervals: [0] },
  fifth: { label: 'Fifth', intervals: [0, 7] },
  maj: { label: 'Major', intervals: [0, 4, 7] },
  min: { label: 'Minor', intervals: [0, 3, 7] },
  dim: { label: 'Diminished', intervals: [0, 3, 6] },
  aug: { label: 'Augmented', intervals: [0, 4, 8] },
  maj7: { label: 'Major 7', intervals: [0, 4, 7, 11] },
  min7: { label: 'Minor 7', intervals: [0, 3, 7, 10] },
  dom7: { label: 'Dominant 7', intervals: [0, 4, 7, 10] },
  sus2: { label: 'Sus2', intervals: [0, 2, 7] },
  sus4: { label: 'Sus4', intervals: [0, 5, 7] },
} as const;

export type ChordQuality = keyof typeof CHORD_QUALITIES;

const NOTE_TO_SEMITONE: Record<RootNote, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11,
};

const SEMITONE_TO_NOTE = ROOT_NOTES;

/**
 * Build concrete note names for a chord.
 *
 * @param root    Root pitch class, e.g. "C".
 * @param quality Chord quality key, e.g. "maj7".
 * @param octave  Octave of the root note (scientific pitch notation).
 * @returns       Note names like ["C4", "E4", "G4"].
 */
export function buildChord(
  root: RootNote,
  quality: ChordQuality,
  octave: number,
): string[] {
  const rootSemitone = NOTE_TO_SEMITONE[root];
  return CHORD_QUALITIES[quality].intervals.map((interval) => {
    const absolute = rootSemitone + interval;
    const noteName = SEMITONE_TO_NOTE[absolute % 12];
    const noteOctave = octave + Math.floor(absolute / 12);
    return `${noteName}${noteOctave}`;
  });
}

/** Human-readable chord label, e.g. "C Major 7". */
export function chordLabel(root: RootNote, quality: ChordQuality): string {
  return `${root} ${CHORD_QUALITIES[quality].label}`;
}

/** Compact suffixes for chord symbols, e.g. "m7", "7", "5". */
const CHORD_SYMBOLS: Record<ChordQuality, string> = {
  root: '',
  fifth: '5',
  maj: '',
  min: 'm',
  dim: 'dim',
  aug: 'aug',
  maj7: 'maj7',
  min7: 'm7',
  dom7: '7',
  sus2: 'sus2',
  sus4: 'sus4',
};

/** Compact chord symbol for tight UI, e.g. "Cm7", "G7", "D5". */
export function chordSymbol(root: RootNote, quality: ChordQuality): string {
  return `${root}${CHORD_SYMBOLS[quality]}`;
}

/** Transpose a root pitch class by a number of semitones (wraps within octave). */
export function transposeRoot(root: RootNote, semitones: number): RootNote {
  const s = ((NOTE_TO_SEMITONE[root] + semitones) % 12 + 12) % 12;
  return ROOT_NOTES[s];
}
