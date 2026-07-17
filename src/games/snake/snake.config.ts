export const SNAKE_CONFIG = {
  GRID_SIZE: 20, // number of cells horizontally and vertically
  CELL_SIZE: 20, // size of cell in px
  SPEED_DECREMENT: 4, // speed increase per food item
  MIN_SPEED: 50, // speed limit cap
  DIFFICULTY_SPEEDS: {
    EASY: 180, // slower tick rate
    MEDIUM: 130, // moderate tick rate
    HARD: 80 // fast tick rate
  },
  COLORS: {
    boardBg: '#0d0d0f',
    boardBorder: '#1e293b',
    snakeHead: '#ffffff',
    snakeBody: '#94a3b8',
    food: '#e2e8f0',
    gridLines: '#1a1a1f'
  }
};
export default SNAKE_CONFIG;
