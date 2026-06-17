import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import {
  acquireClock,
  clampBpm,
  ensureAudioReady,
  getTransport,
  releaseClock,
} from '../../audio/transport';
import { type RootNote } from '../../audio/chords';
import {
  generatePhrase,
  type Difficulty,
  type ScaleType,
} from '../../audio/scales';

export type Phase = 'idle' | 'listen' | 'repeat';

const BEATS_PER_MEASURE = 4; // fixed 4/4
const CLICK_ACCENT_FREQ = 1500;
const CLICK_NORMAL_FREQ = 1000;
const CLICK_MUTE_DB = -40;

/**
 * Listen & Repeat (ear training) engine.
 *
 * On each cycle a random phrase of `noteCount` notes is generated and played
 * one note per beat. The phrase occupies `ceil(noteCount / 4)` bars; afterwards
 * there is a silent pause of **twice as many bars** so the musician can repeat
 * by ear. Then a new random phrase plays. A metronome click can run throughout.
 * No correctness checking is performed.
 */
export function useListenRepeat() {
  const [isRunning, setIsRunning] = useState(false);
  const [root, setRoot] = useState<RootNote>('C');
  const [scaleType, setScaleType] = useState<ScaleType>('ionian');
  const [difficulty, setDifficulty] = useState<Difficulty>(1);
  const [noteCount, setNoteCount] = useState(4);
  // Pause length as an integer multiple of the phrase duration (1×, 2×, 3×).
  const [pauseMultiplier, setPauseMultiplier] = useState(2);
  const [bpm, setBpmState] = useState(100);
  const [phase, setPhase] = useState<Phase>('idle');
  const [currentNotes, setCurrentNotes] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const noteSynthRef = useRef<Tone.Synth | null>(null);
  const clickSynthRef = useRef<Tone.MembraneSynth | null>(null);
  const clickMutedRef = useRef(false);
  const scheduleIdRef = useRef<number | null>(null);
  // Guards visual (Tone.Draw) updates so callbacks scheduled before Stop don't
  // fire afterwards and clobber the idle state.
  const runningRef = useRef(false);

  // Cycle state read inside the audio callback.
  const cyclePosRef = useRef(0);
  const cycleLenRef = useRef(0);
  const phraseBeatsRef = useRef(0);
  const phraseRef = useRef<string[]>([]);

  const rootRef = useRef(root);
  const scaleTypeRef = useRef(scaleType);
  const difficultyRef = useRef(difficulty);
  const noteCountRef = useRef(noteCount);
  const pauseMultiplierRef = useRef(pauseMultiplier);

  useEffect(() => {
    rootRef.current = root;
  }, [root]);
  useEffect(() => {
    scaleTypeRef.current = scaleType;
  }, [scaleType]);
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);
  useEffect(() => {
    noteCountRef.current = noteCount;
  }, [noteCount]);
  useEffect(() => {
    pauseMultiplierRef.current = pauseMultiplier;
  }, [pauseMultiplier]);

  // Create synths once.
  useEffect(() => {
    const note = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0.5, release: 0.2 },
    }).toDestination();
    note.volume.value = -6;
    noteSynthRef.current = note;

    const click = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.02 },
    }).toDestination();
    click.volume.value = -12;
    clickSynthRef.current = click;

    return () => {
      note.dispose();
      click.dispose();
    };
  }, []);

  const start = useCallback(async () => {
    if (isRunning) return;
    await ensureAudioReady();
    const transport = getTransport();
    transport.bpm.value = bpm; // 4/4 quarter-note beats
    cyclePosRef.current = 0;
    cycleLenRef.current = 0;
    runningRef.current = true;

    scheduleIdRef.current = transport.scheduleRepeat((time) => {
      // Start of a new cycle: generate a fresh phrase and compute the timing.
      if (cyclePosRef.current === 0) {
        const n = Math.max(1, noteCountRef.current);
        const phrase = generatePhrase(
          rootRef.current,
          scaleTypeRef.current,
          difficultyRef.current,
          n,
        );
        phraseRef.current = phrase;
        const phraseBars = Math.ceil(n / BEATS_PER_MEASURE);
        phraseBeatsRef.current = phraseBars * BEATS_PER_MEASURE;
        // phrase + pause of (multiplier × phrase duration)
        cycleLenRef.current =
          phraseBeatsRef.current * (1 + pauseMultiplierRef.current);
        Tone.getDraw().schedule(() => {
          if (runningRef.current) setCurrentNotes(phrase);
        }, time);
      }

      const pos = cyclePosRef.current;
      const phrase = phraseRef.current;
      const phraseBeats = phraseBeatsRef.current;

      // Metronome click on every beat, accented on the downbeat.
      if (!clickMutedRef.current && clickSynthRef.current) {
        const isDownbeat = pos % BEATS_PER_MEASURE === 0;
        clickSynthRef.current.triggerAttackRelease(
          isDownbeat ? CLICK_ACCENT_FREQ : CLICK_NORMAL_FREQ,
          '32n',
          time,
          isDownbeat ? 1 : 0.6,
        );
      }

      // Play the phrase note for this beat (during the listen phase).
      if (pos < phrase.length && noteSynthRef.current) {
        noteSynthRef.current.triggerAttackRelease(phrase[pos], '8n', time, 0.9);
        Tone.getDraw().schedule(() => {
          if (!runningRef.current) return;
          setActiveIndex(pos);
          setPhase('listen');
        }, time);
      } else {
        const inListen = pos < phraseBeats;
        Tone.getDraw().schedule(() => {
          if (!runningRef.current) return;
          setActiveIndex(-1);
          setPhase(inListen ? 'listen' : 'repeat');
        }, time);
      }

      cyclePosRef.current = (pos + 1) % cycleLenRef.current;
    }, '4n');

    acquireClock();
    setIsRunning(true);
  }, [isRunning, bpm]);

  const stop = useCallback(() => {
    runningRef.current = false;
    const transport = getTransport();
    if (scheduleIdRef.current !== null) {
      transport.clear(scheduleIdRef.current);
      scheduleIdRef.current = null;
    }
    releaseClock();
    setIsRunning(false);
    setPhase('idle');
    setActiveIndex(-1);
    setCurrentNotes([]);
  }, []);

  const toggle = useCallback(() => {
    if (isRunning) stop();
    else void start();
  }, [isRunning, start, stop]);

  const setBpm = useCallback((value: number) => {
    const next = clampBpm(value);
    setBpmState(next);
    getTransport().bpm.value = next;
  }, []);

  const setNoteVolume = useCallback((db: number) => {
    if (noteSynthRef.current) noteSynthRef.current.volume.value = db;
  }, []);

  const setClickVolume = useCallback((db: number) => {
    const muted = db <= CLICK_MUTE_DB;
    clickMutedRef.current = muted;
    if (clickSynthRef.current) {
      clickSynthRef.current.volume.value = muted ? -Infinity : db;
    }
  }, []);

  // Stop and release on unmount (e.g. switching views).
  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (scheduleIdRef.current !== null) {
        getTransport().clear(scheduleIdRef.current);
        scheduleIdRef.current = null;
        releaseClock();
      }
    };
  }, []);

  return {
    isRunning,
    root,
    scaleType,
    difficulty,
    noteCount,
    pauseMultiplier,
    bpm,
    phase,
    currentNotes,
    activeIndex,
    setRoot,
    setScaleType,
    setDifficulty,
    setNoteCount,
    setPauseMultiplier,
    setBpm,
    setNoteVolume,
    setClickVolume,
    toggle,
  };
}
