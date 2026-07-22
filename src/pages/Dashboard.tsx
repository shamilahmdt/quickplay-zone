import { useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { gameRegistry } from '../core/gameRegistry';
import GameCard from '../components/ui/GameCard';

export const Dashboard: FC = () => {
  const { dark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const matches = gameRegistry.filter((game) =>
    game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasNoMatches = searchQuery.trim() !== '' && matches.length === 0;
  const gamesToDisplay = hasNoMatches ? gameRegistry : matches;

  return (
    <div className={`flex-1 flex flex-col gap-8 p-6 md:p-8 transition-colors duration-300 ${
      dark ? 'bg-[#121214] text-[#e8e8ea]' : 'bg-[#f8fafc] text-slate-900'
    }`}>
      {/* Game Catalog Section */}
      <section className="flex flex-col gap-6">
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${dark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className={`p-2 border rounded-[4px] transition-all cursor-pointer ${dark
                  ? 'bg-[#1a1a1c] border-slate-800 text-slate-400 hover:text-white hover:border-white'
                  : 'bg-white border-slate-200 text-slate-655 hover:text-black hover:border-black'
                }`}
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <span className={`text-[10px] font-bold tracking-wider uppercase ${dark ? 'text-slate-500' : 'text-slate-450'}`}>
                Arcade Grid
              </span>
              <h1 className={`text-2xl font-black uppercase tracking-tight ${dark ? 'text-white' : 'text-slate-955'}`}>
                Available Games
              </h1>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${dark ? 'text-slate-600' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search arcade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-8 py-1.5 border rounded-[4px] text-xs font-medium focus:outline-none transition-colors ${
                dark
                  ? 'bg-[#1a1a1c] border-slate-800 text-[#e8e8ea] focus:border-white placeholder-slate-600'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-black placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                  dark ? 'text-slate-450 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {hasNoMatches && (
          <div className={`p-3 rounded-[4px] border text-xs font-semibold transition-colors ${
            dark 
              ? 'bg-amber-950/20 border-amber-900/40 text-amber-400' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            No games found matching "{searchQuery}". Showing all available games instead.
          </div>
        )}

        <div className="grid grid-cols-3 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
          {gamesToDisplay.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
