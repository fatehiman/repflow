<div align="center">

# 🏋️ RepFlow

### A mobile-first, dependency-free, voice-guided workout runner

Pick a routine, hit start, and follow along — rep by rep, rest by rest.
No build step, no server, no frameworks. Just open it in a browser.

[![No Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](#)
[![PWA](https://img.shields.io/badge/PWA-installable%20%26%20offline-blueviolet)](#)
[![Vanilla JS](https://img.shields.io/badge/built%20with-HTML%20%2B%20CSS%20%2B%20JS-f7df1e)](#)
[![No Build](https://img.shields.io/badge/build%20step-none-success)](#)

</div>

---

## ✨ Features

- 🎯 **Guided timeline** — every rep, set, rest, and prepare phase is precomputed into an ordered timeline, so timers never drift from the data.
- 🔊 **Voice cues** — announces the exercise name, rep numbers, and rests via the Web Speech API (your OS text-to-speech). No audio files.
- ⭕ **Dual progress rings** — concentric SVG rings overlay the demo image: the outer tracks progress across all sets, the inner drains the current step.
- 📴 **Installable & offline** — a service worker + web manifest make it a real PWA; after the first visit it runs fully offline.
- 🌍 **UTF-8 & RTL-aware** — exercise content can be any language; description text supports per-exercise `rtl`/`ltr` direction (ships with Persian descriptions).
- 👆 **Touch & keyboard controls** — tap halves of the screen to jump sets, tap to pause, or drive it all from the keyboard.
- 🧩 **Data-driven** — add routines, exercises, and demo images by editing one plain data file. Durations and totals recompute automatically.

---

## 🚀 Quick start

```bash
# clone it
git clone https://github.com/fatehiman/repflow.git
cd repflow
```

Then just **open `index.html` in any browser** (double-click it). No server, no
install, no build — the workout data is a plain `data/exercises.js` loaded via a
`<script>` tag, so there's no `fetch`/CORS restriction on `file://`.

> 💡 To install it as an app (and get offline support via the service worker),
> serve it over `http(s)` — e.g. `npx serve .` — and use your browser's
> "Install app" / "Add to Home Screen" option.

**Tested on:** Windows 11 Chrome · Android Chrome.

---

## 🎮 Controls

| Action | Trigger |
|--------|---------|
| **Pause / Play** | Center pause button, or <kbd>Space</kbd> |
| **Next set** | Tap the **right half** of the stage image |
| **Previous set** | Tap the **left half** of the stage image |
| **Open info / description** | Tap the exercise **name pill** or its **ⓘ** icon |
| **Close info modal** | <kbd>×</kbd>, tap the backdrop, or <kbd>Esc</kbd> |
| **Quit to home** | Top-center <kbd>×</kbd>, or <kbd>Esc</kbd> (when no modal is open) |

---

## 📂 Project structure

```text
index.html            Home screen — lists routines as links.
workout.html          The runner screen (one routine at a time).
css/styles.css        All styling + the theme variables.
js/home.js            Builds the routine list on the home screen.
js/workout.js         The entire engine (IIFE; reads WORKOUT_DATA).
data/exercises.js     The data: window.WORKOUT_DATA. UTF-8. The only file to edit for content.
images/*.svg|gif|png  Exercise demo visuals, referenced by filename from the data.
icons/icon.svg        App icon (PWA / apple-touch-icon).
manifest.webmanifest  PWA manifest.
sw.js                 Service worker (offline caching).
```

**Page flow:** `index.html` → link `workout.html?routine=<key>` → the engine
reads the `routine` query param (default `light1`) and runs that routine.

---

## 🛠️ Extending

- **Add a routine** — add a key under `routines` with a `title` + `exercises[]`, then link `workout.html?routine=<key>` from the home screen.
- **Add an exercise** — push an object (see the schema below) into a routine's `exercises`. Durations/totals recompute automatically.
- **Swap a demo image** — drop a real `.gif`/`.png` into `images/` and point the exercise's `image` field at it — no code change.
- **Disable a phase** — set `prepareTime: 0` (no prepare), `restAfterExercise: 0` (no full rest), or `restAfterSet: 0` (no between-set rest) on an exercise.

---

<details>
<summary><h2>📖 Technical reference (click to expand)</h2></summary>

This is the authoritative spec of the project's rules and behaviors — read it to
understand the whole system without reading every line of code.

### Data schema — `data/exercises.js`

```js
window.WORKOUT_DATA = {
  routines: {
    <routineKey>: {
      title: "Light Exercises 1",      // shown as document title
      subtitle: "…",                    // currently informational only
      exercises: [ <exercise>, … ]      // ordered list
    },
    …
  }
};
```

#### Exercise object

| field | type | unit | meaning |
|-------|------|------|---------|
| `name` | string | — | Shown on screen. UTF-8; may be Persian/any language. |
| `image` | string | — | Path to demo visual (`images/…svg/gif/png`). |
| `repTime` | number | sec | Duration of one rep. |
| `reps` | number | — | Reps per set. |
| `sets` | number | — | Number of sets. |
| `restAfterSet` | number | sec | Rest **between** sets (not after the last set of the exercise). |
| `prepareTime` | number | sec | Get-ready countdown **before** the exercise. `0`/missing = none. |
| `restAfterExercise` | number | sec | "Full rest" **after** the exercise. Missing = default `30`. |
| `description` | string | — | Info-modal body. `\n` = line break. UTF-8. |
| `descDir` | string | — | `"rtl"` or `"ltr"`. Applies **only** to the description text. |

All numeric fields are coerced with `+`. The file **must remain UTF-8** (it holds Persian text).

### The timeline model (core of the engine)

On start, `buildTimeline(exercises)` flattens the whole routine into an ordered
array of **steps**. Each step is one of four phase types and has a fixed `dur`
(seconds). The runtime only ever tracks "which step + how many seconds into it",
so all timers are pure lookups.

**Per-exercise step order:**

```text
[prepare] → set 1 reps… → [restAfterSet] → set 2 reps… → … → last set reps… → [fullrest]
          └─ rest only BETWEEN sets (sets−1 of them) ─┘                        └─ skipped on last exercise
```

Concretely, for each exercise (in order):

1. **`prepare`** step (`dur = prepareTime`) — only if `prepareTime > 0`.
2. For each set `s = 1..sets`:
   - `reps` × **`rep`** steps (`dur = repTime` each), numbered `1..reps`.
   - if `s < sets`: one **`rest`** step (`dur = restAfterSet`).
3. **`fullrest`** step (`dur = restAfterExercise`) — only if `> 0` **and not the last exercise**.

#### Step fields (precomputed)

Every step carries: `type`, `exIndex`, `dur`, `globalStart` (seconds from
session start), `exStart` (seconds from this exercise's start), `exDuration`
(this exercise's full duration), plus `set`/`rep`/`reps`/`sets` where relevant.

#### Duration math (compute-everything)

```text
exerciseDuration = prepareTime
                 + sets · reps · repTime
                 + (sets − 1) · restAfterSet
                 + restAfterExercise        (0 on the last exercise)

sessionTotal     = Σ exerciseDuration  over all exercises
```

`prepare` belongs to the exercise it precedes; `fullrest` belongs to the
exercise it follows. Both count toward that exercise's `exDuration` and the
session total. There is **no drift** between displayed timers and the data.

### Phases — visuals, colors, labels

There are four phase types. Exactly one bottom-panel block is visible at a time;
the stage gets a phase class that recolors the inner ring.

| phase | bottom panel | label | accent color | stage class |
|-------|--------------|-------|--------------|-------------|
| `rep` | big `REP n/total` and `SET n/total` counters | REP / SET | blue inner ring (`#b9e7ff`) | (none) |
| `rest` | countdown + `Next: set <n>` | `REST` | yellow `--rest` `#ffce63` | `is-rest` |
| `fullrest` | countdown + `Next: <next exercise name>` | `FULL REST` | orange `--fullrest` `#ff9f6b` | `is-fullrest` |
| `prepare` | countdown (label shown) | `PREPARE` | teal `--prepare` `#57e0b0` | `is-prepare` |

During every non-rep phase the **exercise name + ⓘ info button stay visible** on
the stage, so the user can open the description at any time.

### Time formatting rules

**a) Top-bar paired timers (always `mm:ss/mm:ss`)**
- **Top-left** = current **exercise**: `elapsed/total`, e.g. `00:45/02:55`.
- **Top-right** = whole **session**: `elapsed/total`, e.g. `09:13/15:34`.
- Always `mm:ss` on both sides of the slash, no suffix. `elapsed` includes the current exercise's prepare and trailing full-rest.

**b) Countdown phases (prepare / rest / full rest) — `fmtCountdown()`**
- **≥ 60 s** → `mm:ss` format, **no suffix** (e.g. `01:15`).
- **< 60 s** → whole seconds with an **`s` suffix** (e.g. `30s`, `9s`).
- A live countdown rolls `…01:01 → 01:00 → 59s → 58s…` as it crosses one minute. Value shown is `Math.ceil(remaining)`.

### The rings (SVG overlay on the image)

Two concentric stroked circles, ~30% transparent, centered over the exercise
image (`workout.html` `<svg class="rings">`).

- **Outer ring (set, r=46, blue):** progress across the whole exercise's sets.
  - `rep`: `((set−1) + (rep−1 + repFraction)/reps) / sets` — smooth fill.
  - `rest`: `set / sets` (the just-finished set counts as done).
  - `fullrest`: `1` (all sets complete).
  - `prepare`: `0`.
- **Inner ring (r=40, color = phase accent):** progress of the **current step**, i.e. `stepElapsed / dur` for every phase. Color switches via the stage phase class.

Geometry: `stroke-dasharray = circumference`, `stroke-dashoffset = circumference · (1 − progress)`. Rings start at 12 o'clock (`rotate(-90)`).

### Set navigation (`jumpSet`)

- `setStarts` is the list of step indices that begin a set (first rep of each set), spanning across exercises.
- "Previous set" goes to the **prior set's start**, never the start of the current set; from set 1 of an exercise it lands on the last set of the previous exercise. Clamped at the first/last set.
- Jumping resets `stepElapsed` to 0 and re-announces the new set by voice.
- The pause button and the name button are excluded from the tap zones.

### Info modal — UTF-8 & direction rules

- Opening **pauses** the workout, remembering the prior play/pause state in `state.pausedBeforeInfo`.
- Closing **reverts** to that state: if it was playing → resume; if it was already paused → stay paused.
- Title = exercise `name`. Body = `description`, rendered with `white-space: pre-line` so `\n` becomes line breaks; long text scrolls.
- **Direction scope:** `dir="rtl"|"ltr"` is applied **only** to the description element (`#infoDesc`), driven by `descDir`. The title and all other UI stay default LTR regardless of content language.

### Voice (Web Speech API → OS text-to-speech)

Uses `window.speechSynthesis` (no audio files). Language `en-US`.

- **prepare**: speaks the exercise **name** (so the rep phase does not repeat it).
- **rep**: speaks the rep number (`"1"`, `"2"`, …). Speaks the name at the first rep **only if** the exercise had no prepare phase.
- **rest**: speaks `"Rest"`. **fullrest**: speaks `"Full rest"`. **finish**: speaks `"Workout complete"`.
- Pausing cancels the current utterance. On a multi-step skip the queued backlog is cancelled and only the current step is spoken.
- **Mobile gesture:** browsers block TTS until a user gesture; the first `pointerdown` primes the synth. The very first announcement on mobile may be silent until the first tap.

### Engine internals

- Single `requestAnimationFrame` loop. Time advances by accumulating per-frame `dt` into `state.stepElapsed`; when it exceeds the current step's `dur`, it carries the remainder into the next step (a `while` loop handles fast steps).
- **`dt` is clamped to 1 second per frame.** After a tab switch, device sleep, or long main-thread stall the real gap can be huge; without the clamp the engine would fast-forward through a whole rest/prepare phase. The clamp means the workout *holds its place* instead of skipping phases.
- **Pause** is implemented by simply not accumulating `dt`; the rAF loop keeps running so the UI stays live. `document.body.is-paused` swaps the pause/play icon.
- **No auto-pause** on blur/visibility change — by design, only the button (or Space) pauses.
- **Finish:** when the last step completes, timers snap to totals, both rings fill, the done overlay shows, and `"Workout complete"` is spoken.

**Key state (`state`):** `steps[]`, `total`, `exercises[]`, `setStarts[]`, `i`
(current step index), `stepElapsed`, `paused`, `finished`, `lastTs`,
`currentExIndex`, `spokenIndex`, `pausedBeforeInfo`.

### Layout (mobile-first)

`.screen` is a CSS grid of three rows: **10%** top bar / **60%** stage / **30%**
panel, height `100svh`. It's capped to a centered column
(`max-width: min(95vw, 64vh)`) so on large screens the timers hug the image
edges instead of the far corners. Safe-area insets are respected.

Top bar: left = exercise timer, center = quit `×` with an exercise progress
counter `current/total` (e.g. `3/5`) beneath it, right = session timer.

### Theme variables (`:root` in `css/styles.css`)

`--bg-top`/`--bg-bottom` (gradient), `--accent` (blue), `--text`/`--text-dim`,
`--rest` (yellow), `--prepare` (teal), `--fullrest` (orange), `--panel`/`--border` (glass surfaces).

</details>

---

<div align="center">

Built with plain HTML, CSS & JavaScript — no dependencies, no build step. 💪

</div>
