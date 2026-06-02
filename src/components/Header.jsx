import React from 'react';

export default function Header({ currentEra, onEraChange }) {
  const eras = [
    { id: 'all', label: 'All Eras', desc: 'Modern Mix' },
    { id: '1537', label: '1537 Pete', desc: 'Kempe Gowda Fort' },
    { id: '1809', label: '1809 Cantonment', desc: 'British Avenues' },
    { id: '1970s', label: '1970s Garden', desc: 'Pensioner\'s Paradise' }
  ];

  return (
    <header className="sticky top-0 z-50 flex flex-col md:flex-row items-center justify-between border-b border-slate-200/10 bg-slate-950/85 backdrop-blur-md px-6 py-3.5 rounded-xl gap-4 transition-all duration-300">
      
      {/* A. TripAura Brand Logo (TripAdvisor Styled Emerald Owl) */}
      <div className="flex items-center gap-3">
        <div className="bg-[#00af87] p-2.5 rounded-full text-black flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <span className="material-symbols-outlined text-2xl font-black text-black">visibility</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <h1 className="brand-title text-2xl font-extrabold tracking-tight text-white font-display leading-none">
              Trip<span className="text-[#00af87]">Aura</span>
            </h1>
            <span className="bg-emerald-500/10 text-[#00af87] border border-emerald-500/25 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
              IN
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mt-1">
            Bangalore Traffic-Escape Portal
          </span>
        </div>
      </div>

      {/* B. TripAdvisor Global Search Bar */}
      <div className="relative w-full md:max-w-xs lg:max-w-sm">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
        <input 
          type="text" 
          placeholder="Where to? (e.g. Indiranagar, Lalbagh)"
          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-full text-slate-200 text-xs font-semibold focus:outline-none focus:border-[#00af87] focus:ring-2 focus:ring-emerald-500/10 placeholder-slate-500 transition-all duration-300"
        />
      </div>

      {/* C. Primary Navigation Links & Era Switcher */}
      <div className="flex flex-wrap items-center gap-4">
        
        {/* Nav Links */}
        <nav className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <a href="#" className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-emerald-400 bg-emerald-500/5 hover:text-white transition-all">
            <span className="material-symbols-outlined text-sm">explore</span>
            Explore
          </a>
          <a href="#" className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:text-white transition-all">
            <span className="material-symbols-outlined text-sm">favorite</span>
            Trips
          </a>
          <a href="#" className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:text-white transition-all">
            <span className="material-symbols-outlined text-sm">rate_review</span>
            Reviews
          </a>
        </nav>

        <div className="h-4 w-[1px] bg-slate-800 hidden lg:block" />

        {/* Dynamic Era Selector Selector */}
        <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-xl gap-1">
          {eras.map(era => (
            <button
              key={era.id}
              onClick={() => onEraChange(era.id)}
              className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide rounded-lg font-display cursor-pointer transition-all duration-300 ${
                currentEra === era.id 
                  ? 'bg-[#00af87] text-slate-950 font-black shadow-md shadow-emerald-500/25' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title={era.desc}
            >
              {era.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

    </header>
  );
}
