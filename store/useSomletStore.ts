import { create } from "zustand";

// ── Config ────────────────────────────────────────────────────────────────────

const EVENTS_PER_CHICK = 40;
const FIRST_SPAWN_DELAY = 4000; // ms — gives egg hatch animation time to play

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SomniaEventResult {
  address: string;
  topics: string[];
  data: string;
  simulationResults: unknown[];
}

export interface SomniaEvent {
  subscription: string;
  result: SomniaEventResult;
}

export interface Somlet {
  id: string;
  event: SomniaEvent;
  spawnedAt: number;
}

interface SomletStore {
  events: SomniaEvent[];
  somlets: Somlet[];
  selectedSomlet: Somlet | null;
  eventBuffer: number;
  gameReady: boolean;
  gameReadyAt: number | null;   // timestamp when game became ready

  addEvent: (event: SomniaEvent) => void;
  selectSomlet: (id: string | null) => void;
  setGameReady: (ready: boolean) => void;
  clearAll: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSomletStore = create<SomletStore>((set, get) => ({
  events: [],
  somlets: [],
  selectedSomlet: null,
  eventBuffer: 0,
  gameReady: false,
  gameReadyAt: null,

  addEvent: (event) => {
    const { eventBuffer, gameReadyAt } = get();

    // Hold back first spawn until FIRST_SPAWN_DELAY ms after game became ready
    const elapsed = gameReadyAt ? Date.now() - gameReadyAt : 0;
    const firstSpawnUnlocked = elapsed >= FIRST_SPAWN_DELAY;

    const nextBuffer = eventBuffer + 1;
    const shouldSpawn = firstSpawnUnlocked && nextBuffer >= EVENTS_PER_CHICK;

    const newSomlet: Somlet | null = shouldSpawn
      ? {
        id: `${event.subscription}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        event,
        spawnedAt: Date.now(),
      }
      : null;

    set((state) => ({
      events: [event, ...state.events].slice(0, 500),
      somlets: newSomlet ? [...state.somlets, newSomlet] : state.somlets,
      // Only reset buffer when a spawn actually happens, otherwise keep counting
      eventBuffer: shouldSpawn ? 0 : nextBuffer,
    }));
  },

  selectSomlet: (id) => {
    if (id === null) { set({ selectedSomlet: null }); return; }
    const somlet = get().somlets.find((s) => s.id === id) ?? null;
    set({ selectedSomlet: somlet });
  },

  setGameReady: (ready) => set({
    gameReady: ready,
    gameReadyAt: ready ? Date.now() : null,
  }),

  clearAll: () => set({
    events: [], somlets: [], selectedSomlet: null,
    eventBuffer: 0, gameReady: false, gameReadyAt: null,
  }),
}));