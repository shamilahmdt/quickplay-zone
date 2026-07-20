import type { FC } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Cpu, Save, Users, Zap, Github, ExternalLink, Terminal } from 'lucide-react';

export const About: FC = () => {
  const { dark } = useTheme();

  return (
    <div className={`flex-1 flex flex-col gap-8 p-6 md:p-8 max-w-4xl mx-auto transition-colors duration-300 ${
      dark ? 'text-slate-200' : 'text-slate-900'
    }`}>
      {/* Platform Title */}
      <section className={`text-center flex flex-col gap-2 py-6 border-b ${
        dark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <h1 className={`text-3xl font-black tracking-tight uppercase ${dark ? 'text-white' : 'text-slate-955'}`}>
          ABOUT QUICKPLAY<span className={`tracking-[0.2em] font-extrabold ml-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>ZONE</span>
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          QuickPlayZone is a minimal browser arcade cockpit built to run retro games instantly. No logins, no bloated downloads, completely offline-first.
        </p>
      </section>

      {/* Grid of Key Features */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`border p-6 rounded-[4px] flex gap-4 transition-colors ${
          dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <Zap className="w-8 h-8 text-slate-450 shrink-0" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide mb-2">Speed-first engine</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No bloating frameworks. Pure mechanics running on React and canvas interfaces for stable, high FPS gameplay.
            </p>
          </div>
        </div>

        <div className={`border p-6 rounded-[4px] flex gap-4 transition-colors ${
          dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <Save className="w-8 h-8 text-slate-450 shrink-0" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide mb-2">Local persistence</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Leaderboards, session statistics, and game saves are written directly to your browser's local sandbox storage.
            </p>
          </div>
        </div>

        <div className={`border p-6 rounded-[4px] flex gap-4 transition-colors ${
          dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <Cpu className="w-8 h-8 text-slate-450 shrink-0" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide mb-2">Offline independence</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              PWA asset caching lets you play games on a plane, subway, or anywhere when connection drops.
            </p>
          </div>
        </div>

        <div className={`border p-6 rounded-[4px] flex gap-4 transition-colors ${
          dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <Users className="w-8 h-8 text-slate-450 shrink-0" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide mb-2">Open grid dev</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Designed for contributors. Drop your game into a folder under `src/games/` and add it to `gameRegistry.ts`.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Project / Collaboration */}
      <section
        className={`border p-6 rounded-[4px] transition-colors ${
          dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <h3 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-500" />
          <span>DevTasks Workspace</span>
        </h3>
        <p className={`text-xs leading-relaxed mb-4 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
          DevTasks is a unified offline-first developer cockpit and workspace designed to organize task roadmaps, vault secure snippets, bookmark curated resource links, and run local client-side dev utilities.
        </p>
        <div className="flex gap-4">
          <a
            href="https://dev-tasks-beta.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-400 transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Launch Dev Workspace</span>
          </a>
          <a
            href="https://github.com/shamilahmdt/devtasks"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs font-bold uppercase tracking-wider ${
              dark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
            } transition-colors flex items-center gap-1.5`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Repository</span>
          </a>
        </div>
      </section>

      {/* Developer Contribution Guide */}
      <section className={`border p-6 rounded-[4px] transition-colors ${
        dark ? 'bg-[#1a1a1c] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <h3 className="text-sm font-bold uppercase tracking-wide mb-4">Contributor guidelines</h3>
        <p className={`text-xs leading-relaxed mb-4 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
          Want to integrate a game? Follow these fast steps:
        </p>
        <ol className="list-decimal list-inside text-xs text-slate-500 space-y-2 leading-relaxed">
          <li>Duplicate the <code className={dark ? 'text-slate-355' : 'text-slate-800'}>src/games/_template/</code> directory.</li>
          <li>Write your core gameplay component in the new directory.</li>
          <li>Connect stats via the <code className={dark ? 'text-slate-355' : 'text-slate-800'}>storage</code> utilities.</li>
          <li>Export your component and register it inside <code className={dark ? 'text-slate-355' : 'text-slate-800'}>src/core/gameRegistry.ts</code>.</li>
        </ol>
      </section>
    </div>
  );
};

export default About;
