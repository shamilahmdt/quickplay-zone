// ─────────────────────────────────────────────────────────────────────────────
// Cyber Highway Crosser — Main Component
// Architectural reference: FlappyPacket.tsx + GameTemplate.tsx
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import type { FC } from 'react';
import { storage } from '../../core/storage';
import { audio } from '../../core/audio';
import { useTheme } from '../../context/ThemeContext';
import {
  Award, Play, Pause, RotateCcw, Volume2, VolumeX, Server,
} from 'lucide-react';
import HIGHWAY_CONFIG, {
  LANE_CONFIGS, SAFE_ROWS, PLATFORM_ROWS, DIFFICULTY_SPEEDS,
} from './highway-crosser.config';
import type { LaneConfig, Difficulty } from './highway-crosser.config';

// ─── Destructured constants ────────────────────────────────────────────────
const {
  CANVAS_W, CANVAS_H, ROW_HEIGHT, NUM_ROWS,
  PLAYER_W, PLAYER_H, PLAYER_START_ROW, PLAYER_START_X, STEP_X,
  LIVES, DOCK_COUNT, POINTS_PER_DOCK, POINTS_ALL_DOCKS_BONUS,
  SPEED_SCALE_PER_LEVEL, MAX_LEVEL, COLORS,
} = HIGHWAY_CONFIG;

const GAME_ID      = 'highway_crosser';
const DOCK_SLOT_W  = CANVAS_W / DOCK_COUNT; // 96 px per dock slot

// Lookup: canvas row index → LANE_CONFIGS index (built once at module load)
const ROW_TO_LANE_IDX = new Map<number, number>(
  LANE_CONFIGS.map((l: LaneConfig, i: number) => [l.row, i]),
);

const SAFE_SET     = new Set<number>(SAFE_ROWS);
const PLATFORM_SET = new Set<number>(PLATFORM_ROWS);

// ─── Internal interfaces ───────────────────────────────────────────────────
interface CarEntity {
  x: number;
  y: number;
  w: number;
  h: number;
  /** px per frame; negative = leftward */
  speed: number;
  color: string;
  isPlatform: boolean;
  /** Index into LANE_CONFIGS — used to match platforms to their lane. */
  laneIdx: number;
}

interface DockSlot {
  filled: boolean;
  flashFrames: number;
  /** Horizontal centre position in canvas px. */
  centerX: number;
}

// ─── Pure helpers (defined at module scope — no re-creation per render) ─────

/** Centre Y coordinate of a given row. */
const rowCenterY = (row: number): number => row * ROW_HEIGHT + ROW_HEIGHT / 2;

/** Build a fresh set of empty dock slots. */
const makeDocks = (): DockSlot[] =>
  Array.from({ length: DOCK_COUNT }, (_, i) => ({
    filled:      false,
    flashFrames: 0,
    centerX:     i * DOCK_SLOT_W + DOCK_SLOT_W / 2,
  }));

/**
 * Draw a rounded rectangle path.  Avoids relying on `CanvasRenderingContext2D.roundRect`
 * which may not be typed in every lib.dom version.
 */
const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void => {
  const R = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + R, y);
  ctx.lineTo(x + w - R, y);
  ctx.arcTo(x + w, y,     x + w, y + R,     R);
  ctx.lineTo(x + w, y + h - R);
  ctx.arcTo(x + w, y + h, x + w - R, y + h, R);
  ctx.lineTo(x + R, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - R, R);
  ctx.lineTo(x,    y + R);
  ctx.arcTo(x,     y,     x + R, y,          R);
  ctx.closePath();
};

// ─── Component ─────────────────────────────────────────────────────────────
export const HighwayCrosser: FC = () => {
  const { dark } = useTheme();

  // ── React UI state (triggers re-renders) ─────────────────────────────────
  const [score,          setScore]          = useState(0);
  const [difficulty,     setDifficulty]     = useState<Difficulty>('MEDIUM');
  const [highScore,      setHighScore]      = useState(
    () => storage.getGameStats(`${GAME_ID}_medium`).highScore,
  );
  const [lives,          setLives]          = useState(LIVES);
  const [level,          setLevel]          = useState(1);
  const [gameStatus,     setGameStatus]     = useState<
    'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'
  >('IDLE');
  const [muted,          setMuted]          = useState(audio.getMuted());
  const [leaderboard,    setLeaderboard]    = useState(
    () => storage.getLeaderboard(`${GAME_ID}_medium`),
  );
  const [name,           setName]           = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const canvasRef        = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  /**
   * All rapidly-changing game-world data lives here.
   * Reading/writing this ref inside the rAF loop never triggers a React render.
   */
  const gameState = useRef({
    playerX:        PLAYER_START_X,
    playerY:        rowCenterY(PLAYER_START_ROW),
    playerRow:      PLAYER_START_ROW,
    cars:           [] as CarEntity[],
    docks:          makeDocks(),
    spawnCounters:  LANE_CONFIGS.map(() => 0) as number[],
    /** Countdown frames of red flash after a hit (guards against double-hits). */
    hitFlash:       0,
    frameCount:     0,
    levelSpeedScale: 1.0,
  });

  // ── Storage: increment play count on mount ────────────────────────────────
  useEffect(() => {
    storage.incrementPlayCount(GAME_ID);
  }, []);

  const handleDifficultyChange = (diff: Difficulty) => {
    setDifficulty(diff);
    const modeKey = `${GAME_ID}_${diff.toLowerCase()}`;
    const stats = storage.getGameStats(modeKey);
    setHighScore(stats.highScore);
    setLeaderboard(storage.getLeaderboard(modeKey));
  };

  // ── BGM ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      audio.startBgm('flappy');
    } else {
      audio.stopBgm();
    }
    return () => { audio.stopBgm(); };
  }, [gameStatus]);

  // ── Broadcast play status (GamePage uses this for scroll prevention) ──────
  useEffect(() => {
    const isPlaying = gameStatus === 'PLAYING';
    window.dispatchEvent(
      new CustomEvent('qplay-status', { detail: { isPlaying } }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent('qplay-status', { detail: { isPlaying: false } }),
      );
    };
  }, [gameStatus]);

  // ── Stable player-respawn helper (only reads stable refs / constants) ─────
  const respawnPlayer = useCallback(() => {
    gameState.current.playerX   = PLAYER_START_X;
    gameState.current.playerRow = PLAYER_START_ROW;
    gameState.current.playerY   = rowCenterY(PLAYER_START_ROW);
    gameState.current.hitFlash  = 0;
  }, []);

  // ── Game lifecycle actions ────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    const s = gameState.current;
    s.playerX         = PLAYER_START_X;
    s.playerRow       = PLAYER_START_ROW;
    s.playerY         = rowCenterY(PLAYER_START_ROW);
    s.cars            = [];
    s.docks           = makeDocks();
    s.spawnCounters   = LANE_CONFIGS.map(() => 0);
    s.hitFlash        = 0;
    s.frameCount      = 0;
    s.levelSpeedScale = 1.0;

    setScore(0);
    setLives(LIVES);
    setLevel(1);
    setShowNamePrompt(false);
    setName('');
    setGameStatus('PLAYING');
  }, []);

  const quitGame = useCallback(() => {
    const s = gameState.current;
    s.cars            = [];
    s.docks           = makeDocks();
    s.spawnCounters   = LANE_CONFIGS.map(() => 0);
    s.hitFlash        = 0;
    s.frameCount      = 0;
    s.levelSpeedScale = 1.0;

    setScore(0);
    setLives(LIVES);
    setLevel(1);
    setShowNamePrompt(false);
    setName('');
    setGameStatus('IDLE');
    // Defer respawn so gameState is consistent when the IDLE rAF starts
    setTimeout(() => {
      gameState.current.playerX   = PLAYER_START_X;
      gameState.current.playerRow = PLAYER_START_ROW;
      gameState.current.playerY   = rowCenterY(PLAYER_START_ROW);
      gameState.current.hitFlash  = 0;
    }, 0);
  }, []);

  // ── Keyboard handler (depends on gameStatus + showNamePrompt) ────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showNamePrompt) return;

      const movementCodes = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'KeyW',    'KeyS',      'KeyA',      'KeyD',
        'Space',
      ];
      if (movementCodes.includes(e.code)) e.preventDefault();

      // Start from idle / game-over
      if (gameStatus === 'IDLE' || gameStatus === 'GAME_OVER') {
        if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) resetGame();
        return;
      }
      // Resume from pause
      if (gameStatus === 'PAUSED') {
        if (e.code === 'Space') setGameStatus('PLAYING');
        return;
      }
      if (gameStatus !== 'PLAYING') return;

      // Pause
      if (e.code === 'Space') { setGameStatus('PAUSED'); return; }

      // Movement — directly mutate the gameState ref (no re-render)
      const s = gameState.current;
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        s.playerRow = Math.max(0, s.playerRow - 1);
        s.playerY   = rowCenterY(s.playerRow);
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        s.playerRow = Math.min(NUM_ROWS - 1, s.playerRow + 1);
        s.playerY   = rowCenterY(s.playerRow);
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        s.playerX = Math.max(PLAYER_W / 2, s.playerX - STEP_X);
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        s.playerX = Math.min(CANVAS_W - PLAYER_W / 2, s.playerX + STEP_X);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, showNamePrompt, resetGame]);

  // ── Leaderboard actions ───────────────────────────────────────────────────
  const handleSaveScore = () => {
    const modeKey = `${GAME_ID}_${difficulty.toLowerCase()}`;
    storage.addLeaderboardScore(modeKey, {
      playerName: name.trim() || 'Anonymous',
      score,
    });
    setLeaderboard(storage.getLeaderboard(modeKey));
    setShowNamePrompt(false);
    setName('');
  };

  const handleSkipSaveScore = () => {
    const modeKey = `${GAME_ID}_${difficulty.toLowerCase()}`;
    storage.addLeaderboardScore(modeKey, { playerName: 'Anonymous', score });
    setLeaderboard(storage.getLeaderboard(modeKey));
    setShowNamePrompt(false);
    setName('');
  };

  // ── Main rAF game loop ────────────────────────────────────────────────────
  // Depends on [gameStatus, score, lives, level, dark] so the effect re-runs
  // (and the closure receives fresh values) whenever any of these change.
  // All mutable game-world data persists between effect runs via gameState.current.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = CANVAS_W;
    const H = CANVAS_H;

    // ── Vehicle spawning ────────────────────────────────────────────────────
    const spawnVehicles = () => {
      const s = gameState.current;
      LANE_CONFIGS.forEach((lane: LaneConfig, idx: number) => {
        s.spawnCounters[idx]++;
        if (s.spawnCounters[idx] < lane.spawnInterval) return;
        s.spawnCounters[idx] = 0;

        const speed    = lane.dir * lane.baseSpeed * s.levelSpeedScale * DIFFICULTY_SPEEDS[difficulty];
        const vehicleY = lane.row * ROW_HEIGHT + (ROW_HEIGHT - lane.vehicleH) / 2;
        // Spawn just off-screen on the leading edge
        const x        = lane.dir === 1 ? -lane.vehicleW - 4 : W + 4;

        s.cars.push({
          x,
          y:          vehicleY,
          w:          lane.vehicleW,
          h:          lane.vehicleH,
          speed,
          color:      lane.color,
          isPlatform: lane.isPlatform,
          laneIdx:    idx,
        });
      });
    };

    // ── Vehicle movement + culling ──────────────────────────────────────────
    const updateVehicles = () => {
      const s = gameState.current;
      for (const car of s.cars) car.x += car.speed;
      s.cars = s.cars.filter(c => c.x + c.w > -20 && c.x < W + 20);
    };

    // ── AABB collision (shrunk by 4 px per side for leniency) ──────────────
    const hitsPlayer = (car: CarEntity): boolean => {
      const { playerX: px, playerY: py } = gameState.current;
      const shrink = 4;
      return (
        px - PLAYER_W / 2 + shrink < car.x + car.w &&
        px + PLAYER_W / 2 - shrink > car.x &&
        py - PLAYER_H / 2 + shrink < car.y + car.h &&
        py + PLAYER_H / 2 - shrink > car.y
      );
    };

    // ── Platform under player (centre must be inside platform + margin) ─────
    const getPlatformUnder = (): CarEntity | null => {
      const s       = gameState.current;
      const laneIdx = ROW_TO_LANE_IDX.get(s.playerRow);
      if (laneIdx === undefined) return null;
      const margin  = 6;
      return s.cars.find(c =>
        c.isPlatform       &&
        c.laneIdx === laneIdx &&
        s.playerX > c.x + margin   &&
        s.playerX < c.x + c.w - margin,
      ) ?? null;
    };

    // ── Hit handler (closes over the current `lives` and `score` values) ────
    const handleHit = () => {
      if (gameState.current.hitFlash > 0) return; // still within flash window — ignore
      audio.playPlayerHit();
      gameState.current.hitFlash = 60; // 60-frame flash / double-hit guard

      if (lives <= 1) {
        setLives(0);
        setGameStatus('GAME_OVER');
        audio.playGameOver();
        const modeKey = `${GAME_ID}_${difficulty.toLowerCase()}`;
        const stats = storage.getGameStats(modeKey);
        if (score > stats.highScore) {
          setHighScore(score);
          setShowNamePrompt(true);
        }
      } else {
        setLives(lives - 1);
        respawnPlayer();
      }
    };

    // ── Dock-reached handler (closes over `score` and `level`) ──────────────
    const handleDockReached = (dockIdx: number) => {
      const s = gameState.current;
      s.docks[dockIdx].filled      = true;
      s.docks[dockIdx].flashFrames = 45;
      audio.playPoint();
      respawnPlayer();

      const newScore = score + POINTS_PER_DOCK;

      if (s.docks.every(d => d.filled)) {
        // All docks filled → level up
        const bonus    = newScore + POINTS_ALL_DOCKS_BONUS;
        const newLevel = Math.min(level + 1, MAX_LEVEL + 1);
        setScore(bonus);
        setLevel(newLevel);
        s.docks           = makeDocks();
        s.levelSpeedScale = 1 + (newLevel - 1) * SPEED_SCALE_PER_LEVEL;
        audio.playSnakeGolden(); // fanfare reuse
      } else {
        setScore(newScore);
      }
    };

    // ── Draw: static background rows ────────────────────────────────────────
    const drawBackground = () => {
      for (let row = 0; row < NUM_ROWS; row++) {
        const y = row * ROW_HEIGHT;
        let fill: string;

        if (row === 0 || row === 9) {
          fill = dark ? COLORS.safeDark   : COLORS.safeLight;
        } else if (row === 5) {
          fill = dark ? COLORS.medianDark : COLORS.medianLight;
        } else if (PLATFORM_SET.has(row)) {
          fill = dark ? COLORS.waterDark  : COLORS.waterLight;
        } else {
          fill = dark ? COLORS.roadDark   : COLORS.roadLight;
        }

        ctx.fillStyle = fill;
        ctx.fillRect(0, y, W, ROW_HEIGHT);

        // Dashed centre-line for traffic rows
        if (!SAFE_SET.has(row) && !PLATFORM_SET.has(row) && row !== 5) {
          ctx.strokeStyle = COLORS.laneDivider;
          ctx.lineWidth   = 1;
          ctx.setLineDash([10, 8]);
          ctx.beginPath();
          ctx.moveTo(0,  y + ROW_HEIGHT - 0.5);
          ctx.lineTo(W, y + ROW_HEIGHT - 0.5);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Subtle row separator grid
      ctx.strokeStyle = dark
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      for (let row = 1; row < NUM_ROWS; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * ROW_HEIGHT);
        ctx.lineTo(W, row * ROW_HEIGHT);
        ctx.stroke();
      }
    };

    // ── Draw: server dock slots ──────────────────────────────────────────────
    const drawDocks = () => {
      const s = gameState.current;
      s.docks.forEach((dock, i) => {
        const pad = 6;
        const rx  = i * DOCK_SLOT_W + pad;
        const ry  = pad;
        const rw  = DOCK_SLOT_W - pad * 2;
        const rh  = ROW_HEIGHT  - pad * 2;

        if (dock.filled) {
          const glow = dock.flashFrames > 0
            ? 14 + Math.sin(dock.flashFrames * 0.35) * 6
            : 10;
          ctx.shadowBlur  = glow;
          ctx.shadowColor = COLORS.dockFilled;
          ctx.fillStyle   = dock.flashFrames > 0
            ? `hsl(142,71%,${50 + Math.round(dock.flashFrames * 0.6)}%)`
            : COLORS.dockFilled;
          roundRect(ctx, rx, ry, rw, rh, 4);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle   = dark ? COLORS.dockEmptyDark : COLORS.dockEmptyLight;
          roundRect(ctx, rx, ry, rw, rh, 4);
          ctx.fill();
          ctx.strokeStyle = dark ? '#166534' : '#6ee7b7';
          ctx.lineWidth   = 1.5;
          roundRect(ctx, rx, ry, rw, rh, 4);
          ctx.stroke();
        }

        // Server icon
        ctx.font          = '14px serif';
        ctx.textAlign     = 'center';
        ctx.textBaseline  = 'middle';
        ctx.fillStyle     = dock.filled
          ? '#ffffff'
          : (dark ? '#4ade80' : '#166534');
        ctx.fillText(
          dock.filled ? '🖥' : '·',
          i * DOCK_SLOT_W + DOCK_SLOT_W / 2,
          ROW_HEIGHT / 2,
        );

        if (dock.flashFrames > 0) dock.flashFrames--;
      });
    };

    // ── Draw: cars and platforms ─────────────────────────────────────────────
    const drawVehicles = () => {
      const s = gameState.current;
      for (const car of s.cars) {
        if (car.isPlatform) {
          // Glowing platform (log / raft)
          ctx.shadowBlur  = 8;
          ctx.shadowColor = car.color;
          ctx.fillStyle   = car.color;
          roundRect(ctx, car.x, car.y, car.w, car.h, 5);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Vertical plank lines
          ctx.strokeStyle = 'rgba(0,0,0,0.22)';
          ctx.lineWidth   = 1;
          for (let lx = car.x + 14; lx < car.x + car.w - 6; lx += 16) {
            ctx.beginPath();
            ctx.moveTo(lx, car.y + 4);
            ctx.lineTo(lx, car.y + car.h - 4);
            ctx.stroke();
          }

          // Direction indicator
          ctx.fillStyle    = 'rgba(255,255,255,0.28)';
          ctx.font         = '9px sans-serif';
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            car.speed > 0 ? '▶' : '◀',
            car.x + car.w / 2,
            car.y + car.h / 2,
          );
        } else {
          // Glowing vehicle (car / truck)
          ctx.shadowBlur  = 6;
          ctx.shadowColor = car.color;
          ctx.fillStyle   = car.color;
          roundRect(ctx, car.x, car.y, car.w, car.h, 3);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Windshield
          ctx.fillStyle = 'rgba(0,0,0,0.32)';
          const ww = car.w * 0.4;
          const wx = car.speed < 0
            ? car.x + 5
            : car.x + car.w - ww - 5;
          roundRect(ctx, wx, car.y + 4, ww, car.h - 8, 2);
          ctx.fill();

          // Headlights
          ctx.fillStyle = '#fef08a';
          const hlX = car.speed < 0
            ? car.x + 2
            : car.x + car.w - 5;
          ctx.fillRect(hlX, car.y + 3,            3, 4);
          ctx.fillRect(hlX, car.y + car.h - 7,    3, 4);
        }
      }
    };

    // ── Draw: player data-packet ─────────────────────────────────────────────
    const drawPlayer = () => {
      const { playerX: px, playerY: py, hitFlash } = gameState.current;
      // Blink every 6 frames during flash window
      const blink      = hitFlash > 0 && Math.floor(hitFlash / 6) % 2 === 0;
      const bodyColor  = blink
        ? COLORS.hitFlashColor
        : (dark ? COLORS.playerDark : COLORS.playerLight);
      const glowColor  = blink ? COLORS.hitFlashColor : COLORS.playerGlow;

      ctx.shadowBlur  = blink ? 18 : 12;
      ctx.shadowColor = glowColor;
      ctx.fillStyle   = bodyColor;
      roundRect(ctx, px - PLAYER_W / 2, py - PLAYER_H / 2, PLAYER_W, PLAYER_H, 5);
      ctx.fill();
      ctx.shadowBlur = 0;

      // CPU-chip inner dot
      ctx.fillStyle = '#0891b2';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();

      // Antennas (gives a "chip" silhouette)
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(px - 6, py - PLAYER_H / 2);
      ctx.lineTo(px - 6, py - PLAYER_H / 2 - 5);
      ctx.moveTo(px + 6, py - PLAYER_H / 2);
      ctx.lineTo(px + 6, py - PLAYER_H / 2 - 5);
      ctx.stroke();
    };

    // ── Main update + draw ───────────────────────────────────────────────────
    const updateAndDraw = () => {
      // 1. Clear
      ctx.fillStyle = dark ? COLORS.bgDark : COLORS.bgLight;
      ctx.fillRect(0, 0, W, H);

      drawBackground();

      if (gameStatus === 'PLAYING') {
        const s = gameState.current;
        s.frameCount++;

        // 2. Spawn and scroll vehicles
        spawnVehicles();
        updateVehicles();

        const row = s.playerRow;

        // 3. Platform-row logic: ride or drown
        if (PLATFORM_SET.has(row)) {
          const plat = getPlatformUnder();
          if (plat) {
            s.playerX += plat.speed; // inherit platform velocity
            // If platform carries player off canvas edge → drown
            if (s.playerX < -PLAYER_W || s.playerX > W + PLAYER_W) {
              handleHit();
            }
          } else if (s.hitFlash <= 0) {
            // No platform underneath → drown
            handleHit();
          }
        }

        // 4. Traffic collision (skip if inside hit-flash window)
        if (!SAFE_SET.has(row) && !PLATFORM_SET.has(row) && s.hitFlash <= 0) {
          const hit = s.cars.some(c => !c.isPlatform && hitsPlayer(c));
          if (hit) handleHit();
        }

        // 5. Tick down hit-flash counter
        if (s.hitFlash > 0) s.hitFlash--;

        // 6. Dock detection: player arrived at top row
        if (row === 0 && s.hitFlash <= 0) {
          const dockIdx = s.docks.findIndex(
            d => !d.filled && Math.abs(s.playerX - d.centerX) < DOCK_SLOT_W / 2 - 4,
          );
          if (dockIdx !== -1) {
            handleDockReached(dockIdx);
            // Effect will restart on next render (score changed); continue this frame.
          }
        }
      }

      // 7. Draw entities (drawn regardless of status for idle/paused preview)
      drawVehicles();
      drawPlayer();
      drawDocks();

      // 8. Continue loop while game is in an active-view state
      if (
        gameStatus === 'PLAYING' ||
        gameStatus === 'IDLE'    ||
        gameStatus === 'PAUSED'
      ) {
        animationFrameId.current = requestAnimationFrame(updateAndDraw);
      }
    };

    animationFrameId.current = requestAnimationFrame(updateAndDraw);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [gameStatus, score, lives, level, difficulty, dark, respawnPlayer]);

  // ── Helper: move player from D-pad press ──────────────────────────────────
  const dpadMove = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (gameStatus !== 'PLAYING') return;
    const s = gameState.current;
    if (dir === 'UP')    { s.playerRow = Math.max(0, s.playerRow - 1);              s.playerY = rowCenterY(s.playerRow); }
    if (dir === 'DOWN')  { s.playerRow = Math.min(NUM_ROWS - 1, s.playerRow + 1);   s.playerY = rowCenterY(s.playerRow); }
    if (dir === 'LEFT')  { s.playerX   = Math.max(PLAYER_W / 2, s.playerX - STEP_X); }
    if (dir === 'RIGHT') { s.playerX   = Math.min(CANVAS_W - PLAYER_W / 2, s.playerX + STEP_X); }
  };

  const notPlaying = gameStatus !== 'PLAYING';
  const dpadBtnStyle = `w-12 h-12 border rounded-[4px] flex items-center justify-center
    font-bold select-none cursor-pointer touch-none transition-colors
    disabled:opacity-30 disabled:cursor-not-allowed
    ${dark
      ? 'bg-[#1a1a1c] border-slate-800 text-slate-300 active:bg-white active:text-black'
      : 'bg-white border-slate-200 text-slate-600 active:bg-slate-900 active:text-white'
    }`;

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl mx-auto px-4 py-8">

      {/* ══ Left column: game board ══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center">

        {/* Stats hub */}
        <div className={`flex justify-between items-center w-full max-w-[480px] mb-4 border p-4 rounded-[4px] ${
          dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Lives */}
          <div>
            <div className={`text-xs font-semibold mb-1 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
              Lives
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: LIVES }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-2.5 rounded-sm transition-colors ${
                    i < lives
                      ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                      : 'bg-transparent border border-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Score */}
          <div className="text-center">
            <div className={`text-xs font-semibold mb-0.5 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
              Score
            </div>
            <div className={`text-xl font-bold font-mono ${dark ? 'text-white' : 'text-slate-900'}`}>
              {score}
            </div>
          </div>

          {/* Level */}
          <div className="text-center">
            <div className={`text-xs font-semibold mb-0.5 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
              Level
            </div>
            <div className={`text-xl font-bold font-mono ${dark ? 'text-white' : 'text-slate-900'}`}>
              {level}
            </div>
          </div>

          {/* High score */}
          <div className="text-right">
            <div className={`text-xs font-semibold mb-0.5 flex items-center justify-end gap-1 ${
              dark ? 'text-slate-500' : 'text-slate-500'
            }`}>
              <Award className="w-3.5 h-3.5" /> Best
            </div>
            <div className={`text-xl font-bold font-mono ${dark ? 'text-white' : 'text-slate-900'}`}>
              {highScore}
            </div>
          </div>
        </div>

        {/* Canvas + overlays */}
        <div className="w-full max-w-[480px] flex flex-col items-center">
          <div
            className={`relative border rounded-[4px] overflow-hidden w-full ${
              dark ? 'bg-[#09090b] border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
            style={{ touchAction: 'none' }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="block w-full aspect-square"
            />

            {/* IDLE overlay */}
            {gameStatus === 'IDLE' && (
              <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 ${
                dark ? 'bg-[#121214]/95' : 'bg-white/95'
              }`}>
                <Server className={`w-12 h-12 mb-3 animate-pulse ${
                  dark ? 'text-cyan-400' : 'text-cyan-600'
                }`} />
                <h3 className={`text-base font-bold mb-2 uppercase tracking-wider ${
                  dark ? 'text-white' : 'text-slate-900'
                }`}>
                  Cyber Highway Crosser
                </h3>
                <p className={`text-xs mb-6 max-w-[260px] ${
                  dark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Guide your data packet through neon traffic and river platforms.
                  Reach all five server docks to advance!
                </p>
                <button
                  onClick={resetGame}
                  className={`flex items-center justify-center gap-2 font-bold px-6 py-2.5
                    rounded-[4px] border transition-colors uppercase tracking-wider
                    text-xs cursor-pointer w-full max-w-xs ${
                    dark
                      ? 'bg-white text-black border-white hover:bg-transparent hover:text-white'
                      : 'bg-slate-900 text-white border-slate-900 hover:bg-transparent hover:text-slate-900'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Start Game
                </button>
              </div>
            )}

            {/* PAUSED overlay */}
            {gameStatus === 'PAUSED' && (
              <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 gap-4 z-20 ${
                dark ? 'bg-[#121214]/95' : 'bg-white/95'
              }`}>
                <h3 className={`text-lg font-bold uppercase tracking-wider ${
                  dark ? 'text-white' : 'text-slate-900'
                }`}>
                  Game Paused
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setGameStatus('PLAYING')}
                    className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-[4px]
                      border transition-colors uppercase tracking-wider text-xs cursor-pointer ${
                      dark
                        ? 'bg-white text-black border-white hover:bg-transparent hover:text-white'
                        : 'bg-slate-900 text-white border-slate-900 hover:bg-transparent hover:text-slate-900'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Resume
                  </button>
                  <button
                    onClick={quitGame}
                    className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-[4px]
                      border transition-colors uppercase tracking-wider text-xs cursor-pointer ${
                      dark
                        ? 'bg-[#1a1a1c] text-slate-400 border-slate-800 hover:border-slate-500 hover:text-white'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Abort
                  </button>
                </div>
              </div>
            )}

            {/* GAME_OVER overlay */}
            {gameStatus === 'GAME_OVER' && (
              <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 ${
                dark ? 'bg-[#121214]/95' : 'bg-white/95'
              }`}>
                <h3 className="text-lg font-bold text-red-500 mb-2 uppercase tracking-wider">
                  Packet Lost
                </h3>
                <p className={`mb-4 font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Final Score:{' '}
                  <span className={dark ? 'text-white' : 'text-slate-900'}>{score}</span>
                </p>

                {showNamePrompt ? (
                  <div className="w-full max-w-xs flex flex-col gap-3">
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${
                      dark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      New High Score! Enter Name
                    </div>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveScore(); }}
                      className={`w-full rounded-[4px] px-3 py-2 text-center text-base
                        font-medium focus:outline-none transition-colors border ${
                        dark
                          ? 'bg-[#1a1a1c] border-slate-800 text-[#e8e8ea] placeholder-slate-600 focus:border-white'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-900'
                      }`}
                    />
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={handleSaveScore}
                        className={`flex-1 font-bold py-2 rounded-[4px] border transition-colors
                          text-xs uppercase tracking-wider cursor-pointer ${
                          dark
                            ? 'bg-white text-black border-white hover:bg-transparent hover:text-white'
                            : 'bg-slate-900 text-white border-slate-900 hover:bg-transparent hover:text-slate-900'
                        }`}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleSkipSaveScore}
                        className={`flex-1 font-bold py-2 rounded-[4px] border transition-colors
                          text-xs uppercase tracking-wider cursor-pointer ${
                          dark
                            ? 'bg-[#1a1a1c] text-slate-400 border-slate-800 hover:border-slate-500 hover:text-white'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={resetGame}
                    className={`flex items-center gap-2 font-bold px-6 py-2.5 rounded-[4px]
                      border transition-colors uppercase tracking-wider text-xs cursor-pointer ${
                      dark
                        ? 'bg-white text-black border-white hover:bg-transparent hover:text-white'
                        : 'bg-slate-900 text-white border-slate-900 hover:bg-transparent hover:text-slate-900'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Play Again
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Mobile D-pad controls ─────────────────────────────────────── */}
          <div className="mt-6 flex flex-col items-center gap-1.5 w-full">
            {/* Up row */}
            <div className="flex gap-1.5 justify-center">
              <div className="w-12 h-12" aria-hidden />
              <button
                onPointerDown={(e) => { e.preventDefault(); dpadMove('UP'); }}
                disabled={notPlaying}
                className={dpadBtnStyle}
              >
                ▲
              </button>
              <div className="w-12 h-12" aria-hidden />
            </div>
            {/* Left / Down / Right row */}
            <div className="flex gap-1.5 justify-center">
              <button
                onPointerDown={(e) => { e.preventDefault(); dpadMove('LEFT'); }}
                disabled={notPlaying}
                className={dpadBtnStyle}
              >
                ◀
              </button>
              <button
                onPointerDown={(e) => { e.preventDefault(); dpadMove('DOWN'); }}
                disabled={notPlaying}
                className={dpadBtnStyle}
              >
                ▼
              </button>
              <button
                onPointerDown={(e) => { e.preventDefault(); dpadMove('RIGHT'); }}
                disabled={notPlaying}
                className={dpadBtnStyle}
              >
                ▶
              </button>
            </div>
            {/* Pause / Resume button */}
            <button
              onClick={() => {
                if (gameStatus === 'PLAYING') setGameStatus('PAUSED');
                else if (gameStatus === 'PAUSED') setGameStatus('PLAYING');
              }}
              disabled={gameStatus === 'IDLE' || gameStatus === 'GAME_OVER'}
              className={`mt-2 w-40 h-10 rounded-[4px] border flex items-center justify-center
                gap-2 font-bold select-none cursor-pointer transition-colors uppercase
                tracking-wider text-xs disabled:opacity-40 disabled:cursor-not-allowed ${
                dark
                  ? 'bg-[#1a1a1c] border-slate-800 text-slate-300 active:bg-white active:text-black'
                  : 'bg-white border-slate-200 text-slate-600 active:bg-slate-900 active:text-white'
              }`}
            >
              {gameStatus === 'PLAYING'
                ? <><Pause className="w-4 h-4" /> Pause</>
                : <><Play  className="w-4 h-4" /> Resume</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ══ Right column: sidebar ══════════════════════════════════════════ */}
      <div className="w-full lg:w-80 flex flex-col gap-6">

        {/* Game Options */}
        <div className={`rounded-[4px] p-6 border flex flex-col gap-4 ${
          dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider ${
            dark ? 'text-[#e8e8ea]' : 'text-slate-800'
          }`}>
            Game Options
          </h3>

          {/* Difficulty Selector */}
          <div>
            <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${
              dark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Speed / Difficulty
            </div>
            <div className="flex gap-1.5">
              {(['EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => handleDifficultyChange(diff)}
                  disabled={gameStatus === 'PLAYING' || gameStatus === 'PAUSED'}
                  className={`flex-1 py-1.5 rounded-[4px] border text-[9px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    difficulty === diff
                      ? dark
                        ? 'bg-white text-black border-white'
                        : 'bg-slate-900 text-white border-slate-900'
                      : dark
                        ? 'bg-black/30 border-slate-800 text-slate-400 hover:border-slate-500 hover:text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Controls */}
          <div>
            <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${
              dark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Audio Settings
            </div>
            <button
              type="button"
              onClick={() => { const m = audio.toggleMute(); setMuted(m); }}
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-[4px]
                border text-xs font-bold transition-all cursor-pointer ${
                dark
                  ? 'bg-black/30 border-slate-800 text-slate-400 hover:border-slate-500 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              {muted
                ? <><VolumeX className="w-4 h-4 text-red-500"     /> Muted</>
                : <><Volume2 className="w-4 h-4 text-emerald-500" /> Sound Enabled</>
              }
            </button>
          </div>
        </div>

        {/* Controls reference (desktop only) */}
        <div className={`hidden lg:block rounded-[4px] p-6 border ${
          dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${
            dark ? 'text-slate-455' : 'text-slate-500'
          }`}>
            Tactical Controls
          </h3>
          <ul className={`text-xs space-y-3 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            {([
              ['Move Up',    'W / ↑'],
              ['Move Down',  'S / ↓'],
              ['Move Left',  'A / ←'],
              ['Move Right', 'D / →'],
              ['Pause',      'Space'],
            ] as [string, string][]).map(([action, key]) => (
              <li
                key={action}
                className={`flex justify-between items-center border-b pb-2 ${
                  dark ? 'border-slate-900' : 'border-slate-100'
                }`}
              >
                <span>{action}</span>
                <kbd className={`border px-2 py-0.5 rounded-[4px] text-[10px] font-mono ${
                  dark
                    ? 'bg-black/50 border-slate-800 text-[#e8e8ea]'
                    : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}>
                  {key}
                </kbd>
              </li>
            ))}
          </ul>
        </div>

        {/* Leaderboard */}
        <div className={`rounded-[4px] p-6 flex-1 flex flex-col border ${
          dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${
            dark ? 'text-slate-455' : 'text-slate-500'
          }`}>
            <Award className={`w-4 h-4 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
            Top Transmissions
          </h3>
          <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2 pr-1">
            {leaderboard.length === 0 ? (
              <p className={`text-xs italic text-center py-6 ${
                dark ? 'text-slate-500' : 'text-slate-400'
              }`}>
                No transmission logs yet.
              </p>
            ) : (
              leaderboard.slice(0, 5).map((entry, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between py-2 px-3 rounded-[4px] border ${
                    dark ? 'bg-black/20 border-slate-850' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold font-mono ${
                      dark ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-xs font-semibold truncate max-w-[120px] ${
                      dark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {entry.playerName}
                    </span>
                  </div>
                  <span className={`text-xs font-bold font-mono ${
                    dark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {entry.score}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HighwayCrosser;
