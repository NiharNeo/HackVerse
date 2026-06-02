import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

class TrafficPredictor {
  constructor() {
    this.data = [];
    this.isLoaded = false;
    this.indexedData = {}; // Fast lookup: area -> road -> array of records
  }

  // Load and parse CSV dataset directly from filesystem
  async loadDataset() {
    if (this.isLoaded) return;

    return new Promise((resolve, reject) => {
      try {
        const csvPath = path.resolve(process.cwd(), 'Banglore_traffic_Dataset.csv');
        const csvData = fs.readFileSync(csvPath, 'utf8');

        Papa.parse(csvData, {
          header: true,
          dynamicTyping: true,
          complete: (results) => {
            this.data = results.data.filter(row => row['Area Name'] && row['Road/Intersection Name']);
            this.indexData();
            this.isLoaded = true;
            console.log(`Parsed ${this.data.length} traffic records successfully from local file system.`);
            resolve(this.data);
          },
          error: (err) => {
            console.error("Failed to parse Bangalore Traffic CSV:", err);
            this.generateMockData();
            this.isLoaded = true;
            resolve(this.data);
          }
        });
      } catch (err) {
        console.error("Failed to read Bangalore Traffic CSV file:", err);
        this.generateMockData();
        this.isLoaded = true;
        resolve(this.data);
      }
    });
  }

  // Index data for fast area & road queries
  indexData() {
    this.indexedData = {};
    this.data.forEach(row => {
      if (!row['Area Name'] || !row['Road/Intersection Name']) return;
      const area = row['Area Name'].trim().toLowerCase();
      const road = row['Road/Intersection Name'].trim().toLowerCase();

      if (!this.indexedData[area]) {
        this.indexedData[area] = {};
      }
      if (!this.indexedData[area][road]) {
        this.indexedData[area][road] = [];
      }
      this.indexedData[area][road].push(row);
    });
  }

  // Generates backup mock data in case the CSV fails to load (offline resilience)
  generateMockData() {
    const areas = ['indiranagar', 'koramangala', 'jayanagar', 'm.g. road', 'hebbal', 'yeshwanthpur', 'electronic city', 'whitefield'];
    const roads = {
      'indiranagar': ['100 feet road', 'cmh road'],
      'koramangala': ['sony world junction', 'sarjapur road'],
      'jayanagar': ['jayanagar 4th block', 'south end circle'],
      'm.g. road': ['anil kumble circle', 'trinity circle'],
      'hebbal': ['hebbal flyover', 'ballari road'],
      'yeshwanthpur': ['yeshwanthpur circle', 'tumkur road'],
      'electronic city': ['silk board junction', 'hosur road'],
      'whitefield': ['itpl main road', 'marathahalli bridge']
    };

    const mockRecords = [];
    areas.forEach(area => {
      const areaRoads = roads[area] || [];
      areaRoads.forEach(road => {
        // Create 20 baseline records per road
        for (let i = 0; i < 20; i++) {
          const isWeekend = i % 2 === 0;
          const weather = i % 4 === 0 ? 'Rain' : i % 5 === 0 ? 'Overcast' : 'Clear';
          const roadwork = i % 6 === 0 ? 'Yes' : 'No';

          mockRecords.push({
            'Date': `2022-01-${10 + i}`,
            'Area Name': area.charAt(0).toUpperCase() + area.slice(1),
            'Road/Intersection Name': road.charAt(0).toUpperCase() + road.slice(1),
            'Traffic Volume': Math.floor(10000 + Math.random() * 50000),
            'Average Speed': Math.floor(15 + Math.random() * 40),
            'Travel Time Index': 1.1 + Math.random() * 0.4,
            'Congestion Level': Math.floor(30 + Math.random() * 70),
            'Road Capacity Utilization': Math.floor(40 + Math.random() * 60),
            'Incident Reports': Math.random() > 0.8 ? 1 : 0,
            'Environmental Impact': Math.floor(50 + Math.random() * 120),
            'Public Transport Usage': 20 + Math.random() * 60,
            'Traffic Signal Compliance': 60 + Math.random() * 35,
            'Parking Usage': 40 + Math.random() * 50,
            'Pedestrian and Cyclist Count': Math.floor(50 + Math.random() * 200),
            'Weather Conditions': weather,
            'Roadwork and Construction Activity': roadwork
          });
        }
      });
    });

    this.data = mockRecords;
    this.indexData();
  }

  // Live prediction based on UI state inputs
  predictTraffic(areaName, roadName, dayOfWeek = 'Weekday', weather = 'Clear', roadwork = 'No') {
    const area = (areaName || '').trim().toLowerCase();
    const road = (roadName || '').trim().toLowerCase();

    let records = [];
    if (this.indexedData[area] && this.indexedData[area][road]) {
      records = this.indexedData[area][road];
    } else {
      // General zone-wide search if exact road isn't matched
      const keys = Object.keys(this.indexedData[area] || {});
      keys.forEach(k => {
        records = [...records, ...this.indexedData[area][k]];
      });
    }

    // Fallback if no data at all
    if (records.length === 0) {
      return this.fallbackHeuristics(areaName, roadName, dayOfWeek, weather, roadwork);
    }

    // Filter by temporal, atmospheric, and infrastructure factors
    const filtered = records.filter(row => {
      // dayOfWeek matching: check date
      let matchesDay = true;
      if (row['Date']) {
        const dateObj = new Date(row['Date']);
        const day = dateObj.getDay();
        const isWeekend = (day === 0 || day === 6);
        matchesDay = (dayOfWeek === 'Weekend') ? isWeekend : !isWeekend;
      }

      // weather matching
      const matchesWeather = String(row['Weather Conditions'] || '').trim().toLowerCase() === weather.trim().toLowerCase();

      // roadwork matching
      const matchesRoadwork = String(row['Roadwork and Construction Activity'] || '').trim().toLowerCase() === roadwork.trim().toLowerCase();

      return matchesDay && matchesWeather && matchesRoadwork;
    });

    const activeRecords = filtered.length > 0 ? filtered : records;

    // Calculate baseline averages
    let sumCongestion = 0;
    let sumSpeed = 0;
    let sumVolume = 0;
    let sumImpact = 0;

    activeRecords.forEach(r => {
      sumCongestion += r['Congestion Level'] || 40;
      sumSpeed += r['Average Speed'] || 30;
      sumVolume += r['Traffic Volume'] || 25000;
      sumImpact += r['Environmental Impact'] || 80;
    });

    let congestionLevel = Math.round(sumCongestion / activeRecords.length);
    let avgSpeed = Math.round(sumSpeed / activeRecords.length);
    let trafficVolume = Math.round(sumVolume / activeRecords.length);
    let environmentalImpact = Math.round(sumImpact / activeRecords.length);

    // Apply simulation multipliers if filtering didn't capture specific inputs
    if (filtered.length === 0) {
      if (weather === 'Rain') {
        congestionLevel = Math.min(100, Math.round(congestionLevel * 1.35));
        avgSpeed = Math.max(8, Math.round(avgSpeed * 0.65));
        environmentalImpact = Math.round(environmentalImpact * 1.25);
      } else if (weather === 'Windy' || weather === 'Fog') {
        congestionLevel = Math.min(100, Math.round(congestionLevel * 1.15));
        avgSpeed = Math.max(10, Math.round(avgSpeed * 0.85));
      }

      if (roadwork === 'Yes') {
        congestionLevel = Math.min(100, Math.round(congestionLevel * 1.25));
        avgSpeed = Math.max(8, Math.round(avgSpeed * 0.75));
        environmentalImpact = Math.round(environmentalImpact * 1.15);
      }

      if (dayOfWeek === 'Weekend') {
        // Commercial areas have weekend traffic surges, IT corridors are quiet
        const commercial = ['indiranagar', 'koramangala', 'm.g. road', 'jayanagar'];
        if (commercial.includes(area)) {
          congestionLevel = Math.min(100, Math.round(congestionLevel * 1.15));
          trafficVolume = Math.round(trafficVolume * 1.10);
        } else {
          congestionLevel = Math.round(congestionLevel * 0.70);
          trafficVolume = Math.round(trafficVolume * 0.75);
          avgSpeed = Math.round(avgSpeed * 1.20);
        }
      }
    }

    // Cap values to natural bounds
    congestionLevel = Math.max(5, Math.min(100, congestionLevel));
    avgSpeed = Math.max(5, Math.min(80, avgSpeed));

    let status = 'Serene & Clear';
    if (congestionLevel > 80) status = 'Severe Gridlock';
    else if (congestionLevel > 50) status = 'Heavy Congestion';

    return {
      congestionLevel,
      avgSpeed,
      trafficVolume,
      environmentalImpact,
      status
    };
  }

  // Fallback heuristics for extreme robust resilience
  fallbackHeuristics(area, road, dayOfWeek, weather, roadwork) {
    let baselineCong = 45;
    let baselineSpeed = 32;
    let baselineVol = 22000;
    let baselineImpact = 70;

    // Route-specific configurations
    const cleanRoad = (road || '').toLowerCase();
    if (cleanRoad.includes('silk board') || cleanRoad.includes('hosur')) {
      baselineCong = 85;
      baselineSpeed = 12;
      baselineVol = 58000;
      baselineImpact = 160;
    } else if (cleanRoad.includes('marathahalli') || cleanRoad.includes('whitefield') || cleanRoad.includes('itpl')) {
      baselineCong = 75;
      baselineSpeed = 18;
      baselineVol = 45000;
      baselineImpact = 130;
    } else if (cleanRoad.includes('100 feet') || cleanRoad.includes('sony world')) {
      baselineCong = 70;
      baselineSpeed = 20;
      baselineVol = 38000;
      baselineImpact = 110;
    }

    let congestionLevel = baselineCong;
    let avgSpeed = baselineSpeed;
    let trafficVolume = baselineVol;
    let environmentalImpact = baselineImpact;

    if (weather === 'Rain') {
      congestionLevel = Math.min(100, Math.round(congestionLevel * 1.35));
      avgSpeed = Math.max(8, Math.round(avgSpeed * 0.60));
    }
    if (roadwork === 'Yes') {
      congestionLevel = Math.min(100, Math.round(congestionLevel * 1.25));
      avgSpeed = Math.max(8, Math.round(avgSpeed * 0.70));
    }
    if (dayOfWeek === 'Weekend') {
      const cleanArea = (area || '').toLowerCase();
      if (['indiranagar', 'koramangala', 'm.g. road'].includes(cleanArea)) {
        congestionLevel = Math.min(100, Math.round(congestionLevel * 1.15));
      } else {
        congestionLevel = Math.round(congestionLevel * 0.75);
      }
    }

    let status = 'Serene & Clear';
    if (congestionLevel > 80) status = 'Severe Gridlock';
    else if (congestionLevel > 50) status = 'Heavy Congestion';

    return {
      congestionLevel,
      avgSpeed,
      trafficVolume,
      environmentalImpact,
      status
    };
  }
}

const trafficPredictor = new TrafficPredictor();
export default trafficPredictor;
