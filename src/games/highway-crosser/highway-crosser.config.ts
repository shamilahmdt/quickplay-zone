// ─────────────────────────────────────────────────────────────────────────────
// Cyber Highway Crosser — Configuration
// ─────────────────────────────────────────────────────────────────────────────

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export const DIFFICULTY_SPEEDS: Record<Difficulty, number> = {
  EASY: 0.75,
  MEDIUM: 1.0,
  HARD: 1.35,
};

/** Per-lane descriptor used to spawn and move vehicles / platforms. */
export interface LaneConfig {
  /** Canvas row this lane occupies (0 = top dock row, 9 = bottom start row). */
  row: number;
  /** Movement direction: 1 = rightward, -1 = leftward. */
  dir: 1 | -1;
  /** Base speed in pixels per frame at level 1 (scaled up each level). */
  baseSpeed: number;
  /** Vehicle / platform width in px. */
  vehicleW: number;
  /** Vehicle / platform height in px. */
  vehicleH: number;
  /** CSS colour string used to fill the entity. */
  color: string;
  /** Frames between consecutive spawns on this lane. */
  spawnInterval: number;
  /** true → player rides the entity; false → contact kills the player. */
  isPlatform: boolean;
}

/**
 * All lane descriptors.
 * Row layout (10 rows × 48 px = 480 px canvas height):
 *   0  – server dock row  (safe)
 *   1–4 – traffic lanes
 *   5  – median safe strip
 *   6–8 – moving platform / river lanes
 *   9  – start / spawn zone (safe)
 */
export const LANE_CONFIGS: LaneConfig[] = [
  // ── Traffic lanes (rows 1–4) ──────────────────────────────────────────────
  { row: 1, dir: -1, baseSpeed: 1.4, vehicleW: 52, vehicleH: 30, color: '#f43f5e', spawnInterval: 100, isPlatform: false },
  { row: 2, dir:  1, baseSpeed: 2.0, vehicleW: 40, vehicleH: 30, color: '#f97316', spawnInterval: 80,  isPlatform: false },
  { row: 3, dir: -1, baseSpeed: 1.7, vehicleW: 72, vehicleH: 30, color: '#a855f7', spawnInterval: 90,  isPlatform: false },
  { row: 4, dir:  1, baseSpeed: 1.2, vehicleW: 44, vehicleH: 30, color: '#06b6d4', spawnInterval: 110, isPlatform: false },
  // ── Platform / river lanes (rows 6–8) ────────────────────────────────────
  { row: 6, dir:  1, baseSpeed: 1.0, vehicleW: 96, vehicleH: 30, color: '#10b981', spawnInterval: 95,  isPlatform: true  },
  { row: 7, dir: -1, baseSpeed: 1.4, vehicleW: 80, vehicleH: 30, color: '#14b8a6', spawnInterval: 80,  isPlatform: true  },
  { row: 8, dir:  1, baseSpeed: 1.8, vehicleW: 64, vehicleH: 30, color: '#10b981', spawnInterval: 70,  isPlatform: true  },
];

/** Rows where the player is safe (no collision, no drowning). */
export const SAFE_ROWS: number[]     = [0, 5, 9];
/** Rows where the player must ride a platform or they drown. */
export const PLATFORM_ROWS: number[] = [6, 7, 8];

/** All static game constants. */
export const HIGHWAY_CONFIG = {
  // ── Canvas ────────────────────────────────────────────────────────────────
  CANVAS_W:   480,
  CANVAS_H:   480,
  ROW_HEIGHT:  48,
  NUM_ROWS:    10,

  // ── Player ────────────────────────────────────────────────────────────────
  PLAYER_W:         28,
  PLAYER_H:         28,
  PLAYER_START_ROW:  9,
  PLAYER_START_X:  240,  // horizontal centre of the canvas
  STEP_X:           48,  // px moved per horizontal key-press

  // ── Gameplay ──────────────────────────────────────────────────────────────
  LIVES:                3,
  DOCK_COUNT:           5,
  POINTS_PER_DOCK:     10,
  POINTS_ALL_DOCKS_BONUS: 50,

  // ── Level progression ─────────────────────────────────────────────────────
  /** Fractional speed increase applied per level (0.15 → +15 % per level). */
  SPEED_SCALE_PER_LEVEL: 0.15,
  MAX_LEVEL: 9,

  // ── Colours ───────────────────────────────────────────────────────────────
  COLORS: {
    // Backgrounds
    bgDark:         '#09090b',
    bgLight:        '#f1f5f9',
    // Safe zones
    safeDark:       '#052e16',
    safeLight:      '#d1fae5',
    // Road
    roadDark:       '#1c1917',
    roadLight:      '#d4d4d8',
    // Median strip
    medianDark:     '#0f172a',
    medianLight:    '#dbeafe',
    // Water / river
    waterDark:      '#082f49',
    waterLight:     '#bae6fd',
    // Misc
    laneDivider:    'rgba(255,255,255,0.06)',
    // Docks
    dockEmptyDark:  '#14532d',
    dockEmptyLight: '#bbf7d0',
    dockFilled:     '#22c55e',
    // Player
    playerLight:    '#1e293b',
    playerDark:     '#ffffff',
    playerGlow:     '#06b6d4',
    hitFlashColor:  '#ef4444',
  },
};

export default HIGHWAY_CONFIG;
