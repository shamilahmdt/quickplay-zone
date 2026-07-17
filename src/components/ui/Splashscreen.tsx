import type { FC } from 'react';
import Logo from '../../assets/Logo.png';

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
        {/* Logo Icon */}
        <img src={Logo} alt="QuickPlay Zone Logo" className="w-48 h-48 object-contain" />
      </div>
    </div>
  );
};

export default Splashscreen;
