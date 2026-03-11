"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const orbs: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      color: string;
      alpha: number;
    }[] = [];
    const colors = ["#6c47ff", "#00e5c0", "#4466ff", "#9b7dff"];
    for (let i = 0; i < 28; i++) {
      orbs.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 1 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.12 + Math.random() * 0.28,
      });
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      orbs.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = canvas.width;
        if (d.x > canvas.width) d.x = 0;
        if (d.y < 0) d.y = canvas.height;
        if (d.y > canvas.height) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.globalAlpha = d.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: "#04040a" }}
    >
      {/* Particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Top glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "70vw",
          height: "55vh",
          background:
            "radial-gradient(ellipse at center, #6c47ff16 0%, transparent 65%)",
        }}
      />

      {/* Layout */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Nav */}
        <div className="flex items-center justify-between px-12 pt-9">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🐔</span>
            <span
              className="font-mono text-xs tracking-[0.2em] uppercase"
              style={{ color: "#2e2e4a" }}
            >
              Somlets
            </span>
          </div>
          <div
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full"
            style={{ background: "#0a0a14", border: "1px solid #16162a" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "#00e5c0",
                boxShadow: "0 0 6px #00e5c0",
                animation: "livepulse 2.2s ease-in-out infinite",
              }}
            />
            <span className="font-mono text-xs" style={{ color: "#2e2e4a" }}>
              Somnia Testnet
            </span>
          </div>
        </div>

        {/* Hero — vertically centered with lots of space */}
        <div
          className="flex-1 flex flex-col items-center justify-center text-center"
          style={{ paddingBottom: "6vh" }}
        >
          {/* Icon */}
          <div
            className="flex items-center justify-center text-5xl mb-16"
            style={{
              width: 96,
              height: 96,
              borderRadius: 28,
              background: "linear-gradient(145deg, #0c0c1e, #101024)",
              border: "1px solid #6c47ff22",
              boxShadow: "0 0 90px #6c47ff14, inset 0 1px 0 #6c47ff18",
            }}
          >
            🐔
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "clamp(5rem, 13vw, 9rem)",
              fontWeight: 900,
              lineHeight: 0.88,
              letterSpacing: "-0.04em",
              marginBottom: "2.5rem",
              background:
                "linear-gradient(155deg, #ffffff 0%, #b0a0ff 50%, #6c47ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Somlets
          </h1>

          {/* Tagline */}
          <p
            style={{
              fontSize: "1.2rem",
              fontWeight: 300,
              color: "#6060888",
              marginBottom: "1.5rem",
              maxWidth: 380,
              lineHeight: 1.7,
            }}
          >
            Every Somnia blockchain event becomes a{" "}
            <span style={{ color: "#b8acff", fontWeight: 500 }}>
              living chicken
            </span>
            . Watch the network breathe.
          </p>

          {/* Subtle detail line */}
          <p
            className="font-mono text-xs mb-20 pb-2"
            style={{ color: "#252538", letterSpacing: "0.08em", lineHeight: 2 }}
          >
            TRANSFERS · MINTS · SWAPS · CONTRACTS
          </p>

          {/* CTA */}
          <Link href="/visualizer">
            {" "}
            <button
              className="group font-mono font-semibold tracking-widest uppercase transition-all duration-300 cursor-pointer"
              style={{
                padding: "20px 60px",
                borderRadius: 16,
                fontSize: "0.75rem",
                letterSpacing: "0.18em",
                background: "linear-gradient(135deg, #5a38ee, #7c5cfc)",
                color: "#e8e0ff",
                boxShadow: "0 0 60px #6c47ff30, 0 12px 40px #6c47ff20",
                border: "1px solid #7c5cfc60",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.boxShadow =
                  "0 0 100px #6c47ff50, 0 12px 50px #6c47ff40";
                el.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.boxShadow =
                  "0 0 60px #6c47ff30, 0 12px 40px #6c47ff20";
                el.style.transform = "translateY(0)";
              }}
            >
              Enter the World
              <span className="ml-3 inline-block transition-transform duration-300 group-hover:translate-x-2">
                →
              </span>
            </button>
          </Link>
        </div>

        {/* Footer traits */}
        <div
          className="flex items-center justify-center gap-12 pb-10 font-mono text-xs"
          style={{ color: "#1e1e30" }}
        >
          {[
            ["⚡", "Real-time"],
            ["🔗", "On-chain"],
            ["🐔", "1 event = 1 chicken"],
            ["🎮", "Interactive"],
          ].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-2">
              <span>{icon}</span>
              <span style={{ letterSpacing: "0.06em" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes livepulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #00e5c0; }
          50% { opacity: 0.4; box-shadow: 0 0 3px #00e5c0; }
        }
      `}</style>
    </div>
  );
}
