export const COSMIC_DEFENDER_CONFIG = {
  CANVAS_WIDTH: 400,
  CANVAS_HEIGHT: 400,
  PLAYER_SPEED: 6,
  BULLET_SPEED: 8,
  PLAYER_Y: 350,
  PLAYER_WIDTH: 24,
  PLAYER_HEIGHT: 20,
  STAR_COUNT: 50,
  DIFFICULTY_SETTINGS: {
    EASY: {
      enemySpeed: 1.2,
      spawnRate: 100,
      shootCooldown: 80,
    },
    MEDIUM: {
      enemySpeed: 2.2,
      spawnRate: 65,
      shootCooldown: 120,
    },
    HARD: {
      enemySpeed: 3.8,
      spawnRate: 38,
      shootCooldown: 160,
    },
  },
  COLORS: {
    boardBg: '#09090b',
    player: '#f8fafc',
    bullet: '#22d3ee',
    enemyStandard: '#ec4899',
    enemyFast: '#f59e0b',
    enemyHeavy: '#10b981',
  },
};

export default COSMIC_DEFENDER_CONFIG;
