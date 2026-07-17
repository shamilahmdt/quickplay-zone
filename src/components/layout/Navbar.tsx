import type { FC } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { useTheme } from '../../context/ThemeContext';
import { Gamepad2, Info, Menu, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: FC<NavbarProps> = ({ onToggleSidebar }) => {
  const isOffline = useOfflineStatus();
  const { dark, toggleTheme } = useTheme();

  return (
    <header className={`sticky top-0 z-50 border-b px-4 md:px-6 py-3 flex items-center justify-between transition-colors duration-300 ${
      dark ? 'bg-[#121214]/90 border-slate-800 text-white' : 'bg-white/90 border-slate-200 text-black'
    }`}>
      {/* Brand & Menu */}
      <div className="flex items-center gap-3">
        {/* Toggle Sidebar Button - 44x44px tap target */}
        <button
          onClick={onToggleSidebar}
          className={`w-11 h-11 rounded-[4px] border transition-colors cursor-pointer flex items-center justify-center ${
            dark ? 'bg-[#1a1a1c] border-slate-800 hover:border-white text-slate-300' : 'bg-slate-50 border-slate-200 hover:border-slate-400 text-slate-600'
          }`}
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        <Link to="/" className="flex items-center gap-2 group">
          <Gamepad2 className="w-5 h-5 text-slate-450" />
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-tight uppercase leading-none">QUICKPLAY</span>
            <span className={`text-[9px] font-bold tracking-[0.2em] uppercase leading-none mt-0.5 ${dark ? 'text-slate-500' : 'text-slate-405'}`}>ZONE</span>
          </div>
        </Link>
      </div>

      {/* Navigation - Hidden on mobile, visible from sm: (640px) up */}
      <nav className="hidden sm:flex items-center gap-5">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `text-[11px] font-bold tracking-wider uppercase transition-colors hover:text-opacity-80 ${
              isActive ? (dark ? 'text-white border-b-2 border-slate-350 pb-1' : 'text-slate-950 border-b-2 border-slate-900 pb-1') : (dark ? 'text-slate-400' : 'text-slate-600')
            }`
          }
        >
          Lobby
        </NavLink>
        <NavLink
          to="/about"
          className={({ isActive }) =>
            `text-[11px] font-bold tracking-wider uppercase transition-colors hover:text-opacity-80 flex items-center gap-1 ${
              isActive ? (dark ? 'text-white border-b-2 border-slate-350 pb-1' : 'text-slate-950 border-b-2 border-slate-900 pb-1') : (dark ? 'text-slate-400' : 'text-slate-600')
            }`
          }
        >
          <Info className="w-3 h-3" /> About
        </NavLink>
      </nav>

      {/* Toggles & Indicators */}
      <div className="flex items-center gap-4">
        {/* Connection State - Hidden on mobile, visible from sm: (640px) up */}
        <span className="hidden sm:inline-block text-xs text-slate-500 font-medium">
          {isOffline ? 'Offline mode' : 'Online'}
        </span>

        {/* Theme Toggle - 44x44px tap target */}
        <button
          onClick={toggleTheme}
          className={`w-11 h-11 rounded-[4px] border transition-colors cursor-pointer flex items-center justify-center ${
            dark ? 'bg-[#1a1a1c] border-slate-800 hover:border-white text-yellow-450' : 'bg-slate-50 border-slate-200 hover:border-slate-400 text-slate-600'
          }`}
          aria-label="Toggle Theme"
        >
          {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};

export default Navbar;
