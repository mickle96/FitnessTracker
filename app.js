// ---------------- STATE ----------------
let currentWorkout = null;
let currentExercise = null;
let currentSection = "home";

const quotes = [
  "Push yourself because no one else is going to do it for you.",
  "The body achieves what the mind believes.",
  "Strength does not come from the body, it comes from the will.",
  "Sweat is fat crying."
];

// ---------------- UTILITIES ----------------
function showPage(pageId) {
  document.querySelectorAll("body > div").forEach(d => d.classList.add("hidden"));
  const page = document.getElementById(pageId);
  if (page) page.classList.remove("hidden");
}

function randomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
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

// ---------------- HOME ----------------
document.getElementById("view-workouts-btn").onclick = () => {
  currentSection = "view-workouts";
  loadWorkouts();
};

document.getElementById("start-workout-btn").onclick = () => {
  currentSection = "start-workout";
  loadStartWorkout();
};

document.getElementById("quote-home").textContent = randomQuote();

// ---------------- VIEW WORKOUTS ----------------
async function loadWorkouts() {
  showPage("view-workouts-page");
  document.getElementById("quote-view").textContent = randomQuote();

  const { data } = await supabase.from("workouts").select("*").order("created_at", { ascending: true });
  const list = document.getElementById("workouts-list");
  list.innerHTML = "";

  data.forEach(workout => {
    const div = document.createElement("div");
    div.className = "p-3 bg-gray-800 rounded flex justify-between items-center";

    // Workout name
    const nameSpan = document.createElement("span");
    nameSpan.textContent = workout.name;
    nameSpan.className = "flex-1 cursor-pointer";
    nameSpan.onclick = () => loadExercises(workout);
    div.appendChild(nameSpan);

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.className = "ml-2 px-2 py-1 bg-yellow-600 rounded text-sm";
    editBtn.onclick = async (e) => {
      e.stopPropagation();
      const newName = prompt("Edit workout name", workout.name);
      if (!newName) return;
      await supabase.from("workouts").update({ name: newName }).eq("id", workout.id);
      loadWorkouts();
    };
    div.appendChild(editBtn);

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";
    delBtn.className = "ml-2 px-2 py-1 bg-red-600 rounded text-sm";
    delBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Delete this workout?")) return;
      await supabase.from("workouts").delete().eq("id", workout.id);
      loadWorkouts();
    };
    div.appendChild(delBtn);

    list.appendChild(div);
  });

  // Create workout button handled separately
}

document.getElementById("create-workout-btn").onclick = async () => {
  const name = prompt("Workout name");
  if (!name) return;
  await supabase.from("workouts").insert({ name });
  loadWorkouts();
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
    // 1️⃣ Fetch all previous notes for this exercise to calculate PB
    const { data: allNotes } = await supabase
      .from("notes")
      .select("*")
      .eq("exercise_id", ex.id)
      .order("created_at", { ascending: true });

    // 2️⃣ Group notes by session (created_at date)
    const sessions = {};
    allNotes.forEach(n => {
      const date = n.created_at.split("T")[0];
      if (!sessions[date]) sessions[date] = [];
      sessions[date].push(n);
    });

    // 3️⃣ Calculate max total (PB) for this exercise
    let pbTotal = 0;
    Object.values(sessions).forEach(session => {
      const total = session.reduce((sum, set) => sum + (set.reps * set.weight), 0);
      if (total > pbTotal) pbTotal = total;
    });

    const div = document.createElement("div");
    div.className = "p-3 bg-gray-800 rounded flex justify-between items-center";

    // Exercise name
    const nameSpan = document.createElement("span");
    nameSpan.textContent = ex.name;
    nameSpan.className = "flex-1";
    div.appendChild(nameSpan);

    // PB
    const pbSpan = document.createElement("span");
    pbSpan.textContent = `PB: ${pbTotal}`;
    pbSpan.className = "text-yellow-400 font-bold ml-2";
    div.appendChild(pbSpan);

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.className = "ml-2 px-2 py-1 bg-yellow-600 rounded text-sm";
    editBtn.onclick = async (e) => {
      e.stopPropagation();
      const newName = prompt("Edit exercise name", ex.name);
      if (!newName) return;
      await supabase.from("exercises").update({ name: newName }).eq("id", ex.id);
      loadExercises(workout);
    };
    div.appendChild(editBtn);

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";
    delBtn.className = "ml-2 px-2 py-1 bg-red-600 rounded text-sm";
    delBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Delete this exercise?")) return;
      await supabase.from("exercises").delete().eq("id", ex.id);
      loadExercises(workout);
    };
    div.appendChild(delBtn);

    list.appendChild(div);
  }
}

// ---------------- Add Exercise ----------------
document.getElementById("add-exercise-btn").onclick = async () => {
  const name = prompt("Exercise name");
  if (!name) return;
  await supabase.from("exercises").insert({ name, workout_id: currentWorkout.id });
  loadExercises(currentWorkout);
};

// ---------------- START WORKOUT ----------------
async function loadStartWorkout() {
  showPage("start-workout-page");
  document.getElementById("quote-start").textContent = randomQuote();

  const { data } = await supabase.from("workouts").select("*");
  const list = document.getElementById("start-workout-list");
  list.innerHTML = "";

  data.forEach(workout => {
    const div = document.createElement("div");
    div.className = "p-3 bg-gray-800 rounded cursor-pointer";
    div.textContent = workout.name;
    div.onclick = () => loadWorkoutExercises(workout);
    list.appendChild(div);
  });
}

// ---------------- WORKOUT EXERCISES ----------------
async function loadWorkoutExercises(workout) {
  currentWorkout = workout;
  currentSection = "workout-exercises";

  showPage("start-workout-page");

  const { data } = await supabase.from("exercises").select("*").eq("workout_id", workout.id);
  const list = document.getElementById("start-workout-list");
  list.innerHTML = "";

  data.forEach(ex => {
    const div = document.createElement("div");
    div.className = "p-3 bg-gray-800 rounded cursor-pointer";
    div.textContent = ex.name;
    div.onclick = () => openExerciseDetail(ex);
    list.appendChild(div);
  });
}

// ---------------- EXERCISE DETAIL + TIMER ----------------
async function openExerciseDetail(ex) {
  currentExercise = ex;
  currentSection = "exercise-detail";

  showPage("exercise-detail-page");
  document.getElementById("exercise-title").textContent = ex.name;
  document.getElementById("quote-exercise").textContent = randomQuote();

  const setsContainer = document.getElementById("sets-container");
  setsContainer.innerHTML = "";

  // Load last 4 sets for this exercise
  const { data: lastSets } = await supabase
    .from("notes")
    .select("*")
    .eq("exercise_id", ex.id)
    .order("created_at", { ascending: false })
    .limit(4) || [];

  for (let i = 0; i < 4; i++) {
    const lastSet = lastSets.find(s => s.sets === i);
    const repsValue = lastSet?.reps || "";
    const weightValue = lastSet?.weight || "";

    const div = document.createElement("div");
    div.className = "flex flex-col sm:flex-row gap-2 items-center bg-gray-700 p-2 rounded";
    div.innerHTML = `
      <label class="font-bold w-24">${i === 0 ? "Warm-up" : "Set " + i}:</label>
      <input type="number" placeholder="Reps" class="w-full sm:w-20 p-2 text-black text-lg" value="${repsValue}" style="color:${repsValue ? 'grey' : 'black'}">
      <input type="number" placeholder="Kg" class="w-full sm:w-20 p-2 text-black text-lg" value="${weightValue}" style="color:${weightValue ? 'grey' : 'black'}">
    `;
    setsContainer.appendChild(div);
  }

  // Last note
  const { data: lastNotes } = await supabase
    .from("notes")
    .select("*")
    .eq("exercise_id", ex.id)
    .order("created_at", { ascending: false })
    .limit(1) || [];

  document.getElementById("exercise-note").value = lastNotes?.[0]?.note || "";

  // Timer
  let timerInterval = null;
  let timerSeconds = parseInt(document.getElementById("timer-input").value) || 90;
  const display = document.getElementById("timer-display");

  function updateTimerDisplay() {
    const m = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
    const s = String(timerSeconds % 60).padStart(2, "0");
    display.textContent = `${m}:${s}`;
  }

  document.getElementById("start-timer-btn").onclick = () => {
    const inputSeconds = parseInt(document.getElementById("timer-input").value);
    if (!isNaN(inputSeconds) && inputSeconds > 0) timerSeconds = inputSeconds;
    updateTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timerSeconds--;
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        alert("Time's up! ⏱️");
      }
    }, 1000);
  };

  document.getElementById("reset-timer-btn").onclick = () => {
    clearInterval(timerInterval);
    const inputSeconds = parseInt(document.getElementById("timer-input").value);
    timerSeconds = (!isNaN(inputSeconds) && inputSeconds > 0) ? inputSeconds : 90;
    updateTimerDisplay();
  };

  updateTimerDisplay();
}
