import type { GameMeta } from './types';
import Snake from '../games/snake/Snake';

export const gameRegistry: GameMeta[] = [
  {
    id: 'snake',
    name: 'Snake Classic',
    description: 'Slither through the grid, eat silver bits, and avoid colliding with walls or your own tail. Classic arcade speed-up logic included.',
    thumbnail: '🐍',
    category: 'Arcade',
    controls: ['W/A/S/D / Arrows: Directional move', 'Spacebar: Pause game'],
    component: Snake,
  },
];

export const getGameById = (id: string): GameMeta | undefined => {
  return gameRegistry.find((game) => game.id === id);
};
export default gameRegistry;
