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
  // Mobile browsers require a user gesture before TTS will play — unlock on first tap.
  let voicePrimed = false;
  function primeVoice() {
    if (voicePrimed || !canSpeak) return;
    voicePrimed = true;
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(" "));
  }
  document.addEventListener("pointerdown", primeVoice, { once: true });

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
  };

  function start(routine) {
    state.exercises = routine.exercises;
    const tl = buildTimeline(routine.exercises);
    state.steps = tl.steps;
    state.total = tl.total;
    // step index where each set begins (first rep of the set), across all exercises
    state.setStarts = [];
    state.steps.forEach((s, idx) => {
      if (s.type === "rep" && s.rep === 1) state.setStarts.push(idx);
    });
    el.totTotal.textContent = mmss(state.total);
    el.exIdxTot.textContent = routine.exercises.length;
    document.title = routine.title;
    requestAnimationFrame(loop);
  }

  // jump to the previous / next set (delta = -1 / +1)
  function jumpSet(delta) {
    if (state.finished || !state.setStarts.length) return;
    let p = 0;
    for (let k = 0; k < state.setStarts.length; k++) {
      if (state.setStarts[k] <= state.i) p = k; else break;
    }
    const target = Math.max(0, Math.min(state.setStarts.length - 1, p + delta));
    state.i = state.setStarts[target];
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
    if (state.paused && canSpeak) window.speechSynthesis.cancel();
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
