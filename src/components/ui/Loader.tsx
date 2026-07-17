import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-slate-900" />
        <div className="absolute inset-0 rounded-full border-4 border-t-white border-r-slate-400 border-b-transparent border-l-transparent animate-spin" />
      </div>
      <span className="text-[10px] font-bold tracking-[0.25em] text-slate-500 uppercase">
        LOADING.ZONE
      </span>
    </div>
  );
};

export default Loader;
