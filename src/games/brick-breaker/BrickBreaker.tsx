import { useState, useEffect, useRef } from 'react';
import type { FC, PointerEvent, TouchEvent } from 'react';
import { BRICK_BREAKER_CONFIG } from './brick-breaker.config';
import type { Difficulty, BlockModel, Brick, Particle } from './brick-breaker.logic';
import { BLOCK_MODELS_INFO, generateBricks, createParticles } from './brick-breaker.logic';
import { storage } from '../../core/storage';
import { Award, Play, Pause, RotateCcw, Target, Settings2, Grid, Volume2, VolumeX } from 'lucide-react';
import { audio } from '../../core/audio';

export const BrickBreaker: FC = () => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameStatus, setGameStatus] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('IDLE');
  const [muted, setMuted] = useState(audio.getMuted());

  // Manage BGM loop based on game status
  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      audio.startBgm('brick');
    } else {
      audio.stopBgm();
    }
    return () => {
      audio.stopBgm();
    };
  }, [gameStatus]);

  // Game Settings Options
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [blockModel, setBlockModel] = useState<BlockModel>('CLASSIC');

  const [leaderboard, setLeaderboard] = useState(
    storage.getLeaderboard(`brick_breaker_${difficulty.toLowerCase()}_${blockModel.toLowerCase()}`)
  );
  const [name, setName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const blockModelRef = useRef<BlockModel>(blockModel);

  // Sync ref with state
  useEffect(() => {
    blockModelRef.current = blockModel;
  }, [blockModel]);

  // Constants shortcuts
  const {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    PADDLE_WIDTH,
    PADDLE_HEIGHT,
    PADDLE_OFFSET_BOTTOM,
    BALL_RADIUS,
    BRICK_COLUMN_COUNT,
    BRICK_WIDTH,
    BRICK_HEIGHT,
    BRICK_PADDING,
    BRICK_OFFSET_TOP,
    BRICK_OFFSET_LEFT,
    PADDLE_SPEED,
    DIFFICULTY_SPEEDS,
  } = BRICK_BREAKER_CONFIG;

  const paddleY = CANVAS_HEIGHT - PADDLE_HEIGHT - PADDLE_OFFSET_BOTTOM;

  // Mutable Game State Ref for fast performance inside canvas loop
  const gameState = useRef({
    paddleX: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    ballX: CANVAS_WIDTH / 2,
    ballY: paddleY - BALL_RADIUS - 2,
    dx: 3,
    dy: -3,
    bricks: [] as Brick[][],
    particles: [] as Particle[],
    keysPressed: {} as { [key: string]: boolean },
  });

  // Load high score & leaderboard when difficulty or block model changes
  useEffect(() => {
    const modeKey = `brick_breaker_${difficulty.toLowerCase()}_${blockModel.toLowerCase()}`;
    const stats = storage.getGameStats(modeKey);
    setHighScore(stats.highScore);
    setLeaderboard(storage.getLeaderboard(modeKey));
  }, [difficulty, blockModel]);

  // Increment overall play count on mount
  useEffect(() => {
    storage.incrementPlayCount('brick_breaker');
  }, []);

  const getBallSpeed = () => DIFFICULTY_SPEEDS[difficulty];

  const resetGame = () => {
    const speed = getBallSpeed();
    gameState.current = {
      paddleX: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
      ballX: CANVAS_WIDTH / 2,
      ballY: paddleY - BALL_RADIUS - 2,
      dx: speed * (Math.random() > 0.5 ? 1 : -1),
      dy: -speed,
      bricks: generateBricks(blockModelRef.current),
      particles: [],
      keysPressed: {},
    };
    setScore(0);
    setLives(3);
    setShowNamePrompt(false);
    setName('');
    setGameStatus('PLAYING');
  };

  const quitGame = () => {
    gameState.current.bricks = [];
    setScore(0);
    setLives(3);
    setShowNamePrompt(false);
    setName('');
    setGameStatus('IDLE');
  };

  const handleSaveScore = () => {
    const modeKey = `brick_breaker_${difficulty.toLowerCase()}_${blockModel.toLowerCase()}`;
    storage.addLeaderboardScore(modeKey, {
      playerName: name.trim() || 'Anonymous Smasher',
      score: score,
    });
    storage.updateHighScore(modeKey, score);
    setLeaderboard(storage.getLeaderboard(modeKey));
    setShowNamePrompt(false);
    setName('');
  };

  const handleSkipSaveScore = () => {
    const modeKey = `brick_breaker_${difficulty.toLowerCase()}_${blockModel.toLowerCase()}`;
    storage.addLeaderboardScore(modeKey, {
      playerName: 'Anonymous Smasher',
      score: score,
    });
    storage.updateHighScore(modeKey, score);
    setLeaderboard(storage.getLeaderboard(modeKey));
    setShowNamePrompt(false);
    setName('');
  };

  // Helper for mouse/touch paddle positioning
  const updatePaddlePositionFromClientX = (clientX: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const canvasX = (clientX - rect.left) * scaleX;
    const newPaddleX = canvasX - PADDLE_WIDTH / 2;
    gameState.current.paddleX = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, newPaddleX));
  };

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (gameStatus === 'PLAYING' || gameStatus === 'IDLE') {
      updatePaddlePositionFromClientX(e.clientX);
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
    if ((gameStatus === 'PLAYING' || gameStatus === 'IDLE') && e.touches.length > 0) {
      updatePaddlePositionFromClientX(e.touches[0].clientX);
    }
  };

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showNamePrompt) return;
      if (['ArrowLeft', 'ArrowRight', 'Space', 'KeyA', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }
      gameState.current.keysPressed[e.code] = true;

      if (gameStatus === 'IDLE' && ['ArrowLeft', 'ArrowRight', 'Space', 'KeyA', 'KeyD'].includes(e.code)) {
        resetGame();
      } else if (gameStatus === 'PAUSED' && e.code === 'Space') {
        setGameStatus('PLAYING');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameState.current.keysPressed[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStatus, showNamePrompt, score, difficulty, blockModel]);

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateAndDraw = () => {
      // Clear screen
      ctx.fillStyle = BRICK_BREAKER_CONFIG.COLORS.boardBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const state = gameState.current;

      if (gameStatus === 'PLAYING') {
        // 1. Move Paddle via Keyboard
        if (state.keysPressed['ArrowLeft'] || state.keysPressed['KeyA']) {
          state.paddleX = Math.max(0, state.paddleX - PADDLE_SPEED);
        } else if (state.keysPressed['ArrowRight'] || state.keysPressed['KeyD']) {
          state.paddleX = Math.min(canvas.width - PADDLE_WIDTH, state.paddleX + PADDLE_SPEED);
        }

        // 2. Move Ball
        state.ballX += state.dx;
        state.ballY += state.dy;

        // 3. Collision with Side & Top Walls
        if (state.ballX - BALL_RADIUS <= 0) {
          state.ballX = BALL_RADIUS;
          state.dx = Math.abs(state.dx);
          audio.playBrickWall();
        } else if (state.ballX + BALL_RADIUS >= canvas.width) {
          state.ballX = canvas.width - BALL_RADIUS;
          state.dx = -Math.abs(state.dx);
          audio.playBrickWall();
        }

        if (state.ballY - BALL_RADIUS <= 0) {
          state.ballY = BALL_RADIUS;
          state.dy = Math.abs(state.dy);
          audio.playBrickWall();
        }

        // 4. Exact Collision with Paddle Top Surface
        const isMovingDown = state.dy > 0;
        const ballBottom = state.ballY + BALL_RADIUS;
        const ballTop = state.ballY - BALL_RADIUS;

        if (
          isMovingDown &&
          ballBottom >= paddleY &&
          ballTop <= paddleY + PADDLE_HEIGHT &&
          state.ballX + BALL_RADIUS >= state.paddleX &&
          state.ballX - BALL_RADIUS <= state.paddleX + PADDLE_WIDTH
        ) {
          // Bounce off top surface cleanly
          state.ballY = paddleY - BALL_RADIUS;
          
          // Calculate angle bounce based on hit location on paddle
          const hitPoint = state.ballX - (state.paddleX + PADDLE_WIDTH / 2);
          const normalizedHit = hitPoint / (PADDLE_WIDTH / 2); // -1 to 1
          
          const speed = getBallSpeed();
          const maxAngle = Math.PI / 3; // 60 degrees max bounce angle
          const bounceAngle = normalizedHit * maxAngle;

          state.dx = speed * Math.sin(bounceAngle);
          state.dy = -speed * Math.cos(bounceAngle);
          audio.playBrickPaddle();
        }

        // 5. Missed Paddle (Fell below bottom)
        if (state.ballY - BALL_RADIUS > canvas.height) {
          setLives((l) => {
            const nextLives = l - 1;
            if (nextLives <= 0) {
              setGameStatus('GAME_OVER');
              audio.playGameOver();
              const modeKey = `brick_breaker_${difficulty.toLowerCase()}_${blockModel.toLowerCase()}`;
              const currentLeaderboard = storage.getLeaderboard(modeKey);
              const qualifies = score > 0 && (currentLeaderboard.length < 3 || score > (currentLeaderboard[2]?.score || 0));
              if (qualifies) {
                setShowNamePrompt(true);
              } else if (score > 0) {
                storage.addLeaderboardScore(modeKey, {
                  playerName: 'Anonymous Smasher',
                  score: score,
                });
                storage.updateHighScore(modeKey, score);
                setLeaderboard(storage.getLeaderboard(modeKey));
              }
            } else {
              // Reset ball position cleanly above paddle
              audio.playPlayerHit();
              const speed = getBallSpeed();
              state.ballX = canvas.width / 2;
              state.ballY = paddleY - BALL_RADIUS - 4;
              state.dx = speed * (Math.random() > 0.5 ? 1 : -1);
              state.dy = -speed;
              state.paddleX = (canvas.width - PADDLE_WIDTH) / 2;
            }
            return nextLives;
          });
          // Hit flash effect
          ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // 6. Collision with Bricks
        let activeBricksCount = 0;
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
          const col = state.bricks[c];
          if (!col) continue;
          for (let r = 0; r < col.length; r++) {
            const b = col[r];
            if (b && b.status === 1) {
              activeBricksCount++;
              b.x = c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT;
              b.y = r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP;

              if (
                state.ballX + BALL_RADIUS > b.x &&
                state.ballX - BALL_RADIUS < b.x + BRICK_WIDTH &&
                state.ballY + BALL_RADIUS > b.y &&
                state.ballY - BALL_RADIUS < b.y + BRICK_HEIGHT
              ) {
                state.dy = -state.dy;
                b.status = 0;
                const newParticles = createParticles(b.x + BRICK_WIDTH / 2, b.y + BRICK_HEIGHT / 2, b.color);
                state.particles.push(...newParticles);
                audio.playBrickBreak();

                setScore((s) => {
                  const nextScore = s + 10;
                  if (nextScore > highScore) setHighScore(nextScore);
                  return nextScore;
                });
              }
            }
          }
        }

        if (activeBricksCount === 0 && state.bricks.length > 0) {
          // Wave cleared! Cycle to the next block model pattern automatically
          audio.playLevelUp();
          const models: BlockModel[] = ['CLASSIC', 'PYRAMID', 'CHESSBOARD', 'FORTRESS', 'DIAMOND', 'INVADERS'];
          const currentIndex = models.indexOf(blockModelRef.current);
          const nextModel = models[(currentIndex + 1) % models.length];

          blockModelRef.current = nextModel;
          setBlockModel(nextModel);

          state.bricks = generateBricks(nextModel);
          state.dx *= 1.08;
          state.dy = -Math.abs(state.dy * 1.08);
          state.ballX = canvas.width / 2;
          state.ballY = paddleY - BALL_RADIUS - 4;
          state.paddleX = (canvas.width - PADDLE_WIDTH) / 2;
        }

        // 7. Update Particles
        for (let idx = state.particles.length - 1; idx >= 0; idx--) {
          const p = state.particles[idx];
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= p.decay;
          if (p.alpha <= 0) {
            state.particles.splice(idx, 1);
          }
        }
      }

      // Draw Bricks
      for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        const col = state.bricks[c];
        if (!col) continue;
        for (let r = 0; r < col.length; r++) {
          const b = col[r];
          if (b && b.status === 1) {
            b.x = c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT;
            b.y = r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP;

            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, BRICK_WIDTH, BRICK_HEIGHT);

            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(b.x + 1, b.y + 1, BRICK_WIDTH - 2, BRICK_HEIGHT - 2);

            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(b.x, b.y, BRICK_WIDTH, 4);
          }
        }
      }

      // Draw Paddle
      ctx.fillStyle = BRICK_BREAKER_CONFIG.COLORS.paddleBg;
      ctx.beginPath();
      ctx.roundRect(state.paddleX, paddleY, PADDLE_WIDTH, PADDLE_HEIGHT, 4);
      ctx.fill();

      // Draw Ball
      ctx.beginPath();
      ctx.arc(state.ballX, state.ballY, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = BRICK_BREAKER_CONFIG.COLORS.ballBg;
      ctx.fill();
      ctx.closePath();

      // Draw Particles
      state.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Continue loop
      if (gameStatus === 'PLAYING' || gameStatus === 'IDLE' || gameStatus === 'PAUSED') {
        animationFrameId.current = requestAnimationFrame(updateAndDraw);
      }
    };

    if (gameState.current.bricks.length === 0) {
      gameState.current.bricks = generateBricks(blockModel);
    }

    animationFrameId.current = requestAnimationFrame(updateAndDraw);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [gameStatus, score, highScore, difficulty, blockModel, paddleY]);

  // Re-generate preview bricks if user switches block model while IDLE
  useEffect(() => {
    if (gameStatus === 'IDLE') {
      gameState.current.bricks = generateBricks(blockModel);
    }
  }, [blockModel, gameStatus]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl mx-auto px-4 py-8 select-none">
      {/* Game board column */}
      <div className="flex-1 flex flex-col items-center">
        {/* Game Stats Hub */}
        <div className="flex justify-between items-center w-full max-w-[480px] mb-4 bg-[#1a1a1c] border border-slate-800 p-4 rounded-[4px]">
          <div>
            <div className="text-xs text-slate-500 font-semibold mb-0.5 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-slate-500" /> Lives
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-2.5 rounded-sm transition-colors ${
                    i < lives ? 'bg-cyan-500' : 'bg-transparent border border-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 font-semibold mb-0.5">Score</div>
            <div className="text-xl font-bold text-white font-mono">{score}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-semibold mb-0.5 flex items-center justify-end gap-1">
              <Award className="w-3.5 h-3.5 text-slate-500" /> Best Score
            </div>
            <div className="text-xl font-bold text-white font-mono">{highScore}</div>
          </div>
        </div>

        {/* Board & Controls Wrapper */}
        <div className="w-full max-w-[480px] flex flex-col items-center">
          {/* Board Canvas container */}
          <div className="relative border border-slate-800 rounded-[4px] overflow-hidden bg-[#09090b] w-full touch-none">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerMove={handlePointerMove}
              onTouchMove={handleTouchMove}
              className="block w-full aspect-square cursor-crosshair touch-none"
            />

            {/* Overlays */}
            {gameStatus === 'IDLE' && (
              <div className="absolute inset-0 bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
                <Target className="w-12 h-12 text-[#e8e8ea] mb-3 animate-pulse" />
                <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider">Brick Breaker</h3>
                <p className="text-xs text-slate-500 mb-6 max-w-[260px]">
                  Drag with mouse/touch or use Arrow / A-D keys to move paddle. Clear waves to cycle through block models!
                </p>

                <button
                  onClick={resetGame}
                  className="flex items-center justify-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-[4px] border border-white hover:bg-transparent hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer w-full max-w-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Start Game
                </button>
              </div>
            )}

            {gameStatus === 'PAUSED' && (
              <div className="absolute inset-0 bg-[#121214]/95 flex flex-col items-center justify-center p-6 gap-4 animate-fade-in z-20">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Game Paused</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setGameStatus('PLAYING')}
                    className="flex items-center gap-2 bg-white text-black font-bold px-5 py-2.5 rounded-[4px] border border-white hover:bg-transparent hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Resume
                  </button>
                  <button
                    onClick={quitGame}
                    className="flex items-center gap-2 bg-[#1a1a1c] text-slate-400 font-bold px-5 py-2.5 rounded-[4px] border border-slate-800 hover:border-slate-500 hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Abort
                  </button>
                </div>
              </div>
            )}

            {gameStatus === 'GAME_OVER' && (
              <div className="absolute inset-0 bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
                <h3 className="text-lg font-bold text-red-500 mb-2 uppercase tracking-wider">Game Over</h3>
                <p className="text-slate-400 mb-4 font-medium">
                  Final Score: <span className="text-white">{score}</span>
                </p>

                {showNamePrompt ? (
                  <div className="w-full max-w-xs flex flex-col gap-3">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      New High Score! Enter Name
                    </div>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#1a1a1c] border border-slate-800 rounded-[4px] px-3 py-2 text-[#e8e8ea] placeholder-slate-600 text-center text-base font-medium focus:outline-none focus:border-white transition-colors"
                    />
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={handleSaveScore}
                        className="flex-1 bg-white text-black font-bold py-2 rounded-[4px] border border-white hover:bg-transparent hover:text-white transition-colors text-xs uppercase tracking-wider cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleSkipSaveScore}
                        className="flex-1 bg-[#1a1a1c] text-slate-400 font-bold py-2 rounded-[4px] border border-slate-800 hover:border-slate-500 hover:text-white transition-colors text-xs uppercase tracking-wider cursor-pointer"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={resetGame}
                    className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-[4px] border border-white hover:bg-transparent hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Play Again
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Onscreen controls for touch buttons */}
          <div className="mt-6 flex gap-2 sm:gap-4 justify-between w-full">
            <div className="flex gap-1.5 sm:gap-2">
              <button
                onMouseDown={() => { gameState.current.keysPressed['ArrowLeft'] = true; }}
                onMouseUp={() => { gameState.current.keysPressed['ArrowLeft'] = false; }}
                onTouchStart={(e) => { e.preventDefault(); gameState.current.keysPressed['ArrowLeft'] = true; }}
                onTouchEnd={(e) => { e.preventDefault(); gameState.current.keysPressed['ArrowLeft'] = false; }}
                onTouchCancel={(e) => { e.preventDefault(); gameState.current.keysPressed['ArrowLeft'] = false; }}
                className="w-16 h-12 sm:w-20 sm:h-14 bg-[#1a1a1c] border border-slate-800 active:bg-white active:text-black rounded-[4px] flex items-center justify-center text-slate-300 font-bold select-none cursor-pointer"
              >
                ◀
              </button>
              <button
                onMouseDown={() => { gameState.current.keysPressed['ArrowRight'] = true; }}
                onMouseUp={() => { gameState.current.keysPressed['ArrowRight'] = false; }}
                onTouchStart={(e) => { e.preventDefault(); gameState.current.keysPressed['ArrowRight'] = true; }}
                onTouchEnd={(e) => { e.preventDefault(); gameState.current.keysPressed['ArrowRight'] = false; }}
                onTouchCancel={(e) => { e.preventDefault(); gameState.current.keysPressed['ArrowRight'] = false; }}
                className="w-16 h-12 sm:w-20 sm:h-14 bg-[#1a1a1c] border border-slate-800 active:bg-white active:text-black rounded-[4px] flex items-center justify-center text-slate-300 font-bold select-none cursor-pointer"
              >
                ▶
              </button>
            </div>

            <div className="flex gap-1.5 sm:gap-2">
              <button
                onClick={() => {
                  if (gameStatus === 'PLAYING') setGameStatus('PAUSED');
                  else if (gameStatus === 'PAUSED') setGameStatus('PLAYING');
                }}
                disabled={gameStatus === 'IDLE' || gameStatus === 'GAME_OVER'}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-[#1a1a1c] border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-[4px] flex items-center justify-center text-slate-300 select-none cursor-pointer"
              >
                {gameStatus === 'PLAYING' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard & Controls column */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        {/* Real-time Settings Panel */}
        <div className="bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-6 flex flex-col gap-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Settings2 className="w-4 h-4 text-slate-400" /> Game Options
          </h3>

          {/* Audio Settings */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Audio Settings
            </div>
            <button
              type="button"
              onClick={() => {
                const newMute = audio.toggleMute();
                setMuted(newMute);
              }}
              className="flex items-center justify-center gap-2 w-full py-1.5 rounded-[4px] border text-[9px] font-bold transition-all cursor-pointer bg-black/30 border-slate-800 text-slate-400 hover:border-slate-500 hover:text-white"
            >
              {muted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-red-400" /> Muted
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Sound Enabled
                </>
              )}
            </button>
          </div>

          {/* Difficulty Option (Ball Speed) */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Speed / Difficulty
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
                      ? 'bg-white text-black border-white'
                      : 'bg-black/30 border-slate-800 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Block Model / Layout Option */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Grid className="w-3 h-3" /> Block Model Pattern
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {BLOCK_MODELS_INFO.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setBlockModel(model.id)}
                  disabled={gameStatus === 'PLAYING' || gameStatus === 'PAUSED'}
                  title={model.description}
                  className={`py-1.5 px-2 rounded-[4px] border text-[10px] font-bold text-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    blockModel === model.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                      : 'bg-black/30 border-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {model.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tactical Controls Info */}
        <div className="hidden lg:block bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Tactical Controls</h3>
          <ul className="text-xs space-y-3 text-slate-400">
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Mouse / Touch Drag</span>
              <kbd className="bg-black/50 border border-slate-800 px-2 py-0.5 rounded text-[#e8e8ea] text-[10px] font-mono">Move Cursor/Finger</kbd>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Move Paddle Left</span>
              <div className="flex gap-1">
                <kbd className="bg-black/50 border border-slate-800 px-1.5 py-0.5 rounded text-[#e8e8ea] text-[10px] font-mono">◀</kbd>
                <kbd className="bg-black/50 border border-slate-800 px-1.5 py-0.5 rounded text-[#e8e8ea] text-[10px] font-mono">A</kbd>
              </div>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Move Paddle Right</span>
              <div className="flex gap-1">
                <kbd className="bg-black/50 border border-slate-800 px-1.5 py-0.5 rounded text-[#e8e8ea] text-[10px] font-mono">▶</kbd>
                <kbd className="bg-black/50 border border-slate-800 px-1.5 py-0.5 rounded text-[#e8e8ea] text-[10px] font-mono">D</kbd>
              </div>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Pause / Resume</span>
              <kbd className="bg-black/50 border border-slate-800 px-2 py-0.5 rounded text-[#e8e8ea] text-[10px] font-mono">Space</kbd>
            </li>
          </ul>
        </div>

        {/* Leaderboard */}
        <div className="bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-6 flex-1 flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-slate-500" /> High Score Logs
          </h3>
          <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2 pr-1">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">No mission logs yet.</p>
            ) : (
              leaderboard.slice(0, 5).map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 bg-black/20 border border-slate-800 rounded-[4px]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold font-mono text-slate-500">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs font-semibold text-slate-300 truncate max-w-[120px]">{entry.playerName}</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-white">{entry.score}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrickBreaker;
