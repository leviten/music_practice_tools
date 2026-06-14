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

## Deployment to GitHub Pages

The app is configured for GitHub Pages:

- `vite.config.ts` uses `base: './'`, so the build works under a project sub-path
  (`https://<user>.github.io/<repo>/`).
- `.github/workflows/deploy.yml` builds and publishes the `dist/` folder via the official
  GitHub Pages actions on every push to `main`.

**One-time setup:**

1. Push this repository to GitHub.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.

After that, every push to `main` builds and deploys automatically. The published URL is
shown in the Actions run (and under Settings → Pages).

> If you serve the app from a fixed sub-path and ever add client-side routing, set
> `base` in `vite.config.ts` to `'/<repo>/'` instead of `'./'`.
