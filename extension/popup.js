const STORAGE_KEY = "kountit:extension:v1";

const formView = document.querySelector("#form-view");
const timerView = document.querySelector("#timer-view");
const form = document.querySelector("#countdown-form");
const labelInput = document.querySelector("#label");
const dateInput = document.querySelector("#date");
const formTitle = document.querySelector("#form-title");
const submitButton = document.querySelector("#submit-button");
const cancelButton = document.querySelector("#cancel-button");
const errorMessage = document.querySelector("#error");
const storageError = document.querySelector("#storage-error");
const timerTitle = document.querySelector("#timer-title");
const timerKicker = document.querySelector("#timer-kicker");
const targetDate = document.querySelector("#target-date");
let saved = null;
let editing = false;

function toLocalDateTime(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function setError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = !message;
}

function showForm(isEditing) {
  editing = isEditing;
  formView.hidden = false;
  timerView.hidden = true;
  formTitle.textContent = isEditing
    ? "Edit your countdown"
    : "What are you counting down to?";
  submitButton.textContent = isEditing ? "Save changes" : "Start the countdown";
  cancelButton.hidden = !isEditing;
  labelInput.value = isEditing ? saved.label : "";
  dateInput.value = isEditing ? toLocalDateTime(new Date(saved.target)) : "";
  dateInput.min = toLocalDateTime(new Date());
  setError("");
}

function formatRemaining(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

function updateTimer() {
  if (!saved || editing) return;

  const remaining = saved.target - Date.now();
  const done = remaining <= 0;
  const parts = formatRemaining(remaining);
  timerKicker.textContent = done ? "The wait is over" : "Your next big moment";
  timerTitle.textContent = done ? "It’s time!" : saved.label || "Something good is coming";
  targetDate.textContent = new Date(saved.target).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });

  for (const [unit, value] of Object.entries(parts)) {
    document.querySelector(`#${unit}`).textContent =
      unit === "days" ? String(value) : String(value).padStart(2, "0");
  }
}

function showTimer() {
  formView.hidden = true;
  timerView.hidden = false;
  updateTimer();
}

async function loadCountdown() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const candidate = result[STORAGE_KEY];
    saved =
      candidate &&
      typeof candidate.target === "number" &&
      Number.isFinite(candidate.target) &&
      typeof candidate.label === "string"
        ? candidate
        : null;

    if (saved) showTimer();
    else showForm(false);

    storageError.hidden = true;
  } catch (cause) {
    storageError.textContent = "Could not load your countdown. Try reopening the extension.";
    storageError.hidden = false;
    console.error("Unable to load the saved countdown.", cause);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = new Date(dateInput.value).getTime();

  if (!dateInput.value || !Number.isFinite(target)) {
    setError("Choose a date and time to start your countdown.");
    dateInput.focus();
    return;
  }
  if (target <= Date.now()) {
    setError("That date and time has already passed. Choose a future moment.");
    dateInput.focus();
    return;
  }

  const next = {
    target,
    label: labelInput.value.trim(),
    startedAt: editing && saved ? saved.startedAt : Date.now(),
  };

  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    await chrome.alarms.clear("kountit-countdown");
    await chrome.alarms.create("kountit-countdown", { when: target });
    saved = next;
    editing = false;
    showTimer();
    storageError.hidden = true;
  } catch (cause) {
    storageError.textContent = "Could not save your countdown. Please try again.";
    storageError.hidden = false;
    console.error("Unable to save the countdown or schedule its reminder.", cause);
  }
});

for (const button of document.querySelectorAll("[data-days]")) {
  button.addEventListener("click", () => {
    const date = new Date();
    date.setDate(date.getDate() + Number(button.dataset.days));
    date.setHours(9, 0, 0, 0);
    dateInput.value = toLocalDateTime(date);
    setError("");
  });
}

document.querySelector("#edit-button").addEventListener("click", () => showForm(true));

cancelButton.addEventListener("click", () => {
  editing = false;
  showTimer();
});

document.querySelector("#reset-button").addEventListener("click", async () => {
  try {
    await chrome.storage.local.remove(STORAGE_KEY);
    await chrome.alarms.clear("kountit-countdown");
    saved = null;
    showForm(false);
    storageError.hidden = true;
  } catch (cause) {
    storageError.textContent = "Could not reset your countdown. Please try again.";
    storageError.hidden = false;
    console.error("Unable to reset the countdown.", cause);
  }
});

void loadCountdown();
window.setInterval(updateTimer, 1000);
