/* eslint-disable react-hooks/purity */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ── Chicken SVG ───────────────────────────────────────────────────────────────
function ChickenGlyph({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <ellipse cx="24" cy="30" rx="13" ry="11" fill="currentColor" opacity="0.9" />
      <circle cx="24" cy="14" r="8" fill="currentColor" />
      <path
        d="M20 7 Q22 3 24 6 Q26 2 28 5 Q30 1 31 6"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="27" cy="13" r="1.5" fill="var(--color-background)" />
      <circle cx="27.5" cy="12.5" r="0.5" fill="var(--color-accent)" />
      <path d="M30 16 L34 15 L30 18 Z" fill="var(--color-accent)" opacity="0.8" />
      <path d="M13 28 Q10 24 13 20 Q16 22 15 28 Z" fill="currentColor" opacity="0.6" />
      <path
        d="M18 40 L16 44 M18 40 L20 44 M18 40 L18 44"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M28 40 L26 44 M28 40 L30 44 M28 40 L28 44"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <ellipse cx="31" cy="18" rx="2" ry="3" fill="var(--color-danger)" opacity="0.7" />
    </svg>
  );
}

// ── Glitch text ───────────────────────────────────────────────────────────────
function GlitchText({ children }: { children: string }) {
  return (
    <span className="relative inline-block" data-text={children}>
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden
        className="absolute inset-0 text-accent"
        style={{ animation: "glitch 5s infinite", animationDelay: "0.5s", opacity: 0.6 }}
      >
        {children}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 text-phosphor"
        style={{ animation: "glitch-2 5s infinite", animationDelay: "1s", opacity: 0.4 }}
      >
        {children}
      </span>
    </span>
  );
}

// ── Typewriter ────────────────────────────────────────────────────────────────
function Typewriter({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const iv = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(iv);
    }, 38);
    return () => clearInterval(iv);
  }, [started, text]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && started && (
        <span className="animate-blink text-accent">█</span>
      )}
    </span>
  );
}

// ── Data stream column ────────────────────────────────────────────────────────
function DataStream({ x, delay }: { x: number; delay: number }) {
  const chars = "01アイウエオカキクケコ∑∆∏∫≈≠≤≥{}[]<>/\\|#@!?";
  const col = Array.from({ length: 20 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  );

  return (
    <div
      className="absolute top-0 text-xs leading-5 select-none pointer-events-none text-accent font-mono tracking-wide"
      style={{
        left: `${x}%`,
        opacity: 0.12,
        animation: `data-stream ${6 + delay}s linear infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      {col.map((c, i) => (
        <div key={i}>{c}</div>
      ))}
    </div>
  );
}

// ── Live counter ──────────────────────────────────────────────────────────────
function LiveCounter() {
  const [count, setCount] = useState(847_293);

  useEffect(() => {
    const iv = setInterval(() => {
      setCount((c) => c + Math.floor(Math.random() * 12) + 1);
    }, 400);
    return () => clearInterval(iv);
  }, []);

  return (
    <span className="tabular-nums text-accent font-mono">{count.toLocaleString()}</span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [entered, setEntered] = useState(false);
  const [hovering, setHovering] = useState(false);

  const handleEnter = () => {
    setEntered(true);
    setTimeout(() => router.push("/visualizer"), 800);
  };

  const streams = [5, 12, 22, 35, 48, 58, 68, 78, 88, 95];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background scanlines noise">

      {/* Scanning line */}
      <div
        className="absolute left-0 w-full h-0.5 pointer-events-none z-20 animate-scan-line"
        style={{
          background: "linear-gradient(to right, transparent, var(--color-accent), transparent)",
          opacity: 0.4,
        }}
      />

      {/* Data streams */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {streams.map((x, i) => (
          <DataStream key={i} x={x} delay={i * 0.7} />
        ))}
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(200,240,58,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,240,58,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, var(--color-background) 100%)",
        }}
      />

      {/* Central glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "400px",
          background: "radial-gradient(ellipse, var(--color-accent-glow) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="relative z-30 flex flex-col items-center justify-center min-h-screen px-6 py-20">

        {/* Network badge */}
        <div
          className="mb-8 animate-fade-in-up"
          style={{ animationDelay: "0.1s", opacity: 0 }}
        >
          <span className="text-xs tracking-[0.3em] uppercase px-4 py-2 border border-border bg-surface text-foreground-muted font-mono">
            SOMNIA NETWORK — LIVE EVENT STREAM
          </span>
        </div>

        {/* Floating chickens */}
        <div className="relative w-full max-w-lg h-32 mb-4">
          {[
            { x: "10%", delay: "0s",   size: 36, opacity: 0.3 },
            { x: "25%", delay: "1.2s", size: 52, opacity: 0.7 },
            { x: "45%", delay: "0.6s", size: 68, opacity: 1   },
            { x: "65%", delay: "1.8s", size: 44, opacity: 0.6 },
            { x: "82%", delay: "0.3s", size: 32, opacity: 0.25 },
          ].map((c, i) => (
            <div
              key={i}
              className="absolute bottom-0 animate-float-chicken text-accent"
              style={{
                left: c.x,
                animationDelay: c.delay,
                opacity: c.opacity,
                filter: c.opacity > 0.8 ? "drop-shadow(0 0 12px var(--color-accent))" : "none",
              }}
            >
              <ChickenGlyph size={c.size} />
            </div>
          ))}
        </div>

        {/* Title */}
        <div
          className="animate-flicker mb-4"
          style={{ animationDelay: "0.3s", opacity: 0 }}
        >
          <h1
            className="text-7xl md:text-9xl font-black text-center text-foreground font-body"
            style={{
              letterSpacing: "-0.03em",
              textShadow:
                "0 0 40px var(--color-accent-glow-strong), 0 0 80px var(--color-accent-glow)",
            }}
          >
            <GlitchText>SOMLETS</GlitchText>
          </h1>
        </div>

        {/* Tagline */}
        <div
          className="animate-fade-in-up mb-12"
          style={{ animationDelay: "0.6s", opacity: 0 }}
        >
          <p className="text-center text-sm tracking-[0.2em] uppercase text-foreground-muted font-mono">
            <Typewriter
              text="Every chicken is a soul. Every soul is a transaction."
              delay={900}
            />
          </p>
        </div>

        {/* Description card */}
        <div
          className="animate-fade-in-up max-w-xl w-full mb-14"
          style={{ animationDelay: "0.9s", opacity: 0 }}
        >
          <div className="relative p-6 border bg-card border-card-border">
            {/* Corner accents */}
            {[
              "top-0 left-0 border-t border-l",
              "top-0 right-0 border-t border-r",
              "bottom-0 left-0 border-b border-l",
              "bottom-0 right-0 border-b border-r",
            ].map((pos, i) => (
              <div
                key={i}
                className={`absolute w-3 h-3 border-accent ${pos}`}
                style={{ margin: "-1px" }}
              />
            ))}

            <p className="text-sm leading-relaxed mb-4 text-foreground-muted font-body">
              The Somnia blockchain never sleeps. Every second, thousands of events
              pulse through its reactive network — transfers, contracts, executions.
              Most people never see them.
            </p>
            <p className="text-sm leading-relaxed text-foreground-muted font-body">
              Somlets makes them visible. Each event becomes a{" "}
              <span className="text-accent">Somlet</span> — a wandering creature
              carrying the data of its origin. Watch them live. Click one. Read what
              it knows.
            </p>
          </div>
        </div>

        {/* Live counter */}
        <div
          className="animate-fade-in-up mb-10 flex items-center gap-6"
          style={{ animationDelay: "1.1s", opacity: 0 }}
        >
          <div className="flex items-center gap-2">
            <span
              className="block w-2 h-2 rounded-full bg-danger animate-pulse-glow"
              style={{ boxShadow: "0 0 8px var(--color-danger)" }}
            />
            <span className="text-xs tracking-widest uppercase text-foreground-muted font-mono">
              LIVE
            </span>
          </div>
          <span className="text-xs text-foreground-muted font-mono">
            <LiveCounter /> events processed
          </span>
        </div>

        {/* CTA */}
        <div
          className="animate-fade-in-up"
          style={{ animationDelay: "1.3s", opacity: 0 }}
        >
          <button
            onClick={handleEnter}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className="relative px-16 py-5 text-sm tracking-[0.25em] uppercase font-bold font-mono transition-all duration-300 overflow-hidden border border-accent"
            style={{
              color:
                entered || hovering
                  ? "var(--color-background)"
                  : "var(--color-accent)",
              background:
                entered || hovering ? "var(--color-accent)" : "transparent",
              boxShadow: hovering
                ? "0 0 40px var(--color-accent-glow-strong), inset 0 0 20px var(--color-accent-glow)"
                : "0 0 20px var(--color-accent-glow)",
              transform: hovering ? "scale(1.02)" : "scale(1)",
              cursor: "crosshair",
            }}
          >
            <span
              className="absolute inset-0 transition-all duration-300 bg-accent"
              style={{
                transform: hovering ? "scaleX(1)" : "scaleX(0)",
                transformOrigin: "left",
              }}
            />
            <span className="relative z-10">
              {entered ? "ENTERING SIMULATION..." : "ENTER THE WORLD"}
            </span>
          </button>
        </div>

        {/* Warning */}
        <div
          className="animate-fade-in-up mt-16 text-center"
          style={{ animationDelay: "1.6s", opacity: 0 }}
        >
          <p className="text-xs tracking-widest text-foreground-faint font-mono">
            ⚠ SOMLETS MAY CONTAIN INFORMATION YOU CANNOT UNKNOW ⚠
          </p>
        </div>
      </div>

      {/* Status bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-2 border-t border-border bg-surface font-mono">
        <span className="text-xs text-foreground-faint">SOMLETS v0.1.0</span>
        <span className="text-xs text-foreground-faint">
          SOMNIA_RPC: wss://dream-rpc.somnia.network/ws ·{" "}
          <span className="text-phosphor">CONNECTED</span>
        </span>
        <span className="text-xs text-foreground-faint">SYS::NOMINAL</span>
      </div>
    </main>
  );
}