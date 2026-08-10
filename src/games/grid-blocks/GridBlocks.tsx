import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { storage } from '../../core/storage';
import { useTheme } from '../../context/ThemeContext';
import { Award, Play, Pause, RotateCcw, Target, Volume2, VolumeX, ArrowLeft, ArrowRight, ArrowDown, RefreshCw, ArrowUp } from 'lucide-react';
import { audio } from '../../core/audio';

// Constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // logical block size for the 300x600 canvas

const SHAPES = [
  [], // empty/no block
  [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], // I (Slate 200)
  [[1,0,0], [1,1,1], [0,0,0]],                  // J (Slate 300)
  [[0,0,1], [1,1,1], [0,0,0]],                  // L (Slate 400)
  [[1,1], [1,1]],                                // O (Slate 500)
  [[0,1,1], [1,1,0], [0,0,0]],                  // S (Slate 600)
  [[0,1,0], [1,1,1], [0,0,0]],                  // T (Slate 700)
  [[1,1,0], [0,1,1], [0,0,0]],                  // Z (Accent color violet)
];

export const GridBlocks: FC = () => {
  const { dark } = useTheme();
  
  // Theme-aware color palette matching QuickPlayZone
  const colors = {
    bg: dark ? '#16171d' : '#ffffff',
    gridLine: dark ? '#2e303a' : '#e5e4e7',
    text: dark ? '#9ca3af' : '#6b6375',
    textH: dark ? '#f3f4f6' : '#08060d',
    accent: dark ? '#c084fc' : '#aa3bff',
    // Block fills (no luminous colors)
    blocks: [
      'transparent',
      dark ? '#cbd5e1' : '#64748b', // I
      dark ? '#94a3b8' : '#475569', // J
      dark ? '#64748b' : '#334155', // L
      dark ? '#475569' : '#1e293b', // O
      dark ? '#334155' : '#0f172a', // S
      dark ? '#f1f5f9' : '#94a3b8', // T
      dark ? '#c084fc' : '#aa3bff', // Z (Accent)
    ],
    // Block borders
    borders: [
      'transparent',
      dark ? '#94a3b8' : '#475569',
      dark ? '#64748b' : '#334155',
      dark ? '#475569' : '#1e293b',
      dark ? '#334155' : '#0f172a',
      dark ? '#1e293b' : '#020617',
      dark ? '#cbd5e1' : '#64748b',
      dark ? '#a855f7' : '#7e22ce',
    ],
  };

  // --- Touch Layout Detection ---
  const [useTouchLayout, setUseTouchLayout] = useState(false);
  useEffect(() => {
    const checkTouch = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileViewport = window.innerWidth < 768;
      setUseTouchLayout(hasTouch || isMobileViewport);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // --- React State for HUD & UI ---
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameStatus, setGameStatus] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('IDLE');
  const [muted, setMuted] = useState(audio.getMuted());
  const [name, setName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [leaderboard, setLeaderboard] = useState(storage.getLeaderboard('grid_blocks'));

  // --- Canvas & Core Refs ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Mutable Game State for RAF loop
  const grid = useRef<(number | null)[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  const currentBlock = useRef<{ shape: number[][]; x: number; y: number; type: number }>({
    shape: [],
    x: 0,
    y: 0,
    type: 0,
  });
  const nextBlockType = useRef<number>(1);
  const dropCounter = useRef<number>(0);
  const dropInterval = useRef<number>(800); // ms per step
  const lastTime = useRef<number>(0);
  const lastHardDropTime = useRef<number>(0);

  // --- BroadCast qplay-status ---
  useEffect(() => {
    const isPlaying = gameStatus === 'PLAYING';
    window.dispatchEvent(new CustomEvent('qplay-status', { detail: { isPlaying } }));
    return () => {
      window.dispatchEvent(new CustomEvent('qplay-status', { detail: { isPlaying: false } }));
    };
  }, [gameStatus]);

  // Load HighScore & Leaderboard on mount / updates
  useEffect(() => {
    const stats = storage.getGameStats('grid_blocks');
    setHighScore(stats.highScore);
    setLeaderboard(storage.getLeaderboard('grid_blocks'));
  }, []);

  useEffect(() => {
    storage.incrementPlayCount('grid_blocks');
  }, []);

  // --- Gameplay Helper Functions ---
  const spawnBlock = () => {
    const type = nextBlockType.current;
    nextBlockType.current = Math.floor(Math.random() * 7) + 1;

    currentBlock.current = {
      shape: SHAPES[type],
      x: Math.floor((COLS - SHAPES[type][0].length) / 2),
      y: 0,
      type,
    };

    // If new block immediately collides, Game Over
    if (checkCollision(currentBlock.current.x, currentBlock.current.y, currentBlock.current.shape)) {
      setGameStatus('GAME_OVER');
      audio.playGameOver();
      
      const currentLeaderboard = storage.getLeaderboard('grid_blocks');
      const qualifiesForTop3 = score > 0 && (currentLeaderboard.length < 3 || score > (currentLeaderboard[2]?.score || 0));

      if (qualifiesForTop3) {
        setShowNamePrompt(true);
      } else if (score > 0) {
        storage.addLeaderboardScore('grid_blocks', {
          playerName: 'Anonymous Blockist',
          score: score,
        });
        setLeaderboard(storage.getLeaderboard('grid_blocks'));
      }
    }
  };

  const checkCollision = (bx: number, by: number, shape: number[][]): boolean => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const targetX = bx + c;
          const targetY = by + r;

          if (targetX < 0 || targetX >= COLS || targetY >= ROWS) {
            return true;
          }
          if (targetY >= 0 && grid.current[targetY][targetX] !== null) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const mergeBlock = () => {
    const { shape, x, y, type } = currentBlock.current;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          if (y + r >= 0) {
            grid.current[y + r][x + c] = type;
          }
        }
      }
    }
  };

  const rotateShape = (matrix: number[][]): number[][] => {
    const n = matrix.length;
    const res = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        res[c][n - 1 - r] = matrix[r][c];
      }
    }
    return res;
  };

  const handleRotate = () => {
    if (gameStatus !== 'PLAYING') return;
    const rotated = rotateShape(currentBlock.current.shape);
    let originalX = currentBlock.current.x;
    let offset = 1;

    // Kickback checks if rotating near walls
    while (checkCollision(currentBlock.current.x, currentBlock.current.y, rotated)) {
      currentBlock.current.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (Math.abs(offset) > rotated[0].length) {
        currentBlock.current.x = originalX;
        return; // rotation failed
      }
    }
    currentBlock.current.shape = rotated;
  };

  const handleMove = (dir: number) => {
    if (gameStatus !== 'PLAYING') return;
    if (!checkCollision(currentBlock.current.x + dir, currentBlock.current.y, currentBlock.current.shape)) {
      currentBlock.current.x += dir;
    }
  };

  const handleSoftDrop = () => {
    if (gameStatus !== 'PLAYING') return;
    if (!checkCollision(currentBlock.current.x, currentBlock.current.y + 1, currentBlock.current.shape)) {
      currentBlock.current.y += 1;
      setScore(s => s + 1);
    } else {
      lockAndCheckLines();
    }
  };

  const handleHardDrop = () => {
    if (gameStatus !== 'PLAYING') return;
    const now = Date.now();
    if (now - lastHardDropTime.current < 250) return; // 250ms cooldown to block accidental double drops
    lastHardDropTime.current = now;

    let dropDist = 0;
    while (!checkCollision(currentBlock.current.x, currentBlock.current.y + 1, currentBlock.current.shape)) {
      currentBlock.current.y += 1;
      dropDist++;
    }
    setScore(s => s + (dropDist * 2));
    lockAndCheckLines();
  };

  const lockAndCheckLines = () => {
    mergeBlock();
    clearLines();
    spawnBlock();
  };

  const clearLines = () => {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      const isLineFull = grid.current[r].every(val => val !== null);
      if (isLineFull) {
        grid.current.splice(r, 1);
        grid.current.unshift(Array(COLS).fill(null));
        cleared++;
        r++; // Check same row index again as upper rows shifted down
      }
    }

    if (cleared > 0) {
      audio.playPoint();
      const points = [0, 100, 300, 500, 800]; // Classic single/double/triple/tetris score
      const newScore = score + points[Math.min(cleared, 4)] * level;
      setScore(newScore);

      const totalLines = lines + cleared;
      setLines(totalLines);

      // Level up every 10 lines
      const nextLevel = Math.floor(totalLines / 10) + 1;
      if (nextLevel > level) {
        setLevel(nextLevel);
        audio.playLevelUp();
        dropInterval.current = Math.max(100, 800 - (nextLevel - 1) * 85);
      }
    }
  };

  const resetGame = () => {
    grid.current = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    nextBlockType.current = Math.floor(Math.random() * 7) + 1;
    setScore(0);
    setLevel(1);
    setLines(0);
    dropInterval.current = 800;
    setShowNamePrompt(false);
    setName('');
    spawnBlock();
    setGameStatus('PLAYING');
  };

  // --- Keyboard Event Handler ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showNamePrompt) return;

      if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'ArrowDown', 'KeyS', 'ArrowUp', 'KeyW', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (gameStatus !== 'PLAYING') {
        if (e.code === 'Space') {
          if (gameStatus === 'PAUSED') setGameStatus('PLAYING');
          else if (gameStatus === 'GAME_OVER' || gameStatus === 'IDLE') resetGame();
        }
        return;
      }

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          handleMove(-1);
          break;
        case 'ArrowRight':
        case 'KeyD':
          handleMove(1);
          break;
        case 'ArrowUp':
        case 'KeyW':
          handleRotate();
          break;
        case 'ArrowDown':
        case 'KeyS':
          handleSoftDrop();
          break;
        case 'Space':
          handleHardDrop();
          break;
        case 'Escape':
          setGameStatus('PAUSED');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, showNamePrompt, score, level, lines]);

  // --- Main Animation / Render Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time = 0) => {
      const deltaTime = time - lastTime.current;
      lastTime.current = time;

      if (gameStatus === 'PLAYING') {
        dropCounter.current += deltaTime;
        if (dropCounter.current > dropInterval.current) {
          handleSoftDrop();
          dropCounter.current = 0;
        }
      }

      // Draw Board
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid lines
      ctx.strokeStyle = colors.gridLine;
      ctx.lineWidth = 0.5;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK_SIZE, 0);
        ctx.lineTo(c * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK_SIZE);
        ctx.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE);
        ctx.stroke();
      }

      // Draw static grid elements
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const type = grid.current[r][c];
          if (type !== null) {
            ctx.fillStyle = colors.blocks[type];
            ctx.fillRect(c * BLOCK_SIZE + 1, r * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            ctx.strokeStyle = colors.borders[type];
            ctx.lineWidth = 1;
            ctx.strokeRect(c * BLOCK_SIZE + 1, r * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
          }
        }
      }

      // Draw falling block & preview ghost block
      if (gameStatus === 'PLAYING') {
        const { shape, x, y, type } = currentBlock.current;

        // 1. Ghost block location calculation
        let ghostY = y;
        while (!checkCollision(x, ghostY + 1, shape)) {
          ghostY++;
        }

        // Draw Ghost block
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] && ghostY + r >= 0) {
              ctx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 3]);
              ctx.strokeRect(
                (x + c) * BLOCK_SIZE + 2,
                (ghostY + r) * BLOCK_SIZE + 2,
                BLOCK_SIZE - 4,
                BLOCK_SIZE - 4
              );
              ctx.setLineDash([]); // Reset
            }
          }
        }

        // Draw current falling block
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] && y + r >= 0) {
              ctx.fillStyle = colors.blocks[type];
              ctx.fillRect((x + c) * BLOCK_SIZE + 1, (y + r) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
              ctx.strokeStyle = colors.borders[type];
              ctx.lineWidth = 1;
              ctx.strokeRect((x + c) * BLOCK_SIZE + 1, (y + r) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            }
          }
        }
      }

      if (gameStatus === 'PLAYING' || gameStatus === 'IDLE' || gameStatus === 'PAUSED') {
        animationFrameId.current = requestAnimationFrame(render);
      }
    };

    animationFrameId.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [gameStatus, dark]);

  // --- Save Score to Leaderboard ---
  const handleSaveScore = () => {
    storage.addLeaderboardScore('grid_blocks', {
      playerName: name.trim() || 'Anonymous Blockist',
      score: score,
    });
    setLeaderboard(storage.getLeaderboard('grid_blocks'));
    setShowNamePrompt(false);
    setName('');
  };

  const handleSkipSaveScore = () => {
    storage.addLeaderboardScore('grid_blocks', {
      playerName: 'Anonymous Blockist',
      score: score,
    });
    setLeaderboard(storage.getLeaderboard('grid_blocks'));
    setShowNamePrompt(false);
    setName('');
  };

  const toggleMute = () => {
    const isMuted = audio.toggleMute();
    setMuted(isMuted);
  };

  // --- Helper Render Functions ---
  const renderStatsHub = (className: string) => (
    <div className={`flex justify-between items-center bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-slate-800 p-4 rounded-[4px] ${className}`}>
      <div className="text-center">
        <div className="text-xs text-zinc-500 dark:text-slate-400 font-semibold mb-0.5">Level</div>
        <div className="text-lg font-bold text-zinc-900 dark:text-white font-mono">{level}</div>
      </div>
      <div className="text-center">
        <div className="text-xs text-zinc-500 dark:text-slate-400 font-semibold mb-0.5">Score</div>
        <div className="text-lg font-bold text-zinc-900 dark:text-white font-mono">{score}</div>
      </div>
      <div className="text-center">
        <div className="text-xs text-zinc-500 dark:text-slate-400 font-semibold mb-0.5 flex items-center justify-center gap-1">
          <Award className="w-3.5 h-3.5 text-zinc-500" /> Best
        </div>
        <div className="text-lg font-bold text-zinc-900 dark:text-white font-mono">{highScore}</div>
      </div>
    </div>
  );

  const renderVirtualControls = (className: string) => (
    <div className={`flex flex-col gap-2 p-2 bg-zinc-50 dark:bg-slate-900/40 border border-zinc-200 dark:border-slate-800 rounded-[4px] select-none ${className}`}>
      <div className="flex justify-between gap-2">
        <button
          onPointerDown={(e) => { e.preventDefault(); handleMove(-1); }}
          className="flex-1 flex items-center justify-center bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-slate-800 active:bg-zinc-900 dark:active:bg-white active:text-white dark:active:text-black py-3 rounded text-zinc-700 dark:text-slate-300 font-bold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); handleRotate(); }}
          className="flex-1 flex items-center justify-center bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-slate-800 active:bg-zinc-900 dark:active:bg-white active:text-white dark:active:text-black py-3 rounded text-zinc-700 dark:text-slate-300 font-bold cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); handleMove(1); }}
          className="flex-1 flex items-center justify-center bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-slate-800 active:bg-zinc-900 dark:active:bg-white active:text-white dark:active:text-black py-3 rounded text-zinc-700 dark:text-slate-300 font-bold cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onPointerDown={(e) => { e.preventDefault(); handleSoftDrop(); }}
          className="flex-1 flex items-center justify-center bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-slate-800 active:bg-zinc-900 dark:active:bg-white active:text-white dark:active:text-black py-2.5 rounded text-zinc-700 dark:text-slate-300 font-bold cursor-pointer"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); handleHardDrop(); }}
          className="flex-1 flex items-center justify-center bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-slate-800 active:bg-zinc-900 dark:active:bg-white active:text-white dark:active:text-black py-2.5 rounded text-zinc-700 dark:text-slate-300 font-bold text-xs uppercase cursor-pointer"
        >
          <ArrowUp className="w-3.5 h-3.5 mr-1" /> Drop
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row justify-center items-center lg:items-start gap-8 w-full max-w-5xl mx-auto px-4 py-8 select-none">
      {/* Game Board (Left/Top) */}
      <div className="w-full lg:w-auto flex flex-col items-center">
        {/* HUD Statistics (Mobile only) */}
        {renderStatsHub('lg:hidden w-full max-w-[240px] sm:max-w-[260px] lg:max-w-[270px] mb-4')}

        {/* Board Frame Container */}
        <div className="w-full max-w-[240px] sm:max-w-[260px] lg:max-w-[270px] flex flex-col items-center">
          <div className="relative border border-zinc-200 dark:border-slate-800 rounded-[4px] overflow-hidden bg-[#09090b] w-full">
            <canvas
              ref={canvasRef}
              width={300}
              height={600}
              className="block w-full aspect-[1/2]"
            />

            {/* Sound Mute Toggle overlay */}
            <button
              onClick={toggleMute}
              className="absolute top-3 right-3 z-30 p-2 rounded-full bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-slate-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Overlays */}
            {gameStatus === 'IDLE' && (
              <div className="absolute inset-0 bg-white/95 dark:bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
                <Target className="w-12 h-12 text-zinc-400 dark:text-slate-655 mb-3 animate-pulse" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-2 uppercase tracking-wider">Grid Blocks</h3>
                <p className="text-xs text-zinc-500 dark:text-slate-400 mb-6 max-w-[200px]">
                  Classic geometry stacking. Align rows to clear blocks and score points. No luminous lights.
                </p>

                <button
                  onClick={resetGame}
                  className="flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold px-6 py-2.5 rounded-[4px] border border-zinc-900 dark:border-white hover:bg-transparent hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer w-full max-w-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Start Game
                </button>
              </div>
            )}

            {gameStatus === 'PAUSED' && (
              <div className="absolute inset-0 bg-white/95 dark:bg-[#121214]/95 flex flex-col items-center justify-center p-6 gap-4 z-20">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Game Paused</h3>
                <div className="flex gap-3 w-full max-w-[200px]">
                  <button
                    onClick={() => setGameStatus('PLAYING')}
                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold py-2.5 rounded-[4px] border border-zinc-900 dark:border-white hover:bg-transparent hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Resume
                  </button>
                  <button
                    onClick={resetGame}
                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-100 dark:bg-[#1a1a1c] text-zinc-505 dark:text-slate-400 font-bold py-2 rounded-[4px] border border-zinc-200 dark:border-slate-800 hover:border-zinc-400 dark:hover:border-slate-500 hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restart
                  </button>
                </div>
              </div>
            )}

            {gameStatus === 'GAME_OVER' && (
              <div className="absolute inset-0 bg-white/95 dark:bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
                <h3 className="text-lg font-bold text-red-500 mb-2 uppercase tracking-wider">Game Over</h3>
                <p className="text-sm text-zinc-500 mb-4 font-medium">Final Score: <span className="text-zinc-900 dark:text-white font-bold font-mono">{score}</span></p>

                {showNamePrompt ? (
                  <div className="w-full max-w-xs flex flex-col gap-3">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      New Leaderboard Score! Enter Name
                    </div>
                    <input
                      type="text"
                      maxLength={15}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name"
                      className="bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-300 dark:border-slate-800 text-zinc-900 dark:text-white px-3 py-2 rounded-[4px] text-xs text-center focus:outline-none focus:border-zinc-500 font-medium"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveScore}
                        className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold py-2 rounded-[4px] text-xs hover:bg-transparent hover:text-zinc-900 dark:hover:text-white border border-zinc-900 dark:border-white transition-colors uppercase tracking-wider cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleSkipSaveScore}
                        className="flex-1 bg-zinc-100 dark:bg-[#1a1a1c] text-zinc-550 dark:text-slate-400 font-bold py-2 rounded-[4px] border border-zinc-200 dark:border-slate-800 hover:border-zinc-400 dark:hover:border-slate-505 hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={resetGame}
                    className="flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold px-6 py-2.5 rounded-[4px] border border-zinc-900 dark:border-white hover:bg-transparent hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer w-full max-w-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Play Again
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pause Trigger on game board */}
          {gameStatus === 'PLAYING' && (
            <button
              onClick={() => setGameStatus('PAUSED')}
              className="mt-3 flex items-center gap-1.5 px-3 py-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors border border-zinc-200 dark:border-slate-800 rounded-full cursor-pointer"
            >
              <Pause className="w-3 h-3" /> Pause Game
            </button>
          )}

          {/* Onscreen Controls (Mobile only) */}
          {(useTouchLayout || true) && renderVirtualControls('lg:hidden w-full max-w-[240px] sm:max-w-[260px] lg:max-w-[270px] mt-4')}
        </div>
      </div>

      {/* Info & Leaderboard Panel (Right/Bottom) */}
      <div className="w-full lg:w-72 flex flex-col gap-6">
        {/* HUD Statistics (Desktop only) */}
        {renderStatsHub('hidden lg:flex w-full')}

        {/* Onscreen Controls (Desktop only) */}
        {renderVirtualControls('hidden lg:flex w-full')}

        {/* Helper Panel */}
        <div className="bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-slate-800 p-5 rounded-[4px]">
          <h4 className="text-xs font-bold text-zinc-550 dark:text-slate-400 uppercase tracking-wider mb-3">Controls</h4>
          <ul className="text-xs text-zinc-500 dark:text-slate-455 space-y-2 font-medium">
            <li className="flex justify-between border-b border-zinc-200/50 dark:border-slate-850 pb-1">
              <span>Move Block</span>
              <span className="font-mono text-zinc-700 dark:text-slate-300">A/D or ←/→</span>
            </li>
            <li className="flex justify-between border-b border-zinc-200/50 dark:border-slate-850 pb-1">
              <span>Rotate</span>
              <span className="font-mono text-zinc-700 dark:text-slate-300">W or ↑</span>
            </li>
            <li className="flex justify-between border-b border-zinc-200/50 dark:border-slate-850 pb-1">
              <span>Soft Drop</span>
              <span className="font-mono text-zinc-700 dark:text-slate-300">S or ↓</span>
            </li>
            <li className="flex justify-between border-b border-zinc-200/50 dark:border-slate-850 pb-1">
              <span>Hard Drop</span>
              <span className="font-mono text-zinc-700 dark:text-slate-300">Space</span>
            </li>
          </ul>
        </div>

        {/* Local Leaderboard */}
        <div className="bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-slate-800 p-5 rounded-[4px]">
          <h4 className="text-xs font-bold text-zinc-550 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-zinc-400" /> Local Leaderboard
          </h4>
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">No high scores registered yet.</p>
            ) : (
              leaderboard.map((entry, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-center text-xs p-2 rounded-[2px] ${
                    index === 0
                      ? 'bg-zinc-200/70 dark:bg-slate-800/40 font-bold border border-zinc-300/30'
                      : 'border-b border-zinc-200/40 dark:border-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-405 font-mono w-4">{index + 1}.</span>
                    <span className="truncate max-w-[120px] text-zinc-700 dark:text-slate-300">{entry.playerName}</span>
                  </div>
                  <span className="font-mono text-zinc-900 dark:text-white font-bold">{entry.score}</span>
                </div>
              ))
            )}
        </div>
      </div>
    </div>
  </div>
);
};

export default GridBlocks;
