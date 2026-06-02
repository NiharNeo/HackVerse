import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { origin, destination, startDate, endDate, budget, people } = req.body;
    
    if (!destination || !startDate || !endDate || !budget || !people) {
      return res.status(400).json({ error: "Missing required fields for trip planning." });
    }

    const apiKey = process.env.NVIDIA_API_KEY;

    if (!apiKey) {
        console.warn("NVIDIA_API_KEY is missing! Using mock response for demonstration.");
        return res.json({
          overview: "Enjoy a mock trip due to missing API key.",
          accommodation: { name: "Mock Hotel", rating: 4.5, description: "A nice place.", pricePerNight: 200 },
          travel: { type: "Flight", cost: 500, details: "Mock Airlines" },
          schedule: [
            { day: 1, title: "Arrival", activities: ["Arrival", "Check-in", "Dinner at mock restaurant"] }
          ]
        });
    }

    const prompt = `
      You are an expert travel planner. The user wants to plan a trip with the following details:
      Starting Location (Origin): ${origin || 'Unknown'}
      Destination: ${destination}
      Start Date: ${startDate}
      End Date: ${endDate}
      Budget: $${budget} (Total budget for the trip)
      Number of People: ${people}

      Consider the Origin when suggesting the cheapest flights or transport. Also consider the expected weather at the Destination during these dates when generating the packing list.

      Create a detailed itinerary. You MUST return ONLY a valid JSON object without any markdown wrapping like \`\`\`json. 
      The JSON object MUST have the following structure:
      {
        "overview": "A short, exciting summary of the trip.",
        "accommodation": {
          "name": "Name of the suggested hotel/stay",
          "rating": 4.5,
          "description": "Brief description of why this is a good choice",
          "pricePerNight": 150
        },
        "travel": {
          "type": "Flight, Train, Bus, or Car",
          "cost": 300,
          "details": "Details about travel (e.g., direct flight from nearest major hub)",
          "cheapestTransport": "Provide the absolute cheapest means of transport to and around the destination"
        },
        "currencyExchange": [
          { "name": "Local Bank or Offline Kiosk", "address": "Approximate central location/street", "tip": "Why use this spot?" }
        ],
        "packingList": [
          "Essential item 1 based on weather/culture",
          "Essential item 2"
        ],
        "localEtiquette": [
          "Tipping rule",
          "Common greeting"
        ],
        "emergencyContacts": {
          "police": "112",
          "ambulance": "112"
        },
        "schedule": [
          {
            "day": 1,
            "title": "Arrival and Exploration",
            "activities": [
              "Morning: Arrive and check-in",
              "Afternoon: Visit famous landmark",
              "Evening: Dinner at recommended local restaurant"
            ]
          }
        ]
      }
    `;

    let response;
    let retries = 3;
    let delay = 2000;
    
    while (retries > 0) {
      try {
        response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "meta/llama-3.1-70b-instruct",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            max_tokens: 2000
          })
        });
        
        if (response.ok) {
          break; // success
        }
        
        // If not ok, throw to trigger retry unless it's a hard error
        if (response.status === 401 || response.status === 403) {
          const errText = await response.text();
          throw new Error(`NVIDIA API Auth Error: ${response.status} ${errText}`);
        }
        
        throw new Error(`NVIDIA API returned ${response.status}`);
      } catch (err) {
        retries--;
        console.warn(`NVIDIA API call failed, retries left: ${retries}. Error: ${err.message}`);
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      }
    }

    if (!response.ok) {
      throw new Error(`NVIDIA API Failed after retries.`);
    }

    const data = await response.json();
    let responseText = data.choices[0].message.content.trim();
    
    // Strip markdown formatting if the model accidentally included it
    if (responseText.startsWith("```json")) {
        responseText = responseText.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (responseText.startsWith("```")) {
        responseText = responseText.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsedData = JSON.parse(responseText);
    res.json(parsedData);
  } catch (error) {
    console.error("Error generating trip plan:", error);
    res.status(500).json({ error: "Failed to generate trip plan.", details: error.message });
  }
});

export default router;
