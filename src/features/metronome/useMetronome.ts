import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import {
  acquireClock,
  beatBpmToQuarterBpm,
  clampBpm,
  ensureAudioReady,
  getTransport,
  releaseClock,
} from '../../audio/transport';

export interface MetronomeState {
  isRunning: boolean;
  bpm: number;
  /** Number of beats (counts) per measure — the time-signature numerator. */
  beatsPerMeasure: number;
  /** Note value of one beat — the time-signature denominator (2, 4, 8, 16). */
  beatUnit: number;
  /** 0-based index of the current beat in the measure, or -1 when stopped. */
  currentBeat: number;
}

const ACCENT_FREQ = 1500; // downbeat
const NORMAL_FREQ = 1000; // other beats

/**
 * Metronome audio engine wrapped as a React hook.
 *
 * Timing is driven by Tone.Transport (Web Audio clock), not setInterval, so the
 * tempo stays jitter-free. Visual updates are scheduled via Tone.getDraw() so the
 * beat indicator is aligned with the audible click.
 */
export function useMetronome() {
  const [isRunning, setIsRunning] = useState(false);
  const [bpm, setBpmState] = useState(120);
  const [beatsPerMeasure, setBeatsPerMeasureState] = useState(4);
  const [beatUnit, setBeatUnitState] = useState(4);
  const [currentBeat, setCurrentBeat] = useState(-1);

  const synthRef = useRef<Tone.MembraneSynth | null>(null);
  const scheduleIdRef = useRef<number | null>(null);
  const beatCounterRef = useRef(0);
  const beatsPerMeasureRef = useRef(beatsPerMeasure);
  const beatUnitRef = useRef(beatUnit);
  const bpmRef = useRef(bpm);

  // Keep refs in sync so the scheduled (audio-thread) callback and re-scheduling
  // logic always read the latest values.
  useEffect(() => {
    beatsPerMeasureRef.current = beatsPerMeasure;
  }, [beatsPerMeasure]);
  useEffect(() => {
    beatUnitRef.current = beatUnit;
  }, [beatUnit]);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  // Lazily create the synth and clean it up on unmount.
  useEffect(() => {
    const synth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.02 },
    }).toDestination();
    synthRef.current = synth;
    return () => {
      synth.dispose();
    };
  }, []);

  /** Register the repeating click at the current beat-unit interval. */
  const scheduleClicks = useCallback(() => {
    const transport = getTransport();
    if (scheduleIdRef.current !== null) {
      transport.clear(scheduleIdRef.current);
    }
    const interval = `${beatUnitRef.current}n`;
    scheduleIdRef.current = transport.scheduleRepeat((time) => {
      const beatInMeasure = beatCounterRef.current % beatsPerMeasureRef.current;
      const isDownbeat = beatInMeasure === 0;
      const synth = synthRef.current;
      if (synth) {
        synth.triggerAttackRelease(
          isDownbeat ? ACCENT_FREQ : NORMAL_FREQ,
          '32n',
          time,
          isDownbeat ? 1 : 0.7,
        );
      }
      // Align the visual indicator with the audible click.
      Tone.getDraw().schedule(() => setCurrentBeat(beatInMeasure), time);
      beatCounterRef.current += 1;
    }, interval);
  }, []);

  const setBpm = useCallback((value: number) => {
    const next = clampBpm(value);
    setBpmState(next);
    getTransport().bpm.value = beatBpmToQuarterBpm(next, beatUnitRef.current);
  }, []);

  const setBeatsPerMeasure = useCallback((value: number) => {
    const next = Math.min(32, Math.max(1, Math.round(value)));
    setBeatsPerMeasureState(next);
    getTransport().timeSignature = [next, beatUnitRef.current];
  }, []);

  const setBeatUnit = useCallback(
    (value: number) => {
      setBeatUnitState(value);
      beatUnitRef.current = value;
      const transport = getTransport();
      // Re-map tempo and time signature for the new beat unit.
      transport.bpm.value = beatBpmToQuarterBpm(bpmRef.current, value);
      transport.timeSignature = [beatsPerMeasureRef.current, value];
      // The click interval is fixed at registration, so re-schedule if running.
      if (isRunning) scheduleClicks();
    },
    [isRunning, scheduleClicks],
  );

  const setVolume = useCallback((db: number) => {
    if (synthRef.current) synthRef.current.volume.value = db;
  }, []);

  const start = useCallback(async () => {
    if (isRunning) return;
    await ensureAudioReady();

    const transport = getTransport();
    transport.bpm.value = beatBpmToQuarterBpm(bpmRef.current, beatUnitRef.current);
    transport.timeSignature = [beatsPerMeasureRef.current, beatUnitRef.current];
    beatCounterRef.current = 0;

    scheduleClicks();
    acquireClock();
    setIsRunning(true);
  }, [isRunning, scheduleClicks]);

  const stop = useCallback(() => {
    const transport = getTransport();
    if (scheduleIdRef.current !== null) {
      transport.clear(scheduleIdRef.current);
      scheduleIdRef.current = null;
    }
    releaseClock();
    setIsRunning(false);
    setCurrentBeat(-1);
  }, []);

  const toggle = useCallback(() => {
    if (isRunning) stop();
    else void start();
  }, [isRunning, start, stop]);

  // Clean up on unmount: if still running (e.g. the user switched views), clear
  // the scheduled click and release the shared clock so nothing keeps ticking.
  useEffect(() => {
    return () => {
      if (scheduleIdRef.current !== null) {
        getTransport().clear(scheduleIdRef.current);
        scheduleIdRef.current = null;
        releaseClock();
      }
    };
  }, []);

  const state: MetronomeState = {
    isRunning,
    bpm,
    beatsPerMeasure,
    beatUnit,
    currentBeat,
  };

  return {
    ...state,
    setBpm,
    setBeatsPerMeasure,
    setBeatUnit,
    setVolume,
    start,
    stop,
    toggle,
  };
}
