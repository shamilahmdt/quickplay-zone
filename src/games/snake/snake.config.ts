export const SNAKE_CONFIG = {
  GRID_SIZE: 20, // number of cells horizontally and vertically
  CELL_SIZE: 20, // size of cell in px
  SPEED_DECREMENT: 3, // speed increase per food item
  MIN_SPEED: 50, // speed limit cap
  DIFFICULTY_SPEEDS: {
    EASY: 160, // slower tick rate
    MEDIUM: 110, // moderate tick rate
    HARD: 70, // fast tick rate
  },
  COLORS: {
    boardBg: '#09090b',
    boardBorder: '#27272a',
    snakeHead: '#ffffff',
    snakeHeadEye: '#09090b',
    snakeBody: '#94a3b8',
    food: '#e2e8f0',
    goldenFood: '#f59e0b',
    obstacle: '#3f3f46',
    obstacleBorder: '#52525b',
    gridLines: 'rgba(255, 255, 255, 0.03)',
  },
};

export default SNAKE_CONFIG;
