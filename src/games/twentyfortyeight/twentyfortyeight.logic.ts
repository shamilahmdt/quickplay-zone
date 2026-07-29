export interface Tile {
  id: number;
  value: number;
  r: number;
  c: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export const spawnTile = (tiles: Tile[], nextTileIdRef: { current: number }): Tile[] => {
  const emptyCells: { r: number; c: number }[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!tiles.some(t => t.r === r && t.c === c)) {
        emptyCells.push({ r, c });
      }
    }
  }
  if (emptyCells.length === 0) return tiles;
  const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const val = Math.random() < 0.9 ? 2 : 4;
  const newTile: Tile = { id: nextTileIdRef.current++, value: val, r: cell.r, c: cell.c };
  return [...tiles, newTile];
};

export const checkGameOver2048 = (tiles: Tile[]): boolean => {
  if (tiles.length < 16) return false;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const t1 = tiles.find(t => t.r === r && t.c === c);
      const t2 = tiles.find(t => t.r === r && t.c === c + 1);
      if (t1 && t2 && t1.value === t2.value) return false;
    }
  }
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 3; r++) {
      const t1 = tiles.find(t => t.r === r && t.c === c);
      const t2 = tiles.find(t => t.r === r + 1 && t.c === c);
      if (t1 && t2 && t1.value === t2.value) return false;
    }
  }
  return true;
};
