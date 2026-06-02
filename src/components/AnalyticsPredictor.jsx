import React from 'react';

export default function AnalyticsPredictor({ 
  filters, 
  onChangeFilter, 
  predictedStats,
  selectedArea,
  selectedRoad
}) {
  const days = ['Weekday', 'Weekend'];
  const weathers = ['Clear', 'Overcast', 'Rain', 'Windy', 'Fog'];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Severe Gridlock': return 'text-red-400';
      case 'Heavy Congestion': return 'text-amber-500';
      case 'Serene & Clear': return 'text-emerald-400';
      default: return 'text-blue-400';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'Severe Gridlock': return 'bg-red-500/10 border-red-500/20';
      case 'Heavy Congestion': return 'bg-amber-500/10 border-amber-500/20';
      case 'Serene & Clear': return 'bg-emerald-500/10 border-emerald-500/20';
      default: return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="panel-card bg-slate-900/40 border border-slate-800/40 backdrop-blur-xl rounded-2xl p-5 shadow-2xl flex flex-col gap-4 hover:border-slate-700/50 transition-all duration-300">
      <h3 className="panel-title flex items-center gap-2 text-sm font-bold tracking-wider text-slate-300 uppercase border-b border-slate-800 pb-3 font-display">
        <span className="material-symbols-outlined text-[#00af87] text-lg">insights</span>
        Traffic Forecasting Engine
      </h3>

      <div className="flex flex-col gap-1 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
        <span>Station: <strong className="text-slate-200">{selectedArea}</strong></span>
        <span>Roadway: <strong className="text-slate-200">{selectedRoad}</strong></span>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Temporal scope select */}
        <label className="flex flex-col gap-1.5 text-xs text-slate-400 font-bold">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[#00af87] text-sm">calendar_month</span>
            Temporal Scope
          </span>
          <select 
            value={filters.dayOfWeek}
            onChange={(e) => onChangeFilter('dayOfWeek', e.target.value)}
            className="custom-select w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg outline-none text-xs font-semibold cursor-pointer focus:border-[#00af87] transition-all duration-300"
          >
            {days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        {/* Atmospheric state select */}
        <label className="flex flex-col gap-1.5 text-xs text-slate-400 font-bold">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[#00af87] text-sm">cloudy</span>
            Atmospheric State
          </span>
          <select 
            value={filters.weather}
            onChange={(e) => onChangeFilter('weather', e.target.value)}
            className="custom-select w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg outline-none text-xs font-semibold cursor-pointer focus:border-[#00af87] transition-all duration-300"
          >
            {weathers.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>

      </div>

      {/* Metro construction toggle */}
      <div 
        className="flex items-center justify-between bg-slate-950/40 p-3 border border-slate-805 rounded-xl cursor-pointer hover:border-slate-800 transition-all duration-200"
        onClick={() => onChangeFilter('roadwork', filters.roadwork === 'Yes' ? 'No' : 'Yes')}
      >
        <span className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
          <span className="material-symbols-outlined text-[#00af87] text-base">construction</span>
          Metro Construction Block
        </span>
        
        {/* Toggle Switch */}
        <div className={`relative w-9 h-5 rounded-full border transition-all duration-300 ${
          filters.roadwork === 'Yes' 
            ? 'bg-[#00af87] border-[#00af87]' 
            : 'bg-slate-950 border-slate-800'
        }`}>
          <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all duration-300 ${
            filters.roadwork === 'Yes' 
              ? 'left-4.5 bg-white' 
              : 'left-0.5 bg-slate-500'
          }`} />
        </div>
      </div>

      {/* Live predicted stats */}
      <div className={`border p-4 rounded-xl flex flex-col gap-3 backdrop-blur-sm transition-all duration-300 ${getStatusBgColor(predictedStats.status)}`}>
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-slate-400">Forecasted Status:</span>
          <span className={`font-extrabold uppercase tracking-wider font-display ${getStatusColor(predictedStats.status)}`}>
            {predictedStats.status}
          </span>
        </div>

        <div className="h-[1px] bg-slate-800/40" />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">CONGESTION LEVEL</span>
            <span className={`text-xl font-extrabold font-display ${getStatusColor(predictedStats.status)}`}>
              {predictedStats.congestionLevel}%
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">VEHICLE SPEED</span>
            <span className="text-xl font-extrabold font-display text-slate-200">
              {predictedStats.avgSpeed} km/h
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">TRAFFIC VOLUME</span>
            <span className="text-xl font-extrabold font-display text-slate-200">
              {predictedStats.trafficVolume.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">CARBON EMISSIONS</span>
            <span className="text-xl font-extrabold font-display text-slate-200">
              {predictedStats.environmentalImpact} idx
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
