"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "framer-motion";
import { Bricolage_Grotesque } from "next/font/google";

const font = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "800"] });

const STORAGE_KEY = "kountit:v1";

type Saved = { target: number; label: string };

const confettiColors = ["#a78bfa", "#f0abfc", "#fda4af", "#fdba74", "#6ee7c2", "#93c5fd"];
const confettiPieces = Array.from({ length: 42 }, (_, index) => {
  const angle = (index * 137.5 * Math.PI) / 180;
  const distance = 100 + (index % 7) * 42;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    rotation: 240 + ((index * 83) % 600),
    delay: (index % 8) * 0.035,
    duration: 1.8 + (index % 5) * 0.16,
    color: confettiColors[index % confettiColors.length],
    width: index % 3 === 0 ? 6 : 9,
    height: index % 3 === 0 ? 10 : 6,
    round: index % 4 === 0,
  };
});

function ConfettiBurst() {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden" aria-hidden="true">
      {confettiPieces.map((piece, index) => (
        <motion.span
          key={index}
          className="absolute block"
          style={{
            left: "50%",
            top: "48%",
            width: piece.width,
            height: piece.height,
            borderRadius: piece.round ? "999px" : "2px",
            backgroundColor: piece.color,
            boxShadow: `0 0 12px ${piece.color}80`,
          }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0.4 }}
          animate={{
            x: [0, piece.x * 0.65, piece.x],
            y: [0, piece.y * 0.55, piece.y + 260],
            rotate: piece.rotation,
            opacity: [0, 1, 0],
            scale: [0.4, 1, 0.85],
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: [0.16, 0.72, 0.24, 1],
            times: [0, 0.22, 1],
          }}
        />
      ))}
    </div>
  );
}

function playTick(context: AudioContext) {
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  const start = context.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(1100, start);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(0.025, start + 0.006);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.045);
  oscillator.connect(volume);
  volume.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.05);
}

function playCompletionChime(context: AudioContext) {
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    const start = context.currentTime + index * 0.16;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(0.09, start + 0.025);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.65);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.7);
  });
}

function getParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

function toLocalDateTime(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

/* One digit that slides out and the next slides in */
function Digit({ value }: { value: string }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden text-center leading-none">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "-110%", opacity: 0, filter: "blur(6px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "110%", opacity: 0, filter: "blur(6px)" }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="absolute inset-0 block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Tile({
  value,
  unit,
  accent,
  progress,
}: {
  value: number;
  unit: string;
  accent: string;
  progress: number; // 0..1 ring fill
}) {
  const text = pad(value);
  const R = 46;
  const C = 2 * Math.PI * R;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative flex flex-col items-center overflow-hidden rounded-[28px] border border-white/[0.09] bg-slate-950/35 px-4 py-6 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-colors duration-300 hover:border-white/20 sm:px-6 sm:py-8"
      style={{ boxShadow: `0 24px 70px -42px ${accent}` }}
    >
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div
        className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full opacity-[0.08] blur-3xl transition-opacity duration-300 group-hover:opacity-20"
        style={{ background: accent }}
      />

      <div className="relative h-24 w-24 sm:h-28 sm:w-28">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="2.5" />
          <motion.circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={C}
            animate={{ strokeDashoffset: C * (1 - progress) }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
            style={{ filter: `drop-shadow(0 0 6px ${accent})` }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-3xl font-extrabold tracking-[-0.08em] text-white sm:text-5xl"
          aria-hidden
        >
          <Digit value={text[0]} />
          <Digit value={text[1]} />
        </div>
      </div>

      <span className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:text-xs">{unit}</span>
      <span className="sr-only">{`${value} ${unit}`}</span>
    </motion.div>
  );
}

function SoundToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={enabled ? "Turn countdown sounds off" : "Turn countdown sounds on"}
      aria-pressed={enabled}
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-200 ${
        enabled
          ? "border-violet-300/30 bg-violet-400/10 text-violet-100 hover:bg-violet-400/15"
          : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-white/20 hover:text-slate-200"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        {enabled ? (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7m2.5-9.5a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </>
        ) : (
          <path d="m16 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        )}
      </svg>
      Sound {enabled ? "on" : "off"}
    </button>
  );
}

function Background() {
  const orbs = [
    { c: "#7565f6", s: 520, x: ["-8%", "9%", "-8%"], y: ["-12%", "7%", "-12%"], pos: "left-[-14%] top-[-14%]", d: 26 },
    { c: "#ec8e77", s: 460, x: ["0%", "-10%", "0%"], y: ["0%", "10%", "0%"], pos: "right-[-14%] top-[8%]", d: 30 },
    { c: "#52cbb3", s: 420, x: ["0%", "12%", "0%"], y: ["0%", "-8%", "0%"], pos: "bottom-[-18%] left-[25%]", d: 34 },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#090c17]">
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${o.pos}`}
          style={{ width: o.s, height: o.s, background: o.c, opacity: 0.2, filter: "blur(120px)" }}
          animate={{ x: o.x, y: o.y }}
          transition={{ duration: o.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse at center, black 15%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 15%, transparent 75%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_10%,rgba(5,7,15,0.62)_100%)]" />
    </div>
  );
}

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [now, setNow] = useState(0);
  const [dateInput, setDateInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [error, setError] = useState("");
  const [soundError, setSoundError] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [startedAt, setStartedAt] = useState(0);
  const [celebrationTarget, setCelebrationTarget] = useState<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const chimedTarget = useRef<number | null>(null);
  const completedTarget = useRef<number | null>(null);
  const remaining = saved ? saved.target - now : 0;
  const done = !!saved && remaining <= 0;
  const p = getParts(remaining);
  const span = saved ? Math.max(1, saved.target - startedAt) : 1;
  const fill = (ms: number) => ms;

  // Load from localStorage once on the client
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.target === "number") {
          setSaved(parsed);
          setStartedAt(parsed.startedAt ?? Date.now());
        }
      }
    } catch {}
    setNow(Date.now());
    setMounted(true);
  }, []);

  // Tick every second while a countdown exists
  useEffect(() => {
    if (!saved) return;
    setNow(Date.now());
    if (Date.now() >= saved.target) {
      completedTarget.current = saved.target;
    }
    const id = setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      if (timestamp >= saved.target && completedTarget.current !== saved.target) {
        completedTarget.current = saved.target;
        setCelebrationTarget(saved.target);
      }
      if (soundEnabled && timestamp < saved.target && audioContext.current) {
        playTick(audioContext.current);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [saved, soundEnabled]);

  useEffect(() => {
    if (!saved) {
      chimedTarget.current = null;
      return;
    }
    if (!done || chimedTarget.current === saved.target) return;

    if (soundEnabled && audioContext.current) {
      chimedTarget.current = saved.target;
      playCompletionChime(audioContext.current);
    }
  }, [done, saved, soundEnabled]);

  const activateAudio = useCallback(async () => {
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) {
      setSoundError("Sound is not supported by this browser.");
      return false;
    }

    try {
      const context = audioContext.current ?? new AudioContextConstructor();
      audioContext.current = context;
      if (context.state !== "running") await context.resume();
      setSoundError("");
      if (
        done &&
        saved &&
        chimedTarget.current !== saved.target
      ) {
        chimedTarget.current = saved.target;
        playCompletionChime(context);
      }
      return true;
    } catch (cause) {
      setSoundError("Could not enable sound. Check your browser’s audio settings and try again.");
      console.error("Unable to enable countdown sounds.", cause);
      return false;
    }
  }, [done, saved]);

  useEffect(() => {
    if (!soundEnabled) return;

    const handleFirstInteraction = () => {
      void activateAudio();
    };

    window.addEventListener("pointerdown", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);
    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [activateAudio, soundEnabled]);

  async function toggleSound() {
    if (soundEnabled) {
      setSoundEnabled(false);
      setSoundError("");
      return;
    }

    if (await activateAudio()) setSoundEnabled(true);
  }

  function start() {
    const target = new Date(dateInput).getTime();
    if (!dateInput || Number.isNaN(target)) return setError("Pick a date and time to count down to.");
    if (target <= Date.now()) return setError("That moment has already passed. Choose a future date.");
    const next = { target, label: labelInput.trim(), startedAt: Date.now() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
    setError("");
    setStartedAt(next.startedAt);
    setCelebrationTarget(null);
    completedTarget.current = null;
    setSaved(next);
  }

  function choosePreset(daysFromNow: number) {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    target.setHours(9, 0, 0, 0);
    setDateInput(toLocalDateTime(target));
    setError("");
  }

  function submitCountdown(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    start();
  }

  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setSaved(null);
    setDateInput("");
    setLabelInput("");
    setCelebrationTarget(null);
  }

  return (
    <main className={`${font.className} relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-16 text-white sm:px-8`}>
      <MotionConfig reducedMotion="user">
        <Background />
        <AnimatePresence>
          {celebrationTarget !== null && celebrationTarget === saved?.target && (
            <ConfettiBurst key={celebrationTarget} />
          )}
        </AnimatePresence>
        {!mounted ? null : (
        <AnimatePresence mode="wait">
          {!saved ? (
            <motion.section
              key="form"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className="relative w-full max-w-lg overflow-hidden rounded-[32px] border border-white/[0.12] bg-[#111522]/75 p-7 shadow-[0_32px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:p-10"
            >
              <div className="mb-8 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-200 ring-1 ring-violet-300/20">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M12 7v5l3 2m5-2a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/90">Kount it</p>
                    <p className="mt-0.5 text-xs text-slate-400">A little closer every second</p>
                  </div>
                </div>
                <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
              </div>
              {soundError && <p className="-mt-5 mb-5 text-right text-xs text-rose-300" role="alert">{soundError}</p>}
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-violet-200/80">Make a moment of it</p>
              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-5xl">
                What are you <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-orange-200 bg-clip-text text-transparent">counting down to?</span>
              </h1>
              <p className="mt-4 max-w-sm text-[15px] leading-6 text-slate-400">Give something good a date. We’ll keep the seconds moving on this device.</p>

              <form onSubmit={submitCountdown}>
              <label className="mt-8 block text-xs font-bold uppercase tracking-[0.13em] text-slate-300" htmlFor="label">
                Reason (optional)
              </label>
              <input
                id="label"
                value={labelInput}
                onChange={(e) => {
                  setLabelInput(e.target.value);
                  setError("");
                }}
                placeholder="Launch day, birthday, exam…"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-[15px] text-white outline-none transition duration-200 placeholder:text-slate-500 hover:border-white/20 focus:border-violet-300/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-violet-400/10"
              />

              <div className="mt-5 flex items-center justify-between gap-3">
                <label className="block text-xs font-bold uppercase tracking-[0.13em] text-slate-300" htmlFor="date">
                  Date and time
                </label>
                <span className="text-[11px] text-slate-500">Your local time</span>
              </div>
              <input
                id="date"
                type="datetime-local"
                required
                min={toLocalDateTime(new Date())}
                value={dateInput}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "date-error" : "date-help"}
                onChange={(e) => {
                  setDateInput(e.target.value);
                  setError("");
                }}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-[15px] text-white outline-none transition duration-200 [color-scheme:dark] hover:border-white/20 focus:border-violet-300/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-violet-400/10"
              />
              <p id="date-help" className="mt-2 text-xs text-slate-500">
                Pick a future date, or choose a quick option:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { label: "Tomorrow", days: 1 },
                  { label: "In a week", days: 7 },
                  { label: "In a month", days: 30 },
                ].map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => choosePreset(preset.days)}
                    className="rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:border-violet-300/30 hover:bg-violet-400/10 hover:text-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    id="date-error"
                    className="mt-3 text-sm text-rose-300"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                type="submit"
                className="mt-7 w-full rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-400 py-4 text-[15px] font-extrabold tracking-wide text-white shadow-[0_12px_42px_-16px_rgba(192,95,255,0.75)] transition-shadow hover:shadow-[0_16px_48px_-14px_rgba(192,95,255,0.8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-200"
              >
                Start the countdown <span aria-hidden="true" className="ml-1">↗</span>
              </motion.button>
              </form>
            </motion.section>
          ) : (
            <motion.section
              key="timer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full max-w-4xl flex-col items-center text-center"
            >
              <div className="mb-7 flex w-full items-center justify-end gap-3">
                {soundError && <p className="text-right text-xs text-rose-300" role="alert">{soundError}</p>}
                <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
              </div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 text-xs font-bold uppercase tracking-[0.24em] text-violet-200/80"
              >
                {done ? "The wait is over" : "Your next big moment"}
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="max-w-3xl text-4xl font-extrabold tracking-[-0.045em] sm:text-6xl"
              >
                {done ? "It’s time!" : saved.label || "Something good is coming"}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-4 text-sm text-slate-400 sm:text-base"
              >
                {new Date(saved.target).toLocaleString(undefined, {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </motion.p>

              <div className="mt-10 grid w-full grid-cols-2 gap-3 sm:mt-14 sm:grid-cols-4 sm:gap-5">
                {[
                  { v: p.days, u: "days", a: "#9387ff", f: Math.min(1, (p.days * 86400000) / span) },
                  { v: p.hours, u: "hours", a: "#d58bf2", f: p.hours / 24 },
                  { v: p.minutes, u: "minutes", a: "#f2a088", f: p.minutes / 60 },
                  { v: p.seconds, u: "seconds", a: "#72ddc4", f: p.seconds / 60 },
                ].map((t, i) => (
                  <motion.div
                    key={t.u}
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.15 + i * 0.09, type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <Tile value={t.v} unit={t.u} accent={t.a} progress={fill(t.f)} />
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={reset}
                className="mt-10 rounded-full border border-white/[0.12] bg-white/[0.04] px-7 py-3 text-sm font-semibold text-slate-300 backdrop-blur transition duration-200 hover:border-white/25 hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-200 sm:mt-12"
              >
                Reset countdown
              </motion.button>
            </motion.section>
          )}
        </AnimatePresence>
        )}
      </MotionConfig>
    </main>
  );
}