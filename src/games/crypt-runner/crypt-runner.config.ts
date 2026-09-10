// ─────────────────────────────────────────────────────────────────────────────
// Cyber Crypt Runner — Configuration & Maze Layout
// ─────────────────────────────────────────────────────────────────────────────

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export const GRID_COLS = 28;
export const GRID_ROWS = 31;
export const TILE_SIZE = 16;
export const CANVAS_W = GRID_COLS * TILE_SIZE; // 448
export const CANVAS_H = GRID_ROWS * TILE_SIZE; // 496

// Tile Type Codes
export const TILE_EMPTY = 0;
export const TILE_WALL = 1;
export const TILE_DOT = 2;
export const TILE_POWER = 3;
export const TILE_GATE = 4;
export const TILE_GHOST_HOUSE = 5;

// Point Scoring
export const POINTS_DOT = 10;
export const POINTS_POWER_NODE = 50;
export const POINTS_GHOST_EATEN = [200, 400, 800, 1600];
export const POINTS_STAGE_CLEAR = 1000;
export const INITIAL_LIVES = 3;

// Difficulty Settings
export interface DifficultyConfig {
  playerSpeed: number; // tiles per second
  ghostSpeed: number;
  frightenedSpeed: number;
  eatenSpeed: number;
  powerDurationMs: number;
  scatterIntervals: number[]; // alternation between scatter & chase in seconds
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  EASY: {
    playerSpeed: 2.3,
    ghostSpeed: 1.8,
    frightenedSpeed: 1.1,
    eatenSpeed: 4.0,
    powerDurationMs: 9000,
    scatterIntervals: [8, 20, 8, 20, 6, 20, 6, -1],
  },
  MEDIUM: {
    playerSpeed: 2.5,
    ghostSpeed: 2.15,
    frightenedSpeed: 1.3,
    eatenSpeed: 4.2,
    powerDurationMs: 7000,
    scatterIntervals: [7, 20, 7, 20, 5, 20, 5, -1],
  },
  HARD: {
    playerSpeed: 2.7,
    ghostSpeed: 2.45,
    frightenedSpeed: 1.5,
    eatenSpeed: 4.5,
    powerDurationMs: 5000,
    scatterIntervals: [5, 20, 5, 20, 4, 20, 4, -1],
  },
};

// Cruise Elroy speed boost thresholds & scatter immunity
export const CRUISE_ELROY_CONFIG = {
  ELROY_1_DOTS: 20,
  ELROY_1_SPEED_MULT: 1.05,
  ELROY_2_DOTS: 10,
  ELROY_2_SPEED_MULT: 1.10,
};

// Ghost speed reduction multiplier in side warp tunnels (row 14)
export const TUNNEL_SPEED_FACTOR = 0.45;

// Dot thresholds for ghost house releases in a round
export const GHOST_HOUSE_DOT_THRESHOLDS = {
  BLINKY: 0,
  PINKY: 0,
  INKY: 30,
  CLYDE: 60,
};

// Classic "Red Zones" where ghosts cannot make an UP turn at intersections
export const RESTRICTED_UP_TILES: Array<{ col: number; row: number }> = [
  { col: 12, row: 11 },
  { col: 15, row: 11 },
  { col: 12, row: 23 },
  { col: 15, row: 23 },
];

// Colors for Dark and Light themes
export interface ThemePalette {
  boardBg: string;
  gridLineColor: string;
  wallStroke: string;
  wallGlow: string;
  wallFill: string;
  gateColor: string;
  dotColor: string;
  dotGlow: string;
  powerColor: string;
  powerGlow: string;
  playerColor: string;
  playerMouthColor: string;
  textPrimary: string;
  textSecondary: string;
}

export const THEME_PALETTES: { dark: ThemePalette; light: ThemePalette } = {
  dark: {
    boardBg: '#09090b',
    gridLineColor: 'rgba(255, 255, 255, 0.03)',
    wallStroke: '#06b6d4',
    wallGlow: 'rgba(6, 182, 212, 0.45)',
    wallFill: '#0e1726',
    gateColor: '#f472b6',
    dotColor: '#38bdf8',
    dotGlow: 'rgba(56, 189, 248, 0.6)',
    powerColor: '#fbbf24',
    powerGlow: 'rgba(251, 191, 36, 0.8)',
    playerColor: '#facc15',
    playerMouthColor: '#09090b',
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',
  },
  light: {
    boardBg: '#f8fafc',
    gridLineColor: 'rgba(0, 0, 0, 0.03)',
    wallStroke: '#1e293b',
    wallGlow: 'rgba(30, 41, 59, 0.2)',
    wallFill: '#e2e8f0',
    gateColor: '#db2777',
    dotColor: '#0284c7',
    dotGlow: 'rgba(2, 132, 199, 0.4)',
    powerColor: '#d97706',
    powerGlow: 'rgba(217, 119, 6, 0.6)',
    playerColor: '#ca8a04',
    playerMouthColor: '#f8fafc',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
  },
};

export const GHOST_COLORS = {
  BLINKY: '#ef4444',
  PINKY: '#f472b6',
  INKY: '#06b6d4',
  CLYDE: '#f97316',
  FRIGHTENED: '#2563eb',
  FRIGHTENED_FLASH: '#ffffff',
  EYES: '#38bdf8',
};

// 28 x 31 Symmetric Classic CPU Circuit Maze
// 1 = Wall, 2 = Data Dot, 3 = Power Node, 0 = Empty Corridor / Tunnel, 4 = Ghost Gate, 5 = Inside Ghost House
export const BASE_MAZE: number[][] = [
  // Row 0
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  // Row 1
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  // Row 2
  [1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1],
  // Row 3
  [1, 3, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 3, 1],
  // Row 4
  [1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1],
  // Row 5
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  // Row 6
  [1, 2, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1],
  // Row 7
  [1, 2, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1],
  // Row 8
  [1, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 1],
  // Row 9
  [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1],
  // Row 10
  [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1],
  // Row 11
  [1, 1, 1, 1, 1, 1, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 1, 1, 1, 1, 1, 1],
  // Row 12
  [1, 1, 1, 1, 1, 1, 2, 1, 1, 0, 1, 1, 1, 4, 4, 1, 1, 1, 0, 1, 1, 2, 1, 1, 1, 1, 1, 1],
  // Row 13
  [1, 1, 1, 1, 1, 1, 2, 1, 1, 0, 1, 5, 5, 5, 5, 5, 5, 1, 0, 1, 1, 2, 1, 1, 1, 1, 1, 1],
  // Row 14 (Side Tunnels at cols 0-5 and 22-27)
  [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0],
  // Row 15
  [1, 1, 1, 1, 1, 1, 2, 1, 1, 0, 1, 5, 5, 5, 5, 5, 5, 1, 0, 1, 1, 2, 1, 1, 1, 1, 1, 1],
  // Row 16
  [1, 1, 1, 1, 1, 1, 2, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 2, 1, 1, 1, 1, 1, 1],
  // Row 17
  [1, 1, 1, 1, 1, 1, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 1, 1, 1, 1, 1, 1],
  // Row 18
  [1, 1, 1, 1, 1, 1, 2, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 2, 1, 1, 1, 1, 1, 1],
  // Row 19
  [1, 1, 1, 1, 1, 1, 2, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 2, 1, 1, 1, 1, 1, 1],
  // Row 20
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  // Row 21
  [1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1],
  // Row 22
  [1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1],
  // Row 23
  [1, 3, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 0, 0, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 3, 1],
  // Row 24
  [1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1],
  // Row 25
  [1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1],
  // Row 26
  [1, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 1],
  // Row 27
  [1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
  // Row 28
  [1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
  // Row 29
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  // Row 30
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// Spawn Positions (tile coordinates)
export const PLAYER_START_POS = { col: 13, row: 23 };

export const GHOST_CONFIGS = {
  BLINKY: {
    startPos: { col: 13, row: 11 },
    scatterTarget: { col: 25, row: -3 }, // Authentic top-right off-maze target
    color: GHOST_COLORS.BLINKY,
    name: 'Blinky (Tracer)',
  },
  PINKY: {
    startPos: { col: 13, row: 14 },
    scatterTarget: { col: 2, row: -3 }, // Authentic top-left off-maze target
    color: GHOST_COLORS.PINKY,
    name: 'Pinky (Infiltrator)',
  },
  INKY: {
    startPos: { col: 12, row: 14 },
    scatterTarget: { col: 27, row: 31 }, // Authentic bottom-right off-maze target
    color: GHOST_COLORS.INKY,
    name: 'Inky (Glitch)',
  },
  CLYDE: {
    startPos: { col: 15, row: 14 },
    scatterTarget: { col: 0, row: 31 }, // Authentic bottom-left off-maze target
    color: GHOST_COLORS.CLYDE,
    name: 'Clyde (Rogue)',
  },
};
