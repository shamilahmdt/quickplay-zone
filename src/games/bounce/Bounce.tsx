import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { storage } from '../../core/storage';
import { Award, Play, Pause, RotateCcw, Target, Sparkles, Volume2, VolumeX, Trophy } from 'lucide-react';
import { audio } from '../../core/audio';
import type { ScoreEntry } from '../../core/types';
import { BOUNCE_CONFIG } from './bounce.config';
import type { Level } from './bounce.logic';
import { LEVELS } from './bounce.logic';

export const Bounce: FC = () => {
  // --- Game State ---
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(() => {
    const saved = localStorage.getItem('bounce_unlocked_level');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [gameStatus, setGameStatus] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'WON' | 'GAME_OVER'>('IDLE');
  const [muted, setMuted] = useState(audio.getMuted());

  // --- Leaderboard & Stats ---
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [name, setName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Camera scroll position
  const cameraX = useRef(0);

  // Physics entity states as refs for smooth 60fps canvas loop
  const ball = useRef({
    x: 80,
    y: 300,
    vx: 0,
    vy: 0,
    radius: BOUNCE_CONFIG.BALL_RADIUS,
    isGrounded: false,
    scaleX: 1,
    scaleY: 1,
  });

  const levelRef = useRef<Level>(JSON.parse(JSON.stringify(LEVELS[0])));
  const respawnPos = useRef({ x: 80, y: 300 });

  // Load high score & increment play count on mount
  useEffect(() => {
    const stats = storage.getGameStats('bounce');
    setHighScore(stats.highScore);
    setLeaderboard(storage.getLeaderboard('bounce'));
    storage.incrementPlayCount('bounce');
  }, []);

  // Broadcast playing status
  useEffect(() => {
    const isPlaying = gameStatus === 'PLAYING';
    window.dispatchEvent(new CustomEvent('qplay-status', { detail: { isPlaying } }));
    return () => {
      window.dispatchEvent(new CustomEvent('qplay-status', { detail: { isPlaying: false } }));
    };
  }, [gameStatus]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyW', 'KeyA', 'KeyD', 'Space', 'KeyR'];
      if (keys.includes(e.code)) {
        e.preventDefault();
      }

      keysPressed.current[e.code] = true;

      if (e.code === 'Space') {
        if (gameStatus === 'PLAYING') {
          setGameStatus('PAUSED');
        } else if (gameStatus === 'PAUSED') {
          setGameStatus('PLAYING');
        }
      }

      if (e.code === 'KeyR') {
        initGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStatus, currentLevelIdx]);

  // Mobile / Touch controls handlers
  const handleLeftStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysPressed.current['ArrowLeft'] = true;
  };
  const handleLeftEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysPressed.current['ArrowLeft'] = false;
  };
  const handleRightStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysPressed.current['ArrowRight'] = true;
  };
  const handleRightEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysPressed.current['ArrowRight'] = false;
  };
  const handleJumpStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysPressed.current['ArrowUp'] = true;
  };
  const handleJumpEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysPressed.current['ArrowUp'] = false;
  };

  // Init/Reset game
  const initGame = () => {
    const freshLevel: Level = JSON.parse(JSON.stringify(LEVELS[0]));
    levelRef.current = freshLevel;
    respawnPos.current = { x: freshLevel.startPos.x, y: freshLevel.startPos.y };
    ball.current = {
      x: freshLevel.startPos.x,
      y: freshLevel.startPos.y,
      vx: 0,
      vy: 0,
      radius: BOUNCE_CONFIG.BALL_RADIUS,
      isGrounded: false,
      scaleX: 1,
      scaleY: 1,
    };
    cameraX.current = 0;
    setScore(0);
    setLives(3);
    setCurrentLevelIdx(0);
    setGameStatus('PLAYING');
    setShowNamePrompt(false);
  };

  const loadLevel = (levelIdx: number) => {
    const freshLevel: Level = JSON.parse(JSON.stringify(LEVELS[levelIdx]));
    levelRef.current = freshLevel;
    respawnPos.current = { x: freshLevel.startPos.x, y: freshLevel.startPos.y };
    ball.current = {
      x: freshLevel.startPos.x,
      y: freshLevel.startPos.y,
      vx: 0,
      vy: 0,
      radius: BOUNCE_CONFIG.BALL_RADIUS,
      isGrounded: false,
      scaleX: 1,
      scaleY: 1,
    };
    cameraX.current = 0;
    setCurrentLevelIdx(levelIdx);
  };

  const handleDie = () => {
    audio.playPlayerHit();
    setLives((prev) => {
      const nextLives = prev - 1;
      if (nextLives <= 0) {
        setGameStatus('GAME_OVER');
        audio.playGameOver();
        setShowNamePrompt(score > 0);
      } else {
        // Reset ball position to last checkpoint
        ball.current.x = respawnPos.current.x;
        ball.current.y = respawnPos.current.y;
        ball.current.vx = 0;
        ball.current.vy = 0;
        ball.current.scaleX = 1;
        ball.current.scaleY = 1;
      }
      return nextLives;
    });
  };

  // Main Canvas Loop
  useEffect(() => {
    if (gameStatus !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localAnimationFrameId: number;

    const updatePhysics = () => {
      const b = ball.current;
      const lvl = levelRef.current;
      const keys = keysPressed.current;

      // Apply jump force (using grounding state from previous frame)
      if ((keys['ArrowUp'] || keys['KeyW']) && b.isGrounded) {
        b.vy = BOUNCE_CONFIG.JUMP_FORCE;
        b.isGrounded = false;
        b.scaleY = 1.3;
        b.scaleX = 0.75;
        audio.playBrickPaddle();
      }

      // Handle input directions
      if (keys['ArrowLeft'] || keys['KeyA']) {
        b.vx -= BOUNCE_CONFIG.ROLL_SPEED;
      }
      if (keys['ArrowRight'] || keys['KeyD']) {
        b.vx += BOUNCE_CONFIG.ROLL_SPEED;
      }

      // Reset grounding for this frame's collision checks
      b.isGrounded = false;

      // Apply physics constants
      b.vy += BOUNCE_CONFIG.GRAVITY;
      b.vx *= BOUNCE_CONFIG.FRICTION;

      // Limit speed
      b.vx = Math.max(-BOUNCE_CONFIG.MAX_ROLL, Math.min(BOUNCE_CONFIG.MAX_ROLL, b.vx));

      // Update position
      b.x += b.vx;
      b.y += b.vy;

      // Return ball to normal scaling
      b.scaleX += (1 - b.scaleX) * 0.15;
      b.scaleY += (1 - b.scaleY) * 0.15;

      // --- Screen bounds ---
      if (b.x - b.radius < 0) {
        b.x = b.radius;
        b.vx = -b.vx * 0.5;
        b.scaleX = 0.7;
        b.scaleY = 1.3;
      }
      if (b.x + b.radius > lvl.width) {
        b.x = lvl.width - b.radius;
        b.vx = -b.vx * 0.5;
        b.scaleX = 0.7;
        b.scaleY = 1.3;
      }
      if (b.y - b.radius < 0) {
        b.y = b.radius;
        b.vy = 0;
      }

      // Check bottom fall death
      if (b.y - b.radius > BOUNCE_CONFIG.CANVAS_HEIGHT) {
        handleDie();
        return;
      }

      // --- Collisions with Blocks & Trampolines ---
      lvl.blocks.forEach((box) => {
        const closestX = Math.max(box.x, Math.min(b.x, box.x + box.width));
        const closestY = Math.max(box.y, Math.min(b.y, box.y + box.height));

        const diffX = b.x - closestX;
        const diffY = b.y - closestY;
        const distSq = diffX * diffX + diffY * diffY;

        if (distSq < b.radius * b.radius) {
          const dist = Math.sqrt(distSq);
          if (dist === 0) return;

          const overlap = b.radius - dist;
          const nx = diffX / dist;
          const ny = diffY / dist;

          b.x += nx * overlap;
          b.y += ny * overlap;

          const velAlongNormal = b.vx * nx + b.vy * ny;
          if (velAlongNormal < 0) {
            // Check top side collision
            if (ny < -0.7) {
              if (box.isBouncy) {
                // Trampoline bounce!
                b.vy = BOUNCE_CONFIG.JUMP_FORCE * 1.7;
                b.scaleY = 0.5;
                b.scaleX = 1.5;
                audio.playSnakeGolden(); // Boing!
              } else {
                b.isGrounded = true;
                b.vy = 0;
                if (Math.abs(velAlongNormal) > 1.5) {
                  b.scaleY = Math.max(0.6, 1 - Math.abs(velAlongNormal) * 0.08);
                  b.scaleX = 1 + (1 - b.scaleY) * 0.5;
                }
              }
            } else {
              b.vx -= nx * velAlongNormal * 1.2;
              b.vy -= ny * velAlongNormal * 1.2;
              if (Math.abs(velAlongNormal) > 1.5) {
                b.scaleX = Math.max(0.6, 1 - Math.abs(velAlongNormal) * 0.08);
                b.scaleY = 1 + (1 - b.scaleX) * 0.5;
              }
            }
          }
        }
      });

      // --- Collisions with Checkpoints ---
      lvl.checkpoints.forEach((cp) => {
        if (cp.active) return;
        const dist = Math.abs(b.x - cp.x);
        // If ball crosses flag
        if (dist < b.radius + 10 && b.y > cp.y - 50 && b.y < cp.y + 10) {
          lvl.checkpoints.forEach((c) => (c.active = false)); // Clear others
          cp.active = true;
          respawnPos.current = { x: cp.x, y: cp.y };
          audio.playSnakeEat(); // checkpoint sound
        }
      });

      // --- Collisions with Spikes ---
      lvl.spikes.forEach((spike) => {
        const closestX = Math.max(spike.x, Math.min(b.x, spike.x + spike.width));
        const closestY = Math.max(spike.y, Math.min(b.y, spike.y + spike.height));

        const diffX = b.x - closestX;
        const diffY = b.y - closestY;
        const distSq = diffX * diffX + diffY * diffY;

        if (distSq < (b.radius - 2) * (b.radius - 2)) {
          handleDie();
        }
      });

      // --- Collisions with Rings ---
      lvl.rings.forEach((ring) => {
        if (ring.collected) return;
        const diffX = b.x - ring.x;
        const diffY = b.y - ring.y;
        const dist = Math.sqrt(diffX * diffX + diffY * diffY);

        if (dist < b.radius + ring.radius) {
          ring.collected = true;
          audio.playSnakeGolden();
          setScore((prev) => prev + 100);
        }
      });

      // --- Check Exit Portal ---
      const allRingsCollected = lvl.rings.every((r) => r.collected);
      if (allRingsCollected) {
        const exit = lvl.exitPortal;
        const closestX = Math.max(exit.x, Math.min(b.x, exit.x + exit.width));
        const closestY = Math.max(exit.y, Math.min(b.y, exit.y + exit.height));

        const diffX = b.x - closestX;
        const diffY = b.y - closestY;
        const distSq = diffX * diffX + diffY * diffY;

        if (distSq < b.radius * b.radius) {
          // Win level!
          audio.playLevelUp();
          if (currentLevelIdx < LEVELS.length - 1) {
            const nextLevel = currentLevelIdx + 2;
            setUnlockedLevel((prev) => {
              const val = Math.max(prev, nextLevel);
              localStorage.setItem('bounce_unlocked_level', val.toString());
              return val;
            });
            loadLevel(currentLevelIdx + 1);
            setScore((prev) => prev + 500);
          } else {
            // Completed last level!
            setGameStatus('WON');
            audio.playLevelUp();
            setShowNamePrompt(true);
          }
        }
      }

      // --- Smooth Camera Tracking ---
      const targetCameraX = b.x - BOUNCE_CONFIG.CANVAS_WIDTH / 2;
      cameraX.current += (targetCameraX - cameraX.current) * 0.1;
      cameraX.current = Math.max(0, Math.min(lvl.width - BOUNCE_CONFIG.CANVAS_WIDTH, cameraX.current));
    };

    const render = () => {
      ctx.clearRect(0, 0, BOUNCE_CONFIG.CANVAS_WIDTH, BOUNCE_CONFIG.CANVAS_HEIGHT);

      const b = ball.current;
      const lvl = levelRef.current;

      // Draw Sky Gradient background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, BOUNCE_CONFIG.CANVAS_HEIGHT);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, BOUNCE_CONFIG.CANVAS_WIDTH, BOUNCE_CONFIG.CANVAS_HEIGHT);

      // Parallax Background elements (distant hills)
      ctx.save();
      ctx.translate(-cameraX.current * 0.2, 0);
      ctx.fillStyle = '#312e81';
      ctx.beginPath();
      ctx.moveTo(0, 400);
      ctx.lineTo(250, 180);
      ctx.lineTo(600, 350);
      ctx.lineTo(900, 150);
      ctx.lineTo(1300, 360);
      ctx.lineTo(1700, 130);
      ctx.lineTo(2000, 400);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Middleground Parallax hills
      ctx.save();
      ctx.translate(-cameraX.current * 0.5, 0);
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(0, 400);
      ctx.lineTo(150, 280);
      ctx.lineTo(400, 360);
      ctx.lineTo(700, 240);
      ctx.lineTo(1000, 370);
      ctx.lineTo(1350, 220);
      ctx.lineTo(1800, 400);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Start scrolling world
      ctx.save();
      ctx.translate(-cameraX.current, 0);

      // Draw Blocks
      lvl.blocks.forEach((block) => {
        if (block.isBouncy) {
          // Bouncy Pad Trampoline
          ctx.fillStyle = '#f43f5e'; // Pink/Red bouncy pad
          ctx.fillRect(block.x, block.y, block.width, block.height);
          ctx.fillStyle = '#fda4af'; // Highlight bar
          ctx.fillRect(block.x, block.y, block.width, 4);
        } else {
          ctx.fillStyle = BOUNCE_CONFIG.COLORS.block;
          ctx.fillRect(block.x, block.y, block.width, block.height);
          ctx.strokeStyle = BOUNCE_CONFIG.COLORS.blockBorder;
          ctx.lineWidth = 2;
          ctx.strokeRect(block.x, block.y, block.width, block.height);
        }
      });

      // Draw Checkpoints
      lvl.checkpoints.forEach((cp) => {
        ctx.fillStyle = '#94a3b8'; // Pole
        ctx.fillRect(cp.x, cp.y - 45, 4, 45);

        ctx.fillStyle = cp.active ? '#10b981' : '#ef4444'; // Flag
        ctx.beginPath();
        ctx.moveTo(cp.x + 4, cp.y - 45);
        ctx.lineTo(cp.x + 24, cp.y - 35);
        ctx.lineTo(cp.x + 4, cp.y - 25);
        ctx.closePath();
        ctx.fill();
      });

      // Draw Spikes
      lvl.spikes.forEach((spike) => {
        ctx.fillStyle = BOUNCE_CONFIG.COLORS.spike;
        const numSpikes = Math.floor(spike.width / 15);
        const spikeW = spike.width / numSpikes;

        ctx.beginPath();
        for (let i = 0; i < numSpikes; i++) {
          const sx = spike.x + i * spikeW;
          ctx.moveTo(sx, spike.y + spike.height);
          ctx.lineTo(sx + spikeW / 2, spike.y);
          ctx.lineTo(sx + spikeW, spike.y + spike.height);
        }
        ctx.closePath();
        ctx.fill();
      });

      // Draw Rings
      lvl.rings.forEach((ring) => {
        if (ring.collected) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = BOUNCE_CONFIG.COLORS.ring;
        ctx.shadowColor = BOUNCE_CONFIG.COLORS.ringGlow;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      });

      // Draw Exit Portal
      const exit = lvl.exitPortal;
      const allRingsCollected = lvl.rings.every((r) => r.collected);
      ctx.save();
      ctx.fillStyle = allRingsCollected ? '#059669' : '#374151';
      ctx.fillRect(exit.x, exit.y, exit.width, exit.height);
      ctx.strokeStyle = allRingsCollected ? BOUNCE_CONFIG.COLORS.exitGlow : '#4b5563';
      ctx.shadowColor = allRingsCollected ? BOUNCE_CONFIG.COLORS.exitGlow : 'transparent';
      ctx.shadowBlur = allRingsCollected ? 10 : 0;
      ctx.lineWidth = 3;
      ctx.strokeRect(exit.x, exit.y, exit.width, exit.height);
      ctx.restore();

      // Draw Squishy Ball
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(b.scaleX, b.scaleY);
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = BOUNCE_CONFIG.COLORS.ball;
      ctx.shadowColor = BOUNCE_CONFIG.COLORS.ballGlow;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();

      ctx.restore(); // Stop scrolling world translate
    };

    const loop = () => {
      updatePhysics();
      render();
      localAnimationFrameId = requestAnimationFrame(loop);
    };

    localAnimationFrameId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(localAnimationFrameId);
    };
  }, [gameStatus, currentLevelIdx, score]);

  // --- Leaderboard Actions ---
  const handleSaveScore = () => {
    storage.addLeaderboardScore('bounce', {
      playerName: name.trim() || 'Anonymous Player',
      score: score,
    });
    storage.updateHighScore('bounce', score);
    setLeaderboard(storage.getLeaderboard('bounce'));
    setShowNamePrompt(false);
    setName('');
  };

  const handleSkipSaveScore = () => {
    storage.addLeaderboardScore('bounce', {
      playerName: 'Anonymous Player',
      score: score,
    });
    storage.updateHighScore('bounce', score);
    setLeaderboard(storage.getLeaderboard('bounce'));
    setShowNamePrompt(false);
    setName('');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl mx-auto px-4 pt-0 pb-6 select-none">
      {/* --- Game Board Column --- */}
      <div className="flex-1 flex flex-col items-center w-full">
        {/* Game Stats Hub */}
        <div className="flex justify-between items-center w-[min(100vw-32px,600px)] mb-4 bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-zinc-800 p-3 sm:p-4 rounded-[4px]">
          <div>
            <div className="text-xs text-zinc-500 dark:text-slate-400 font-semibold mb-0.5 uppercase">
              Score
            </div>
            <div className="text-xl font-bold text-zinc-900 dark:text-white font-mono">{score}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 dark:text-slate-400 font-semibold mb-0.5 uppercase text-center">
              Lives
            </div>
            <div className="text-xl font-bold text-red-500 font-mono text-center">
              {'❤️'.repeat(Math.max(0, lives))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500 dark:text-slate-400 font-semibold mb-0.5 flex items-center justify-end gap-1 uppercase">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Best
            </div>
            <div className="text-xl font-bold text-zinc-900 dark:text-white font-mono">{highScore}</div>
          </div>
        </div>

        {/* Board Frame Wrapper */}
        <div className="w-[min(100vw-32px,600px)] aspect-[3/2] relative border border-zinc-300 dark:border-zinc-800 rounded-[16px] overflow-hidden bg-zinc-50 dark:bg-[#09090b]">
          <canvas
            ref={canvasRef}
            width={BOUNCE_CONFIG.CANVAS_WIDTH}
            height={BOUNCE_CONFIG.CANVAS_HEIGHT}
            className="w-full h-full block"
          />

          {/* --- Overlays --- */}
          {gameStatus === 'IDLE' && (
            <div className="absolute inset-0 bg-white/95 dark:bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
              <Target className="w-12 h-12 text-red-500 mb-3 animate-bounce" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 uppercase tracking-wider">Bounce Tales</h3>
              <p className="text-xs text-zinc-500 dark:text-slate-400 mb-6 max-w-[280px]">
                Roll, bounce, and squish! Collect all golden rings, trigger red checkpoint flags, and enter the green portal exit.
              </p>

              <button
                onClick={initGame}
                className="flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold px-6 py-2.5 rounded-[4px] border border-zinc-900 dark:border-white hover:bg-transparent hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer w-full max-w-xs pointer-events-auto"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Start Mission
              </button>
            </div>
          )}

          {gameStatus === 'PAUSED' && (
            <div className="absolute inset-0 bg-white/95 dark:bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
              <Pause className="w-12 h-12 text-zinc-800 dark:text-[#e8e8ea] mb-3 animate-pulse" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 uppercase tracking-wider">Game Paused</h3>
              <p className="text-xs text-zinc-500 dark:text-slate-400 mb-6 max-w-[280px]">
                Press Space or click Resume to continue.
              </p>

              <button
                onClick={() => setGameStatus('PLAYING')}
                className="flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold px-6 py-2.5 rounded-[4px] border border-zinc-900 dark:border-white hover:bg-transparent hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer w-full max-w-xs pointer-events-auto"
              >
                <Play className="w-3.5 h-3.5 fill-current animate-pulse" /> Resume Game
              </button>
            </div>
          )}

          {gameStatus === 'WON' && (
            <div className="absolute inset-0 bg-white/95 dark:bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
              <Sparkles className="w-12 h-12 text-yellow-500 mb-3 animate-bounce" />
              <h3 className="text-2xl font-black text-yellow-600 dark:text-yellow-400 mb-2 uppercase tracking-wider">Victory!</h3>
              <p className="text-sm text-zinc-650 dark:text-slate-300 mb-6 font-medium">
                You successfully cleared all levels in <span className="font-bold text-zinc-900 dark:text-white">Bounce Tales</span>!
              </p>

              {showNamePrompt ? (
                <div className="w-full max-w-xs flex flex-col gap-3 pointer-events-auto">
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-300 dark:border-zinc-800 rounded-[4px] px-3 py-2 text-zinc-900 dark:text-[#e8e8ea] placeholder-zinc-400 dark:placeholder-slate-650 text-center text-base font-medium focus:outline-none focus:border-zinc-500 dark:focus:border-white transition-colors"
                  />
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={handleSaveScore}
                      className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold py-2 rounded-[4px] border border-zinc-900 dark:border-white hover:bg-transparent hover:text-zinc-900 dark:hover:text-white transition-colors text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleSkipSaveScore}
                      className="flex-1 bg-zinc-100 dark:bg-[#1a1a1c] text-zinc-500 dark:text-slate-400 font-bold py-2 rounded-[4px] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={initGame}
                  className="flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold px-6 py-2.5 rounded-[4px] border border-zinc-900 dark:border-white hover:bg-transparent hover:text-zinc-900 dark:hover:text-white transition-colors tracking-wider text-xs cursor-pointer uppercase pointer-events-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Play Again
                </button>
              )}
            </div>
          )}

          {gameStatus === 'GAME_OVER' && (
            <div className="absolute inset-0 bg-white/95 dark:bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
              <h3 className="text-xl font-bold text-red-600 dark:text-red-500 mb-2 uppercase tracking-wider">Game Over</h3>
              <p className="text-zinc-700 dark:text-slate-300 mb-4 font-medium">
                Final Score: <span className="text-zinc-900 dark:text-white font-mono font-bold">{score}</span>
              </p>

              {showNamePrompt ? (
                <div className="w-full max-w-xs flex flex-col gap-3 pointer-events-auto">
                  <div className="text-[10px] font-bold text-zinc-500 dark:text-slate-400 uppercase tracking-wider">
                    Record your score on the Leaderboard
                  </div>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-300 dark:border-zinc-800 rounded-[4px] px-3 py-2 text-zinc-900 dark:text-[#e8e8ea] placeholder-zinc-400 dark:placeholder-slate-650 text-center text-base font-medium focus:outline-none focus:border-zinc-500 dark:focus:border-white transition-colors"
                  />
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={handleSaveScore}
                      className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold py-2 rounded-[4px] border border-zinc-900 dark:border-white hover:bg-transparent hover:text-zinc-900 dark:hover:text-white transition-colors text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleSkipSaveScore}
                      className="flex-1 bg-zinc-100 dark:bg-[#1a1a1c] text-zinc-500 dark:text-slate-400 font-bold py-2 rounded-[4px] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={initGame}
                  className="flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold px-6 py-2.5 rounded-[4px] border border-zinc-900 dark:border-white hover:bg-transparent hover:text-zinc-900 dark:hover:text-white transition-colors tracking-wider text-xs cursor-pointer uppercase pointer-events-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Play Again
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between w-[min(100vw-32px,600px)] px-2">
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-start">
            <button
              onClick={initGame}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-650 dark:text-slate-355 font-bold text-xs rounded-[4px] border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            >
              Reset Level
            </button>
            {(gameStatus === 'PLAYING' || gameStatus === 'PAUSED') && (
              <button
                onClick={() => setGameStatus((prev) => (prev === 'PLAYING' ? 'PAUSED' : 'PLAYING'))}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-650 dark:text-slate-355 font-bold text-xs rounded-[4px] border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
              >
                {gameStatus === 'PLAYING' ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Resume
                  </>
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <span className="text-xs font-bold text-zinc-500 dark:text-slate-400 uppercase">Mission:</span>
            <select
              value={currentLevelIdx}
              onChange={(e) => {
                const targetIdx = parseInt(e.target.value, 10);
                if (targetIdx + 1 <= unlockedLevel) {
                  loadLevel(targetIdx);
                }
              }}
              className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded px-2.5 py-1 text-xs font-bold focus:outline-none cursor-pointer"
            >
              {LEVELS.map((_, idx) => (
                <option 
                  key={idx} 
                  value={idx}
                  disabled={idx + 1 > unlockedLevel}
                >
                  Level {idx + 1} {idx + 1 > unlockedLevel ? '🔒' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile Control Panel */}
        {(gameStatus === 'PLAYING' || gameStatus === 'PAUSED') && (
          <div className="mt-6 flex justify-between w-[min(100vw-32px,600px)] px-2 md:hidden">
            {/* D-Pad Left / Right */}
            <div className="flex gap-4">
              <button
                onTouchStart={handleLeftStart}
                onTouchEnd={handleLeftEnd}
                onMouseDown={handleLeftStart}
                onMouseUp={handleLeftEnd}
                onMouseLeave={handleLeftEnd}
                className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 active:bg-zinc-350 dark:active:bg-zinc-700 rounded-2xl flex items-center justify-center cursor-pointer border border-zinc-300 dark:border-zinc-700 select-none shadow-md touch-none"
                title="Move Left"
              >
                <svg className="w-8 h-8 text-zinc-700 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onTouchStart={handleRightStart}
                onTouchEnd={handleRightEnd}
                onMouseDown={handleRightStart}
                onMouseUp={handleRightEnd}
                onMouseLeave={handleRightEnd}
                className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 active:bg-zinc-350 dark:active:bg-zinc-700 rounded-2xl flex items-center justify-center cursor-pointer border border-zinc-300 dark:border-zinc-700 select-none shadow-md touch-none"
                title="Move Right"
              >
                <svg className="w-8 h-8 text-zinc-700 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Jump Button */}
            <div>
              <button
                onTouchStart={handleJumpStart}
                onTouchEnd={handleJumpEnd}
                onMouseDown={handleJumpStart}
                onMouseUp={handleJumpEnd}
                onMouseLeave={handleJumpEnd}
                className="w-16 h-16 bg-red-500 active:bg-red-650 rounded-full flex items-center justify-center cursor-pointer border border-red-400 select-none shadow-lg shadow-red-500/25 touch-none"
                title="Jump"
              >
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7 7 7M12 3v18" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- Leaderboard & Stats Column --- */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        {/* Game Options Panel */}
        <div className="bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-zinc-800 rounded-[4px] p-6 flex flex-col gap-5">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            Game Options
          </h3>

          {/* Audio Settings */}
          <div>
            <div className="text-[10px] font-bold text-zinc-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Audio Settings
            </div>
            <button
              type="button"
              onClick={() => {
                const newMute = audio.toggleMute();
                setMuted(newMute);
              }}
              className="flex items-center justify-center gap-2 w-full py-1.5 rounded-[4px] border text-[9px] font-bold transition-all cursor-pointer bg-zinc-200/50 dark:bg-black/30 border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-slate-400 hover:border-zinc-400 dark:hover:border-slate-500 hover:text-zinc-900 dark:hover:text-white"
            >
              {muted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-red-500" /> Muted
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-500" /> Sound Enabled
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-zinc-800 rounded-[4px] p-6">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4">
            Instructions
          </h3>
          <ul className="text-xs space-y-3 text-zinc-655 dark:text-slate-400">
            <li className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-2">
              <span>Roll Ball</span>
              <span className="flex gap-1">
                <kbd className="bg-zinc-200 dark:bg-black/50 border border-zinc-300 dark:border-zinc-800 px-1.5 py-0.5 rounded-[4px] text-zinc-800 dark:text-[#e8e8ea] text-[10px] font-mono font-bold">A / D</kbd>
                <kbd className="bg-zinc-200 dark:bg-black/50 border border-zinc-300 dark:border-zinc-800 px-1.5 py-0.5 rounded-[4px] text-zinc-800 dark:text-[#e8e8ea] text-[10px] font-mono font-bold">◀▶</kbd>
              </span>
            </li>
            <li className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-2">
              <span>Jump</span>
              <span className="flex gap-1">
                <kbd className="bg-zinc-200 dark:bg-black/50 border border-zinc-300 dark:border-zinc-800 px-1.5 py-0.5 rounded-[4px] text-zinc-800 dark:text-[#e8e8ea] text-[10px] font-mono font-bold">W</kbd>
                <kbd className="bg-zinc-200 dark:bg-black/50 border border-zinc-300 dark:border-zinc-800 px-1.5 py-0.5 rounded-[4px] text-zinc-800 dark:text-[#e8e8ea] text-[10px] font-mono font-bold">▲</kbd>
              </span>
            </li>
            <li className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-2">
              <span>Pause / Resume</span>
              <kbd className="bg-zinc-200 dark:bg-black/50 border border-zinc-300 dark:border-zinc-800 px-1.5 py-0.5 rounded-[4px] text-zinc-800 dark:text-[#e8e8ea] text-[10px] font-mono font-bold">Space</kbd>
            </li>
          </ul>
        </div>

        {/* Leaderboard */}
        <div className="bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-zinc-800 rounded-[4px] p-6 flex-1 flex flex-col min-h-[220px]">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-zinc-550 dark:text-slate-500" /> High Score Logs
          </h3>
          <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2 pr-1">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-zinc-500 italic text-center py-6">No mission logs yet.</p>
            ) : (
              leaderboard.slice(0, 5).map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 bg-zinc-200/50 dark:bg-black/20 border border-zinc-300/60 dark:border-zinc-850 rounded-[4px]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold font-mono text-zinc-500 dark:text-slate-500">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs font-semibold text-zinc-800 dark:text-slate-355 truncate max-w-[120px]">
                      {entry.playerName}
                    </span>
                  </div>
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-white">
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

export default Bounce;
