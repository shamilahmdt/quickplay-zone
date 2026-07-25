import { PONG_CONFIG, type Difficulty } from './neon-pong.config';

export interface Position {
  x: number;
  y: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  speed: number;
  dy: number;
}

export interface Ball {
  x: number;
  y: number;
  radius: number;
  speed: number;
  dx: number;
  dy: number;
  trail: Position[];
}

export interface GameState {
  player1: Paddle;
  player2: Paddle;
  ball: Ball;
  mode: 'vs_ai' | 'pvp';
  difficulty: Difficulty;
  status: 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';
  rallyCount: number;
  longestRally: number;
}

export const initGameState = (mode: 'vs_ai' | 'pvp', difficulty: Difficulty = 'MEDIUM'): GameState => {
  return {
    player1: {
      x: 30,
      y: PONG_CONFIG.CANVAS_HEIGHT / 2 - PONG_CONFIG.PADDLE_HEIGHT / 2,
      width: PONG_CONFIG.PADDLE_WIDTH,
      height: PONG_CONFIG.PADDLE_HEIGHT,
      score: 0,
      speed: PONG_CONFIG.PADDLE_SPEED,
      dy: 0,
    },
    player2: {
      x: PONG_CONFIG.CANVAS_WIDTH - 30 - PONG_CONFIG.PADDLE_WIDTH,
      y: PONG_CONFIG.CANVAS_HEIGHT / 2 - PONG_CONFIG.PADDLE_HEIGHT / 2,
      width: PONG_CONFIG.PADDLE_WIDTH,
      height: PONG_CONFIG.PADDLE_HEIGHT,
      score: 0,
      speed: PONG_CONFIG.PADDLE_SPEED,
      dy: 0,
    },
    ball: {
      x: PONG_CONFIG.CANVAS_WIDTH / 2,
      y: PONG_CONFIG.CANVAS_HEIGHT / 2,
      radius: PONG_CONFIG.BALL_SIZE,
      speed: PONG_CONFIG.BALL_INITIAL_SPEED,
      dx: PONG_CONFIG.BALL_INITIAL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      dy: PONG_CONFIG.BALL_INITIAL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      trail: [],
    },
    mode,
    difficulty,
    status: 'IDLE',
    rallyCount: 0,
    longestRally: 0,
  };
};

export const resetBall = (state: GameState, scorer: 1 | 2) => {
  state.ball.x = PONG_CONFIG.CANVAS_WIDTH / 2;
  state.ball.y = PONG_CONFIG.CANVAS_HEIGHT / 2;
  state.ball.speed = PONG_CONFIG.BALL_INITIAL_SPEED;
  state.ball.dx = PONG_CONFIG.BALL_INITIAL_SPEED * (scorer === 1 ? -1 : 1);
  state.ball.dy = PONG_CONFIG.BALL_INITIAL_SPEED * (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5);
  state.ball.trail = [];
  
  if (state.rallyCount > state.longestRally) {
    state.longestRally = state.rallyCount;
  }
  state.rallyCount = 0;
};
