import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGameById } from '../core/gameRegistry';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Info, Gamepad2, AlertTriangle } from 'lucide-react';

export const GamePage: FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const game = gameId ? getGameById(gameId) : undefined;
  const { dark } = useTheme();

  const [isPlaying, setIsPlaying] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const scrollAttemptsRef = useRef(0);
  const toastCountRef = useRef(0);
  const lastToastTimeRef = useRef(0);

  // Monitor game status events
  useEffect(() => {
    const handleStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ isPlaying: boolean }>;
      setIsPlaying(customEvent.detail.isPlaying);
    };
    window.addEventListener('qplay-status', handleStatus);
    return () => {
      window.removeEventListener('qplay-status', handleStatus);
    };
  }, []);

  // Block scroll events during active gameplay
  useEffect(() => {
    if (!isPlaying) {
      scrollAttemptsRef.current = 0;
      toastCountRef.current = 0;
      return;
    }

    const handleScrollAttempt = () => {
      const now = Date.now();
      // Throttle warning logic checks
      if (now - lastToastTimeRef.current > 1000) {
        scrollAttemptsRef.current += 1;
        lastToastTimeRef.current = now;

        if (scrollAttemptsRef.current > 3) {
          if (toastCountRef.current < 3) {
            setShowToast(true);
            toastCountRef.current += 1;
          }
        }
      }
    };

    const preventScroll = (e: Event) => {
      e.preventDefault();
      handleScrollAttempt();
    };

    const preventKeyScroll = (e: KeyboardEvent) => {
      const scrollKeys = ['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'End', 'Home'];
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (scrollKeys.includes(e.code) && !isInput) {
        e.preventDefault();
        handleScrollAttempt();
      }
    };

    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('touchmove', preventScroll, { passive: false });
    window.addEventListener('keydown', preventKeyScroll, { passive: false });

    return () => {
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('touchmove', preventScroll);
      window.removeEventListener('keydown', preventKeyScroll);
    };
  }, [isPlaying]);

  // Auto-hide warning toast
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  if (!game) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-8 gap-4 ${dark ? 'text-[#e8e8ea]' : 'text-black'
        }`}>
        <h2 className="text-xl font-bold text-red-500 uppercase tracking-widest">Game not found</h2>
        <p className="text-sm text-slate-500">The requested mission ID does not exist in the database.</p>
        <Link
          to="/dashboard"
          className="flex items-center gap-2 bg-white text-[#0a0a0a] border border-slate-350 font-bold px-4 py-2 rounded-[4px] hover:bg-slate-200 transition-colors uppercase tracking-widest text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Lobby
        </Link>
      </div>
    );
  }

  const GameComponent = game.component;

  return (
    <div className={`flex-1 flex flex-col gap-6 p-6 md:p-8 transition-colors duration-300 relative ${dark ? 'bg-[#121214] text-[#e8e8ea]' : 'bg-[#f8fafc] text-slate-900'
      }`}>
      {/* Toast warning for scroll attempt */}
      {showToast && (
        <div className="fixed top-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-[4px] shadow-xl border text-xs font-semibold select-none ${
            dark 
              ? 'bg-[#1a1a1c]/95 border-amber-500/40 text-amber-400 backdrop-blur-md' 
              : 'bg-white/95 border-amber-400/50 text-amber-700 backdrop-blur-md shadow-amber-950/5'
          }`}>
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Gameplay active! Pause the game to scroll.</span>
            <button 
              onClick={() => setShowToast(false)} 
              className="ml-1.5 hover:opacity-70 text-slate-400 font-bold text-sm cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {/* Game Header Area */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${dark ? 'border-slate-800' : 'border-slate-200'
        }`}>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className={`p-2 border rounded-[4px] transition-all cursor-pointer ${dark
                ? 'bg-[#1a1a1c] border-slate-800 text-slate-400 hover:text-white hover:border-white'
                : 'bg-white border-slate-200 text-slate-650 hover:text-black hover:border-black'
              }`}
            title="Back to Lobby"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold tracking-widest border px-1.5 py-0.5 rounded-[4px] uppercase ${dark ? 'text-[#64748b] bg-black/40 border-slate-800' : 'text-slate-550 bg-slate-100 border-slate-200'
                }`}>
                {game.category}
              </span>
              <span className="text-sm">{game.thumbnail}</span>
            </div>
            <h2 className={`text-xl font-bold tracking-wide uppercase mt-1 ${dark ? 'text-silver-gradient' : 'text-slate-950'
              }`}>
              {game.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-550 font-semibold">
          <Gamepad2 className="w-4 h-4 text-slate-500" />
          <span>Launch state: Ready to play</span>
        </div>
      </div>

      {/* Dynamic Game Wrapper */}
      <div className="relative w-full flex justify-center z-10">
        <GameComponent />
      </div>

      {/* Game Details Card */}
      <div className={`border rounded-[4px] p-5 flex flex-col sm:flex-row justify-between gap-6 transition-colors ${dark ? 'bg-[#1a1a1c] border-slate-805' : 'bg-white border-slate-200'
        }`}>
        <div className="flex-1">
          <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5 ${dark ? 'text-white' : 'text-slate-700'
            }`}>
            <Info className="w-4 h-4 text-slate-400" /> MISSION OBJECTIVE
          </h4>
          <p className={`text-xs leading-relaxed font-medium ${dark ? 'text-slate-400' : 'text-slate-655'
            }`}>
            {game.description}
          </p>
        </div>
        <div className={`sm:w-64 border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-6 shrink-0 ${dark ? 'border-slate-800' : 'border-slate-200'
          }`}>
          <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 ${dark ? 'text-white' : 'text-slate-700'
            }`}>QUICK COMMANDS</h4>
          <ul className="text-[11px] space-y-1.5 text-slate-550 font-semibold">
            {game.controls.map((ctrl, i) => (
              <li key={i} className="list-disc list-inside">
                {ctrl}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GamePage;
