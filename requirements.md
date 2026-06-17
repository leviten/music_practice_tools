# Requirements – Practice Tools (Metronome / Chord Drone / Chord Loop)

A browser-based practice application for musicians, built with **TypeScript + React + Tone.js**.
The application bundles three audio tools that can be used independently and, where it
makes sense, in combination.

> **Language note:** The entire front-end (UI labels, buttons, messages) is in **English only**.
> This requirements document is also written in English.

---

## 1. Overview

| # | Feature       | Short description                                                                 | Status   |
|---|---------------|----------------------------------------------------------------------------------|----------|
| 1 | Metronome     | Adjustable-BPM click track.                                                       | Done     |
| 2 | Chord Drone   | A selectable, sustained chord; combinable with the Metronome.                     | Done     |
| 3 | Chord Loop    | Standard cadences or single chords; chord changes quantized to an 1/8-note grid.  | Done     |
| 4 | Listen & Repeat | Random notes to play/sing back by ear (no correctness check), scale + difficulty.| Done   |

All three tools share one global transport/clock so that timing stays consistent when
tools run together.

---

## 2. Functional Requirements

### 2.1 Feature 1 – Metronome

- **FR-M-1** The user can start and stop the metronome.
- **FR-M-2** The user can set the tempo (BPM). Supported range: **40–240 BPM**.
- **FR-M-3** Tempo can be changed via both a slider and a numeric input; both stay in sync.
- **FR-M-4** Tempo changes take effect immediately, including while the metronome is running.
- **FR-M-5** The user can configure the time signature, shown as a single clickable fraction
  (e.g. 3/4): the top number sets the **number of beats** (numerator, 1–32), the bottom number
  the **beat unit / note value** (denominator: 2, 4, 8, 16) — settable **independently**.
  The displayed BPM is the tempo of the chosen beat unit (the metronome clicks `bpm` times
  per minute). The shared Tone.Transport is kept musically correct (quarter-note tempo +
  time signature) so other tools stay in sync.
- **FR-M-6** The first beat of each measure is **accented** (different pitch/volume) so the
  downbeat is audible.
- **FR-M-7** A **visual beat indicator** shows the current beat within the measure and
  highlights the downbeat.
- **FR-M-8** The user can adjust the **output volume** of the click.
- **FR-M-9** **Tap tempo:** the user can tap a button repeatedly to set the BPM from the
  average tap interval.
- **FR-M-10** Audio playback starts only after an explicit user gesture (browser autoplay
  policy compliance).

### 2.2 Feature 2 – Chord Drone

- **FR-D-1** The user can select a chord (root note + chord quality, e.g. major, minor,
  7th, etc.).
- **FR-D-2** The selected chord is played as a sustained drone until stopped or changed.
- **FR-D-3** The user can start and stop the drone independently.
- **FR-D-4** The drone can run **simultaneously with the Metronome**; volumes are
  independently controllable.
- **FR-D-5** The user can adjust the drone volume. The octave is fixed at **3** and the
  sound/timbre is fixed to **Triangle Pad** (no UI selectors).

### 2.3 Feature 3 – Chord Loop

The Chord Loop view is organized into three sections: **Preset**, **Rhythm**, **Progression**.

- **FR-L-1 Preset:** The user can pick a **standard cadence** preset (I–IV–V–I, ii–V–I,
  ii–V–I short, 12-bar blues) and a **key**; loading expands the preset into the timeline.
  The default progression is **empty**.
- **FR-L-2 Rhythm:** The user can set **tempo (BPM)**, the **time signature** (shown as a
  clickable fraction; beats 1–32 and beat unit 2/4/8/16, settable independently — as in the
  Metronome) and the **loop length in bars**.
- **FR-L-3 Progression timeline:** Chords are shown on a **beam/timeline** divided into
  beat sections. The beam **wraps after four bars** onto a new row. Chord positions and
  lengths are quantized to the beat grid.
- **FR-L-4 Add chord:** Hovering an empty beat section reveals a **“+”**; clicking it opens a
  small **popup** to choose a chord (root + quality) and add it. A newly added chord **fills
  its whole bar** (or the free part of the bar, if some beats are already taken).
- **FR-L-5 Edit chord:** Chord position and length are editable via **drag-and-drop** (drag the
  block to move, drag its right edge to resize). Clicking a chord opens the popup to change or
  remove it. Edits cannot make chords overlap or exceed the timeline.
- **FR-L-6** The loop plays the progression repeatedly; a chord sustains for its length and
  gaps are silent. The currently playing position is highlighted.
- **FR-L-7** Start/stop the loop. The loop runs on the shared Tone.Transport clock.
- **FR-L-8 Output:** The chord octave is fixed at **3** (no selector). A **Volume** section
  provides two sliders: **Chords** (pad volume) and **Click** (an optional built-in metronome
  click that plays along with the loop, accented on the downbeat; the minimum slider position
  turns the click off).

### 2.4 Feature 4 – Listen & Repeat

An ear-training tool: random notes are played for the musician to play or sing back.
**No correctness checking** is performed.

- **FR-LR-1 Scale:** The user selects a scale via **root note** and **type**: Major/Minor
  Pentatonic, the seven church modes (Ionian … Locrian), and Harmonic Minor.
- **FR-LR-2 Difficulty:** Three levels control note selection:
  1. **Scale notes only** (diatonic).
  2. **Mostly scale (~70%)** with **~30% non-scale / chromatic** notes.
  3. **Chromatic** (all 12 notes).
- **FR-LR-3 Task size:** The number of notes per task is adjustable.
- **FR-LR-4 Rhythm:** Tempo (BPM) is adjustable and an optional metronome **click** is
  available (separately from the note volume).
- **FR-LR-5 Cycle:** On Start, a random phrase plays (one note per beat). It is followed by a
  pause whose length is a **configurable integer multiple of the phrase duration** (1× same,
  2× double, 3× triple), so the musician can repeat. After the pause a new random phrase plays,
  and so on.
- **FR-LR-6 Feedback:** A status indicator shows the current phase (Listen / Your turn) and the
  phrase positions, highlighting the note currently sounding. The **note names are hidden by
  default** (shown as dots) and can be **revealed/hidden by clicking the status container**
  (keyboard-operable) for ear-training. No input is evaluated.

---

## 3. Non-Functional Requirements

- **NFR-1 Platform:** Runs in modern evergreen browsers (Chrome, Firefox, Safari, Edge);
  no installation required.
- **NFR-2 Tech stack:** TypeScript, React, Tone.js (Web Audio). Build tooling: Vite.
- **NFR-3 Timing accuracy:** Click timing is driven by the Web Audio clock (Tone.Transport),
  not by `setInterval`/`setTimeout`, to keep tempo stable and jitter-free.
- **NFR-4 Latency:** First click after pressing Start occurs without perceptible delay
  once the audio context is running.
- **NFR-5 Responsiveness:** UI is usable on desktop and tablet-sized viewports.
- **NFR-6 Accessibility:** Controls are keyboard-operable and labelled; the visual beat
  indicator is not the only feedback channel (audio is primary).
- **NFR-7 Language:** Front-end strings are English only.
- **NFR-8 Maintainability:** Each feature lives in its own module; shared audio/clock logic
  is centralized so features can be combined.
- **NFR-9 State on stop:** Stopping any tool releases its audio resources cleanly (no
  hanging notes, no stuck transport).
- **NFR-10 No backend:** The application is fully client-side; no server or account required.
- **NFR-11 Navigation:** Each tool has its own dedicated view. A navbar in the header
  switches between them; **Metronome** is the default view. Switching views stops the
  previously active tool cleanly (releases the shared clock and any sounding notes).

---

## 4. Architecture Notes

- A single shared **Tone.Transport** acts as the master clock for the timing-based tools
  (Metronome, Chord Loop), with reference counting so it only stops once no tool needs it.
- Each tool is implemented as an independent React feature module with its own audio engine
  wrapper. The app shell shows one tool view at a time, selected via the header navbar; the
  Chord Drone runs on its own synth chain independent of the transport.
- Audio context is created/resumed on the first user interaction (Start / Tap).
