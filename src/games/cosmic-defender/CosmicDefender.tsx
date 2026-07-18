import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { storage } from '../../core/storage';
import { Award, Play, Pause, RotateCcw, Shield, Rocket } from 'lucide-react';

interface Bullet {
  x: number;
  y: number;
  speed: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  points: number;
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

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

export const CosmicDefender: FC = () => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameStatus, setGameStatus] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('IDLE');
  const [leaderboard, setLeaderboard] = useState(storage.getLeaderboard('cosmic_defender'));
  const [name, setName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  // Difficulty configurations
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Entities as refs for fast updates inside canvas loop
  const playerX = useRef<number>(200);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const bullets = useRef<Bullet[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const particles = useRef<Particle[]>([]);
  const stars = useRef<Star[]>([]);
  const lastShotTime = useRef<number>(0);
  const spawnTimer = useRef<number>(0);

  // Load highscore
  useEffect(() => {
    const stats = storage.getGameStats('cosmic_defender');
    setHighScore(stats.highScore);
    storage.incrementPlayCount('cosmic_defender');
  }, []);

  const getDifficultySettings = () => {
    switch (difficulty) {
      case 'EASY':
        return { enemySpeed: 1.0, spawnRate: 110, shootCooldown: 80 };
      case 'HARD':
        return { enemySpeed: 3.5, spawnRate: 40, shootCooldown: 180 };
      case 'MEDIUM':
      default:
        return { enemySpeed: 2.0, spawnRate: 70, shootCooldown: 130 };
    }
  };

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      particles.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.01,
        size: Math.random() * 3 + 1,
      });
    }
  };

  const resetGame = () => {
    playerX.current = 200;
    bullets.current = [];
    enemies.current = [];
    particles.current = [];
    setScore(0);
    setLives(3);
    setShowNamePrompt(false);
    setName('');
    lastShotTime.current = 0;
    spawnTimer.current = 0;
    setGameStatus('PLAYING');
  };

  const shootBullet = () => {
    const settings = getDifficultySettings();
    const now = Date.now();
    if (now - lastShotTime.current > settings.shootCooldown) {
      bullets.current.push({
        x: playerX.current,
        y: 350,
        speed: 7,
      });
      lastShotTime.current = now;
    }
  };

  const handleSaveScore = () => {
    storage.addLeaderboardScore('cosmic_defender', {
      playerName: name.trim() || 'Anonymous Defender',
      score: score,
    });
    setLeaderboard(storage.getLeaderboard('cosmic_defender'));
    setShowNamePrompt(false);
    setName('');
  };

  const handleSkipSaveScore = () => {
    storage.addLeaderboardScore('cosmic_defender', {
      playerName: 'Anonymous Defender',
      score: score,
    });
    setLeaderboard(storage.getLeaderboard('cosmic_defender'));
    setShowNamePrompt(false);
    setName('');
  };

  // Setup stars background once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const initialStars: Star[] = [];
    for (let i = 0; i < 50; i++) {
      initialStars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 1.5 + 0.5,
      });
    }
    stars.current = initialStars;
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showNamePrompt) return;

      if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      keysPressed.current[e.code] = true;

      if (gameStatus === 'IDLE' && ['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'Space'].includes(e.code)) {
        resetGame();
      } else if (gameStatus === 'PAUSED' && e.code === 'Space') {
        setGameStatus('PLAYING');
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
  }, [gameStatus, showNamePrompt, score]);

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const settings = getDifficultySettings();

    const updateAndDraw = () => {
      // Clear screen
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Stars background
      stars.current.forEach((star) => {
        if (gameStatus === 'PLAYING') {
          star.y += star.speed;
          if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
          }
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + Math.random() * 0.4})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      if (gameStatus === 'PLAYING') {
        // 2. Handle Player Input
        if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) {
          playerX.current = Math.max(20, playerX.current - 5);
        }
        if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) {
          playerX.current = Math.min(canvas.width - 20, playerX.current + 5);
        }
        if (keysPressed.current['Space']) {
          shootBullet();
        }

        // 3. Update & Draw Bullets
        ctx.strokeStyle = '#22d3ee'; // cyan-400
        ctx.lineWidth = 3;
        bullets.current.forEach((b, idx) => {
          b.y -= b.speed;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x, b.y - 12);
          ctx.stroke();

          // remove off-screen bullets
          if (b.y < 0) {
            bullets.current.splice(idx, 1);
          }
        });

        // 4. Spawn Enemies
        spawnTimer.current++;
        if (spawnTimer.current >= settings.spawnRate) {
          spawnTimer.current = 0;
          const enemyType = Math.random();
          let width = 20;
          let height = 15;
          let points = 50;
          let color = '#ec4899'; // pink-500

          if (enemyType < 0.2) {
            // Gold speedster enemy
            width = 16;
            height = 12;
            points = 150;
            color = '#f59e0b'; // amber-500
          } else if (enemyType < 0.4) {
            // Heavy green enemy
            width = 28;
            height = 20;
            points = 80;
            color = '#10b981'; // emerald-500
          }

          enemies.current.push({
            x: Math.random() * (canvas.width - 40) + 20,
            y: -20,
            width,
            height,
            speed: settings.enemySpeed * (enemyType < 0.2 ? 1.5 : enemyType < 0.4 ? 0.75 : 1),
            points,
            color,
          });
        }

        // 5. Update & Draw Enemies
        enemies.current.forEach((enemy, eIdx) => {
          enemy.y += enemy.speed;

          // Draw Enemy spaceship (triangle/polygon shape)
          ctx.fillStyle = enemy.color;
          ctx.beginPath();
          ctx.moveTo(enemy.x, enemy.y + enemy.height);
          ctx.lineTo(enemy.x - enemy.width / 2, enemy.y);
          ctx.lineTo(enemy.x + enemy.width / 2, enemy.y);
          ctx.closePath();
          ctx.fill();

          // Neon glow style lines on alien ships
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(enemy.x - enemy.width / 3, enemy.y + enemy.height / 2);
          ctx.lineTo(enemy.x + enemy.width / 3, enemy.y + enemy.height / 2);
          ctx.stroke();

          // Check hit by bullet
          bullets.current.forEach((bullet, bIdx) => {
            const hitX = bullet.x >= enemy.x - enemy.width / 2 && bullet.x <= enemy.x + enemy.width / 2;
            const hitY = bullet.y <= enemy.y + enemy.height && bullet.y >= enemy.y;

            if (hitX && hitY) {
              // Destroy enemy
              spawnParticles(enemy.x, enemy.y + enemy.height / 2, enemy.color);
              enemies.current.splice(eIdx, 1);
              bullets.current.splice(bIdx, 1);
              setScore((s) => {
                const nextScore = s + enemy.points;
                if (nextScore > highScore) setHighScore(nextScore);
                return nextScore;
              });
            }
          });

          // Check pass player bottom (lose a life)
          if (enemy.y > canvas.height) {
            enemies.current.splice(eIdx, 1);
            setLives((l) => {
              const nextLives = l - 1;
              if (nextLives <= 0) {
                setGameStatus('GAME_OVER');
                const currentLeaderboard = storage.getLeaderboard('cosmic_defender');
                const qualifies = score > 0 && (currentLeaderboard.length < 3 || score > (currentLeaderboard[2]?.score || 0));
                if (qualifies) {
                  setShowNamePrompt(true);
                } else if (score > 0) {
                  storage.addLeaderboardScore('cosmic_defender', {
                    playerName: 'Anonymous Defender',
                    score: score,
                  });
                  setLeaderboard(storage.getLeaderboard('cosmic_defender'));
                }
              }
              return nextLives;
            });
            // Screen flash red effect
            ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        });

        // 6. Update & Draw Particles
        particles.current.forEach((p, idx) => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= p.decay;
          if (p.alpha <= 0) {
            particles.current.splice(idx, 1);
          } else {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });
      }

      // 7. Draw Player Spaceship
      ctx.fillStyle = '#f8fafc'; // slate-50
      ctx.beginPath();
      // nose
      ctx.moveTo(playerX.current, 335);
      // wings
      ctx.lineTo(playerX.current - 15, 360);
      ctx.lineTo(playerX.current - 8, 355);
      ctx.lineTo(playerX.current + 8, 355);
      ctx.lineTo(playerX.current + 15, 360);
      ctx.closePath();
      ctx.fill();

      // Wing engines fire/thrusters
      if (gameStatus === 'PLAYING') {
        ctx.fillStyle = Math.random() > 0.5 ? '#f97316' : '#ef4444'; // Orange/Red pulse
        ctx.beginPath();
        ctx.moveTo(playerX.current - 8, 357);
        ctx.lineTo(playerX.current - 5, 365 + Math.random() * 5);
        ctx.lineTo(playerX.current - 2, 357);
        ctx.moveTo(playerX.current + 2, 357);
        ctx.lineTo(playerX.current + 5, 365 + Math.random() * 5);
        ctx.lineTo(playerX.current + 8, 357);
        ctx.fill();
      }

      // Keep calling loop
      if (gameStatus === 'PLAYING' || gameStatus === 'IDLE' || gameStatus === 'PAUSED') {
        animationFrameId.current = requestAnimationFrame(updateAndDraw);
      }
    };

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
        <div className="flex justify-between items-center w-full max-w-[400px] mb-4 bg-[#1a1a1c] border border-slate-800 p-4 rounded-[4px]">
          <div>
            <div className="text-xs text-slate-550 font-semibold mb-0.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-500" /> Lives
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border transition-colors ${
                    i < lives ? 'bg-cyan-500 border-cyan-400' : 'bg-transparent border-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-550 font-semibold mb-0.5">Score</div>
            <div className="text-xl font-bold text-white">{score}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-550 font-semibold mb-0.5 flex items-center justify-end gap-1">
              <Award className="w-3.5 h-3.5 text-slate-500" /> Best Score
            </div>
            <div className="text-xl font-bold text-white">{highScore}</div>
          </div>
        </div>

        {/* Board & Controls Wrapper */}
        <div className="w-full max-w-[400px] flex flex-col items-center">
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
                <Rocket className="w-12 h-12 text-[#e8e8ea] mb-3 animate-bounce" />
                <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider">Cosmic Defender</h3>
                <p className="text-xs text-slate-500 mb-6 max-w-[240px]">
                  Use A/D or Arrow keys to steer, Space to shoot lasers. Survive the alien wave!
                </p>

                <button
                  onClick={resetGame}
                  className="flex items-center justify-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-[4px] border border-white hover:bg-transparent hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer w-full max-w-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Deploy Ship
                </button>
              </div>
            )}

            {gameStatus === 'PAUSED' && (
              <div className="absolute inset-0 bg-[#121214]/95 flex flex-col items-center justify-center">
                <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider">Mission Paused</h3>
                <button
                  onClick={() => setGameStatus('PLAYING')}
                  className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-[4px] border border-white hover:bg-transparent hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Resume Mission
                </button>
              </div>
            )}

            {gameStatus === 'GAME_OVER' && (
              <div className="absolute inset-0 bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
                <h3 className="text-lg font-bold text-red-500 mb-2 uppercase tracking-wider">Shield Defeated</h3>
                <p className="text-slate-400 mb-4 font-medium">Aliens eliminated score: {score}</p>

                {showNamePrompt ? (
                  <div className="w-full max-w-xs flex flex-col gap-3">
                    <div className="text-[10px] font-bold text-slate-555 uppercase tracking-wider">
                      New High Score! Enter Defender Name
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
                    <RotateCcw className="w-3.5 h-3.5" /> Re-deploy Ship
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Onscreen controls for mobile view */}
          <div className="mt-6 flex gap-2 sm:gap-4 justify-between w-full">
            <div className="flex gap-1.5 sm:gap-2">
              <button
                onMouseDown={() => { keysPressed.current['ArrowLeft'] = true; }}
                onMouseUp={() => { keysPressed.current['ArrowLeft'] = false; }}
                onTouchStart={(e) => { e.preventDefault(); keysPressed.current['ArrowLeft'] = true; }}
                onTouchEnd={(e) => { e.preventDefault(); keysPressed.current['ArrowLeft'] = false; }}
                onTouchCancel={(e) => { e.preventDefault(); keysPressed.current['ArrowLeft'] = false; }}
                className="w-11 h-11 sm:w-14 sm:h-14 bg-[#1a1a1c] border border-slate-800 active:bg-white active:text-black rounded-[4px] flex items-center justify-center text-slate-300 font-bold select-none cursor-pointer"
              >
                ◀
              </button>
              <button
                onMouseDown={() => { keysPressed.current['ArrowRight'] = true; }}
                onMouseUp={() => { keysPressed.current['ArrowRight'] = false; }}
                onTouchStart={(e) => { e.preventDefault(); keysPressed.current['ArrowRight'] = true; }}
                onTouchEnd={(e) => { e.preventDefault(); keysPressed.current['ArrowRight'] = false; }}
                onTouchCancel={(e) => { e.preventDefault(); keysPressed.current['ArrowRight'] = false; }}
                className="w-11 h-11 sm:w-14 sm:h-14 bg-[#1a1a1c] border border-slate-800 active:bg-white active:text-black rounded-[4px] flex items-center justify-center text-slate-300 font-bold select-none cursor-pointer"
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
                className="w-11 h-11 sm:w-14 sm:h-14 bg-[#1a1a1c] border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-[4px] flex items-center justify-center text-slate-300 select-none cursor-pointer"
              >
                {gameStatus === 'PLAYING' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onMouseDown={() => { keysPressed.current['Space'] = true; }}
                onMouseUp={() => { keysPressed.current['Space'] = false; }}
                onTouchStart={(e) => { e.preventDefault(); keysPressed.current['Space'] = true; }}
                onTouchEnd={(e) => { e.preventDefault(); keysPressed.current['Space'] = false; }}
                onTouchCancel={(e) => { e.preventDefault(); keysPressed.current['Space'] = false; }}
                className="px-3 sm:px-6 h-11 sm:h-14 bg-cyan-600 border border-cyan-500 active:bg-cyan-500 rounded-[4px] flex items-center justify-center text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider select-none cursor-pointer"
              >
                Fire Lasers
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
                  disabled={gameStatus === 'PLAYING'}
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
              <span>Steer Ship Left</span>
              <kbd className="bg-black/50 border border-slate-850 px-2 py-0.5 rounded-[4px] text-[#e8e8ea] text-[10px] font-mono">A / ◀</kbd>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Steer Ship Right</span>
              <kbd className="bg-black/50 border border-slate-850 px-2 py-0.5 rounded-[4px] text-[#e8e8ea] text-[10px] font-mono">D / ▶</kbd>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Fire Weapon Systems</span>
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

export default CosmicDefender;
