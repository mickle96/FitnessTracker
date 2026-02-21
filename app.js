// ---------------- STATE ----------------
let currentWorkout = null;
let currentExercise = null;
let currentSection = "home";
let exerciseConfig = {}; // Stores sets count and warmup preference per exercise
let completedExercises = new Set(); // Tracks completed exercises in current session

const quotes = [
   "The hardest part is over. You showed up.",
"You miss one hundred percent of the shots you don’t take.",
"Do something today that your future self will thank you for.",
"You must expect things of yourself before you can do them.",
"We can push ourselves further. We always have more to give.",
"Your mind will quit a thousand times before your body will."
];

// ---------------- MODALS ----------------
function openModal(modalId) {
  document.getElementById(modalId).classList.add("active");
  // Focus first input
  const input = document.getElementById(modalId).querySelector("input");
  if (input) input.focus();
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

function toggleWarmup() {
  const toggle = document.getElementById("exercise-warmup-toggle");
  toggle.classList.toggle("active");
}

async function confirmCreateWorkout() {
  const name = document.getElementById("workout-name-input").value.trim();
  if (!name) {
    alert("Please enter a workout name");
    return;
  }
  await supabase.from("workouts").insert({ name });
  document.getElementById("workout-name-input").value = "";
  closeModal("create-workout-modal");
  loadWorkouts();
}

async function confirmAddExercise() {
  const name = document.getElementById("exercise-name-input").value.trim();
  const sets = parseInt(document.getElementById("exercise-sets-input").value) || 4;
  const hasWarmup = document.getElementById("exercise-warmup-toggle").classList.contains("active");
  
  if (!name) {
    alert("Please enter an exercise name");
    return;
  }

  const exercise = await supabase.from("exercises").insert({ name, workout_id: currentWorkout.id }).select().single();
  
  if (exercise.data) {
    exerciseConfig[exercise.data.id] = { sets, hasWarmup };
  }

  document.getElementById("exercise-name-input").value = "";
  document.getElementById("exercise-sets-input").value = "4";
  document.getElementById("exercise-warmup-toggle").classList.add("active");
  closeModal("add-exercise-modal");
  loadExercises(currentWorkout);
}

// ---------------- UTILITIES ----------------
function showPage(pageId) {
  const pages = document.querySelectorAll(".page");
  const nextPage = document.getElementById(pageId);

  pages.forEach(page => {
    if (page === nextPage) {
      page.classList.remove("hidden");
      requestAnimationFrame(() => page.classList.add("is-active"));
      return;
    }

    if (!page.classList.contains("hidden")) {
      page.classList.remove("is-active");
      setTimeout(() => page.classList.add("hidden"), 180);
    }
  });
}

function randomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function isWarmupSet(set) {
  return set.sets === 0;
}

function getBestSet(sets) {
  let best = null;
  sets.forEach(s => {
    if (!best) {
      best = s;
      return;
    }
    if (s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
      best = s;
    }
  });
  return best;
}

function formatSessionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const timeZone = "Australia/Brisbane";
  const now = new Date();
  const key = getDateKey(date, timeZone);
  const todayKey = getDateKey(now, timeZone);
  if (key === todayKey) return "Today";

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = getDateKey(yesterday, timeZone);
  if (key === yesterdayKey) return "Yesterday";

  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getDateKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const map = {};
  parts.forEach(part => {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  });

  return `${map.year}-${map.month}-${map.day}`;
}

async function getSessionPBNames(session, sessionSets, exerciseMap) {
  const exerciseIds = [...new Set(sessionSets.map(s => s.exercise_id))];
  if (exerciseIds.length === 0) return [];

  const { data: previousSets } = await supabase
    .from("sets")
    .select("*")
    .in("exercise_id", exerciseIds)
    .lt("created_at", session.createdAt)
    .neq("session_id", session.sessionId);

  const previousByExercise = new Map();
  (previousSets || []).forEach(set => {
    if (isWarmupSet(set)) return;
    if (!previousByExercise.has(set.exercise_id)) previousByExercise.set(set.exercise_id, []);
    previousByExercise.get(set.exercise_id).push(set);
  });

  const nonWarmupSessionSets = sessionSets.filter(s => !isWarmupSet(s));
  const sessionGrouped = new Map();
  nonWarmupSessionSets.forEach(set => {
    if (!sessionGrouped.has(set.exercise_id)) sessionGrouped.set(set.exercise_id, []);
    sessionGrouped.get(set.exercise_id).push(set);
  });

  const pbNames = [];
  sessionGrouped.forEach((sets, exerciseId) => {
    const bestSession = getBestSet(sets);
    if (!bestSession) return;

    const prevSets = previousByExercise.get(exerciseId) || [];
    const bestPrev = getBestSet(prevSets);
    if (!bestPrev) {
      pbNames.push(exerciseMap.get(exerciseId) || "Exercise");
      return;
    }

    if (
      bestSession.weight > bestPrev.weight ||
      (bestSession.weight === bestPrev.weight && bestSession.reps > bestPrev.reps)
    ) {
      pbNames.push(exerciseMap.get(exerciseId) || "Exercise");
    }
  });

  return pbNames;
}

// ---------------- BACK BUTTON ----------------
document.addEventListener("click", e => {
  if (!e.target.classList.contains("back-btn")) return;

  switch (currentSection) {
    case "view-workouts":
      showPage("home-page");
      currentSection = "home";
      break;
    case "view-exercises":
      loadWorkouts();
      currentSection = "view-workouts";
      break;
    case "previous-workouts":
      showPage("home-page");
      currentSection = "home";
      break;
    case "start-workout":
      showPage("home-page");
      currentSection = "home";
      break;
    case "workout-exercises":
      loadStartWorkout();
      currentSection = "start-workout";
      break;
    case "exercise-detail":
      loadWorkoutExercises(currentWorkout);
      currentSection = "workout-exercises";
      break;
  }
});
// ---------------- TIMER ----------------
let timerInterval = null;
const timerStorageKey = "gymTimerState";

function updateTimerDisplay(sec) {
  const display = document.getElementById("timer-display");
  display.textContent = formatTime(Math.max(0, sec));
}

function saveTimerState(state) {
  localStorage.setItem(timerStorageKey, JSON.stringify(state));
}

function clearTimerState() {
  localStorage.removeItem(timerStorageKey);
}

function getTimerState() {
  const raw = localStorage.getItem(timerStorageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function startTimerWithEnd(endAt) {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const remaining = Math.ceil((endAt - Date.now()) / 1000);
    updateTimerDisplay(remaining);

    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      clearTimerState();
    }
  }, 1000);
}

function syncTimerFromStorage() {
  const state = getTimerState();
  if (!state || !state.endAt) return;

  const remaining = Math.ceil((state.endAt - Date.now()) / 1000);
  if (remaining <= 0) {
    updateTimerDisplay(0);
    clearTimerState();
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    return;
  }

  updateTimerDisplay(remaining);
  startTimerWithEnd(state.endAt);
}

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

document.getElementById("start-timer-btn").onclick = () => {
  const input = document.getElementById("timer-input");

  let sec = parseInt(input.value);
  if (isNaN(sec) || sec <= 0) return;

  const endAt = Date.now() + sec * 1000;
  updateTimerDisplay(sec);
  saveTimerState({ endAt });
  startTimerWithEnd(endAt);
};

document.getElementById("reset-timer-btn").onclick = () => {
  const input = document.getElementById("timer-input");

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;

  clearTimerState();
  updateTimerDisplay(parseInt(input.value) || 0);
};

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    syncTimerFromStorage();
  }
});

window.addEventListener("focus", () => {
  syncTimerFromStorage();
});

syncTimerFromStorage();
// ---------------- HOME ----------------
document.getElementById("view-workouts-btn").onclick = () => {
  currentSection = "view-workouts";
  loadWorkouts();
};

document.getElementById("start-workout-btn").onclick = () => {
  currentSection = "start-workout";
  loadStartWorkout();
};

document.getElementById("view-previous-workouts-btn").onclick = () => {
  currentSection = "previous-workouts";
  loadPreviousWorkouts();
};

document.getElementById("quote-home").textContent = randomQuote();

// ---------------- PREVIOUS WORKOUTS ----------------
async function loadPreviousWorkouts() {
  showPage("previous-workouts-page");
  document.getElementById("quote-previous").textContent = randomQuote();

  const list = document.getElementById("previous-workouts-list");
  list.innerHTML = "";

  const { data: sessionRows, error } = await supabase
    .from("sets")
    .select("session_id, workout_id, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load sessions", error);
    list.textContent = "Failed to load previous workouts.";
    return;
  }

  if (!sessionRows || sessionRows.length === 0) {
    list.textContent = "No previous workouts logged yet.";
    return;
  }

  const sessionMap = new Map();
  sessionRows.forEach(row => {
    if (!sessionMap.has(row.session_id)) {
      sessionMap.set(row.session_id, {
        sessionId: row.session_id,
        workoutId: row.workout_id,
        createdAt: row.created_at
      });
    }
  });

  const sessions = Array.from(sessionMap.values());
  const workoutIds = [...new Set(sessions.map(s => s.workoutId))];

  const { data: workouts, error: workoutError } = await supabase
    .from("workouts")
    .select("id, name")
    .in("id", workoutIds);

  if (workoutError) {
    console.error("Failed to load workout names", workoutError);
  }

  const workoutNameMap = new Map((workouts || []).map(w => [w.id, w.name]));

  sessions.forEach(session => {
    const card = document.createElement("div");
    card.className = "border border-gray-700 rounded-xl p-3 bg-[#1A1C22]/80";

    const header = document.createElement("div");
    header.className = "flex items-center justify-between gap-3";

    const info = document.createElement("div");
    info.className = "flex flex-col";
    const title = document.createElement("div");
    title.className = "font-semibold text-lg";
    title.textContent = workoutNameMap.get(session.workoutId) || "Workout";

    const subtitle = document.createElement("div");
    subtitle.className = "text-sm text-gray-400";
    subtitle.textContent = formatSessionDate(session.createdAt);

    info.appendChild(title);
    info.appendChild(subtitle);

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "btn-border btn-icon border-blue-500 text-blue-400";
    toggleBtn.textContent = "Details";

    const pbSummary = document.createElement("div");
    pbSummary.className = "text-sm text-yellow-300";
    pbSummary.textContent = "PBs: ...";

    header.appendChild(info);
    header.appendChild(pbSummary);
    header.appendChild(toggleBtn);

    const details = document.createElement("div");
    details.className = "hidden mt-3 text-sm";

    toggleBtn.onclick = async () => {
      const isHidden = details.classList.contains("hidden");
      if (isHidden && !details.dataset.loaded) {
        await loadSessionDetails(session, details);
        details.dataset.loaded = "true";
      }
      details.classList.toggle("hidden", !isHidden);
      toggleBtn.textContent = isHidden ? "Hide" : "Details";
    };

    card.appendChild(header);
    card.appendChild(details);
    list.appendChild(card);

    loadSessionPBSummary(session, pbSummary);
  });
}

async function loadSessionPBSummary(session, target) {
  const { data: sessionSets, error } = await supabase
    .from("sets")
    .select("*")
    .eq("session_id", session.sessionId);

  if (error) {
    console.error("Failed to load session sets", error);
    target.textContent = "PBs: —";
    return;
  }

  if (!sessionSets || sessionSets.length === 0) {
    target.textContent = "PBs: 0";
    return;
  }

  const exerciseIds = [...new Set(sessionSets.map(s => s.exercise_id))];
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name")
    .in("id", exerciseIds);

  const exerciseMap = new Map((exercises || []).map(e => [e.id, e.name]));
  const pbNames = await getSessionPBNames(session, sessionSets, exerciseMap);
  target.textContent = `PBs: ${pbNames.length}`;
}

async function loadSessionDetails(session, container) {
  const { data: sessionSets, error } = await supabase
    .from("sets")
    .select("*")
    .eq("session_id", session.sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load session sets", error);
    container.textContent = "Failed to load session details.";
    return;
  }

  if (!sessionSets || sessionSets.length === 0) {
    container.textContent = "No sets logged for this session.";
    return;
  }

  const exerciseIds = [...new Set(sessionSets.map(s => s.exercise_id))];
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name")
    .in("id", exerciseIds);

  const exerciseMap = new Map((exercises || []).map(e => [e.id, e.name]));
  const grouped = new Map();

  sessionSets.forEach(set => {
    if (!grouped.has(set.exercise_id)) grouped.set(set.exercise_id, []);
    grouped.get(set.exercise_id).push(set);
  });

  const pbNames = await getSessionPBNames(session, sessionSets, exerciseMap);

  container.innerHTML = "";

  const pbSummary = document.createElement("div");
  pbSummary.className = "text-sm text-yellow-300";
  pbSummary.textContent = pbNames.length
    ? `PBs: ${pbNames.length} (${pbNames.join(", ")})`
    : "PBs: 0";
  container.appendChild(pbSummary);

  grouped.forEach((sets, exerciseId) => {
    const uniqueBySetNumber = new Map();
    sets.forEach(set => {
      uniqueBySetNumber.set(set.sets, set);
    });

    const uniqueSets = Array.from(uniqueBySetNumber.values())
      .sort((a, b) => a.sets - b.sets);

    const block = document.createElement("div");
    block.className = "mt-3";

    const name = document.createElement("div");
    name.className = "font-semibold text-gray-200";
    name.textContent = exerciseMap.get(exerciseId) || "Exercise";

    const list = document.createElement("div");
    list.className = "mt-1 space-y-1 text-gray-300";

    uniqueSets.forEach(set => {
      const row = document.createElement("div");
      const label = isWarmupSet(set) ? "Warm-up" : `Set ${set.sets}`;
      row.textContent = `${label}: ${set.reps} x ${set.weight}kg`;
      list.appendChild(row);
    });

    block.appendChild(name);
    block.appendChild(list);
    container.appendChild(block);
  });
}

// ---------------- VIEW WORKOUTS ----------------
async function loadWorkouts() {
  showPage("view-workouts-page");
  document.getElementById("quote-view").textContent = randomQuote();

  const { data } = await supabase.from("workouts").select("*").order("created_at", { ascending: true });
  const list = document.getElementById("workouts-list");
  list.innerHTML = "";

  data.forEach(workout => {
    const div = document.createElement("div");
    div.className = "list-row p-3 border border-gray-600 rounded flex justify-between items-center hover:bg-gray-800 cursor-pointer";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = workout.name;
    nameSpan.className = "flex-1";
    nameSpan.onclick = () => loadExercises(workout);
    div.appendChild(nameSpan);

    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.className = "btn-border btn-icon border-yellow-500 text-yellow-400 ml-2 text-sm";
    editBtn.onclick = async (e) => {
      e.stopPropagation();
      const newName = prompt("Edit workout name", workout.name);
      if (!newName) return;
      await supabase.from("workouts").update({ name: newName }).eq("id", workout.id);
      loadWorkouts();
    };
    div.appendChild(editBtn);

    // ---------------- DELETE WORKOUT ----------------
    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";
    delBtn.className = "btn-border btn-icon border-red-500 text-red-400 ml-2 text-sm";
    delBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Delete this workout and all its exercises/sets?")) return;

      try {
        // Delete all sets linked to this workout
        await supabase.from("sets").delete().eq("workout_id", workout.id);
        // Delete all exercises linked to this workout
        await supabase.from("exercises").delete().eq("workout_id", workout.id);
        // Delete the workout
        await supabase.from("workouts").delete().eq("id", workout.id);

        loadWorkouts();
      } catch (err) {
        console.error("Error deleting workout:", err);
        alert("Failed to delete workout. See console.");
      }
    };
    div.appendChild(delBtn);

    list.appendChild(div);
  });
}

document.getElementById("create-workout-btn").onclick = async () => {
  openModal("create-workout-modal");
};

// ---------------- VIEW EXERCISES ----------------
async function loadExercises(workout) {
  currentWorkout = workout;
  currentSection = "view-exercises";

  showPage("view-exercises-page");
  document.getElementById("selected-workout-title").textContent = workout.name;
  document.getElementById("quote-exercises").textContent = randomQuote();

  const { data: exercises } = await supabase
    .from("exercises")
    .select("*")
    .eq("workout_id", workout.id);

  const list = document.getElementById("exercises-list");
  list.innerHTML = "";

  for (const ex of exercises) {
    const { data: allSets } = await supabase
      .from("sets")
      .select("*")
      .eq("exercise_id", ex.id)
      .order("created_at", { ascending: true });

    const nonWarmupSets = allSets.filter(s => !isWarmupSet(s));
    const bestSet = getBestSet(nonWarmupSets);

    const div = document.createElement("div");
    div.className = "list-row p-3 border border-gray-600 rounded flex justify-between items-center hover:bg-gray-800";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = ex.name;
    nameSpan.className = "flex-1";
    div.appendChild(nameSpan);

    const pbSpan = document.createElement("span");
    pbSpan.textContent = !bestSet ? "PB: —" : `PB: ${bestSet.weight}kg × ${bestSet.reps}`;
    pbSpan.className = "text-yellow-400 font-bold ml-2";
    div.appendChild(pbSpan);

    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.className = "btn-border btn-icon border-yellow-500 text-yellow-400 ml-2 text-sm";
    editBtn.onclick = async (e) => {
      e.stopPropagation();
      const newName = prompt("Edit exercise name", ex.name);
      if (!newName) return;
      await supabase.from("exercises").update({ name: newName }).eq("id", ex.id);
      loadExercises(workout);
    };
    div.appendChild(editBtn);

    // ---------------- DELETE EXERCISE ----------------
    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";
    delBtn.className = "btn-border btn-icon border-red-500 text-red-400 ml-2 text-sm";
    delBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Delete this exercise and all its sets/notes?")) return;

      try {
        // Delete all sets for this exercise
        await supabase.from("sets").delete().eq("exercise_id", ex.id);
        // Delete all notes for this exercise
        await supabase.from("exercise_notes").delete().eq("exercise_id", ex.id);
        // Delete the exercise itself
        await supabase.from("exercises").delete().eq("id", ex.id);

        loadExercises(workout);
      } catch (err) {
        console.error("Error deleting exercise:", err);
        alert("Failed to delete exercise. See console.");
      }
    };
    div.appendChild(delBtn);

    list.appendChild(div);
  }
}

document.getElementById("add-exercise-btn").onclick = async () => {
  if (!currentWorkout) return;
  document.getElementById("exercise-sets-input").value = "4";
  document.getElementById("exercise-warmup-toggle").classList.add("active");
  openModal("add-exercise-modal");
};

// ---------------- START WORKOUT ----------------
async function loadStartWorkout() {
  currentSection = "start-workout";
  showPage("start-workout-page");
  document.getElementById("quote-start").textContent = randomQuote();
  document.getElementById("start-workout-title").textContent = "Select Workout";

  const { data: workouts } = await supabase.from("workouts").select("*");
  const { data: recentSets } = await supabase
    .from("sets")
    .select("workout_id, created_at")
    .order("created_at", { ascending: false });

  const lastCompletedByWorkout = new Map();
  (recentSets || []).forEach(set => {
    if (!lastCompletedByWorkout.has(set.workout_id)) {
      lastCompletedByWorkout.set(set.workout_id, set.created_at);
    }
  });

  const list = document.getElementById("start-workout-list");
  list.innerHTML = "";

  workouts.forEach(workout => {
    const div = document.createElement("div");
    div.className = "list-row p-3 border border-gray-600 rounded cursor-pointer hover:bg-gray-800 transition-colors";

    const info = document.createElement("div");
    info.className = "flex flex-col";

    const title = document.createElement("div");
    title.className = "font-semibold";
    title.textContent = workout.name;

    const subtitle = document.createElement("div");
    subtitle.className = "text-sm text-gray-400";
    const lastCompleted = lastCompletedByWorkout.get(workout.id);
    subtitle.textContent = lastCompleted
      ? `Last completed: ${formatSessionDate(lastCompleted)}`
      : "Last completed: —";

    info.appendChild(title);
    info.appendChild(subtitle);
    div.appendChild(info);

    div.onclick = () => startWorkoutSession(workout);
    list.appendChild(div);
  });

  document.getElementById("finish-workout-btn").classList.add("hidden");
}

// ---------------- START WORKOUT SESSION ----------------
function startWorkoutSession(workout) {
  currentWorkout = {
    ...workout,
    session_id: crypto.randomUUID()
  };
  completedExercises = new Set(); // Reset completed exercises for new session
  loadWorkoutExercises(currentWorkout);
}

// ---------------- WORKOUT EXERCISES ----------------
async function loadWorkoutExercises(workout) {
  currentSection = "workout-exercises";

  showPage("start-workout-page");
  document.getElementById("start-workout-title").textContent = "Select Exercise";

  const { data: exercises } = await supabase
    .from("exercises")
    .select("*")
    .eq("workout_id", workout.id);

  const list = document.getElementById("start-workout-list");
  list.innerHTML = "";

  exercises.forEach(ex => {
    const div = document.createElement("div");
    div.className = "list-row p-3 border border-gray-600 rounded cursor-pointer hover:bg-gray-800 flex justify-between items-center";
    
    const nameSpan = document.createElement("span");
    nameSpan.textContent = ex.name;
    nameSpan.style.flex = "1";
    div.appendChild(nameSpan);
    
    const isCompleted = completedExercises.has(ex.id);
    if (isCompleted) {
      const checkmark = document.createElement("span");
      checkmark.textContent = "✓";
      checkmark.style.color = "#4CAF50";
      checkmark.style.fontSize = "1.5rem";
      checkmark.style.fontWeight = "bold";
      div.appendChild(checkmark);
    }
    
    div.onclick = () => openExerciseDetail(ex);
    list.appendChild(div);
  });

  if (exercises && exercises.length > 0) {
    document.getElementById("finish-workout-btn").classList.remove("hidden");
  } else {
    document.getElementById("finish-workout-btn").classList.add("hidden");
  }
}

// ---------------- EXERCISE DETAIL ----------------
async function openExerciseDetail(ex) {
  currentExercise = ex;
  currentSection = "exercise-detail";

  showPage("exercise-detail-page");
  document.getElementById("exercise-title").textContent = ex.name;
  document.getElementById("quote-exercise").textContent = randomQuote();

  const setsContainer = document.getElementById("sets-container");
  setsContainer.innerHTML = "";

  const { data: lastSets } = await supabase
    .from("sets")
    .select("*")
    .eq("exercise_id", ex.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: lastNote, error } = await supabase
    .from("exercise_notes")
    .select("note, created_at")
    .eq("exercise_id", ex.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) console.error(error);
  document.getElementById("exercise-note").value = lastNote ? lastNote.note : "";

  const headerDiv = document.createElement("div");
  headerDiv.className = "flex items-center gap-2 mb-2 font-semibold text-gray-300";
  headerDiv.innerHTML = `
    <span class="w-20"></span>
    <div class="w-16 text-center">Reps</div>
    <div class="w-16 text-center">Kg</div>
    <div class="flex-1 text-right">Previous</div>
  `;
  setsContainer.appendChild(headerDiv);

  // Get the exercise config (sets count and warmup preference)
  const config = exerciseConfig[ex.id] || { sets: 3, hasWarmup: true };
  const totalSets = config.hasWarmup ? config.sets + 1 : config.sets;

  for (let i = 0; i < totalSets; i++) {
    const isWarmup = config.hasWarmup && i === 0;
    let displayLabel;
    if (isWarmup) {
      displayLabel = "Warm-up";
    } else if (config.hasWarmup) {
      displayLabel = "Set " + i;
    } else {
      displayLabel = "Set " + (i + 1);
    }
    
    const lastSet = lastSets.find(s => s.sets === i);
    const prevText = lastSet ? `${lastSet.reps} × ${lastSet.weight}kg` : '-';

    const div = document.createElement("div");
    div.className = "flex items-center gap-2 mb-1";
    div.innerHTML = `
      <span class="font-bold w-20">${displayLabel}:</span>
      <input type="number" placeholder="Reps" class="w-16 p-1 text-center">
      <input type="number" placeholder="Kg" class="w-16 p-1 text-center">
      <div class="flex-1 text-right text-gray-400 text-sm">${prevText}</div>
    `;
    setsContainer.appendChild(div);
  }

  document.getElementById("save-exercise-note").onclick = async () => {
    if (!currentExercise || !currentWorkout || !currentWorkout.session_id) return;

    const setsDivs = Array.from(document.getElementById("sets-container").children).slice(1);
    const noteValue = document.getElementById("exercise-note").value;

    await supabase
      .from("sets")
      .delete()
      .eq("session_id", currentWorkout.session_id)
      .eq("exercise_id", currentExercise.id);

    for (let i = 0; i < setsDivs.length; i++) {
      const inputs = setsDivs[i].querySelectorAll("input");
      const reps = parseInt(inputs[0].value) || 0;
      const weight = parseFloat(inputs[1].value) || 0;

      if (reps > 0 || weight > 0) {
        await supabase.from("sets").insert({
          exercise_id: currentExercise.id,
          workout_id: currentWorkout.id,
          session_id: currentWorkout.session_id,
          sets: i,
          reps,
          weight
        });
      }
    }

    if (noteValue.trim() !== "") {
      await supabase.from("exercise_notes").insert({
        exercise_id: currentExercise.id,
        note: noteValue
      });
    }

    // Mark exercise as completed
    completedExercises.add(currentExercise.id);
    
    // Return to select exercise screen
    currentSection = "workout-exercises";
    await loadWorkoutExercises(currentWorkout);
  };
}

// ---------------- FINISH WORKOUT ----------------
document.getElementById("finish-workout-btn").onclick = async () => {
  if (!currentWorkout || !currentWorkout.session_id) return;

  const { data: sessionSets, error: sessionError } = await supabase
    .from("sets")
    .select("*")
    .eq("session_id", currentWorkout.session_id);

  if (sessionError) {
    alert("Error fetching session sets.");
    return;
  }

  if (!sessionSets || sessionSets.length === 0) {
    alert("Workout finished!\nNo sets logged, so no PBs today.");
    return;
  }

  const setsByExercise = {};
  sessionSets.forEach(s => {
    if (!setsByExercise[s.exercise_id]) setsByExercise[s.exercise_id] = [];
    setsByExercise[s.exercise_id].push(s);
  });

  const pbExercises = [];

  for (const exerciseId in setsByExercise) {
    const todaysSets = setsByExercise[exerciseId].filter(s => !isWarmupSet(s));

    if (todaysSets.length === 0) {
      continue;
    }

    const { data: previousSets } = await supabase
      .from("sets")
      .select("*")
      .eq("exercise_id", exerciseId)
      .neq("session_id", currentWorkout.session_id);

    const previousNonWarmup = (previousSets || []).filter(s => !isWarmupSet(s));

    let isPB = false;

    if (!previousNonWarmup || previousNonWarmup.length === 0) {
      isPB = true;
    } else {
      const bestPrevious = getBestSet(previousNonWarmup);
      for (const set of todaysSets) {
        if (
          set.weight > bestPrevious.weight ||
          (set.weight === bestPrevious.weight && set.reps > bestPrevious.reps)
        ) {
          isPB = true;
          break;
        }
      }
    }

    if (isPB) pbExercises.push(exerciseId);
  }

  let message = "Workout finished!\n";
  if (pbExercises.length === 0) {
    message += "No PBs today.";
  } else {
    const { data: names } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", pbExercises);

    const list = names.map(n => `• ${n.name}`).join("\n");
    message += `PBs today: ${pbExercises.length}\n\n${list}`;
  }

  alert(message);

  // Reset to home
  currentWorkout = null;
  currentSection = "home";
  completedExercises = new Set(); // Reset completed exercises for new session
  showPage("home-page");
};

// ---------------- EXPOSE FUNCTIONS TO GLOBAL SCOPE ----------------
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleWarmup = toggleWarmup;
window.confirmCreateWorkout = confirmCreateWorkout;
window.confirmAddExercise = confirmAddExercise;
