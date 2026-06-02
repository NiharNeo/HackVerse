import React from 'react';

export default function DestinationCard({ dest, onSelect, predictedTraffic }) {
  if (!dest) return null;

  const categoryLabels = {
    'hotel': 'Hotel',
    'restaurant': 'Restaurant',
    'attraction': 'Things to Do'
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'hotel': return 'hotel';
      case 'restaurant': return 'restaurant';
      default: return 'local_activity';
    }
  };

  const renderGreenBubbles = (rating) => {
    const fullBubbles = Math.floor(rating);
    const hasHalf = rating % 1 !== 0;
    const bubbles = [];

    for (let i = 1; i <= 5; i++) {
      if (i <= fullBubbles) {
        bubbles.push(
          <span 
            key={`bub-${i}`} 
            className="w-3 h-3 rounded-full bg-[#00af87] inline-block border border-[#00af87]"
          />
        );
      } else if (i === fullBubbles + 1 && hasHalf) {
        bubbles.push(
          <span 
            key={`bub-${i}`} 
            className="w-3 h-3 rounded-full inline-block border border-[#00af87] relative overflow-hidden bg-slate-900"
          >
            <span className="absolute top-0 left-0 bottom-0 w-1/2 bg-[#00af87]" />
          </span>
        );
      } else {
        bubbles.push(
          <span 
            key={`bub-${i}`} 
            className="w-3 h-3 rounded-full inline-block border border-[#00af87] bg-slate-900"
          />
        );
      }
    }

    return (
      <div className="flex gap-0.5 items-center">
        {bubbles}
      </div>
    );
  };

  const getTrafficBadge = (congestion) => {
    if (congestion > 80) {
      return (
        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/25 px-2 py-0.5 rounded">
          <span className="material-symbols-outlined text-[10px] filled">minor_crash</span>
          Severe Gridlock Area
        </span>
      );
    } else if (congestion > 50) {
      return (
        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded">
          <span className="material-symbols-outlined text-[10px]">traffic</span>
          Heavy Traffic
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-[#00af87]/25 px-2 py-0.5 rounded">
          <span className="material-symbols-outlined text-[10px] filled">verified</span>
          Clear Passage Vibe
        </span>
      );
    }
  };

  return (
    <div 
      onClick={() => onSelect(dest)}
      className="vibe-card flex flex-col gap-3 p-4 rounded-2xl border border-slate-800/60 bg-slate-950/25 hover:bg-slate-900/40 hover:border-[#00af87]/60 cursor-pointer transition-all duration-300 shadow-lg shadow-black/10"
    >
      {/* 1. Header with Name & Live Traffic Status */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-start gap-3">
          <span className="vibe-name font-display text-sm font-extrabold text-slate-200 leading-tight">
            {dest.name}
          </span>
          {getTrafficBadge(predictedTraffic?.congestionLevel || 20)}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <span className="material-symbols-outlined text-slate-500 text-xs">location_on</span>
          <span>{dest.area} ({dest.road})</span>
        </div>
      </div>

      {/* 2. Green Bubble Ratings Grid */}
      <div className="flex items-center gap-2">
        {renderGreenBubbles(dest.rating)}
        <span className="text-[11px] font-bold text-slate-400">
          {dest.reviewsCount.toLocaleString()} reviews
        </span>
      </div>

      {/* Category Info pills */}
      <div className="flex items-center gap-2 text-[10px] font-extrabold text-[#00af87] uppercase tracking-wide">
        <span className="flex items-center gap-1 bg-[#00af87]/5 border border-[#00af87]/20 px-2 py-0.5 rounded-full">
          <span className="material-symbols-outlined text-xs">{getCategoryIcon(dest.category)}</span>
          {categoryLabels[dest.category] || 'Attraction'}
        </span>
        <span className="text-slate-500 font-medium">·</span>
        <span className="text-slate-400">{dest.priceTier}</span>
        <span className="text-slate-500 font-medium">·</span>
        <span className="text-slate-400 lowercase">{dest.vibe}</span>
      </div>

      {/* 3. Description & historical story fact */}
      <p className="vibe-desc text-xs text-slate-400 font-medium leading-relaxed">
        {dest.description}
      </p>

      {dest.historicalFact && (
        <p className="vibe-fact text-[10px] font-medium leading-relaxed italic text-slate-500 border-l-2 border-[#00af87]/40 pl-3 py-0.5">
          {dest.historicalFact}
        </p>
      )}

      {/* 4. Sensory weights */}
      <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider border-t border-slate-800/40 pt-2.5">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-slate-500 text-xs">hourglass_empty</span>
          Epoch: {dest.era === '1537' ? '1537 Pete' : dest.era === '1809' ? '1809 Cantonment' : '1970s Garden'}
        </span>
        <span className="flex items-center gap-0.5 text-[#00af87]">
          <span className="material-symbols-outlined text-xs filled">auto_awesome</span>
          <span>Serenity Match</span>
        </span>
      </div>

    </div>
  );
}
