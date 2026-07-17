import type { FC } from 'react';
import { useTheme } from '../../context/ThemeContext';

export const Footer: FC = () => {
  const { dark } = useTheme();

  return (
    <footer className={`border-t px-6 py-6 mt-auto flex flex-col sm:flex-row items-center justify-between text-[11px] font-semibold tracking-wider transition-colors duration-300 ${
      dark ? 'bg-[#0a0a0a] border-slate-900 text-slate-500' : 'bg-white border-slate-200 text-slate-500'
    }`}>
      <div>
        &copy; {new Date().getFullYear()} QUICKPLAY<span className="tracking-[0.15em] font-extrabold text-silver-gradient ml-1">ZONE</span>. ALL RIGHTS RESERVED.
      </div>
      <div className="flex gap-4 mt-2 sm:mt-0">
        <a href="#rules" className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-black'}`}>ARCADE REGULATIONS</a>
        <span>|</span>
        <a href="#contrib" className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-black'}`}>DEVELOPERS</a>
      </div>
    </footer>
  );
};

export default Footer;
