import * as Tone from 'tone';

/**
 * Minimal interface the Chord Drone engine needs from a polyphonic voice,
 * so different Tone.js synth types can be used interchangeably.
 */
export interface DroneSynth {
  triggerAttack(notes: string[], time?: number): void;
  triggerRelease(notes: string[], time?: number): void;
  releaseAll(): void;
  volume: { value: number };
  dispose(): void;
}

export interface DroneSoundHandle {
  synth: DroneSynth;
  dispose: () => void;
}

export type SoundId = 'triangle' | 'sine' | 'strings' | 'reed' | 'fm';

interface SoundDef {
  id: SoundId;
  label: string;
  create: () => DroneSoundHandle;
}

/** Build a handle from a synth and an optional filter, both disposed together. */
function handle(synth: DroneSynth, filter?: Tone.Filter): DroneSoundHandle {
  return {
    synth,
    dispose: () => {
      synth.dispose();
      filter?.dispose();
    },
  };
}

/**
 * Available drone timbres. The first one ("Triangle Pad") is the original sound;
 * the rest are added alternatives.
 */
export const DRONE_SOUNDS: SoundDef[] = [
  {
    id: 'triangle',
    label: 'Triangle Pad',
    create: () => {
      const filter = new Tone.Filter(2000, 'lowpass').toDestination();
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.6, decay: 0.2, sustain: 0.9, release: 1.2 },
      }).connect(filter);
      return handle(synth as unknown as DroneSynth, filter);
    },
  },
  {
    id: 'sine',
    label: 'Sine Pad',
    create: () => {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.9, decay: 0.3, sustain: 1, release: 1.8 },
      }).toDestination();
      return handle(synth as unknown as DroneSynth);
    },
  },
  {
    id: 'strings',
    label: 'Strings',
    create: () => {
      const filter = new Tone.Filter(1300, 'lowpass').toDestination();
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
        envelope: { attack: 0.5, decay: 0.3, sustain: 0.9, release: 1.6 },
      }).connect(filter);
      return handle(synth as unknown as DroneSynth, filter);
    },
  },
  {
    id: 'reed',
    label: 'Reed Organ',
    create: () => {
      const filter = new Tone.Filter(1600, 'lowpass').toDestination();
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' },
        envelope: { attack: 0.05, decay: 0.15, sustain: 0.85, release: 0.5 },
      }).connect(filter);
      return handle(synth as unknown as DroneSynth, filter);
    },
  },
  {
    id: 'fm',
    label: 'FM Keys',
    create: () => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2,
        modulationIndex: 6,
        envelope: { attack: 0.3, decay: 0.4, sustain: 0.8, release: 1.4 },
        modulationEnvelope: { attack: 0.5, decay: 0.2, sustain: 0.6, release: 1 },
      }).toDestination();
      return handle(synth as unknown as DroneSynth);
    },
  },
];

export function createSound(id: SoundId): DroneSoundHandle {
  const def = DRONE_SOUNDS.find((s) => s.id === id) ?? DRONE_SOUNDS[0];
  return def.create();
}
