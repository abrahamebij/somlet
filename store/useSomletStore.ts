import { create } from "zustand";

// ── Config ────────────────────────────────────────────────────────────────────

const EVENTS_PER_CHICK = 40;

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
  event: SomniaEvent;   // the 40th event that triggered this chick's spawn
  spawnedAt: number;
}

interface SomletStore {
  events: SomniaEvent[];
  somlets: Somlet[];
  selectedSomlet: Somlet | null;
  eventBuffer: number;
  gameReady: boolean;           // true once Phaser WorldScene.create() finishes

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

  addEvent: (event) => {
    const { eventBuffer } = get();
    const nextBuffer = eventBuffer + 1;

    // Every 40th event spawns a chick representing that event
    const shouldSpawn = nextBuffer >= EVENTS_PER_CHICK;

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
      eventBuffer: shouldSpawn ? 0 : nextBuffer,
    }));
  },

  selectSomlet: (id) => {
    if (id === null) { set({ selectedSomlet: null }); return; }
    const somlet = get().somlets.find((s) => s.id === id) ?? null;
    set({ selectedSomlet: somlet });
  },

  setGameReady: (ready) => set({ gameReady: ready }),

  clearAll: () => set({ events: [], somlets: [], selectedSomlet: null, eventBuffer: 0, gameReady: false }),
}));