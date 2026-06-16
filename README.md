# Music Practice Tools

A browser-based practice app for musicians, built with **TypeScript + React + Tone.js**
(bundled with Vite). It contains three tools, switchable via the header navbar:

- **Metronome** – adjustable BPM, time signature (beats 1–32 × beat unit 2/4/8/16),
  accented downbeat, visual beat indicator, tap tempo.
- **Chord Drone** – a sustained, selectable chord (root + quality).
- **Chord Loop** – build a progression on a beat timeline (drag-and-drop) or load a
  cadence preset; optional built-in metronome click.

See [`requirements.md`](./requirements.md) for the full requirements.

## Development

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build locally
```