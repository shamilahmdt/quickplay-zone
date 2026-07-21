export const BRICK_BREAKER_CONFIG = {
  CANVAS_WIDTH: 400,
  CANVAS_HEIGHT: 400,
  PADDLE_WIDTH: 84,
  PADDLE_HEIGHT: 12,
  PADDLE_OFFSET_BOTTOM: 15,
  BALL_RADIUS: 6,
  BRICK_COLUMN_COUNT: 7,
  BRICK_WIDTH: 50,
  BRICK_HEIGHT: 16,
  BRICK_PADDING: 5,
  BRICK_OFFSET_TOP: 40,
  BRICK_OFFSET_LEFT: 10,
  PADDLE_SPEED: 8,
  DIFFICULTY_SPEEDS: {
    EASY: 3.5,
    MEDIUM: 5.0,
    HARD: 6.8,
  },
  COLORS: {
    boardBg: '#09090b',
    paddleBg: '#f8fafc',
    ballBg: '#22d3ee',
    brickPalette: [
      '#ef4444', // Red
      '#f97316', // Orange
      '#eab308', // Yellow
      '#22c55e', // Green
      '#06b6d4', // Cyan
      '#3b82f6', // Blue
      '#a855f7', // Purple
      '#ec4899', // Pink
    ],
  },
};

export default BRICK_BREAKER_CONFIG;
