import express from 'express';
import { planRoute } from '../utils/routePlanner.js';
import trafficPredictor from '../utils/trafficPredictor.js';
import destinations from '../../destinations.json' with { type: 'json' };
import https from 'https';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Invokes the high-performance Python datasets searcher to seek into hotels/destinations/restaurants
function runDatasetSearch(query) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, '../utils/datasetSearcher.py');
    execFile('python3', [scriptPath, query], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Searcher] Error executing datasetSearcher.py:`, error);
        resolve({ hotels: [], attractions: [], restaurants: [] });
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (err) {
        console.error(`[Searcher] Error parsing search output:`, err);
        resolve({ hotels: [], attractions: [], restaurants: [] });
      }
    });
  });
}


const router = express.Router();

// POST /api/route/plan - plans route standard vs AuraPath detours
router.post('/plan', (req, res) => {
  const { startArea, endArea, era, sensory, trafficFilters } = req.body;

  if (!startArea || !endArea) {
    return res.status(400).json({ error: 'Parameters startArea and endArea are required.' });
  }

  const planned = planRoute(
    startArea,
    endArea,
    era || 'all',
    sensory || { acoustics: 0.5, visuals: 0.5, energy: 0.5 },
    trafficPredictor,
    trafficFilters || { dayOfWeek: 'Weekday', weather: 'Clear', roadwork: 'No' }
  );

  res.json(planned);
});

// POST /api/route/predict-traffic - gets traffic forecasts
router.post('/predict-traffic', (req, res) => {
  const { area, road, dayOfWeek, weather, roadwork } = req.body;

  if (!area || !road) {
    return res.status(400).json({ error: 'Parameters area and road are required.' });
  }

  const forecast = trafficPredictor.predictTraffic(
    area,
    road,
    dayOfWeek || 'Weekday',
    weather || 'Clear',
    roadwork || 'No'
  );

  res.json(forecast);
});

// POST /api/dataset/search - return raw CSV search results (hotels, attractions, restaurants)
router.post('/dataset/search', async (req, res) => {
  const { query } = req.body || {};
  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query text is required in request body.' });
  }

  try {
    const results = await runDatasetSearch(query);
    return res.json(results);
  } catch (err) {
    console.error('[Dataset Search] Error:', err);
    return res.status(500).json({ error: 'Dataset search failed.' });
  }
});

// Robust JSON Extraction Parser
function parseLLMJSON(text) {
  let cleaned = text.trim();
  
  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Try to find the json block wrapped in ```json ... ``` or ``` ... ```
    const match = cleaned.match(/```json\s*([\s\S]*?)\s*```/) || cleaned.match(/```\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch (err2) {
        // Fall through
      }
    }
    
    // Find the first '{' and the last '}'
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(cleaned.substring(start, end + 1));
      } catch (err3) {
        // Fall through
      }
    }
    throw err;
  }
}

function normalizePlannerOutput(data, preferredPlan = 'A') {
  if (!data || typeof data !== 'object') {
    throw new Error('Planner response was not a valid object.');
  }

  if (data.plan) {
    return { plan: data.plan };
  }

  if (data.optionA || data.optionB) {
    const selectedKey = preferredPlan === 'B' && data.optionB ? 'optionB' : 'optionA';
    const fallbackKey = selectedKey === 'optionA' && data.optionB ? 'optionB' : 'optionA';
    return { plan: data[selectedKey] || data[fallbackKey] };
  }

  throw new Error('Planner response did not contain a plan.');
}

// Robust HTTPS Request Promise wrapper
function callNvidiaHTTPS(systemPrompt, userPrompt, apiKey, model = 'meta/llama-3.1-70b-instruct') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    const options = {
      hostname: 'integrate.api.nvidia.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 120000 // 120 seconds timeout (plenty of time)
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`NVIDIA API returned status ${res.statusCode}: ${body}`));
        } else {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (err) {
            reject(err);
          }
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('NVIDIA API request timed out after 120 seconds.'));
    });

    req.write(data);
    req.end();
  });
}

// Live NVIDIA LLM Generator
async function callNvidiaLLM(guests, days, bMin, bMax, realm, vibe, description, pool, destination, startDate, searchResults, llmModel) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is not defined in environment variables.');
  }

  // Dynamically inject real hotels, attractions, and restaurants from uploaded datasets
  let seedList = "";
  if (searchResults && (searchResults.hotels.length > 0 || searchResults.attractions.length > 0 || searchResults.restaurants.length > 0)) {
    if (searchResults.hotels.length > 0) {
      seedList += "\n[REAL VERIFIED HOTELS IN TARGET CITY/COUNTRY]\n";
      searchResults.hotels.slice(0, 8).forEach(h => {
        seedList += `- Hotel Name: "${h.name}" (Rating: ${h.rating}, Address: ${h.address}): ${h.description.slice(0, 150)}...\n`;
      });
    }
    if (searchResults.attractions.length > 0) {
      seedList += "\n[REAL VERIFIED ATTRACTIONS IN TARGET CITY/COUNTRY]\n";
      searchResults.attractions.slice(0, 8).forEach(a => {
        seedList += `- Attraction: "${a.name}" (Type: ${a.type}, Country: ${a.country}, Rating: ${a.rating}): ${a.description}\n`;
      });
    }
    if (searchResults.restaurants.length > 0) {
      seedList += "\n[REAL VERIFIED RESTAURANTS IN TARGET CITY/COUNTRY]\n";
      searchResults.restaurants.slice(0, 8).forEach(r => {
        seedList += `- Restaurant: "${r.name}" (Vibe: ${r.vibe}, Address: ${r.address}, Rating: ${r.rating}): ${r.description}\n`;
      });
    }
  } else {
    // Fallback to local pool if search results are empty
    seedList = pool.map(d => {
      return `- [${d.id}] ${d.name} (${d.category}, Area: ${d.area || 'Unknown'}, Vibe: ${d.vibe || 'Unknown'}, PriceTier: ${d.priceTier || '$$'}): ${d.description || ''}`;
    }).slice(0, 15).join('\n');
  }

  const systemPrompt = `You are a bespoke, high-end AI slow-travel concierge planner for the Voyage Elite brand.
Your job is to generate one finalized, fully customized multi-day travel itinerary that best matches the user's request.

Output MUST be a single, valid JSON object containing exactly the key 'plan'.
DO NOT include any introductory or concluding text, explanations, or chat dialogue. Output only the JSON block.

CRITICAL FOR SPEED: Keep all descriptions (for hotel, activities, restaurants, hangouts) and routeInstructions extremely short and concise (strictly maximum 1 to 2 sentences) to ensure extremely fast generation and prevent connection timeouts.

Ensure that:
- Total costs in costSummary are realistic, mathematically correct, and match the budget range limits.
- Hotel cost per night, activities cost, foodCost, cabCost, and dailyAverage are in USD (e.g. $100-$300).
- Days array length equals exactly the duration specified (${days} days).
- In each day, provide:
  - dateLabel: Formatted date string (e.g. "Monday, June 15, 2026") corresponding to the day's date starting from "${startDate || '2026-06-15'}".
  - theme: Short description of the day's focus.
  - activities: A list containing exactly ONE (1) real or highly realistic niche cultural attraction in the requested destination.
  - restaurants: A list containing exactly ONE (1) real or highly realistic restaurant or cafe.
  - hangouts: A list containing exactly ONE (1) quiet hangout spot, walkway, or coffee house.
  - cabTransfer: A structured transfer object containing "cabType" (use "Elite Sedan" for 1-3 guests, "Premium SUV" for 4+ guests), "estimatedFare" (in USD), "pickupTime" (e.g. "09:00 AM"), and "routeDescription" (transfer directions).
  - routeInstructions: A beautiful, concise description of quiet walking/riding directions (maximum 1-2 sentences).

JSON Schema to follow:
{
  "plan": {
    "title": "Final Trip Plan Title",
    "serenityScore": 95,
    "vibe": "Concise trip vibe label",
    "hotel": {
      "name": "Boutique Hotel Name",
      "vibe": "Zen Tranquility",
      "priceTier": "$$$",
      "rating": 4.9,
      "area": "Gion, Kyoto",
      "description": "Short beautiful description of boutique hotel (max 15 words)."
    },
    "days": [
      {
        "dayNumber": 1,
        "dateLabel": "Monday, June 15, 2026",
        "theme": "Arrival & Moss Garden Stroll",
        "activities": [
          {
            "name": "Saiho-ji Moss Temple",
            "vibe": "Spiritual Oasis",
            "description": "Beautiful moss temple with quiet paths (max 15 words).",
            "category": "attraction",
            "rating": 4.8
          }
        ],
        "restaurants": [
          {
            "name": "Gion Karyo",
            "vibe": "Kaiseki Dining",
            "description": "Artisan multi-course dining in a historic wooden townhouse (max 15 words).",
            "category": "restaurant",
            "rating": 4.7
          }
        ],
        "hangouts": [
          {
            "name": "Tatsumi Bridge Canal Walk",
            "vibe": "Scenic Stroll",
            "description": "Willow tree lined canal paths ideal for quiet evenings (max 15 words).",
            "category": "attraction",
            "rating": 4.9
          }
        ],
        "travelOptions": [
          {
            "mode": "Private cab",
            "duration": "20-40 min",
            "estimatedFare": 45,
            "description": "Fast door-to-door transfer with hotel pickup."
          }
        ],
        "cabTransfer": {
          "cabType": "Elite Sedan",
          "estimatedFare": 45,
          "pickupTime": "09:00 AM",
          "routeDescription": "Private sedan transfer from Kyoto Station. Noise: 28dB in-cabin."
        },
        "routeInstructions": "Walk via quiet bamboo avenues to bypass the main street. Ambient noise: 34dB (max 15 words)."
      }
    ],
    "costSummary": {
      "dailyAverage": 280,
      "totalTrip": 1120,
      "hotelCostPerNight": 180,
      "activitiesCost": 60,
      "foodCost": 40,
      "cabCost": 25,
      "guestsCount": ${guests}
    }
  }
}`;

  const userPrompt = `Generate a customized ${days}-day itinerary for ${guests} adult guests.
Destination / Place: ${destination || 'Kyoto, Japan'}
Departure Start Date: ${startDate || '2026-06-15'}
Atmosphere style preference: ${vibe}
Realm sector: ${realm}
User description and dream trip details: "${description}"
Target Daily Budget: $${bMin} to $${bMax} per day.

Database Seeds:
Here is a list of curated local destinations, hotels, and restaurants we have in our database. If the realm is 'bangalore', you MUST strictly plan the trip using real areas (e.g. Indiranagar, Jayanagar, Hebbal, Koramangala) and attractions/hotels from this list:
${seedList}

If the realm is 'global', you MUST prioritize using the real verified hotels, attractions, and restaurants provided in the seeds list above to construct the itineraries for "${destination || 'Kyoto, Japan'}"! This is critical for accurate real-world plans.`;

  const data = await callNvidiaHTTPS(systemPrompt, userPrompt, apiKey, llmModel || 'meta/llama-3.1-70b-instruct');
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) {
    throw new Error('Empty response from NVIDIA Llama model.');
  }

  return normalizePlannerOutput(parseLLMJSON(rawText), days > 4 ? 'B' : 'A');
}

// POST /api/route/ai-plan - AI trip planner providing multiple options, handpicked hotels & stops
router.post('/ai-plan', async (req, res) => {
  const { guests, durationDays, budgetMin, budgetMax, realm, vibe, description, destination, startDate, useLocal, llmProvider, llmModel } = req.body;

  const guestsNum = parseInt(guests) || 2;
  const days = parseInt(durationDays) || 3;
  const bMin = parseFloat(budgetMin) || 100;
  const bMax = parseFloat(budgetMax) || 300;
  const selectedRealm = realm || 'all';
  const selectedVibe = vibe || 'Zen';
  const selectedDest = destination || 'Kyoto, Japan';
  const selectedStart = startDate || '2026-06-15';

  // Resolve 'all' realm dynamically based on destination query text
  let resolvedRealm = selectedRealm;
  if (resolvedRealm === 'all') {
    const destLower = selectedDest.toLowerCase();
    const blrKeywords = ['bangalore', 'bengaluru', 'blr', 'indiranagar', 'koramangala', 'jayanagar', 'm.g. road', 'mg road', 'hebbal', 'yeshwanthpur', 'electronic city', 'whitefield'];
    const isBlr = blrKeywords.some(kw => destLower.includes(kw));
    resolvedRealm = isBlr ? 'bangalore' : 'global';
  }

  // 1. Filter destinations based on resolved realm
  let pool = [...destinations];
  const blrAreas = ['Indiranagar', 'Koramangala', 'Jayanagar', 'M.G. Road', 'Hebbal', 'Yeshwanthpur', 'Electronic City', 'Whitefield'];

  if (resolvedRealm === 'bangalore') {
    pool = pool.filter(d => blrAreas.includes(d.area));
  } else if (resolvedRealm === 'global') {
    pool = pool.filter(d => !blrAreas.includes(d.area));
  }

  // Query the real uploaded datasets for this destination (hotels, attractions, restaurants)
  let searchResults = { hotels: [], attractions: [], restaurants: [] };
  try {
    searchResults = await runDatasetSearch(selectedDest);
    console.log(`[AI Planner] Datasets searched. Found ${searchResults.hotels.length} hotels, ${searchResults.attractions.length} attractions, ${searchResults.restaurants.length} restaurants.`);
  } catch (searchErr) {
    console.error(`[AI Planner] Error during datasets lookup:`, searchErr);
  }

  // Try dynamic LLM synthesis via NVIDIA NIM
  try {
    // Honor explicit local-only request flag: if useLocal === true, bypass external LLM entirely
    if (useLocal === true) {
      console.log(`[AI Planner] useLocal flag detected in request. Forcing local dataset-based planner for: "${selectedDest}".`);
    } else if (process.env.NVIDIA_API_KEY) {
      console.log(`[AI Planner] Dynamic synthesis initiated using NVIDIA provider for destination: "${selectedDest}" (resolved realm: ${resolvedRealm})... Provider:${llmProvider || 'nvidia'} Model:${llmModel || 'default'}`);
      const aiResponse = await callNvidiaLLM(guestsNum, days, bMin, bMax, resolvedRealm, selectedVibe, description || '', pool, selectedDest, selectedStart, searchResults, llmModel);
      console.log(`[AI Planner] Dynamic synthesis successfully completed via remote LLM!`);
      return res.json(aiResponse);
    } else {
      console.warn(`[AI Planner] NVIDIA_API_KEY missing from server environment. Using fast local mock heuristics...`);
    }
  } catch (err) {
    console.error(`[AI Planner] Error during live LLM synthesis, falling back to local heuristics:`, err.message);
  }

  // Split pool into hotels and attractions
  const hotelsPool = pool.filter(d => d.category === 'hotel');
  const attractionsPool = pool.filter(d => d.category !== 'hotel');

  // Filter hotels by budget matching
  const matchingHotels = hotelsPool.filter(h => {
    let priceVal = 100;
    if (h.priceTier === '$') priceVal = 40;
    else if (h.priceTier === '$$') priceVal = 120;
    else if (h.priceTier === '$$$') priceVal = 240;
    else if (h.priceTier === '$$$$') priceVal = 450;
    
    return priceVal >= bMin * 0.3 && priceVal <= bMax * 1.2;
  });

  const selectedHotel = matchingHotels.find(h => h.vibe.toLowerCase().includes(selectedVibe.toLowerCase())) || matchingHotels[0] || hotelsPool[0];

  const optionA = generateItinerary(
    'A',
    selectedHotel,
    attractionsPool,
    days,
    guestsNum,
    selectedVibe,
    resolvedRealm,
    bMin,
    bMax,
    selectedStart,
    searchResults
  );

  const optionB = generateItinerary(
    'B',
    selectedHotel,
    attractionsPool,
    days,
    guestsNum,
    selectedVibe,
    resolvedRealm,
    bMin,
    bMax,
    selectedStart,
    searchResults
  );

  const preferredPlanKey = /heritage|classic|history|culture|monument|architecture/i.test(`${selectedVibe} ${description || ''} ${selectedDest}`) ? 'B' : 'A';
  const plan = preferredPlanKey === 'B' ? optionB : optionA;

  res.json({ plan });
});

// Helper function to synthesize itineraries
function generateItinerary(type, hotel, attractions, days, guests, selectedVibe, realm, bMin, bMax, startDate, customData) {
  const isA = type === 'A';
  
  // Use custom hotel if available in customData
  let selectedHotel = hotel;
  if (customData && customData.hotels && customData.hotels.length > 0) {
    const rawH = customData.hotels[type === 'A' ? 0 : Math.min(1, customData.hotels.length - 1)];
    selectedHotel = {
      name: rawH.name,
      rating: rawH.rating === 'FiveStar' ? 5.0 : rawH.rating === 'FourStar' ? 4.0 : 3.0,
      vibe: rawH.facilities ? rawH.facilities.slice(0, 80) + "..." : 'Premium Boutique Stay',
      priceTier: rawH.rating === 'FiveStar' ? '$$$$' : rawH.rating === 'FourStar' ? '$$$' : '$$',
      area: rawH.address
    };
  }

  // Use custom attractions if available in customData
  let sortedAttractions = [];
  if (customData && customData.attractions && customData.attractions.length > 0) {
    sortedAttractions = customData.attractions.map(a => ({
      name: a.name,
      vibe: a.type || 'Sightseeing',
      description: a.description,
      rating: a.rating || 4.5
    }));
  } else {
    sortedAttractions = [...attractions];
  }
  
  if (isA) {
    sortedAttractions.sort((a, b) => (a.sensory?.acoustics || 0.5) - (b.sensory?.acoustics || 0.5));
  } else {
    sortedAttractions.sort((a, b) => b.rating - a.rating);
  }

  const start = startDate ? new Date(startDate) : new Date("2026-06-15");
  const itineraryDays = [];
  let stopIdx = 0;

  for (let d = 1; d <= days; d++) {
    const stopsForDay = [];
    for (let s = 0; s < 2; s++) {
      if (sortedAttractions.length > 0) {
        const match = sortedAttractions[stopIdx % sortedAttractions.length];
        stopsForDay.push(match);
        stopIdx++;
      }
    }

    // Format current date
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + (d - 1));
    const dateLabel = currentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Construct activities, restaurants, hangouts
    const activities = stopsForDay.map(s => ({
      name: s.name,
      vibe: s.vibe || 'Cultural Sight',
      description: s.description || 'Curated historic slow-travel sightseeing landmark.',
      rating: s.rating || 4.5
    }));

    const mockRestaurants = [
      { name: 'Kaviar Boutique Grill', vibe: 'Fine Gastronomy', description: 'Handpicked local dining room offering farm-to-table organic delights.', rating: 4.8 },
      { name: 'Aura Organic Bistro', vibe: 'Tranquil Dining', description: 'Peaceful garden cafe known for artisan bread, locally-sourced salads, and silent acoustics.', rating: 4.7 }
    ];

    const mockHangouts = [
      { name: 'Whispering Willow Alley', vibe: 'Cozy Lane Stroll', description: 'Scenic side street lined with old cherry trees and vintage independent bookstores.', rating: 4.9 },
      { name: 'Lotus Pond Tea House', vibe: 'Zen Lounge', description: 'Traditional teahouse offering premium green tea blends and calm seating areas overlooking water.', rating: 4.8 }
    ];

    const travelOptions = [
      {
        mode: 'Private cab',
        duration: '20-40 min',
        estimatedFare: 28 + (d * 4),
        description: 'Fastest door-to-door transfer with hotel pickup.'
      },
      {
        mode: 'Metro / rail',
        duration: '30-55 min',
        estimatedFare: Math.max(3, 6 + d),
        description: 'Best value for busy hours and longer cross-city hops.'
      },
      {
        mode: 'Walk + short transfer',
        duration: '15-25 min',
        estimatedFare: 0,
        description: 'Ideal for nearby attractions, cafes, and quiet streets.'
      }
    ];

    let dailyRestaurants = [mockRestaurants[(stopIdx) % 2]];
    if (customData && customData.restaurants && customData.restaurants.length > 0) {
      const rest = customData.restaurants[(d - 1) % customData.restaurants.length];
      dailyRestaurants = [{
        name: rest.name,
        vibe: rest.vibe || 'Culinary Experience',
        description: rest.description,
        rating: rest.rating || 4.5
      }];
    }

    const cabType = guests <= 3 ? 'Elite Sedan' : 'Premium SUV';
    const estimatedFare = 30 + Math.round(Math.random() * 20);

    itineraryDays.push({
      dayNumber: d,
      dateLabel,
      theme: d === 1 ? 'Arrival & Orientation' : d === days ? 'Tranquil Departure' : 'Sanctuary Discovery',
      activities,
      restaurants: dailyRestaurants,
      hangouts: [mockHangouts[(stopIdx) % 2]],
        travelOptions,
      cabTransfer: {
        cabType,
        estimatedFare,
        pickupTime: d === 1 ? '10:00 AM' : '09:00 AM',
        routeDescription: `Scheduled pickup. Direct transfer via uncrowded lanes. Noise level: 32dB in-cabin.`
      },
      routeInstructions: isA 
        ? `Walk via quiet, uncrowded bypass alleys to avoid local gridlocks. Ambient noise level: 36dB.`
        : `Take the grand heritage avenues featuring historical architectures. Ambient noise level: 55dB.`
    });
  }

  let hotelPrice = 120;
  if (selectedHotel) {
    if (selectedHotel.priceTier === '$') hotelPrice = 45;
    else if (selectedHotel.priceTier === '$$') hotelPrice = 110;
    else if (selectedHotel.priceTier === '$$$') hotelPrice = 220;
    else if (selectedHotel.priceTier === '$$$$') hotelPrice = 410;
  }
  
  const dailyStayCost = hotelPrice * guests;
  const activitiesCost = 30 * guests;
  const foodCost = 45 * guests;
  const cabCost = 25 * guests;
  const dailyTotal = dailyStayCost + activitiesCost + foodCost + cabCost;

  return {
    title: isA ? 'Zen Sanctuary Detour Route' : 'Classical Heritage Pulse Route',
    serenityScore: isA ? 98 : 84,
    vibe: isA ? 'Tranquil Sanctuary Vibe' : 'Grand Heritage Vibe',
    hotel: selectedHotel || { name: 'Aura Premium Boutique Inn', priceTier: '$$$', rating: 4.8, vibe: 'Cozy retreat' },
    days: itineraryDays,
    costSummary: {
      dailyAverage: Math.round(dailyTotal),
      totalTrip: Math.round(dailyTotal * days),
      hotelCostPerNight: Math.round(dailyStayCost),
      activitiesCost: Math.round(activitiesCost * days),
      foodCost: Math.round(foodCost * days),
      cabCost: Math.round(cabCost * days),
      guestsCount: guests
    }
  };
}

export default router;
