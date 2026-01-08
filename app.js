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
  document.getElementById(pageId).classList.remove("hidden");
}

function randomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

// ---------------- BACK BUTTON LOGIC ----------------
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

  const { data } = await supabase.from("workouts").select("*").order("created_at");
  const list = document.getElementById("workouts-list");
  list.innerHTML = "";

  data.forEach(workout => {
    const div = document.createElement("div");
    div.className = "p-2 bg-gray-800 rounded flex justify-between items-center";
    div.innerHTML = `
      <span>${workout.name}</span>
      <div class="flex gap-2">
        <button class="edit-btn bg-yellow-600 px-2 py-1 rounded">Edit</button>
        <button class="delete-btn bg-red-600 px-2 py-1 rounded">Delete</button>
      </div>
    `;
    div.querySelector("span").onclick = () => loadExercises(workout);

    div.querySelector(".edit-btn").onclick = async () => {
      const newName = prompt("Edit workout name", workout.name);
      if (!newName) return;
      await supabase.from("workouts").update({ name: newName }).eq("id", workout.id);
      loadWorkouts();
    };

    div.querySelector(".delete-btn").onclick = async () => {
      if (!confirm("Delete this workout?")) return;
      await supabase.from("workouts").delete().eq("id", workout.id);
      loadWorkouts();
    };

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
    // Calculate PB
    const { data: allNotes } = await supabase
      .from("notes")
      .select("*")
      .eq("exercise_id", ex.id);

    const pb = allNotes.reduce((max, n) => {
      const total = n.reps * n.weight;
      return total > max ? total : max;
    }, 0);

    const div = document.createElement("div");
    div.className = "p-2 bg-gray-800 rounded flex justify-between items-center";
    div.innerHTML = `
      <span>${ex.name}</span>
      <div class="flex gap-2 items-center">
        <span class="text-yellow-400 font-bold">PB: ${pb}</span>
        <button class="edit-ex-btn bg-yellow-600 px-2 py-1 rounded">Edit</button>
        <button class="delete-ex-btn bg-red-600 px-2 py-1 rounded">Delete</button>
      </div>
    `;
    div.querySelector("span").onclick = () => openExerciseDetail(ex);

    div.querySelector(".edit-ex-btn").onclick = async () => {
      const newName = prompt("Edit exercise name", ex.name);
      if (!newName) return;
      await supabase.from("exercises").update({ name: newName }).eq("id", ex.id);
      loadExercises(currentWorkout);
    };

    div.querySelector(".delete-ex-btn").onclick = async () => {
      if (!confirm("Delete this exercise?")) return;
      await supabase.from("exercises").delete().eq("id", ex.id);
      loadExercises(currentWorkout);
    };

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
  showPage("start-workout-page");
  document.getElementById("quote-start").textContent = randomQuote();

  const { data } = await supabase.from("workouts").select("*");
  const list = document.getElementById("start-workout-list");
  list.innerHTML = "";

  data.forEach(workout => {
    const div = document.createElement("div");
    div.className = "p-2 bg-gray-800 rounded cursor-pointer";
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

  const { data } = await supabase
    .from("exercises")
    .select("*")
    .eq("workout_id", workout.id);

  const list = document.getElementById("start-workout-list");
  list.innerHTML = "";

  data.forEach(ex => {
    const div = document.createElement("div");
    div.className = "p-2 bg-gray-800 rounded cursor-pointer";
    div.textContent = ex.name;
    div.onclick = () => openExerciseDetail(ex);
    list.appendChild(div);
  });
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
    .from("notes")
    .select("*")
    .eq("exercise_id", ex.id)
    .order("created_at", { ascending: false })
    .limit(4) || [];

  for (let i = 0; i < 4; i++) {
    const lastSet = lastSets.find(s => s.sets === i);
    const repsValue = lastSet?.reps || '';
    const weightValue = lastSet?.weight || '';

    const div = document.createElement("div");
    div.innerHTML = `
      <label class="mr-2 font-bold">${i===0?'Warm-up':'Set '+i}:</label>
      <input type="number" placeholder="Reps" class="w-16 p-1 text-black" value="${repsValue}" style="color:${repsValue?'grey':'black'}">
      <input type="number" placeholder="Kg" class="w-16 p-1 text-black" value="${weightValue}" style="color:${weightValue?'grey':'black'}">
    `;
    setsContainer.appendChild(div);
  }

  const { data: lastNotes } = await supabase
    .from("notes")
    .select("*")
    .eq("exercise_id", ex.id)
    .order("created_at", { ascending: false })
    .limit(1) || [];

  document.getElementById("exercise-note").value = lastNotes?.[0]?.note || "";

  // -------- Timer Logic --------
  let timerInterval = null;
  let timerSeconds = 90;

  function updateTimerDisplay() {
    const minutes = String(Math.floor(timerSeconds / 60)).padStart(2,"0");
    const seconds = String(timerSeconds % 60).padStart(2,"0");
    document.getElementById("timer-display").textContent = `${minutes}:${seconds}`;
  }

  document.getElementById("start-timer-btn").onclick = () => {
    const inputSeconds = parseInt(document.getElementById("timer-input").value);
    if(!isNaN(inputSeconds) && inputSeconds>0) timerSeconds = inputSeconds;

    if(timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(()=>{
      timerSeconds--;
      updateTimerDisplay();
      if(timerSeconds<=0){
        clearInterval(timerInterval);
        timerInterval = null;
        alert("Time's up! ⏱️");
      }
    },1000);

    updateTimerDisplay();
  };

  document.getElementById("reset-timer-btn").onclick = () => {
    clearInterval(timerInterval);
    timerInterval=null;
    const inputSeconds = parseInt(document.getElementById("timer-input").value);
    timerSeconds = (!isNaN(inputSeconds)&&inputSeconds>0)? inputSeconds:90;
    updateTimerDisplay();
  };

  updateTimerDisplay();
}

// ---------------- FINISH WORKOUT ----------------
document.getElementById("finish-workout-btn").onclick = async () => {
  if(!currentWorkout) return;
  const { data: exercises } = await supabase.from("exercises").select("*").eq("workout_id", currentWorkout.id);
  let pbCount = 0;

  for(const ex of exercises){
    const { data: notes } = await supabase.from("notes").select("*").eq("exercise_id",ex.id).order("created_at",{ascending:false});
    const currentSession = notes.slice(0,4);
    const currentTotal = currentSession.reduce((sum,set)=>sum+(set.reps*set.weight),0);

    const prevTotals=[];
    const sessionMap={};
    notes.forEach(n=>{
      const key=n.created_at.split("T")[0];
      if(!sessionMap[key]) sessionMap[key]=[];
      sessionMap[key].push(n);
    });
    Object.values(sessionMap).forEach(s=>{
      if(s===currentSession) return;
      const total=s.reduce((sum,set)=>sum+(set.reps*set.weight),0);
      prevTotals.push(total);
    });
    const maxPrev=prevTotals.length?Math.max(...prevTotals):0;
    if(currentTotal>maxPrev) pbCount+=1;
  }

  alert(`Workout finished! You got ${pbCount} PB${pbCount!==1?'s':''} this session 💪`);
  currentSection="home";
  showPage("home-page");
};
