import { BRICK_BREAKER_CONFIG } from './brick-breaker.config';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type BlockModel = 'CLASSIC' | 'PYRAMID' | 'CHESSBOARD' | 'FORTRESS' | 'DIAMOND' | 'INVADERS';

export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  status: 1 | 0;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
}

export const BLOCK_MODELS_INFO: { id: BlockModel; name: string; description: string }[] = [
  { id: 'CLASSIC', name: 'Classic', description: 'Standard full brick wall layout' },
  { id: 'PYRAMID', name: 'Pyramid', description: 'Triangular block structure' },
  { id: 'CHESSBOARD', name: 'Checkerboard', description: 'Alternating grid pattern' },
  { id: 'FORTRESS', name: 'Fortress', description: 'Heavy outer wall defensive layout' },
  { id: 'DIAMOND', name: 'Diamond', description: 'Centered diamond formation' },
  { id: 'INVADERS', name: 'Invader', description: 'Retro space creature layout' },
];

export const generateBricks = (model: BlockModel): Brick[][] => {
  const cols = BRICK_BREAKER_CONFIG.BRICK_COLUMN_COUNT;
  const rows = 6;
  const bricks: Brick[][] = [];
  const palette = BRICK_BREAKER_CONFIG.COLORS.brickPalette;

  for (let c = 0; c < cols; c++) {
    bricks[c] = [];
    for (let r = 0; r < rows; r++) {
      let active = true;

      switch (model) {
        case 'PYRAMID': {
          // Pyramid shape: wider towards bottom
          const midCol = Math.floor(cols / 2);
          const colDist = Math.abs(c - midCol);
          active = r >= colDist;
          break;
        }

        case 'CHESSBOARD': {
          // Checkerboard pattern
          active = (c + r) % 2 === 0;
          break;
        }

        case 'FORTRESS': {
          // Outer border plus center target core
          const isBorder = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
          const isCore = r === 3 && c === Math.floor(cols / 2);
          active = isBorder || isCore;
          break;
        }

        case 'DIAMOND': {
          // Diamond pattern centered
          const midCol = Math.floor(cols / 2);
          const midRow = Math.floor(rows / 2);
          const dist = Math.abs(c - midCol) + Math.abs(r - midRow);
          active = dist <= 2;
          break;
        }

        case 'INVADERS': {
          // Space invader matrix (6 rows x 7 cols)
          const invaderMatrix = [
            [0, 1, 0, 0, 0, 1, 0],
            [0, 0, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 0],
            [1, 1, 0, 1, 0, 1, 1],
            [1, 1, 1, 1, 1, 1, 1],
            [1, 0, 1, 0, 1, 0, 1],
          ];
          active = invaderMatrix[r]?.[c] === 1;
          break;
        }

        case 'CLASSIC':
        default:
          active = true;
          break;
      }

      bricks[c][r] = {
        x: c * (BRICK_BREAKER_CONFIG.BRICK_WIDTH + BRICK_BREAKER_CONFIG.BRICK_PADDING) + BRICK_BREAKER_CONFIG.BRICK_OFFSET_TOP,
        y: r * (BRICK_BREAKER_CONFIG.BRICK_HEIGHT + BRICK_BREAKER_CONFIG.BRICK_PADDING) + BRICK_BREAKER_CONFIG.BRICK_OFFSET_LEFT,
        width: BRICK_BREAKER_CONFIG.BRICK_WIDTH,
        height: BRICK_BREAKER_CONFIG.BRICK_HEIGHT,
        status: active ? 1 : 0,
        color: palette[r % palette.length],
      };
    }
  }

  return bricks;
};

export const createParticles = (x: number, y: number, color: string): Particle[] => {
  const particles: Particle[] = [];
  for (let i = 0; i < 14; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      color,
      alpha: 1,
      decay: Math.random() * 0.03 + 0.02,
      size: Math.random() * 3 + 1,
    });
  }
  return particles;
};
