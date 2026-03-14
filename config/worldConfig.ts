// ── World dimensions ──────────────────────────────────────────────────────────
export const TILE     = 16;   // source tile size in px
export const SCALE    = 2;    // render multiplier → tiles appear at 32×32px
export const S        = TILE * SCALE; // scaled tile size (32px)
export const MAP_COLS = 40;
export const MAP_ROWS = 30;
export const WORLD_W  = MAP_COLS * S;
export const WORLD_H  = MAP_ROWS * S;

// ── Zone boundaries ───────────────────────────────────────────────────────────
export const H_MID = Math.floor(MAP_ROWS / 2); // 15
export const V_MID = Math.floor(MAP_COLS / 2); // 20
export const BLEND = 1;

// ── Water pond (dead center) ──────────────────────────────────────────────────
export const WP_C1 = V_MID - 2; // col 18
export const WP_C2 = V_MID + 1; // col 21
export const WP_R1 = H_MID - 1; // row 14
export const WP_R2 = H_MID + 1; // row 16

// Water center point + radius (for chicken AI)
export const WATER_CENTER_X = WP_C1 * S + (WP_C2 - WP_C1 + 1) * S / 2;
export const WATER_CENTER_Y = WP_R1 * S + (WP_R2 - WP_R1 + 1) * S / 2;
export const WATER_RADIUS   = S * 2;

// ── Fence offset ──────────────────────────────────────────────────────────────
export const FE           = 2;
export const FENCE_INSET  = (FE + 1) * S;

// ── Play area bounds (inside fence) ──────────────────────────────────────────
export const PLAY_X = FENCE_INSET;
export const PLAY_Y = FENCE_INSET;
export const PLAY_W = WORLD_W - FENCE_INSET * 2;
export const PLAY_H = WORLD_H - FENCE_INSET * 2;

// ── Chick sprite ──────────────────────────────────────────────────────────────
export const CHICK_FRAME_W  = 96;
export const CHICK_FRAME_H  = 96;
export const CHICK_DISPLAY  = S * 1.6; // render size in world (≈51px)

// Chorus / gathering
export const CHORUS_INTERVAL = 10_000; // ms between gatherings
export const CHORUS_FRACTION = 0.33;   // fraction of chicks that gather
export const CHORUS_WALK_SPEED = 55;    // px/s toward gather point
export const MORSE_DOT = 220;   // ms — short cluck
export const MORSE_DASH = 540;   // ms — long cluck
export const MORSE_GAP = 160;   // ms — gap between pulses
export const MORSE_WORD_GAP = 500;   // ms — gap between morse "words"

// Frame indices within chick_spritesheet_clean.png (5 cols × 4 rows)
export const CHICK_ANIMS = {
  idle:  { frames: [0, 1],          frameRate: 2,  repeat: -1 },
  walk:  { frames: [5, 6, 7, 8],    frameRate: 8,  repeat: -1 },
  drink: { frames: [10, 11, 12],    frameRate: 4,  repeat: 0  },
  death: { frames: [15,16,17,18,19],frameRate: 6,  repeat: 0  },
} as const;

// ── Tile indices — Set_1_2.png (16 cols wide) ─────────────────────────────────
export const TILES = {
  G_LIGHT:   25,
  G_MID:     41,
  G_FULL:    57,
  G_DARK1:   73,
  G_DARK2:   89,
  FL_ORANGE: 49,
  FL_BLUE:   50,
  FL_PINK:   51,
  FL_YELLOW: 77,
  SHRUB_A:   85,
  SHRUB_B:   86,
  SHRUB_C:   87,
  PLANT_A:   101,
  PLANT_B:   117,
  PLANT_C:   119,
  SPARKLE_W: 91,
  SPARKLE_C: 92,
  SPARKLE_Y: 93,
} as const;

// ── Tile indices — fences_and_ladders_etc.png (12 cols wide) ──────────────────
export const FENCE_TILES = {
  H_TOP:  54,
  H_BOT:  66,
  V:      26,
  CORNER: 25,
} as const;

// ── Seeded RNG ────────────────────────────────────────────────────────────────
export const rand = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + x * y * 0.03) * 43758.5453;
  return n - Math.floor(n);
};

// ── Ground layer builder ──────────────────────────────────────────────────────
export function buildGroundLayer(): number[][] {
  const zoneGrass = (col: number, row: number): number => {
    const nearH = Math.abs(row - H_MID) <= BLEND;
    const nearV = Math.abs(col - V_MID) <= BLEND;
    if (nearH || nearV) return TILES.G_MID;
    if (col < V_MID && row < H_MID) return TILES.G_LIGHT;
    if (col >= V_MID && row < H_MID) return TILES.G_FULL;
    if (col < V_MID && row >= H_MID) return TILES.G_DARK1;
    return TILES.G_DARK2;
  };

  return Array.from({ length: MAP_ROWS }, (_, row) =>
    Array.from({ length: MAP_COLS }, (_, col) => {
      if (row >= WP_R1 && row <= WP_R2 && col >= WP_C1 && col <= WP_C2) return -1;
      return zoneGrass(col, row);
    })
  );
}

// ── Decoration builder ────────────────────────────────────────────────────────
const DEC_TILES = [
  TILES.FL_ORANGE, TILES.FL_BLUE, TILES.FL_PINK, TILES.FL_YELLOW,
  TILES.SHRUB_A,   TILES.SHRUB_B, TILES.SHRUB_C,
  TILES.PLANT_A,   TILES.PLANT_B, TILES.PLANT_C,
  TILES.SPARKLE_W, TILES.SPARKLE_C, TILES.SPARKLE_Y,
];

export function buildDecorations(): [number, number, number][] {
  const decs: [number, number, number][] = [];
  for (let row = FE + 2; row < MAP_ROWS - FE - 2; row++) {
    for (let col = FE + 2; col < MAP_COLS - FE - 2; col++) {
      if (row >= WP_R1 - 1 && row <= WP_R2 + 1 && col >= WP_C1 - 1 && col <= WP_C2 + 1) continue;
      if (Math.abs(row - H_MID) <= BLEND || Math.abs(col - V_MID) <= BLEND) continue;
      if (rand(col, row) < 0.08) {
        decs.push([col, row, DEC_TILES[Math.floor(rand(col + 1, row + 1) * DEC_TILES.length)]]);
      }
    }
  }
  return decs;
}