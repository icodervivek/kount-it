"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bricolage_Grotesque } from "next/font/google";

const font = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "800"] });

const STORAGE_KEY = "kountit:v1";

type Saved = { target: number; label: string };

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
      className="relative flex flex-col items-center rounded-[28px] border border-white/10 bg-white/[0.04] px-4 py-6 backdrop-blur-xl sm:px-6 sm:py-8"
      style={{ boxShadow: `0 20px 60px -25px ${accent}` }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full p-2 opacity-70" aria-hidden>
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="24"
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
        />
      </svg>

      <div className="relative h-20 w-20 sm:h-28 sm:w-28">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
          <motion.circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={C}
            animate={{ strokeDashoffset: C * (1 - progress) }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
            style={{ filter: `drop-shadow(0 0 6px ${accent})` }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-3xl font-extrabold text-white sm:text-5xl"
          aria-hidden
        >
          <Digit value={text[0]} />
          <Digit value={text[1]} />
        </div>
      </div>

      <span className="mt-4 text-sm font-semibold tracking-wide text-white/60 sm:text-base">{unit}</span>
      <span className="sr-only">{`${value} ${unit}`}</span>
    </motion.div>
  );
}

function Background() {
  const orbs = [
    { c: "#7c5cff", s: 520, x: ["-10%", "10%", "-10%"], y: ["-15%", "5%", "-15%"], pos: "left-[-10%] top-[-10%]", d: 22 },
    { c: "#ff6b8b", s: 460, x: ["0%", "-12%", "0%"], y: ["0%", "12%", "0%"], pos: "right-[-10%] top-[10%]", d: 26 },
    { c: "#2dd4bf", s: 420, x: ["0%", "14%", "0%"], y: ["0%", "-10%", "0%"], pos: "bottom-[-15%] left-[25%]", d: 30 },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a0d1c]">
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${o.pos}`}
          style={{ width: o.s, height: o.s, background: o.c, opacity: 0.28, filter: "blur(110px)" }}
          animate={{ x: o.x, y: o.y }}
          transition={{ duration: o.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
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
  const [startedAt, setStartedAt] = useState(0);

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
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [saved]);

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
    setSaved(next);
  }

  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setSaved(null);
    setDateInput("");
    setLabelInput("");
  }

  const remaining = saved ? saved.target - now : 0;
  const done = !!saved && remaining <= 0;
  const p = getParts(remaining);
  const span = saved ? Math.max(1, saved.target - startedAt) : 1;
  const fill = (ms: number) => ms;

  return (
    <main className={`${font.className} relative flex min-h-screen flex-col items-center justify-center px-5 py-16 text-white`}>
      <Background />

      {!mounted ? null : (
        <AnimatePresence mode="wait">
          {!saved ? (
            <motion.section
              key="form"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[0.05] p-8 shadow-2xl backdrop-blur-2xl"
            >
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
                What are you counting down to?
              </h1>
              <p className="mt-3 text-white/60">Pick a date and time. We’ll remember it on this device.</p>

              <label className="mt-8 block text-sm font-semibold text-white/70" htmlFor="label">
                Name (optional)
              </label>
              <input
                id="label"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="Launch day, birthday, exam…"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/40"
              />

              <label className="mt-5 block text-sm font-semibold text-white/70" htmlFor="date">
                Date and time
              </label>
              <input
                id="date"
                type="datetime-local"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition [color-scheme:dark] focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/40"
              />

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 text-sm text-[#ff8fa6]"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={start}
                className="mt-7 w-full rounded-2xl bg-gradient-to-r from-[#7c5cff] via-[#c15cff] to-[#ff6b8b] py-3.5 text-lg font-bold shadow-[0_10px_40px_-10px_#7c5cff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Start countdown
              </motion.button>
            </motion.section>
          ) : (
            <motion.section
              key="timer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full max-w-3xl flex-col items-center text-center"
            >
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-extrabold tracking-tight sm:text-5xl"
              >
                {done ? "It’s time!" : saved.label || "Counting down to"}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-3 text-white/60"
              >
                {new Date(saved.target).toLocaleString(undefined, {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </motion.p>

              <div className="mt-12 grid w-full grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
                {[
                  { v: p.days, u: "days", a: "#7c5cff", f: Math.min(1, (p.days * 86400000) / span) },
                  { v: p.hours, u: "hours", a: "#c15cff", f: p.hours / 24 },
                  { v: p.minutes, u: "minutes", a: "#ff6b8b", f: p.minutes / 60 },
                  { v: p.seconds, u: "seconds", a: "#2dd4bf", f: p.seconds / 60 },
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
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={reset}
                className="mt-12 rounded-full border border-white/15 bg-white/5 px-8 py-3 font-semibold text-white/90 backdrop-blur transition hover:border-[#ff6b8b]/60 hover:bg-[#ff6b8b]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Reset countdown
              </motion.button>
            </motion.section>
          )}
        </AnimatePresence>
      )}
    </main>
  );
}