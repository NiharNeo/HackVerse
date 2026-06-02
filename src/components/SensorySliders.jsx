import React from 'react';

export default function SensorySliders({ sensory, onChange }) {
  const sliders = [
    {
      id: 'acoustics',
      label: 'Acoustics (Noise)',
      icon: 'volume_down',
      minLabel: 'Silent Escape',
      maxLabel: 'Social Hubs',
      value: sensory.acoustics
    },
    {
      id: 'visuals',
      label: 'Visuals (Lighting)',
      icon: 'light_mode',
      minLabel: 'Sun-drenched',
      maxLabel: 'Moody/Cozy',
      value: sensory.visuals
    },
    {
      id: 'energy',
      label: 'Energy (Stamina)',
      icon: 'bolt',
      minLabel: 'Lazy Stroll',
      maxLabel: 'High-Adrenaline',
      value: sensory.energy
    }
  ];

  return (
    <div className="panel-card bg-slate-900/40 border border-slate-800/40 backdrop-blur-xl rounded-2xl p-5 shadow-2xl flex flex-col gap-5 hover:border-slate-700/50 transition-all duration-300">
      <h3 className="panel-title flex items-center gap-2 text-sm font-bold tracking-wider text-slate-300 uppercase border-b border-slate-800 pb-3 font-display">
        <span className="material-symbols-outlined text-[#00af87] text-lg">tune</span>
        Sensory Mood Profile
      </h3>

      <div className="flex flex-col gap-5">
        {sliders.map(slider => (
          <div key={slider.id} className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-1.5 font-display text-slate-300">
                <span className="material-symbols-outlined text-[#00af87] text-base">{slider.icon}</span>
                {slider.label}
              </span>
              <span className="text-[#00af87] font-bold font-display bg-[#00af87]/10 px-2 py-0.5 rounded-md">
                {Math.round(slider.value * 100)}%
              </span>
            </div>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={slider.value}
              onChange={(e) => onChange(slider.id, parseFloat(e.target.value))}
              className="custom-range w-full h-1 bg-slate-950 border border-slate-800 rounded-lg outline-none cursor-pointer"
            />
            
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>{slider.minLabel}</span>
              <span>{slider.maxLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
