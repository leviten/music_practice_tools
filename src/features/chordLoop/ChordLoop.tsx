import { useEffect, useState } from 'react';
import { ROOT_NOTES, type RootNote } from '../../audio/chords';
import { MAX_BPM, MIN_BPM } from '../../audio/transport';
import {
  PROGRESSION_PRESETS,
  type PresetId,
} from '../../audio/progressions';
import { useChordLoop } from './useChordLoop';
import { Timeline } from './Timeline';
import { ChordPopup } from './ChordPopup';
import { TimeSignature } from '../../components/TimeSignature';
import './ChordLoop.css';

const PRESET_IDS = Object.keys(PROGRESSION_PRESETS) as PresetId[];

type PopupState =
  | { mode: 'add'; beat: number; x: number; y: number }
  | { mode: 'edit'; id: string; x: number; y: number }
  | null;

export function ChordLoop() {
  const {
    isRunning,
    key,
    bpm,
    beatsPerMeasure,
    beatUnit,
    bars,
    steps,
    totalBeats,
    currentBeat,
    setKey,
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
    toggle,
  } = useChordLoop();

  const CHORDS_DEFAULT_DB = -6;
  const [preset, setPreset] = useState<PresetId | ''>(''); // "-" = no preset
  const [volume, setVolumeState] = useState(CHORDS_DEFAULT_DB);
  const [clickVolume, setClickVolumeState] = useState(CHORDS_DEFAULT_DB);
  const [popup, setPopup] = useState<PopupState>(null);

  // Apply the initial click volume to the engine on mount (default = Chords).
  useEffect(() => {
    setClickVolume(CHORDS_DEFAULT_DB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVolume = (db: number) => {
    setVolumeState(db);
    setVolume(db);
  };

  const handleClickVolume = (db: number) => {
    setClickVolumeState(db);
    setClickVolume(db);
  };

  const editingStep =
    popup?.mode === 'edit' ? steps.find((s) => s.id === popup.id) : undefined;

  return (
    <section className="chord-loop" aria-label="Chord Loop">
      <h2>Chord Loop</h2>

      {/* --- Preset ------------------------------------------------------- */}
      <div className="section">
        <h3>Preset</h3>
        <div className="control">
          <label htmlFor="loop-preset">Progression</label>
          <select
            id="loop-preset"
            value={preset}
            onChange={(e) => setPreset(e.target.value as PresetId | '')}
          >
            <option value="">-</option>
            {PRESET_IDS.map((id) => (
              <option key={id} value={id}>
                {PROGRESSION_PRESETS[id].label}
              </option>
            ))}
          </select>
          <button
            className="secondary small"
            onClick={() => (preset === '' ? clearSteps() : loadPreset(preset))}
          >
            Load
          </button>
        </div>
        <div className="control">
          <label htmlFor="loop-key">Key</label>
          <select
            id="loop-key"
            value={key}
            onChange={(e) => setKey(e.target.value as RootNote)}
          >
            {ROOT_NOTES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* --- Rhythm ------------------------------------------------------- */}
      <div className="section">
        <h3>Rhythm</h3>
        <div className="control">
          <label htmlFor="loop-bpm">Tempo</label>
          <input
            id="loop-bpm"
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
        <TimeSignature
          beats={beatsPerMeasure}
          beatUnit={beatUnit}
          onBeatsChange={setBeatsPerMeasure}
          onBeatUnitChange={setBeatUnit}
        />
        <div className="control">
          <label htmlFor="loop-bars">Loop length</label>
          <input
            id="loop-bars"
            className="num"
            type="number"
            min={1}
            max={16}
            value={bars}
            aria-label="Loop length in bars"
            onChange={(e) => setBars(Number(e.target.value))}
          />
          <span className="unit-label">bars</span>
        </div>
      </div>

      {/* --- Progression -------------------------------------------------- */}
      <div className="section">
        <div className="section-head">
          <h3>Progression</h3>
          <span className="grid-info">
            {bars} bars · {totalBeats} beats
          </span>
        </div>

        <Timeline
          steps={steps}
          beatsPerMeasure={beatsPerMeasure}
          bars={bars}
          totalBeats={totalBeats}
          currentBeat={currentBeat}
          onMove={moveChord}
          onResize={resizeChord}
          onAddRequest={(beat, x, y) => setPopup({ mode: 'add', beat, x, y })}
          onChordClick={(id, x, y) => setPopup({ mode: 'edit', id, x, y })}
        />

        <div className="progression-actions">
          <button
            className="secondary small"
            onClick={clearSteps}
            disabled={steps.length === 0}
          >
            Clear
          </button>
          <span className="hint">
            Click <b>+</b> to add · drag to move · drag right edge to resize
          </span>
        </div>
      </div>

      {/* --- Volume ------------------------------------------------------- */}
      <div className="section">
        <h3>Volume</h3>
        <div className="control">
          <label htmlFor="loop-volume">Chords</label>
          <input
            id="loop-volume"
            type="range"
            min={-40}
            max={6}
            value={volume}
            onChange={(e) => handleVolume(Number(e.target.value))}
          />
        </div>
        <div className="control">
          <label htmlFor="loop-click">Click</label>
          <input
            id="loop-click"
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
          disabled={steps.length === 0}
        >
          {isRunning ? 'Stop' : 'Start'}
        </button>
      </div>

      {popup?.mode === 'add' && (
        <ChordPopup
          mode="add"
          x={popup.x}
          y={popup.y}
          initialRoot={key}
          initialQuality="maj"
          onConfirm={(root, quality) => {
            addChord(popup.beat, root, quality);
            setPopup(null);
          }}
          onClose={() => setPopup(null)}
        />
      )}
      {popup?.mode === 'edit' && editingStep && (
        <ChordPopup
          mode="edit"
          x={popup.x}
          y={popup.y}
          initialRoot={editingStep.root}
          initialQuality={editingStep.quality}
          onConfirm={(root, quality) => {
            updateChord(editingStep.id, { root, quality });
            setPopup(null);
          }}
          onRemove={() => {
            removeChord(editingStep.id);
            setPopup(null);
          }}
          onClose={() => setPopup(null)}
        />
      )}
    </section>
  );
}
