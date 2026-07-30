import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { storage } from '../../core/storage';
import { Award, Play, Pause, RotateCcw, Target, Sparkles, Volume2, VolumeX, Trophy, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { audio } from '../../core/audio';
import type { ScoreEntry } from '../../core/types';
import { TWENTYFORTYEIGHT_CONFIG } from './twentyfortyeight.config';
import type { Tile, Direction } from './twentyfortyeight.logic';
import { spawnTile, checkGameOver2048 } from './twentyfortyeight.logic';

export const TwentyFortyEight: FC = () => {

  // --- Game State ---
  const [board2048, setBoard2048] = useState<Tile[]>([]);
  const [score2048, setScore2048] = useState(0);
  const [highScore2048, setHighScore2048] = useState(0);
  const [status2048, setStatus2048] = useState<'idle' | 'playing' | 'paused' | 'won' | 'gameover'>('idle');
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [muted, setMuted] = useState(audio.getMuted());

  // --- Leaderboard & Stats ---
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [name, setName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  const nextTileId = useRef(0);
  const touchStartRef = useRef({ x: 0, y: 0 });

  // --- Load high score & increment play count on mount ---
  useEffect(() => {
    const stats = storage.getGameStats('twentyfortyeight');
    setHighScore2048(stats.highScore);
    setLeaderboard(storage.getLeaderboard('twentyfortyeight'));
    storage.incrementPlayCount('twentyfortyeight');
  }, []);

  // Broadcast playing status
  useEffect(() => {
    const isPlaying = status2048 === 'playing';
    window.dispatchEvent(new CustomEvent('qplay-status', { detail: { isPlaying } }));
    return () => {
      window.dispatchEvent(new CustomEvent('qplay-status', { detail: { isPlaying: false } }));
    };
  }, [status2048]);

  // --- Helper Functions ---
  const init2048 = () => {
    nextTileId.current = 0;
    let tiles: Tile[] = [];
    tiles = spawnTile(tiles, nextTileId);
    tiles = spawnTile(tiles, nextTileId);
    setBoard2048(tiles);
    setScore2048(0);
    setStatus2048('playing');
    setKeepPlaying(false);
    setShowNamePrompt(false);
    setName('');
  };

  const move2048 = (direction: Direction) => {
    if (status2048 !== 'playing' && status2048 !== 'won') {
      if (status2048 === 'idle') {
        init2048();
      }
      return;
    }

    let currentTiles = board2048.map(t => ({ ...t }));
    let moved = false;
    let scoreGain = 0;

    const isVertical = direction === 'up' || direction === 'down';
    const isForward = direction === 'down' || direction === 'right'; // down (r=3), right (c=3)

    for (let i = 0; i < 4; i++) {
      let line = currentTiles.filter(t => (isVertical ? t.c === i : t.r === i));

      line.sort((a, b) => {
        const valA = isVertical ? a.r : a.c;
        const valB = isVertical ? b.r : b.c;
        return isForward ? valB - valA : valA - valB;
      });

      const newLine: Tile[] = [];
      for (let j = 0; j < line.length; j++) {
        const current = line[j];
        if (j < line.length - 1 && current.value === line[j + 1].value) {
          const next = line[j + 1];
          const newValue = current.value * 2;
          scoreGain += newValue;

          current.value = newValue;

          const destIdx = isForward ? 3 - newLine.length : newLine.length;

          if (isVertical) {
            current.r = destIdx;
            next.r = destIdx;
          } else {
            current.c = destIdx;
            next.c = destIdx;
          }

          newLine.push(current);
          currentTiles = currentTiles.filter(t => t.id !== next.id);
          moved = true;
          j++;
        } else {
          const destIdx = isForward ? 3 - newLine.length : newLine.length;
          const currentDest = isVertical ? current.r : current.c;
          if (currentDest !== destIdx) {
            moved = true;
          }
          if (isVertical) {
            current.r = destIdx;
          } else {
            current.c = destIdx;
          }
          newLine.push(current);
        }
      }
    }

    if (moved || scoreGain > 0) {
      if (scoreGain > 0) {
        audio.playSnakeEat(); // merge sound
      } else {
        audio.playBrickPaddle(); // simple move sound
      }

      const nextTiles = spawnTile(currentTiles, nextTileId);
      setBoard2048(nextTiles);
      setScore2048(prev => {
        const next = prev + scoreGain;
        if (next > highScore2048) {
          setHighScore2048(next);
        }
        return next;
      });

      if (nextTiles.some(t => t.value === 2048) && status2048 !== 'won' && !keepPlaying) {
        setStatus2048('won');
        audio.playLevelUp(); // win sound
      } else if (checkGameOver2048(nextTiles)) {
        setStatus2048('gameover');
        audio.playGameOver(); // gameover sound
        setShowNamePrompt(score2048 + scoreGain > 0);
      }
    }
  };

  // --- Keyboard Inputs ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showNamePrompt) return;

      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'Space'];
      if (keys.includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'Space') {
        if (status2048 === 'playing') {
          setStatus2048('paused');
        } else if (status2048 === 'paused') {
          setStatus2048('playing');
        }
        return;
      }

      if (status2048 === 'playing' || status2048 === 'won') {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') move2048('left');
        if (e.code === 'ArrowRight' || e.code === 'KeyD') move2048('right');
        if (e.code === 'ArrowUp' || e.code === 'KeyW') move2048('up');
        if (e.code === 'ArrowDown' || e.code === 'KeyS') move2048('down');
      }

      if (e.code === 'KeyR') {
        init2048();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [board2048, status2048, keepPlaying, score2048, highScore2048, showNamePrompt]);

  // --- Touch Swipe Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (status2048 === 'playing' || status2048 === 'won') {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (status2048 !== 'playing' && status2048 !== 'won') return;

    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;
    const threshold = TWENTYFORTYEIGHT_CONFIG.SWIPE_THRESHOLD;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > threshold) {
        if (diffX > 0) move2048('right');
        else move2048('left');
      }
    } else {
      if (Math.abs(diffY) > threshold) {
        if (diffY > 0) move2048('down');
        else move2048('up');
      }
    }
  };

  // --- Leaderboard Actions ---
  const handleSaveScore = () => {
    storage.addLeaderboardScore('twentyfortyeight', {
      playerName: name.trim() || 'Anonymous Player',
      score: score2048,
    });
    storage.updateHighScore('twentyfortyeight', score2048);
    setLeaderboard(storage.getLeaderboard('twentyfortyeight'));
    setShowNamePrompt(false);
    setName('');
  };

  const handleSkipSaveScore = () => {
    storage.addLeaderboardScore('twentyfortyeight', {
      playerName: 'Anonymous Player',
      score: score2048,
    });
    storage.updateHighScore('twentyfortyeight', score2048);
    setLeaderboard(storage.getLeaderboard('twentyfortyeight'));
    setShowNamePrompt(false);
    setName('');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl mx-auto px-4 py-8 select-none">
      {/* --- Game Board Column --- */}
      <div className="flex-1 flex flex-col items-center">
        {/* Game Stats Hub */}
        <div className="flex justify-between items-center w-full max-w-[400px] mb-4 bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-zinc-800 p-4 rounded-[4px]">
          <div>
            <div className="text-xs text-zinc-500 dark:text-slate-400 font-semibold mb-0.5 flex items-center gap-1.5 uppercase">
              Score
            </div>
            <div className="text-xl font-bold text-zinc-900 dark:text-white font-mono">{score2048}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500 dark:text-slate-400 font-semibold mb-0.5 flex items-center justify-end gap-1 uppercase">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Best
            </div>
            <div className="text-xl font-bold text-zinc-900 dark:text-white font-mono">{highScore2048}</div>
          </div>
        </div>

        {/* Board Frame Wrapper */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-[min(100vw-32px,400px)] h-[min(100vw-32px,400px)] relative border border-zinc-300 dark:border-zinc-800 rounded-[16px] overflow-hidden bg-zinc-50 dark:bg-[#09090b]"
        >
          {/* Unified Inner Boundary Container */}
          <div className="absolute inset-[10px]">
            {/* Static background grid */}
            <div className="grid grid-cols-4 gap-2 h-full w-full pointer-events-none">
              {Array(16).fill(null).map((_, idx) => (
                <div key={idx} className="bg-zinc-200/50 dark:bg-[#1E293B]/60 rounded-xl" />
              ))}
            </div>

            {/* Absolute positioned sliding tiles container */}
            <div className="absolute inset-0 pointer-events-none">
              {board2048.map((tile) => {
                const style = {
                  position: 'absolute' as const,
                  width: 'calc(25% - 6px)',
                  height: 'calc(25% - 6px)',
                  top: `calc(${tile.r * 25}% + ${tile.r * 2}px)`,
                  left: `calc(${tile.c * 25}% + ${tile.c * 2}px)`,
                  transition: 'all 0.12s cubic-bezier(0.25, 1, 0.5, 1)',
                  zIndex: 10
                };
                return (
                  <div
                    key={tile.id}
                    style={style}
                    className={`flex items-center justify-center font-black text-2xl rounded-xl select-none border ${TWENTYFORTYEIGHT_CONFIG.getTileColors2048(tile.value)}`}
                  >
                    {tile.value}
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- Overlays --- */}
          {status2048 === 'paused' && (
            <div className="absolute inset-0 bg-white/95 dark:bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
              <Pause className="w-12 h-12 text-zinc-800 dark:text-[#e8e8ea] mb-3 animate-pulse" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 uppercase tracking-wider">Game Paused</h3>
              <p className="text-xs text-zinc-500 dark:text-slate-400 mb-6 max-w-[280px]">
                The game is currently paused. Press Space or click Resume to continue.
              </p>

              <button
                onClick={() => setStatus2048('playing')}
                className="flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold px-6 py-2.5 rounded-[4px] border border-zinc-900 dark:border-white hover:bg-transparent hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer w-full max-w-xs pointer-events-auto"
              >
                <Play className="w-3.5 h-3.5 fill-current animate-pulse" /> Resume Game
              </button>
            </div>
          )}

          {status2048 === 'idle' && (
            <div className="absolute inset-0 bg-white/95 dark:bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
              <Target className="w-12 h-12 text-zinc-800 dark:text-[#e8e8ea] mb-3 animate-pulse" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 uppercase tracking-wider">2048 Puzzle</h3>
              <p className="text-xs text-zinc-500 dark:text-slate-400 mb-6 max-w-[280px]">
                Slide tiles and merge matching numbers to reach the legendary 2048 tile.
              </p>

              <button
                onClick={init2048}
                className="flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold px-6 py-2.5 rounded-[4px] border border-zinc-900 dark:border-white hover:bg-transparent hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer w-full max-w-xs pointer-events-auto"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Start Mission
              </button>
            </div>
          )}

          {status2048 === 'won' && (
            <div className="absolute inset-0 bg-white/95 dark:bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
              <Sparkles className="w-12 h-12 text-yellow-500 mb-3 animate-bounce" />
              <h3 className="text-2xl font-black text-yellow-600 dark:text-yellow-400 mb-2 uppercase tracking-wider">Victory!</h3>
              <p className="text-sm text-zinc-650 dark:text-slate-300 mb-6 font-medium">
                You successfully merged the <span className="font-bold text-zinc-900 dark:text-white">2048</span> tile!
              </p>

              <div className="flex flex-col gap-2 w-full max-w-xs pointer-events-auto">
                <button
                  onClick={() => {
                    setKeepPlaying(true);
                    setStatus2048('playing');
                  }}
                  className="flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold px-6 py-2.5 rounded-[4px] border border-zinc-900 dark:border-white hover:bg-transparent hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer"
                >
                  Keep Playing
                </button>
                <button
                  onClick={init2048}
                  className="flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold px-6 py-2.5 rounded-[4px] border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors uppercase tracking-wider text-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restart
                </button>
              </div>
            </div>
          )}

          {status2048 === 'gameover' && (
            <div className="absolute inset-0 bg-white/95 dark:bg-[#121214]/95 flex flex-col items-center justify-center p-6 text-center z-20">
              <h3 className="text-xl font-bold text-red-600 dark:text-red-500 mb-2 uppercase tracking-wider">Game Over</h3>
              <p className="text-zinc-700 dark:text-slate-300 mb-4 font-medium">
                Final Score: <span className="text-zinc-900 dark:text-white font-mono font-bold">{score2048}</span>
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
                  onClick={init2048}
                  className="flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold px-6 py-2.5 rounded-[4px] border border-zinc-900 dark:border-white hover:bg-transparent hover:text-zinc-900 dark:hover:text-white transition-colors tracking-wider text-xs cursor-pointer uppercase pointer-events-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Play Again
                </button>
              )}
            </div>
          )}
        </div>

        {/* Onscreen D-Pad for mobile view */}
        <div className="mt-6 flex gap-4 items-center justify-between w-full max-w-[400px] px-2">
          <div className="flex gap-2">
            <button
              onClick={init2048}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-650 dark:text-slate-355 font-bold text-xs rounded-[4px] border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            >
              Reset Board
            </button>
            {(status2048 === 'playing' || status2048 === 'paused') && (
              <button
                onClick={() => setStatus2048(prev => prev === 'playing' ? 'paused' : 'playing')}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-650 dark:text-slate-355 font-bold text-xs rounded-[4px] border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
              >
                {status2048 === 'playing' ? (
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

          <div className="grid grid-cols-3 gap-1.5 w-28 h-28 shrink-0">
            <div />
            <button
              onClick={() => move2048('up')}
              className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-650 dark:text-slate-300 rounded-lg flex items-center justify-center cursor-pointer border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-all"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div />
            <button
              onClick={() => move2048('left')}
              className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-650 dark:text-slate-300 rounded-lg flex items-center justify-center cursor-pointer border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="bg-zinc-200 dark:bg-[#1E293B] rounded-lg" />
            <button
              onClick={() => move2048('right')}
              className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-650 dark:text-slate-300 rounded-lg flex items-center justify-center cursor-pointer border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div />
            <button
              onClick={() => move2048('down')}
              className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-655 dark:text-slate-300 rounded-lg flex items-center justify-center cursor-pointer border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-all"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            <div />
          </div>
        </div>
      </div>

      {/* --- Leaderboard & Stats Column --- */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        {/* Real-time changeable Settings Panel */}
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

        {/* Rules & Help */}
        <div className="bg-zinc-100 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-zinc-800 rounded-[4px] p-6">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4">
            Instructions
          </h3>
          <ul className="text-xs space-y-3 text-zinc-655 dark:text-slate-400">
            <li className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-2">
              <span>Slide Tiles</span>
              <span className="flex gap-1">
                <kbd className="bg-zinc-200 dark:bg-black/50 border border-zinc-300 dark:border-zinc-800 px-1.5 py-0.5 rounded-[4px] text-zinc-800 dark:text-[#e8e8ea] text-[10px] font-mono font-bold">W/A/S/D</kbd>
                <kbd className="bg-zinc-200 dark:bg-black/50 border border-zinc-300 dark:border-zinc-800 px-1.5 py-0.5 rounded-[4px] text-zinc-800 dark:text-[#e8e8ea] text-[10px] font-mono font-bold">◀▶▲▼</kbd>
              </span>
            </li>
            <li className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-2">
              <span>Mobile Control</span>
              <span className="text-[10px] font-semibold text-zinc-700 dark:text-slate-300 bg-zinc-200 dark:bg-black/50 px-1.5 py-0.5 rounded-[4px] border border-zinc-300 dark:border-zinc-800">Swipe Screen</span>
            </li>
            <li className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-2">
              <span>Restart</span>
              <kbd className="bg-zinc-200 dark:bg-black/50 border border-zinc-300 dark:border-zinc-800 px-1.5 py-0.5 rounded-[4px] text-zinc-800 dark:text-[#e8e8ea] text-[10px] font-mono font-bold">R</kbd>
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
                    <span className="text-xs font-semibold text-zinc-800 dark:text-slate-350 truncate max-w-[120px]">{entry.playerName}</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-white">{entry.score}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwentyFortyEight;
