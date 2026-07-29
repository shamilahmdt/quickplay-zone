export const TWENTYFORTYEIGHT_CONFIG = {
  SWIPE_THRESHOLD: 40,
  getTileColors2048: (val: number) => {
    switch (val) {
      case 2:
        return 'bg-[#EEE4DA] text-slate-800 dark:bg-[#334155] dark:text-white border-zinc-300 dark:border-slate-700';
      case 4:
        return 'bg-[#EDE0C8] text-slate-800 dark:bg-[#475569] dark:text-white border-zinc-300 dark:border-slate-600';
      case 8:
        return 'bg-[#F2B179] text-white dark:bg-amber-600 border-orange-300 dark:border-amber-500 shadow-[0_0_8px_rgba(242,177,121,0.4)]';
      case 16:
        return 'bg-[#F59563] text-white dark:bg-orange-600 border-orange-400 dark:border-orange-500 shadow-[0_0_10px_rgba(245,149,99,0.5)]';
      case 32:
        return 'bg-[#F67C5F] text-white dark:bg-rose-500 border-rose-400 dark:border-rose-455';
      case 64:
        return 'bg-[#F65E3B] text-white dark:bg-red-650 border-red-400 dark:border-red-550';
      case 128:
        return 'bg-[#EDCF72] text-white dark:bg-yellow-500 font-extrabold border-yellow-300 dark:border-yellow-450';
      case 256:
        return 'bg-[#EDCC61] text-white dark:bg-yellow-650 font-extrabold border-yellow-300 dark:border-yellow-500 shadow-[0_0_12px_rgba(237,204,97,0.4)]';
      case 512:
        return 'bg-[#EDC850] text-white dark:bg-emerald-600 font-extrabold border-yellow-300 dark:border-emerald-500 shadow-[0_0_14px_rgba(237,200,80,0.5)]';
      case 1024:
        return 'bg-[#EDC53F] text-white dark:bg-emerald-700 font-extrabold text-lg border-yellow-300 dark:border-emerald-600';
      case 2048:
        return 'bg-[#EDC22E] text-white dark:bg-teal-650 font-black text-lg animate-pulse border-yellow-300 dark:border-teal-500 shadow-[0_0_20px_rgba(237,194,46,0.8)]';
      default:
        return 'bg-cyan-100 border-cyan-400 text-cyan-800 dark:bg-cyan-500 dark:border-cyan-300 dark:text-black';
    }
  }
};

export default TWENTYFORTYEIGHT_CONFIG;
