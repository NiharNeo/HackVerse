import destinations from '../../destinations.json' with { type: 'json' };

// Coordinates mapping of main intersections for our interactive SVG map rendering
// Dimensions are standard 800 x 600 box for responsive SVG scaling
export const INTERSECTIONS = {
  'hebbal': { x: 400, y: 80, label: 'Hebbal Flyover' },
  'hebbal_flyover': { x: 400, y: 80, label: 'Hebbal Flyover' },
  'ballari_road': { x: 400, y: 150, label: 'Ballari Road' },
  'yeshwanthpur': { x: 180, y: 180, label: 'Yeshwanthpur Circle' },
  'yeshwanthpur_circle': { x: 180, y: 180, label: 'Yeshwanthpur Circle' },
  'tumkur_road': { x: 100, y: 220, label: 'Tumkur Road' },
  'm_g_road': { x: 480, y: 280, label: 'Anil Kumble Circle' },
  'anil_kumble_circle': { x: 480, y: 280, label: 'Anil Kumble Circle' },
  'trinity_circle': { x: 580, y: 280, label: 'Trinity Circle' },
  'indiranagar': { x: 680, y: 240, label: 'CMH Road' },
  'cmh_road': { x: 680, y: 240, label: 'CMH Road' },
  '100_feet_road': { x: 720, y: 310, label: '100 Feet Road' },
  'koramangala': { x: 550, y: 450, label: 'Sony World Junction' },
  'sony_world_junction': { x: 550, y: 450, label: 'Sony World Junction' },
  'sarjapur_road': { x: 640, y: 490, label: 'Sarjapur Road' },
  'jayanagar': { x: 300, y: 420, label: 'Jayanagar 4th Block' },
  'jayanagar_4th_block': { x: 300, y: 420, label: 'Jayanagar 4th Block' },
  'south_end': { x: 260, y: 490, label: 'South End Circle' },
  'south_end_circle': { x: 260, y: 490, label: 'South End Circle' },
  'silk_board': { x: 480, y: 530, label: 'Silk Board Junction' },
  'silk_board_junction': { x: 480, y: 530, label: 'Silk Board Junction' },
  'hosur_road': { x: 380, y: 550, label: 'Hosur Road' },
  'whitefield': { x: 740, y: 150, label: 'ITPL Main Road' },
  'itpl_main_road': { x: 740, y: 150, label: 'ITPL Main Road' },
  'marathahalli': { x: 700, y: 190, label: 'Marathahalli Bridge' },
  'marathahalli_bridge': { x: 700, y: 190, label: 'Marathahalli Bridge' }
};

// Map area selectors to representative start/end nodes
const AREA_NODES = {
  'indiranagar': 'indiranagar',
  'koramangala': 'koramangala',
  'jayanagar': 'jayanagar',
  'm.g. road': 'm_g_road',
  'hebbal': 'hebbal',
  'yeshwanthpur': 'yeshwanthpur',
  'electronic city': 'silk_board',
  'whitefield': 'whitefield'
};

// Connections graph defining roads between intersections
const ADJACENCY = {
  'hebbal': ['ballari_road'],
  'ballari_road': ['hebbal', 'm_g_road'],
  'yeshwanthpur': ['tumkur_road', 'm_g_road', 'south_end'],
  'tumkur_road': ['yeshwanthpur'],
  'm_g_road': ['ballari_road', 'yeshwanthpur', 'trinity_circle'],
  'trinity_circle': ['m_g_road', 'indiranagar'],
  'indiranagar': ['trinity_circle', '100_feet_road'],
  '100_feet_road': ['indiranagar', 'koramangala'],
  'koramangala': ['100_feet_road', 'sarjapur_road', 'silk_board'],
  'sarjapur_road': ['koramangala', 'marathahalli'],
  'silk_board': ['koramangala', 'hosur_road', 'south_end'],
  'hosur_road': ['silk_board'],
  'south_end': ['yeshwanthpur', 'silk_board', 'jayanagar'],
  'jayanagar': ['south_end'],
  'whitefield': ['marathahalli'],
  'marathahalli': ['whitefield', '100_feet_road', 'sarjapur_road']
};

export function planRoute(startArea, endArea, era, sensory, trafficEngine, trafficFilters) {
  const startKey = (startArea || '').trim().toLowerCase();
  const endKey = (endArea || '').trim().toLowerCase();

  const startNode = AREA_NODES[startKey] || 'indiranagar';
  const endNode = AREA_NODES[endKey] || 'm_g_road';

  // 1. Calculate Standard Route using simple BFS/Shortest path (main roads focus)
  const standardPath = findShortestPath(startNode, endNode, ADJACENCY);

  // 2. Calculate AuraPath detouring congested points and prioritizing high match locations
  const auraPath = findAuraPath(startNode, endNode, ADJACENCY, era, sensory, trafficEngine, trafficFilters);

  // 3. Compile stats for Standard Route
  const standardStats = calculateStats(standardPath, false, trafficEngine, trafficFilters);

  // 4. Compile stats for AuraPath
  const auraStats = calculateStats(auraPath, true, trafficEngine, trafficFilters);

  // 5. Gather curated destinations along the AuraPath that match our filters
  const auraDestinations = getDestinationsForRoute(auraPath, era, sensory);

  return {
    standard: {
      path: standardPath,
      stats: standardStats
    },
    aura: {
      path: auraPath,
      stats: auraStats,
      destinations: auraDestinations
    }
  };
}

// Basic shortest path calculation using BFS
function findShortestPath(start, end, graph) {
  if (start === end) return [start];

  const queue = [[start]];
  const visited = new Set([start]);

  while (queue.length > 0) {
    const path = queue.shift();
    const node = path[path.length - 1];

    if (node === end) return path;

    const neighbors = graph[node] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }

  return [start, end]; // Fallback
}

// Aura path finding that dynamically weights nodes based on traffic and vibe suitability
function findAuraPath(start, end, graph, era, sensory, trafficEngine, trafficFilters) {
  if (start === end) return [start];

  const distances = {};
  const previous = {};
  const unvisited = new Set();

  Object.keys(graph).forEach(node => {
    distances[node] = Infinity;
    previous[node] = null;
    unvisited.add(node);
  });

  distances[start] = 0;

  while (unvisited.size > 0) {
    let current = null;
    let minDistance = Infinity;

    unvisited.forEach(node => {
      if (distances[node] < minDistance) {
        minDistance = distances[node];
        current = node;
      }
    });

    if (current === null || current === end) break;

    unvisited.delete(current);

    const neighbors = graph[current] || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor)) continue;

      const weight = calculateLinkWeight(current, neighbor, era, sensory, trafficEngine, trafficFilters);
      const alt = distances[current] + weight;

      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = current;
      }
    }
  }

  const path = [];
  let u = end;
  if (previous[u] || u === start) {
    while (u !== null) {
      path.unshift(u);
      u = previous[u];
    }
  }

  return path.length > 0 ? path : findShortestPath(start, end, graph);
}

// Calculate the link weight between two nodes based on traffic congestion and sensory scores
function calculateLinkWeight(fromNode, toNode, era, sensory, trafficEngine, trafficFilters) {
  const coord = INTERSECTIONS[toNode] || { label: '' };
  const nodeLabel = coord.label;

  let areaName = 'M.G. Road';
  if (toNode.includes('indiranagar') || toNode.includes('feet')) areaName = 'Indiranagar';
  else if (toNode.includes('koramangala') || toNode.includes('sarjapur')) areaName = 'Koramangala';
  else if (toNode.includes('jayanagar') || toNode.includes('south')) areaName = 'Jayanagar';
  else if (toNode.includes('hebbal') || toNode.includes('ballari')) areaName = 'Hebbal';
  else if (toNode.includes('yeshwanthpur') || toNode.includes('tumkur')) areaName = 'Yeshwanthpur';
  else if (toNode.includes('silk') || toNode.includes('hosur')) areaName = 'Electronic City';
  else if (toNode.includes('whitefield') || toNode.includes('marathahalli')) areaName = 'Whitefield';

  const pred = trafficEngine && trafficEngine.isLoaded
    ? trafficEngine.predictTraffic(areaName, nodeLabel, trafficFilters.dayOfWeek, trafficFilters.weather, trafficFilters.roadwork)
    : { congestionLevel: 30 };

  let cost = 10;

  if (pred.congestionLevel > 80) cost += 150;
  else if (pred.congestionLevel > 50) cost += 60;
  else cost += pred.congestionLevel * 0.2;

  const isAcousticCozy = sensory.acoustics < 0.4 && pred.congestionLevel < 40;
  if (isAcousticCozy) cost -= 4;

  const hasEraMatch = destinations.some(dest => {
    const destNode = dest.road.toLowerCase().replace(/\s+/g, '_');
    return (destNode === toNode || destNode === fromNode) && (era === 'all' || dest.era === era);
  });
  if (hasEraMatch) cost -= 5;

  return Math.max(1, cost);
}

// Calculate the performance statistics for a planned path
function calculateStats(path, isAura, trafficEngine, trafficFilters) {
  let totalCongestion = 0;
  let totalTime = 0;
  let totalSpeed = 0;
  let totalVolume = 0;
  let totalImpact = 0;

  path.forEach(node => {
    const coord = INTERSECTIONS[node] || { label: '' };
    const label = coord.label;

    let area = 'M.G. Road';
    if (node.includes('indiranagar') || node.includes('feet')) area = 'Indiranagar';
    else if (node.includes('koramangala') || node.includes('sarjapur')) area = 'Koramangala';
    else if (node.includes('jayanagar') || node.includes('south')) area = 'Jayanagar';
    else if (node.includes('hebbal') || node.includes('ballari')) area = 'Hebbal';
    else if (node.includes('yeshwanthpur') || node.includes('tumkur')) area = 'Yeshwanthpur';
    else if (node.includes('silk') || node.includes('hosur')) area = 'Electronic City';
    else if (node.includes('whitefield') || node.includes('marathahalli')) area = 'Whitefield';

    const pred = trafficEngine && trafficEngine.isLoaded
      ? trafficEngine.predictTraffic(area, label, trafficFilters.dayOfWeek, trafficFilters.weather, trafficFilters.roadwork)
      : { congestionLevel: 30, avgSpeed: 30, trafficVolume: 20000, environmentalImpact: 60 };

    totalCongestion += pred.congestionLevel;
    totalSpeed += pred.avgSpeed;
    totalVolume += pred.trafficVolume;
    totalImpact += pred.environmentalImpact;
  });

  const avgCong = Math.round(totalCongestion / path.length);
  const avgSpeed = Math.round(totalSpeed / path.length);

  let duration = 0;
  if (isAura) {
    duration = path.length * 8 + Math.round(avgCong * 0.1);
  } else {
    const baseDrive = path.length * 4;
    const congestionDelay = (avgCong > 70) ? (avgCong * 0.4) : (avgCong * 0.15);
    duration = Math.round(baseDrive + congestionDelay);
  }

  const baseEmissions = parseFloat(((totalImpact / 100) * 0.45).toFixed(1));
  const carbon = isAura 
    ? parseFloat((baseEmissions * 0.05).toFixed(1))
    : parseFloat((baseEmissions * (1 + (avgCong / 100))).toFixed(1));

  const decibels = isAura
    ? Math.round(40 + (avgCong * 0.15))
    : Math.round(75 + (avgCong * 0.18));

  return {
    time: Math.max(5, duration),
    congestion: avgCong,
    carbon: Math.max(0.1, carbon),
    decibels
  };
}

// Gathers matching local destinations along the planned path
function getDestinationsForRoute(path, era, sensory) {
  const pathNodes = new Set(path);

  return destinations.filter(dest => {
    const destNode = dest.road.toLowerCase().replace(/\s+/g, '_');
    const isClose = pathNodes.has(destNode);
    if (!isClose) return false;

    if (era !== 'all' && dest.era !== era) return false;

    if (sensory.acoustics < 0.3 && dest.sensory?.acoustics > 0.6) return false;
    if (sensory.energy < 0.3 && dest.sensory?.energy > 0.7) return false;

    return true;
  });
}
