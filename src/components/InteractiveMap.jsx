import React from 'react';
import { INTERSECTIONS } from '../utils/routePlanner';

export default function InteractiveMap({ 
  startArea, 
  endArea, 
  onSelectNode, 
  routes,
  trafficEngine,
  trafficFilters 
}) {
  
  const roadConnections = [
    { from: 'hebbal', to: 'ballari_road' },
    { from: 'ballari_road', to: 'm_g_road' },
    { from: 'yeshwanthpur', to: 'tumkur_road' },
    { from: 'yeshwanthpur', to: 'm_g_road' },
    { from: 'yeshwanthpur', to: 'south_end' },
    { from: 'm_g_road', to: 'trinity_circle' },
    { from: 'trinity_circle', to: 'indiranagar' },
    { from: 'indiranagar', to: '100_feet_road' },
    { from: '100_feet_road', to: 'koramangala' },
    { from: 'koramangala', to: 'sarjapur_road' },
    { from: 'koramangala', to: 'silk_board' },
    { from: 'silk_board', to: 'hosur_road' },
    { from: 'silk_board', to: 'south_end' },
    { from: 'south_end', to: 'jayanagar' },
    { from: 'whitefield', to: 'marathahalli' },
    { from: 'marathahalli', to: '100_feet_road' },
    { from: 'marathahalli', to: 'sarjapur_road' }
  ];

  const nodeToArea = (nodeKey) => {
    const mapping = {
      'indiranagar': 'Indiranagar',
      '100_feet_road': 'Indiranagar',
      'koramangala': 'Koramangala',
      'sarjapur_road': 'Koramangala',
      'jayanagar': 'Jayanagar',
      'south_end': 'Jayanagar',
      'm_g_road': 'M.G. Road',
      'trinity_circle': 'M.G. Road',
      'hebbal': 'Hebbal',
      'ballari_road': 'Hebbal',
      'yeshwanthpur': 'Yeshwanthpur',
      'tumkur_road': 'Yeshwanthpur',
      'silk_board': 'Electronic City',
      'hosur_road': 'Electronic City',
      'whitefield': 'Whitefield',
      'marathahalli': 'Whitefield'
    };
    return mapping[nodeKey] || 'M.G. Road';
  };

  const getRoadCongestionClass = (fromNode, toNode) => {
    if (!trafficEngine.isLoaded) return 'congested-low';

    const areaA = nodeToArea(fromNode);
    const roadA = INTERSECTIONS[fromNode]?.label || '';

    const pred = trafficEngine.predictTraffic(
      areaA,
      roadA,
      trafficFilters.dayOfWeek,
      trafficFilters.weather,
      trafficFilters.roadwork
    );

    if (pred.congestionLevel > 80) return 'congested-heavy';
    if (pred.congestionLevel > 50) return 'congested-moderate';
    return 'congested-low';
  };

  const getRoutePointsStr = (path) => {
    return path.map(node => {
      const coord = typeof node === 'string' ? INTERSECTIONS[node] : node;
      return coord ? `${coord.x},${coord.y}` : '';
    }).filter(Boolean).join(' ');
  };

  const selectedStart = startArea.toLowerCase().replace(/\s+/g, '_').replace(/\./g, '');
  const selectedEnd = endArea.toLowerCase().replace(/\s+/g, '_').replace(/\./g, '');

  let activeBottlenecks = 0;
  if (trafficEngine.isLoaded) {
    Object.entries(INTERSECTIONS).forEach(([key, node]) => {
      const area = nodeToArea(key);
      const pred = trafficEngine.predictTraffic(area, node.label, trafficFilters.dayOfWeek, trafficFilters.weather, trafficFilters.roadwork);
      if (pred.congestionLevel > 80) activeBottlenecks++;
    });
  }

  return (
    <div className="panel-card bg-slate-900/40 border border-slate-800/40 backdrop-blur-xl rounded-2xl p-5 shadow-2xl flex flex-col gap-4 hover:border-slate-700/50 transition-all duration-300">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <h3 className="panel-title flex items-center gap-2 text-sm font-bold tracking-wider text-slate-300 uppercase font-display">
          <span className="material-symbols-outlined text-[#00af87] text-lg">map</span>
          Itinerary Map Explorer
        </h3>
        
        {activeBottlenecks > 0 && (
          <div className="flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide animate-pulse">
            <span className="material-symbols-outlined text-xs">warning</span>
            <span>{activeBottlenecks} Heavy Bottlenecks</span>
          </div>
        )}
      </div>

      <div className="map-canvas relative w-full h-[480px] bg-slate-950 border border-slate-800/60 rounded-xl overflow-hidden transition-all duration-300">
        <svg className="map-svg w-full h-full" viewBox="0 0 800 600">
          
          {/* Base roads */}
          {roadConnections.map((road, idx) => {
            const fromCoord = INTERSECTIONS[road.from];
            const toCoord = INTERSECTIONS[road.to];
            if (!fromCoord || !toCoord) return null;

            const congClass = getRoadCongestionClass(road.from, road.to);

            return (
              <line
                key={`base-road-${idx}`}
                x1={fromCoord.x}
                y1={fromCoord.y}
                x2={toCoord.x}
                y2={toCoord.y}
                className={`road-link ${congClass}`}
              />
            );
          })}

          {/* standard driving line */}
          {routes?.standard?.path && (
            <polyline
              points={getRoutePointsStr(routes.standard.path)}
              className="route-overlay standard"
            />
          )}

          {/* AuraPath walking line */}
          {routes?.aura?.path && (
            <polyline
              points={getRoutePointsStr(routes.aura.path)}
              className="route-overlay aura"
            />
          )}

          {/* landmarks pins */}
          {routes?.aura?.destinations?.map((dest, idx) => {
            const mappedNode = dest.road.toLowerCase().replace(/\s+/g, '_');
            const coord = INTERSECTIONS[mappedNode];
            if (!coord) return null;

            return (
              <g key={`landmark-${idx}`} transform={`translate(${coord.x + 16}, ${coord.y - 16})`}>
                <circle r={10} fill="var(--accent-color)" opacity={0.3} className="animate-ping" />
                <circle r={6} fill="var(--accent-color)" />
              </g>
            );
          })}

          {/* Interactive node elements */}
          {Object.entries(INTERSECTIONS).map(([key, node]) => {
            const area = nodeToArea(key);
            const isStart = nodeToArea(key).toLowerCase().replace(/\s+/g, '_').replace(/\./g, '') === selectedStart;
            const isEnd = nodeToArea(key).toLowerCase().replace(/\s+/g, '_').replace(/\./g, '') === selectedEnd;

            const pred = trafficEngine.isLoaded 
              ? trafficEngine.predictTraffic(area, node.label, trafficFilters.dayOfWeek, trafficFilters.weather, trafficFilters.roadwork)
              : { congestionLevel: 30 };

            const isCongested = pred.congestionLevel > 80;

            return (
              <g 
                key={`node-${key}`} 
                className={`map-node group cursor-pointer transition-all duration-200`}
                onClick={() => onSelectNode(area)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isStart || isEnd ? 9 : 6}
                  className={`node-circle transition-all duration-300 ${
                    isStart || isEnd 
                      ? 'fill-[#00af87] stroke-white stroke-[3]' 
                      : isCongested 
                        ? 'fill-red-500 stroke-red-800 stroke-2' 
                        : 'fill-slate-800 stroke-slate-700 stroke-2 hover:fill-[#00af87]'
                  }`}
                />
                
                {(isStart || isEnd) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={15}
                    fill="none"
                    stroke="var(--accent-color)"
                    strokeWidth={1.5}
                    opacity={0.6}
                    className="animate-ping"
                  />
                )}

                <text
                  x={node.x}
                  y={node.y - 12}
                  textAnchor="middle"
                  className={`node-text font-display text-[10px] font-bold pointer-events-none transition-colors duration-300 ${
                    isStart || isEnd 
                      ? 'fill-white' 
                      : 'fill-slate-400 group-hover:fill-white'
                  }`}
                >
                  {node.label}
                </text>
              </g>
            );
          })}

        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-slate-950/85 border border-slate-850 p-3.5 rounded-xl flex flex-col gap-2 text-[10px] font-medium backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-red-500 rounded-full"></span>
            <span className="text-slate-400">Auto Route (Driving Path)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
            <span className="text-slate-400">AuraPath (Escape Route)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center">
              <span className="w-1 h-1 rounded-full bg-red-500"></span>
            </span>
            <span className="text-slate-400">Congested Node</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
              <span className="w-1 h-1 rounded-full bg-slate-400"></span>
            </span>
            <span className="text-slate-400">Quiet Node</span>
          </div>
        </div>

      </div>
    </div>
  );
}
