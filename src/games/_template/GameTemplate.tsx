import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { storage } from '../../core/storage';
import { Award, Gamepad2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const GameTemplate: FC = () => {
  const { dark } = useTheme();
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Register stats on load
    const stats = storage.getGameStats('template');
    setHighScore(stats.highScore);
    storage.incrementPlayCount('template');
  }, []);

  const handleGameOver = (finalScore: number) => {
    setIsPlaying(false);
    storage.addLeaderboardScore('template', {
      playerName: 'Contributor Test',
      score: finalScore,
    });
    // refresh stats
    setHighScore(storage.getGameStats('template').highScore);
  };

  return (
    <div className={`flex flex-col items-center justify-center max-w-md mx-auto p-6 border rounded-[4px] shadow-sm ${
      dark ? 'bg-[#0d0d0f] border-slate-800' : 'bg-white border-slate-200'
    }`}>
      <h2 className="text-lg font-bold tracking-wide uppercase mb-2">Game Template</h2>
      <p className="text-xs text-slate-500 mb-6 text-center">Use this as a foundation for adding new arcade games.</p>

      {/* Mini Stats Banner */}
      <div className="flex justify-between w-full mb-6 text-xs font-semibold border-b border-slate-800/10 pb-4">
        <span className="text-slate-500">Score: {score}</span>
        <span className="flex items-center gap-1">
          <Award className="w-4 h-4 text-slate-500" /> Best score: {highScore}
        </span>
      </div>

      {isPlaying ? (
        <div className={`flex flex-col items-center justify-center p-8 border border-dashed rounded-[4px] w-full ${
          dark ? 'bg-black/20 border-slate-800' : 'bg-slate-50 border-slate-250'
        }`}>
          <p className="text-xs text-slate-400 mb-4">Game is active</p>
          <div className="flex gap-4">
            <button
              onClick={() => setScore((s) => s + 10)}
              className="bg-white text-black font-bold px-4 py-2 rounded-[4px] border border-white hover:bg-transparent hover:text-white transition-colors text-xs cursor-pointer"
            >
              Add 10 Pts
            </button>
            <button
              onClick={() => handleGameOver(score)}
              className="bg-red-950 text-red-200 border border-red-800 px-4 py-2 rounded-[4px] hover:bg-red-900 transition-colors text-xs cursor-pointer"
            >
              End Game
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setScore(0);
            setIsPlaying(true);
          }}
          className="flex items-center gap-2 bg-white text-[#0a0a0a] font-bold px-6 py-2.5 rounded-[4px] border border-white hover:bg-transparent hover:text-white transition-colors uppercase tracking-wider text-xs cursor-pointer"
        >
          <Gamepad2 className="w-4 h-4" /> Start Sandbox
        </button>
      )}
    </div>
  );
};

export default GameTemplate;
