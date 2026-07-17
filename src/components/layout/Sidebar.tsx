import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { gameRegistry } from '../../core/gameRegistry';
import { storage } from '../../core/storage';
import { Flame, Trophy, Play, X, Gamepad2, Info } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { dark } = useTheme();
  const isOffline = useOfflineStatus();
  const [totalPlays, setTotalPlays] = useState(0);

  useEffect(() => {
    let count = 0;
    gameRegistry.forEach((game) => {
      count += storage.getGameStats(game.id).playCount;
    });
    setTotalPlays(count);
  }, [isOpen]);

  return (
    <>
      {/* Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-200 lg:hidden"
        />
      )}

      {/* Sidebar container sliding panel */}
      <aside
        className={`fixed lg:sticky top-[71px] bottom-0 left-0 z-40 w-64 border-r p-6 flex flex-col gap-6 shrink-0 transition-transform duration-200 ease-in-out h-[calc(100vh-71px)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
        } ${
          dark ? 'bg-[#1a1a1c] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-black'
        }`}
      >
        {/* Sidebar Close Button */}
        <div className="flex justify-between items-center lg:hidden border-b pb-3 border-slate-800/10">
          <span className="text-xs font-bold uppercase tracking-wider">Navigation</span>
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] hover:bg-slate-700/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Navigation List - Visible only on mobile/tablet (below sm: 640px) */}
        <div className="flex flex-col gap-2 sm:hidden border-b pb-4 border-slate-800/10">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">MAIN MENU</h4>
          <NavLink
            to="/dashboard"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-[4px] border text-xs font-bold uppercase tracking-wider transition-all ${
                isActive
                  ? (dark ? 'bg-white border-white text-black' : 'bg-black border-black text-white')
                  : (dark ? 'bg-black/10 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-55 border-slate-200 text-slate-750 hover:text-black')
              }`
            }
          >
            <Gamepad2 className="w-3.5 h-3.5" /> Lobby
          </NavLink>
          <NavLink
            to="/about"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-[4px] border text-xs font-bold uppercase tracking-wider transition-all ${
                isActive
                  ? (dark ? 'bg-white border-white text-black' : 'bg-black border-black text-white')
                  : (dark ? 'bg-black/10 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-55 border-slate-200 text-slate-750 hover:text-black')
              }`
            }
          >
            <Info className="w-3.5 h-3.5" /> About
          </NavLink>
        </div>

        {/* Mobile Connection Status - Visible only on mobile/tablet (below sm: 640px) */}
        <div className="flex items-center justify-between sm:hidden border-b pb-4 border-slate-800/10">
          <span className="text-xs font-semibold text-slate-500">Status</span>
          <span className="text-xs font-bold text-slate-400">
            {isOffline ? 'Offline ready' : 'Online'}
          </span>
        </div>

        {/* Session Stats */}
        <div className={`border rounded-[4px] p-4 flex items-center justify-between shadow-sm transition-colors ${
          dark ? 'bg-black/20 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-500">Total plays</span>
          </div>
          <span className="text-sm font-bold">{totalPlays}</span>
        </div>

        {/* Quick Play Menu */}
        <div className="flex flex-col gap-3">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-550 mb-1">QUICK START</h4>
          <div className="flex flex-col gap-1.5">
            {gameRegistry.map((game) => {
              const stats = storage.getGameStats(game.id);
              return (
                <NavLink
                  key={game.id}
                  to={`/game/${game.id}`}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-[4px] border transition-all group ${
                      isActive
                        ? (dark ? 'bg-white border-white text-black font-bold' : 'bg-black border-black text-white font-bold')
                        : (dark ? 'bg-black/10 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600' : 'bg-slate-50 border-slate-200 text-slate-650 hover:text-black hover:border-slate-355')
                    }`
                  }
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm leading-none group-hover:scale-110 transition-transform">{game.thumbnail}</span>
                    <span className="text-xs uppercase tracking-wider font-semibold truncate">
                      {game.name.replace(' Classic', '').replace(' Sandbox', '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {stats.highScore > 0 && (
                      <Trophy className="w-3 h-3 opacity-60" />
                    )}
                    <Play className="w-2.5 h-2.5 scale-0 group-hover:scale-100 transition-transform" />
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Dynamic Feed decoration */}
        <div className={`mt-auto border rounded-[4px] p-3 overflow-hidden relative ${
          dark ? 'bg-black/20 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            <Gamepad2 className="w-3 h-3" />
            Arcade System
          </div>
          <div className="text-[9px] text-slate-550 leading-relaxed">
            Preserving scores locally. Offline ready via caching.
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
