import './TimeSignature.css';

const BEATS_OPTIONS = Array.from({ length: 32 }, (_, i) => i + 1); // 1–32
const BEAT_UNITS = [2, 4, 8, 16];

interface TimeSignatureProps {
  beats: number;
  beatUnit: number;
  onBeatsChange: (value: number) => void;
  onBeatUnitChange: (value: number) => void;
}

/**
 * Time-signature control shown as a single clickable fraction (e.g. 3/4).
 * The top number selects the beats per measure (1–32), the bottom number the
 * beat unit (2, 4, 8, 16). Shared by the Metronome and Chord Loop views.
 */
export function TimeSignature({
  beats,
  beatUnit,
  onBeatsChange,
  onBeatUnitChange,
}: TimeSignatureProps) {
  return (
    <div className="control ts-control">
      <label>Time Signature</label>
      <div className="ts-fraction">
        <select
          className="ts-select"
          aria-label="Beats per measure"
          value={beats}
          onChange={(e) => onBeatsChange(Number(e.target.value))}
        >
          {BEATS_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="ts-slash">/</span>
        <select
          className="ts-select"
          aria-label="Beat unit"
          value={beatUnit}
          onChange={(e) => onBeatUnitChange(Number(e.target.value))}
        >
          {BEAT_UNITS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
