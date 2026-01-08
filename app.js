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

// ---------------- BACK BUTTON LOGIC ----------------
document.addEventListener("click", e => {
  if (!e.target.classList.contains("back-btn")) return;

  switch (currentSection) {
    case "view-workouts":
      showPage("home-page"); currentSection="home"; break;
    case "view-exercises":
      loadWorkouts(); currentSection="view-workouts"; break;
    case "start-workout":
      showPage("home-page"); currentSection="home"; break;
    case "workout-exercises":
      loadStartWorkout(); currentSection="start-workout"; break;
    case "exercise-detail":
      loadWorkoutExercises(currentWorkout); currentSection="workout-exercises"; break;
  }
});

// ---------------- HOME ----------------
document.getElementById("view-workouts-btn")?.addEventListener("click", () => {
  currentSection = "view-workouts"; loadWorkouts();
});

document.getElementById("start-workout-btn")?.addEventListener("click", () => {
  currentSection = "start-workout"; loadStartWorkout();
});

document.getElementById("quote-home") && (document.getElementById("quote-home").textContent = randomQuote());

// ---------------- VIEW WORKOUTS ----------------
async function loadWorkouts() {
  showPage("view-workouts-page");
  const quote = document.getElementById("quote-view"); if (quote) quote.textContent = randomQuote();

  const { data } = await supabase.from("workouts").select("*").order("created_at");
  const list = document.getElementById("workouts-list"); if (!list) return;
  list.innerHTML = "";

  data.forEach(workout => {
    const div = document.createElement("div");
    div.className = "p-2 bg-gray-800 rounded flex justify-between items-center";
    div.innerHTML = `
      <span class="cursor-pointer">${workout.name}</span>
      <div class="flex gap-1">
        <button class="edit-btn bg-yellow-500 px-2 py-1 rounded text-black">Edit</button>
        <button class="delete-btn bg-red-600 px-2 py-1 rounded text-black">Del</button>
      </div>
    `;
    div.querySelector("span")?.addEventListener("click", () => loadExercises(workout));
    div.querySelector(".edit-btn")?.addEventListener("click", async () => {
      const newName = prompt("Workout name", workout.name); if (!newName) return;
      await supabase.from("workouts").update({ name: newName }).eq("id", workout.id);
      loadWorkouts();
    });
    div.querySelector(".delete-btn")?.addEventListener("click", async () => {
      if (confirm("Delete this workout?")) {
        await supabase.from("workouts").delete().eq("id", workout.id);
        loadWorkouts();
      }
    });
    list.appendChild(div);
  });
}

document.getElementById("create-workout-btn")?.addEventListener("click", async () => {
  const name = prompt("Workout name"); if (!name) return;
  await supabase.from("workouts").insert({ name });
  loadWorkouts();
});

// ---------------- VIEW EXERCISES ----------------
async function loadExercises(workout) {
  currentWorkout = workout;
  currentSection = "view-exercises";

  showPage("view-exercises-page");
  document.getElementById("selected-workout-title") && (document.getElementById("selected-workout-title").textContent = workout.name);
  document.getElementById("quote-exercises") && (document.getElementById("quote-exercises").textContent = randomQuote());

  const { data: exercises } = await supabase.from("exercises").select("*").eq("workout_id", workout.id);
  const list = document.getElementById("exercises-list"); if (!list) return;
  list.innerHTML = "";

  for (const ex of exercises) {
    // Calculate PB
    const { data: allNotes } = await supabase.from("notes").select("*").eq("exercise_id", ex.id);
    let pbTotal = 0;
    const sessionMap = {};
    allNotes.forEach(n => {
      const key = n.created_at.split("T")[0];
      if (!sessionMap[key]) sessionMap[key] = [];
      sessionMap[key].push(n);
    });
    Object.values(sessionMap).forEach(session => {
      const total = session.reduce((sum,s)=>sum+s.reps*s.weight,0);
      if (total>pbTotal) pbTotal=total;
    });

    const div = document.createElement("div");
    div.className = "p-2 bg-gray-800 rounded flex justify-between items-center";
    div.innerHTML = `
      <span class="cursor-pointer">${ex.name}</span>
      <span class="text-yellow-400 font-bold">PB: ${pbTotal}</span>
      <div class="flex gap-1">
        <button class="edit-ex-btn bg-yellow-500 px-2 py-1 rounded text-black">Edit</button>
        <button class="delete-ex-btn bg-red-600 px-2 py-1 rounded text-black">Del</button>
      </div>
    `;
    div.querySelector("span")?.addEventListener("click", () => openExerciseDetail(ex));
    div.querySelector(".edit-ex-btn")?.addEventListener("click", async () => {
      const newName = prompt("Exercise name", ex.name); if (!newName) return;
      await supabase.from("exercises").update({ name: newName }).eq("id", ex.id);
      loadExercises(workout);
    });
    div.querySelector(".delete-ex-btn")?.addEventListener("click", async () => {
      if (confirm("Delete this exercise?")) {
        await supabase.from("exercises").delete().eq("id", ex.id);
        loadExercises(workout);
      }
    });
    list.appendChild(div);
  }
}

document.getElementById("add-exercise-btn")?.addEventListener("click", async () => {
  const name = prompt("Exercise name"); if (!name) return;
  await supabase.from("exercises").insert({ name, workout_id: currentWorkout.id });
  loadExercises(currentWorkout);
});

// ---------------- START WORKOUT ----------------
async function loadStartWorkout() {
  showPage("start-workout-page");
  document.getElementById("quote-start") && (document.getElementById("quote-start").textContent = randomQuote());

  const { data } = await supabase.from("workouts").select("*");
  const list = document.getElementById("start-workout-list"); if (!list) return;
  list.innerHTML = "";

  data.forEach(workout => {
    const div = document.createElement("div");
    div.className = "p-2 bg-gray-800 rounded cursor-pointer";
    div.textContent = workout.name;
    div.addEventListener("click", () => loadWorkoutExercises(workout));
    list.appendChild(div);
  });
}

// ---------------- WORKOUT EXERCISES ----------------
async function loadWorkoutExercises(workout) {
  currentWorkout = workout;
  currentSection = "workout-exercises";
  showPage("start-workout-page");

  const { data } = await supabase.from("exercises").select("*").eq("workout_id", workout.id);
  const list = document.getElementById("start-workout-list"); if (!list) return;
  list.innerHTML = "";

  data.forEach(ex => {
    const div = document.createElement("div");
    div.className = "p-2 bg-gray-800 rounded cursor-pointer";
    div.textContent = ex.name;
    div.addEventListener("click", () => openExerciseDetail(ex));
    list.appendChild(div);
  });
}

// ---------------- EXERCISE DETAIL ----------------
async function openExerciseDetail(ex) {
  currentExercise = ex;
  currentSection = "exercise-detail";

  showPage("exercise-detail-page");
  document.getElementById("exercise-title") && (document.getElementById("exercise-title").textContent = ex.name);
  document.getElementById("quote-exercise") && (document.getElementById("quote-exercise").textContent = randomQuote());

  const setsContainer = document.getElementById("sets-container"); if (!setsContainer) return;
  setsContainer.innerHTML = "";

  // Load last 4 sets
  const { data: lastSets } = await supabase.from("notes").select("*").eq("exercise_id", ex.id).order("created_at", { ascending: false }).limit(4) || [];

  for (let i = 0; i < 4; i++) {
    const lastSet = lastSets.find(s => s.sets === i);
    const repsValue = lastSet?.reps || '';
    const weightValue = lastSet?.weight || '';

    const div = document.createElement("div");
    div.innerHTML = `
      <label class="mr-2 font-bold">${i===0?"Warm-up":"Set "+i}:</label>
      <input type="number" placeholder="Reps" class="w-16 p-1 text-black" value="${repsValue}" style="color:${repsValue?'grey':'black'}">
      <input type="number" placeholder="Kg" class="w-16 p-1 text-black" value="${weightValue}" style="color:${weightValue?'grey':'black'}">
    `;
    setsContainer.appendChild(div);
  }

  // Load last note
  const { data: lastNotes } = await supabase.from("notes").select("*").eq("exercise_id", ex.id).order("created_at", { ascending: false }).limit(1) || [];
  const lastNote = lastNotes?.[0];
  document.getElementById("exercise-note") && (document.getElementById("exercise-note").value = lastNote?.note || "");

  // Timer
  let timerInterval = null;
  let timerSeconds = 90;
  const timerInput = document.getElementById("timer-input");
  const timerDisplay = document.getElementById("timer-display");

  function updateTimerDisplay() {
    const m = String(Math.floor(timerSeconds/60)).padStart(2,'0');
    const s = String(timerSeconds%60).padStart(2,'0');
    if(timerDisplay) timerDisplay.textContent = `${m}:${s}`;
  }

  document.getElementById("start-timer-btn")?.addEventListener("click", () => {
    const input = parseInt(timerInput.value);
    if(!isNaN(input) && input>0) timerSeconds = input;
    updateTimerDisplay();
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(()=>{
      timerSeconds--;
      updateTimerDisplay();
      if(timerSeconds<=0){clearInterval(timerInterval); timerInterval=null; alert("Time's up! ⏱️");}
    },1000);
  });

  document.getElementById("reset-timer-btn")?.addEventListener("click", () => {
    clearInterval(timerInterval); timerInterval=null;
    const input = parseInt(timerInput.value);
    timerSeconds = (!isNaN(input) && input>0)?input:90;
    updateTimerDisplay();
  });

  updateTimerDisplay();
}
