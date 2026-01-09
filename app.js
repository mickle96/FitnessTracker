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
    div.className = "p-3 border border-gray-600 rounded flex justify-between items-center hover:bg-gray-800 cursor-pointer";

    // Workout name
    const nameSpan = document.createElement("span");
    nameSpan.textContent = workout.name;
    nameSpan.className = "flex-1";
    nameSpan.onclick = () => loadExercises(workout);
    div.appendChild(nameSpan);

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.className = "btn-border border-yellow-500 text-yellow-400 ml-2 text-sm";
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
    delBtn.className = "btn-border border-red-500 text-red-400 ml-2 text-sm";
    delBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Delete this workout?")) return;
      await supabase.from("workouts").delete().eq("id", workout.id);
      loadWorkouts();
    };
    div.appendChild(delBtn);

    list.appendChild(div);
  });
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
    // Fetch all previous notes for PB
    const { data: allNotes } = await supabase
      .from("notes")
      .select("*")
      .eq("exercise_id", ex.id)
      .order("created_at", { ascending: true });

    // Calculate PB
    let pb = { weight: 0, reps: 0, total: 0 };
    allNotes.forEach(n => {
      const total = n.reps * n.weight;
      if (n.weight > pb.weight || (n.weight === pb.weight && total > pb.total)) {
        pb = { weight: n.weight, reps: n.reps, total };
      }
    });

    const div = document.createElement("div");
    div.className = "p-3 border border-gray-600 rounded flex justify-between items-center hover:bg-gray-800";

    // Exercise name
    const nameSpan = document.createElement("span");
    nameSpan.textContent = ex.name;
    nameSpan.className = "flex-1";
    div.appendChild(nameSpan);

    // PB
    const pbSpan = document.createElement("span");
    pbSpan.textContent = (pb.weight === 0 && pb.reps === 0) ? "PB: —" : `PB: ${pb.weight}kg × ${pb.reps}`;
    pbSpan.className = "text-yellow-400 font-bold ml-2";
    div.appendChild(pbSpan);

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.className = "btn-border border-yellow-500 text-yellow-400 ml-2 text-sm";
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
    delBtn.className = "btn-border border-red-500 text-red-400 ml-2 text-sm";
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

document.getElementById("add-exercise-btn").onclick = async () => {
  const name = prompt("Exercise name");
  if (!name) return;
  await supabase.from("exercises").insert({ name, workout_id: currentWorkout.id });
  loadExercises(currentWorkout);
};

// ---------------- START WORKOUT ----------------
async function loadStartWorkout() {
  currentSection = "start-workout";
  showPage("start-workout-page");
  document.getElementById("quote-start").textContent = randomQuote();
  document.getElementById("start-workout-title").textContent = "Select Workout";

  const { data: workouts } = await supabase.from("workouts").select("*");
  const list = document.getElementById("start-workout-list");
  list.innerHTML = "";

  workouts.forEach(workout => {
    const div = document.createElement("div");
    div.className = "p-3 border border-gray-600 rounded cursor-pointer hover:bg-gray-800 transition-colors";
    div.textContent = workout.name;
    div.onclick = () => loadWorkoutExercises(workout);
    list.appendChild(div);
  });

  document.getElementById("finish-workout-btn").classList.add("hidden");
}

// ---------------- WORKOUT EXERCISES ----------------
async function loadWorkoutExercises(workout) {
  currentWorkout = workout;
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
    div.className = "p-3 border border-gray-600 rounded cursor-pointer hover:bg-gray-800";
    div.textContent = ex.name;
    div.onclick = () => openExerciseDetail(ex);
    list.appendChild(div);
  });

  if (exercises && exercises.length > 0) {
    document.getElementById("finish-workout-btn").classList.remove("hidden");
  } else {
    document.getElementById("finish-workout-btn").classList.add("hidden");
  }
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

  // Fetch last 4 sets for this exercise
  const { data: lastSets } = await supabase
    .from("notes")
    .select("*")
    .eq("exercise_id", ex.id)
    .order("created_at", { ascending: false })
    .limit(4) || [];

  // Headers
  const headerDiv = document.createElement("div");
  headerDiv.className = "flex items-center gap-2 mb-2 font-semibold text-gray-300";
  headerDiv.innerHTML = `
    <span class="w-20"></span>
    <div class="w-16 text-center">Reps</div>
    <div class="w-16 text-center">Kg</div>
    <div class="flex-1 text-right">Previous</div>
  `;
  setsContainer.appendChild(headerDiv);

  for (let i = 0; i < 4; i++) {
    const lastSet = lastSets.find(s => s.sets === i);
    const prevText = lastSet ? `${lastSet.reps} × ${lastSet.weight}kg` : '-';

    const div = document.createElement("div");
    div.className = "flex items-center gap-2 mb-1";

    div.innerHTML = `
      <span class="font-bold w-20">${i === 0 ? "Warm-up" : "Set " + i}:</span>
      <input type="number" placeholder="Reps" class="w-16 p-1 text-center">
      <input type="number" placeholder="Kg" class="w-16 p-1 text-center">
      <div class="flex-1 text-right text-gray-400 text-sm">${prevText}</div>
    `;
    setsContainer.appendChild(div);
  }

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

  // Save Exercise
  document.getElementById("save-exercise-note").onclick = async () => {
    if (!currentExercise) return;

    const setsContainer = document.getElementById("sets-container");
    const note = document.getElementById("exercise-note").value;
    const setDivs = Array.from(setsContainer.children).slice(1); // skip header

    for (let i = 0; i < setDivs.length; i++) {
      const inputs = setDivs[i].querySelectorAll("input");
      const reps = parseInt(inputs[0].value) || 0;
      const weight = parseFloat(inputs[1].value) || 0;

      if (reps > 0 || weight > 0 || note.trim() !== "") {
        await supabase.from("notes").insert({
          exercise_id: currentExercise.id,
          sets: i,
          reps,
          weight,
          note
        });
      }
    }

    alert("Saved!");
  };
}

// ---------------- FINISH WORKOUT ----------------
document.getElementById("finish-workout-btn").onclick = async () => {
  const { data: allNotes } = await supabase.from("notes").select("*").order("created_at", { ascending: true });

  let pbCount = 0;
  const byExercise = {};
  allNotes.forEach(n => {
    if (!byExercise[n.exercise_id]) byExercise[n.exercise_id] = [];
    byExercise[n.exercise_id].push(n);
  });

  for (const exId in byExercise) {
    const entries = byExercise[exId];

    const today = entries.filter(n =>
      n.created_at.split("T")[0] === new Date().toISOString().split("T")[0]
    );

    if (today.length === 0) continue;

    const beforeToday = entries.filter(n =>
      n.created_at.split("T")[0] !== new Date().toISOString().split("T")[0]
    );

    const todayMax = Math.max(...today.map(n => n.reps * n.weight), 0);
    const beforeMax = Math.max(...beforeToday.map(n => n.reps * n.weight), 0);

    if (todayMax > beforeMax) pbCount++;
  }

  alert(`Workout finished!\nPBs today: ${pbCount}`);
};
