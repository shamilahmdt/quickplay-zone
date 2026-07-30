import { useState, useEffect, useRef, useMemo } from 'react';
import type { FC } from 'react';
import { SNAKE_CONFIG } from './snake.config';
import type { Direction, Position, BoardModel } from './snake.logic';
import { getNextHead, getRandomPosition, generateObstacles, checkCollision, BOARD_MODELS_INFO } from './snake.logic';
import { storage } from '../../core/storage';
import { Award, Play, Pause, RotateCcw, Gamepad2, Settings, Grid, Volume2, VolumeX } from 'lucide-react';
import { audio } from '../../core/audio';

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
  const [boardModel, setBoardModel] = useState<BoardModel>('CLASSIC');

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(SNAKE_CONFIG.DIFFICULTY_SPEEDS.MEDIUM);
  const [muted, setMuted] = useState(audio.getMuted());

  // Manage BGM loop based on game status
  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      audio.startBgm('snake');
    } else {
      audio.stopBgm();
    }
    return () => {
      audio.stopBgm();
    };
  }, [gameStatus]);

  // Broadcast playing status
  useEffect(() => {
    const isPlaying = gameStatus === 'PLAYING';
    window.dispatchEvent(new CustomEvent('qplay-status', { detail: { isPlaying } }));
    return () => {
      window.dispatchEvent(new CustomEvent('qplay-status', { detail: { isPlaying: false } }));
    };
  }, [gameStatus]);

  // High Score Prompt State
  const [name, setName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [leaderboard, setLeaderboard] = useState(
    storage.getLeaderboard(`snake_${difficulty.toLowerCase()}_${boardModel.toLowerCase()}_${wallMode ? 'solid' : 'wrap'}`)
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const directionRef = useRef<Direction>('UP');
  const inputQueue = useRef<Direction[]>([]);
  const obstacles = useMemo(() => generateObstacles(boardModel, SNAKE_CONFIG.GRID_SIZE), [boardModel]);

  // Load highscore when settings change
  useEffect(() => {
    const modeKey = `snake_${difficulty.toLowerCase()}_${boardModel.toLowerCase()}_${wallMode ? 'solid' : 'wrap'}`;
    const stats = storage.getGameStats(modeKey);
    setHighScore(stats.highScore);
    setLeaderboard(storage.getLeaderboard(modeKey));
  }, [difficulty, boardModel, wallMode]);

  // Increment overall play count on mount
  useEffect(() => {
    storage.incrementPlayCount('snake');
  }, []);

  // Keyboard controls with scroll prevention
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

        // Screen Wrap logic
        if (!wallMode) {
          if (nextX < 0) nextX = SNAKE_CONFIG.GRID_SIZE - 1;
          else if (nextX >= SNAKE_CONFIG.GRID_SIZE) nextX = 0;
          if (nextY < 0) nextY = SNAKE_CONFIG.GRID_SIZE - 1;
          else if (nextY >= SNAKE_CONFIG.GRID_SIZE) nextY = 0;
        }

        const newHead = { x: nextX, y: nextY };

        // Check Collision with walls, obstacles, and self
        const isCollided = checkCollision(newHead, prevSnake.slice(0, -1), obstacles, SNAKE_CONFIG.GRID_SIZE, wallMode);

        if (isCollided) {
          setGameStatus('GAME_OVER');
          audio.playGameOver();
          const modeKey = `snake_${difficulty.toLowerCase()}_${boardModel.toLowerCase()}_${wallMode ? 'solid' : 'wrap'}`;
          const currentLeaderboard = storage.getLeaderboard(modeKey);
          const qualifiesForTop3 = score > 0 && (currentLeaderboard.length < 3 || score > (currentLeaderboard[2]?.score || 0));

          if (qualifiesForTop3) {
            setShowNamePrompt(true);
          } else if (score > 0) {
            storage.addLeaderboardScore(modeKey, {
              playerName: 'Anonymous Player',
              score: score,
            });
            storage.updateHighScore(modeKey, score);
            setLeaderboard(storage.getLeaderboard(modeKey));
          }
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Eat food
        if (newHead.x === food.x && newHead.y === food.y) {
          const isGolden = foodType === 'golden';
          if (isGolden) {
            audio.playSnakeGolden();
          } else {
            audio.playSnakeEat();
          }
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

          // Exclude snake body and obstacles when placing new food
          const excludedPositions = [...newSnake, ...obstacles];
          setFood(getRandomPosition(SNAKE_CONFIG.GRID_SIZE, excludedPositions));
          setFoodType(Math.random() < 0.2 ? 'golden' : 'normal');
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [gameStatus, food, foodType, speed, score, highScore, wallMode, difficulty, boardModel, obstacles]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = SNAKE_CONFIG.COLORS.boardBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cellWidth = canvas.width / SNAKE_CONFIG.GRID_SIZE;
    const cellHeight = canvas.height / SNAKE_CONFIG.GRID_SIZE;

    // Draw Grid Lines (subtle)
    ctx.strokeStyle = SNAKE_CONFIG.COLORS.gridLines;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= SNAKE_CONFIG.GRID_SIZE; i++) {
      const pos = i * cellWidth;
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

    // Draw Obstacles
    obstacles.forEach((obs) => {
      const x = obs.x * cellWidth + 1;
      const y = obs.y * cellHeight + 1;
      const w = cellWidth - 2;
      const h = cellHeight - 2;

      ctx.fillStyle = SNAKE_CONFIG.COLORS.obstacle;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, w, h, 3) : ctx.rect(x, y, w, h);
      ctx.fill();

      ctx.strokeStyle = SNAKE_CONFIG.COLORS.obstacleBorder;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw Food (Clean, steady rendering without unwanted flickering)
    const isGolden = foodType === 'golden';
    ctx.fillStyle = isGolden ? SNAKE_CONFIG.COLORS.goldenFood : SNAKE_CONFIG.COLORS.food;
    ctx.beginPath();
    const radius = cellWidth / 2 - 2;
    const centerX = food.x * cellWidth + cellWidth / 2;
    const centerY = food.y * cellHeight + cellHeight / 2;
    ctx.arc(centerX, centerY, Math.max(2, radius), 0, 2 * Math.PI);
    ctx.fill();

    if (isGolden) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw Snake
    snake.forEach((segment, idx) => {
      const isHead = idx === 0;

      const length = snake.length;
      const factor = Math.max(0.68, 1 - (idx / length) * 0.32);
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
        ctx.fillStyle = SNAKE_CONFIG.COLORS.snakeHeadEye;
        const eyeSize = cellWidth * 0.16;
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
  }, [snake, food, foodType, boardModel, obstacles]);

  const resetGame = () => {
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    const obstaclesList = generateObstacles(boardModel, SNAKE_CONFIG.GRID_SIZE);

    setSnake(initialSnake);
    setFood(getRandomPosition(SNAKE_CONFIG.GRID_SIZE, [...initialSnake, ...obstaclesList]));
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
    const modeKey = `snake_${difficulty.toLowerCase()}_${boardModel.toLowerCase()}_${wallMode ? 'solid' : 'wrap'}`;
    storage.addLeaderboardScore(modeKey, {
      playerName: name.trim() || 'Anonymous Player',
      score: score,
    });
    storage.updateHighScore(modeKey, score);
    setLeaderboard(storage.getLeaderboard(modeKey));
    setShowNamePrompt(false);
    setName('');
  };

  const handleSkipSaveScore = () => {
    const modeKey = `snake_${difficulty.toLowerCase()}_${boardModel.toLowerCase()}_${wallMode ? 'solid' : 'wrap'}`;
    storage.addLeaderboardScore(modeKey, {
      playerName: 'Anonymous Player',
      score: score,
    });
    storage.updateHighScore(modeKey, score);
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
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl mx-auto px-4 py-8 select-none">
      {/* Game board column */}
      <div className="flex-1 flex flex-col items-center">
        {/* Game Stats Hub */}
        <div className="flex justify-between items-center w-full max-w-[480px] mb-4 bg-[#1a1a1c] border border-slate-800 p-4 rounded-[4px]">
          <div>
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

        {/* Board Canvas container */}
        <div className={`relative border rounded-[4px] overflow-hidden bg-[#09090b] w-full max-w-[480px] transition-all duration-300 ${
          wallMode 
            ? 'border-slate-500' 
            : 'border-slate-800'
        }`}>
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
              <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider">Snake Arena</h3>
              <p className="text-xs text-slate-500 mb-6 max-w-[240px]">
                Press Arrow / WASD keys or click below to start immediately
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
            <div className="absolute inset-0 bg-[#121214]/95 flex flex-col items-center justify-center p-6 gap-4 z-20">
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
              <h3 className="text-lg font-bold text-red-500 mb-2 uppercase tracking-wider">Game Over</h3>
              <p className="text-slate-400 mb-4 font-medium">
                Final score: <span className="text-white">{score}</span>
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
              className="w-12 h-12 bg-[#1a1a1c] border border-slate-800 active:bg-white active:text-black rounded-[4px] flex items-center justify-center text-slate-400 text-xs transition-colors cursor-pointer"
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
        <div className="bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-6 flex flex-col gap-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-slate-400" /> Game Options
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

          {/* Difficulty Selector */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
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
                      ? 'bg-white text-black border-white'
                      : 'bg-black/30 border-slate-800 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Board Models / Map Layout Options */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Grid className="w-3 h-3" /> Arena Map Layout
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {BOARD_MODELS_INFO.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setBoardModel(model.id)}
                  disabled={gameStatus === 'PLAYING' || gameStatus === 'PAUSED'}
                  title={model.description}
                  className={`py-1.5 px-2 rounded-[4px] border text-[10px] font-bold text-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    boardModel === model.id
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                      : 'bg-black/30 border-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {model.name}
                </button>
              ))}
            </div>
          </div>

          {/* Wall Wrapping Option */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Wall Collision Mode
            </div>
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

          {/* Legend (Clean steady rendering without flickering) */}
          <div className="border-t border-slate-800 pt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Board Items
            </span>
            <div className="space-y-2 text-[10px] font-semibold text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block shrink-0" />
                <span>Apple (+10 pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] border border-white/60 inline-block shrink-0" />
                <span>Golden Nugget (+30 pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#3f3f46] border border-[#52525b] inline-block shrink-0" />
                <span>Barrier Obstacle (Collision hazard)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Controls Info */}
        <div className="hidden lg:block bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Tactical Controls</h3>
          <ul className="text-xs space-y-3 text-slate-400">
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Move Up</span>
              <kbd className="bg-black/50 border border-slate-800 px-2 py-0.5 rounded text-[#e8e8ea] text-[10px] font-mono">W / ▲</kbd>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Move Left</span>
              <kbd className="bg-black/50 border border-slate-800 px-2 py-0.5 rounded text-[#e8e8ea] text-[10px] font-mono">A / ◀</kbd>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Move Down</span>
              <kbd className="bg-black/50 border border-slate-800 px-2 py-0.5 rounded text-[#e8e8ea] text-[10px] font-mono">S / ▼</kbd>
            </li>
            <li className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span>Move Right</span>
              <kbd className="bg-black/50 border border-slate-800 px-2 py-0.5 rounded text-[#e8e8ea] text-[10px] font-mono">D / ▶</kbd>
            </li>
            <li className="flex justify-between items-center">
              <span>Pause / Resume</span>
              <kbd className="bg-black/50 border border-slate-800 px-2 py-0.5 rounded text-[#e8e8ea] text-[10px] font-mono">Space</kbd>
            </li>
          </ul>
        </div>

        {/* Arcade Leaderboard */}
        <div className="bg-[#1a1a1c] border border-slate-800 rounded-[4px] p-6 flex-1 flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-slate-500" /> Leaderboard Logs
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

export default Snake;
