import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { storage } from '../../core/storage';
import { Award, Play, Pause, RotateCcw, Target } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

// --- Game Constants ---
const GRAVITY = 0.5;
const FLAP_STRENGTH = -7;
const PIPE_SPEED = 3;
const PIPE_WIDTH = 50;
const PIPE_GAP = 120;
const PIPE_SPAWN_FRAMES = 90;
const PACKET_RADIUS = 12;
const GROUND_HEIGHT = 40;

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

export const FlappyPacket: FC = () => {
  const { dark } = useTheme();

  // --- Game State ---
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('IDLE');
  
  // --- Leaderboard ---
  const [leaderboard, setLeaderboard] = useState(storage.getLeaderboard('flappy_packet'));
  const [name, setName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Mutable game state
  const gameState = useRef({
    packetY: 500 - GROUND_HEIGHT - PACKET_RADIUS, // Start on the ground
    velocity: 0,
    pipes: [] as Pipe[],
    frameCount: 0,
    spacePressed: false,
    hasLeftGround: false, // Flag to prevent immediate game over at start
  });

  // --- Storage Effects ---
  useEffect(() => {
    const stats = storage.getGameStats('flappy_packet');
    setHighScore(stats.highScore);
    setLeaderboard(storage.getLeaderboard('flappy_packet'));
    storage.incrementPlayCount('flappy_packet');
  }, []);

  // --- Game Actions ---
  const resetGame = () => {
    gameState.current.packetY = 500 - GROUND_HEIGHT - PACKET_RADIUS;
    gameState.current.velocity = FLAP_STRENGTH; // Start with a flap/jump upward
    gameState.current.pipes = [];
    gameState.current.frameCount = 0;
    gameState.current.spacePressed = false;
    gameState.current.hasLeftGround = false; // Reset safety flag
    
    setScore(0);
    setShowNamePrompt(false);
    setName('');
    setGameStatus('PLAYING');
  };

  const quitGame = () => {
    gameState.current.packetY = 500 - GROUND_HEIGHT - PACKET_RADIUS;
    gameState.current.velocity = 0;
    gameState.current.pipes = [];
    gameState.current.frameCount = 0;
    gameState.current.hasLeftGround = false;
    setScore(0);
    setShowNamePrompt(false);
    setName('');
    setGameStatus('IDLE');
  };

  const flap = () => {
    if (gameStatus === 'PLAYING') {
      gameState.current.velocity = FLAP_STRENGTH;
    } else if (gameStatus === 'IDLE' || gameStatus === 'GAME_OVER') {
      if (!showNamePrompt) resetGame();
    }
  };

  const handleSaveScore = () => {
    storage.addLeaderboardScore('flappy_packet', {
      playerName: name.trim() || 'Anonymous',
      score: score,
    });
    setLeaderboard(storage.getLeaderboard('flappy_packet'));
    setShowNamePrompt(false);
    setName('');
  };

  const handleSkipSaveScore = () => {
    storage.addLeaderboardScore('flappy_packet', {
      playerName: 'Anonymous',
      score: score,
    });
    setLeaderboard(storage.getLeaderboard('flappy_packet'));
    setShowNamePrompt(false);
    setName('');
  };

  // --- Keyboard Listeners ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showNamePrompt) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        if (!gameState.current.spacePressed) {
          gameState.current.spacePressed = true;
          if (gameStatus === 'IDLE') {
            resetGame();
          } else if (gameStatus === 'PAUSED') {
            setGameStatus('PLAYING');
          } else if (gameStatus === 'PLAYING') {
            flap();
          } else if (gameStatus === 'GAME_OVER') {
             if (!showNamePrompt) resetGame();
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        gameState.current.spacePressed = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStatus, showNamePrompt]);

  // --- Main Canvas Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    const spawnPipe = () => {
      const minHeight = 50;
      const maxHeight = h - GROUND_HEIGHT - PIPE_GAP - minHeight;
      const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
      
      gameState.current.pipes.push({
        x: w,
        topHeight,
        bottomY: topHeight + PIPE_GAP,
        passed: false
      });
    };

    const updateAndDraw = () => {
      // Clear Screen based on theme
      ctx.fillStyle = dark ? '#09090b' : '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      if (gameStatus === 'PLAYING') {
        const state = gameState.current;
        
        state.velocity += GRAVITY;
        state.packetY += state.velocity;
        state.frameCount++;

        if (state.frameCount % PIPE_SPAWN_FRAMES === 0) {
          spawnPipe();
        }

        let currentScore = score;
        let collision = false;

        for (let i = 0; i < state.pipes.length; i++) {
          const p = state.pipes[i];
          p.x -= PIPE_SPEED;

          if (!p.passed && p.x + PIPE_WIDTH < 100) {
            p.passed = true;
            currentScore++;
          }

          const px = 100;
          const py = state.packetY;

          if (px + PACKET_RADIUS > p.x && px - PACKET_RADIUS < p.x + PIPE_WIDTH) {
            if (py - PACKET_RADIUS < p.topHeight || py + PACKET_RADIUS > p.bottomY) {
              collision = true;
            }
          }
        }

        state.pipes = state.pipes.filter(p => p.x + PIPE_WIDTH > 0);

        if (currentScore !== score) {
          setScore(currentScore);
        }

        // Set safety flag once the bird rises above the ground zone
        if (!state.hasLeftGround && state.packetY + PACKET_RADIUS < h - GROUND_HEIGHT - 5) {
          state.hasLeftGround = true;
        }

        // Collision with top of screen, or ground (only after leaving the ground initially)
        const hitGround = state.hasLeftGround && (state.packetY + PACKET_RADIUS > h - GROUND_HEIGHT);
        const hitTop = state.packetY - PACKET_RADIUS < 0;

        if (hitGround || hitTop) {
          collision = true;
        }

        if (collision) {
          setGameStatus('GAME_OVER');
          const currentStats = storage.getGameStats('flappy_packet');
          if (currentScore > currentStats.highScore) {
            setHighScore(currentScore);
            setShowNamePrompt(true);
          } else {
             setHighScore(Math.max(currentScore, currentStats.highScore));
          }
        }
      }
      
      // Draw Pipes
      ctx.fillStyle = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#06b6d4';
      
      gameState.current.pipes.forEach(p => {
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
        ctx.fillRect(p.x, p.bottomY, PIPE_WIDTH, h - GROUND_HEIGHT - p.bottomY);
      });
      
      ctx.shadowBlur = 0;

      // Draw Ground
      ctx.fillStyle = dark ? '#1e293b' : '#cbd5e1';
      ctx.fillRect(0, h - GROUND_HEIGHT, w, GROUND_HEIGHT);
      ctx.fillStyle = dark ? '#10b981' : '#059669';
      ctx.fillRect(0, h - GROUND_HEIGHT, w, 4);

      // Draw Bird (emoji 🐤)
      ctx.save();
      ctx.translate(100, gameState.current.packetY);
      
      if (gameStatus === 'PLAYING') {
        const rotation = Math.max(-0.4, Math.min(0.8, gameState.current.velocity * 0.08));
        ctx.rotate(rotation);
      }
      
      ctx.scale(-1, 1); // Flip horizontally so the bird faces right
      
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐤', 0, 0);
      ctx.restore();

      if (gameStatus === 'PLAYING' || gameStatus === 'IDLE' || gameStatus === 'PAUSED') {
        animationFrameId.current = requestAnimationFrame(updateAndDraw);
      }
    };

    animationFrameId.current = requestAnimationFrame(updateAndDraw);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [gameStatus, score, dark]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl mx-auto px-4 py-8">
      {/* --- Game Board Column --- */}
      <div className="flex-1 flex flex-col items-center">
        {/* Board & Controls Wrapper */}
        <div className="w-[min(100vw-32px,500px)] flex flex-col items-center">


          {/* Board Canvas container */}
          <div 
            className={`relative rounded-[4px] overflow-hidden w-full border ${dark ? 'bg-[#09090b] border-slate-800' : 'bg-slate-50 border-slate-200'}`}
            onPointerDown={(e) => {
               e.preventDefault();
               flap();
            }}
            style={{ touchAction: 'none' }}
          >
            <canvas
              ref={canvasRef}
              width={500}
              height={500}
              className="block w-full aspect-square cursor-crosshair"
            />

            {/* --- Overlays --- */}
            {gameStatus === 'IDLE' && (
              <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 pointer-events-none ${dark ? 'bg-[#121214]/95' : 'bg-white/95'}`}>
                <Target className={`w-12 h-12 mb-3 animate-pulse ${dark ? 'text-[#e8e8ea]' : 'text-slate-800'}`} />
                <h3 className={`text-base font-bold mb-4 uppercase tracking-wider ${dark ? 'text-white' : 'text-slate-900'}`}>Flappy Packet</h3>
                <p className={`text-xs mb-6 max-w-[240px] ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                  Tap or Spacebar to jump. Dodge the firewall pipes!
                </p>

                <button
                  onClick={(e) => { e.stopPropagation(); resetGame(); }}
                  className={`pointer-events-auto flex items-center justify-center gap-2 font-bold px-6 py-2.5 rounded-[4px] border transition-colors uppercase tracking-wider text-xs cursor-pointer w-full max-w-xs ${dark ? 'bg-white text-black border-white hover:bg-transparent hover:text-white' : 'bg-slate-900 text-white border-slate-900 hover:bg-transparent hover:text-slate-900'}`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Start Game
                </button>
              </div>
            )}

            {gameStatus === 'PAUSED' && (
              <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 gap-4 animate-fade-in pointer-events-none ${dark ? 'bg-[#121214]/95' : 'bg-white/95'}`}>
                <h3 className={`text-lg font-bold uppercase tracking-wider ${dark ? 'text-white' : 'text-slate-900'}`}>Game Paused</h3>
                <div className="flex gap-3 pointer-events-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); setGameStatus('PLAYING'); }}
                    className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-[4px] border transition-colors uppercase tracking-wider text-xs cursor-pointer ${dark ? 'bg-white text-black border-white hover:bg-transparent hover:text-white' : 'bg-slate-900 text-white border-slate-900 hover:bg-transparent hover:text-slate-900'}`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Resume
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); quitGame(); }}
                    className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-[4px] border transition-colors uppercase tracking-wider text-xs cursor-pointer ${dark ? 'bg-[#1a1a1c] text-slate-400 border-slate-800 hover:border-slate-500 hover:text-white' : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900'}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Abort
                  </button>
                </div>
              </div>
            )}

            {gameStatus === 'GAME_OVER' && (
              <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 pointer-events-auto ${dark ? 'bg-[#121214]/95' : 'bg-white/95'}`}>
                <h3 className="text-lg font-bold text-red-500 mb-2 uppercase tracking-wider">Connection Lost</h3>
                <p className={`mb-4 font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Final Score: <span className={dark ? 'text-white' : 'text-slate-900'}>{score}</span></p>

                {showNamePrompt ? (
                  <div className="w-full max-w-xs flex flex-col gap-3">
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${dark ? 'text-slate-555' : 'text-slate-500'}`}>
                      New High Score! Enter Name
                    </div>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full rounded-[4px] px-3 py-2 text-center text-base font-medium focus:outline-none transition-colors border ${dark ? 'bg-[#1a1a1c] border-slate-800 text-[#e8e8ea] placeholder-slate-655 focus:border-white' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-900'}`}
                    />
                    <div className="flex gap-2 w-full">
                      <button
                         onClick={(e) => { e.stopPropagation(); handleSaveScore(); }}
                        className={`flex-1 font-bold py-2 rounded-[4px] border transition-colors text-xs uppercase tracking-wider cursor-pointer ${dark ? 'bg-white text-black border-white hover:bg-transparent hover:text-white' : 'bg-slate-900 text-white border-slate-900 hover:bg-transparent hover:text-slate-900'}`}
                      >
                        Save
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSkipSaveScore(); }}
                        className={`flex-1 font-bold py-2 rounded-[4px] border transition-colors text-xs uppercase tracking-wider cursor-pointer ${dark ? 'bg-[#1a1a1c] text-slate-400 border-slate-800 hover:border-slate-500 hover:text-white' : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900'}`}
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); resetGame(); }}
                    className={`flex items-center gap-2 font-bold px-6 py-2.5 rounded-[4px] border transition-colors uppercase tracking-wider text-xs cursor-pointer ${dark ? 'bg-white text-black border-white hover:bg-transparent hover:text-white' : 'bg-slate-900 text-white border-slate-900 hover:bg-transparent hover:text-slate-900'}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reconnect
                  </button>
                )}
              </div>
            )}
          </div>

          {/* --- Onscreen controls for mobile view --- */}
          <div className="mt-6 flex justify-center w-full">
            <button
              onClick={() => {
                if (gameStatus === 'PLAYING') setGameStatus('PAUSED');
                else if (gameStatus === 'PAUSED') setGameStatus('PLAYING');
              }}
              disabled={gameStatus === 'IDLE' || gameStatus === 'GAME_OVER'}
              className={`w-full sm:max-w-xs h-14 rounded-[4px] border flex items-center justify-center gap-2 font-bold select-none cursor-pointer transition-colors uppercase tracking-wider text-xs disabled:opacity-40 disabled:cursor-not-allowed ${dark ? 'bg-[#1a1a1c] border-slate-800 text-slate-300 active:bg-white active:text-black' : 'bg-white border-slate-200 text-slate-600 active:bg-slate-900 active:text-white'}`}
            >
              {gameStatus === 'PLAYING' ? <><Pause className="w-4 h-4" /> Pause Game</> : <><Play className="w-4 h-4" /> Resume Game</>}
            </button>
          </div>
        </div>
      </div>

      {/* --- Leaderboard & Info Column --- */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        {/* Game Stats Hub */}
        <div className={`flex justify-between items-center w-full p-6 rounded-[4px] border ${dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-center">
            <div className={`text-xs font-semibold mb-0.5 ${dark ? 'text-slate-550' : 'text-slate-500'}`}>Score</div>
            <div className={`text-3xl font-bold font-mono ${dark ? 'text-white' : 'text-slate-900'}`}>{score}</div>
          </div>
          <div className="text-right">
            <div className={`text-xs font-semibold mb-0.5 flex items-center justify-end gap-1 ${dark ? 'text-slate-550' : 'text-slate-500'}`}>
              <Award className={`w-3.5 h-3.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`} /> Best Score
            </div>
            <div className={`text-3xl font-bold font-mono ${dark ? 'text-white' : 'text-slate-900'}`}>{highScore}</div>
          </div>
        </div>

        {/* Controls Info */}
        <div className={`hidden lg:block rounded-[4px] p-6 border ${dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${dark ? 'text-slate-455' : 'text-slate-500'}`}>Tactical Controls</h3>
          <ul className={`text-xs space-y-3 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            <li className={`flex justify-between items-center border-b pb-2 ${dark ? 'border-slate-900' : 'border-slate-100'}`}>
              <span>Jump / Flap</span>
              <kbd className={`border px-2 py-0.5 rounded-[4px] text-[10px] font-mono ${dark ? 'bg-black/50 border-slate-850 text-[#e8e8ea]' : 'bg-slate-100 border-slate-200 text-slate-800'}`}>Space / Click</kbd>
            </li>
            <li className={`flex justify-between items-center border-b pb-2 ${dark ? 'border-slate-900' : 'border-slate-100'}`}>
              <span>Pause / Resume</span>
              <kbd className={`border px-2 py-0.5 rounded-[4px] text-[10px] font-mono ${dark ? 'bg-black/50 border-slate-850 text-[#e8e8ea]' : 'bg-slate-100 border-slate-200 text-slate-800'}`}>Pause Btn</kbd>
            </li>
          </ul>
        </div>

        {/* Leaderboard */}
        <div className={`rounded-[4px] p-6 flex-1 flex flex-col border ${dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${dark ? 'text-slate-455' : 'text-slate-500'}`}>
            <Award className={`w-4 h-4 ${dark ? 'text-slate-500' : 'text-slate-400'}`} /> Top Packets
          </h3>
          <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2 pr-1">
            {leaderboard.length === 0 ? (
              <p className={`text-xs italic text-center py-6 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>No packet logs yet.</p>
            ) : (
              leaderboard.slice(0, 5).map((entry, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between py-2 px-3 rounded-[4px] border ${dark ? 'bg-black/20 border-slate-850' : 'bg-slate-50 border-slate-100'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold font-mono ${dark ? 'text-slate-555' : 'text-slate-400'}`}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-xs font-semibold truncate max-w-[120px] ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{entry.playerName}</span>
                  </div>
                  <span className={`text-xs font-bold font-mono ${dark ? 'text-white' : 'text-slate-900'}`}>{entry.score}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlappyPacket;
