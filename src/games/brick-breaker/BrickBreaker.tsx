import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { storage } from '../../core/storage';
import { Award, Play, Pause, RotateCcw, Target, Settings2 } from 'lucide-react';

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  status: 1 | 0; // 1 = active, 0 = broken
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
}

export const BrickBreaker: FC = () => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameStatus, setGameStatus] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('IDLE');
  
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [leaderboard, setLeaderboard] = useState(storage.getLeaderboard(`brick_breaker_${difficulty.toLowerCase()}`));
  const [name, setName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Constants
  const paddleWidth = 80;
  const paddleHeight = 10;
  const ballRadius = 6;
  const brickColumnCount = 7;
  const brickWidth = 50;
  const brickHeight = 16;
  const brickPadding = 5;
  const brickOffsetTop = 40;
  const brickOffsetLeft = 10;

  // Mutable Game State Ref for fast updates inside canvas loop
  const gameState = useRef({
    paddleX: 160,
    ballX: 200,
    ballY: 360,
    dx: 3,
    dy: -3,
    bricks: [] as Brick[][],
    particles: [] as Particle[],
    keysPressed: {} as { [key: string]: boolean },
  });

  // Load highscore when settings change
  useEffect(() => {
    const modeKey = `brick_breaker_${difficulty.toLowerCase()}`;
    const stats = storage.getGameStats(modeKey);
    setHighScore(stats.highScore);
    setLeaderboard(storage.getLeaderboard(modeKey));
  }, [difficulty]);

  // Increment overall play count on mount
  useEffect(() => {
    storage.incrementPlayCount('brick_breaker');
  }, []);

  const getDifficultySettings = () => {
    switch (difficulty) {
      case 'EASY': return { speed: 3.5, rows: 4 };
      case 'HARD': return { speed: 5.5, rows: 8 };
      case 'MEDIUM':
      default: return { speed: 4.5, rows: 6 };
    }
  };

  const initBricks = () => {
    const rows = getDifficultySettings().rows;
    const newBricks: Brick[][] = [];
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];
    for (let c = 0; c < brickColumnCount; c++) {
      newBricks[c] = [];
      for (let r = 0; r < rows; r++) {
        newBricks[c][r] = { 
          x: 0, 
          y: 0, 
          width: brickWidth, 
          height: brickHeight, 
          status: 1,
          color: colors[r % colors.length]
        };
      }
    }
    return newBricks;
  };

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      gameState.current.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02,
        size: Math.random() * 3 + 1,
      });
    }
  };

  const resetGame = () => {
    const settings = getDifficultySettings();
    gameState.current = {
      paddleX: 160,
      ballX: 200,
      ballY: 360,
      dx: settings.speed * (Math.random() > 0.5 ? 1 : -1),
      dy: -settings.speed,
      bricks: initBricks(),
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
    const modeKey = `brick_breaker_${difficulty.toLowerCase()}`;
    storage.addLeaderboardScore(modeKey, {
      playerName: name.trim() || 'Anonymous Smasher',
      score: score,
    });
    storage.updateHighScore('brick_breaker', score);
    setLeaderboard(storage.getLeaderboard(modeKey));
    setShowNamePrompt(false);
    setName('');
  };

  const handleSkipSaveScore = () => {
    const modeKey = `brick_breaker_${difficulty.toLowerCase()}`;
    storage.addLeaderboardScore(modeKey, {
      playerName: 'Anonymous Smasher',
      score: score,
    });
    storage.updateHighScore('brick_breaker', score);
    setLeaderboard(storage.getLeaderboard(modeKey));
    setShowNamePrompt(false);
    setName('');
  };

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showNamePrompt) return;
      if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      gameState.current.keysPressed[e.code] = true;

      if (gameStatus === 'IDLE' && ['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
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
  }, [gameStatus, showNamePrompt, score, difficulty]);

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateAndDraw = () => {
      // Clear screen
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const state = gameState.current;

      if (gameStatus === 'PLAYING') {
        // 1. Move Paddle
        if (state.keysPressed['ArrowLeft']) {
          state.paddleX = Math.max(0, state.paddleX - 7);
        } else if (state.keysPressed['ArrowRight']) {
          state.paddleX = Math.min(canvas.width - paddleWidth, state.paddleX + 7);
        }

        // 2. Move Ball
        state.ballX += state.dx;
        state.ballY += state.dy;

        // 3. Collision with Walls
        if (state.ballX + state.dx > canvas.width - ballRadius || state.ballX + state.dx < ballRadius) {
          state.dx = -state.dx;
        }
        if (state.ballY + state.dy < ballRadius) {
          state.dy = -state.dy;
        } else if (state.ballY + state.dy > canvas.height - ballRadius) {
          // Bottom wall collision
          if (state.ballX > state.paddleX && state.ballX < state.paddleX + paddleWidth) {
            // Hit paddle
            state.dy = -state.dy;
            // Add slight English (spin) based on where it hit paddle
            const hitPoint = state.ballX - (state.paddleX + paddleWidth / 2);
            state.dx = state.dx + hitPoint * 0.05; 
            // Clamp speed to prevent crazy physics
            const maxSpeed = getDifficultySettings().speed + 2;
            state.dx = Math.min(Math.max(state.dx, -maxSpeed), maxSpeed);
          } else {
            // Missed paddle
            setLives((l) => {
              const nextLives = l - 1;
              if (nextLives <= 0) {
                setGameStatus('GAME_OVER');
                const modeKey = `brick_breaker_${difficulty.toLowerCase()}`;
                const currentLeaderboard = storage.getLeaderboard(modeKey);
                const qualifies = score > 0 && (currentLeaderboard.length < 3 || score > (currentLeaderboard[2]?.score || 0));
                if (qualifies) {
                  setShowNamePrompt(true);
                } else if (score > 0) {
                  storage.addLeaderboardScore(modeKey, {
                    playerName: 'Anonymous Smasher',
                    score: score,
                  });
                  storage.updateHighScore('brick_breaker', score);
                  setLeaderboard(storage.getLeaderboard(modeKey));
                }
              } else {
                // Reset ball position
                const settings = getDifficultySettings();
                state.ballX = canvas.width / 2;
                state.ballY = canvas.height - 40;
                state.dx = settings.speed * (Math.random() > 0.5 ? 1 : -1);
                state.dy = -settings.speed;
                state.paddleX = (canvas.width - paddleWidth) / 2;
              }
              return nextLives;
            });
            // Screen flash red effect
            ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        }

        // 4. Collision with Bricks
        let allCleared = true;
        for (let c = 0; c < brickColumnCount; c++) {
          for (let r = 0; r < getDifficultySettings().rows; r++) {
            const b = state.bricks[c]?.[r];
            if (b && b.status === 1) {
              allCleared = false;
              b.x = c * (brickWidth + brickPadding) + brickOffsetLeft;
              b.y = r * (brickHeight + brickPadding) + brickOffsetTop;

              if (
                state.ballX > b.x &&
                state.ballX < b.x + brickWidth &&
                state.ballY > b.y &&
                state.ballY < b.y + brickHeight
              ) {
                state.dy = -state.dy;
                b.status = 0;
                spawnParticles(b.x + brickWidth / 2, b.y + brickHeight / 2, b.color);
                
                setScore((s) => {
                  const nextScore = s + 10;
                  if (nextScore > highScore) setHighScore(nextScore);
                  return nextScore;
                });
              }
            }
          }
        }

        if (allCleared && state.bricks.length > 0) {
          // Win condition, reset bricks, increase speed slightly
          state.bricks = initBricks();
          const speedFactor = state.dx > 0 ? 1.1 : -1.1;
          state.dx *= speedFactor;
          state.dy *= 1.1;
          state.ballX = canvas.width / 2;
          state.ballY = canvas.height - 40;
          state.paddleX = (canvas.width - paddleWidth) / 2;
        }

        // 5. Update Particles
        state.particles.forEach((p, idx) => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= p.decay;
          if (p.alpha <= 0) {
            state.particles.splice(idx, 1);
          }
        });
      }

      // Draw Bricks
      for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < getDifficultySettings().rows; r++) {
          const b = state.bricks[c]?.[r];
          if (b && b.status === 1) {
            b.x = c * (brickWidth + brickPadding) + brickOffsetLeft;
            b.y = r * (brickHeight + brickPadding) + brickOffsetTop;
            
            ctx.fillStyle = b.color;
            // Draw brick with neon border effect
            ctx.fillRect(b.x, b.y, brickWidth, brickHeight);
            
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(b.x + 1, b.y + 1, brickWidth - 2, brickHeight - 2);
            
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(b.x, b.y, brickWidth, 4);
          }
        }
      }

      // Draw Paddle
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(state.paddleX, canvas.height - paddleHeight - 10, paddleWidth, paddleHeight, 5);
      ctx.fill();

      // Draw Ball
      ctx.beginPath();
      ctx.arc(state.ballX, state.ballY, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#22d3ee'; // cyan-400
      ctx.fill();
      ctx.closePath();

      // Draw Particles
      state.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Keep calling loop
      if (gameStatus === 'PLAYING' || gameStatus === 'IDLE' || gameStatus === 'PAUSED') {
        animationFrameId.current = requestAnimationFrame(updateAndDraw);
      }
    };

    // Make sure we have bricks initialized to draw even on IDLE
    if (gameState.current.bricks.length === 0) {
      gameState.current.bricks = initBricks();
    }

    animationFrameId.current = requestAnimationFrame(updateAndDraw);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [gameStatus, score, highScore, difficulty]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl mx-auto px-4 py-8">
      {/* Game board column */}
      <div className="flex-1 flex flex-col items-center">
        {/* Game Stats Hub */}
        <div className="flex justify-between items-center w-full max-w-[480px] mb-4 bg-[#1a1a1c] border border-slate-800 p-4 rounded-[4px]">
          <div>
            <div className="text-xs text-slate-550 font-semibold mb-0.5 flex items-center gap-1.5">
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
            <div className="text-xs text-slate-550 font-semibold mb-0.5">Score</div>
            <div className="text-xl font-bold text-white font-mono">{score}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-550 font-semibold mb-0.5 flex items-center justify-end gap-1">
              <Award className="w-3.5 h-3.5 text-slate-500" /> Best Score
            </div>
            <div className="text-xl font-bold text-white font-mono">{highScore}</div>
          </div>
        </div>

        {/* Board & Controls Wrapper */}
        <div className="w-full max-w-[480px] flex flex-col items-center">
          {/* Board Canvas container */}
          <div className="relative border border-slate-800 rounded-[4px] overflow-hidden bg-[#09090b] w-full">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="block w-full aspect-square"
            />

            {/* Overlays */}
            {gameStatus === 'IDLE' && (
              <div className="absolute inset-0 bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
                <Target className="w-12 h-12 text-[#e8e8ea] mb-3 animate-pulse" />
                <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider">Brick Breaker</h3>
                <p className="text-xs text-slate-500 mb-6 max-w-[240px]">
                  Use Left/Right arrow keys to move the paddle. Bounce the ball to break all bricks!
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
              <div className="absolute inset-0 bg-[#121214]/95 flex flex-col items-center justify-center p-6 gap-4 animate-fade-in">
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
                <p className="text-slate-400 mb-4 font-medium">Final Score: <span className="text-white">{score}</span></p>

                {showNamePrompt ? (
                  <div className="w-full max-w-xs flex flex-col gap-3">
                    <div className="text-[10px] font-bold text-slate-555 uppercase tracking-wider">
                      New High Score! Enter Name
                    </div>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#1a1a1c] border border-slate-800 rounded-[4px] px-3 py-2 text-[#e8e8ea] placeholder-slate-655 text-center text-base font-medium focus:outline-none focus:border-white transition-colors"
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

          {/* Onscreen controls for mobile view */}
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
        <div className="bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-6 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider flex items-center gap-1.5">
            Settings
          </h3>

          <div>
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
        </div>

        {/* Controls Info */}
        <div className="hidden lg:block bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-6">
          <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider mb-4">Tactical Controls</h3>
          <ul className="text-xs space-y-3 text-slate-400">
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Move Paddle Left</span>
              <kbd className="bg-black/50 border border-slate-850 px-2 py-0.5 rounded-[4px] text-[#e8e8ea] text-[10px] font-mono">◀</kbd>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Move Paddle Right</span>
              <kbd className="bg-black/50 border border-slate-850 px-2 py-0.5 rounded-[4px] text-[#e8e8ea] text-[10px] font-mono">▶</kbd>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Pause / Resume</span>
              <kbd className="bg-black/50 border border-slate-850 px-2 py-0.5 rounded-[4px] text-[#e8e8ea] text-[10px] font-mono">Space</kbd>
            </li>
          </ul>
        </div>

        {/* Leaderboard */}
        <div className="bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-6 flex-1 flex flex-col">
          <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-slate-500" /> High Score Logs
          </h3>
          <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2 pr-1">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">No mission logs yet.</p>
            ) : (
              leaderboard.slice(0, 3).map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 bg-black/20 border border-slate-850 rounded-[4px]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold font-mono text-slate-555">
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
