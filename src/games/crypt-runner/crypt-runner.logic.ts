// ─────────────────────────────────────────────────────────────────────────────
// Cyber Crypt Runner — Core Game Logic & AI
// ─────────────────────────────────────────────────────────────────────────────

import {
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
  CANVAS_W,
  TILE_WALL,
  TILE_DOT,
  TILE_POWER,
  TILE_GATE,
  TILE_GHOST_HOUSE,
  BASE_MAZE,
  PLAYER_START_POS,
  GHOST_CONFIGS,
  CRUISE_ELROY_CONFIG,
  TUNNEL_SPEED_FACTOR,
  GHOST_HOUSE_DOT_THRESHOLDS,
  RESTRICTED_UP_TILES,
} from './crypt-runner.config';
import type { Difficulty } from './crypt-runner.config';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

export const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
  UP: { dx: 0, dy: -1 },
  DOWN: { dx: 0, dy: 1 },
  LEFT: { dx: -1, dy: 0 },
  RIGHT: { dx: 1, dy: 0 },
  NONE: { dx: 0, dy: 0 },
};

export const OPPOSITE_DIR: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
  NONE: 'NONE',
};

export const DIR_ANGLE: Record<Direction, number> = {
  RIGHT: 0,
  DOWN: Math.PI * 0.5,
  LEFT: Math.PI,
  UP: Math.PI * 1.5,
  NONE: 0,
};

export type GhostState = 'CHASE' | 'SCATTER' | 'FRIGHTENED' | 'EATEN';
export type GhostId = 'BLINKY' | 'PINKY' | 'INKY' | 'CLYDE';

export interface PlayerEntity {
  x: number; // canvas pixels (center)
  y: number;
  col: number;
  row: number;
  currentDir: Direction;
  nextDir: Direction;
  mouthAngle: number;
  mouthDir: 1 | -1;
  isDying: boolean;
  deathTimer: number; // 0 to 1
}

export interface GhostEntity {
  id: GhostId;
  name: string;
  x: number;
  y: number;
  col: number;
  row: number;
  dir: Direction;
  state: GhostState;
  color: string;
  inHouse: boolean;
  isRegenerating: boolean; // True when eaten eyes are descending into house at (13, 14) to revive
  exitTimer: number; // seconds until exit fallback
  scatterTarget: { col: number; row: number };
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  alpha: number;
  life: number; // seconds remaining
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface GameState {
  grid: number[][];
  dotsRemaining: number;
  dotsEatenInRound: number; // dots collected in current round/life for ghost release
  player: PlayerEntity;
  ghosts: Record<GhostId, GhostEntity>;
  score: number;
  lives: number;
  round: number;
  difficulty: Difficulty;
  frightenedTimer: number; // ms remaining
  frightenedDuration: number;
  consecutiveGhostsEaten: number;
  modeTimer: number; // seconds in current scatter/chase cycle
  modeIndex: number;
  isScatter: boolean;
  floatingTexts: FloatingText[];
  particles: Particle[];
  roundClearTimer: number; // if > 0, round clear animation in progress
  readyCountdown: number; // if > 0, "READY!" banner delay
}

/** Clone initial maze grid */
export const createInitialGrid = (): { grid: number[][]; dotCount: number } => {
  let dotCount = 0;
  const grid = BASE_MAZE.map((row) =>
    row.map((cell) => {
      if (cell === TILE_DOT || cell === TILE_POWER) {
        dotCount++;
      }
      return cell;
    })
  );
  return { grid, dotCount };
};

/** Initialize or reset player entity */
export const createInitialPlayer = (): PlayerEntity => ({
  x: PLAYER_START_POS.col * TILE_SIZE + TILE_SIZE / 2,
  y: PLAYER_START_POS.row * TILE_SIZE + TILE_SIZE / 2,
  col: Math.floor(PLAYER_START_POS.col),
  row: Math.floor(PLAYER_START_POS.row),
  currentDir: 'LEFT',
  nextDir: 'LEFT',
  mouthAngle: 0.25,
  mouthDir: 1,
  isDying: false,
  deathTimer: 0,
});

/** Initialize ghosts */
export const createInitialGhosts = (difficulty: Difficulty): Record<GhostId, GhostEntity> => {
  const exitDelays: Record<Difficulty, Record<GhostId, number>> = {
    EASY: { BLINKY: 0, PINKY: 0.5, INKY: 4.0, CLYDE: 7.0 },
    MEDIUM: { BLINKY: 0, PINKY: 0.2, INKY: 3.0, CLYDE: 5.5 },
    HARD: { BLINKY: 0, PINKY: 0.0, INKY: 2.0, CLYDE: 4.0 },
  };

  const delays = exitDelays[difficulty];

  const makeGhost = (id: GhostId): GhostEntity => {
    const cfg = GHOST_CONFIGS[id];
    return {
      id,
      name: cfg.name,
      x: tileCenter(cfg.startPos.col),
      y: tileCenter(cfg.startPos.row),
      col: cfg.startPos.col,
      row: cfg.startPos.row,
      dir: id === 'BLINKY' ? 'LEFT' : 'UP',
      state: 'SCATTER',
      color: cfg.color,
      inHouse: id !== 'BLINKY',
      isRegenerating: false,
      exitTimer: delays[id],
      scatterTarget: cfg.scatterTarget,
    };
  };

  return {
    BLINKY: makeGhost('BLINKY'),
    PINKY: makeGhost('PINKY'),
    INKY: makeGhost('INKY'),
    CLYDE: makeGhost('CLYDE'),
  };
};

/**
 * Check if given grid tile is blocked.
 * Handles tunnel wrapping rows.
 */
export const isTileBlocked = (
  grid: number[][],
  col: number,
  row: number,
  isGhost: boolean = false,
  isGhostEaten: boolean = false
): boolean => {
  // Row 14 is the side tunnel wrap
  if (row === 14 && (col < 0 || col >= GRID_COLS)) {
    return false;
  }

  if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
    return true;
  }

  const tile = grid[row][col];
  if (tile === TILE_WALL) return true;

  if (tile === TILE_GATE || tile === TILE_GHOST_HOUSE) {
    // Only eaten ghosts can pass into gate or ghost house from outside
    return !isGhost || !isGhostEaten;
  }

  return false;
};

/** Convert pixel position to tile index */
export const posToTile = (val: number): number => Math.floor(val / TILE_SIZE);

/** Get center pixel of a tile */
export const tileCenter = (tile: number): number => tile * TILE_SIZE + TILE_SIZE / 2;

/**
 * Update player position with corner turning tolerance.
 */
export const updatePlayerPosition = (
  player: PlayerEntity,
  grid: number[][],
  speedPxPerSec: number,
  dt: number
): void => {
  if (player.isDying) {
    player.deathTimer = Math.min(1, player.deathTimer + dt * 1.5);
    return;
  }

  // Update mouth animation
  player.mouthAngle += player.mouthDir * dt * 4.5;
  if (player.mouthAngle > 0.35) {
    player.mouthAngle = 0.35;
    player.mouthDir = -1;
  } else if (player.mouthAngle < 0.02) {
    player.mouthAngle = 0.02;
    player.mouthDir = 1;
  }

  const currentTileCol = posToTile(player.x);
  const currentTileRow = posToTile(player.y);
  player.col = currentTileCol;
  player.row = currentTileRow;

  const targetCenterCol = tileCenter(currentTileCol);
  const targetCenterRow = tileCenter(currentTileRow);

  // Try to turn to nextDir if buffered
  if (player.nextDir !== 'NONE' && player.nextDir !== player.currentDir) {
    // Immediate 180 reverse does not require alignment
    if (player.nextDir === OPPOSITE_DIR[player.currentDir]) {
      player.currentDir = player.nextDir;
    } else {
      // Perpendicular turn: check if close to tile center
      const deltaX = Math.abs(player.x - targetCenterCol);
      const deltaY = Math.abs(player.y - targetCenterRow);
      const CORNER_THRESHOLD = Math.max(4, speedPxPerSec * dt * 1.5);

      const nextDelta = DIR_DELTA[player.nextDir];
      const nextTileBlocked = isTileBlocked(grid, currentTileCol + nextDelta.dx, currentTileRow + nextDelta.dy, false);

      if (!nextTileBlocked) {
        const canTurn =
          (player.nextDir === 'UP' || player.nextDir === 'DOWN')
            ? deltaX <= CORNER_THRESHOLD
            : deltaY <= CORNER_THRESHOLD;

        if (canTurn) {
          player.x = targetCenterCol;
          player.y = targetCenterRow;
          player.currentDir = player.nextDir;
        }
      }
    }
  }

  // Move in currentDir
  if (player.currentDir !== 'NONE') {
    const delta = DIR_DELTA[player.currentDir];
    const moveDist = speedPxPerSec * dt;
    const nextTileBlocked = isTileBlocked(grid, currentTileCol + delta.dx, currentTileRow + delta.dy, false);

    if (nextTileBlocked) {
      // Approaching blocked tile: stop at center
      if (player.currentDir === 'RIGHT' && player.x + moveDist >= targetCenterCol) {
        player.x = targetCenterCol;
        player.currentDir = 'NONE';
      } else if (player.currentDir === 'LEFT' && player.x - moveDist <= targetCenterCol) {
        player.x = targetCenterCol;
        player.currentDir = 'NONE';
      } else if (player.currentDir === 'DOWN' && player.y + moveDist >= targetCenterRow) {
        player.y = targetCenterRow;
        player.currentDir = 'NONE';
      } else if (player.currentDir === 'UP' && player.y - moveDist <= targetCenterRow) {
        player.y = targetCenterRow;
        player.currentDir = 'NONE';
      } else {
        player.x += delta.dx * moveDist;
        player.y += delta.dy * moveDist;
      }
    } else {
      player.x += delta.dx * moveDist;
      player.y += delta.dy * moveDist;
    }

    // Tunnel wrap (row 14)
    if (currentTileRow === 14) {
      if (player.x < -TILE_SIZE / 2) {
        player.x = CANVAS_W + TILE_SIZE / 2;
      } else if (player.x > CANVAS_W + TILE_SIZE / 2) {
        player.x = -TILE_SIZE / 2;
      }
    }
  }
};

/**
 * Determine ghost target tile based on individual personality & game state.
 * Faithfully implements the authentic arcade Pac-Man algorithms from the Pac-Man Dossier:
 * - Blinky (Shadow): Direct stalker on player tile. Features Cruise Elroy (scatter immunity at low dot count).
 * - Pinky (Speedy): Targets 4 tiles ahead of player, with the authentic arcade UP-overflow quirk.
 * - Inky (Bashful): Dual-vector ambusher. Pivots 2 tiles ahead of player with UP quirk and doubles vector from Blinky.
 * - Clyde (Pokey): Proximity coward (targets player when >= 8 tiles away; retreats to scatter corner when < 8 tiles).
 * - Eaten (Eyes): Returns to the gate tile above ghost house (13, 11).
 */
export const getGhostTarget = (
  ghost: GhostEntity,
  player: PlayerEntity,
  blinky: GhostEntity,
  isScatter: boolean,
  dotsRemaining: number = 244
): { col: number; row: number } => {
  if (ghost.state === 'EATEN') {
    // Return to ghost house gate above the house
    return { col: 13, row: 11 };
  }

  // Blinky Cruise Elroy check:
  // When dots drop to Elroy 1 threshold (20 dots), Blinky ignores scatter waves
  // and stays permanently in Chase mode!
  const isBlinkyElroy = ghost.id === 'BLINKY' && dotsRemaining <= CRUISE_ELROY_CONFIG.ELROY_1_DOTS;

  if (isScatter && !isBlinkyElroy) {
    return ghost.scatterTarget;
  }

  // Chase Mode Targeting
  switch (ghost.id) {
    case 'BLINKY':
      // Direct chase to player tile
      return { col: player.col, row: player.row };

    case 'PINKY': {
      // 4 tiles ahead of player in facing direction.
      // Authentic Arcade UP Quirk:
      // Due to an overflow bug in original Pac-Man assembly, when Pac-Man is facing UP,
      // the target tile is 4 tiles UP and 4 tiles LEFT!
      if (player.currentDir === 'UP') {
        return {
          col: player.col - 4,
          row: player.row - 4,
        };
      }
      const delta = DIR_DELTA[player.currentDir];
      return {
        col: player.col + delta.dx * 4,
        row: player.row + delta.dy * 4,
      };
    }

    case 'INKY': {
      // Complex dual-vector flanking algorithm:
      // Step 1: Intermediate tile 2 tiles ahead of player (with the same UP quirk: 2 UP and 2 LEFT).
      let pivotCol = player.col;
      let pivotRow = player.row;
      if (player.currentDir === 'UP') {
        pivotCol -= 2;
        pivotRow -= 2;
      } else {
        const pDelta = DIR_DELTA[player.currentDir];
        pivotCol += pDelta.dx * 2;
        pivotRow += pDelta.dy * 2;
      }
      // Step 2: Vector from Blinky to pivot, doubled:
      // target = blinky + 2 * (pivot - blinky) = 2 * pivot - blinky
      const vCol = pivotCol - blinky.col;
      const vRow = pivotRow - blinky.row;
      return {
        col: pivotCol + vCol,
        row: pivotRow + vRow,
      };
    }

    case 'CLYDE': {
      // Proximity Coward AI:
      // If distance to player >= 8 tiles: targets player directly (acts like Blinky).
      // If distance to player < 8 tiles: retreats to his Scatter target corner!
      const dist = Math.hypot(ghost.col - player.col, ghost.row - player.row);
      if (dist >= 8) {
        return { col: player.col, row: player.row };
      }
      return ghost.scatterTarget;
    }
  }
};

/**
 * Update a single ghost's movement and AI decisions.
 * Follows the authentic original Pac-Man arcade specification:
 * 1. House bobbing & dot-counter / timer exit
 * 2. Eaten eyes gate entry & house descent to revive
 * 3. Side warp tunnel slowdown (~45% speed)
 * 4. Cruise Elroy speed scaling for Blinky
 * 5. Strict tie-breaking priority: UP > LEFT > DOWN > RIGHT
 * 6. Classic Red Zone restricted UP turns
 * 7. Pseudo-random decision making in Frightened mode
 */
export const updateGhost = (
  ghost: GhostEntity,
  grid: number[][],
  player: PlayerEntity,
  blinky: GhostEntity,
  isScatter: boolean,
  speeds: { normal: number; frightened: number; eaten: number },
  dt: number,
  dotsRemaining: number = 244,
  dotsEatenInRound: number = 0
): void => {
  // 1. Determine current speed
  let speed = speeds.normal;
  if (ghost.state === 'EATEN') {
    speed = speeds.eaten;
  } else if (ghost.state === 'FRIGHTENED') {
    speed = speeds.frightened;
  } else if (ghost.id === 'BLINKY') {
    // Cruise Elroy speed boost for Blinky
    if (dotsRemaining <= CRUISE_ELROY_CONFIG.ELROY_2_DOTS) {
      speed *= CRUISE_ELROY_CONFIG.ELROY_2_SPEED_MULT;
    } else if (dotsRemaining <= CRUISE_ELROY_CONFIG.ELROY_1_DOTS) {
      speed *= CRUISE_ELROY_CONFIG.ELROY_1_SPEED_MULT;
    }
  }

  // 2. Warp Tunnel Slowdown (row 14 side tunnels)
  // Active and frightened ghosts travel slower in warp tunnels. Eaten eyes do not slow down.
  if (ghost.row === 14 && (ghost.col <= 5 || ghost.col >= 22)) {
    if (ghost.state !== 'EATEN') {
      speed *= TUNNEL_SPEED_FACTOR;
    }
  }

  // 3. Eaten Eyes House Descent & Regeneration Sequence
  if (ghost.isRegenerating) {
    ghost.dir = 'DOWN';
    ghost.x = tileCenter(13);
    ghost.y += speeds.eaten * dt;
    if (ghost.y >= tileCenter(14)) {
      ghost.y = tileCenter(14);
      ghost.col = 13;
      ghost.row = 14;
      ghost.isRegenerating = false;
      ghost.state = isScatter ? 'SCATTER' : 'CHASE';
      ghost.inHouse = true;
      ghost.exitTimer = 0; // exit immediately once revived
    }
    return;
  }

  // 4. Handle in-house bobbing / exit sequence
  if (ghost.inHouse) {
    const dotThreshold = GHOST_HOUSE_DOT_THRESHOLDS[ghost.id] ?? 0;
    const canExitByDots = dotsEatenInRound >= dotThreshold;

    if (ghost.exitTimer > 0 && !canExitByDots) {
      ghost.exitTimer -= dt;
      // Gentle bobbing motion inside house
      ghost.y = tileCenter(14) + Math.sin(Date.now() * 0.006) * 3;
      return;
    }

    // Exiting house: align to center col 13, then move straight UP out the gate
    const gateTargetX = tileCenter(13);
    const gateTargetY = tileCenter(11);

    if (Math.abs(ghost.x - gateTargetX) > 1) {
      ghost.x += (gateTargetX > ghost.x ? 1 : -1) * speed * dt;
      ghost.dir = gateTargetX > ghost.x ? 'RIGHT' : 'LEFT';
    } else {
      ghost.x = gateTargetX;
      ghost.y -= speed * dt;
      ghost.dir = 'UP';

      if (ghost.y <= gateTargetY) {
        ghost.y = gateTargetY;
        ghost.col = 13;
        ghost.row = 11;
        ghost.inHouse = false;
        ghost.dir = 'LEFT';
      }
    }
    return;
  }

  // 5. Active Maze Navigation
  let moveDist = speed * dt;
  const nextCol = ghost.col + DIR_DELTA[ghost.dir].dx;
  const nextRow = ghost.row + DIR_DELTA[ghost.dir].dy;
  const targetX = tileCenter(nextCol);
  const targetY = tileCenter(nextRow);
  const distToNext = Math.hypot(targetX - ghost.x, targetY - ghost.y);

  if (moveDist >= distToNext) {
    // Arrived at next tile center!
    ghost.x = targetX;
    ghost.y = targetY;
    ghost.col = nextCol;
    ghost.row = nextRow;
    moveDist -= distToNext;

    // Handle tunnel wrapping on row 14
    if (ghost.row === 14) {
      if (ghost.col < 0) {
        ghost.col = GRID_COLS - 1;
        ghost.x = tileCenter(ghost.col);
      } else if (ghost.col >= GRID_COLS) {
        ghost.col = 0;
        ghost.x = tileCenter(ghost.col);
      }
    }

    // Check if eaten eyes arrived above the ghost house gate (col 13, row 11)
    if (ghost.state === 'EATEN' && (ghost.col === 13 || ghost.col === 14) && ghost.row === 11) {
      ghost.col = 13;
      ghost.x = tileCenter(13);
      ghost.isRegenerating = true;
      ghost.dir = 'DOWN';
      return;
    }

    // Pick next direction at the new tile
    const target = getGhostTarget(ghost, player, blinky, isScatter, dotsRemaining);
    const candidateDirs: Direction[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
    const validDirs: Direction[] = [];
    const isEaten = ghost.state === 'EATEN';

    for (const d of candidateDirs) {
      // Rule 1: Ghosts never reverse at intersections unless forced by wave/power changes
      if (d === OPPOSITE_DIR[ghost.dir]) continue;

      // Rule 2: Classic Pac-Man Red Zone restriction
      // Ghosts cannot turn UP in designated intersections above the ghost house and lower T-blocks
      // (unless in Frightened or Eaten mode)
      if (d === 'UP' && ghost.state !== 'FRIGHTENED' && ghost.state !== 'EATEN') {
        const isRedZone = RESTRICTED_UP_TILES.some(
          (t) => t.col === ghost.col && t.row === ghost.row
        );
        if (isRedZone) continue;
      }

      const delta = DIR_DELTA[d];
      if (!isTileBlocked(grid, ghost.col + delta.dx, ghost.row + delta.dy, true, isEaten)) {
        validDirs.push(d);
      }
    }

    // Dead end fallback (reverse if completely blocked)
    if (validDirs.length === 0) {
      validDirs.push(OPPOSITE_DIR[ghost.dir]);
    }

    if (ghost.state === 'FRIGHTENED') {
      // Frightened mode: pseudo-random selection among valid non-reverse turns
      const randIdx = Math.floor(Math.random() * validDirs.length);
      ghost.dir = validDirs[randIdx];
    } else {
      // Authentic Arcade Rule:
      // Evaluate squared Euclidean distance in strict priority order: UP > LEFT > DOWN > RIGHT.
      // Strict '< bestDistSq' ensures earlier candidate in ['UP', 'LEFT', 'DOWN', 'RIGHT'] wins ties!
      let bestDir = validDirs[0];
      let bestDistSq = Infinity;
      for (const d of validDirs) {
        const delta = DIR_DELTA[d];
        const testCol = ghost.col + delta.dx;
        const testRow = ghost.row + delta.dy;
        const distSq = (testCol - target.col) ** 2 + (testRow - target.row) ** 2;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestDir = d;
        }
      }
      ghost.dir = bestDir;
    }
  }

  // Move in current direction
  ghost.x += DIR_DELTA[ghost.dir].dx * moveDist;
  ghost.y += DIR_DELTA[ghost.dir].dy * moveDist;
};

/**
 * Spawn a burst of cyber particles at (x, y).
 */
export const spawnParticles = (
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count: number = 10
): void => {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 25 + Math.random() * 80;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 2 + Math.random() * 3,
      alpha: 1,
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.8,
    });
  }
};

/**
 * Update particle positions and decay.
 */
export const updateParticles = (particles: Particle[], dt: number): void => {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.alpha = p.life / p.maxLife;
  }
};

/**
 * Update floating text indicators.
 */
export const updateFloatingTexts = (texts: FloatingText[], dt: number): void => {
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life -= dt;
    if (t.life <= 0) {
      texts.splice(i, 1);
      continue;
    }
    t.y -= dt * 25; // float upward
    t.alpha = Math.min(1, t.life * 1.5);
  }
};
