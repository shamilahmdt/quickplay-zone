import type { GameMeta } from './types';
import Snake from '../games/snake/Snake';
import CosmicDefender from '../games/cosmic-defender/CosmicDefender';

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
  {
    id: 'cosmic_defender',
    name: 'Cosmic Defender',
    description: 'Defend the galaxy from waves of hostile alien invaders. Move left/right to aim, shoot lasers, and survive!',
    thumbnail: '🚀',
    category: 'Arcade',
    controls: ['A/D / Arrow Keys: Move Ship', 'Spacebar: Fire Lasers'],
    component: CosmicDefender,
  },
];

export const getGameById = (id: string): GameMeta | undefined => {
  return gameRegistry.find((game) => game.id === id);
};
export default gameRegistry;
