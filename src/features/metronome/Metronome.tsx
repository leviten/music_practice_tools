import { useState } from 'react';
import { MAX_BPM, MIN_BPM } from '../../audio/transport';
import { useMetronome } from './useMetronome';
import { useTapTempo } from './useTapTempo';
import { TimeSignature } from '../../components/TimeSignature';
import './Metronome.css';

export function Metronome() {
  const {
    isRunning,
    bpm,
    beatsPerMeasure,
    beatUnit,
    currentBeat,
    setBpm,
    setBeatsPerMeasure,
    setBeatUnit,
    setVolume,
    toggle,
  } = useMetronome();

  const tap = useTapTempo(setBpm);
  const [volume, setVolumeState] = useState(0); // dB

  const handleVolume = (db: number) => {
    setVolumeState(db);
    setVolume(db);
  };

  return (
    <section className="metronome" aria-label="Metronome">
      <h2>Metronome</h2>

      <div className="beat-indicator" role="img" aria-label={`Beat ${currentBeat + 1} of ${beatsPerMeasure}`}>
        {Array.from({ length: beatsPerMeasure }, (_, i) => (
          <span
            key={i}
            className={
              'beat-dot' +
              (i === currentBeat ? ' active' : '') +
              (i === 0 ? ' downbeat' : '')
            }
          />
        ))}
      </div>

      <div className="bpm-display">
        <span className="bpm-value">{bpm}</span>
        <span className="bpm-unit">BPM</span>
      </div>

      <div className="control">
        <label htmlFor="bpm-slider">Tempo</label>
        <input
          id="bpm-slider"
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
        />
        <input
          className="bpm-input"
          type="number"
          min={MIN_BPM}
          max={MAX_BPM}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          aria-label="Tempo in BPM"
        />
      </div>

      <TimeSignature
        beats={beatsPerMeasure}
        beatUnit={beatUnit}
        onBeatsChange={setBeatsPerMeasure}
        onBeatUnitChange={setBeatUnit}
      />

      <div className="control">
        <label htmlFor="volume">Volume</label>
        <input
          id="volume"
          type="range"
          min={-40}
          max={6}
          value={volume}
          onChange={(e) => handleVolume(Number(e.target.value))}
        />
      </div>

      <div className="buttons">
        <button className={'primary' + (isRunning ? ' running' : '')} onClick={toggle}>
          {isRunning ? 'Stop' : 'Start'}
        </button>
        <button className="secondary" onClick={tap}>
          Tap Tempo
        </button>
      </div>
    </section>
  );
}
