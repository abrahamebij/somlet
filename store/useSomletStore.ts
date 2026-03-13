import { create } from "zustand";

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
  id: string;           // unique id — subscription + timestamp
  event: SomniaEvent;
  spawnedAt: number;    // Date.now() at spawn time
}

interface SomletStore {
  // All events received this session
  events: SomniaEvent[];

  // All live somlets in the world
  somlets: Somlet[];

  // The somlet the user has clicked on
  selectedSomlet: Somlet | null;

  // Actions
  addEvent: (event: SomniaEvent) => void;
  selectSomlet: (id: string | null) => void;
  clearAll: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSomletStore = create<SomletStore>((set, get) => ({
  events: [],
  somlets: [],
  selectedSomlet: null,

  addEvent: (event) => {
    const somlet: Somlet = {
      id: `${event.subscription}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      event,
      spawnedAt: Date.now(),
    };

    set((state) => ({
      events: [event, ...state.events].slice(0, 500), // cap at 500 stored events
      somlets: [...state.somlets, somlet],
    }));
  },

  selectSomlet: (id) => {
    if (id === null) {
      set({ selectedSomlet: null });
      return;
    }
    const somlet = get().somlets.find((s) => s.id === id) ?? null;
    set({ selectedSomlet: somlet });
  },

  clearAll: () => set({ events: [], somlets: [], selectedSomlet: null }),
}));