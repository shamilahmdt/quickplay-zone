import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Gamepad2, Github, Info } from 'lucide-react';
import { gameRegistry } from '../core/gameRegistry';

export const Home: FC = () => {
  const { dark, toggleTheme } = useTheme();

  return (
    <div
      className={`min-h-screen w-full overflow-hidden flex flex-col justify-between transition-colors duration-300 ${
        dark ? 'bg-[#121214] text-[#e8e8ea]' : 'bg-[#FDFDFD] text-black'
      }`}
    >
      {/* Document Metadata */}
      <title>QuickPlay Zone</title>

      {/* Decorative Blur Elements - softened */}
      <div className={`fixed top-[-15%] right-[-15%] w-[50vw] h-[50vw] rounded-full blur-[140px] opacity-25 -z-10 transition-colors duration-300 ${
        dark ? 'bg-zinc-800' : 'bg-slate-200'
      }`} />
      <div className={`fixed bottom-[-15%] left-[-15%] w-[50vw] h-[50vw] rounded-full blur-[140px] opacity-25 -z-10 transition-colors duration-300 ${
        dark ? 'bg-zinc-900' : 'bg-slate-100'
      }`} />

      {/* Main Grid */}
      <main className="flex-1 flex items-center justify-center px-6 md:px-14 py-4 md:py-8 z-10">
        <div className="w-full max-w-md lg:max-w-none lg:w-[85%] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
            
            {/* LEFT COLUMN - Arcade Intro */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="space-y-6">
                <div className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Lobby terminal
                </div>

                <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[0.95] uppercase tracking-tight">
                  QUICKPLAY <br />
                  <span className="text-silver-gradient">ZONE</span>
                </h1>

                <p className={`max-w-md mx-auto lg:mx-0 text-sm sm:text-base leading-relaxed font-medium transition-colors duration-300 ${
                  dark ? 'text-zinc-400' : 'text-slate-600'
                }`}>
                  Play retro arcade classics directly in your browser. All high scores and session statistics are preserved <strong className={dark ? 'text-white' : 'text-black'}>offline ready using local storage</strong>. Zero downloads or user accounts required.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 justify-center lg:justify-start">
                <Link to="/dashboard" className="w-full sm:w-auto">
                  <button className={`w-full sm:w-auto px-8 py-3 rounded-[4px] border font-bold uppercase tracking-wider text-xs transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                    dark
                      ? 'bg-white text-black border-white hover:bg-transparent hover:text-white'
                      : 'bg-black text-white border-black hover:bg-transparent hover:text-black'
                  }`}>
                    GET STARTED
                  </button>
                </Link>
                <Link to="/about" className="w-full sm:w-auto">
                  <button className={`w-full sm:w-auto px-8 py-3 rounded-[4px] border font-bold uppercase tracking-wider text-xs transition-all duration-200 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 ${
                    dark
                      ? 'bg-[#1a1a1c] border-slate-800 text-zinc-100 hover:border-slate-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                  }`}>
                    <Info className="w-3.5 h-3.5" />
                    ABOUT
                  </button>
                </Link>

                {/* Github and Theme Toggles */}
                <div className="flex items-center gap-3">
                  <a
                    href="https://github.com/shamilahmdt/quickplay-zone"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 rounded-[4px] border transition-colors cursor-pointer flex items-center justify-center relative group ${
                      dark ? 'bg-[#1a1a1c] border-slate-800 text-slate-300 hover:border-white' : 'bg-white border-slate-200 text-slate-655 hover:border-black'
                    }`}
                    aria-label="GitHub Repository"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-[#1a1a1c] border border-slate-800 text-[10px] font-bold text-zinc-300 px-2 py-1 rounded shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                      View on GitHub
                    </span>
                  </a>
                  <button
                    onClick={toggleTheme}
                    className={`p-3 rounded-[4px] border transition-colors cursor-pointer flex items-center justify-center relative group ${
                      dark ? 'bg-[#1a1a1c] border-slate-800 text-slate-300 hover:border-white' : 'bg-white border-slate-200 text-slate-655 hover:border-black'
                    }`}
                    aria-label="Toggle Theme"
                  >
                    {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-[#1a1a1c] border border-slate-800 text-[10px] font-bold text-zinc-300 px-2 py-1 rounded shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                      Toggle Theme
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Flat Arcade Graphic panel */}
            <div className="hidden lg:block relative w-full">
              <div className={`relative rounded-[4px] border p-6 transition-colors duration-300 ${
                dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                {/* Simulated Frame Top */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800/10 mb-6">
                  <div className="flex items-center gap-1.5 font-sans text-[10px] font-bold tracking-wider text-slate-500">
                    System monitor
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <div className="w-2.5 h-[2px] bg-slate-500" />
                    <div className="w-6 h-[2px] bg-slate-400" />
                  </div>
                </div>

                {/* Display Grid Area */}
                <div className="space-y-6">
                  
                  {/* Gamepad silhouette card */}
                  <div className={`border rounded-[4px] p-6 flex flex-col items-center justify-center relative overflow-hidden bg-black/10 min-h-[160px] ${
                    dark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
                      <div className="absolute top-10 left-0 right-0 h-[1px] bg-slate-500 animate-speed-streak-1" />
                      <div className="absolute top-24 left-0 right-0 h-[1px] bg-slate-500 animate-speed-streak-2" />
                      <div className="absolute bottom-12 left-0 right-0 h-[1px] bg-slate-500 animate-speed-streak-slow" />
                    </div>

                    <div className="relative z-10 flex flex-col items-center text-center gap-4">
                      <div className={`p-4 border rounded-[4px] ${dark ? 'border-slate-800 bg-black' : 'border-slate-200 bg-slate-50'}`}>
                        <Gamepad2 className={`w-12 h-12 ${dark ? 'text-[#e8e8ea]' : 'text-slate-900'}`} />
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider">QuickPlay Terminal</div>
                        <div className="text-[11px] text-slate-500 mt-1">Playing now: Snake Classic</div>
                      </div>
                    </div>
                  </div>

                  {/* Diagnostic stats list */}
                  <div className="space-y-3">
                    <div className={`flex justify-between items-center text-xs pb-2 border-b ${dark ? 'border-slate-800' : 'border-slate-100'}`}>
                      <span className="text-slate-500">Cabinet engine</span>
                      <span className="font-semibold">Stable v8.1.5</span>
                    </div>
                    <div className={`flex justify-between items-center text-xs pb-2 border-b ${dark ? 'border-slate-800' : 'border-slate-100'}`}>
                      <span className="text-slate-500">Local cache state</span>
                      <span className="font-semibold">Offline ready</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">System rendering</span>
                      <span className="font-semibold">Hardware accelerated</span>
                    </div>
                  </div>

                </div>

                {/* Cabinet Footer */}
                <div className={`mt-6 pt-5 border-t flex items-center justify-between text-[10px] text-slate-500 ${
                  dark ? 'border-slate-850/20' : 'border-slate-150'
                }`}>
                  <span>System monitor terminal</span>
                  <span>Grid active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* SEO list */}
      <section className="sr-only" aria-label="QuickPlay Games List Directory">
        <h2>Games Lobby</h2>
        {gameRegistry.map((item, index) => (
          <Link key={index} to={`/game/${item.id}`}>
            {item.name}
          </Link>
        ))}
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-14 py-6 text-center lg:text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest z-10">
        &copy; {new Date().getFullYear()} QUICKPLAY ZONE. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
};

export default Home;
