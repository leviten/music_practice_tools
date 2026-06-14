import { useCallback, useRef } from 'react';
import { chordSymbol } from '../../audio/chords';
import type { ChordStep } from '../../audio/progressions';
import { coveringStep } from './placement';

const BARS_PER_ROW = 4;

interface TimelineProps {
  steps: ChordStep[];
  beatsPerMeasure: number;
  bars: number;
  totalBeats: number;
  currentBeat: number;
  onMove: (id: string, startBeat: number) => void;
  onResize: (id: string, lengthBeats: number) => void;
  onAddRequest: (beat: number, x: number, y: number) => void;
  onChordClick: (id: string, x: number, y: number) => void;
}

interface Segment {
  type: 'chord' | 'empty';
  beat: number;
  span: number;
  step?: ChordStep;
}

type DragState =
  | { mode: 'move'; id: string; grabOffset: number; moved: boolean }
  | { mode: 'resize'; id: string; startBeat: number; moved: boolean };

export function Timeline({
  steps,
  beatsPerMeasure,
  bars,
  totalBeats,
  currentBeat,
  onMove,
  onResize,
  onAddRequest,
  onChordClick,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const beatsPerRow = BARS_PER_ROW * beatsPerMeasure;
  const rowCount = Math.ceil(bars / BARS_PER_ROW);

  /** Map a screen point to an absolute beat index on the timeline. */
  const beatFromPoint = useCallback(
    (clientX: number, clientY: number): number | null => {
      const container = containerRef.current;
      if (!container) return null;
      const rows = Array.from(
        container.querySelectorAll<HTMLElement>('.beam-row'),
      );
      if (rows.length === 0) return null;
      let target =
        rows.find((r) => {
          const rc = r.getBoundingClientRect();
          return clientY >= rc.top && clientY <= rc.bottom;
        }) ?? null;
      if (!target) {
        // Clamp to first/last row when above/below the timeline.
        target =
          clientY < rows[0].getBoundingClientRect().top
            ? rows[0]
            : rows[rows.length - 1];
      }
      const rc = target.getBoundingClientRect();
      const rowStart = Number(target.dataset.rowStart);
      const beatWidth = rc.width / beatsPerRow;
      const local = Math.floor((clientX - rc.left) / beatWidth);
      const clampedLocal = Math.max(0, Math.min(beatsPerRow - 1, local));
      return Math.max(0, Math.min(totalBeats - 1, rowStart + clampedLocal));
    },
    [beatsPerRow, totalBeats],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const beat = beatFromPoint(e.clientX, e.clientY);
      if (beat === null) return;
      drag.moved = true;
      if (drag.mode === 'move') {
        onMove(drag.id, beat - drag.grabOffset);
      } else {
        onResize(drag.id, beat - drag.startBeat + 1);
      }
    },
    [beatFromPoint, onMove, onResize],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endDrag);
  }, [onPointerMove]);

  const beginDrag = useCallback(
    (state: DragState) => {
      dragRef.current = state;
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', endDrag);
    },
    [onPointerMove, endDrag],
  );

  const handleChordPointerDown = useCallback(
    (e: React.PointerEvent, step: ChordStep) => {
      e.preventDefault();
      const beat = beatFromPoint(e.clientX, e.clientY);
      const grabOffset = beat === null ? 0 : beat - step.startBeat;
      beginDrag({ mode: 'move', id: step.id, grabOffset, moved: false });
    },
    [beatFromPoint, beginDrag],
  );

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, step: ChordStep) => {
      e.preventDefault();
      e.stopPropagation();
      beginDrag({ mode: 'resize', id: step.id, startBeat: step.startBeat, moved: false });
    },
    [beginDrag],
  );

  const handleChordClick = useCallback(
    (e: React.MouseEvent, step: ChordStep) => {
      // Suppress the click that ends a drag.
      const drag = dragRef.current;
      if (drag?.moved) return;
      onChordClick(step.id, e.clientX, e.clientY);
    },
    [onChordClick],
  );

  // Build the per-row segment lists.
  const rows = Array.from({ length: rowCount }, (_, r) => {
    const rowStart = r * beatsPerRow;
    const rowEnd = Math.min(totalBeats, rowStart + beatsPerRow);
    const segments: Segment[] = [];
    let beat = rowStart;
    while (beat < rowEnd) {
      const step = coveringStep(steps, beat);
      if (step) {
        const segEnd = Math.min(rowEnd, step.startBeat + step.lengthBeats);
        segments.push({ type: 'chord', beat, span: segEnd - beat, step });
        beat = segEnd;
      } else {
        segments.push({ type: 'empty', beat, span: 1 });
        beat += 1;
      }
    }
    return { rowStart, segments };
  });

  return (
    <div className="timeline" ref={containerRef}>
      {rows.map(({ rowStart, segments }, r) => (
        <div
          key={r}
          className="beam-row"
          data-row-start={rowStart}
          style={{ gridTemplateColumns: `repeat(${beatsPerRow}, 1fr)` }}
        >
          {segments.map((seg) => {
            const colStart = seg.beat - rowStart + 1;
            const isBarStart = seg.beat % beatsPerMeasure === 0;
            // Last beat of the bar covered by this segment.
            const isBarEnd = (seg.beat + seg.span) % beatsPerMeasure === 0;
            const playing =
              currentBeat >= seg.beat && currentBeat < seg.beat + seg.span;
            if (seg.type === 'empty') {
              return (
                <button
                  key={`e-${seg.beat}`}
                  className={
                    'beat-cell' +
                    (isBarStart ? ' bar-start' : '') +
                    (isBarEnd ? ' bar-end' : '') +
                    (playing ? ' playing' : '')
                  }
                  style={{ gridColumn: `${colStart} / span ${seg.span}` }}
                  aria-label={`Add chord at beat ${seg.beat + 1}`}
                  onClick={(ev) => onAddRequest(seg.beat, ev.clientX, ev.clientY)}
                >
                  <span className="plus">+</span>
                </button>
              );
            }
            const step = seg.step!;
            return (
              <div
                key={step.id + '-' + seg.beat}
                className={
                  'chord-block' +
                  (isBarStart ? ' bar-start' : '') +
                  (playing ? ' playing' : '')
                }
                style={{ gridColumn: `${colStart} / span ${seg.span}` }}
                title={`${chordSymbol(step.root, step.quality)} · ${step.lengthBeats} beat${step.lengthBeats > 1 ? 's' : ''}`}
                onPointerDown={(ev) => handleChordPointerDown(ev, step)}
                onClick={(ev) => handleChordClick(ev, step)}
              >
                <span className="chord-block-label">
                  {chordSymbol(step.root, step.quality)}
                </span>
                {/* The resize handle only renders on the chord's last segment. */}
                {seg.beat + seg.span === step.startBeat + step.lengthBeats && (
                  <span
                    className="resize-handle"
                    onPointerDown={(ev) => handleResizePointerDown(ev, step)}
                    aria-label="Resize chord"
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
