export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type BoardModel = 'CLASSIC' | 'BOX' | 'MAZE' | 'CROSS' | 'ROOMS';

export interface Position {
  x: number;
  y: number;
}

export const BOARD_MODELS_INFO: { id: BoardModel; name: string; description: string }[] = [
  { id: 'CLASSIC', name: 'Open Arena', description: 'Clear open grid without inner obstacles' },
  { id: 'BOX', name: 'Inner Ring', description: 'Square inner barrier ring' },
  { id: 'MAZE', name: 'Twin Pillars', description: 'Dual vertical barrier columns' },
  { id: 'CROSS', name: 'Plus Cross', description: 'Plus-shaped obstacles with open spawn hub' },
  { id: 'ROOMS', name: '4 Chambers', description: 'Divided room walls with wide doorway corridors' },
];

export const generateObstacles = (model: BoardModel, gridSize = 20): Position[] => {
  const rawObstacles: Position[] = [];

  switch (model) {
    case 'BOX': {
      // Square inner ring barrier
      for (let i = 5; i <= 14; i++) {
        rawObstacles.push({ x: i, y: 5 });
        rawObstacles.push({ x: i, y: 14 });
        rawObstacles.push({ x: 5, y: i });
        rawObstacles.push({ x: 14, y: i });
      }
      break;
    }

    case 'MAZE': {
      // Twin vertical pillars with center gaps
      for (let y = 3; y <= 16; y++) {
        if (y < 8 || y > 11) {
          rawObstacles.push({ x: 5, y });
          rawObstacles.push({ x: 14, y });
        }
      }
      break;
    }

    case 'CROSS': {
      // Plus cross with spacious central intersection
      for (let i = 2; i <= 17; i++) {
        // Horizontal arm
        if (i < 8 || i > 11) {
          rawObstacles.push({ x: i, y: 10 });
        }
        // Vertical arm
        if (i < 7 || i > 13) {
          rawObstacles.push({ x: 10, y: i });
        }
      }
      break;
    }

    case 'ROOMS': {
      // 4 chamber walls with wide doorway gaps
      // Vertical central wall (top & bottom segments, open in middle for spawn)
      for (let y = 2; y <= 6; y++) rawObstacles.push({ x: 10, y });
      for (let y = 14; y <= 18; y++) rawObstacles.push({ x: 10, y });

      // Horizontal central wall (left & right segments)
      for (let x = 2; x <= 6; x++) rawObstacles.push({ x, y: 10 });
      for (let x = 14; x <= 18; x++) rawObstacles.push({ x, y: 10 });

      // Corner pillars for chamber feel
      rawObstacles.push({ x: 5, y: 5 }, { x: 14, y: 5 }, { x: 5, y: 14 }, { x: 14, y: 14 });
      break;
    }

    case 'CLASSIC':
    default:
      break;
  }

  // Filter out any obstacles in the snake spawn area: x [9..11], y [7..13]
  return rawObstacles.filter((obs) => {
    const isSpawnCorridor = obs.x >= 9 && obs.x <= 11 && obs.y >= 7 && obs.y <= 13;
    return !isSpawnCorridor;
  });
};

export const getRandomPosition = (gridSize: number, exclude: Position[]): Position => {
  let position: Position;
  let isExcluded = true;

  while (isExcluded) {
    position = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
    };
    isExcluded = exclude.some((segment) => segment.x === position.x && segment.y === position.y);
  }

  return position!;
};

export const checkCollision = (
  head: Position,
  body: Position[],
  obstacles: Position[],
  gridSize: number,
  wallMode: boolean
): boolean => {
  // Border collision in solid wall mode
  if (wallMode && (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize)) {
    return true;
  }
  // Obstacle collision
  if (obstacles.some((obs) => obs.x === head.x && obs.y === head.y)) {
    return true;
  }
  // Self collision
  return body.some((segment) => segment.x === head.x && segment.y === head.y);
};

export const getNextHead = (currentHead: Position, direction: Direction): Position => {
  switch (direction) {
    case 'UP':
      return { x: currentHead.x, y: currentHead.y - 1 };
    case 'DOWN':
      return { x: currentHead.x, y: currentHead.y + 1 };
    case 'LEFT':
      return { x: currentHead.x - 1, y: currentHead.y };
    case 'RIGHT':
      return { x: currentHead.x + 1, y: currentHead.y };
    default:
      return currentHead;
  }
};
