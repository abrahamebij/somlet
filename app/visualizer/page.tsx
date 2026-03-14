"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { sdk } from "@/lib/somnia";
import { useSomletStore } from "@/store/useSomletStore";
import { useWorldStore } from "@/store/useWorldStore";
import { SomletSidebar } from "@/components/visualizer/SomletSidebar";
import { toast } from "sonner";

const SomletGame = dynamic(() => import("@/components/visualizer/SomletGame"), {
  ssr: false,
});

// ── Sound button ──────────────────────────────────────────────────────────────

function SoundButton() {
  const audioUnlocked = useWorldStore((s) => s.audioUnlocked);
  const unlockAudio   = useWorldStore((s) => s.unlockAudio);

  return (
    <button
      onClick={unlockAudio}
      title={audioUnlocked ? "Sound on" : "Click to enable sound"}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 border text-[11px] font-mono
        tracking-[0.15em] uppercase transition-all duration-200 cursor-crosshair
        ${audioUnlocked
          ? "border-accent text-accent"
          : "border-border text-foreground-faint hover:border-accent hover:text-accent animate-blink"
        }
      `}
    >
      <span className="text-sm leading-none">
        {audioUnlocked ? "🔊" : "🔇"}
      </span>
      <span>{audioUnlocked ? "SOUND ON" : "SOUND OFF"}</span>
    </button>
  );
}

// ── Fire mode button ──────────────────────────────────────────────────────────

function FireModeButton() {
  const fireModeActive = useWorldStore((s) => s.fireModeActive);
  const toggleFireMode = useWorldStore((s) => s.toggleFireMode);
  const chicks         = useWorldStore((s) => s.chicks);

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-mono tracking-widest uppercase text-foreground-faint">
        {chicks.size.toLocaleString()} somlets alive
      </span>

      <div className="w-px h-4 bg-border" />

      <button
        onClick={toggleFireMode}
        className={`
          relative flex items-center gap-2 px-4 py-1.5
          text-[11px] font-mono tracking-[0.2em] uppercase
          border transition-all duration-200 cursor-crosshair overflow-hidden
          ${fireModeActive
            ? "border-danger text-background bg-danger"
            : "border-border text-foreground-muted hover:border-danger hover:text-danger"
          }
        `}
      >
        {fireModeActive && (
          <span className="absolute inset-0 bg-danger opacity-20 animate-flicker" />
        )}
        <span className="relative z-10 text-base leading-none">🔥</span>
        <span className="relative z-10">
          {fireModeActive ? "FIRE MODE ON" : "FIRE MODE"}
        </span>
        {fireModeActive && (
          <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-background animate-blink" />
        )}
      </button>

      {fireModeActive && (
        <span className="text-[10px] font-mono text-danger tracking-widest uppercase animate-flicker">
          CLICK SOMLETS TO KILL
        </span>
      )}
    </div>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function Toolbar({ gameReady }: { gameReady: boolean }) {
  return (
    <div className="shrink-0 h-10 flex items-center justify-between px-4 border-b border-border bg-surface-raised">
      {/* Left — world status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
              gameReady ? "bg-accent animate-pulse-glow" : "bg-foreground-faint"
            }`}
          />
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-foreground-muted">
            {gameReady ? "WORLD LIVE" : "LOADING WORLD…"}
          </span>
        </div>

        {/* Sound toggle — always visible so user can unlock audio immediately */}
        <div className="w-px h-4 bg-border" />
        <SoundButton />
      </div>

      {/* Right — fire mode */}
      {gameReady && <FireModeButton />}
    </div>
  );
}

// ── Visualizer ────────────────────────────────────────────────────────────────

const Visualizer = () => {
  const addEvent       = useSomletStore((s) => s.addEvent);
  const gameReady      = useSomletStore((s) => s.gameReady);
  const fireModeActive = useWorldStore((s) => s.fireModeActive);

  useEffect(() => {
    if (!gameReady) return;

    let cancelled = false;

    const setupSubscription = async () => {
      try {
        await sdk.subscribe({
          ethCalls: [],
          onData: (data) => {
            if (!cancelled) addEvent(data);
          },
        });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error("Failed to connect to Somnia WebSocket:", error);
        toast.error("Failed to connect to Somnia WebSocket");
      }
    };

    setupSubscription();
    return () => { cancelled = true; };
  }, [gameReady, addEvent]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Left — game world + toolbar ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Toolbar gameReady={gameReady} />

        <div
          className="flex-1 relative overflow-hidden"
          style={{ cursor: fireModeActive ? "crosshair" : "default" }}
        >
          <SomletGame />
        </div>
      </div>

      {/* ── Right — sidebar ──────────────────────────────────────────────── */}
      <div className="w-80 shrink-0 h-full">
        <SomletSidebar />
      </div>
    </div>
  );
};

export default Visualizer;