import type { FC } from 'react';
import { Gamepad2 } from 'lucide-react';

export const Splashscreen: FC = () => {
  return (
    <div className="fixed inset-0 z-50 bg-[#121214] flex flex-col items-center justify-center text-white select-none">
      {/* Decorative Speed lines background */}
      <div className="absolute inset-0 pointer-events-none opacity-10 overflow-hidden">
        <div className="absolute top-1/4 left-0 right-0 h-[1px] bg-slate-400 animate-speed-streak-1" />
        <div className="absolute top-2/4 left-0 right-0 h-[1px] bg-slate-400 animate-speed-streak-2" />
        <div className="absolute bottom-1/4 left-0 right-0 h-[1px] bg-slate-400 animate-speed-streak-slow" />
      </div>

      {/* Main scale-up container */}
      <div className="flex flex-col items-center gap-6 relative z-10 animate-scale-up">
        {/* Gamepad Icon */}
        <div className="p-5 border border-slate-800 bg-[#1a1a1c] rounded-[4px] shadow-[0_0_20px_rgba(255,255,255,0.06)]">
          <Gamepad2 className="w-16 h-16 text-white" />
        </div>

        {/* Wordmark */}
        <div className="flex flex-col items-center text-center">
          <span className="text-2xl font-black tracking-wider uppercase leading-none">QUICKPLAY</span>
          <span className="text-[12px] font-bold tracking-[0.3em] uppercase leading-none mt-1 text-slate-500">ZONE</span>
        </div>
      </div>
    </div>
  );
};

export default Splashscreen;
