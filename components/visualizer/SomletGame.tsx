"use client";

import { useEffect, useRef } from "react";
import type PhaserType from "phaser";
import { useSomletStore } from "@/store/useSomletStore";
import { useWorldStore } from "@/store/useWorldStore";

export default function SomletGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef      = useRef<PhaserType.Game | null>(null);

  // ── #8 Track spawned ids — safe across hot reloads ───────────────────────
  const spawnedIds = useRef(new Set<string>());
  const somlets    = useSomletStore((s) => s.somlets);
  const spawnChick = useWorldStore((s) => s.spawnChick);

  useEffect(() => {
    somlets.forEach((somlet) => {
      if (!spawnedIds.current.has(somlet.id)) {
        spawnedIds.current.add(somlet.id);
        spawnChick(somlet.event, somlet.id);
      }
    });
  }, [somlets, spawnChick]);

  // ── Boot Phaser once ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    let game: PhaserType.Game;

    const boot = async (width: number, height: number) => {
      if (gameRef.current) return; // guard against double-boot
      const Phaser         = (await import("phaser")).default;
      const { WorldScene } = await import("./WorldScene");

      game = new Phaser.Game({
        type:            Phaser.AUTO,
        width,
        height,
        parent:          containerRef.current!,
        backgroundColor: "#0a1a0a",
        physics:         { default: "arcade", arcade: { debug: false } },
        scene:           [WorldScene],
        scale:           { mode: Phaser.Scale.NONE },
        render:          { pixelArt: true, antialias: false },
      });

      gameRef.current = game;
      observer.disconnect(); // stop watching once booted
    };

    // Wait for the container to have real painted dimensions before booting
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) boot(width, height);
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      game?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}