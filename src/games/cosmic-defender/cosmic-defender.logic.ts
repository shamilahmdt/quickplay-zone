import { COSMIC_DEFENDER_CONFIG } from './cosmic-defender.config';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Bullet {
  x: number;
  y: number;
  speed: number;
}

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  points: number;
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

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

export const createStarfield = (width: number, height: number, count = COSMIC_DEFENDER_CONFIG.STAR_COUNT): Star[] => {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 1.5 + 0.5,
    });
  }
  return stars;
};

export const createExplosionParticles = (x: number, y: number, color: string): Particle[] => {
  const particles: Particle[] = [];
  for (let i = 0; i < 15; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      color,
      alpha: 1,
      decay: Math.random() * 0.03 + 0.01,
      size: Math.random() * 3 + 1,
    });
  }
  return particles;
};

export const generateEnemy = (canvasWidth: number, baseSpeed: number): Enemy => {
  const enemyType = Math.random();
  let width = 20;
  let height = 15;
  let points = 50;
  let color = COSMIC_DEFENDER_CONFIG.COLORS.enemyStandard;

  if (enemyType < 0.2) {
    // Gold speedster enemy
    width = 16;
    height = 12;
    points = 150;
    color = COSMIC_DEFENDER_CONFIG.COLORS.enemyFast;
  } else if (enemyType < 0.4) {
    // Heavy green enemy
    width = 28;
    height = 20;
    points = 80;
    color = COSMIC_DEFENDER_CONFIG.COLORS.enemyHeavy;
  }

  const speedMultiplier = enemyType < 0.2 ? 1.5 : enemyType < 0.4 ? 0.75 : 1;

  return {
    x: Math.random() * (canvasWidth - 40) + 20,
    y: -20,
    width,
    height,
    speed: baseSpeed * speedMultiplier,
    points,
    color,
  };
};
