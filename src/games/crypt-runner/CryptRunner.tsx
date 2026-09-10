// ─────────────────────────────────────────────────────────────────────────────
// Cyber Crypt Runner — Main Component
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import type { FC, TouchEvent } from 'react';
import { storage } from '../../core/storage';
import { audio } from '../../core/audio';
import { useTheme } from '../../context/ThemeContext';
import {
  Award,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Cpu,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import {
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
  CANVAS_W,
  CANVAS_H,
  TILE_WALL,
  TILE_DOT,
  TILE_POWER,
  TILE_GATE,
  POINTS_DOT,
  POINTS_POWER_NODE,
  POINTS_GHOST_EATEN,
  POINTS_STAGE_CLEAR,
  INITIAL_LIVES,
  DIFFICULTY_CONFIGS,
  THEME_PALETTES,
  GHOST_COLORS,
  GHOST_CONFIGS,
} from './crypt-runner.config';
import type { Difficulty } from './crypt-runner.config';
import {
  DIR_ANGLE,
  DIR_DELTA,
  OPPOSITE_DIR,
  createInitialGrid,
  createInitialPlayer,
  createInitialGhosts,
  updatePlayerPosition,
  updateGhost,
  spawnParticles,
  updateParticles,
  updateFloatingTexts,
} from './crypt-runner.logic';
import type {
  Direction,
  GhostId,
  GameState,
} from './crypt-runner.logic';

const GAME_ID = 'crypt_runner';

export const CryptRunner: FC = () => {
  const { dark } = useTheme();

  // ── React UI State ────────────────────────────────────────────────────────
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => storage.getGameStats(GAME_ID).highScore);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [round, setRound] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [gameStatus, setGameStatus] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('IDLE');
  const [muted, setMuted] = useState(audio.getMuted());
  const [leaderboard, setLeaderboard] = useState(() => storage.getLeaderboard(GAME_ID));
  const [name, setName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  // ── References ────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // High-frequency mutable game state inside ref to avoid React re-renders per frame
  const stateRef = useRef<GameState>({
    grid: createInitialGrid().grid,
    dotsRemaining: createInitialGrid().dotCount,
    dotsEatenInRound: 0,
    player: createInitialPlayer(),
    ghosts: createInitialGhosts('MEDIUM'),
    score: 0,
    lives: INITIAL_LIVES,
    round: 1,
    difficulty: 'MEDIUM',
    frightenedTimer: 0,
    frightenedDuration: DIFFICULTY_CONFIGS['MEDIUM'].powerDurationMs,
    consecutiveGhostsEaten: 0,
    modeTimer: 0,
    modeIndex: 0,
    isScatter: true,
    floatingTexts: [],
    particles: [],
    roundClearTimer: 0,
    readyCountdown: 0,
  });

  // ── Increment Play Count on Mount ─────────────────────────────────────────
  useEffect(() => {
    storage.incrementPlayCount(GAME_ID);
  }, []);

  // ── Audio & Status Broadcast ──────────────────────────────────────────────
  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      audio.startBgm('crypt');
    } else {
      audio.stopBgm();
    }
    return () => {
      audio.stopBgm();
    };
  }, [gameStatus]);

  useEffect(() => {
    const isPlaying = gameStatus === 'PLAYING';
    window.dispatchEvent(new CustomEvent('qplay-status', { detail: { isPlaying } }));
    return () => {
      window.dispatchEvent(new CustomEvent('qplay-status', { detail: { isPlaying: false } }));
    };
  }, [gameStatus]);

  // ── Reset Positions (e.g. after life lost) ────────────────────────────────
  const resetEntitiesPositions = useCallback(() => {
    const s = stateRef.current;
    s.player = createInitialPlayer();
    s.ghosts = createInitialGhosts(s.difficulty);
    s.frightenedTimer = 0;
    s.consecutiveGhostsEaten = 0;
    s.modeTimer = 0;
    s.modeIndex = 0;
    s.isScatter = true;
    s.readyCountdown = 1.8; // Brief pause with "SYSTEM READY" indicator
  }, []);

  // ── Reset Entire Game ─────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    const { grid, dotCount } = createInitialGrid();
    const diffCfg = DIFFICULTY_CONFIGS[difficulty];

    stateRef.current = {
      grid,
      dotsRemaining: dotCount,
      dotsEatenInRound: 0,
      player: createInitialPlayer(),
      ghosts: createInitialGhosts(difficulty),
      score: 0,
      lives: INITIAL_LIVES,
      round: 1,
      difficulty,
      frightenedTimer: 0,
      frightenedDuration: diffCfg.powerDurationMs,
      consecutiveGhostsEaten: 0,
      modeTimer: 0,
      modeIndex: 0,
      isScatter: true,
      floatingTexts: [],
      particles: [],
      roundClearTimer: 0,
      readyCountdown: 1.8,
    };

    setScore(0);
    setLives(INITIAL_LIVES);
    setRound(1);
    setShowNamePrompt(false);
    setName('');
    setGameStatus('PLAYING');
    lastTimeRef.current = performance.now();
  }, [difficulty]);

  // ── Abort Game ────────────────────────────────────────────────────
  const abortGame = useCallback(() => {
    setGameStatus('IDLE');
    setShowNamePrompt(false);
    setName('');
    setScore(0);
    setLives(INITIAL_LIVES);
  }, []);

  // ── Next Round Setup (after clearing all dots) ────────────────────
  const startNextRound = useCallback(() => {
    const s = stateRef.current;
    const { grid, dotCount } = createInitialGrid();
    s.grid = grid;
    s.dotsRemaining = dotCount;
    s.dotsEatenInRound = 0;
    s.round += 1;
    s.score += POINTS_STAGE_CLEAR;
    s.player = createInitialPlayer();
    s.ghosts = createInitialGhosts(s.difficulty);
    s.frightenedTimer = 0;
    s.consecutiveGhostsEaten = 0;
    s.modeTimer = 0;
    s.modeIndex = 0;
    s.isScatter = true;
    s.roundClearTimer = 0;
    s.readyCountdown = 1.8;

    setScore(s.score);
    setRound(s.round);
    audio.playLevelUp();
  }, []);

  // ── High Score Save / Skip ────────────────────────────────────────────────
  const handleSaveScore = useCallback(() => {
    const finalScore = stateRef.current.score;
    const playerName = name.trim() || 'Bit-Runner';
    storage.addLeaderboardScore(GAME_ID, {
      playerName,
      score: finalScore,
    });
    setLeaderboard(storage.getLeaderboard(GAME_ID));
    setHighScore(storage.getGameStats(GAME_ID).highScore);
    setShowNamePrompt(false);
    setName('');
  }, [name]);

  const handleSkipSaveScore = useCallback(() => {
    const finalScore = stateRef.current.score;
    storage.addLeaderboardScore(GAME_ID, {
      playerName: 'Bit-Runner',
      score: finalScore,
    });
    setLeaderboard(storage.getLeaderboard(GAME_ID));
    setHighScore(storage.getGameStats(GAME_ID).highScore);
    setShowNamePrompt(false);
    setName('');
  }, []);

  // ── Steer Action ──────────────────────────────────────────────────────────
  const requestDirection = useCallback((dir: Direction) => {
    if (stateRef.current) {
      stateRef.current.player.nextDir = dir;
    }
  }, []);

  // ── Keyboard Controls ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showNamePrompt) return;

      const keysToPrevent = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'];
      if (keysToPrevent.includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'Space') {
        if (gameStatus === 'IDLE' || gameStatus === 'GAME_OVER') {
          resetGame();
        } else if (gameStatus === 'PLAYING') {
          setGameStatus('PAUSED');
        } else if (gameStatus === 'PAUSED') {
          setGameStatus('PLAYING');
          lastTimeRef.current = performance.now();
        }
        return;
      }

      if (gameStatus !== 'PLAYING') return;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          requestDirection('UP');
          break;
        case 'ArrowDown':
        case 'KeyS':
          requestDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'KeyA':
          requestDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'KeyD':
          requestDirection('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, showNamePrompt, resetGame, requestDirection]);

  // ── Touch / Swipe Handlers on Canvas ──────────────────────────────────────
  const handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: TouchEvent<HTMLCanvasElement>) => {
    if (!touchStartPos.current || e.changedTouches.length === 0) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStartPos.current.x;
    const dy = endY - touchStartPos.current.y;
    touchStartPos.current = null;

    const threshold = 20; // min swipe distance in px
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      requestDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      requestDirection(dy > 0 ? 'DOWN' : 'UP');
    }
  };

  // ── Main 60 FPS Game Loop ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = dark ? THEME_PALETTES.dark : THEME_PALETTES.light;

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min(0.064, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;

      const s = stateRef.current;
      const diffCfg = DIFFICULTY_CONFIGS[s.difficulty];

      // ── Game Logic Update ─────────────────────────────────────────────────
      if (gameStatus === 'PLAYING') {
        // Ready banner countdown
        if (s.readyCountdown > 0) {
          s.readyCountdown -= dt;
        } else if (s.roundClearTimer > 0) {
          // Round clear animation in progress
          s.roundClearTimer -= dt;
          if (s.roundClearTimer <= 0) {
            startNextRound();
          }
        } else if (s.player.isDying) {
          // Player death sequence in progress
          updatePlayerPosition(s.player, s.grid, 0, dt);
          if (s.player.deathTimer >= 1) {
            s.lives -= 1;
            setLives(s.lives);

            if (s.lives <= 0) {
              setGameStatus('GAME_OVER');
              audio.playGameOver();
              const isEligible = storage.updateHighScore(GAME_ID, s.score);
              if (isEligible || s.score > 0) {
                setShowNamePrompt(true);
              }
            } else {
              resetEntitiesPositions();
            }
          }
        } else {
          // Standard Active Gameplay Update

          // 1. Scatter / Chase Cycle Progression
          // Authentic Pac-Man Rule: Wave timer is paused during Frightened mode!
          if (s.frightenedTimer <= 0) {
            s.modeTimer += dt;
            const currentInterval = diffCfg.scatterIntervals[s.modeIndex] ?? -1;
            if (currentInterval > 0 && s.modeTimer >= currentInterval) {
              s.modeTimer = 0;
              s.modeIndex += 1;
              s.isScatter = !s.isScatter;

              // Authentic Pac-Man Rule:
              // When transitioning between Scatter and Chase, all active ghosts immediately reverse 180°!
              (Object.keys(s.ghosts) as GhostId[]).forEach((id) => {
                const g = s.ghosts[id];
                if (!g.inHouse && !g.isRegenerating && g.state !== 'EATEN' && g.state !== 'FRIGHTENED') {
                  g.state = s.isScatter ? 'SCATTER' : 'CHASE';
                  g.dir = OPPOSITE_DIR[g.dir];
                }
              });
            }
          }

          // 2. Power Node Frightened Timer Progression
          if (s.frightenedTimer > 0) {
            s.frightenedTimer -= dt * 1000;
            if (s.frightenedTimer <= 0) {
              s.frightenedTimer = 0;
              // Reset any ghosts still frightened back to normal current mode
              (Object.keys(s.ghosts) as GhostId[]).forEach((id) => {
                if (s.ghosts[id].state === 'FRIGHTENED') {
                  s.ghosts[id].state = s.isScatter ? 'SCATTER' : 'CHASE';
                }
              });
            }
          }

          // 3. Update Player Movement
          // Slight speed boost per round completed
          const roundMultiplier = Math.min(1.3, 1 + (s.round - 1) * 0.05);
          const playerSpeedPx = diffCfg.playerSpeed * TILE_SIZE * roundMultiplier;
          updatePlayerPosition(s.player, s.grid, playerSpeedPx, dt);

          // 4. Dot and Power Node Collision
          const pCol = s.player.col;
          const pRow = s.player.row;
          if (pRow >= 0 && pRow < GRID_ROWS && pCol >= 0 && pCol < GRID_COLS) {
            const tile = s.grid[pRow][pCol];

            if (tile === TILE_DOT) {
              s.grid[pRow][pCol] = 0;
              s.dotsRemaining -= 1;
              s.dotsEatenInRound += 1;
              s.score += POINTS_DOT;
              setScore(s.score);
              audio.playDotEat();
              spawnParticles(s.particles, s.player.x, s.player.y, palette.dotColor, 3);

              if (s.dotsRemaining <= 0) {
                s.roundClearTimer = 1.6;
                audio.playLevelUp();
                spawnParticles(s.particles, CANVAS_W / 2, CANVAS_H / 2, palette.powerColor, 40);
              }
            } else if (tile === TILE_POWER) {
              s.grid[pRow][pCol] = 0;
              s.dotsRemaining -= 1;
              s.dotsEatenInRound += 1;
              s.score += POINTS_POWER_NODE;
              setScore(s.score);
              audio.playPowerPellet();

              // Trigger Frightened State
              s.frightenedTimer = diffCfg.powerDurationMs;
              s.frightenedDuration = diffCfg.powerDurationMs;
              s.consecutiveGhostsEaten = 0;

              (Object.keys(s.ghosts) as GhostId[]).forEach((id) => {
                const g = s.ghosts[id];
                if (g.state !== 'EATEN' && !g.inHouse && !g.isRegenerating) {
                  g.state = 'FRIGHTENED';
                  // Reverse direction when frightened starts
                  g.dir = OPPOSITE_DIR[g.dir];
                }
              });

              spawnParticles(s.particles, s.player.x, s.player.y, palette.powerColor, 18);

              if (s.dotsRemaining <= 0) {
                s.roundClearTimer = 1.6;
                audio.playLevelUp();
                spawnParticles(s.particles, CANVAS_W / 2, CANVAS_H / 2, palette.powerColor, 40);
              }
            }
          }

          // 5. Update Ghosts Movement and Collision
          const ghostSpeeds = {
            normal: diffCfg.ghostSpeed * TILE_SIZE * roundMultiplier,
            frightened: diffCfg.frightenedSpeed * TILE_SIZE,
            eaten: diffCfg.eatenSpeed * TILE_SIZE,
          };

          const blinky = s.ghosts.BLINKY;

          (Object.keys(s.ghosts) as GhostId[]).forEach((id) => {
            const ghost = s.ghosts[id];
            updateGhost(
              ghost,
              s.grid,
              s.player,
              blinky,
              s.isScatter,
              ghostSpeeds,
              dt,
              s.dotsRemaining,
              s.dotsEatenInRound
            );

            // Check collision with player
            const dist = Math.hypot(s.player.x - ghost.x, s.player.y - ghost.y);
            const COLLISION_RADIUS = TILE_SIZE * 0.72; // ~11.5 px

            if (dist < COLLISION_RADIUS) {
              if (ghost.state === 'FRIGHTENED') {
                // Ghost is deleted / eaten
                ghost.state = 'EATEN';
                const bonusPoints = POINTS_GHOST_EATEN[Math.min(3, s.consecutiveGhostsEaten)];
                s.consecutiveGhostsEaten += 1;
                s.score += bonusPoints;
                setScore(s.score);

                audio.playGhostEat();

                s.floatingTexts.push({
                  x: ghost.x,
                  y: ghost.y,
                  text: `+${bonusPoints}`,
                  alpha: 1,
                  life: 0.9,
                });

                spawnParticles(s.particles, ghost.x, ghost.y, GHOST_COLORS.FRIGHTENED, 24);
              } else if (ghost.state === 'CHASE' || ghost.state === 'SCATTER') {
                if (!ghost.inHouse && !ghost.isRegenerating) {
                  // Player is caught!
                  s.player.isDying = true;
                  s.player.deathTimer = 0;
                  audio.playPlayerDeath();
                  spawnParticles(s.particles, s.player.x, s.player.y, palette.playerColor, 28);
                }
              }
            }
          });
        }

        // Update FX systems
        updateParticles(s.particles, dt);
        updateFloatingTexts(s.floatingTexts, dt);
      }

      // ── Rendering ─────────────────────────────────────────────────────────

      // 1. Clear Screen
      ctx.fillStyle = palette.boardBg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // 2. Subtle Background Grid Pattern
      ctx.strokeStyle = palette.gridLineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= CANVAS_W; x += TILE_SIZE * 2) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_H);
      }
      for (let y = 0; y <= CANVAS_H; y += TILE_SIZE * 2) {
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_W, y);
      }
      ctx.stroke();

      // 3. Draw Maze Walls & Corridors
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const tile = s.grid[r][c];
          const px = c * TILE_SIZE;
          const py = r * TILE_SIZE;

          if (tile === TILE_WALL) {
            // High-tech circuit wall tile
            ctx.fillStyle = palette.wallFill;
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

            ctx.strokeStyle = palette.wallStroke;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);

            // Subtle interior circuit core
            ctx.fillStyle = palette.wallStroke;
            ctx.fillRect(px + TILE_SIZE / 2 - 1, py + TILE_SIZE / 2 - 1, 2, 2);
          } else if (tile === TILE_GATE) {
            // Pink laser gate
            ctx.strokeStyle = palette.gateColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(px, py + TILE_SIZE / 2);
            ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE / 2);
            ctx.stroke();
          } else if (tile === TILE_DOT) {
            // Glowing data fragment dot
            ctx.fillStyle = palette.dotColor;
            ctx.beginPath();
            ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 2.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (tile === TILE_POWER) {
            // Overclock Power Node (pulsing)
            const pulse = 1 + Math.sin(timestamp * 0.008) * 0.25;
            ctx.fillStyle = palette.powerColor;
            ctx.shadowColor = palette.powerGlow;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 5 * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // CPU Core Watermark in center of ghost house
      ctx.fillStyle = dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CPU CORE', 14 * TILE_SIZE, 14.5 * TILE_SIZE);

      // 4. Draw Particles
      for (const p of s.particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // 5. Draw Player (Bit-Man)
      const p = s.player;
      if (p.isDying) {
        // Shrinking / dissolving death animation
        const radius = Math.max(0, (TILE_SIZE / 2 - 1) * (1 - p.deathTimer));
        ctx.fillStyle = palette.playerColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Active Player with Chomping Mouth
        const angle = DIR_ANGLE[p.currentDir];
        const mouth = p.mouthAngle * Math.PI;

        ctx.fillStyle = palette.playerColor;
        ctx.shadowColor = palette.playerColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, TILE_SIZE / 2 - 1, angle + mouth, angle + Math.PI * 2 - mouth);
        ctx.lineTo(p.x, p.y);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Player's digital core / eye
        const eyeOffset = {
          RIGHT: { dx: 1, dy: -3 },
          LEFT: { dx: -1, dy: -3 },
          UP: { dx: 3, dy: -1 },
          DOWN: { dx: 3, dy: 1 },
          NONE: { dx: 1, dy: -3 },
        }[p.currentDir];

        ctx.fillStyle = palette.playerMouthColor;
        ctx.beginPath();
        ctx.arc(p.x + eyeOffset.dx, p.y + eyeOffset.dy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. Draw Logic Hunter Ghosts
      const isFlashing = s.frightenedTimer > 0 && s.frightenedTimer < 2400 && Math.floor(timestamp / 180) % 2 === 0;

      (Object.keys(s.ghosts) as GhostId[]).forEach((id) => {
        const g = s.ghosts[id];
        const gx = g.x;
        const gy = g.y;
        const r = TILE_SIZE / 2 - 1;

        if (g.state === 'EATEN' || g.isRegenerating) {
          // Only draw glowing digital scanner reticle eyes
          ctx.fillStyle = GHOST_COLORS.EYES;
          const eyeLook = DIR_DELTA[g.dir];
          ctx.beginPath();
          ctx.arc(gx - 3 + eyeLook.dx * 2, gy + eyeLook.dy * 2, 2.5, 0, Math.PI * 2);
          ctx.arc(gx + 3 + eyeLook.dx * 2, gy + eyeLook.dy * 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
          return;
        }

        // Ghost Body Color
        let bodyColor = g.color;
        if (g.state === 'FRIGHTENED') {
          bodyColor = isFlashing ? GHOST_COLORS.FRIGHTENED_FLASH : GHOST_COLORS.FRIGHTENED;
        }

        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        // Dome head
        ctx.arc(gx, gy - 2, r, Math.PI, 0, false);
        // Skirt with 3 wavy tentacles
        ctx.lineTo(gx + r, gy + r);
        ctx.lineTo(gx + r * 0.5, gy + r - 3);
        ctx.lineTo(gx, gy + r);
        ctx.lineTo(gx - r * 0.5, gy + r - 3);
        ctx.lineTo(gx - r, gy + r);
        ctx.closePath();
        ctx.fill();

        // Ghost Eyes
        if (g.state === 'FRIGHTENED') {
          // Frightened cyber face (glowing small squares)
          ctx.fillStyle = isFlashing ? '#2563eb' : '#ffffff';
          ctx.fillRect(gx - 3.5, gy - 3, 2, 2);
          ctx.fillRect(gx + 1.5, gy - 3, 2, 2);
          // Wavy mouth
          ctx.fillRect(gx - 3, gy + 2, 6, 1.5);
        } else {
          // Normal Expressive Eyes looking in moving direction
          const look = DIR_DELTA[g.dir];

          // White eye base
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(gx - 3.2 + look.dx, gy - 3 + look.dy, 2.8, 0, Math.PI * 2);
          ctx.arc(gx + 3.2 + look.dx, gy - 3 + look.dy, 2.8, 0, Math.PI * 2);
          ctx.fill();

          // Blue pupil
          ctx.fillStyle = '#1e3a8a';
          ctx.beginPath();
          ctx.arc(gx - 3.2 + look.dx * 1.8, gy - 3 + look.dy * 1.8, 1.4, 0, Math.PI * 2);
          ctx.arc(gx + 3.2 + look.dx * 1.8, gy - 3 + look.dy * 1.8, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 7. Draw Floating Texts (+200, +400, etc.)
      for (const ft of s.floatingTexts) {
        ctx.fillStyle = palette.powerColor;
        ctx.globalAlpha = ft.alpha;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.globalAlpha = 1;

      // 8. Banners for System Ready & Stage Cleared
      if (s.readyCountdown > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, CANVAS_H / 2 - 18, CANVAS_W, 36);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SYSTEM READY!', CANVAS_W / 2, CANVAS_H / 2);
      } else if (s.roundClearTimer > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, CANVAS_H / 2 - 22, CANVAS_W, 44);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('STAGE CLEARED!', CANVAS_W / 2, CANVAS_H / 2 - 6);

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`OVERCLOCKING CORRIDORS... (+${POINTS_STAGE_CLEAR} PTS)`, CANVAS_W / 2, CANVAS_H / 2 + 10);
      }

      animFrameId.current = requestAnimationFrame(loop);
    };

    animFrameId.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [gameStatus, dark, resetEntitiesPositions, startNextRound]);

  // ── D-Pad Button Styling ──────────────────────────────────────────────────
  const dpadBtnStyle = `w-12 h-12 rounded-[4px] border flex items-center justify-center font-bold text-sm
    select-none cursor-pointer transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
      dark
        ? 'bg-[#1a1a1c] border-slate-800 text-slate-300 active:bg-cyan-500 active:text-black active:border-cyan-400'
        : 'bg-white border-slate-200 text-slate-700 active:bg-slate-900 active:text-white active:border-slate-900'
    }`;

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl mx-auto px-4 py-8">
      {/* ══ Left Column: Game Canvas & Onscreen Controls ════════════════════ */}
      <div className="flex-1 flex flex-col items-center">
        {/* Game Stats Hub */}
        <div
          className={`flex justify-between items-center w-full max-w-[448px] mb-4 p-4 rounded-[4px] border transition-colors ${
            dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {/* Lives Display */}
          <div>
            <div
              className={`text-xs font-semibold mb-1 flex items-center gap-1.5 ${
                dark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" /> Nodes
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border transition-all flex items-center justify-center text-[9px] font-bold ${
                    i < lives
                      ? dark
                        ? 'bg-yellow-400 border-yellow-300 text-black shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                        : 'bg-yellow-500 border-yellow-600 text-white'
                      : 'bg-transparent border-slate-700 opacity-30'
                  }`}
                >
                  {i < lives ? '⚡' : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Current Score */}
          <div className="text-center">
            <div className={`text-xs font-semibold mb-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Score</div>
            <div className={`text-xl font-bold font-mono ${dark ? 'text-white' : 'text-slate-900'}`}>{score}</div>
          </div>

          {/* Round Indicator */}
          <div className="text-center">
            <div className={`text-xs font-semibold mb-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Stage</div>
            <div className="text-xl font-bold font-mono text-cyan-500">
              {String(round).padStart(2, '0')}
            </div>
          </div>

          {/* Best Score */}
          <div className="text-right">
            <div
              className={`text-xs font-semibold mb-0.5 flex items-center justify-end gap-1 ${
                dark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              <Award className="w-3.5 h-3.5" /> Best
            </div>
            <div className={`text-xl font-bold font-mono ${dark ? 'text-white' : 'text-slate-900'}`}>{highScore}</div>
          </div>
        </div>

        {/* Board Canvas Wrapper */}
        <div className="w-full max-w-[448px] flex flex-col items-center">
          <div className="relative border border-slate-800 rounded-[4px] overflow-hidden bg-[#09090b] w-full shadow-2xl">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="block w-full aspect-[28/31] cursor-pointer"
            />

            {/* ── Overlay: Start Game (IDLE) ──────────────────────────────── */}
            {gameStatus === 'IDLE' && (
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 ${
                  dark ? 'bg-[#121214]/95' : 'bg-white/95'
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-3xl mb-3 shadow-[0_0_15px_rgba(250,204,21,0.3)] animate-pulse">
                  👾
                </div>
                <h3 className={`text-lg font-bold uppercase tracking-wider mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>
                  Cyber Crypt Runner
                </h3>
                <p className={`text-xs mb-6 max-w-xs leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Steer Bit-Man through the CPU motherboard maze. Harvest glowing binary fragments and eliminate firewall hunters!
                </p>

                <button
                  onClick={resetGame}
                  className={`flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-[4px] border transition-colors uppercase tracking-wider text-xs cursor-pointer w-full max-w-xs ${
                    dark
                      ? 'bg-white text-black border-white hover:bg-transparent hover:text-white'
                      : 'bg-slate-900 text-white border-slate-900 hover:bg-transparent hover:text-slate-900'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Start Mission
                </button>
              </div>
            )}

            {/* ── Overlay: Game Paused ───────────────────────────────────── */}
            {gameStatus === 'PAUSED' && (
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center p-6 gap-4 animate-fade-in z-20 ${
                  dark ? 'bg-[#121214]/95' : 'bg-white/95'
                }`}
              >
                <h3 className={`text-lg font-bold uppercase tracking-wider ${dark ? 'text-white' : 'text-slate-900'}`}>
                  Execution Paused
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setGameStatus('PLAYING');
                      lastTimeRef.current = performance.now();
                    }}
                    className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-[4px] border transition-colors uppercase tracking-wider text-xs cursor-pointer ${
                      dark
                        ? 'bg-white text-black border-white hover:bg-transparent hover:text-white'
                        : 'bg-slate-900 text-white border-slate-900 hover:bg-transparent hover:text-slate-900'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Resume
                  </button>
                  <button
                    onClick={abortGame}
                    className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-[4px] border transition-colors uppercase tracking-wider text-xs cursor-pointer ${
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

            {/* ── Overlay: Game Over ─────────────────────────────────────── */}
            {gameStatus === 'GAME_OVER' && (
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 ${
                  dark ? 'bg-[#121214]/95' : 'bg-white/95'
                }`}
              >
                <ShieldAlert className="w-12 h-12 text-red-500 mb-2 animate-bounce" />
                <h3 className="text-lg font-bold text-red-500 mb-1 uppercase tracking-wider">
                  Core Compromised
                </h3>
                <p className={`mb-4 font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Final Score: <span className={dark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>{score}</span>
                </p>

                {showNamePrompt ? (
                  <div className="w-full max-w-xs flex flex-col gap-3">
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      New High Score! Register Call Sign
                    </div>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="Player Call Sign"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveScore();
                      }}
                      className={`w-full rounded-[4px] px-3 py-2 text-center text-base font-medium focus:outline-none transition-colors border ${
                        dark
                          ? 'bg-[#1a1a1c] border-slate-800 text-[#e8e8ea] placeholder-slate-600 focus:border-white'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-900'
                      }`}
                    />
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={handleSaveScore}
                        className={`flex-1 font-bold py-2 rounded-[4px] border transition-colors text-xs uppercase tracking-wider cursor-pointer ${
                          dark
                            ? 'bg-white text-black border-white hover:bg-transparent hover:text-white'
                            : 'bg-slate-900 text-white border-slate-900 hover:bg-transparent hover:text-slate-900'
                        }`}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleSkipSaveScore}
                        className={`flex-1 font-bold py-2 rounded-[4px] border transition-colors text-xs uppercase tracking-wider cursor-pointer ${
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
                    className={`flex items-center gap-2 font-bold px-6 py-2.5 rounded-[4px] border transition-colors uppercase tracking-wider text-xs cursor-pointer ${
                      dark
                        ? 'bg-white text-black border-white hover:bg-transparent hover:text-white'
                        : 'bg-slate-900 text-white border-slate-900 hover:bg-transparent hover:text-slate-900'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reboot Corridors
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Mobile Onscreen D-Pad Controls ────────────────────────────── */}
          <div className="mt-5 flex flex-col items-center gap-1.5 w-full">
            {/* Up Row */}
            <div className="flex gap-1.5 justify-center">
              <div className="w-12 h-12" aria-hidden />
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  requestDirection('UP');
                }}
                disabled={gameStatus !== 'PLAYING'}
                className={dpadBtnStyle}
              >
                ▲
              </button>
              <div className="w-12 h-12" aria-hidden />
            </div>

            {/* Left / Down / Right Row */}
            <div className="flex gap-1.5 justify-center">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  requestDirection('LEFT');
                }}
                disabled={gameStatus !== 'PLAYING'}
                className={dpadBtnStyle}
              >
                ◀
              </button>
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  requestDirection('DOWN');
                }}
                disabled={gameStatus !== 'PLAYING'}
                className={dpadBtnStyle}
              >
                ▼
              </button>
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  requestDirection('RIGHT');
                }}
                disabled={gameStatus !== 'PLAYING'}
                className={dpadBtnStyle}
              >
                ▶
              </button>
            </div>

            {/* Pause / Resume Button */}
            <button
              onClick={() => {
                if (gameStatus === 'PLAYING') setGameStatus('PAUSED');
                else if (gameStatus === 'PAUSED') {
                  setGameStatus('PLAYING');
                  lastTimeRef.current = performance.now();
                }
              }}
              disabled={gameStatus === 'IDLE' || gameStatus === 'GAME_OVER'}
              className={`mt-2 w-44 h-10 rounded-[4px] border flex items-center justify-center gap-2 font-bold select-none cursor-pointer transition-colors uppercase tracking-wider text-xs disabled:opacity-40 disabled:cursor-not-allowed ${
                dark
                  ? 'bg-[#1a1a1c] border-slate-800 text-slate-300 active:bg-white active:text-black'
                  : 'bg-white border-slate-200 text-slate-600 active:bg-slate-900 active:text-white'
              }`}
            >
              {gameStatus === 'PLAYING' ? (
                <>
                  <Pause className="w-4 h-4" /> Pause Run
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Resume Run
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ══ Right Column: Sidebar & Leaderboard ═════════════════════════════ */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        {/* Game Settings */}
        <div
          className={`rounded-[4px] p-6 border flex flex-col gap-4 ${
            dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h3 className={`text-xs font-bold uppercase tracking-wider ${dark ? 'text-[#e8e8ea]' : 'text-slate-800'}`}>
            System Settings
          </h3>

          {/* Difficulty Selector */}
          <div>
            <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Firewall Aggression
            </div>
            <div className="flex gap-1.5">
              {(['EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
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
            <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Audio Feedback
            </div>
            <button
              type="button"
              onClick={() => {
                const m = audio.toggleMute();
                setMuted(m);
              }}
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-[4px] border text-xs font-bold transition-all cursor-pointer ${
                dark
                  ? 'bg-black/30 border-slate-800 text-slate-400 hover:border-slate-500 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              {muted ? (
                <>
                  <VolumeX className="w-4 h-4 text-red-500" /> Audio Muted
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-500" /> Audio Enabled
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tactical Controls Reference */}
        <div
          className={`hidden lg:block rounded-[4px] p-6 border ${
            dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Tactical Commands
          </h3>
          <ul className={`text-xs space-y-3 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            <li className={`flex justify-between items-center border-b pb-2 ${dark ? 'border-slate-900' : 'border-slate-100'}`}>
              <span>Steer Directions</span>
              <kbd
                className={`border px-2 py-0.5 rounded-[4px] text-[10px] font-mono ${
                  dark ? 'bg-black/50 border-slate-800 text-[#e8e8ea]' : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                W A S D / Arrows
              </kbd>
            </li>
            <li className={`flex justify-between items-center border-b pb-2 ${dark ? 'border-slate-900' : 'border-slate-100'}`}>
              <span>Mobile Controls</span>
              <kbd
                className={`border px-2 py-0.5 rounded-[4px] text-[10px] font-mono ${
                  dark ? 'bg-black/50 border-slate-800 text-[#e8e8ea]' : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                D-Pad / Swipe
              </kbd>
            </li>
            <li className={`flex justify-between items-center border-b pb-2 ${dark ? 'border-slate-900' : 'border-slate-100'}`}>
              <span>Pause / Resume</span>
              <kbd
                className={`border px-2 py-0.5 rounded-[4px] text-[10px] font-mono ${
                  dark ? 'bg-black/50 border-slate-800 text-[#e8e8ea]' : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                Spacebar
              </kbd>
            </li>
          </ul>
        </div>

        {/* Mission Objectives & Logic Hunters */}
        <div
          className={`rounded-[4px] p-6 border flex flex-col gap-3 ${
            dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h3 className={`text-xs font-bold uppercase tracking-wider ${dark ? 'text-[#e8e8ea]' : 'text-slate-800'}`}>
            Firewall Hunters
          </h3>
          <div className="space-y-2">
            {(Object.keys(GHOST_CONFIGS) as GhostId[]).map((id) => {
              const cfg = GHOST_CONFIGS[id];
              return (
                <div
                  key={id}
                  className={`flex items-center justify-between p-2 rounded-[4px] text-xs border ${
                    dark ? 'bg-black/20 border-slate-850' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className={`font-semibold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{cfg.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 text-right">
                    {id === 'BLINKY'
                      ? 'Direct / Cruise Elroy'
                      : id === 'PINKY'
                      ? '4-Tile Ambush (UP Quirk)'
                      : id === 'INKY'
                      ? 'Dual-Vector Flanker'
                      : '8-Tile Proximity Coward'}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className={`mt-2 pt-2 border-t text-[11px] leading-relaxed flex items-start gap-1.5 ${
              dark ? 'border-slate-850 text-slate-400' : 'border-slate-100 text-slate-600'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>Overclocked Power Nodes turn firewalls blue (+200, +400, +800, +1600 pts). Scatter/Chase cycles switch on timed waves with 180° turns.</span>
          </div>
        </div>

        {/* High Score Leaderboard */}
        <div
          className={`rounded-[4px] p-6 flex-1 flex flex-col border ${
            dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h3
            className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${
              dark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <Award className="w-4 h-4 text-yellow-500" /> High Score Logs
          </h3>
          <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2 pr-1">
            {leaderboard.length === 0 ? (
              <p className={`text-xs italic text-center py-6 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                No mission logs yet.
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
                    <span className={`text-[10px] font-bold font-mono ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-xs font-semibold truncate max-w-[120px] ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {entry.playerName}
                    </span>
                  </div>
                  <span className={`text-xs font-bold font-mono ${dark ? 'text-white' : 'text-slate-900'}`}>
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

export default CryptRunner;
