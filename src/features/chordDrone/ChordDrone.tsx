import { useState } from 'react';
import {
  CHORD_QUALITIES,
  ROOT_NOTES,
  buildChord,
  chordLabel,
  type ChordQuality,
} from '../../audio/chords';
import { useChordDrone } from './useChordDrone';
import './ChordDrone.css';

export function ChordDrone() {
  const { isRunning, root, quality, octave, setRoot, setQuality, setVolume, toggle } =
    useChordDrone();

  const [volume, setVolumeState] = useState(-6); // dB

  const handleVolume = (db: number) => {
    setVolumeState(db);
    setVolume(db);
  };

  const notes = buildChord(root, quality, octave);

  return (
    <section className="chord-drone" aria-label="Chord Drone">
      <h2>Chord Drone</h2>

      <div className="chord-display">
        <span className="chord-name">{chordLabel(root, quality)}</span>
        <span className="chord-notes">{notes.join(' · ')}</span>
      </div>

      <div className="control">
        <label htmlFor="drone-root">Root</label>
        <select
          id="drone-root"
          value={root}
          onChange={(e) => setRoot(e.target.value as typeof root)}
        >
          {ROOT_NOTES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="control">
        <label htmlFor="drone-quality">Quality</label>
        <select
          id="drone-quality"
          value={quality}
          onChange={(e) => setQuality(e.target.value as ChordQuality)}
        >
          {(Object.keys(CHORD_QUALITIES) as ChordQuality[]).map((q) => (
            <option key={q} value={q}>
              {CHORD_QUALITIES[q].label}
            </option>
          ))}
        </select>
      </div>

      <div className="control">
        <label htmlFor="drone-volume">Volume</label>
        <input
          id="drone-volume"
          type="range"
          min={-40}
          max={6}
          value={volume}
          onChange={(e) => handleVolume(Number(e.target.value))}
        />
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
