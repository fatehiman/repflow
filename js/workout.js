/* ============================================================
   Light Workout — exercise runner engine
   Flow: reps counted up over rep-time, rest countdown between
   sets, all timers computed from the data (compute-everything).
   ============================================================ */

(function () {
  "use strict";

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    exElapsed: $("exElapsed"), exTotal: $("exTotal"),
    totElapsed: $("totElapsed"), totTotal: $("totTotal"),
    image: $("exImage"), name: $("exName"),
    exIdxNow: $("exIdxNow"), exIdxTot: $("exIdxTot"),
    ringSet: $("ringSet"), ringRep: $("ringRep"),
    stage: document.querySelector(".stage"),
    pauseBtn: $("pauseBtn"), quitBtn: $("quitBtn"),
    phaseRep: $("phaseRep"), phaseRest: $("phaseRest"),
    repNow: $("repNow"), repTot: $("repTot"),
    setNow: $("setNow"), setTot: $("setTot"),
    restValue: $("restValue"), restNextSet: $("restNextSet"),
    phasePrepare: $("phasePrepare"), prepValue: $("prepValue"),
    phaseFullRest: $("phaseFullRest"), fullRestValue: $("fullRestValue"), fullRestNext: $("fullRestNext"),
    doneOverlay: $("doneOverlay"), doneSummary: $("doneSummary"),
    infoBtn: $("infoBtn"), infoOverlay: $("infoOverlay"),
    infoTitle: $("infoTitle"), infoDesc: $("infoDesc"), infoClose: $("infoClose"),
  };

  /* ---------- helpers ---------- */
  const RING = { set: 46, rep: 40 };
  const C = { set: 2 * Math.PI * RING.set, rep: 2 * Math.PI * RING.rep };
  el.ringSet.style.strokeDasharray = C.set;
  el.ringRep.style.strokeDasharray = C.rep;

  function setRing(node, circ, progress) {
    const p = Math.max(0, Math.min(1, progress));
    node.style.strokeDashoffset = circ * (1 - p);
  }
  function mmss(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
  }
  // countdown phases (prepare / rest / full rest): >= 60s shows mm:ss (no suffix),
  // under a minute shows whole seconds with an "s" suffix.
  function fmtCountdown(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return s >= 60 ? mmss(s) : s + "s";
  }
  function getParam(name) {
    return new URLSearchParams(location.search).get(name);
  }
  function fatal(msg) {
    document.body.innerHTML = '<div class="fatal">' + msg + "</div>";
  }

  /* ---------- voice (Web Speech API → the OS text-to-speech) ---------- */
  const canSpeak = "speechSynthesis" in window;
  let voiceOn = canSpeak;
  function speak(text) {
    if (!voiceOn) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 1; u.pitch = 1;
    window.speechSynthesis.speak(u);
  }
  /* ---------- beep (Web Audio API) ---------- */
  // tiny countdown beep on the last 3 seconds of a timed phase
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }
  function beep() {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();   // best-effort re-unlock
    const FREQ = 400, DUR = 0.3, VOL = 0.3;        // 400Hz, 300ms
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = FREQ;
    // quick fade in/out to avoid clicks
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(VOL, t + 0.01);
    gain.gain.setValueAtTime(VOL, t + DUR - 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + DUR);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(t); osc.stop(t + DUR);
  }

  /* ---------- screen wake lock (keep the display on while playing) ---------- */
  let wakeLock = null;
  async function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } catch (e) { /* rejected (e.g. tab hidden) — ignore */ }
  }
  function releaseWakeLock() {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  }
  // the OS drops the lock when the page is hidden; re-acquire when it comes back
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !state.paused && !state.finished) {
      requestWakeLock();
    }
  });

  // Browsers block audio (and gate TTS / wake lock) until the user interacts
  // with THIS page — and a fresh load after navigating from the home screen
  // starts with no activation, so the first PREPARE countdown can be silent
  // until you tap. Unlock on the first gesture of ANY kind, and keep listening
  // until the AudioContext is actually running (one tap → sound for the rest
  // of the session).
  const UNLOCK_EVENTS = ["pointerdown", "touchstart", "mousedown", "keydown", "click"];
  let primed = false;
  function unlockOnGesture() {
    if (!primed) {
      primed = true;
      if (canSpeak) window.speechSynthesis.speak(new SpeechSynthesisUtterance(" "));
      if (!state.paused && !state.finished) requestWakeLock();
    }
    ensureAudio();
    if (audioCtx && audioCtx.state === "running") {
      UNLOCK_EVENTS.forEach((ev) => document.removeEventListener(ev, unlockOnGesture));
    }
  }
  UNLOCK_EVENTS.forEach((ev) => document.addEventListener(ev, unlockOnGesture));

  function announce(step) {
    const ex = state.exercises[step.exIndex];
    if (step.type === "prepare") { speak(ex.name); return; }  // name up front
    if (step.type === "rest") { speak("Rest"); return; }
    if (step.type === "fullrest") { speak("Full rest"); return; }
    // rep — only say the name here if there was no prepare phase that already said it
    if (step.set === 1 && step.rep === 1 && !(+ex.prepareTime > 0)) speak(ex.name);
    speak(String(step.rep));
  }

  /* ---------- build the step timeline ---------- */
  // Each step is one rep or one rest. We precompute global + per-exercise
  // offsets so the two top-bar timers are pure lookups at runtime.
  function buildTimeline(exercises) {
    const steps = [];
    let globalStart = 0;

    exercises.forEach((ex, exIndex) => {
      const repTime = +ex.repTime, reps = +ex.reps, sets = +ex.sets;
      const rest = +ex.restAfterSet || 0;
      const prep = +ex.prepareTime || 0;
      // "full rest" after the exercise — default 30s, skipped after the last exercise
      const isLast = exIndex === exercises.length - 1;
      const full = isLast ? 0 : (ex.restAfterExercise == null ? 30 : +ex.restAfterExercise);
      const exDuration = prep + sets * reps * repTime + (sets - 1) * rest + full;
      let exStart = 0;

      if (prep > 0) {
        steps.push({
          type: "prepare", exIndex, exDuration, exStart, globalStart,
          dur: prep, sets, reps,
        });
        exStart += prep; globalStart += prep;
      }

      for (let s = 1; s <= sets; s++) {
        for (let r = 1; r <= reps; r++) {
          steps.push({
            type: "rep", exIndex, exDuration, exStart, globalStart,
            dur: repTime, set: s, rep: r, reps, sets,
          });
          exStart += repTime; globalStart += repTime;
        }
        if (s < sets) {
          steps.push({
            type: "rest", exIndex, exDuration, exStart, globalStart,
            dur: rest, set: s, reps, sets, // rest AFTER set s (before set s+1)
          });
          exStart += rest; globalStart += rest;
        }
      }

      if (full > 0) {
        steps.push({
          type: "fullrest", exIndex, exDuration, exStart, globalStart,
          dur: full, sets, reps, // belongs to this exercise; next exercise follows
        });
        exStart += full; globalStart += full;
      }
    });

    return { steps, total: globalStart };
  }

  /* ---------- engine ---------- */
  const state = {
    steps: [], total: 0, exercises: [],
    i: 0,                // current step index
    stepElapsed: 0,      // seconds elapsed within current step
    paused: false,
    finished: false,
    lastTs: 0,
    currentExIndex: -1,
    spokenIndex: -1,
    beepStep: -1, beepSec: -1,   // last (step, second) we beeped, to fire once each
  };

  function start(routine) {
    state.exercises = routine.exercises;
    const tl = buildTimeline(routine.exercises);
    state.steps = tl.steps;
    state.total = tl.total;
    // navigation anchors: the start of every phase — prepare, each set (first
    // rep), each rest, each full rest. Lets left/right tap step through rests
    // and prepare phases too, not only set starts.
    state.navStarts = [];
    state.steps.forEach((s, idx) => {
      if (s.type !== "rep" || s.rep === 1) state.navStarts.push(idx);
    });
    el.totTotal.textContent = mmss(state.total);
    el.exIdxTot.textContent = routine.exercises.length;
    document.title = routine.title;
    requestWakeLock();                  // keep the screen on while the workout runs
    requestAnimationFrame(loop);
  }

  // jump to the previous / next phase (delta = -1 / +1) — prepare, set, rest,
  // and full rest are all valid stopping points
  function jumpSet(delta) {
    if (state.finished || !state.navStarts.length) return;
    let p = 0;
    for (let k = 0; k < state.navStarts.length; k++) {
      if (state.navStarts[k] <= state.i) p = k; else break;
    }
    const target = Math.max(0, Math.min(state.navStarts.length - 1, p + delta));
    state.i = state.navStarts[target];
    state.stepElapsed = 0;
    state.spokenIndex = -1;           // force re-announce of the new set
    if (canSpeak) window.speechSynthesis.cancel();
    render();
  }

  function currentStep() { return state.steps[state.i]; }

  function loadExerciseVisual(step) {
    if (step.exIndex === state.currentExIndex) return;
    state.currentExIndex = step.exIndex;
    const ex = state.exercises[step.exIndex];
    el.image.src = ex.image;
    el.image.alt = ex.name;
    el.name.textContent = ex.name;
    el.exIdxNow.textContent = step.exIndex + 1;
  }

  function loop(ts) {
    if (state.finished) return;
    if (!state.lastTs) state.lastTs = ts;
    // clamp the step: after a tab switch / sleep / long stall the gap can be
    // huge, and without this the engine would fast-forward straight past a
    // whole rest or prepare phase (the "rest not showing" bug).
    let dt = Math.min((ts - state.lastTs) / 1000, 1);
    state.lastTs = ts;

    if (!state.paused) {
      state.stepElapsed += dt;
      // advance through any steps we've run past (handles big dt / fast steps)
      while (state.i < state.steps.length &&
             state.stepElapsed >= state.steps[state.i].dur) {
        state.stepElapsed -= state.steps[state.i].dur;
        state.i++;
        if (state.i >= state.steps.length) { finish(); return; }
      }
    }

    render();
    requestAnimationFrame(loop);
  }

  function render() {
    const step = currentStep();
    if (!step) return;
    loadExerciseVisual(step);

    // speak once per step; if we skipped ahead (e.g. returning from background),
    // drop the queued backlog and just announce where we actually are
    if (state.i !== state.spokenIndex) {
      const jumped = state.i - state.spokenIndex;
      state.spokenIndex = state.i;
      if (jumped !== 1 && canSpeak) window.speechSynthesis.cancel();
      announce(step);
    }

    const f = step.dur > 0 ? Math.min(1, state.stepElapsed / step.dur) : 1;

    /* top-bar timers */
    const totElapsed = step.globalStart + state.stepElapsed;
    const exElapsed = step.exStart + state.stepElapsed;
    el.totElapsed.textContent = mmss(totElapsed);
    el.exElapsed.textContent = mmss(exElapsed);
    el.exTotal.textContent = mmss(step.exDuration);

    /* outer (set) ring — smooth progress across the whole exercise's sets */
    let setProgress = 0;
    if (step.type === "rep") {
      const withinSet = (step.rep - 1 + f) / step.reps;
      setProgress = ((step.set - 1) + withinSet) / step.sets;
    } else if (step.type === "rest") {
      setProgress = step.set / step.sets;          // set fully done during its trailing rest
    } else if (step.type === "fullrest") {
      setProgress = 1;                             // all sets complete
    }                                              // prepare → 0
    setRing(el.ringSet, C.set, setProgress);
    setRing(el.ringRep, C.rep, f);                 // inner ring = current phase progress

    // phase colours via the stage class
    el.stage.classList.toggle("is-rest", step.type === "rest");
    el.stage.classList.toggle("is-prepare", step.type === "prepare");
    el.stage.classList.toggle("is-fullrest", step.type === "fullrest");
    // show only the panel for the active phase
    el.phaseRep.hidden = step.type !== "rep";
    el.phaseRest.hidden = step.type !== "rest";
    el.phasePrepare.hidden = step.type !== "prepare";
    el.phaseFullRest.hidden = step.type !== "fullrest";

    const remaining = step.dur - state.stepElapsed;

    // countdown beep: a 400Hz/300ms tone on each of the final 3 seconds (3,2,1)
    // of any timed countdown phase (prepare / rest / full rest)
    const isCountdown = step.type === "rest" || step.type === "prepare" || step.type === "fullrest";
    if (isCountdown && !state.paused) {
      const sec = Math.ceil(remaining);
      if (sec >= 1 && sec <= 3 && (state.beepStep !== state.i || state.beepSec !== sec)) {
        state.beepStep = state.i; state.beepSec = sec;
        beep();
      }
    }

    if (step.type === "rep") {
      el.repNow.textContent = step.rep;
      el.repTot.textContent = step.reps;
      el.setNow.textContent = step.set;
      el.setTot.textContent = step.sets;
    } else if (step.type === "rest") {
      el.restValue.textContent = fmtCountdown(remaining);
      el.restNextSet.textContent = step.set + 1;
    } else if (step.type === "fullrest") {
      el.fullRestValue.textContent = fmtCountdown(remaining);
      const next = state.exercises[step.exIndex + 1];
      el.fullRestNext.textContent = next ? next.name : "";
    } else { // prepare
      el.prepValue.textContent = fmtCountdown(remaining);
    }
  }

  function finish() {
    state.finished = true;
    releaseWakeLock();
    el.totElapsed.textContent = mmss(state.total);
    el.exElapsed.textContent = el.exTotal.textContent;
    setRing(el.ringSet, C.set, 1);
    setRing(el.ringRep, C.rep, 1);
    const exCount = state.exercises.length;
    el.doneSummary.textContent =
      exCount + " exercises done in " + mmss(state.total) + ". Nice work!";
    el.doneOverlay.hidden = false;
    speak("Workout complete");
  }

  function openInfo() {
    const ex = state.exercises[state.currentExIndex];
    if (!ex) return;
    state.pausedBeforeInfo = state.paused;          // remember the play/pause state
    if (!state.paused) togglePause();               // pause while reading
    el.infoTitle.textContent = ex.name;
    el.infoDesc.textContent = ex.description || "No description available.";
    const dir = (ex.descDir || "ltr").toLowerCase() === "rtl" ? "rtl" : "ltr";
    el.infoDesc.setAttribute("dir", dir);           // direction applies to description only
    el.infoOverlay.hidden = false;
  }
  function closeInfo() {
    el.infoOverlay.hidden = true;
    // revert to whatever it was when the modal opened: was playing → resume, was paused → stay paused
    if (!state.pausedBeforeInfo && state.paused) togglePause();
  }

  function togglePause() {
    state.paused = !state.paused;
    document.body.classList.toggle("is-paused", state.paused);
    el.pauseBtn.setAttribute("aria-label", state.paused ? "Play" : "Pause");
    if (state.paused) {
      if (canSpeak) window.speechSynthesis.cancel();
      releaseWakeLock();               // let the screen sleep while paused
    } else {
      requestWakeLock();
    }
  }

  /* ---------- wiring ---------- */
  el.pauseBtn.addEventListener("click", togglePause);
  el.quitBtn.addEventListener("click", () => { location.href = "index.html"; });
  // tap right half of the image → next set, left half → previous set
  el.stage.addEventListener("click", (e) => {
    // let the pause button and the info name button handle their own taps
    if (e.target.closest(".pause-btn") || e.target.closest(".ex-name")) return;
    const rect = el.stage.getBoundingClientRect();
    jumpSet(e.clientX - rect.left > rect.width / 2 ? 1 : -1);
  });
  el.infoBtn.addEventListener("click", openInfo);
  el.infoClose.addEventListener("click", closeInfo);
  el.infoOverlay.addEventListener("click", (e) => {
    if (e.target === el.infoOverlay) closeInfo();   // tap backdrop to close
  });
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") { e.preventDefault(); togglePause(); }
    if (e.key === "Escape") {
      if (!el.infoOverlay.hidden) closeInfo();
      else location.href = "index.html";
    }
  });

  /* ---------- boot ---------- */
  const key = getParam("routine") || "core1";
  const data = window.WORKOUT_DATA;
  if (!data || !data.routines) {
    fatal("Could not find workout data. Is <b>data/exercises.js</b> loaded?");
    return;
  }
  const routine = data.routines[key];
  if (!routine) { fatal("Routine &ldquo;" + key + "&rdquo; not found."); return; }
  start(routine);
})();
