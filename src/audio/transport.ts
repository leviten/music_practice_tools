import * as Tone from 'tone';

/**
 * Shared audio/clock helpers.
 *
 * All tools (Metronome, Chord Drone, Chord Loop) run on a single Tone.Transport
 * so they stay in sync when combined. The audio context may only be started after
 * an explicit user gesture (browser autoplay policy), hence `ensureAudioReady`.
 */

let started = false;

/** Resume/start the audio context. Must be called from a user gesture. */
export async function ensureAudioReady(): Promise<void> {
  if (started) return;
  await Tone.start();
  started = true;
}

export function getTransport() {
  return Tone.getTransport();
}

/**
 * Shared-clock reference counting. Multiple tools (Metronome, Chord Loop) run on
 * the same Tone.Transport. The transport must keep running as long as at least
 * one tool is active, and only stop (and reset position) when the last one stops.
 */
let clockUsers = 0;

export function acquireClock(): void {
  const transport = getTransport();
  clockUsers += 1;
  if (transport.state !== 'started') transport.start();
}

export function releaseClock(): void {
  clockUsers = Math.max(0, clockUsers - 1);
  if (clockUsers === 0) {
    const transport = getTransport();
    transport.stop();
    transport.position = 0;
  }
}

/** Tempo range supported across the app (BPM). */
export const MIN_BPM = 40;
export const MAX_BPM = 240;

export function clampBpm(bpm: number): number {
  if (Number.isNaN(bpm)) return MIN_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

/**
 * The displayed BPM is the tempo of the *beat unit* (the Grundschlag): a tool
 * advances `bpm` beats per minute regardless of the note value. Tone.Transport
 * always counts in quarter notes, so convert the beat tempo into a quarter-note
 * tempo for the shared clock. Shared by Metronome and Chord Loop.
 */
export function beatBpmToQuarterBpm(bpm: number, beatUnit: number): number {
  return (bpm * 4) / beatUnit;
}
