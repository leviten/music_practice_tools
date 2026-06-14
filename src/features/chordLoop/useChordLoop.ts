import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';
import {
  acquireClock,
  beatBpmToQuarterBpm,
  clampBpm,
  ensureAudioReady,
  getTransport,
  releaseClock,
} from '../../audio/transport';
import { buildChord, type ChordQuality, type RootNote } from '../../audio/chords';
import {
  buildProgression,
  newStepId,
  type ChordStep,
  type PresetId,
} from '../../audio/progressions';
import { clampStart, coveringStep, maxLengthFrom } from './placement';

interface Compiled {
  steps: ChordStep[];
  notesById: Map<string, string[]>;
  totalBeats: number;
}

const CLICK_ACCENT_FREQ = 1500; // downbeat
const CLICK_NORMAL_FREQ = 1000; // other beats
/** Slider value (dB) at/below which the metronome click is treated as muted. */
const CLICK_MUTE_DB = -40;

function compile(
  steps: ChordStep[],
  octave: number,
  totalBeats: number,
): Compiled {
  const notesById = new Map<string, string[]>();
  for (const s of steps) {
    notesById.set(s.id, buildChord(s.root, s.quality, octave));
  }
  return { steps, notesById, totalBeats };
}

/**
 * Chord Loop audio engine.
 *
 * Chords live on an absolute beat timeline (startBeat / lengthBeats). Playback
 * runs on the shared Tone.Transport: a `scheduleRepeat` at the beat-unit interval
 * advances a beat counter, and at each beat the chord covering that beat is
 * triggered (re-triggered only when it changes), so chords sustain across their
 * length and gaps fall silent.
 */
export function useChordLoop() {
  const [isRunning, setIsRunning] = useState(false);
  const [key, setKey] = useState<RootNote>('C');
  const [octave, setOctave] = useState(3);
  const [bpm, setBpmState] = useState(120);
  const [beatsPerMeasure, setBeatsPerMeasureState] = useState(4);
  const [beatUnit, setBeatUnitState] = useState(4);
  const [bars, setBarsState] = useState(4);
  const [steps, setSteps] = useState<ChordStep[]>([]); // default: empty
  const [currentBeat, setCurrentBeat] = useState(-1);

  const totalBeats = bars * beatsPerMeasure;

  const synthRef = useRef<Tone.PolySynth<Tone.Synth> | null>(null);
  const clickSynthRef = useRef<Tone.MembraneSynth | null>(null);
  const clickMutedRef = useRef(true); // click is off by default
  const scheduleIdRef = useRef<number | null>(null);
  const beatCounterRef = useRef(0);
  const currentNotesRef = useRef<string[]>([]);
  const lastStepIdRef = useRef<string | null>(null);
  const beatUnitRef = useRef(beatUnit);
  const beatsPerMeasureRef = useRef(beatsPerMeasure);
  const bpmRef = useRef(bpm);

  const compiled = useMemo(
    () => compile(steps, octave, totalBeats),
    [steps, octave, totalBeats],
  );
  const compiledRef = useRef(compiled);
  useEffect(() => {
    compiledRef.current = compiled;
  }, [compiled]);
  useEffect(() => {
    beatUnitRef.current = beatUnit;
  }, [beatUnit]);
  useEffect(() => {
    beatsPerMeasureRef.current = beatsPerMeasure;
  }, [beatsPerMeasure]);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  // Create the chord pad and the metronome click synth once.
  useEffect(() => {
    const filter = new Tone.Filter(2200, 'lowpass').toDestination();
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.04, decay: 0.2, sustain: 0.8, release: 0.3 },
    }).connect(filter);
    synth.volume.value = -6;
    synthRef.current = synth;

    const click = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.02 },
    }).toDestination();
    click.volume.value = CLICK_MUTE_DB;
    clickSynthRef.current = click;

    return () => {
      synth.dispose();
      filter.dispose();
      click.dispose();
    };
  }, []);

  const releaseCurrent = useCallback((time?: number) => {
    const synth = synthRef.current;
    if (synth && currentNotesRef.current.length > 0) {
      synth.triggerRelease(currentNotesRef.current, time);
      currentNotesRef.current = [];
    }
    lastStepIdRef.current = null;
  }, []);

  const scheduleLoop = useCallback(() => {
    const transport = getTransport();
    if (scheduleIdRef.current !== null) transport.clear(scheduleIdRef.current);
    const interval = `${beatUnitRef.current}n`;
    scheduleIdRef.current = transport.scheduleRepeat((time) => {
      const { steps, notesById, totalBeats } = compiledRef.current;
      if (totalBeats === 0) return;
      const pos = beatCounterRef.current % totalBeats;

      // Optional metronome click, accented on the downbeat.
      if (!clickMutedRef.current && clickSynthRef.current) {
        const isDownbeat = pos % beatsPerMeasureRef.current === 0;
        clickSynthRef.current.triggerAttackRelease(
          isDownbeat ? CLICK_ACCENT_FREQ : CLICK_NORMAL_FREQ,
          '32n',
          time,
          isDownbeat ? 1 : 0.7,
        );
      }

      const step = coveringStep(steps, pos);
      const stepId = step ? step.id : null;
      if (stepId !== lastStepIdRef.current) {
        const synth = synthRef.current;
        if (synth) {
          if (currentNotesRef.current.length > 0) {
            synth.triggerRelease(currentNotesRef.current, time);
            currentNotesRef.current = [];
          }
          if (step) {
            const notes = notesById.get(step.id) ?? [];
            synth.triggerAttack(notes, time);
            currentNotesRef.current = notes;
          }
        }
        lastStepIdRef.current = stepId;
      }
      Tone.getDraw().schedule(() => setCurrentBeat(pos), time);
      beatCounterRef.current += 1;
    }, interval);
  }, []);

  const start = useCallback(async () => {
    if (isRunning || compiledRef.current.totalBeats === 0) return;
    await ensureAudioReady();
    const transport = getTransport();
    transport.bpm.value = beatBpmToQuarterBpm(bpmRef.current, beatUnitRef.current);
    transport.timeSignature = [beatsPerMeasure, beatUnitRef.current];
    beatCounterRef.current = 0;
    lastStepIdRef.current = null;
    scheduleLoop();
    acquireClock();
    setIsRunning(true);
  }, [isRunning, beatsPerMeasure, scheduleLoop]);

  const stop = useCallback(() => {
    const transport = getTransport();
    if (scheduleIdRef.current !== null) {
      transport.clear(scheduleIdRef.current);
      scheduleIdRef.current = null;
    }
    releaseCurrent();
    releaseClock();
    setIsRunning(false);
    setCurrentBeat(-1);
  }, [releaseCurrent]);

  const toggle = useCallback(() => {
    if (isRunning) stop();
    else void start();
  }, [isRunning, start, stop]);

  const setVolume = useCallback((db: number) => {
    if (synthRef.current) synthRef.current.volume.value = db;
  }, []);

  const setClickVolume = useCallback((db: number) => {
    const muted = db <= CLICK_MUTE_DB;
    clickMutedRef.current = muted;
    if (clickSynthRef.current) {
      clickSynthRef.current.volume.value = muted ? -Infinity : db;
    }
  }, []);

  // --- Rhythm controls -----------------------------------------------------

  const setBpm = useCallback((value: number) => {
    const next = clampBpm(value);
    setBpmState(next);
    getTransport().bpm.value = beatBpmToQuarterBpm(next, beatUnitRef.current);
  }, []);

  const setBeatUnit = useCallback(
    (value: number) => {
      setBeatUnitState(value);
      beatUnitRef.current = value;
      const transport = getTransport();
      transport.bpm.value = beatBpmToQuarterBpm(bpmRef.current, value);
      if (isRunning) scheduleLoop();
    },
    [isRunning, scheduleLoop],
  );

  // Trim any chords that no longer fit when the timeline shrinks.
  const fitStepsToTimeline = useCallback((next: number) => {
    setSteps((prev) =>
      prev
        .filter((s) => s.startBeat < next)
        .map((s) =>
          s.startBeat + s.lengthBeats > next
            ? { ...s, lengthBeats: next - s.startBeat }
            : s,
        ),
    );
  }, []);

  const setBeatsPerMeasure = useCallback(
    (value: number) => {
      const next = Math.min(32, Math.max(1, Math.round(value)));
      setBeatsPerMeasureState(next);
      fitStepsToTimeline(next * bars);
    },
    [bars, fitStepsToTimeline],
  );

  const setBars = useCallback(
    (value: number) => {
      const next = Math.min(16, Math.max(1, Math.round(value)));
      setBarsState(next);
      fitStepsToTimeline(next * beatsPerMeasure);
    },
    [beatsPerMeasure, fitStepsToTimeline],
  );

  // --- Progression editing -------------------------------------------------

  const loadPreset = useCallback(
    (presetId: PresetId) => {
      const p = buildProgression(presetId, key);
      setBeatsPerMeasureState(p.beatsPerMeasure);
      setBeatUnitState(p.beatUnit);
      beatUnitRef.current = p.beatUnit;
      setBarsState(p.bars);
      setSteps(p.steps);
      getTransport().bpm.value = beatBpmToQuarterBpm(bpmRef.current, p.beatUnit);
    },
    [key],
  );

  const addChord = useCallback(
    (beat: number, root: RootNote, quality: ChordQuality) => {
      setSteps((prev) => {
        const total = bars * beatsPerMeasure;
        const occupied = (b: number) =>
          prev.some((s) => b >= s.startBeat && b < s.startBeat + s.lengthBeats);
        if (beat < 0 || beat >= total || occupied(beat)) return prev;
        // Fill the whole bar that contains the clicked beat (or the free part of
        // it, if some beats in the bar are already taken).
        const barStart = Math.floor(beat / beatsPerMeasure) * beatsPerMeasure;
        const barEnd = Math.min(total, barStart + beatsPerMeasure);
        let start = beat;
        while (start - 1 >= barStart && !occupied(start - 1)) start -= 1;
        let end = beat;
        while (end + 1 < barEnd && !occupied(end + 1)) end += 1;
        return [
          ...prev,
          {
            id: newStepId(),
            root,
            quality,
            startBeat: start,
            lengthBeats: end - start + 1,
          },
        ];
      });
    },
    [bars, beatsPerMeasure],
  );

  const updateChord = useCallback(
    (id: string, patch: Partial<Pick<ChordStep, 'root' | 'quality'>>) => {
      setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    },
    [],
  );

  const moveChord = useCallback(
    (id: string, desiredStart: number) => {
      setSteps((prev) => {
        const step = prev.find((s) => s.id === id);
        if (!step) return prev;
        const others = prev.filter((s) => s.id !== id);
        const start = clampStart(
          others,
          desiredStart,
          step.lengthBeats,
          bars * beatsPerMeasure,
        );
        if (start === null || start === step.startBeat) return prev;
        return prev.map((s) => (s.id === id ? { ...s, startBeat: start } : s));
      });
    },
    [bars, beatsPerMeasure],
  );

  const resizeChord = useCallback(
    (id: string, desiredLength: number) => {
      setSteps((prev) => {
        const step = prev.find((s) => s.id === id);
        if (!step) return prev;
        const others = prev.filter((s) => s.id !== id);
        const max = maxLengthFrom(others, step.startBeat, bars * beatsPerMeasure);
        const length = Math.min(max, Math.max(1, Math.round(desiredLength)));
        if (length === step.lengthBeats) return prev;
        return prev.map((s) => (s.id === id ? { ...s, lengthBeats: length } : s));
      });
    },
    [bars, beatsPerMeasure],
  );

  const removeChord = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearSteps = useCallback(() => {
    setSteps([]);
    setCurrentBeat(-1);
  }, []);

  // Clean up on unmount: stop scheduling and release the shared clock.
  useEffect(() => {
    return () => {
      if (scheduleIdRef.current !== null) {
        getTransport().clear(scheduleIdRef.current);
        scheduleIdRef.current = null;
        releaseClock();
      }
      const synth = synthRef.current;
      if (synth) synth.releaseAll();
    };
  }, []);

  return {
    isRunning,
    key,
    octave,
    bpm,
    beatsPerMeasure,
    beatUnit,
    bars,
    steps,
    totalBeats,
    currentBeat,
    setKey,
    setOctave,
    setBpm,
    setBeatsPerMeasure,
    setBeatUnit,
    setBars,
    setVolume,
    setClickVolume,
    loadPreset,
    addChord,
    updateChord,
    moveChord,
    resizeChord,
    removeChord,
    clearSteps,
    start,
    stop,
    toggle,
  };
}
