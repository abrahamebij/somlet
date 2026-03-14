import { create } from "zustand";
import type { SomniaEvent } from "@/store/useSomletStore";
import {
  PLAY_X, PLAY_Y, PLAY_W, PLAY_H,
  WATER_CENTER_X, WATER_CENTER_Y, WATER_RADIUS,
  WORLD_W, WORLD_H, S,
} from "@/config/worldConfig";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChickState = "idle" | "walk" | "drink" | "death" | "gather";

export interface Chick {
  id: string;
  event: SomniaEvent;
  spawnedAt: number;

  // Spawn position — set once, then Phaser owns movement
  spawnX: number;
  spawnY: number;

  // State machine — only these need to be in the store
  state: ChickState;
  stateTimer: number;
  lifespanTimer: number;

  // Direction hints for Phaser
  vx: number;
  vy: number;
  facingLeft: boolean;
  isGathering: boolean;
}

export interface PendingSpawn {
  id: string;
  event: SomniaEvent;
}

interface WorldStore {
  chicks: Map<string, Chick>;
  selectedChickId: string | null;
  fireModeActive: boolean;
  audioUnlocked: boolean;
  pendingSpawns: PendingSpawn[];

  spawnChick: (event: SomniaEvent, id?: string, parentX?: number, parentY?: number) => void;
  queueSpawn: (event: SomniaEvent, id: string) => void;
  drainSpawn: () => PendingSpawn | null;
  killChick: (id: string) => void;
  selectChick: (id: string | null) => void;
  toggleFireMode: () => void;
  updateChick: (id: string, patch: Partial<Chick>) => void;
  unlockAudio: () => void;
  clearAll: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const randomSpawn = () => ({
  x: PLAY_X + Math.random() * PLAY_W,
  y: PLAY_Y + Math.random() * PLAY_H,
});

const nearWater = (x: number, y: number) =>
  Math.hypot(x - WATER_CENTER_X, y - WATER_CENTER_Y) < WATER_RADIUS;

// ── Store ─────────────────────────────────────────────────────────────────────

export const useWorldStore = create<WorldStore>((set, get) => ({
  chicks: new Map(),
  selectedChickId: null,
  fireModeActive: false,
  audioUnlocked: false,
  pendingSpawns: [],

  spawnChick: (event, id, parentX, parentY) => {
    const chickId = id ?? `chick-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (get().chicks.has(chickId)) return;

    // If parent position given use it (offset slightly), else center of world
    const x = parentX !== undefined ? parentX + (Math.random() - 0.5) * S * 2 : WORLD_W / 2;
    const y = parentY !== undefined ? parentY + (Math.random() - 0.5) * S * 2 : WORLD_H / 2;

    const chick: Chick = {
      id: chickId,
      event,
      spawnedAt: Date.now(),
      spawnX: x,
      spawnY: y,
      state: "idle",
      stateTimer: 1000 + Math.random() * 1500,
      lifespanTimer: 30_000,
      vx: 0,
      vy: 0,
      facingLeft: Math.random() < 0.5,
      isGathering: false,
    };

    set((s) => {
      const next = new Map(s.chicks);
      next.set(chickId, chick);
      return { chicks: next };
    });
  },

  queueSpawn: (event, id) => set((s) => ({
    pendingSpawns: [...s.pendingSpawns, { id, event }],
  })),

  drainSpawn: () => {
    const { pendingSpawns } = get();
    if (pendingSpawns.length === 0) return null;
    const [next, ...rest] = pendingSpawns;
    set({ pendingSpawns: rest });
    return next;
  },

  killChick: (id) => set((s) => {
    const chick = s.chicks.get(id);
    if (!chick || chick.state === "death") return s; // already dying — no-op
    const next = new Map(s.chicks);
    next.set(id, { ...chick, state: "death", stateTimer: 1500, vx: 0, vy: 0 });
    return { chicks: next };
  }),

  selectChick: (id) => set({ selectedChickId: id }),

  toggleFireMode: () => set((s) => ({ fireModeActive: !s.fireModeActive })),

  unlockAudio: () => set({ audioUnlocked: true }),

  updateChick: (id, patch) => set((s) => {
    const chick = s.chicks.get(id);
    if (!chick) return s;
    const next = new Map(s.chicks);
    next.set(id, { ...chick, ...patch });
    return { chicks: next };
  }),

  clearAll: () => set({ chicks: new Map(), selectedChickId: null, pendingSpawns: [] }),
}));