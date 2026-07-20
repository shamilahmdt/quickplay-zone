import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { SNAKE_CONFIG } from './snake.config';
import type { Direction, Position } from './snake.logic';
import { getNextHead, getRandomPosition } from './snake.logic';
import { storage } from '../../core/storage';
import { Play, Pause, RotateCcw, Award, Gamepad2, Settings } from 'lucide-react';

export const Snake: FC = () => {
  const [snake, setSnake] = useState<Position[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const [food, setFood] = useState<Position>({ x: 10, y: 5 });
  const [foodType, setFoodType] = useState<'normal' | 'golden'>('normal');
  const [, setDirection] = useState<Direction>('UP');
  const [gameStatus, setGameStatus] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('IDLE');
  
  // Game Custom Options
  const [wallMode, setWallMode] = useState<boolean>(true);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(SNAKE_CONFIG.DIFFICULTY_SPEEDS.MEDIUM);
  
  // High Score Prompt State
  const [name, setName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [leaderboard, setLeaderboard] = useState(storage.getLeaderboard('snake'));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const directionRef = useRef<Direction>('UP');
  const inputQueue = useRef<Direction[]>([]);

  // Load highscore when settings change
  useEffect(() => {
    const modeKey = `snake_${difficulty.toLowerCase()}_${wallMode ? 'solid' : 'wrap'}`;
    const stats = storage.getGameStats(modeKey);
    setHighScore(stats.highScore);
    setLeaderboard(storage.getLeaderboard(modeKey));
  }, [difficulty, wallMode]);

  // Increment overall play count on mount
  useEffect(() => {
    storage.incrementPlayCount('snake');
  }, []);

  // Keyboard controls with scroll prevention
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept keyboard events if the user is typing their name
      if (showNamePrompt) return;

      if (['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS', 'ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (gameStatus !== 'PLAYING') {
        if (e.code === 'Space') {
          if (gameStatus === 'PAUSED') setGameStatus('PLAYING');
          else if (gameStatus === 'GAME_OVER' || gameStatus === 'IDLE') resetGame();
        } else if (['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS', 'ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'].includes(e.code)) {
          if (gameStatus === 'IDLE') resetGame();
          else if (gameStatus === 'PAUSED') setGameStatus('PLAYING');
        }
        return;
      }

      if (e.code === 'Space') {
        setGameStatus('PAUSED');
        return;
      }

      // Limit queue length to prevent laggy input chains
      if (inputQueue.current.length >= 2) return;

      const lastDir = inputQueue.current.length > 0 
        ? inputQueue.current[inputQueue.current.length - 1] 
        : directionRef.current;

      if (['ArrowUp', 'KeyW'].includes(e.code) && lastDir !== 'DOWN' && lastDir !== 'UP') {
        inputQueue.current.push('UP');
      } else if (['ArrowDown', 'KeyS'].includes(e.code) && lastDir !== 'UP' && lastDir !== 'DOWN') {
        inputQueue.current.push('DOWN');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code) && lastDir !== 'RIGHT' && lastDir !== 'LEFT') {
        inputQueue.current.push('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code) && lastDir !== 'LEFT' && lastDir !== 'RIGHT') {
        inputQueue.current.push('RIGHT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, showNamePrompt]);

  // Main game loop
  useEffect(() => {
    if (gameStatus !== 'PLAYING') return;

    const interval = setInterval(() => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        
        let currentDir = directionRef.current;
        if (inputQueue.current.length > 0) {
          currentDir = inputQueue.current.shift()!;
          directionRef.current = currentDir;
          setDirection(currentDir);
        }
        
        const rawHead = getNextHead(head, currentDir);
        let nextX = rawHead.x;
        let nextY = rawHead.y;

        // Wall Mode Wrapping
        if (!wallMode) {
          if (nextX < 0) nextX = SNAKE_CONFIG.GRID_SIZE - 1;
          else if (nextX >= SNAKE_CONFIG.GRID_SIZE) nextX = 0;
          if (nextY < 0) nextY = SNAKE_CONFIG.GRID_SIZE - 1;
          else if (nextY >= SNAKE_CONFIG.GRID_SIZE) nextY = 0;
        }

        const newHead = { x: nextX, y: nextY };

        // Collision conditions
        const hitWall = newHead.x < 0 || newHead.x >= SNAKE_CONFIG.GRID_SIZE || newHead.y < 0 || newHead.y >= SNAKE_CONFIG.GRID_SIZE;
        const hitSelf = prevSnake.slice(0, -1).some((segment) => segment.x === newHead.x && segment.y === newHead.y);

        if ((wallMode && hitWall) || hitSelf) {
          setGameStatus('GAME_OVER');
          const modeKey = `snake_${difficulty.toLowerCase()}_${wallMode ? 'solid' : 'wrap'}`;
          const currentLeaderboard = storage.getLeaderboard(modeKey);
          const qualifiesForTop3 = score > 0 && (currentLeaderboard.length < 3 || score > (currentLeaderboard[2]?.score || 0));

          if (qualifiesForTop3) {
            setShowNamePrompt(true);
          } else if (score > 0) {
            storage.addLeaderboardScore(modeKey, {
              playerName: 'Anonymous Player',
              score: score
            });
            storage.updateHighScore('snake', score); // Sync to dashboard overall highscore
            setLeaderboard(storage.getLeaderboard(modeKey));
          }
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Eat food
        if (newHead.x === food.x && newHead.y === food.y) {
          const isGolden = foodType === 'golden';
          const points = isGolden ? 30 : 10;
          setScore((s) => {
            const nextScore = s + points;
            if (nextScore > highScore) {
              setHighScore(nextScore);
            }
            return nextScore;
          });
          
          setSpeed((prevSpeed) =>
            Math.max(SNAKE_CONFIG.MIN_SPEED, prevSpeed - SNAKE_CONFIG.SPEED_DECREMENT)
          );
          
          setFood(getRandomPosition(SNAKE_CONFIG.GRID_SIZE, newSnake));
          setFoodType(Math.random() < 0.2 ? 'golden' : 'normal');
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [gameStatus, food, foodType, speed, score, highScore, wallMode]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = SNAKE_CONFIG.COLORS.boardBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid Lines (subtle)
    ctx.strokeStyle = SNAKE_CONFIG.COLORS.gridLines;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= SNAKE_CONFIG.GRID_SIZE; i++) {
      const pos = i * (canvas.width / SNAKE_CONFIG.GRID_SIZE);
      // Vertical
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, canvas.height);
      ctx.stroke();
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(canvas.width, pos);
      ctx.stroke();
    }

    const cellWidth = canvas.width / SNAKE_CONFIG.GRID_SIZE;
    const cellHeight = canvas.height / SNAKE_CONFIG.GRID_SIZE;

    // Draw Food
    const isGolden = foodType === 'golden';
    ctx.fillStyle = isGolden ? '#f59e0b' : SNAKE_CONFIG.COLORS.food;
    ctx.beginPath();
    const radius = cellWidth / 2 - 2;
    const centerX = food.x * cellWidth + cellWidth / 2;
    const centerY = food.y * cellHeight + cellHeight / 2;
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();

    if (isGolden) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw Snake
    snake.forEach((segment, idx) => {
      const isHead = idx === 0;
      
      const length = snake.length;
      const factor = Math.max(0.65, 1 - (idx / length) * 0.35); // shrink down to 65% towards tail
      const offsetX = (cellWidth - cellWidth * factor) / 2;
      const offsetY = (cellHeight - cellHeight * factor) / 2;

      ctx.fillStyle = isHead ? SNAKE_CONFIG.COLORS.snakeHead : SNAKE_CONFIG.COLORS.snakeBody;
      
      const x = segment.x * cellWidth + 1 + offsetX;
      const y = segment.y * cellHeight + 1 + offsetY;
      const w = (cellWidth - 2) * factor;
      const h = (cellHeight - 2) * factor;
      const r = isHead ? 4 : 2;

      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
      ctx.fill();

      // Draw eyes on the head
      if (isHead) {
        ctx.fillStyle = '#FFFFFF';
        const eyeSize = cellWidth * 0.15;
        const dir = directionRef.current;
        if (dir === 'UP' || dir === 'DOWN') {
          ctx.fillRect(segment.x * cellWidth + cellWidth * 0.25, segment.y * cellHeight + cellHeight * 0.4, eyeSize, eyeSize);
          ctx.fillRect(segment.x * cellWidth + cellWidth * 0.65, segment.y * cellHeight + cellHeight * 0.4, eyeSize, eyeSize);
        } else {
          ctx.fillRect(segment.x * cellWidth + cellWidth * 0.4, segment.y * cellHeight + cellHeight * 0.25, eyeSize, eyeSize);
          ctx.fillRect(segment.x * cellWidth + cellWidth * 0.4, segment.y * cellHeight + cellHeight * 0.65, eyeSize, eyeSize);
        }
      }
    });

  }, [snake, food, foodType]);

  const resetGame = () => {
    setSnake([
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ]);
    setFood({ x: 10, y: 5 });
    setFoodType('normal');
    setDirection('UP');
    directionRef.current = 'UP';
    inputQueue.current = [];
    setScore(0);
    setShowNamePrompt(false);
    setName('');
    setSpeed(SNAKE_CONFIG.DIFFICULTY_SPEEDS[difficulty]);
    setGameStatus('PLAYING');
  };

  const quitGame = () => {
    setSnake([
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ]);
    setFood({ x: 10, y: 5 });
    setFoodType('normal');
    setDirection('UP');
    directionRef.current = 'UP';
    inputQueue.current = [];
    setScore(0);
    setShowNamePrompt(false);
    setName('');
    setGameStatus('IDLE');
  };

  const handleDifficultyChange = (diff: 'EASY' | 'MEDIUM' | 'HARD') => {
    setDifficulty(diff);
    setSpeed(SNAKE_CONFIG.DIFFICULTY_SPEEDS[diff]);
  };

  const handleSaveScore = () => {
    const modeKey = `snake_${difficulty.toLowerCase()}_${wallMode ? 'solid' : 'wrap'}`;
    storage.addLeaderboardScore(modeKey, {
      playerName: name.trim() || 'Anonymous Player',
      score: score
    });
    storage.updateHighScore('snake', score); // Sync to dashboard overall highscore
    setLeaderboard(storage.getLeaderboard(modeKey));
    setShowNamePrompt(false);
    setName('');
  };

  const handleSkipSaveScore = () => {
    const modeKey = `snake_${difficulty.toLowerCase()}_${wallMode ? 'solid' : 'wrap'}`;
    storage.addLeaderboardScore(modeKey, {
      playerName: 'Anonymous Player',
      score: score
    });
    storage.updateHighScore('snake', score); // Sync to dashboard overall highscore
    setLeaderboard(storage.getLeaderboard(modeKey));
    setShowNamePrompt(false);
    setName('');
  };

  const handleOnscreenControl = (dir: Direction) => {
    if (gameStatus === 'IDLE') {
      resetGame();
      return;
    }
    if (gameStatus === 'PAUSED') {
      setGameStatus('PLAYING');
      return;
    }
    if (gameStatus !== 'PLAYING') return;

    if (inputQueue.current.length >= 2) return;

    const lastDir = inputQueue.current.length > 0 
      ? inputQueue.current[inputQueue.current.length - 1] 
      : directionRef.current;

    if (dir === 'UP' && lastDir !== 'DOWN' && lastDir !== 'UP') inputQueue.current.push('UP');
    if (dir === 'DOWN' && lastDir !== 'UP' && lastDir !== 'DOWN') inputQueue.current.push('DOWN');
    if (dir === 'LEFT' && lastDir !== 'RIGHT' && lastDir !== 'LEFT') inputQueue.current.push('LEFT');
    if (dir === 'RIGHT' && lastDir !== 'LEFT' && lastDir !== 'RIGHT') inputQueue.current.push('RIGHT');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl mx-auto px-4 py-8">
      {/* Game board column */}
      <div className="flex-1 flex flex-col items-center">
        {/* Game Stats Hub */}
        <div className="flex justify-between items-center w-full max-w-[480px] mb-4 bg-[#1a1a1c] border border-slate-800 p-4 rounded-[4px]">
          <div>
            <div className="text-xs text-slate-550 font-semibold mb-0.5">Score</div>
            <div className="text-xl font-bold text-white">{score}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-550 font-semibold mb-0.5 flex items-center justify-end gap-1">
              <Award className="w-3.5 h-3.5 text-slate-500" /> Best score
            </div>
            <div className="text-xl font-bold text-white">{highScore}</div>
          </div>
        </div>

        {/* Board Canvas container */}
        <div className="relative border border-slate-800 rounded-[4px] overflow-hidden bg-[#0d0d0f] w-full max-w-[480px]">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="block w-full aspect-square"
          />

          {/* Overlays */}
          {gameStatus === 'IDLE' && (
            <div className="absolute inset-0 bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
              <Gamepad2 className="w-12 h-12 text-[#e8e8ea] mb-3" />
              <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider">Snake Classic</h3>
              <p className="text-xs text-slate-500 mb-6 max-w-[240px]">Press any direction key or click below to start immediately</p>

              <button
                onClick={resetGame}
                className="flex items-center justify-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-[4px] border border-white hover:bg-transparent hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer w-full max-w-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Start Game
              </button>
            </div>
          )}

          {gameStatus === 'PAUSED' && (
            <div className="absolute inset-0 bg-[#121214]/95 flex flex-col items-center justify-center p-6 gap-4">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Paused</h3>
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
                  <RotateCcw className="w-3.5 h-3.5" /> Quit
                </button>
              </div>
            </div>
          )}

          {gameStatus === 'GAME_OVER' && (
            <div className="absolute inset-0 bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
              <h3 className="text-lg font-bold text-red-500 mb-2 uppercase tracking-wider">Game over</h3>
              <p className="text-slate-400 mb-4 font-medium">Final score: {score}</p>
              
              {showNamePrompt ? (
                <div className="w-full max-w-xs flex flex-col gap-3">
                  <div className="text-[10px] font-bold text-slate-550 uppercase tracking-wider">
                    New high score! Enter name
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
                  <RotateCcw className="w-3.5 h-3.5" /> Try Again
                </button>
              )}
            </div>
          )}
        </div>

        {/* Onscreen D-Pad for mobile view */}
        <div className="mt-6 flex flex-col items-center w-full max-w-[200px]">
          <button
            onClick={() => handleOnscreenControl('UP')}
            disabled={gameStatus === 'GAME_OVER' || gameStatus === 'PAUSED'}
            className="w-12 h-12 bg-[#1a1a1c] border border-slate-800 active:bg-white active:text-black rounded-[4px] flex items-center justify-center mb-1 text-slate-300 transition-colors font-bold cursor-pointer"
          >
            ▲
          </button>
          <div className="flex gap-1">
            <button
              onClick={() => handleOnscreenControl('LEFT')}
              disabled={gameStatus === 'GAME_OVER' || gameStatus === 'PAUSED'}
              className="w-12 h-12 bg-[#1a1a1c] border border-slate-800 active:bg-white active:text-black rounded-[4px] flex items-center justify-center text-slate-300 transition-colors font-bold cursor-pointer"
            >
              ◀
            </button>
            <button
              onClick={() => {
                if (gameStatus === 'PLAYING') setGameStatus('PAUSED');
                else if (gameStatus === 'PAUSED') setGameStatus('PLAYING');
              }}
              disabled={gameStatus === 'IDLE' || gameStatus === 'GAME_OVER'}
              className="w-12 h-12 bg-[#1a1a1c] border border-slate-800 active:bg-white active:text-black rounded-[4px] flex items-center justify-center text-slate-450 text-xs transition-colors cursor-pointer"
            >
              {gameStatus === 'PLAYING' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => handleOnscreenControl('RIGHT')}
              disabled={gameStatus === 'GAME_OVER' || gameStatus === 'PAUSED'}
              className="w-12 h-12 bg-[#1a1a1c] border border-slate-800 active:bg-white active:text-black rounded-[4px] flex items-center justify-center text-slate-300 transition-colors font-bold cursor-pointer"
            >
              ▶
            </button>
          </div>
          <button
            onClick={() => handleOnscreenControl('DOWN')}
            disabled={gameStatus === 'GAME_OVER' || gameStatus === 'PAUSED'}
            className="w-12 h-12 bg-[#1a1a1c] border border-slate-800 active:bg-white active:text-black rounded-[4px] flex items-center justify-center mt-1 text-slate-300 transition-colors font-bold cursor-pointer"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Leaderboard & Controls column */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        {/* Real-time changeable Settings Panel */}
        <div className="bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-6 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Game Settings
          </h3>
          
          {/* Difficulty Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Difficulty Speed
            </label>
            <div className="flex gap-1.5">
              {(['EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => handleDifficultyChange(diff)}
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

          {/* Wall Wrapping Option */}
          <div className="border-t border-slate-800/40 pt-3.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Wall Collision Mode
            </label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setWallMode(true)}
                disabled={gameStatus === 'PLAYING' || gameStatus === 'PAUSED'}
                className={`flex-1 py-1.5 rounded-[4px] border text-[9px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  wallMode
                    ? 'bg-white text-black border-white'
                    : 'bg-black/30 border-slate-800 text-slate-400 hover:border-slate-500'
                }`}
              >
                Solid Walls
              </button>
              <button
                type="button"
                onClick={() => setWallMode(false)}
                disabled={gameStatus === 'PLAYING' || gameStatus === 'PAUSED'}
                className={`flex-1 py-1.5 rounded-[4px] border text-[9px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  !wallMode
                    ? 'bg-white text-black border-white'
                    : 'bg-black/30 border-slate-800 text-slate-400 hover:border-slate-500'
                }`}
              >
                Screen Wrap
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="border-t border-slate-800/40 pt-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Board Legend</span>
            <div className="space-y-2 text-[10px] font-semibold text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block shrink-0" />
                <span>Normal Apple (+10 pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] border border-white inline-block shrink-0 animate-pulse" />
                <span>Golden Nugget (+30 pts)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Info */}
        <div className="hidden lg:block bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-6">
          <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider mb-4">Controls</h3>
          <ul className="text-xs space-y-3 text-slate-400">
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Move Up</span>
              <kbd className="bg-black/50 border border-slate-850 px-2 py-0.5 rounded-[4px] text-[#e8e8ea] text-[10px] font-mono">W / ▲</kbd>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Move Left</span>
              <kbd className="bg-black/50 border border-slate-850 px-2 py-0.5 rounded-[4px] text-[#e8e8ea] text-[10px] font-mono">A / ◀</kbd>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Move Down</span>
              <kbd className="bg-black/50 border border-slate-850 px-2 py-0.5 rounded-[4px] text-[#e8e8ea] text-[10px] font-mono">S / ▼</kbd>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Move Right</span>
              <kbd className="bg-black/50 border border-slate-850 px-2 py-0.5 rounded-[4px] text-[#e8e8ea] text-[10px] font-mono">D / ▶</kbd>
            </li>
            <li className="flex justify-between items-center">
              <span>Pause / Resume</span>
              <kbd className="bg-black/50 border border-slate-850 px-2 py-0.5 rounded-[4px] text-[#e8e8ea] text-[10px] font-mono">Space</kbd>
            </li>
          </ul>
        </div>

        {/* Arcade Leaderboard */}
        <div className="bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-6 flex-1 flex flex-col">
          <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-slate-500" /> Leaderboard
          </h3>
          <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2 pr-1">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">No records yet.</p>
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
export default Snake;
