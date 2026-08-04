import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { SIMON_CONFIG } from './simon-says.config';
import type { SimonTile } from './simon-says.logic';
import { getRandomTile, playTileSound, checkInput, isRoundComplete } from './simon-says.logic';
import { storage } from '../../core/storage';
import { Play, Pause, RotateCcw, Volume2, Zap } from 'lucide-react';

export const SimonSays: FC = () => {
  const [gameState, setGameState] = useState<'IDLE' | 'SHOWING' | 'INPUT' | 'PAUSED' | 'GAME_OVER'>('IDLE');
  const gameStateBeforePause = useRef<'SHOWING' | 'INPUT'>('SHOWING');
  const pausedRef = useRef<boolean>(false);
  const [sequence, setSequence] = useState<SimonTile['id'][]>([]);
  const [, setUserInput] = useState<SimonTile['id'][]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [activeTile, setActiveTile] = useState<SimonTile['id'] | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const gameStateRef = useRef<'IDLE' | 'SHOWING' | 'INPUT' | 'PAUSED' | 'GAME_OVER'>('IDLE');
  const sequenceRef = useRef<SimonTile['id'][]>([]);
  const userInputRef = useRef<SimonTile['id'][]>([]);

  const pauseGame = () => {
    if (gameStateRef.current === 'SHOWING' || gameStateRef.current === 'INPUT') {
      gameStateBeforePause.current = gameStateRef.current;
      pausedRef.current = true;
      setGameState('PAUSED');
      gameStateRef.current = 'PAUSED';
    }
  };

  const resumeGame = () => {
    if (gameStateRef.current === 'PAUSED') {
      pausedRef.current = false;
      const nextState = gameStateBeforePause.current;
      setGameState(nextState);
      gameStateRef.current = nextState;
    }
  };

  // Keyboard controls for pausing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameStateRef.current === 'SHOWING' || gameStateRef.current === 'INPUT') {
          pauseGame();
        } else if (gameStateRef.current === 'PAUSED') {
          resumeGame();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load high score on mount
  useEffect(() => {
    const stats = storage.getGameStats('simon_says');
    setHighScore(stats.highScore);
    storage.incrementPlayCount('simon_says');
  }, []);

  // Broadcast playing status
  useEffect(() => {
    const isPlaying = gameState === 'SHOWING' || gameState === 'INPUT';
    window.dispatchEvent(new CustomEvent('qplay-status', { detail: { isPlaying } }));
    return () => {
      window.dispatchEvent(new CustomEvent('qplay-status', { detail: { isPlaying: false } }));
    };
  }, [gameState]);

  // Flash a tile
  const flashTile = (tileId: SimonTile['id'], duration: number) => {
    const tile = SIMON_CONFIG.TILES.find((t) => t.id === tileId)!;
    
    setActiveTile(tileId);
    if (soundEnabled) {
      playTileSound(tile.frequency, duration);
    }
    
    setTimeout(() => {
      setActiveTile(null);
    }, duration);
  };

  // Show the sequence
  const showSequence = async (seq: SimonTile['id'][]) => {
    setGameState('SHOWING');
    gameStateRef.current = 'SHOWING';
    
    for (let i = 0; i < seq.length; i++) {
      while (pausedRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await new Promise((resolve) => {
        setTimeout(() => {
          const flashDuration = SIMON_CONFIG.getFlashDuration(seq.length);
          flashTile(seq[i], flashDuration);
          resolve(null);
        }, SIMON_CONFIG.getPauseBetweenTiles(seq.length) + (i > 0 ? SIMON_CONFIG.getFlashDuration(seq.length) : 0));
      });
    }
    
    // Wait a bit after showing, then allow input
    await new Promise((resolve) => setTimeout(resolve, 600));
    
    setGameState('INPUT');
    gameStateRef.current = 'INPUT';
  };

  // Start new round
  const startNewRound = async () => {
    const newTile = getRandomTile();
    const newSequence = [...sequenceRef.current, newTile];
    
    sequenceRef.current = newSequence;
    setSequence(newSequence);
    
    userInputRef.current = [];
    setUserInput([]);
    
    setScore(newSequence.length);
    if (newSequence.length > highScore) {
      setHighScore(newSequence.length);
    }
    
    await showSequence(newSequence);
  };

  // Handle tile click
  const handleTileClick = async (tileId: SimonTile['id']) => {
    if (gameStateRef.current !== 'INPUT') return;
    
    // Flash and sound
    const flashDuration = SIMON_CONFIG.getFlashDuration(sequenceRef.current.length);
    flashTile(tileId, flashDuration);
    
    // Record input
    const newInput = [...userInputRef.current, tileId];
    userInputRef.current = newInput;
    setUserInput(newInput);
    
    // Check if input is valid
    if (!checkInput(sequenceRef.current, newInput)) {
      // Wrong tile!
      setGameState('GAME_OVER');
      gameStateRef.current = 'GAME_OVER';
      
      // Save score
      storage.updateHighScore('simon_says', score);
      return;
    }
    
    // Check if round complete
    if (isRoundComplete(sequenceRef.current, newInput)) {
      // Disable input while showing next sequence
      setGameState('SHOWING');
      gameStateRef.current = 'SHOWING';
      
      // Small delay before next round
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      await startNewRound();
    }
  };

  // Start game
  const handleStartGame = async () => {
    setGameState('SHOWING');
    gameStateRef.current = 'SHOWING';
    
    sequenceRef.current = [];
    userInputRef.current = [];
    setSequence([]);
    setUserInput([]);
    setScore(0);
    
    await startNewRound();
  };

  // Reset game
  const handleResetGame = () => {
    setGameState('IDLE');
    gameStateRef.current = 'IDLE';
    sequenceRef.current = [];
    userInputRef.current = [];
    setSequence([]);
    setUserInput([]);
    setScore(0);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full gap-8 px-4 py-8 select-none">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-2 text-zinc-900 dark:text-white">Simon Says</h1>
        <p className="text-xs md:text-sm text-zinc-600 dark:text-slate-400 font-semibold">Watch the pattern. Repeat it back. How far can you go?</p>
      </div>

      {/* Score Display */}
      <div className="flex gap-8 md:gap-16">
        <div className="text-center">
          <div className="text-xs text-zinc-500 dark:text-slate-400 font-bold uppercase mb-1">Current</div>
          <div className="text-3xl md:text-4xl font-black font-mono text-zinc-900 dark:text-white">{score}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-zinc-500 dark:text-slate-400 font-bold uppercase mb-1">Best</div>
          <div className="text-3xl md:text-4xl font-black font-mono text-yellow-500 dark:text-yellow-400">{highScore}</div>
        </div>
      </div>

      {/* Game Board */}
      <div className="relative w-full max-w-sm aspect-square rounded-lg overflow-hidden border-4 border-zinc-300 dark:border-slate-700 shadow-2xl">
        <div className="grid grid-cols-2 gap-0 w-full h-full">
          {SIMON_CONFIG.TILES.map((tile) => (
            <button
              key={tile.id}
              onClick={() => handleTileClick(tile.id)}
              disabled={gameState !== 'INPUT'}
              className={`
                relative flex items-center justify-center cursor-pointer transition-all
                ${tile.className}
                ${activeTile === tile.id ? 'brightness-150 ring-4 ring-white scale-95' : 'brightness-100'}
                ${gameState !== 'INPUT' ? 'cursor-not-allowed opacity-80' : 'hover:brightness-125 active:scale-95'}
                min-h-[60px]
              `}
              aria-label={`${tile.id} tile`}
            >
              <div className="text-4xl font-black opacity-30 pointer-events-none uppercase">{tile.id[0]}</div>
            </button>
          ))}
        </div>

        {/* Overlay States */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-4 z-20">
            <Pause className="w-12 h-12 text-yellow-400 animate-pulse" />
            <h3 className="text-lg font-bold uppercase tracking-wider text-white">Paused</h3>
            <button
              onClick={resumeGame}
              className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-lg border border-white hover:bg-transparent hover:text-white transition-colors uppercase text-sm"
            >
              <Play className="w-4 h-4 fill-current" /> Resume Game
            </button>
          </div>
        )}

        {gameState === 'IDLE' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-20">
            <Zap className="w-12 h-12 text-yellow-400" />
            <h3 className="text-lg font-bold uppercase tracking-wider text-white">Ready?</h3>
            <button
              onClick={handleStartGame}
              className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-lg border border-white hover:bg-transparent hover:text-white transition-colors uppercase text-sm"
            >
              <Play className="w-4 h-4 fill-current" /> Start Game
            </button>
          </div>
        )}

        {gameState === 'SHOWING' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
            <div className="text-center">
              <div className="inline-block animate-pulse">
                <Volume2 className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm font-semibold mt-2 text-slate-200">Watching...</p>
            </div>
          </div>
        )}

        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-4 z-20">
            <h3 className="text-2xl font-bold text-red-500 uppercase tracking-wider">Game Over</h3>
            <p className="text-slate-300 font-semibold">Sequence reached: <span className="text-white text-xl">{score}</span></p>
            {score > 0 && score === highScore && (
              <p className="text-yellow-400 font-bold text-sm animate-pulse">🎉 New Record!</p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleStartGame}
                className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-lg border border-white hover:bg-transparent hover:text-white transition-colors uppercase text-sm"
              >
                <Play className="w-4 h-4 fill-current" /> Try Again
              </button>
              <button
                onClick={handleResetGame}
                className="flex items-center gap-2 bg-slate-800 text-slate-300 font-bold px-6 py-2.5 rounded-lg border border-slate-700 hover:border-slate-500 hover:text-white transition-colors uppercase text-sm"
              >
                <RotateCcw className="w-4 h-4" /> Quit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-3 rounded-lg border transition-all cursor-pointer ${
            soundEnabled
              ? 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400'
              : 'bg-zinc-100 dark:bg-slate-900 border-zinc-200 dark:border-slate-700 text-zinc-600 dark:text-slate-400'
          }`}
          title={soundEnabled ? 'Sound On' : 'Sound Off'}
        >
          <Volume2 className="w-5 h-5" />
        </button>
        {(gameState === 'SHOWING' || gameState === 'INPUT' || gameState === 'PAUSED') && (
          <button
            onClick={() => {
              if (gameState === 'PAUSED') {
                resumeGame();
              } else {
                pauseGame();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 text-zinc-700 dark:text-slate-350 hover:text-zinc-950 dark:hover:text-white hover:border-zinc-350 dark:hover:border-slate-500 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            {gameState === 'PAUSED' ? (
              <>
                <Play className="w-4 h-4 fill-current" /> Resume
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" /> Pause
              </>
            )}
          </button>
        )}
      </div>

      {/* Game Status Info */}
      {gameState === 'INPUT' && (
        <p className="text-xs text-zinc-500 dark:text-slate-500 font-semibold text-center">
          Your turn! Tap {sequence.length} tile{sequence.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default SimonSays;
