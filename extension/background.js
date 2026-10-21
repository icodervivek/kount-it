const STORAGE_KEY = "kountit:extension:v1";
const NOTIFIED_KEY = "kountit:extension:notified:v1";
const ALARM_NAME = "kountit-countdown";

async function scheduleSavedCountdown() {
  const result = await chrome.storage.local.get([STORAGE_KEY, NOTIFIED_KEY]);
  const saved = result[STORAGE_KEY];

  if (!saved || typeof saved.target !== "number" || !Number.isFinite(saved.target)) return;

  await chrome.alarms.clear(ALARM_NAME);
  if (saved.target > Date.now() || result[NOTIFIED_KEY] !== saved.target) {
    await chrome.alarms.create(ALARM_NAME, { when: Math.max(saved.target, Date.now()) });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void scheduleSavedCountdown().catch((cause) => {
    console.error("Unable to restore the countdown reminder.", cause);
  });
});

chrome.runtime.onStartup.addListener(() => {
  void scheduleSavedCountdown().catch((cause) => {
    console.error("Unable to restore the countdown reminder.", cause);
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  void chrome.storage.local.get([STORAGE_KEY, NOTIFIED_KEY]).then(async (result) => {
    const saved = result[STORAGE_KEY];
    if (
      !saved ||
      typeof saved.target !== "number" ||
      saved.target > Date.now() ||
      result[NOTIFIED_KEY] === saved.target
    ) {
      return;
    }

    await chrome.notifications.create(`kountit-${saved.target}`, {
      type: "basic",
      iconUrl: "icons/icon-128.png",
      title: "Kount It",
      message: saved.label ? `${saved.label} is here!` : "Your countdown is complete!",
    });
    await chrome.storage.local.set({ [NOTIFIED_KEY]: saved.target });
  }).catch((cause) => {
    console.error("Unable to show the countdown completion notification.", cause);
  });
});
