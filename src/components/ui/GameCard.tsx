import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import type { GameMeta } from '../../core/types';
import { storage } from '../../core/storage';
import { useTheme } from '../../context/ThemeContext';
import { Trophy, Play, Gamepad2 } from 'lucide-react';

interface GameCardProps {
  game: GameMeta;
}

export const GameCard: FC<GameCardProps> = ({ game }) => {
  const { dark } = useTheme();
  const [stats, setStats] = useState({ highScore: 0, playCount: 0 });

  useEffect(() => {
    setStats(storage.getGameStats(game.id));
  }, [game.id]);

  return (
    <>
      {/* Mobile Compact Card */}
      <Link
        to={`/game/${game.id}`}
        className={`md:hidden group flex flex-col items-center justify-center p-3 rounded-[4px] border transition-all duration-200 text-center gap-2 aspect-square ${
          dark
            ? 'bg-[#1a1a1c] border-slate-800 active:border-slate-500'
            : 'bg-white border-slate-200 active:border-slate-400'
        }`}
      >
        <span className="text-3xl group-active:scale-110 transition-transform duration-200">
          {game.thumbnail}
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-wider line-clamp-2 leading-tight ${
          dark ? 'text-[#e8e8ea]' : 'text-slate-900'
        }`}>
          {game.name}
        </span>
      </Link>

      {/* Desktop Full Card */}
      <div className={`hidden md:flex group relative rounded-[4px] overflow-hidden flex-col justify-between transition-all duration-200 border ${
        dark
          ? 'bg-[#1a1a1c] border-slate-800 hover:border-slate-500'
          : 'bg-white border-slate-200 hover:border-slate-400'
      }`}>
        <div className="p-6 flex flex-col gap-4">
          {/* Top Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {game.category}
              </span>
            </div>
            <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
              {game.thumbnail}
            </span>
          </div>

          {/* Info */}
          <div>
            <h3 className={`text-base font-bold uppercase tracking-wide transition-colors ${
              dark ? 'text-[#e8e8ea]' : 'text-slate-900'
            }`}>
              {game.name}
            </h3>
            <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
              {game.description}
            </p>
          </div>

          {/* Stats */}
          <div className={`flex items-center gap-4 text-xs font-medium mt-2 border-t pt-4 ${
            dark ? 'text-slate-400 border-slate-800' : 'text-slate-650 border-slate-100'
          }`}>
            <div className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-slate-500" />
              <span>Best score: <span className="font-bold">{stats.highScore}</span></span>
            </div>
            <div className="flex items-center gap-1">
              <Play className="w-3 h-3 text-slate-500" />
              <span>Played: <span className="font-bold">{stats.playCount} times</span></span>
            </div>
          </div>
        </div>

        {/* Button Row */}
        <div className="px-6 pb-6 pt-2">
          <Link
            to={`/game/${game.id}`}
            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider border transition-all duration-200 ${
              dark
                ? 'bg-[#121214] text-[#e8e8ea] border-slate-800 hover:bg-white hover:text-black hover:border-white'
                : 'bg-slate-55 text-slate-900 border-slate-200 hover:bg-black hover:text-white hover:border-black'
            }`}
          >
            <Play className="w-3 h-3 fill-current" /> Start Game
          </Link>
        </div>
      </div>
    </>
  );
};

export default GameCard;
