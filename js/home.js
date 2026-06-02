/* ============================================================
   Light Workout — home screen
   Builds the routine cards from window.WORKOUT_DATA and shows
   each routine's total time. The total uses the SAME duration
   formula as the engine (see README §4):

     exerciseDuration = prepareTime
                      + sets · reps · repTime
                      + (sets − 1) · restAfterSet
                      + restAfterExercise   (0 on the last exercise)
   ============================================================ */
(function () {
  "use strict";

  // total seconds for a whole routine (kept in sync with buildTimeline in workout.js)
  function routineTotalSeconds(routine) {
    const exs = (routine && routine.exercises) || [];
    let total = 0;
    exs.forEach(function (ex, i) {
      const repTime = +ex.repTime || 0;
      const reps = +ex.reps || 0;
      const sets = +ex.sets || 0;
      const rest = +ex.restAfterSet || 0;
      const prep = +ex.prepareTime || 0;
      const isLast = i === exs.length - 1;
      const full = isLast ? 0 : (ex.restAfterExercise == null ? 30 : +ex.restAfterExercise);
      total += prep + sets * reps * repTime + (sets - 1) * rest + full;
    });
    return total;
  }

  // friendly duration, e.g. "32 min", "1 h 05 min", "45 s"
  function fmtTotal(seconds) {
    const s = Math.round(seconds);
    if (s < 60) return s + " s";
    const m = Math.round(s / 60);
    if (m < 60) return m + " min";
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return h + " h " + String(rm).padStart(2, "0") + " min";
  }

  function render() {
    const list = document.getElementById("routineList");
    const data = window.WORKOUT_DATA;
    if (!list) return;
    if (!data || !data.routines) {
      list.innerHTML = '<p class="home-footer">Could not load <b>data/exercises.js</b>.</p>';
      return;
    }

    const keys = Object.keys(data.routines);
    keys.forEach(function (key, idx) {
      const r = data.routines[key];
      const card = document.createElement("a");
      card.className = "routine-card";
      card.href = "workout.html?routine=" + encodeURIComponent(key);

      const icon = document.createElement("span");
      icon.className = "routine-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = String(idx + 1);

      const text = document.createElement("span");
      text.className = "routine-text";

      const title = document.createElement("span");
      title.className = "routine-title";
      title.textContent = r.title || key;

      const sub = document.createElement("span");
      sub.className = "routine-sub";
      sub.textContent = r.subtitle || "";

      const time = document.createElement("span");
      time.className = "routine-time";
      const exCount = (r.exercises || []).length;
      time.textContent = "⏱ " + fmtTotal(routineTotalSeconds(r)) +
        " · " + exCount + " exercise" + (exCount === 1 ? "" : "s");

      text.appendChild(title);
      if (sub.textContent) text.appendChild(sub);
      text.appendChild(time);

      const arrow = document.createElement("span");
      arrow.className = "routine-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.innerHTML = "&rsaquo;";

      card.appendChild(icon);
      card.appendChild(text);
      card.appendChild(arrow);
      list.appendChild(card);
    });
  }

  render();
})();
