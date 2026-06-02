import React, { useState, useRef } from 'react';

export default function ThenAndNow({ landmarkName, thenDesc, nowDesc, thenImage, nowImage }) {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage (0-100)
  const containerRef = useRef(null);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(position);
  };

  const onMouseMove = (e) => {
    if (e.buttons === 1) {
      handleMove(e.clientX);
    }
  };

  const onTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  return (
    <div className="panel-card bg-slate-900/40 border border-slate-800/40 backdrop-blur-xl rounded-2xl p-5 shadow-2xl flex flex-col gap-4 hover:border-slate-700/50 transition-all duration-300">
      <h3 className="panel-title flex items-center gap-2 text-sm font-bold tracking-wider text-slate-300 uppercase border-b border-slate-800 pb-3 font-display">
        <span className="material-symbols-outlined text-blue-500 text-lg">history_edu</span>
        Heritage Portal: Then & Now
      </h3>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-slate-200 font-display">
          {landmarkName || "Select a Heritage Landmark"}
        </span>
        <span className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">
          Drag the center handle to cross epochs
        </span>
      </div>

      <div 
        ref={containerRef}
        className="then-now-container relative w-full h-[200px] rounded-xl overflow-hidden border border-slate-800/60 cursor-ew-resize select-none"
        onMouseMove={onMouseMove}
        onTouchMove={onTouchMove}
        onClick={(e) => handleMove(e.clientX)}
      >
        {/* A. Then Pane (Parchment/Sepia sketch) */}
        <div 
          className={`tn-pane absolute top-0 left-0 w-full h-full bg-cover bg-center flex items-end p-3 z-1 ${thenImage ? '' : 'bg-sketch-then'}`}
          style={thenImage ? { backgroundImage: `url(${thenImage})` } : {}}
        >
          <span className="tn-label font-display text-[10px] font-bold text-white bg-black/75 px-2 py-1 rounded border border-slate-800 backdrop-blur-sm uppercase tracking-wide">
            Then (Historic)
          </span>
        </div>

        {/* B. Now Pane (Modern digital/neon grid) - clipped dynamically */}
        <div 
          className={`tn-pane absolute top-0 left-0 w-full h-full bg-cover bg-center flex items-end p-3 z-2 ${nowImage ? '' : 'bg-photo-now'}`}
          style={{ 
            clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`,
            backgroundImage: nowImage ? `url(${nowImage})` : undefined
          }}
        >
          <span className="tn-label font-display text-[10px] font-bold text-white bg-black/75 px-2 py-1 rounded border border-slate-850 backdrop-blur-sm uppercase tracking-wide ml-auto">
            Now (Modern)
          </span>
        </div>

        {/* C. Draggable Split Divider Line */}
        <div className="tn-divider absolute top-0 bottom-0 w-[2px] bg-white z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none" style={{ left: `${sliderPosition}%` }} />
        
        {/* D. Center Drag Handle Arrow Circular Badge */}
        <div className="tn-handle absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-blue-500 flex items-center justify-center z-11 shadow-lg text-blue-500 pointer-events-none" style={{ left: `${sliderPosition}%` }}>
          <span className="material-symbols-outlined text-base">swap_horiz</span>
        </div>
      </div>

      {/* Narrative facts under comparison */}
      <div className="flex flex-col gap-2.5 text-[11px] text-slate-400 font-medium leading-relaxed">
        <p><strong>Then Vibe:</strong> {thenDesc || "Lush nature paths, mud walls, and horse carriages in old Bangalore settlements."}</p>
        <p><strong>Now Vibe:</strong> {nowDesc || "A bustling, vibrant IT metropolitan intersection filled with high-rise structures."}</p>
      </div>
    </div>
  );
}
