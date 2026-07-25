// ─── Neon Pong Configuration ──────────────────────────────────────────────────

export const PONG_CONFIG = {
  // Canvas logical dimensions
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 500,

  // Paddle dimensions
  PADDLE_WIDTH: 12,
  PADDLE_HEIGHT: 90,
  PADDLE_SPEED: 6,

  // Ball settings
  BALL_SIZE: 10,
  BALL_INITIAL_SPEED: 5,
  BALL_MAX_SPEED: 14,
  BALL_SPEED_INCREMENT: 0.3,

  // Win condition
  WIN_SCORE: 10,

  // AI reaction speeds per difficulty
  AI_SPEED: {
    EASY: 2.8,
    MEDIUM: 4.5,
    HARD: 6.8,
  } as Record<'EASY' | 'MEDIUM' | 'HARD', number>,

  // AI predict randomness offset (simulates human errors)
  AI_ERROR_RANGE: {
    EASY: 55,
    MEDIUM: 28,
    HARD: 6,
  } as Record<'EASY' | 'MEDIUM' | 'HARD', number>,

  // Neon color palette
  COLORS: {
    bg: '#070710',
    centerLine: '#1a1a3e',
    playerPaddle: '#a855f7',   // Purple
    playerGlow: 'rgba(168,85,247,0.6)',
    aiPaddle: '#22d3ee',       // Cyan
    aiGlow: 'rgba(34,211,238,0.6)',
    ball: '#f0abfc',           // Fuchsia-ish
    ballGlow: 'rgba(240,171,252,0.9)',
    trailColor: 'rgba(240,171,252,0.18)',
    scoreText: '#e2e8f0',
    dividerLine: 'rgba(255,255,255,0.06)',
    netDash: 'rgba(255,255,255,0.08)',
  },

  STORAGE_KEY: 'neon_pong',
} as const;

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type GameMode = 'vs_ai' | 'pvp';
export type GameStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';
