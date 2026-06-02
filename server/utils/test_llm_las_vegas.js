import destinations from '../../destinations.json' with { type: 'json' };

const apiKey = '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';
const url = 'https://integrate.api.nvidia.com/v1/chat/completions';

async function testLlamaCall() {
  console.log("Preparing Llama call...");
  const pool = destinations.slice(0, 20);
  const seedList = pool.map(d => {
    return `- [${d.id}] ${d.name} (${d.category}, Area: ${d.area || 'Unknown'}, Vibe: ${d.vibe || 'Unknown'}, PriceTier: ${d.priceTier || '$$'}): ${d.description || ''}`;
  }).join('\n');

  const systemPrompt = `You are a bespoke, high-end AI slow-travel concierge planner for the Voyage Elite brand.
Your job is to generate two distinct, fully customized multi-day travel itineraries.
The two itineraries are:
1. **Option A (Zen Sanctuary Detour)**: High serenity focus (quiet acoustics, uncrowded paths, slow pace, peaceful boutique stays).
2. **Option B (Classical Heritage Trail)**: Chronological heritage walks, grand architecture, monuments, historic highlights.

Output MUST be a single, valid JSON object containing exactly the keys 'optionA' and 'optionB'.
DO NOT include any introductory or concluding text, explanations, or chat dialogue. Output only the JSON block.

JSON Schema to follow:
{
  "optionA": {
    "title": "Zen Sanctuary Detour Route",
    "serenityScore": 95,
    "vibe": "Tranquil Sanctuary Vibe",
    "hotel": {
      "name": "Boutique Hotel Name",
      "vibe": "Zen Tranquility",
      "priceTier": "$$$",
      "rating": 4.9,
      "area": "Gion, Kyoto",
      "description": "Short beautiful description of boutique hotel"
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
            "description": "Beautiful moss temple with quiet paths.",
            "category": "attraction",
            "rating": 4.8
          }
        ],
        "restaurants": [
          {
            "name": "Gion Karyo",
            "vibe": "Kaiseki Dining",
            "description": "Artisan multi-course dining in a historic wooden townhouse.",
            "category": "restaurant",
            "rating": 4.7
          }
        ],
        "hangouts": [
          {
            "name": "Tatsumi Bridge Canal Walk",
            "vibe": "Scenic Stroll",
            "description": "Willow tree lined canal paths ideal for quiet evenings.",
            "category": "attraction",
            "rating": 4.9
          }
        ],
        "cabTransfer": {
          "cabType": "Elite Sedan",
          "estimatedFare": 45,
          "pickupTime": "09:00 AM",
          "routeDescription": "Private sedan transfer from Kyoto Station. Noise: 28dB in-cabin."
        },
        "routeInstructions": "Walk via quiet bamboo avenues to bypass the main street. Ambient noise: 34dB."
      }
    ],
    "costSummary": {
      "dailyAverage": 280,
      "totalTrip": 1120,
      "hotelCostPerNight": 180,
      "activitiesCost": 60,
      "foodCost": 40,
      "cabCost": 25,
      "guestsCount": 2
    }
  },
  "optionB": {
    // Same schema but for Option B: Classical Heritage Trail
  }
}`;

  const userPrompt = `Generate a customized 2-day itinerary for 2 adult guests.
Destination / Place: Las Vegas, USA
Departure Start Date: 2026-07-10
Atmosphere style preference: Zen
Realm sector: global
User description and dream trip details: "We want a relaxed, high-end trip to Las Vegas, focusing on high-quality boutique hotels and excellent dining."
Target Daily Budget: $150 to $400 per day.

Database Seeds:
${seedList}`;

  console.log("Sending POST fetch...");
  const start = Date.now();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 1500
      })
    });

    console.log(`Fetch resolved in ${((Date.now() - start)/1000).toFixed(2)}s with status ${response.status}`);
    
    if (!response.ok) {
      console.error("Error body:", await response.text());
      return;
    }

    const data = await response.json();
    console.log("Success! Choices length:", data.choices?.length);
    console.log("Content start:\n", data.choices?.[0]?.message?.content?.slice(0, 300));
  } catch (err) {
    console.error("Fetch threw error:", err);
  }
}

testLlamaCall();
