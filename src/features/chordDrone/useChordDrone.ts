import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureAudioReady } from '../../audio/transport';
import {
  buildChord,
  type ChordQuality,
  type RootNote,
} from '../../audio/chords';
import {
  createSound,
  type DroneSoundHandle,
  type SoundId,
} from './sounds';

/**
 * Chord Drone audio engine.
 *
 * Plays the selected chord as a sustained pad until stopped or changed. It runs
 * on its own synth chain (independent of the Transport), so it can play freely
 * alongside the Metronome with its own volume (FR-D-4). The timbre is selectable
 * via `sound`; switching it rebuilds the synth chain and re-triggers if playing.
 */
export function useChordDrone() {
  const [isRunning, setIsRunning] = useState(false);
  const [root, setRoot] = useState<RootNote>('C');
  const [quality, setQuality] = useState<ChordQuality>('maj');
  const [octave, setOctave] = useState(3);
  const [sound, setSoundState] = useState<SoundId>('triangle');

  const soundRef = useRef<DroneSoundHandle | null>(null);
  const currentNotesRef = useRef<string[]>([]);
  const volumeRef = useRef(-6);
  // Latest chord selection, readable without re-creating callbacks.
  const selectionRef = useRef({ root, quality, octave });

  useEffect(() => {
    selectionRef.current = { root, quality, octave };
  }, [root, quality, octave]);

  const releaseCurrent = useCallback(() => {
    const handle = soundRef.current;
    if (handle && currentNotesRef.current.length > 0) {
      handle.synth.triggerRelease(currentNotesRef.current);
      currentNotesRef.current = [];
    }
  }, []);

  // Create the initial sound. On unmount (e.g. switching views) stop playback by
  // releasing and disposing the *current* sound handle — not the one captured at
  // mount, which may have been replaced by a sound change.
  useEffect(() => {
    const handle = createSound('triangle');
    handle.synth.volume.value = volumeRef.current;
    soundRef.current = handle;
    return () => {
      const current = soundRef.current;
      if (current) {
        current.synth.releaseAll();
        current.dispose();
      }
      currentNotesRef.current = [];
      soundRef.current = null;
    };
  }, []);

  const start = useCallback(async () => {
    await ensureAudioReady();
    const handle = soundRef.current;
    if (!handle) return;
    const { root, quality, octave } = selectionRef.current;
    releaseCurrent();
    const notes = buildChord(root, quality, octave);
    handle.synth.triggerAttack(notes);
    currentNotesRef.current = notes;
    setIsRunning(true);
  }, [releaseCurrent]);

  const stop = useCallback(() => {
    releaseCurrent();
    setIsRunning(false);
  }, [releaseCurrent]);

  const toggle = useCallback(() => {
    if (isRunning) stop();
    else void start();
  }, [isRunning, start, stop]);

  const setVolume = useCallback((db: number) => {
    volumeRef.current = db;
    if (soundRef.current) soundRef.current.synth.volume.value = db;
  }, []);

  /** Switch timbre: rebuild the synth chain and re-trigger the chord if playing. */
  const setSound = useCallback(
    (id: SoundId) => {
      setSoundState(id);
      const playingNotes = currentNotesRef.current;
      releaseCurrent();
      const old = soundRef.current;
      if (old) {
        old.synth.releaseAll();
        old.dispose();
      }
      const handle = createSound(id);
      handle.synth.volume.value = volumeRef.current;
      soundRef.current = handle;
      if (isRunning && playingNotes.length > 0) {
        handle.synth.triggerAttack(playingNotes);
        currentNotesRef.current = playingNotes;
      }
    },
    [isRunning, releaseCurrent],
  );

  // When the chord/voicing changes while playing, retrigger the new notes.
  useEffect(() => {
    if (!isRunning) return;
    const handle = soundRef.current;
    if (!handle) return;
    releaseCurrent();
    const notes = buildChord(root, quality, octave);
    handle.synth.triggerAttack(notes);
    currentNotesRef.current = notes;
  }, [root, quality, octave, isRunning, releaseCurrent]);

  return {
    isRunning,
    root,
    quality,
    octave,
    sound,
    setRoot,
    setQuality,
    setOctave,
    setSound,
    setVolume,
    start,
    stop,
    toggle,
  };
}
