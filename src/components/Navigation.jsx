import React from 'react';

export default function Navigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'feed', label: 'Explore Feed', icon: 'travel_explore' },
    { id: 'map', label: 'Globe Map', icon: 'map' },
    { id: 'ai-planner', label: 'AI Planner', icon: 'auto_awesome' }
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-950/80 border border-slate-800/80 p-1.5 rounded-2xl flex gap-1 shadow-2xl backdrop-blur-md">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-300 ${
            activeTab === tab.id
              ? 'bg-[#00af87] text-slate-950 font-black shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
          }`}
        >
          <span className="material-symbols-outlined text-base leading-none">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
