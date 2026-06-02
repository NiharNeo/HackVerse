import React from 'react';

export default function ComparisonPanel({ routes, startArea, endArea }) {
  if (!routes) return null;

  const std = routes.standard.stats;
  const aur = routes.aura.stats;

  const timeSaved = Math.max(0, std.time - aur.time);
  const carbonSaved = Math.max(0, parseFloat((std.carbon - aur.carbon).toFixed(1)));
  const decibelSaved = Math.max(0, std.decibels - aur.decibels);

  const timePercent = Math.min(100, Math.round((std.time / Math.max(std.time, aur.time)) * 100));
  const timeAuraPercent = Math.min(100, Math.round((aur.time / Math.max(std.time, aur.time)) * 100));
  
  const congPercent = std.congestion;
  const congAuraPercent = aur.congestion;

  return (
    <div className="panel-card bg-slate-900/40 border border-slate-800/40 backdrop-blur-xl rounded-2xl p-5 shadow-2xl flex flex-col gap-4 hover:border-slate-700/50 transition-all duration-300">
      <h3 className="panel-title flex items-center gap-2 text-sm font-bold tracking-wider text-slate-300 uppercase border-b border-slate-800 pb-3 font-display">
        <span className="material-symbols-outlined text-[#00af87] text-lg">bar_chart</span>
        Path Performance Matrix
      </h3>

      <div className="grid grid-cols-2 gap-4">
        
        {/* A. Standard Route Box */}
        <div className="flex flex-col gap-4 p-4 rounded-xl border border-red-500/10 bg-red-500/5 hover:border-red-500/20 transition-all duration-300">
          <div className="flex items-center gap-2 font-display text-sm font-bold text-red-400">
            <span className="material-symbols-outlined text-lg">minor_crash</span>
            Auto Route (Main Road)
          </div>
          
          <div className="flex flex-col gap-3">
            {/* Time metric */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Travel Duration</span>
                <span className="font-bold text-slate-200">{std.time} mins</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${timePercent}%` }} />
              </div>
            </div>

            {/* Congestion metric */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Congestion Level</span>
                <span className="font-bold text-red-400">{std.congestion}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${congPercent}%` }} />
              </div>
            </div>

            <div className="h-[1px] bg-slate-800/40 my-1" />

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-medium">
              <div>Carbon: <span className="font-bold text-slate-200">{std.carbon} kg</span></div>
              <div>Acoustics: <span className="font-bold text-slate-200">{std.decibels} dB</span></div>
            </div>
          </div>
        </div>

        {/* B. Serene AuraPath Box */}
        <div className="flex flex-col gap-4 p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 hover:border-emerald-500/20 shadow-lg shadow-emerald-500/2 transition-all duration-300">
          <div className="flex items-center gap-2 font-display text-sm font-bold text-emerald-400">
            <span className="material-symbols-outlined text-lg">spa</span>
            AuraPath (Escape Route)
          </div>
          
          <div className="flex flex-col gap-3">
            {/* Time metric */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Travel Duration</span>
                <span className="font-bold text-slate-200">{aur.time} mins</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: `${timeAuraPercent}%` }} />
              </div>
            </div>

            {/* Congestion metric */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Congestion Level</span>
                <span className="font-bold text-emerald-400">{aur.congestion}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${congAuraPercent}%` }} />
              </div>
            </div>

            <div className="h-[1px] bg-slate-800/40 my-1" />

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-medium">
              <div>Carbon: <span className="font-bold text-slate-200">{aur.carbon} kg</span></div>
              <div>Acoustics: <span className="font-bold text-slate-200">{aur.decibels} dB</span></div>
            </div>
          </div>
        </div>

      </div>

      {/* C. Clean high-contrast savings highlights banner */}
      <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3.5 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-500 text-lg filled">verified</span>
          <span>Serenity Upgrade Activated</span>
        </div>
        <div className="text-right">
          <span>Saved <strong className="text-white font-extrabold">{decibelSaved} dB</strong> Noise & <strong className="text-white font-extrabold">{carbonSaved} kg CO₂</strong></span>
        </div>
      </div>
    </div>
  );
}
