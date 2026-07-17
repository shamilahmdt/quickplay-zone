import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { gameRegistry } from '../core/gameRegistry';
import GameCard from '../components/ui/GameCard';

export const Dashboard: FC = () => {
  const { dark } = useTheme();

  return (
    <div className={`flex-1 flex flex-col gap-8 p-6 md:p-8 transition-colors duration-300 ${
      dark ? 'bg-[#121214] text-[#e8e8ea]' : 'bg-[#f8fafc] text-slate-900'
    }`}>
      {/* Game Catalog Section */}
      <section className="flex flex-col gap-6">
        <div className={`flex flex-col gap-1.5 border-b pb-4 ${dark ? 'border-slate-800' : 'border-slate-200'}`}>
          <Link
            to="/"
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase mb-2 w-fit transition-colors ${
              dark ? 'text-slate-400 hover:text-white' : 'text-slate-550 hover:text-slate-950'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <span className={`text-[10px] font-bold tracking-wider uppercase ${dark ? 'text-slate-500' : 'text-slate-450'}`}>
            Arcade Grid
          </span>
          <h1 className={`text-2xl font-black uppercase tracking-tight ${dark ? 'text-white' : 'text-slate-955'}`}>
            Available Games
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {gameRegistry.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
