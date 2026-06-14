import {
  transposeRoot,
  type ChordQuality,
  type RootNote,
} from './chords';

/**
 * One chord on the loop timeline, positioned absolutely in beats.
 * `startBeat` = where it begins, `lengthBeats` = how many beats it lasts.
 */
export interface ChordStep {
  id: string;
  root: RootNote;
  quality: ChordQuality;
  startBeat: number;
  lengthBeats: number;
}

/** A preset step is defined relative to a key: semitone offset + quality + length in beats. */
interface PresetStep {
  offset: number;
  quality: ChordQuality;
  beats: number;
}

interface PresetDef {
  label: string;
  /** Beats per measure the preset is written in (presets are in 4/4). */
  beatsPerMeasure: number;
  beatUnit: number;
  steps: PresetStep[];
}

/**
 * Standard cadence / progression presets, defined relative to the selected key
 * and in quarter-note beats (4/4). `buildProgression` expands them into absolute
 * timeline positions and reports the matching rhythm settings.
 */
export const PROGRESSION_PRESETS = {
  'maj-cadence': {
    label: 'I – IV – V – I',
    beatsPerMeasure: 4,
    beatUnit: 4,
    steps: [
      { offset: 0, quality: 'maj', beats: 4 },
      { offset: 5, quality: 'maj', beats: 4 },
      { offset: 7, quality: 'maj', beats: 4 },
      { offset: 0, quality: 'maj', beats: 4 },
    ],
  },
  'ii-V-I': {
    label: 'ii – V – I (jazz)',
    beatsPerMeasure: 4,
    beatUnit: 4,
    steps: [
      { offset: 2, quality: 'min7', beats: 4 },
      { offset: 7, quality: 'dom7', beats: 4 },
      { offset: 0, quality: 'maj7', beats: 8 },
    ],
  },
  'ii-V-I-short': {
    label: 'ii – V – I (2 beats each)',
    beatsPerMeasure: 4,
    beatUnit: 4,
    steps: [
      { offset: 2, quality: 'min7', beats: 2 },
      { offset: 7, quality: 'dom7', beats: 2 },
      { offset: 0, quality: 'maj7', beats: 4 },
    ],
  },
  'twelve-bar-blues': {
    label: '12-bar Blues',
    beatsPerMeasure: 4,
    beatUnit: 4,
    steps: [
      { offset: 0, quality: 'dom7', beats: 4 }, // 1  I7
      { offset: 0, quality: 'dom7', beats: 4 }, // 2  I7
      { offset: 0, quality: 'dom7', beats: 4 }, // 3  I7
      { offset: 0, quality: 'dom7', beats: 4 }, // 4  I7
      { offset: 5, quality: 'dom7', beats: 4 }, // 5  IV7
      { offset: 5, quality: 'dom7', beats: 4 }, // 6  IV7
      { offset: 0, quality: 'dom7', beats: 4 }, // 7  I7
      { offset: 0, quality: 'dom7', beats: 4 }, // 8  I7
      { offset: 7, quality: 'dom7', beats: 4 }, // 9  V7
      { offset: 5, quality: 'dom7', beats: 4 }, // 10 IV7
      { offset: 0, quality: 'dom7', beats: 4 }, // 11 I7
      { offset: 7, quality: 'dom7', beats: 4 }, // 12 V7 (turnaround)
    ],
  },
} satisfies Record<string, PresetDef>;

export type PresetId = keyof typeof PROGRESSION_PRESETS;

let idCounter = 0;
export function newStepId(): string {
  idCounter += 1;
  return `step-${idCounter}-${Date.now()}`;
}

export interface LoadedProgression {
  steps: ChordStep[];
  beatsPerMeasure: number;
  beatUnit: number;
  bars: number;
}

/** Expand a preset into absolute timeline chord steps in the given key. */
export function buildProgression(
  presetId: PresetId,
  key: RootNote,
): LoadedProgression {
  const preset = PROGRESSION_PRESETS[presetId];
  let cursor = 0;
  const steps: ChordStep[] = preset.steps.map((s) => {
    const step: ChordStep = {
      id: newStepId(),
      root: transposeRoot(key, s.offset),
      quality: s.quality,
      startBeat: cursor,
      lengthBeats: s.beats,
    };
    cursor += s.beats;
    return step;
  });
  return {
    steps,
    beatsPerMeasure: preset.beatsPerMeasure,
    beatUnit: preset.beatUnit,
    bars: Math.ceil(cursor / preset.beatsPerMeasure),
  };
}
