import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { PONG_CONFIG, type Difficulty, type GameMode } from './neon-pong.config';
import { initGameState, type GameState, resetBall } from './neon-pong.logic';
import { storage } from '../../core/storage';
import { Play, RotateCcw, Gamepad2, Settings, Trophy, Monitor, Users } from 'lucide-react';
import { audio } from '../../core/audio';

export const NeonPong: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<GameState>(initGameState('vs_ai', 'MEDIUM'));
  const gameStateRef = useRef<GameState>(gameState);
  
  // Game settings
  const [mode, setMode] = useState<GameMode>('vs_ai');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [stats, setStats] = useState({ winsAI: 0, longestRally: 0 });

  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Load stats
  useEffect(() => {
    const s = storage.getGameStats(PONG_CONFIG.STORAGE_KEY);
    setStats({
      winsAI: s.winsAI || 0,
      longestRally: s.longestRally || 0,
    });
    storage.incrementPlayCount(PONG_CONFIG.STORAGE_KEY);
  }, []);

  const saveStats = (wonAgainstAI: boolean, currentRally: number) => {
    const s = storage.getGameStats(PONG_CONFIG.STORAGE_KEY);
    const newWins = (s.winsAI || 0) + (wonAgainstAI ? 1 : 0);
    const newRally = Math.max(s.longestRally || 0, currentRally);
    
    storage.saveGameStats(PONG_CONFIG.STORAGE_KEY, {
      winsAI: newWins,
      longestRally: newRally,
    });
    setStats({ winsAI: newWins, longestRally: newRally });
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      
      const state = gameStateRef.current;
      if (e.code === 'Space') {
        if (state.status === 'PLAYING') {
          setGameState(prev => ({ ...prev, status: 'PAUSED' }));
        } else if (state.status === 'PAUSED') {
          setGameState(prev => ({ ...prev, status: 'PLAYING' }));
        } else if (state.status === 'IDLE' || state.status === 'GAMEOVER') {
          resetGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      const state = gameStateRef.current;
      if (state.status !== 'PLAYING') {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      const { player1, player2, ball } = state;

      // --- Player 1 (Left) Movement ---
      if (keys.current['KeyW']) {
        player1.y -= player1.speed;
      }
      if (keys.current['KeyS']) {
        player1.y += player1.speed;
      }

      // --- Player 2 (Right) Movement ---
      if (state.mode === 'pvp') {
        if (keys.current['ArrowUp']) {
          player2.y -= player2.speed;
        }
        if (keys.current['ArrowDown']) {
          player2.y += player2.speed;
        }
      } else {
        // AI Logic
        const aiSpeed = PONG_CONFIG.AI_SPEED[state.difficulty];
        // Only track if the ball is moving towards the AI
        if (ball.dx > 0) {
          const targetY = ball.y - player2.height / 2;
          // Simple reaction delay / smooth follow
          const diff = targetY - player2.y;
          
          if (Math.abs(diff) > aiSpeed) {
            player2.y += Math.sign(diff) * aiSpeed;
          } else {
            player2.y += diff;
          }
        } else {
          // Return to center slowly
          const targetY = PONG_CONFIG.CANVAS_HEIGHT / 2 - player2.height / 2;
          const diff = targetY - player2.y;
          if (Math.abs(diff) > 2) {
             player2.y += Math.sign(diff) * 2;
          }
        }
      }

      // Constrain paddles
      player1.y = Math.max(0, Math.min(PONG_CONFIG.CANVAS_HEIGHT - player1.height, player1.y));
      player2.y = Math.max(0, Math.min(PONG_CONFIG.CANVAS_HEIGHT - player2.height, player2.y));

      // --- Ball Movement ---
      // Save trail
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 10) {
        ball.trail.shift();
      }

      ball.x += ball.dx;
      ball.y += ball.dy;

      // Wall collision (top / bottom)
      if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.dy = -ball.dy;
        if (!audio.getMuted()) audio.playSnakeEat(); // Use generic sound
      } else if (ball.y + ball.radius >= PONG_CONFIG.CANVAS_HEIGHT) {
        ball.y = PONG_CONFIG.CANVAS_HEIGHT - ball.radius;
        ball.dy = -ball.dy;
        if (!audio.getMuted()) audio.playSnakeEat();
      }

      // Paddle collision
      const checkPaddleCollision = (paddle: typeof player1, isLeft: boolean) => {
        if (
          ball.y + ball.radius >= paddle.y &&
          ball.y - ball.radius <= paddle.y + paddle.height
        ) {
          if (
            (isLeft && ball.x - ball.radius <= paddle.x + paddle.width && ball.x + ball.radius > paddle.x) ||
            (!isLeft && ball.x + ball.radius >= paddle.x && ball.x - ball.radius < paddle.x + paddle.width)
          ) {
            
            // Adjust X to prevent sticking
            ball.x = isLeft ? paddle.x + paddle.width + ball.radius : paddle.x - ball.radius;
            
            // Reverse X direction and increase speed
            ball.dx = -Math.sign(ball.dx) * Math.min(Math.abs(ball.dx) + PONG_CONFIG.BALL_SPEED_INCREMENT, PONG_CONFIG.BALL_MAX_SPEED);
            
            // Add some English (spin) based on where it hit the paddle
            const hitPoint = (ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
            ball.dy = hitPoint * (PONG_CONFIG.BALL_INITIAL_SPEED * 1.5);
            
            state.rallyCount++;
            if (!audio.getMuted()) audio.playSnakeGolden(); // Use a different generic sound
            return true;
          }
        }
        return false;
      };

      checkPaddleCollision(player1, true);
      checkPaddleCollision(player2, false);

      // Scoring
      let scored = false;
      if (ball.x < 0) {
        player2.score++;
        scored = true;
        resetBall(state, 2);
      } else if (ball.x > PONG_CONFIG.CANVAS_WIDTH) {
        player1.score++;
        scored = true;
        resetBall(state, 1);
      }

      if (scored) {
        if (!audio.getMuted()) audio.playGameOver(); // Point sound
        if (player1.score >= PONG_CONFIG.WIN_SCORE || player2.score >= PONG_CONFIG.WIN_SCORE) {
          state.status = 'GAMEOVER';
          // Save stats
          if (state.mode === 'vs_ai') {
            saveStats(player1.score >= PONG_CONFIG.WIN_SCORE, state.longestRally);
          } else {
             saveStats(false, state.longestRally);
          }
        }
      }

      setGameState({ ...state });
      
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []); // Run once, relies on refs

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = PONG_CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw center line
    ctx.beginPath();
    ctx.setLineDash([10, 15]);
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = PONG_CONFIG.COLORS.netDash;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.setLineDash([]);

    const { player1, player2, ball } = gameState;

    // Helper to draw paddle with glow
    const drawPaddle = (paddle: typeof player1, color: string, glowColor: string) => {
      ctx.shadowBlur = 15;
      ctx.shadowColor = glowColor;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 4) : ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    // Draw player 1 (Purple)
    drawPaddle(player1, PONG_CONFIG.COLORS.playerPaddle, PONG_CONFIG.COLORS.playerGlow);

    // Draw player 2 (Cyan if AI, Purple if PVP)
    const p2Color = gameState.mode === 'vs_ai' ? PONG_CONFIG.COLORS.aiPaddle : PONG_CONFIG.COLORS.playerPaddle;
    const p2Glow = gameState.mode === 'vs_ai' ? PONG_CONFIG.COLORS.aiGlow : PONG_CONFIG.COLORS.playerGlow;
    drawPaddle(player2, p2Color, p2Glow);

    // Draw Ball trail
    if (ball.trail.length > 0) {
      ctx.beginPath();
      ctx.moveTo(ball.trail[0].x, ball.trail[0].y);
      for (let i = 1; i < ball.trail.length; i++) {
        ctx.lineTo(ball.trail[i].x, ball.trail[i].y);
      }
      ctx.strokeStyle = PONG_CONFIG.COLORS.trailColor;
      ctx.lineWidth = ball.radius * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // Draw Ball
    ctx.shadowBlur = 10;
    ctx.shadowColor = PONG_CONFIG.COLORS.ballGlow;
    ctx.fillStyle = PONG_CONFIG.COLORS.ball;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

  }, [gameState]);

  const resetGame = () => {
    setGameState(initGameState(mode, difficulty));
    if (gameState.status !== 'PLAYING') {
      setGameState(prev => ({ ...prev, status: 'PLAYING' }));
    }
  };

  const handleModeChange = (newMode: GameMode) => {
    setMode(newMode);
    setGameState(initGameState(newMode, difficulty));
  };

  const handleDifficultyChange = (diff: Difficulty) => {
    setDifficulty(diff);
    if (mode === 'vs_ai') {
      setGameState(initGameState(mode, diff));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl mx-auto px-4 py-8 select-none">
      {/* Game board column */}
      <div className="flex-1 flex flex-col items-center">
        {/* Score Board */}
        <div className="flex justify-between items-center w-full max-w-[600px] mb-4 bg-[#1a1a1c] border border-slate-800 p-4 rounded-[4px]">
          <div className="w-1/3 text-left">
            <div className="text-xs text-purple-400 font-bold mb-0.5 uppercase tracking-widest">Player 1</div>
            <div className="text-3xl font-black text-white font-mono">{gameState.player1.score}</div>
          </div>
          <div className="w-1/3 text-center">
            <div className="text-[10px] text-slate-500 font-semibold mb-0.5 uppercase">Rally</div>
            <div className="text-xl font-bold text-slate-300 font-mono">{gameState.rallyCount}</div>
          </div>
          <div className="w-1/3 text-right">
            <div className={`text-xs font-bold mb-0.5 uppercase tracking-widest ${gameState.mode === 'vs_ai' ? 'text-cyan-400' : 'text-purple-400'}`}>
              {gameState.mode === 'vs_ai' ? 'AI System' : 'Player 2'}
            </div>
            <div className="text-3xl font-black text-white font-mono">{gameState.player2.score}</div>
          </div>
        </div>

        {/* Board Canvas container */}
        <div className="relative border border-slate-800 rounded-[4px] overflow-hidden bg-[#070710] w-full max-w-[600px] aspect-[16/10] shadow-[0_0_30px_rgba(168,85,247,0.1)]">
          <canvas
            ref={canvasRef}
            width={PONG_CONFIG.CANVAS_WIDTH}
            height={PONG_CONFIG.CANVAS_HEIGHT}
            className="block w-full h-full"
            style={{ touchAction: 'none' }}
            onPointerMove={(e) => {
                if (gameState.status === 'PLAYING') {
                   const canvas = canvasRef.current;
                   if (!canvas) return;
                   const rect = canvas.getBoundingClientRect();
                   const scaleY = canvas.height / rect.height;
                   const y = (e.clientY - rect.top) * scaleY;
                   
                   // Find which side they are touching
                   const state = gameStateRef.current;
                   const isRightSide = e.clientX - rect.left > rect.width / 2;

                   if (!isRightSide) {
                      state.player1.y = Math.max(0, Math.min(PONG_CONFIG.CANVAS_HEIGHT - state.player1.height, y - state.player1.height / 2));
                   } else if (state.mode === 'pvp') {
                      state.player2.y = Math.max(0, Math.min(PONG_CONFIG.CANVAS_HEIGHT - state.player2.height, y - state.player2.height / 2));
                   }
                }
            }}
          />

          {/* Overlays */}
          {gameState.status === 'IDLE' && (
            <div className="absolute inset-0 bg-[#070710]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 border border-purple-500/40">
                <Gamepad2 className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-2 uppercase tracking-widest">Neon Pong</h3>
              <p className="text-sm text-slate-400 mb-8 max-w-[280px]">
                First to {PONG_CONFIG.WIN_SCORE} wins. Get ready to paddle!
              </p>
              <button
                onClick={resetGame}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold px-8 py-3 rounded-full hover:from-purple-500 hover:to-purple-700 transition-all uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                <Play className="w-4 h-4 fill-current" /> Start Match
              </button>
            </div>
          )}

          {gameState.status === 'PAUSED' && (
            <div className="absolute inset-0 bg-[#070710]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 gap-6 z-20">
              <h3 className="text-xl font-bold text-white uppercase tracking-widest">Match Paused</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setGameState(prev => ({ ...prev, status: 'PLAYING' }))}
                  className="flex items-center gap-2 bg-purple-600 text-white font-bold px-6 py-2.5 rounded-full hover:bg-purple-500 transition-colors uppercase tracking-wider text-xs"
                >
                  <Play className="w-4 h-4 fill-current" /> Resume
                </button>
                <button
                  onClick={() => setGameState(initGameState(mode, difficulty))}
                  className="flex items-center gap-2 bg-[#1a1a1c] text-slate-400 font-bold px-6 py-2.5 rounded-full border border-slate-700 hover:border-slate-500 hover:text-white transition-colors uppercase tracking-wider text-xs"
                >
                  <RotateCcw className="w-4 h-4" /> Abort
                </button>
              </div>
            </div>
          )}

          {gameState.status === 'GAMEOVER' && (
            <div className="absolute inset-0 bg-[#070710]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="mb-6">
                <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-widest">
                  {gameState.player1.score >= PONG_CONFIG.WIN_SCORE ? 'Player 1 Wins!' : (gameState.mode === 'vs_ai' ? 'AI Wins!' : 'Player 2 Wins!')}
                </h3>
                <p className="text-slate-400 font-medium text-lg">
                  Final Score: <span className="text-purple-400">{gameState.player1.score}</span> - <span className="text-cyan-400">{gameState.player2.score}</span>
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={resetGame}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold px-8 py-3 rounded-full hover:from-purple-500 hover:to-cyan-500 transition-all uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                >
                  <RotateCcw className="w-4 h-4" /> Play Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings & Stats Column */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        {/* Game Settings */}
        <div className="bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-6 flex flex-col gap-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" /> Match Settings
          </h3>

          {/* Mode Selector */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Game Mode
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleModeChange('vs_ai')}
                disabled={gameState.status === 'PLAYING' || gameState.status === 'PAUSED'}
                className={`flex-1 py-2 rounded-[4px] border text-[10px] font-bold transition-all disabled:opacity-50 ${
                  mode === 'vs_ai'
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                    : 'bg-black/30 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                vs AI
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('pvp')}
                disabled={gameState.status === 'PLAYING' || gameState.status === 'PAUSED'}
                className={`flex-1 py-2 rounded-[4px] border text-[10px] font-bold transition-all disabled:opacity-50 ${
                  mode === 'pvp'
                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                    : 'bg-black/30 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                Local PvP
              </button>
            </div>
          </div>

          {/* Difficulty Selector (Only for AI mode) */}
          {mode === 'vs_ai' && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" /> AI Difficulty
              </div>
              <div className="flex gap-1.5">
                {(['EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => handleDifficultyChange(diff)}
                    disabled={gameState.status === 'PLAYING' || gameState.status === 'PAUSED'}
                    className={`flex-1 py-2 rounded-[4px] border text-[9px] font-bold transition-all disabled:opacity-50 ${
                      difficulty === diff
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                        : 'bg-black/30 border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats Panel */}
        <div className="bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-6 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-purple-500" /> Player Stats
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs text-slate-400 font-medium">Wins vs AI</span>
              <span className="text-sm font-black text-cyan-400 font-mono">{stats.winsAI}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Longest Rally</span>
              <span className="text-sm font-black text-purple-400 font-mono">{stats.longestRally}</span>
            </div>
          </div>
        </div>
        
        {/* Controls Info */}
        <div className="hidden lg:block bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Controls</h3>
          <ul className="text-xs space-y-3 text-slate-400">
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span className="text-purple-400">P1 Up / Down</span>
              <kbd className="bg-black/50 border border-slate-800 px-2 py-0.5 rounded text-[#e8e8ea] text-[10px] font-mono">W / S</kbd>
            </li>
            {mode === 'pvp' && (
              <li className="flex justify-between items-center border-b border-slate-900 pb-2">
                <span className="text-purple-400">P2 Up / Down</span>
                <kbd className="bg-black/50 border border-slate-800 px-2 py-0.5 rounded text-[#e8e8ea] text-[10px] font-mono">▲ / ▼</kbd>
              </li>
            )}
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Mobile Control</span>
              <span className="text-[10px] font-mono">Touch & Drag</span>
            </li>
            <li className="flex justify-between items-center">
              <span>Pause / Resume</span>
              <kbd className="bg-black/50 border border-slate-800 px-2 py-0.5 rounded text-[#e8e8ea] text-[10px] font-mono">Space</kbd>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NeonPong;
