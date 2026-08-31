import type { GameMeta } from './types';
import Snake from '../games/snake/Snake';
import CosmicDefender from '../games/cosmic-defender/CosmicDefender';
import BrickBreaker from '../games/brick-breaker/BrickBreaker';
import SimonSays from '../games/simon-says/SimonSays';
import NeonPong from '../games/neon-pong/NeonPong';
import TwentyFortyEight from '../games/twentyfortyeight/TwentyFortyEight';
import Bounce from '../games/bounce/Bounce';
import FlappyPacket from '../games/flappy-packet/FlappyPacket';
import GridBlocks from '../games/grid-blocks/GridBlocks';
import HighwayCrosser from '../games/highway-crosser/HighwayCrosser';
import MalwareSweeper from '../games/malware-sweeper/MalwareSweeper';

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
  {
    id: 'brick_breaker',
    name: 'Brick Breaker',
    description: 'Bounce the ball to smash the neon bricks. Don\'t let it drop! Clear the board to score big.',
    thumbnail: '🧱',
    category: 'Arcade',
    controls: ['Left/Right Arrows: Move Paddle', 'Spacebar: Pause game'],
    component: BrickBreaker,
  },
  {
    id: 'simon_says',
    name: 'Simon Says',
    description: 'Watch the pattern, repeat the sequence — how far can you go? A classic memory game with retro vibes.',
    thumbnail: '🎵',
    category: 'Memory',
    controls: ['Tap tiles: Repeat sequence', 'Sound toggle: Top left'],
    component: SimonSays,
  },
  {
    id: "neon_pong",
    name: "Neon Pong",
    description: "Classic retro tennis. Play against the AI or challenge a friend locally!",
    thumbnail: "🏓",
    category: "Sports",
    controls: ["W/S: Move Left Paddle", "Up/Down: Move Right Paddle", "Space: Pause"],
    component: NeonPong,
  },
  {
    id: 'twentyfortyeight',
    name: '2048 Puzzle',
    description: 'Slide tiles and merge matching numbers to reach the legendary 2048 tile.',
    thumbnail: '🔢',
    category: 'Puzzle',
    controls: ['W/A/S/D / Arrows: Slide tiles', 'R: Restart game', 'Mobile: Swipe grid to slide tiles'],
    component: TwentyFortyEight,
  },
  {
    id: 'bounce',
    name: 'Bounce Retro',
    description: 'Roll and bounce a red ball through obstacles, collect golden rings, and reach the exit portal. Nostalgic arcade platformer physics.',
    thumbnail: '🔴',
    category: 'Arcade',
    controls: ['A/D / Left/Right Arrows: Roll left & right', 'W / Up Arrow: Jump/Bounce', 'Spacebar: Pause game'],
    component: Bounce,
  },
  {
    id: 'flappy_packet',
    name: 'Flappy Packet',
    description: 'Fly your data packet safely through vertical firewall gaps without crashing.',
    thumbnail: '🐤',
    category: 'Arcade',
    controls: ['Spacebar / Tap Screen: Jump / Flap upward'],
    component: FlappyPacket,
  },
  {
    id: 'grid_blocks',
    name: 'Grid Blocks',
    description: 'Rotate and fit monochrome geometric blocks to clear rows in this classic arcade puzzle game.',
    thumbnail: '🧱',
    category: 'Puzzle',
    controls: ['A/D / Left/Right: Move Blocks', 'W / Up Arrow: Rotate', 'Space: Hard Drop', 'S / Down Arrow: Soft Drop'],
    component: GridBlocks,
  },
  {
    id: 'highway_crosser',
    name: 'Highway Crosser',
    description: 'Cross the multi-lane highway by hopping between vehicles and platforms. Avoid collisions and reach the other side.',
    thumbnail: '🐸',
    category: 'Arcade',
    controls: ['Arrow Keys / WASD: Move', 'Space: Pause game'],
    component: HighwayCrosser,
  },
  {
    id: 'malware_sweeper',
    name: 'Malware Sweeper',
    description: 'Scan and isolate infected memory sectors. Identify all malware nodes before they compromise the system.',
    thumbnail: '💣',
    category: 'Puzzle',
    controls: ['Left Click / Tap: Reveal sector', 'Right Click / Long Press: Flag suspect sector'],
    component: MalwareSweeper,
  }
];

export const getGameById = (id: string): GameMeta | undefined => {
  return gameRegistry.find((game) => game.id === id);
};
export default gameRegistry;
