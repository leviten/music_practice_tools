import { useState } from 'react';
import { ROOT_NOTES, type RootNote } from '../../audio/chords';
import {
  SCALE_TYPES,
  type Difficulty,
  type ScaleType,
} from '../../audio/scales';
import { MAX_BPM, MIN_BPM } from '../../audio/transport';
import { useListenRepeat } from './useListenRepeat';
import './ListenRepeat.css';

const SCALE_IDS = Object.keys(SCALE_TYPES) as ScaleType[];
const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 1, label: 'Scale notes only' },
  { value: 2, label: 'Mostly scale (70% / 30% chromatic)' },
  { value: 3, label: 'Chromatic' },
];
const PAUSE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Same as melody (1×)' },
  { value: 2, label: 'Double (2×)' },
  { value: 3, label: 'Triple (3×)' },
];

export function ListenRepeat() {
  const {
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
  } = useListenRepeat();

  const [noteVolume, setNoteVolumeState] = useState(-6);
  const [clickVolume, setClickVolumeState] = useState(-12);
  const [showNotes, setShowNotes] = useState(false);

  const handleNoteVolume = (db: number) => {
    setNoteVolumeState(db);
    setNoteVolume(db);
  };
  const handleClickVolume = (db: number) => {
    setClickVolumeState(db);
    setClickVolume(db);
  };

  const phraseBars = Math.ceil(Math.max(1, noteCount) / 4);
  const pauseBars = phraseBars * pauseMultiplier;

  const statusText =
    phase === 'listen'
      ? 'Listen…'
      : phase === 'repeat'
        ? 'Your turn — repeat!'
        : 'Press Start';

  return (
    <section className="listen-repeat" aria-label="Listen and Repeat">
      <h2>Listen &amp; Repeat</h2>

      {/* --- Status (click to reveal/hide the note names) ----------------- */}
      <div
        className={'lr-status ' + phase}
        role="button"
        tabIndex={0}
        aria-pressed={showNotes}
        title={showNotes ? 'Click to hide notes' : 'Click to show notes'}
        onClick={() => setShowNotes((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowNotes((v) => !v);
          }
        }}
      >
        <span className="lr-phase">{statusText}</span>
        <div className="lr-notes" aria-live="polite">
          {currentNotes.length === 0 ? (
            <span className="lr-hint">
              Random notes will play, then you repeat by ear.
            </span>
          ) : (
            currentNotes.map((n, i) => (
              <span
                key={i}
                className={'lr-note' + (i === activeIndex ? ' active' : '')}
              >
                {showNotes ? n : '•'}
              </span>
            ))
          )}
        </div>
        <span className="lr-toggle-hint">
          {showNotes ? 'Click to hide notes' : 'Click to show notes'}
        </span>
      </div>

      {/* --- Scale -------------------------------------------------------- */}
      <div className="section">
        <h3>Scale</h3>
        <div className="control">
          <label htmlFor="lr-root">Root</label>
          <select
            id="lr-root"
            value={root}
            onChange={(e) => setRoot(e.target.value as RootNote)}
          >
            {ROOT_NOTES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="control">
          <label htmlFor="lr-scale">Type</label>
          <select
            id="lr-scale"
            value={scaleType}
            onChange={(e) => setScaleType(e.target.value as ScaleType)}
          >
            {SCALE_IDS.map((id) => (
              <option key={id} value={id}>
                {SCALE_TYPES[id].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* --- Task --------------------------------------------------------- */}
      <div className="section">
        <h3>Task</h3>
        <div className="control">
          <label htmlFor="lr-difficulty">Difficulty</label>
          <select
            id="lr-difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value) as Difficulty)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="control">
          <label htmlFor="lr-count">Notes</label>
          <input
            id="lr-count"
            className="num"
            type="number"
            min={1}
            max={16}
            value={noteCount}
            aria-label="Notes per task"
            onChange={(e) => setNoteCount(Number(e.target.value))}
          />
          <span className="lr-meta">
            phrase {phraseBars} · pause {pauseBars} bars
          </span>
        </div>
        <div className="control">
          <label htmlFor="lr-pause">Pause</label>
          <select
            id="lr-pause"
            value={pauseMultiplier}
            onChange={(e) => setPauseMultiplier(Number(e.target.value))}
          >
            {PAUSE_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* --- Rhythm ------------------------------------------------------- */}
      <div className="section">
        <h3>Rhythm</h3>
        <div className="control">
          <label htmlFor="lr-bpm">Tempo</label>
          <input
            id="lr-bpm"
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
          <input
            className="num"
            type="number"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            aria-label="Tempo in BPM"
            onChange={(e) => setBpm(Number(e.target.value))}
          />
        </div>
        <div className="control">
          <label htmlFor="lr-notevol">Notes</label>
          <input
            id="lr-notevol"
            type="range"
            min={-40}
            max={6}
            value={noteVolume}
            onChange={(e) => handleNoteVolume(Number(e.target.value))}
          />
        </div>
        <div className="control">
          <label htmlFor="lr-clickvol">Click</label>
          <input
            id="lr-clickvol"
            type="range"
            min={-40}
            max={6}
            value={clickVolume}
            aria-label="Metronome click volume (minimum = off)"
            onChange={(e) => handleClickVolume(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="buttons">
        <button
          className={'primary' + (isRunning ? ' running' : '')}
          onClick={toggle}
        >
          {isRunning ? 'Stop' : 'Start'}
        </button>
      </div>
    </section>
  );
}
