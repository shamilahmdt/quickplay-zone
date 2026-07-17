export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export interface Position {
  x: number;
  y: number;
}

export const getRandomPosition = (gridSize: number, exclude: Position[]): Position => {
  let position: Position;
  let isExcluded = true;

  while (isExcluded) {
    position = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
    };
    isExcluded = exclude.some(segment => segment.x === position.x && segment.y === position.y);
  }

  return position!;
};

export const checkCollision = (head: Position, body: Position[], gridSize: number): boolean => {
  // Border collision
  if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
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
