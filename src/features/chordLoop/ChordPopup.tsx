import { useEffect, useState } from 'react';
import {
  CHORD_QUALITIES,
  ROOT_NOTES,
  type ChordQuality,
  type RootNote,
} from '../../audio/chords';

export interface ChordPopupProps {
  mode: 'add' | 'edit';
  x: number;
  y: number;
  initialRoot: RootNote;
  initialQuality: ChordQuality;
  onConfirm: (root: RootNote, quality: ChordQuality) => void;
  onRemove?: () => void;
  onClose: () => void;
}

/** Small floating panel to pick a chord (root + quality) when adding/editing. */
export function ChordPopup({
  mode,
  x,
  y,
  initialRoot,
  initialQuality,
  onConfirm,
  onRemove,
  onClose,
}: ChordPopupProps) {
  const [root, setRoot] = useState<RootNote>(initialRoot);
  const [quality, setQuality] = useState<ChordQuality>(initialQuality);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Keep the popup on screen.
  const left = Math.min(x, window.innerWidth - 240);
  const top = Math.min(y, window.innerHeight - 200);

  return (
    <>
      <div className="popup-backdrop" onClick={onClose} />
      <div
        className="chord-popup"
        style={{ left, top }}
        role="dialog"
        aria-label={mode === 'add' ? 'Add chord' : 'Edit chord'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="popup-row">
          <select
            aria-label="Root"
            value={root}
            onChange={(e) => setRoot(e.target.value as RootNote)}
          >
            {ROOT_NOTES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            aria-label="Quality"
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
        <div className="popup-actions">
          {mode === 'edit' && onRemove && (
            <button className="popup-remove" onClick={onRemove}>
              Remove
            </button>
          )}
          <button
            className="popup-confirm"
            onClick={() => onConfirm(root, quality)}
          >
            {mode === 'add' ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
}
