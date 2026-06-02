import React, { useState, useEffect } from 'react';
import SensorySliders from './components/SensorySliders';
import InteractiveMap from './components/InteractiveMap';
import ComparisonPanel from './components/ComparisonPanel';
import ThenAndNow from './components/ThenAndNow';
import AnalyticsPredictor from './components/AnalyticsPredictor';
import AITripPlanner from './components/AITripPlanner';
import DestinationCard from './components/DestinationCard';
import { jsPDF } from 'jspdf';

import trafficPredictor from './utils/trafficPredictor';
import { planRoute, INTERSECTIONS } from './utils/routePlanner';
import staticDestinations from '../destinations.json';

export default function App() {
  // A. Page Routing State
  const [currentPage, setCurrentPage] = useState('ai-planner'); // 'home', 'search', 'detail', 'audio', 'bookings', 'about', 'ai-planner'
  const [destinations, setDestinations] = useState(staticDestinations);
  const [selectedDest, setSelectedDest] = useState(staticDestinations[0] || null);

  // B. Search, Map, & Route Planning State
  const [startArea, setStartArea] = useState('Indiranagar');
  const [endArea, setEndArea] = useState('M.G. Road');
  const [currentEra, setCurrentEra] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sensory, setSensory] = useState({
    acoustics: 0.20,
    visuals: 0.50,
    energy: 0.30
  });

  const [trafficFilters, setTrafficFilters] = useState({
    dayOfWeek: 'Weekday',
    weather: 'Clear',
    roadwork: 'No'
  });

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [routes, setRoutes] = useState(null);

  // Onboarding Concierge States
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [userName, setUserName] = useState('');
  const [onboardingDestType, setOnboardingDestType] = useState('all'); // 'bangalore', 'global', 'all'
  const [conciergeRecommendations, setConciergeRecommendations] = useState([]);
  const [isConciergeLoading, setIsConciergeLoading] = useState(false);

  // At Destination Live Guide States
  const [isLiveAtDestination, setIsLiveAtDestination] = useState(false);

  // D. AI Trip Planner States
  const [aiPrompt, setAiPrompt] = useState('Quiet hotels, memorable food, short transfers, and a relaxed pace.');
  const [aiGuests, setAiGuests] = useState(3);
  const [aiDays, setAiDays] = useState(4);
  const [aiBudget, setAiBudget] = useState(1200);
  const [aiRealm, setAiRealm] = useState('global');
  const [aiVibe, setAiVibe] = useState('Zen');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDestination, setAiDestination] = useState('Kyoto, Japan');
  const [aiStartDate, setAiStartDate] = useState('2026-06-15');
  const [tripFeedback, setTripFeedback] = useState({
    hotel: 4,
    transport: 4,
    restaurants: 4,
    activities: 4,
    note: ''
  });
  const [autoReport, setAutoReport] = useState(null);
  const [reportGeneratedAt, setReportGeneratedAt] = useState('');
  const [aiMode, setAiMode] = useState('local'); // 'local' or 'llm'
  const [aiModel, setAiModel] = useState('meta/llama-3.1-70b-instruct');
  
  // Cab Booking states
  const [showCabModal, setShowCabModal] = useState(false);
  const [selectedCabTransfer, setSelectedCabTransfer] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // C. Audio Guide Player State Heuristics
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(134); // in seconds (2:14)
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [confirmedBookings, setConfirmedBookings] = useState([]);
  const [mlRecommendations, setMlRecommendations] = useState([]);
  const [isMlLoading, setIsMlLoading] = useState(false);

  const audioChapters = [
    { title: "1. The Gleaming Reflection", desc: "Origins of Kinkaku-ji & Ashikaga Yoshimitsu", length: "12:45", seconds: 765 },
    { title: "2. Harmony of Styles", desc: "Shinden, Samurai, and Zen architecture.", length: "08:30", seconds: 510 },
    { title: "3. The Fire of 1950", desc: "Tragedy and meticulous reconstruction.", length: "10:15", seconds: 615 },
    { title: "4. The Pure Land Garden", desc: "Strolling through the Muromachi landscape.", length: "09:20", seconds: 560 },
    { title: "5. Sekkatei Teahouse", desc: "A quiet conclusion in the evening light.", length: "05:10", seconds: 310 }
  ];

  const bangaloreChapters = [
    { title: "1. Kempe Gowda Mud Fort", desc: "Slab-stone gateways & 1537 city foundations.", length: "08:40", seconds: 520 },
    { title: "2. The Cantonment Avenue Walk", desc: "Victorian colonial churches & military barracks.", length: "11:15", seconds: 675 },
    { title: "3. Jacaranda Sunset Stroll", desc: "Bougainvillea bungalows of the 1970s garden city.", length: "07:50", seconds: 470 }
  ];

  const bangaloreAreas = ['Indiranagar', 'Koramangala', 'Jayanagar', 'M.G. Road', 'Hebbal', 'Yeshwanthpur', 'Electronic City', 'Whitefield'];
  const areas = bangaloreAreas;

  const resolveRealmFromDestination = (destinationText) => {
    const destLower = (destinationText || '').toLowerCase();
    const blrKeywords = ['bangalore', 'bengaluru', 'blr', 'indiranagar', 'koramangala', 'jayanagar', 'm.g. road', 'mg road', 'hebbal', 'yeshwanthpur', 'electronic city', 'whitefield'];
    return blrKeywords.some(kw => destLower.includes(kw)) ? 'bangalore' : 'global';
  };

  const getDailyBudgetRange = (totalBudget, days) => {
    const safeDays = Math.max(1, days || 1);
    const dailyBudget = Math.max(50, Math.round((totalBudget || 0) / safeDays));
    return {
      budgetMin: Math.max(50, Math.round(dailyBudget * 0.85)),
      budgetMax: Math.max(75, Math.round(dailyBudget * 1.15)),
      dailyBudget
    };
  };

  const analyzeTripFeedback = (feedback) => {
    const ratings = [feedback.hotel, feedback.transport, feedback.restaurants, feedback.activities].map(value => Number(value) || 0);
    const averageScore = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;

    let sentiment = 'Mixed';
    if (averageScore >= 4.5) sentiment = 'Excellent';
    else if (averageScore >= 3.8) sentiment = 'Positive';
    else if (averageScore >= 3.0) sentiment = 'Needs attention';

    const strengths = [];
    const concerns = [];

    if ((feedback.hotel || 0) >= 4) strengths.push('Hotel stay matched the plan');
    else concerns.push('Hotel stay may need a better match');

    if ((feedback.transport || 0) >= 4) strengths.push('Transport choices were convenient');
    else concerns.push('Transport times or comfort need tuning');

    if ((feedback.restaurants || 0) >= 4) strengths.push('Dining recommendations landed well');
    else concerns.push('Restaurant suggestions need refinement');

    if ((feedback.activities || 0) >= 4) strengths.push('Activities fit the travel style');
    else concerns.push('Activity pacing or variety could improve');

    return {
      averageScore: Number(averageScore.toFixed(1)),
      sentiment,
      strengths: strengths.length > 0 ? strengths : ['The trip plan stayed balanced overall'],
      concerns: concerns.length > 0 ? concerns : ['No major issues reported']
    };
  };

  const buildAutoReport = (plan, feedback, destination, startDate) => {
    if (!plan) return null;

    const feedbackAnalysis = analyzeTripFeedback(feedback);
    const hotelName = plan.hotel?.name || 'Selected hotel';
    const dayCount = plan.days?.length || aiDays;
    const totalCost = plan.costSummary?.totalTrip || 0;
    const dailyAverage = plan.costSummary?.dailyAverage || 0;
    const firstDay = plan.days?.[0]?.dateLabel || startDate || 'the start date';
    const lastDay = plan.days?.[dayCount - 1]?.dateLabel || 'the end date';

    const reportLines = [
      `Trip Report for ${destination || 'your destination'}`,
      `Plan: ${plan.title || 'AI-generated itinerary'}`,
      `Duration: ${dayCount} days (${firstDay} to ${lastDay})`,
      `Hotel: ${hotelName}`,
      `Estimated Cost: $${totalCost} total, about $${dailyAverage} per day`,
      `Feedback Score: ${feedbackAnalysis.averageScore}/5 (${feedbackAnalysis.sentiment})`,
      '',
      'Highlights:',
      ...feedbackAnalysis.strengths.map(item => `- ${item}`),
      '',
      'Improvement Notes:',
      ...feedbackAnalysis.concerns.map(item => `- ${item}`),
      ...(feedback.note ? ['', 'User Note:', `- ${feedback.note}`] : []),
      '',
      'Recommended Next Action:',
      feedbackAnalysis.averageScore >= 4
        ? 'This plan is ready to reuse with only minor adjustments.'
        : 'Adjust hotel selection, transport pacing, or dining choices before the next trip.'
    ];

    return {
      generatedAt: new Date().toLocaleString(),
      feedbackAnalysis,
      reportText: reportLines.join('\n')
    };
  };

  const isBangalore = selectedDest && bangaloreAreas.includes(selectedDest.area);
  const activeChaptersList = isBangalore ? bangaloreChapters : audioChapters;
  const currentChapter = activeChaptersList[activeChapterIdx] || activeChaptersList[0];

  // D. CSV Traffic Loading & Setup (Client-side fallback loader)
  useEffect(() => {
    async function loadData() {
      try {
        await trafficPredictor.loadDataset();
        setIsDataLoaded(true);
        console.log("Traffic predictor loaded successfully.");
      } catch (err) {
        console.error("Failed to load traffic dataset:", err);
      }
    }
    loadData();
  }, []);

  // Fetch destinations from server on load
  useEffect(() => {
    let active = true;
    async function fetchDestinations() {
      try {
        const response = await fetch('http://localhost:5001/api/destinations');
        if (!response.ok) {
          throw new Error('Server returned status ' + response.status);
        }
        const data = await response.json();
        if (active && data && data.length > 0) {
          setDestinations(data);
          setSelectedDest(prev => {
            if (prev) {
              const matched = data.find(d => d.id === prev.id);
              return matched || data[0];
            }
            return data[0];
          });
        }
      } catch (err) {
        console.warn("Failed to fetch destinations from server, using local fallback:", err);
      }
    }
    fetchDestinations();
    return () => {
      active = false;
    };
  }, []);

  // Fetch filtered destinations when search or filters change
  useEffect(() => {
    let active = true;
    async function fetchFiltered() {
      try {
        const queryParams = new URLSearchParams();
        if (selectedCategory && selectedCategory !== 'all') {
          queryParams.append('category', selectedCategory);
        }
        if (currentEra && currentEra !== 'all') {
          queryParams.append('era', currentEra);
        }
        if (searchQuery && searchQuery.trim() !== '') {
          queryParams.append('query', searchQuery);
        }

        const response = await fetch(`http://localhost:5001/api/destinations?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error('Server returned status ' + response.status);
        }
        const data = await response.json();
        if (active) {
          setDestinations(data);
        }
      } catch (err) {
        console.warn("Failed to fetch filtered destinations from server, using local client filtering fallback:", err);
        if (active) {
          let local = [...staticDestinations];
          if (selectedCategory && selectedCategory !== 'all') {
            local = local.filter(d => d.category === selectedCategory);
          }
          if (currentEra && currentEra !== 'all') {
            local = local.filter(d => d.era === currentEra);
          }
          if (searchQuery && searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase().trim();
            local = local.filter(d => 
              d.name.toLowerCase().includes(q) || 
              d.area.toLowerCase().includes(q) || 
              d.vibe.toLowerCase().includes(q)
            );
          }
          setDestinations(local);
        }
      }
    }
    fetchFiltered();
    return () => {
      active = false;
    };
  }, [selectedCategory, currentEra, searchQuery]);

  // E. Route Heuristics Planner (REST API Fetch with client-side fallback)
  useEffect(() => {
    let active = true;
    async function fetchPlannedRoute() {
      try {
        const response = await fetch('http://localhost:5001/api/route/plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            startArea,
            endArea,
            era: currentEra,
            sensory,
            trafficFilters
          })
        });

        if (!response.ok) {
          throw new Error('Server returned status ' + response.status);
        }

        const data = await response.json();
        if (active) {
          setRoutes(data);
        }
      } catch (err) {
        console.warn("Backend route planner offline/failed, falling back to client-side Dijkstra calculations:", err);
        if (active && isDataLoaded) {
          const planned = planRoute(
            startArea,
            endArea,
            currentEra,
            sensory,
            trafficPredictor,
            trafficFilters
          );
          setRoutes(planned);
        }
      }
    }
    fetchPlannedRoute();
    return () => {
      active = false;
    };
  }, [startArea, endArea, currentEra, sensory, trafficFilters, isDataLoaded]);

  // Handlers for sliders and filters
  const handleSensoryChange = (field, val) => {
    setSensory(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleTrafficFilterChange = (field, val) => {
    setTrafficFilters(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleGenerateRecommendations = async () => {
    setIsConciergeLoading(true);
    setOnboardingStep(4);
    try {
      const response = await fetch('/api/destinations/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          acoustics: sensory.acoustics,
          energy: sensory.energy,
          category: 'all',
          era: 'all'
        })
      });

      if (!response.ok) {
        throw new Error('Server error');
      }

      let data = await response.json();
      
      if (onboardingDestType === 'bangalore') {
        const blrAreas = ['Indiranagar', 'Koramangala', 'Jayanagar', 'M.G. Road', 'Hebbal', 'Yeshwanthpur', 'Electronic City', 'Whitefield'];
        data = data.filter(d => blrAreas.includes(d.area));
      } else if (onboardingDestType === 'global') {
        const blrAreas = ['Indiranagar', 'Koramangala', 'Jayanagar', 'M.G. Road', 'Hebbal', 'Yeshwanthpur', 'Electronic City', 'Whitefield'];
        data = data.filter(d => !blrAreas.includes(d.area));
      }

      setConciergeRecommendations(data);
    } catch (err) {
      console.warn("Concierge recommendation API failed, using client fallback ranking:", err);
      let pool = [...staticDestinations];
      if (onboardingDestType === 'bangalore') {
        const blrAreas = ['Indiranagar', 'Koramangala', 'Jayanagar', 'M.G. Road', 'Hebbal', 'Yeshwanthpur', 'Electronic City', 'Whitefield'];
        pool = pool.filter(d => blrAreas.includes(d.area));
      } else if (onboardingDestType === 'global') {
        const blrAreas = ['Indiranagar', 'Koramangala', 'Jayanagar', 'M.G. Road', 'Hebbal', 'Yeshwanthpur', 'Electronic City', 'Whitefield'];
        pool = pool.filter(d => !blrAreas.includes(d.area));
      }

      const scored = pool.map(dest => {
        let score = 0;
        if (dest.sensory) {
          score += (1 - Math.abs((dest.sensory.acoustics || 0.5) - sensory.acoustics)) * 1.5;
          score += (1 - Math.abs((dest.sensory.energy || 0.5) - sensory.energy)) * 1.5;
        } else {
          score = 1.0;
        }
        return { ...dest, matchScore: score };
      }).sort((a, b) => b.matchScore - a.matchScore);

      setConciergeRecommendations(scored);
    } finally {
      setIsConciergeLoading(false);
    }
  };

  const handleGenerateAiPlan = async () => {
    setAiLoading(true);
    try {
      const budgetRange = getDailyBudgetRange(aiBudget, aiDays);
      const resolvedRealm = aiRealm === 'all' ? resolveRealmFromDestination(aiDestination) : aiRealm;

      const response = await fetch('/api/route/ai-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          guests: aiGuests,
          durationDays: aiDays,
          budgetMin: budgetRange.budgetMin,
          budgetMax: budgetRange.budgetMax,
          realm: resolvedRealm,
          vibe: aiVibe,
          description: aiPrompt,
          destination: aiDestination,
          startDate: aiStartDate
          ,
          useLocal: aiMode === 'local',
          llmProvider: aiMode === 'llm' ? 'nvidia' : undefined,
          llmModel: aiMode === 'llm' ? aiModel : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Server returned error status ' + response.status);
      }

      const data = await response.json();
      setAiResult(data);
    } catch (err) {
      console.warn("AI trip planner API failed, generating client fallback itineraries:", err);
      let pool = [...staticDestinations];
      const budgetRange = getDailyBudgetRange(aiBudget, aiDays);
      let resolvedRealm = aiRealm === 'all' ? resolveRealmFromDestination(aiDestination) : aiRealm;

      if (resolvedRealm === 'bangalore') {
        pool = pool.filter(d => bangaloreAreas.includes(d.area));
      } else if (resolvedRealm === 'global') {
        pool = pool.filter(d => !bangaloreAreas.includes(d.area));
      }

      const hotelsPool = pool.filter(d => d.category === 'hotel');
      const attractionsPool = pool.filter(d => d.category !== 'hotel');

      const matchingHotels = hotelsPool.filter(h => {
        let priceVal = 100;
        if (h.priceTier === '$') priceVal = 40;
        else if (h.priceTier === '$$') priceVal = 120;
        else if (h.priceTier === '$$$') priceVal = 240;
        else if (h.priceTier === '$$$$') priceVal = 450;
        return priceVal >= budgetRange.budgetMin * 0.3 && priceVal <= budgetRange.budgetMax * 1.2;
      });

      const selectedHotel = matchingHotels.find(h => h.vibe.toLowerCase().includes(aiVibe.toLowerCase())) || matchingHotels[0] || hotelsPool[0];

      const makeItinerary = (isA) => {
        let sortedAttractions = [...attractionsPool];
        if (isA) {
          sortedAttractions.sort((a, b) => (a.sensory?.acoustics || 0.5) - (b.sensory?.acoustics || 0.5));
        } else {
          sortedAttractions.sort((a, b) => b.rating - a.rating);
        }

        const itineraryDays = [];
        let stopIdx = 0;
        const start = aiStartDate ? new Date(aiStartDate) : new Date("2026-06-15");

        for (let d = 1; d <= aiDays; d++) {
          const stopsForDay = [];
          for (let s = 0; s < 2; s++) {
            if (sortedAttractions.length > 0) {
              const match = sortedAttractions[stopIdx % sortedAttractions.length];
              stopsForDay.push(match);
              stopIdx++;
            }
          }

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
              estimatedFare: Math.max(18, 24 + (d * 4)),
              description: 'Fastest door-to-door ride with AC and hotel pickup.'
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

          const cabType = aiGuests <= 3 ? 'Elite Sedan' : 'Premium SUV';
          const estimatedFare = 30 + Math.round(Math.random() * 20);

          itineraryDays.push({
            dayNumber: d,
            dateLabel,
            theme: d === 1 ? 'Arrival & Orientation' : d === aiDays ? 'Tranquil Departure' : 'Sanctuary Discovery',
            activities,
            restaurants: [mockRestaurants[(stopIdx) % 2]],
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
        
        const dailyStayCost = hotelPrice * aiGuests;
        const activitiesCost = 30 * aiGuests;
        const foodCost = 45 * aiGuests;
        const cabCost = 25 * aiGuests;
        const dailyTotal = dailyStayCost + activitiesCost + foodCost + cabCost;

        return {
          title: isA ? 'Zen Sanctuary Detour Route (Fallback)' : 'Classical Heritage Pulse Route (Fallback)',
          serenityScore: isA ? 97 : 82,
          vibe: isA ? 'Tranquil Sanctuary Vibe' : 'Grand Heritage Vibe',
          hotel: selectedHotel || { name: 'Aura Premium Boutique Inn', priceTier: '$$$', rating: 4.8, vibe: 'Cozy retreat' },
          days: itineraryDays,
          costSummary: {
            dailyAverage: Math.round(dailyTotal),
            totalTrip: Math.round(dailyTotal * aiDays),
            hotelCostPerNight: Math.round(dailyStayCost),
            activitiesCost: Math.round(activitiesCost * aiDays),
            foodCost: Math.round(foodCost * aiDays),
            cabCost: Math.round(cabCost * aiDays),
            guestsCount: aiGuests
          }
        };
      };

      const preferredPlan = /heritage|classic|history|culture|monument|architecture/i.test(`${aiVibe} ${aiPrompt} ${aiDestination}`)
        ? makeItinerary(false)
        : makeItinerary(true);

      setAiResult({
        plan: preferredPlan
      });
    } finally {
      setAiLoading(false);
    }
  };

  // F. Audio Guides Timer Simulation
  useEffect(() => {
    let interval;
    if (isPlaying && currentChapter) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= currentChapter.seconds) {
            setIsPlaying(false);
            return currentChapter.seconds;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentChapter]);

  // Audio Guide Text-to-Speech (TTS)
  useEffect(() => {
    if (currentPage === 'audio') {
      if (isPlaying) {
        window.speechSynthesis.cancel(); // Clear any ongoing speech
        const textToSpeak = `${currentChapter.title}. ${currentChapter.desc}. ${selectedDest ? selectedDest.description : ''}`;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
      } else {
        window.speechSynthesis.pause();
      }
    } else {
      window.speechSynthesis.cancel();
    }
    return () => window.speechSynthesis.cancel();
  }, [isPlaying, currentChapter, currentPage, selectedDest]);

  // H. Fetch ML Recommendations
  useEffect(() => {
    const fetchMlRecommendations = async () => {
      if (currentPage !== 'home') return;
      setIsMlLoading(true);
      try {
        const res = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acoustics: sensory.acoustics, energy: sensory.energy })
        });
        const data = await res.json();
        if (data.recommendations) {
          // Map scores to actual destination objects
          const enriched = data.recommendations
            .map(rec => {
              const destObj = destinations.find(d => d.id === rec.id);
              return destObj ? { ...destObj, mlScore: Math.round(rec.score * 100) } : null;
            })
            .filter(Boolean)
            .slice(0, 3);
          setMlRecommendations(enriched);
        }
      } catch (err) {
        console.error("Failed to fetch ML recommendations:", err);
      } finally {
        setIsMlLoading(false);
      }
    };
    fetchMlRecommendations();
  }, [sensory.acoustics, sensory.energy, currentPage]);

  // I. Format Seconds to MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const aiBudgetRange = getDailyBudgetRange(aiBudget, aiDays);
  const activeAiPlan = aiResult?.plan || aiResult?.optionA || aiResult?.optionB || null;
  const feedbackAnalysis = analyzeTripFeedback(tripFeedback);

  const handleGenerateAutoReport = () => {
    if (!activeAiPlan) return;

    const report = buildAutoReport(activeAiPlan, tripFeedback, aiDestination, aiStartDate);
    setAutoReport(report);
    setReportGeneratedAt(report?.generatedAt || '');
  };

  const handleDownloadAutoReport = () => {
    if (!autoReport?.reportText) return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const maxWidth = pageWidth - margin * 2;
    let cursorY = 56;

    doc.setFillColor(0, 45, 64);
    doc.rect(0, 0, pageWidth, 92, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Trip Report', margin, 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(autoReport.generatedAt ? `Generated ${autoReport.generatedAt}` : 'Generated automatically from the AI planner', margin, 58);

    doc.setTextColor(25, 28, 29);
    cursorY = 120;
    const lines = autoReport.reportText.split('\n');

    lines.forEach((line) => {
      const isHeading = line && !line.startsWith('- ') && !line.includes(':') && line !== '';
      const isSectionLabel = line.endsWith(':');

      if (cursorY > pageHeight - 48) {
        doc.addPage();
        cursorY = 48;
      }

      if (line === '') {
        cursorY += 10;
        return;
      }

      if (isHeading) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(line, margin, cursorY);
        cursorY += 18;
        return;
      }

      if (isSectionLabel) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(line, margin, cursorY);
        cursorY += 14;
        return;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const wrapped = doc.splitTextToSize(line, maxWidth);
      doc.text(wrapped, margin, cursorY);
      cursorY += wrapped.length * 12;
    });

    const safeDestination = (aiDestination || 'trip-report').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    doc.save(`trip-report-${safeDestination}.pdf`);
  };

  const handleSelectCard = (dest) => {
    setSelectedDest(dest);
    setCurrentPage('detail');
  };

  const handleSelectNode = (nodeArea) => {
    if (nodeArea.toLowerCase() === startArea.toLowerCase()) return;
    setEndArea(nodeArea);
  };

  return (
    <div className="bg-[#f8fafb] text-[#191c1d] font-body-md min-h-screen flex flex-col antialiased">
      
      {/* ==================== GLOBAL HEADER NAVBAR ==================== */}
      <header className="bg-white/95 dark:bg-[#001723] w-full top-0 sticky border-b border-[#c2c7cc]/30 z-50 transition-all duration-300 shadow-sm backdrop-blur-md">
        <div className="flex justify-between items-center px-6 md:px-20 py-4 max-w-7xl mx-auto h-20">
          <div className="flex items-center gap-12">
            <button 
              onClick={() => setCurrentPage('home')}
              className="font-headline-md text-2xl font-black tracking-tight text-[#002D40] dark:text-[#34E0A1] font-display uppercase hover:scale-95 transition-transform"
            >
              Voyage <span className="text-[#00AFEF]">Elite</span>
            </button>
            
            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-8 font-label-bold text-xs uppercase tracking-wider">
              <button 
                onClick={() => setCurrentPage('home')}
                className={`transition-all duration-200 cursor-pointer pb-1 ${
                  currentPage === 'home' 
                    ? 'text-[#00AFEF] border-b-2 border-[#00AFEF] font-black' 
                    : 'text-[#42484c] hover:text-[#00AFEF]'
                }`}
              >
                Home
              </button>
              <button 
                onClick={() => setCurrentPage('search')}
                className={`transition-all duration-200 cursor-pointer pb-1 ${
                  currentPage === 'search' || currentPage === 'detail' || currentPage === 'audio'
                    ? 'text-[#00AFEF] border-b-2 border-[#00AFEF] font-black' 
                    : 'text-[#42484c] hover:text-[#00AFEF]'
                }`}
              >
                Destinations
              </button>
              <button 
                onClick={() => setCurrentPage('new-ai-planner')}
                className={`transition-all duration-200 cursor-pointer pb-1 ${
                  currentPage === 'new-ai-planner' 
                    ? 'text-[#00AFEF] border-b-2 border-[#00AFEF] font-black' 
                    : 'text-[#42484c] hover:text-[#00AFEF]'
                }`}
              >
                AI Planner 🔮
              </button>
              <button 
                onClick={() => setCurrentPage('bookings')}
                className={`transition-all duration-200 cursor-pointer pb-1 ${
                  currentPage === 'bookings' 
                    ? 'text-[#00AFEF] border-b-2 border-[#00AFEF] font-black' 
                    : 'text-[#42484c] hover:text-[#00AFEF]'
                }`}
              >
                Bookings
              </button>
              <button 
                onClick={() => setCurrentPage('about')}
                className={`transition-all duration-200 cursor-pointer pb-1 ${
                  currentPage === 'about' 
                    ? 'text-[#00AFEF] border-b-2 border-[#00AFEF] font-black' 
                    : 'text-[#42484c] hover:text-[#00AFEF]'
                }`}
              >
                About
              </button>
            </nav>
          </div>

          {/* Plan My Trip Button */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentPage('search')}
              className="hidden md:block bg-[#002D40] text-white px-6 py-2.5 rounded-full font-label-bold text-xs font-bold uppercase tracking-wider hover:bg-[#00AFEF] transition-all duration-200 shadow-sm"
            >
              Plan My Trip
            </button>
          </div>
        </div>
      </header>

      {/* ==================== PAGES CORE CONTENT STAGE ==================== */}
      <main className="flex-grow">
        
        {/* ==================== PAGE 1: HOME FEED ==================== */}
        {currentPage === 'home' && (
          <div className="animate-fadeIn">
            {/* Hero Image & Search Pill */}
            <section className="relative h-[550px] w-full overflow-hidden">
              <img 
                alt="Luxury overwater bungalows" 
                className="absolute inset-0 w-full h-full object-cover" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAy56sP1f4e58Tts1Xf5iRuMWW6VItX_VB6qpTGqn-Xv_xv75q1isJOUkKEWLkPYUkc5qUsFAxxfmYePTADrEk683qaWsZxc_BMz8lDb1j9bcYoitt4hhFUWvb0ioZyKIQtENi2fEbyLOp67FHU136_LKPQR6xbhjSMaCH00pcjZvSPiB2WxylreySioIzhVaZAizeY7My-OOeb7fGHpY2wOBt0N0sJvaqFcys6ePR5x8Fmp7kfTtDKDI2cMr9mRpbXVe-JhENextQ"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#002D40]/80 to-transparent" />
              <div className="relative h-full max-w-7xl mx-auto px-6 md:px-20 flex flex-col justify-end pb-[80px]">
                <div className="max-w-2xl flex flex-col gap-3">
                  <h1 className="font-display-lg text-4xl md:text-5xl text-white font-extrabold leading-tight mb-2 drop-shadow-md">
                    Discover the World's Best Kept Secrets.
                  </h1>
                  <p className="font-body-lg text-base md:text-lg text-white/90 mb-6 drop-shadow-sm font-medium">
                    Curated luxury experiences for the discerning traveler. Embark on a journey beyond the ordinary.
                  </p>
                  
                  {/* Glassmorphic Search Pill */}
                  <div className="glass-panel p-3.5 rounded-2xl flex flex-col md:flex-row items-center shadow-2xl border border-white/20 gap-2 max-w-3xl w-full">
                    <div className="flex-1 w-full flex items-center px-4 py-2 border-r border-[#c2c7cc]/30">
                      <span className="material-symbols-outlined text-[#002D40] mr-2">location_on</span>
                      <input 
                        type="text" 
                        placeholder="Where to? (e.g. Bangalore, Jayanagar)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-[#002D40] placeholder:text-[#002D40]/60 font-body-md text-sm outline-none"
                      />
                    </div>
                    <div className="flex-1 w-full flex items-center px-4 py-2 border-r border-[#c2c7cc]/30">
                      <span className="material-symbols-outlined text-[#002D40] mr-2">calendar_month</span>
                      <span className="text-[#002D40]/60 text-sm font-medium">Add travel dates</span>
                    </div>
                    <div className="flex-1 w-full flex items-center px-4 py-2">
                      <span className="material-symbols-outlined text-[#002D40] mr-2">group</span>
                      <span className="text-[#002D40]/60 text-sm font-medium">Add guests</span>
                    </div>
                    <button 
                      onClick={() => setCurrentPage('search')}
                      className="w-full md:w-auto bg-[#00AFEF] text-white p-3.5 rounded-xl hover:bg-[#002D40] transition-colors duration-200 flex items-center justify-center cursor-pointer shadow-md"
                    >
                      <span className="material-symbols-outlined font-black">search</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Recommended for You (AI Match) */}
            <div className="max-w-7xl mx-auto px-6 md:px-20 py-12 border-b border-[#c2c7cc]/20">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col gap-1">
                  <h2 className="font-display-md text-2xl font-extrabold text-[#002D40] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00AFEF]">auto_awesome</span>
                    Recommended for You
                  </h2>
                  <p className="text-sm text-[#42484c] font-medium">Curated destinations based on your sensory profile (Acoustics & Energy).</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {isMlLoading ? (
                  <div className="col-span-3 flex flex-col items-center justify-center py-10 opacity-70">
                    <span className="material-symbols-outlined animate-spin text-4xl text-[#00AFEF] mb-4">memory</span>
                    <p className="font-label-bold text-xs font-black uppercase tracking-widest text-[#002D40]">Running ML Inference...</p>
                  </div>
                ) : (
                  mlRecommendations.map(dest => (
                    <div key={`rec-${dest.id}`} className="relative group cursor-pointer" onClick={() => { setSelectedDest(dest); setCurrentPage('details'); }}>
                      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                        <span className="material-symbols-outlined text-xs text-[#00AFEF]">psychology</span>
                        <span className="font-label-bold text-[10px] uppercase font-black text-[#002D40]">{dest.mlScore}% ML Confidence</span>
                      </div>
                      <DestinationCard 
                        image={dest.image}
                        title={dest.title}
                        location={dest.location}
                        price={dest.price}
                        rating={dest.rating}
                        category={dest.category}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Category Navigation Pills */}
            <section className="max-w-7xl mx-auto px-6 md:px-20 -mt-10 relative z-10">
              <div className="bg-white rounded-2xl shadow-xl border border-[#c2c7cc]/20 p-4 flex flex-wrap justify-between items-center gap-4">
                {[
                  { label: 'Hotels', icon: 'hotel', cat: 'hotel' },
                  { label: 'Flights', icon: 'flight', cat: 'all' },
                  { label: 'Cruises', icon: 'sailing', cat: 'all' },
                  { label: 'Tours', icon: 'explore', cat: 'attraction' },
                  { label: 'Restaurants', icon: 'restaurant', cat: 'restaurant' }
                ].map((item, idx) => (
                  <React.Fragment key={item.label}>
                    {idx > 0 && <div className="hidden lg:block w-px h-10 bg-[#c2c7cc]/30" />}
                    <button 
                      onClick={() => {
                        setSelectedCategory(item.cat);
                        setCurrentPage('search');
                      }}
                      className="flex-grow md:flex-grow-0 flex flex-col items-center justify-center p-3 text-[#002D40] hover:text-[#00AFEF] transition-colors cursor-pointer group"
                    >
                      <span className="material-symbols-outlined mb-1.5 text-3xl group-hover:scale-110 transition-transform">
                        {item.icon}
                      </span>
                      <span className="font-label-bold text-xs uppercase font-extrabold tracking-wider">{item.label}</span>
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </section>

            {/* Dynamic Featured Grids */}
            {['hotel', 'restaurant', 'attraction'].map(category => {
              const categoryDestinations = destinations.filter(d => d.category === category).slice(0, 6);
              if (categoryDestinations.length === 0) return null;
              
              const titles = {
                'hotel': 'Featured Hotels',
                'restaurant': 'Top Restaurants',
                'attraction': 'Must-See Attractions'
              };
              const descriptions = {
                'hotel': 'Curated luxury stays and serene sanctuaries.',
                'restaurant': 'Unforgettable culinary experiences.',
                'attraction': 'Iconic landmarks and hidden gems.'
              };

              return (
                <section key={category} className="max-w-7xl mx-auto px-6 md:px-20 py-10">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <h2 className="font-headline-lg text-3xl text-[#002D40] mb-1 font-display">{titles[category]}</h2>
                      <p className="text-sm text-[#42484c] font-medium">{descriptions[category]}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedCategory(category);
                        setCurrentPage('search');
                      }}
                      className="font-label-bold text-xs uppercase font-extrabold tracking-wider text-[#00AFEF] hover:text-[#002D40] flex items-center gap-1 transition-all"
                    >
                      View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {categoryDestinations.map(dest => (
                      <div 
                        key={dest.id}
                        onClick={() => handleSelectCard(dest)}
                        className="group relative rounded-2xl overflow-hidden h-[300px] card-hover cursor-pointer shadow-lg border border-[#c2c7cc]/15"
                      >
                        <img 
                          alt={dest.name} 
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          src={dest.nowImage || dest.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPEoZkor3hwFp9pBNfIcFT2R8l4fVo3wwroR_VDv5kBmY-d_bPjZeZi2ABMlN7GUSxDwsfpqslnrpp5LWkyfMijrHRXFFLTLK25wmyaofw65uCXcNApf8nXsxY2cN7DRvGKxbTjtmrYXVGGpoqmb8ljRS_0aby-W32kbDSyk6tZazEc7RiChNOttfWgSXMrqPg4eqPOmQk60H9AaUwWVH6LEZxKme8DB8nBin7GEp7w1qEawua-bFQ-jSr3qnikf0lBZpHzxYGBjA'}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#002D40]/90 via-[#002D40]/30 to-transparent" />
                        <div className="absolute top-4 left-4 glass-panel px-3 py-1 rounded-full flex items-center shadow-sm">
                          <span className="material-symbols-outlined text-[#34E0A1] text-sm mr-1 filled">star</span>
                          <span className="font-label-caps text-xs text-[#002D40] font-extrabold">{dest.rating}</span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-6 glass-panel-dark">
                          <span className="text-[10px] uppercase tracking-widest text-[#34E0A1] font-black">{dest.area}</span>
                          <h3 className="font-headline-sm text-lg text-white font-extrabold mt-0.5 mb-1 truncate">{dest.name}</h3>
                          <p className="text-xs text-white/80 line-clamp-2 mb-4">{dest.description}</p>
                          <button className="btn-reveal w-full bg-[#00AFEF] text-white py-2 rounded-xl font-label-bold text-xs uppercase tracking-wider">
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Bento Trust / Features Grid */}
            <section className="bg-[#eceeef]/40 py-16 border-t border-[#c2c7cc]/20">
              <div className="max-w-7xl mx-auto px-6 md:px-20">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:h-[350px]">
                  
                  {/* Left Column Description */}
                  <div className="md:col-span-8 bg-white rounded-2xl p-8 border border-[#c2c7cc]/30 shadow-sm flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-20 -top-20 opacity-5 pointer-events-none">
                      <span className="material-symbols-outlined text-[300px]">public</span>
                    </div>
                    <span className="text-[#00AFEF] text-xs font-black uppercase tracking-wider mb-2 font-display">Voyage Elite Curation</span>
                    <h2 className="font-headline-lg text-3xl text-[#002D40] mb-4 z-10 leading-tight">
                      Uncompromising Luxury, Worldwide.
                    </h2>
                    <p className="text-sm md:text-base text-[#42484c] max-w-xl z-10 leading-relaxed font-medium">
                      We handle every detail. From private boutique escapes to quiet detours around Bangalore's notorious traffic junctions using historical loops, Voyage Elite ensures your slow-travel journey is as peaceful as the destination itself.
                    </p>
                  </div>

                  {/* Right Column Stack */}
                  <div className="md:col-span-4 flex flex-col gap-6 h-full justify-between">
                    
                    {/* Concierge Widget */}
                    <div className="flex-1 bg-[#002D40] text-white rounded-2xl p-6 flex items-center shadow-lg border border-[#002D40]/25">
                      <div className="bg-[#00AFEF]/20 p-3 rounded-full mr-4 text-[#00AFEF]">
                        <span className="material-symbols-outlined text-2xl">support_agent</span>
                      </div>
                      <div>
                        <h4 className="font-headline-sm text-base font-extrabold text-white">24/7 Concierge</h4>
                        <p className="text-xs text-white/70 font-semibold mt-0.5">Global support and local bypass guides.</p>
                      </div>
                    </div>

                    {/* Vetted Partners Widget */}
                    <div className="flex-1 bg-white rounded-2xl p-6 flex items-center border border-[#c2c7cc]/30 shadow-sm">
                      <div className="bg-[#34E0A1]/20 p-3 rounded-full mr-4 text-[#34E0A1]">
                        <span className="material-symbols-outlined text-2xl">verified_user</span>
                      </div>
                      <div>
                        <h4 className="font-headline-sm text-base font-extrabold text-[#002D40]">Vetted Partners</h4>
                        <p className="text-xs text-[#42484c] font-semibold mt-0.5">Only the highest rated serene experiences.</p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ==================== PAGE 2: SEARCH & DISCOVERY (MAP + DIJKSTRA ROUTING) ==================== */}
        {currentPage === 'search' && (
          <div className="animate-fadeIn">
            {/* Search Hero Header */}
            <section className="relative w-full h-[320px] flex items-center justify-center bg-[#002D40] overflow-hidden">
              <div className="absolute inset-0 z-0 opacity-40">
                <img 
                  alt="Mountain Valley Dawn" 
                  className="w-full h-full object-cover" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAu64zo42UQSMwMp540qu40KesCU9ll5Yco1ipTrTkXLPg-dXcNV1AP7m0TcCGk4SSoakMUofD8aha_Hu28Z3ieN0vCtnhgtYMweAQw73Smd4_VIvBYrxOYHVlY--yDeSrzFwvRVdX0aTJWTLcGMF89TRS75kDbqnTdO5rvyLG39CKG-VuZK6qtFRWZ_lqmisO25y5i6ycfr5oblczwlybb2bDkO3231syMR7KD-nI2NsgyIqe-j2TMsVjQikjKrdIXO4ZsejCscsw"
                />
              </div>
              <div className="relative z-10 w-full max-w-4xl px-6 text-center mt-6">
                <h1 className="font-display-lg text-3xl md:text-4xl text-white font-extrabold drop-shadow-lg mb-2">
                  Discover the Undiscovered
                </h1>
                <p className="text-xs md:text-sm text-white/90 mb-6 max-w-xl mx-auto font-medium">
                  Escape the ordinary and find your sanctuary in our curated selection of pristine, crowd-free destinations.
                </p>

                {/* Detailed Search Bar */}
                <div className="w-full bg-white rounded-full shadow-2xl border border-[#c2c7cc]/30 p-2 flex flex-col md:flex-row items-center gap-2 max-w-2xl mx-auto">
                  <div className="flex-1 w-full flex items-center px-4 py-1.5 hover:bg-[#f2f4f5] rounded-full transition-colors">
                    <span className="material-symbols-outlined text-[#00AFEF] mr-2">location_on</span>
                    <div className="flex flex-col text-left w-full">
                      <span className="font-label-caps text-[9px] uppercase tracking-wider text-[#42484c] font-black">Where</span>
                      <input 
                        type="text" 
                        placeholder="Search uncrowded gems..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none p-0 focus:ring-0 text-xs font-semibold text-[#191c1d] placeholder-[#72787d] w-full outline-none"
                      />
                    </div>
                  </div>
                  <div className="hidden md:block w-[1px] h-6 bg-[#c2c7cc]/40" />
                  
                  {/* Category Pill Switcher */}
                  <div className="flex-1 w-full flex items-center px-4 py-1.5 hover:bg-[#f2f4f5] rounded-full transition-colors group">
                    <span className="material-symbols-outlined text-[#34E0A1] mr-2 filled">spa</span>
                    <div className="flex flex-col text-left">
                      <span className="font-label-caps text-[9px] uppercase tracking-wider text-[#42484c] font-black">Vibe Mode</span>
                      <span className="text-xs text-[#191c1d] font-bold">Crowd-Free</span>
                    </div>
                    <div className="ml-auto w-8 h-4.5 bg-[#34E0A1] rounded-full relative shadow-inner">
                      <div className="absolute right-0.5 top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                  
                  <button className="w-full md:w-auto bg-[#00AFEF] text-white rounded-full p-2.5 flex items-center justify-center hover:bg-[#002D40] transition-colors shadow-md">
                    <span className="material-symbols-outlined text-sm font-black">search</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Peaceful Alternatives & Map Layout Grid */}
            <section className="max-w-7xl mx-auto px-6 md:px-20 py-12 flex flex-col gap-12">
              
              {/* Part 1: Peaceful Alternatives Grid */}
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="font-headline-lg text-2xl text-[#002D40] font-display">Peaceful Alternatives</h2>
                  <p className="text-xs text-[#42484c] font-bold uppercase tracking-wider mt-0.5">Trade tourist traps for these serene escape points.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:h-[450px]">
                  
                  {/* Folegandros (Main Card) */}
                  <div 
                    onClick={() => {
                      setSelectedDest({
                        id: 'folegandros',
                        name: 'Folegandros Blue Cliffs',
                        area: 'Folegandros',
                        road: 'Chora Lanes',
                        era: '1809',
                        category: 'attraction',
                        rating: 4.9,
                        reviewsCount: 120,
                        priceTier: '$$$',
                        vibe: 'Serene Sanctuary',
                        description: 'A beautiful coastal village with white-washed houses, pristine paths, and remote landscapes overlooking the calm turquoise Aegean sea.',
                        thenDesc: 'A simple, isolated 19th-century Greek fishing hamlet with single-story huts and small rowboats.',
                        nowDesc: 'A quiet, exclusive island escape preserving local stone alleys and clear shorelines.'
                      });
                      setCurrentPage('detail');
                    }}
                    className="md:col-span-2 destination-card relative rounded-2xl overflow-hidden cursor-pointer group shadow-md border border-[#c2c7cc]/15 hover:shadow-xl transition-shadow"
                  >
                    <img 
                      alt="Folegandros" 
                      className="absolute inset-0 w-full h-full object-cover hover-card-image" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFBDqVItih-3H4zpMmNvvOcmZyI_OLc2od8u7m6AK0I6bwHVegjtw8nGXHW6BxyfgCvIr2bKYbW4BmWar8RJ7utfCMF2GXr11KRPhEVJAXkavIvJciGSy9TWp4fWC3AHjU9J1pfrrkh5z7VzfUCJpTRyQ98Cl-ni6ah0L__6KotWgB_NRcrrpm4BOlPWJUjDMCm_thJWRhsuoUTIJRgRIoQG3x8JbJeKRcXn4RmVwxkav_O-3HJMWH7bl6C3iC3WiDFB05dTVlEeE"
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1 shadow-sm border border-[#c2c7cc]/20 z-10">
                      <span className="material-symbols-outlined text-[#34E0A1] text-sm filled">verified</span>
                      <span className="font-label-caps text-[9px] uppercase tracking-wider text-[#002D40] font-black">Verified Low Crowd</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 glass-overlay p-6 border-t border-white/20 flex justify-between items-end">
                      <div>
                        <p className="font-label-caps text-[10px] uppercase tracking-widest text-[#42484c] font-black mb-1">INSTEAD OF SANTORINI</p>
                        <h3 className="font-headline-md text-xl text-[#002D40] font-extrabold">Folegandros, Greece</h3>
                        <div className="flex items-center gap-1 mt-1 text-[#00AFEF]">
                          <span className="material-symbols-outlined text-sm filled">star</span>
                          <span className="font-label-bold text-xs font-bold">4.9</span>
                          <span className="text-xs text-[#42484c] font-semibold ml-1">(120 Reviews)</span>
                        </div>
                      </div>
                      <button className="card-action bg-[#002D40] text-white px-5 py-1.5 rounded-full font-label-bold text-xs uppercase tracking-wider shadow-md">
                        View Details
                      </button>
                    </div>
                  </div>

                  {/* Right Stack */}
                  <div className="grid grid-rows-2 gap-6 h-[450px] md:h-auto">
                    
                    {/* Lyon Card */}
                    <div 
                      onClick={() => {
                        setSelectedDest({
                          id: 'lyon',
                          name: 'Lyon Cobblestone Alleyways',
                          area: 'Lyon',
                          road: 'Vieux Lyon Lanes',
                          era: '1809',
                          category: 'attraction',
                          rating: 4.7,
                          reviewsCount: 340,
                          priceTier: '$$$',
                          vibe: 'Old-World France',
                          description: 'Stroll along beautiful, quiet, uncrowded cobblestone streets in central France, featuring exquisite architecture and warm, inviting local bistros.',
                          thenDesc: 'A 19th-century print showing local silk weavers working in quiet stone houses along the Saône river banks.',
                          nowDesc: 'A preserved medieval architectural zone with cozy candlelight dining halls and artisan shops.'
                        });
                        setCurrentPage('detail');
                      }}
                      className="destination-card relative rounded-2xl overflow-hidden cursor-pointer group shadow-md border border-[#c2c7cc]/15"
                    >
                      <img 
                        alt="Lyon" 
                        className="absolute inset-0 w-full h-full object-cover hover-card-image" 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDI3GRqOpsmwkFk6H0Xp1OHy0ymeEXGwwsKw28MfFaTMTttAnDHqjmRrzD5muRQcsNKwt6oCOGEBELweMzMz2VEJjpJ6_mSyRhHWv1KBmxtjYHDGv8ZCPpJpkq06vamJNemP2b3R364wnW4s1cyxmBadwnpRIm979ChS0YNi7XP1V6fq-4RHWh78Z3a4Ob3h6Vy88a6BxjiUNRcZfJAKUkSDxcucAACSbLdS24CWKyYGcOUrKBY53jRRyDjQxZnyJD0678R-FY2_io"
                      />
                      <div className="absolute bottom-0 left-0 right-0 glass-overlay p-4 border-t border-white/20">
                        <p className="font-label-caps text-[9px] uppercase tracking-widest text-[#42484c] font-black mb-0.5">INSTEAD OF PARIS</p>
                        <h3 className="font-headline-sm text-sm text-[#002D40] font-extrabold">Lyon, France</h3>
                        <button className="card-action bg-transparent border border-[#00AFEF] text-[#002D40] hover:bg-[#00AFEF] hover:text-white py-1 rounded-xl font-label-bold text-[10px] uppercase tracking-wider mt-2 w-full">
                          Explore Lyon
                        </button>
                      </div>
                    </div>

                    {/* Kanazawa Card */}
                    <div 
                      onClick={() => {
                        setSelectedDest({
                          id: 'kanazawa',
                          name: 'Kanazawa Zen Gardens',
                          area: 'Kanazawa',
                          road: 'Kenroku-en Paths',
                          era: '1537',
                          category: 'attraction',
                          rating: 4.8,
                          reviewsCount: 412,
                          priceTier: '$$$',
                          vibe: 'Zen Tranquility',
                          description: 'Experience profound silence and cultural exclusivity in a traditional, meticulously maintained Japanese garden featuring moss-covered stones and wooden temples.',
                          thenDesc: 'A traditional woodblock print of samurai officers walking in silence through deep winter pine groves.',
                          nowDesc: 'A peaceful, highly preserved cultural oasis of tea teahouses and serene pathways.'
                        });
                        setCurrentPage('detail');
                      }}
                      className="destination-card relative rounded-2xl overflow-hidden cursor-pointer group shadow-md border border-[#c2c7cc]/15"
                    >
                      <img 
                        alt="Kanazawa" 
                        className="absolute inset-0 w-full h-full object-cover hover-card-image" 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2YQoKZDn0y7svMwmlHP3TZhys-rMHZKa-eD1EkyU2-kISxW8dqIpy69acJKOfHgpPzo6pEcJI2iHPsALR5_emzQWRLZogJ7bPno4jaQoUxmg_iGwIe3woHHYDThvXtbWYFav-pYG9wDZdDvEdfDsSHTxV2x1pNRx-gfrSZwA89MhDbmjzl_P6rVtSAojFgFb7mpqihvbx1mpOWohEBqqrb8PZFjZlVrNqXdB2AH6bNB4g6-Ij-5m6UmJdaGr6r8-ItUnBXH9ScXs"
                      />
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-sm border border-[#c2c7cc]/20 z-10">
                        <span className="material-symbols-outlined text-[#34E0A1] text-sm filled">spa</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 glass-overlay p-4 border-t border-white/20">
                        <p className="font-label-caps text-[9px] uppercase tracking-widest text-[#42484c] font-black mb-0.5">INSTEAD OF KYOTO</p>
                        <h3 className="font-headline-sm text-sm text-[#002D40] font-extrabold">Kanazawa, Japan</h3>
                        <button className="card-action bg-transparent border border-[#00AFEF] text-[#002D40] hover:bg-[#00AFEF] hover:text-white py-1 rounded-xl font-label-bold text-[10px] uppercase tracking-wider mt-2 w-full">
                          Explore Kanazawa
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Part 2: Bangalore Slow-Travel Navigator Module */}
              <div className="flex flex-col gap-6 border-t border-[#c2c7cc]/30 pt-12">
                
                {/* Visual Label Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
                  <div>
                    <span className="text-[#00AFEF] text-xs font-black uppercase tracking-widest font-display">
                      Exclusive Live Navigation Module
                    </span>
                    <h2 className="font-headline-lg text-3xl text-[#002D40] font-display mt-1">
                      Bangalore Traffic-Escape Navigator
                    </h2>
                    <p className="text-xs text-[#42484c] font-bold uppercase tracking-wider mt-0.5">
                      Dijkstra-based green loops comparing Auto Highways vs. peaceful slow-travel pathways.
                    </p>
                  </div>

                  {/* Era Selector Pills styled inside Destinations page */}
                  <div className="flex bg-[#002D40] p-1 border border-[#002D40]/20 rounded-xl gap-1">
                    {[
                      { id: 'all', label: 'All Eras' },
                      { id: '1537', label: '1537 Mud Fort' },
                      { id: '1809', label: '1809 Cantonment' },
                      { id: '1970s', label: '1970s Garden' }
                    ].map(era => (
                      <button
                        key={era.id}
                        onClick={() => setCurrentEra(era.id)}
                        className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide rounded-lg font-display cursor-pointer transition-all duration-300 ${
                          currentEra === era.id 
                            ? 'bg-[#00AFEF] text-white font-black shadow-md shadow-emerald-500/25' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {era.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3-Column Work Grid (Map Setup, SVG Map stage, Sliders) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Itinerary Settings & Sensory Sliders (lg:col-span-3) */}
                  <div className="lg:col-span-3 flex flex-col gap-6">
                    
                    {/* Setup selectors */}
                    <div className="bg-white rounded-2xl border border-[#c2c7cc]/30 p-5 shadow-sm flex flex-col gap-4">
                      <h3 className="text-xs font-extrabold tracking-wider text-[#002D40] uppercase border-b border-[#c2c7cc]/20 pb-3 font-display flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#00AFEF] text-base">route</span>
                        Itinerary Setup
                      </h3>
                      
                      <div className="flex flex-col gap-3">
                        <label className="flex flex-col gap-1.5 text-xs text-[#42484c] font-bold">
                          <span>Starting Hub</span>
                          <select
                            value={startArea}
                            onChange={(e) => setStartArea(e.target.value)}
                            className="w-full bg-[#f8fafb] border border-[#c2c7cc]/50 text-[#191c1d] px-3 py-2.5 rounded-lg outline-none text-xs font-semibold cursor-pointer focus:border-[#00AFEF] transition-all"
                          >
                            {areas.map(a => <option key={`start-${a}`} value={a}>{a}</option>)}
                          </select>
                        </label>

                        <label className="flex flex-col gap-1.5 text-xs text-[#42484c] font-bold">
                          <span>Destination Hub</span>
                          <select
                            value={endArea}
                            onChange={(e) => setEndArea(e.target.value)}
                            className="w-full bg-[#f8fafb] border border-[#c2c7cc]/50 text-[#191c1d] px-3 py-2.5 rounded-lg outline-none text-xs font-semibold cursor-pointer focus:border-[#00AFEF] transition-all"
                          >
                            {areas.filter(a => a !== startArea).map(a => <option key={`end-${a}`} value={a}>{a}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>

                    {/* Sensory Sliders */}
                    <SensorySliders sensory={sensory} onChange={handleSensoryChange} />

                    {/* Traffic Predictor Filters */}
                    <AnalyticsPredictor
                      filters={trafficFilters}
                      onChangeFilter={handleTrafficFilterChange}
                      predictedStats={
                        isDataLoaded && routes
                          ? trafficPredictor.predictTraffic(
                              selectedDest?.area || startArea,
                              selectedDest?.road || INTERSECTIONS[routes.standard.path[0]]?.label || 'CMH Road',
                              trafficFilters.dayOfWeek,
                              trafficFilters.weather,
                              trafficFilters.roadwork
                            )
                          : { congestionLevel: 30, avgSpeed: 30, trafficVolume: 25000, environmentalImpact: 60, status: 'Serene & Clear' }
                      }
                      selectedArea={selectedDest?.area || startArea}
                      selectedRoad={selectedDest?.road || 'CMH Road'}
                    />

                  </div>

                  {/* Center Column: Interactive SVG Map (lg:col-span-6) */}
                  <div className="lg:col-span-6 flex flex-col gap-6">
                    
                    {/* Cartography Stage */}
                    <InteractiveMap
                      startArea={startArea}
                      endArea={endArea}
                      onSelectNode={handleSelectNode}
                      routes={routes}
                      trafficEngine={trafficPredictor}
                      trafficFilters={trafficFilters}
                    />

                    {/* Path Performance Metrics Savings Matrix */}
                    {routes && (
                      <ComparisonPanel
                        routes={routes}
                        startArea={startArea}
                        endArea={endArea}
                      />
                    )}

                  </div>

                  {/* Right Column: Serene Stopping Points List (lg:col-span-3) */}
                  <div className="lg:col-span-3 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl border border-[#c2c7cc]/30 p-5 shadow-sm flex flex-col gap-4">
                      <h3 className="text-xs font-extrabold tracking-wider text-[#002D40] uppercase border-b border-[#c2c7cc]/20 pb-3 font-display flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#34E0A1] text-base filled">spa</span>
                        Serene stopping points
                      </h3>
                      
                      <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[580px] custom-scrollbar pr-1">
                        {routes && routes.aura.destinations && routes.aura.destinations.length > 0 ? (
                          routes.aura.destinations.map(dest => {
                            const traffic = isDataLoaded
                              ? trafficPredictor.predictTraffic(dest.area, dest.road, trafficFilters.dayOfWeek, trafficFilters.weather, trafficFilters.roadwork)
                              : { congestionLevel: 20 };

                            return (
                              <DestinationCard
                                key={dest.id}
                                dest={dest}
                                predictedTraffic={traffic}
                                onSelect={handleSelectCard}
                              />
                            );
                          })
                        ) : (
                          <div className="text-center py-10 bg-[#f8fafb] rounded-xl border border-dashed border-[#c2c7cc]/40">
                            <span className="material-symbols-outlined text-slate-400 text-3xl mb-1">sentiment_dissatisfied</span>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">No cozy stops along this path</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Try shifting sliders to less noisy Acoustics</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </section>
          </div>
        )}

        {/* ==================== PAGE 3: DESTINATION DETAIL (WITH draggable THEN & NOW PORTAL) ==================== */}
        {currentPage === 'detail' && selectedDest && (
          <div className="animate-fadeIn">
            {/* Header Image section */}
            <section className="relative h-[480px] w-full bg-slate-900 overflow-hidden">
              <div 
                className="absolute inset-0 w-full h-full bg-cover bg-center"
                style={{ 
                  backgroundImage: `url(${selectedDest.nowImage || selectedDest.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPEoZkor3hwFp9pBNfIcFT2R8l4fVo3wwroR_VDv5kBmY-d_bPjZeZi2ABMlN7GUSxDwsfpqslnrpp5LWkyfMijrHRXFFLTLK25wmyaofw65uCXcNApf8nXsxY2cN7DRvGKxbTjtmrYXVGGpoqmb8ljRS_0aby-W32kbDSyk6tZazEc7RiChNOttfWgSXMrqPg4eqPOmQk60H9AaUwWVH6LEZxKme8DB8nBin7GEp7w1qEawua-bFQ-jSr3qnikf0lBZpHzxYGBjA'})`
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#002D40]/80 via-[#002D40]/20 to-transparent" />
              <div className="absolute top-6 left-6 flex gap-3">
                <span className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full font-label-caps text-xs text-[#002D40] font-extrabold uppercase shadow-sm">
                  {selectedDest.vibe}
                </span>
                <span className="bg-[#002D40]/80 backdrop-blur-md px-4 py-2 rounded-full font-label-caps text-xs text-white font-semibold uppercase shadow-sm">
                  {selectedDest.area}
                </span>
              </div>
              <div className="relative h-full max-w-7xl mx-auto px-6 md:px-20 flex flex-col justify-end pb-[60px]">
                <div className="max-w-3xl flex flex-col gap-2">
                  <h1 className="font-display-lg text-3xl md:text-5xl text-white font-extrabold leading-tight mb-2 drop-shadow-md">
                    {selectedDest.name}
                  </h1>
                  
                  {/* Rating Bubbles */}
                  <div className="flex items-center gap-2 text-white">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <span 
                          key={`star-${i}`} 
                          className={`w-3.5 h-3.5 rounded-full inline-block border border-[#34E0A1] ${
                            i < Math.floor(selectedDest.rating) ? 'bg-[#34E0A1]' : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold">{selectedDest.reviewsCount.toLocaleString()} reviews</span>
                    <span className="text-white/60">·</span>
                    <span className="text-xs font-bold uppercase tracking-wider">{selectedDest.priceTier}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Content Details Grid */}
            <section className="max-w-7xl mx-auto px-6 md:px-20 py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Description & Facts (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-8">
                
                {/* At Destination Mode Live Switcher Card */}
                <div className="bg-[#002D40] text-white rounded-2xl p-5 border border-[#34E0A1]/20 shadow-md flex flex-col sm:flex-row justify-between items-center gap-4 transition-all hover:border-[#34E0A1]/40 duration-300">
                  <div className="flex items-center gap-3.5">
                    <div className="bg-[#34E0A1]/10 p-3 rounded-full border border-[#34E0A1]/30">
                      <span className="material-symbols-outlined text-[#34E0A1] text-2xl filled animate-pulse">location_on</span>
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-black uppercase tracking-wider text-slate-100">Live "At Destination" Explorer Guide</h3>
                      <p className="text-[10px] text-slate-300 font-semibold mt-0.5">Toggle live mode if you are currently visiting this heritage spot.</p>
                    </div>
                  </div>
                  
                  {/* Toggle Button */}
                  <button 
                    onClick={() => setIsLiveAtDestination(!isLiveAtDestination)}
                    className={`px-5 py-2.5 rounded-full font-label-bold text-xs uppercase tracking-wider font-extrabold cursor-pointer transition-all duration-300 shadow-sm ${
                      isLiveAtDestination 
                        ? 'bg-[#34E0A1] text-[#002D40] hover:bg-white' 
                        : 'bg-transparent border border-slate-500 text-slate-300 hover:border-white hover:text-white'
                    }`}
                  >
                    {isLiveAtDestination ? '📡 Active: Live Explorer' : 'Toggle Live Explorer'}
                  </button>
                </div>

                {isLiveAtDestination ? (
                  /* ==================== ACTIVE "AT DESTINATION" EXPLORER MODE ==================== */
                  <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-8 animate-fadeIn">
                    
                    {/* Live telemetry bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-4 border border-slate-850 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-[#34E0A1] rounded-full animate-ping"></span>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#34E0A1]">LIVE TELEMETRY STATION</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                        <span>Acoustic Ambient: {selectedDest.sensory?.acoustics < 0.3 ? 'Serene (35dB)' : 'Moderate (55dB)'}</span>
                        <span>·</span>
                        <span>Energy Rank: {selectedDest.sensory?.energy > 0.6 ? 'High Action' : 'Intimate/Cozy'}</span>
                      </div>
                    </div>

                    {/* Timeline section: History of the place */}
                    <div className="flex flex-col gap-4">
                      <h3 className="text-xs font-extrabold tracking-widest text-[#34E0A1] uppercase border-b border-slate-800 pb-3 flex items-center gap-1.5 font-display">
                        <span className="material-symbols-outlined text-sm">history_edu</span>
                        Heritage Chronicles & Chronology
                      </h3>
                      
                      <div className="flex flex-col gap-4 pl-4 border-l border-slate-800 relative">
                        {/* Timeline Item 1: The Foundation Era */}
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#34E0A1] border border-slate-900" />
                          <h4 className="text-xs font-bold text-white uppercase font-display tracking-wide">Epoch Era {selectedDest.era || '1537'}</h4>
                          <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">
                            {selectedDest.thenDesc || "Establishment and design. Originally conceived with low-density traditional structures, surrounded by lush flora and pedestrian lanes."}
                          </p>
                        </div>
                        
                        {/* Timeline Item 2: Modern Transformation */}
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#00AFEF] border border-slate-900" />
                          <h4 className="text-xs font-bold text-white uppercase font-display tracking-wide">Modern Epoch (Current Day)</h4>
                          <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">
                            {selectedDest.nowDesc || "Transitioned to a highly-frequented landmark. Preserves standard historical layouts but is subject to modern city traffic grids."}
                          </p>
                        </div>

                        {/* Timeline Item 3: Historical Anecdote */}
                        {selectedDest.historicalFact && (
                          <div className="relative">
                            <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#ffb703] border border-slate-900" />
                            <h4 className="text-xs font-bold text-white uppercase font-display tracking-wide">Anecdote & Archives</h4>
                            <p className="text-[10px] text-slate-400 italic font-semibold mt-1 leading-relaxed">
                              "{selectedDest.historicalFact}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dijkstra Uncrowded walking routes section */}
                    <div className="flex flex-col gap-4 border-t border-slate-800/60 pt-6">
                      <h3 className="text-xs font-extrabold tracking-widest text-[#00AFEF] uppercase border-b border-slate-800 pb-3 flex items-center gap-1.5 font-display">
                        <span className="material-symbols-outlined text-sm">route</span>
                        Crowd-Escape Detour Navigator
                      </h3>
                      
                      <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">RECOMMENDED WALK FROM {selectedDest.area.toUpperCase()}</span>
                          <span className="text-[9px] font-black bg-[#34E0A1]/10 text-[#34E0A1] border border-[#34E0A1]/20 px-2 py-0.5 rounded">95% Serenity score</span>
                        </div>
                        <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                          Rather than using high-density auto-oriented main roadways (e.g. {selectedDest.road || 'CMH Road'}), escape through our quiet green trails. Walk via these landmarks to bypass the gridlock:
                        </p>
                        
                        <div className="flex flex-col gap-2 mt-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                            <span className="w-5 h-5 rounded-full bg-[#34E0A1]/10 border border-[#34E0A1]/30 text-[#34E0A1] flex items-center justify-center text-[10px]">1</span>
                            <span>Depart from {selectedDest.name} (Silent Sanctuary)</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                            <span className="w-5 h-5 rounded-full bg-[#00AFEF]/10 border border-[#00AFEF]/30 text-[#00AFEF] flex items-center justify-center text-[10px]">2</span>
                            <span>Take peaceful bypass lane towards Jayanagar/Koramangala residential avenues</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                            <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center text-[10px]">3</span>
                            <span>Arrive at serene botanical resting hubs nearby</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            setStartArea(selectedDest.area);
                            setEndArea(selectedDest.area === 'Indiranagar' ? 'M.G. Road' : 'Indiranagar');
                            setCurrentPage('search');
                            setIsLiveAtDestination(false);
                          }}
                          className="bg-transparent hover:bg-[#00AFEF] text-white border border-slate-700 hover:border-[#00AFEF] py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest mt-2 transition-all cursor-pointer"
                        >
                          Visualize Route On Interactive Map
                        </button>
                      </div>
                    </div>

                    {/* Places Nearby section */}
                    <div className="flex flex-col gap-4 border-t border-slate-800/60 pt-6">
                      <h3 className="text-xs font-extrabold tracking-widest text-slate-300 uppercase border-b border-slate-800 pb-3 flex items-center gap-1.5 font-display">
                        <span className="material-symbols-outlined text-sm">explore</span>
                        Nearby Quiet Sanctuaries
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {destinations.filter(d => d.id !== selectedDest.id && d.area === selectedDest.area).slice(0, 2).map(nearDest => (
                          <div 
                            key={`near-${nearDest.id}`}
                            onClick={() => {
                              setSelectedDest(nearDest);
                              setIsLiveAtDestination(false);
                            }}
                            className="bg-slate-950 p-4 border border-slate-850 hover:border-[#34E0A1] rounded-2xl cursor-pointer transition-all flex flex-col gap-1.5 group"
                          >
                            <span className="text-[8px] uppercase tracking-widest text-[#34E0A1] font-black">{nearDest.vibe}</span>
                            <h4 className="text-xs font-bold text-slate-200 group-hover:text-[#34E0A1] transition-colors">{nearDest.name}</h4>
                            <p className="text-[9px] text-slate-400 truncate mt-0.5">{nearDest.description}</p>
                          </div>
                        ))}
                        {destinations.filter(d => d.id !== selectedDest.id && d.area === selectedDest.area).length === 0 && (
                          <div className="col-span-2 text-center py-4 bg-slate-950 rounded-xl border border-dashed border-slate-800">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">No other spots mapped in this immediate sector</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                ) : (
                  /* ==================== STANDARD DETAIL PAGE CONTENT ==================== */
                  <div className="bg-white rounded-2xl p-8 border border-[#c2c7cc]/30 shadow-sm flex flex-col gap-6">
                    
                    <div>
                      <h2 className="font-headline-md text-2xl text-[#002D40] font-display mb-3">The Experience</h2>
                      <p className="text-sm md:text-base text-[#42484c] leading-relaxed font-medium">
                        {selectedDest.description}
                      </p>
                    </div>

                    {selectedDest.historicalFact && (
                      <div className="border-l-4 border-[#00AFEF]/50 pl-4 py-1.5 bg-[#f8fafb] rounded-r-xl">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-[#00AFEF] mb-0.5">Historical Fact</h4>
                        <p className="text-xs text-[#42484c] italic font-medium leading-relaxed">
                          {selectedDest.historicalFact}
                        </p>
                      </div>
                    )}

                    {/* Dynamic Audio Guide Prompt */}
                    <div className="bg-[#00AFEF]/5 border border-[#00AFEF]/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-[#00AFEF] text-white p-3 rounded-full shadow-sm">
                          <span className="material-symbols-outlined text-2xl leading-none">headphones</span>
                        </div>
                        <div>
                          <h4 className="font-headline-sm text-base font-extrabold text-[#002D40]">Immersive Audio Walk Available</h4>
                          <p className="text-xs text-[#42484c] font-semibold">Take a slow walking tour narrated by professional local historians.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setActiveChapterIdx(0);
                          setCurrentTime(0);
                          setIsPlaying(true);
                          setCurrentPage('audio');
                        }}
                        className="bg-[#00AFEF] text-white px-6 py-2.5 rounded-full font-label-bold text-xs uppercase tracking-wider hover:bg-[#002D40] transition-colors cursor-pointer shadow-md"
                      >
                        Listen Now
                      </button>
                    </div>

                  </div>
                )}
              </div>

              {/* Right Column: Draggable Then & Now Portal (4 cols) */}
              <div className="lg:col-span-4 sticky top-28">
                <ThenAndNow
                  landmarkName={selectedDest.name}
                  thenDesc={selectedDest.thenDesc}
                  nowDesc={selectedDest.nowDesc}
                  thenImage={selectedDest.thenImage}
                  nowImage={selectedDest.nowImage}
                />
              </div>

            </section>
          </div>
        )}

        {/* ==================== PAGE 4: DESTINATION AUDIO EXPERIENCE ==================== */}
        {currentPage === 'audio' && selectedDest && (
          <div className="animate-fadeIn pb-16">
            
            {/* Immersive Audio Stage */}
            <section className="max-w-7xl mx-auto px-6 md:px-20 pt-8 pb-12">
              <div className="relative w-full h-[520px] rounded-2xl overflow-hidden bg-slate-900 shadow-2xl group border border-[#c2c7cc]/15">
                
                {/* Background Hero Image */}
                <div 
                  className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                  style={{
                    backgroundImage: `url(${selectedDest.nowImage || selectedDest.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPEoZkor3hwFp9pBNfIcFT2R8l4fVo3wwroR_VDv5kBmY-d_bPjZeZi2ABMlN7GUSxDwsfpqslnrpp5LWkyfMijrHRXFFLTLK25wmyaofw65uCXcNApf8nXsxY2cN7DRvGKxbTjtmrYXVGGpoqmb8ljRS_0aby-W32kbDSyk6tZazEc7RiChNOttfWgSXMrqPg4eqPOmQk60H9AaUwWVH6LEZxKme8DB8nBin7GEp7w1qEawua-bFQ-jSr3qnikf0lBZpHzxYGBjA'})`
                  }}
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#002D40]/80 via-[#002D40]/10 to-transparent" />
                
                {/* Badges */}
                <div className="absolute top-6 left-6 flex gap-3">
                  <span className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full font-label-caps text-xs text-[#002D40] font-extrabold uppercase shadow-sm flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base animate-pulse">headphones</span>
                    Immersive Audio Guide
                  </span>
                  <span className="bg-[#002D40]/80 backdrop-blur-md px-4 py-2 rounded-full font-label-caps text-xs text-white font-semibold uppercase shadow-sm">
                    {selectedDest.area}
                  </span>
                </div>

                {/* Glassmorphic Audio player panel (anchored bottom) */}
                <div className="absolute bottom-6 left-6 right-6 z-10">
                  <div className="bg-white/65 backdrop-blur-lg border border-white/40 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-center gap-8">
                    
                    {/* Buttons Controls */}
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setActiveChapterIdx(prev => Math.max(0, prev - 1))}
                        disabled={activeChapterIdx === 0}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-[#002D40] hover:text-[#00AFEF] disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                      >
                        <span className="material-symbols-outlined font-black">skip_previous</span>
                      </button>
                      
                      <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-16 h-16 flex items-center justify-center rounded-full bg-[#00AFEF] text-white hover:bg-[#002D40] transition-all duration-300 shadow-md cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-3xl filled">
                          {isPlaying ? 'pause' : 'play_arrow'}
                        </span>
                      </button>
                      
                      <button 
                        onClick={() => setActiveChapterIdx(prev => Math.min(activeChaptersList.length - 1, prev + 1))}
                        disabled={activeChapterIdx === activeChaptersList.length - 1}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-[#002D40] hover:text-[#00AFEF] disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                      >
                        <span className="material-symbols-outlined font-black">skip_next</span>
                      </button>
                    </div>

                    {/* Progress Slider */}
                    <div className="flex-grow w-full">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <h2 className="font-headline-sm text-base font-extrabold text-[#002D40] line-clamp-1">{currentChapter.title}</h2>
                          <p className="text-xs text-[#42484c] font-semibold flex items-center gap-1.5 mt-0.5">
                            <span className="material-symbols-outlined text-sm">record_voice_over</span>
                            Narrated by Kenji Sato
                          </p>
                        </div>
                        <div className="text-xs font-bold text-[#002D40] font-variant-numeric: tabular-nums;">
                          {formatTime(currentTime)} / {currentChapter.length}
                        </div>
                      </div>
                      
                      {/* Simulated Progress bar */}
                      <div 
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const percent = (e.clientX - rect.left) / rect.width;
                          setCurrentTime(Math.round(percent * currentChapter.seconds));
                        }}
                        className="w-full h-2 bg-white/50 rounded-full overflow-hidden cursor-pointer relative group"
                      >
                        <div 
                          className="absolute top-0 left-0 h-full bg-[#00AFEF] rounded-full" 
                          style={{ width: `${(currentTime / currentChapter.seconds) * 100}%` }}
                        />
                        <div 
                          className="absolute top-1/2 -mt-1.5 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ left: `calc(${(currentTime / currentChapter.seconds) * 100}% - 6px)` }}
                        />
                      </div>
                    </div>

                    {/* Volume Controls */}
                    <div className="hidden md:flex items-center gap-3 border-l border-[#c2c7cc]/30 pl-8 text-[#002D40]">
                      <button className="hover:text-[#00AFEF] transition-colors">
                        <span className="material-symbols-outlined">volume_up</span>
                      </button>
                      <button className="hover:text-[#00AFEF] transition-colors">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            </section>

            {/* Narrative descriptions and tracklist */}
            <section className="max-w-7xl mx-auto px-6 md:px-20 grid grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Narrative facts */}
              <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
                <article className="bg-white rounded-2xl p-8 border border-[#c2c7cc]/30 shadow-sm">
                  <h3 className="font-headline-md text-xl text-[#002D40] font-display mb-4">The Current Highlight</h3>
                  <div className="text-sm md:text-base text-[#42484c] leading-relaxed font-medium space-y-4">
                    <p>
                      Welcome to this immersive audio journey. As you approach this serene location, the audio guide details the deep history, architecture, and cultural stories hidden behind these walls.
                    </p>
                    <p>
                      {selectedDest.description}
                    </p>
                    {selectedDest.historicalFact && (
                      <p className="italic border-l-2 border-[#00AFEF]/40 pl-4 text-xs font-semibold py-1">
                        {selectedDest.historicalFact}
                      </p>
                    )}
                  </div>
                </article>
              </div>

              {/* Right Column: Chapters tracks list */}
              <aside class="col-span-12 lg:col-span-4 sticky top-28">
                <div class="bg-white rounded-2xl border border-[#c2c7cc]/30 shadow-sm overflow-hidden flex flex-col max-h-[500px]">
                  <div class="p-6 border-b border-[#c2c7cc]/30 bg-[#f8fafb]">
                    <h3 class="font-headline-sm text-base font-extrabold text-[#002D40] flex items-center gap-2">
                      <span class="material-symbols-outlined text-[#00AFEF]">format_list_numbered</span>
                      Audio Chapters
                    </h3>
                    <p class="text-xs text-[#42484c] font-semibold mt-1">
                      {activeChaptersList.length} Tracks • {selectedDest && selectedDest.area ? '27m' : '45m'} Total
                    </p>
                  </div>
                  
                  {/* Scrollable Tracks list */}
                  <ul class="flex-grow overflow-y-auto custom-scrollbar p-2 gap-1.5 flex flex-col">
                    {activeChaptersList.map((chapter, idx) => {
                      const isActive = idx === activeChapterIdx;
                      return (
                        <li key={chapter.title}>
                          <button 
                            onClick={() => {
                              setActiveChapterIdx(idx);
                              setCurrentTime(0);
                            }}
                            className={`w-full text-left p-3.5 rounded-xl border flex items-start gap-4 transition-all group cursor-pointer ${
                              isActive 
                                ? 'bg-[#eceeef] border-l-4 border-l-[#00AFEF] border-[#c2c7cc]/30' 
                                : 'bg-transparent border-transparent hover:bg-[#f2f4f5]'
                            }`}
                          >
                            <div className={`mt-0.5 flex-shrink-0 ${isActive ? 'text-[#00AFEF]' : 'text-slate-400'}`}>
                              <span className={`material-symbols-outlined ${isActive ? 'fill-icon animate-pulse' : ''}`}>
                                {isActive ? 'volume_up' : 'play_arrow'}
                              </span>
                            </div>
                            <div className="flex-grow">
                              <h4 className={`font-label-bold text-xs font-bold ${isActive ? 'text-[#002D40]' : 'text-slate-600'}`}>
                                {chapter.title}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-semibold line-clamp-1 mt-0.5">{chapter.desc}</p>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap mt-0.5">{chapter.length}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </aside>

            </section>

          </div>
        )}

        {/* ==================== PAGE 4.5: AI TRIP PLANNER ==================== */}
        {currentPage === 'ai-planner' && (
          <div className="max-w-7xl mx-auto px-6 md:px-20 py-12 flex flex-col gap-10 animate-fadeIn">
            
            {/* Page Header */}
            <header className="flex flex-col gap-1.5 border-b border-[#c2c7cc]/30 pb-6">
              <span className="text-[#00AFEF] text-xs font-black uppercase tracking-widest font-display flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm animate-pulse">psychology</span>
                Trip planning engine
              </span>
              <h1 className="font-display-lg text-3xl md:text-4xl font-extrabold text-[#002D40] leading-tight">
                Build a complete trip plan in one pass
              </h1>
              <p className="text-sm text-[#42484c] font-medium leading-relaxed max-w-2xl">
                Enter your travel date, duration, total budget, destination, and number of people. The planner will return a hotel stay, transport choices, restaurants, and activities for each day.
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-[#c2c7cc]/30 p-4 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#00AFEF]">1. Input capture</span>
                <p className="text-xs text-[#42484c] font-medium mt-2 leading-relaxed">You enter the place, travel date, duration, budget, and number of people.</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#c2c7cc]/30 p-4 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#00AFEF]">2. Plan synthesis</span>
                <p className="text-xs text-[#42484c] font-medium mt-2 leading-relaxed">The server searches destinations, hotels, restaurants, and transport options, then returns one finalized itinerary plan.</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#c2c7cc]/30 p-4 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#00AFEF]">3. Feedback loop</span>
                <p className="text-xs text-[#42484c] font-medium mt-2 leading-relaxed">Your ratings are analyzed and turned into a PDF report that can be downloaded or reused later.</p>
              </div>
            </div>

            {/* Main Interactive Configurator Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left configurator column (4 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* Target Destination & Date Selection */}
                <div className="bg-white rounded-2xl border border-[#c2c7cc]/30 p-5 shadow-sm flex flex-col gap-4">
                  <h3 className="text-xs font-extrabold tracking-wider text-[#002D40] uppercase border-b border-[#c2c7cc]/20 pb-3 font-display flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#00AFEF] text-base">location_on</span>
                    Place & date
                  </h3>
                  
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5 text-xs text-[#42484c] font-bold">
                      <span>Place</span>
                      <input
                        type="text"
                        value={aiDestination}
                        onChange={(e) => setAiDestination(e.target.value)}
                        placeholder="e.g. Kyoto, Japan or Goa, India"
                        className="w-full bg-[#f8fafb] border border-[#c2c7cc]/50 text-[#191c1d] px-3 py-2.5 rounded-lg outline-none text-xs font-semibold focus:border-[#00AFEF] transition-all"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5 text-xs text-[#42484c] font-bold">
                      <span>Travel date</span>
                      <input
                        type="date"
                        value={aiStartDate}
                        onChange={(e) => setAiStartDate(e.target.value)}
                        className="w-full bg-[#f8fafb] border border-[#c2c7cc]/50 text-[#191c1d] px-3 py-2.5 rounded-lg outline-none text-xs font-semibold focus:border-[#00AFEF] transition-all"
                      />
                    </label>
                  </div>
                </div>

                {/* Conversational Prompt Card */}
                <div className="bg-white rounded-2xl border border-[#c2c7cc]/30 p-5 shadow-sm flex flex-col gap-4">
                  <h3 className="text-xs font-extrabold tracking-wider text-[#002D40] uppercase border-b border-[#c2c7cc]/20 pb-3 font-display flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#00AFEF] text-base">chat</span>
                    Extra preferences (optional)
                  </h3>
                  
                  <textarea
                    rows="4"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Add any extra requests like food preferences, pace, scenery, or hotel style..."
                    className="w-full bg-[#f8fafb] border border-[#c2c7cc]/50 text-[#191c1d] p-3 rounded-lg outline-none text-xs font-semibold focus:border-[#00AFEF] transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* guests & Duration Card */}
                <div className="bg-white rounded-2xl border border-[#c2c7cc]/30 p-5 shadow-sm flex flex-col gap-5">
                  <h3 className="text-xs font-extrabold tracking-wider text-[#002D40] uppercase border-b border-[#c2c7cc]/20 pb-3 font-display flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#34E0A1] text-base filled">group</span>
                    People & duration
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* guests */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">adult guests</span>
                      <div className="flex items-center justify-between bg-[#f8fafb] border border-[#c2c7cc]/50 rounded-lg p-1.5">
                        <button 
                          onClick={() => setAiGuests(Math.max(1, aiGuests - 1))}
                          className="w-7 h-7 rounded bg-white border border-[#c2c7cc]/30 flex items-center justify-center font-bold text-xs hover:border-[#00AFEF] active:scale-95 transition-all"
                        >
                          -
                        </button>
                        <span className="text-xs font-extrabold text-[#002D40]">{aiGuests}</span>
                        <button 
                          onClick={() => setAiGuests(Math.min(10, aiGuests + 1))}
                          className="w-7 h-7 rounded bg-white border border-[#c2c7cc]/30 flex items-center justify-center font-bold text-xs hover:border-[#00AFEF] active:scale-95 transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Duration (Days)</span>
                      <div className="flex items-center justify-between bg-[#f8fafb] border border-[#c2c7cc]/50 rounded-lg p-1.5">
                        <button 
                          onClick={() => setAiDays(Math.max(1, aiDays - 1))}
                          className="w-7 h-7 rounded bg-white border border-[#c2c7cc]/30 flex items-center justify-center font-bold text-xs hover:border-[#00AFEF] active:scale-95 transition-all"
                        >
                          -
                        </button>
                        <span className="text-xs font-extrabold text-[#002D40]">{aiDays}</span>
                        <button 
                          onClick={() => setAiDays(Math.min(10, aiDays + 1))}
                          className="w-7 h-7 rounded bg-white border border-[#c2c7cc]/30 flex items-center justify-center font-bold text-xs hover:border-[#00AFEF] active:scale-95 transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Realm & Vibe Card */}
                <div className="bg-white rounded-2xl border border-[#c2c7cc]/30 p-5 shadow-sm flex flex-col gap-4">
                  <h3 className="text-xs font-extrabold tracking-wider text-[#002D40] uppercase border-b border-[#c2c7cc]/20 pb-3 font-display flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#00AFEF] text-base">explore</span>
                    Trip style (optional)
                  </h3>

                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5 text-xs text-[#42484c] font-bold">
                      <span>Destination scope</span>
                      <select
                        value={aiRealm}
                        onChange={(e) => setAiRealm(e.target.value)}
                        className="w-full bg-[#f8fafb] border border-[#c2c7cc]/50 text-[#191c1d] px-3 py-2.5 rounded-lg outline-none text-xs font-semibold cursor-pointer focus:border-[#00AFEF] transition-all"
                      >
                        <option value="all">All curations (Global & Bangalore)</option>
                        <option value="bangalore">Bangalore slow-travel sectors only</option>
                        <option value="global">Global elite destinations only</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1.5 text-xs text-[#42484c] font-bold">
                      <span>Atmosphere style</span>
                      <select
                        value={aiVibe}
                        onChange={(e) => setAiVibe(e.target.value)}
                        className="w-full bg-[#f8fafb] border border-[#c2c7cc]/50 text-[#191c1d] px-3 py-2.5 rounded-lg outline-none text-xs font-semibold cursor-pointer focus:border-[#00AFEF] transition-all"
                      >
                        <option value="Zen">Zen Tranquility (moss gardens, temples)</option>
                        <option value="Heritage">Classical Heritage (Windsor, Tipu Palace)</option>
                        <option value="Coastal">Coastal Elegance (Santorini coves, Amalfi)</option>
                        <option value="Sanctuary">Serene Sanctuary (crowd-free bays, stone alleys)</option>
                      </select>
                    </label>
                  </div>
                </div>

                {/* Budget Range Card */}
                <div className="bg-white rounded-2xl border border-[#c2c7cc]/30 p-5 shadow-sm flex flex-col gap-4">
                  <h3 className="text-xs font-extrabold tracking-wider text-[#002D40] uppercase border-b border-[#c2c7cc]/20 pb-3 font-display flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#34E0A1] text-base filled">payments</span>
                    Budget
                  </h3>

                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center text-xs font-bold text-[#002D40]">
                      <span>Total trip budget</span>
                      <span className="bg-[#00AFEF]/10 px-2 py-0.5 rounded text-[#00AFEF] text-[10px] font-extrabold font-display">
                        ${aiBudget} total
                      </span>
                    </div>

                    <div className="flex flex-col gap-3">
                      <label className="flex flex-col gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <span>Enter your total trip budget</span>
                        <input 
                          type="number"
                          min="100"
                          step="50"
                          value={aiBudget}
                          onChange={(e) => setAiBudget(Math.max(100, parseInt(e.target.value || '0', 10) || 0))}
                          className="w-full bg-[#f8fafb] border border-[#c2c7cc]/50 text-[#191c1d] px-3 py-2.5 rounded-lg outline-none text-xs font-semibold focus:border-[#00AFEF] transition-all"
                        />
                      </label>

                      <div className="rounded-lg bg-[#002D40]/5 border border-[#002D40]/10 px-3 py-2 text-[10px] font-bold text-[#002D40] uppercase tracking-wider">
                        Estimated daily planning budget: ${aiBudgetRange.dailyBudget}/day
                      </div>
                    </div>
                  </div>
                </div>

                {/* Synthesis Trigger Button */}
                <div className="bg-white rounded-2xl border border-[#c2c7cc]/30 p-4 shadow-sm flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">Planner Mode</span>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                      <button
                        onClick={() => setAiMode('local')}
                        className={`px-3 py-1 text-xs rounded-lg font-bold ${aiMode === 'local' ? 'bg-[#00AFEF] text-white' : 'text-slate-600'}`}
                      >
                        Local Dataset
                      </button>
                      <button
                        onClick={() => setAiMode('llm')}
                        className={`px-3 py-1 text-xs rounded-lg font-bold ${aiMode === 'llm' ? 'bg-[#00AFEF] text-white' : 'text-slate-600'}`}
                      >
                        Remote LLM
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-slate-500">Current: <span className="font-bold">{aiMode === 'local' ? 'Local Dataset' : 'Remote LLM'}</span></div>
                    {aiMode === 'llm' && (
                      <input
                        type="text"
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="ml-3 text-xs px-2 py-1 rounded border border-[#c2c7cc]/40"
                        placeholder="LLM model (e.g. qwen/qwen3.5-122b-a10b)"
                      />
                    )}
                  </div>
                </div>
                <button
                  onClick={handleGenerateAiPlan}
                  disabled={aiLoading}
                  className="w-full bg-[#002D40] hover:bg-[#00AFEF] disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <span className="material-symbols-outlined text-base animate-spin">sync</span>
                      <span>Synthesizing Realities...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base animate-pulse">psychology</span>
                      <span>PLAN TRIP WITH AI</span>
                    </>
                  )}
                </button>

              </div>

              {/* Right Output columns (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* 1. Placeholder State */}
                {!aiResult && !aiLoading && (
                  <div className="bg-[#eceeef]/30 rounded-3xl border border-dashed border-[#c2c7cc]/50 py-32 px-6 text-center flex flex-col items-center justify-center gap-4 animate-fadeIn">
                    <div className="w-16 h-16 rounded-full bg-white border border-[#c2c7cc]/30 flex items-center justify-center shadow-sm text-slate-400">
                      <span className="material-symbols-outlined text-4xl">travel_explore</span>
                    </div>
                    <h3 className="font-display text-[#002D40] text-lg font-black uppercase tracking-wider mt-2">Aura planning engine standby</h3>
                    <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                      Configure your travel scopings on the left. Our engine will calculate quiet detours, handpick premium hotels, and plan your dynamic slow-travel itineraries.
                    </p>
                  </div>
                )}

                {/* 2. Loading State */}
                {aiLoading && (
                  <div className="bg-white rounded-3xl border border-[#c2c7cc]/30 p-12 text-center flex flex-col items-center justify-center gap-8 shadow-sm min-h-[480px]">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-[#00AFEF]/10 border-t-[#00AFEF] animate-spin" />
                      <span className="material-symbols-outlined text-3xl text-[#00AFEF] animate-pulse">explore</span>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <h3 className="font-display text-[#002D40] text-lg font-black uppercase tracking-wider">Synthesizing Realities</h3>
                      <p className="text-xs text-slate-500 font-semibold animate-pulse uppercase tracking-widest font-display">
                        Running Dijkstra Cost Optimization matrices...
                      </p>
                    </div>

                    <div className="w-full max-w-xs bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#34E0A1] h-full rounded-full animate-progress" />
                    </div>
                  </div>
                )}

                {/* 3. Generated Plan Outcome Display */}
                {aiResult && !aiLoading && activeAiPlan && (
                  <div className="flex flex-col gap-6 animate-fadeIn">
                    <div className="bg-[#002D40] text-white rounded-3xl p-6 border border-[#34E0A1]/20 shadow-md flex flex-col gap-5">
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                        <div className="min-w-0">
                          <span className="text-[#34E0A1] text-[10px] font-black uppercase tracking-widest font-display bg-[#34E0A1]/10 px-2.5 py-1 rounded border border-[#34E0A1]/20 inline-block">
                            Finalized Itinerary
                          </span>
                          <h2 className="font-display text-2xl md:text-3xl font-black text-white mt-2 uppercase tracking-wide leading-tight">
                            {activeAiPlan.title || 'Custom Trip Plan'}
                          </h2>
                          <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
                            {activeAiPlan.vibe || 'A single tailored itinerary built from your destination, budget, and preferences.'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">CURATED TRIP DURATION</span>
                          <span className="font-display text-3xl font-black text-[#00AFEF]">{aiDays} Days</span>
                          <span className="block text-[10px] text-slate-400 uppercase tracking-wider mt-1">{aiGuests} guests · {aiMode === 'local' ? 'Local dataset' : 'Remote LLM'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-2xl bg-slate-950/40 border border-white/10 p-3">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-black block">Hotel</span>
                          <p className="text-sm font-bold mt-1 truncate">{activeAiPlan.hotel?.name || 'No hotel selected'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-950/40 border border-white/10 p-3">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-black block">Total trip</span>
                          <p className="text-sm font-bold mt-1 text-[#34E0A1]">${activeAiPlan.costSummary?.totalTrip || 0}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-950/40 border border-white/10 p-3">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-black block">Daily average</span>
                          <p className="text-sm font-bold mt-1">${activeAiPlan.costSummary?.dailyAverage || 0}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-950/40 border border-white/10 p-3">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-black block">Serenity score</span>
                          <p className="text-sm font-bold mt-1 text-[#00AFEF]">{activeAiPlan.serenityScore || 0}%</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <div className="lg:col-span-8 flex flex-col gap-5">
                        <div className="flex items-center gap-2 border-b border-[#c2c7cc]/30 pb-3">
                          <span className="material-symbols-outlined text-sm text-[#00AFEF]">calendar_month</span>
                          <h3 className="text-xs font-extrabold tracking-widest text-[#002D40] uppercase font-display">Day-by-day schedule</h3>
                        </div>

                        <div className="flex flex-col gap-4">
                          {activeAiPlan.days?.map((day) => (
                            <div key={`day-${day.dayNumber}`} className="bg-white rounded-2xl border border-[#c2c7cc]/30 p-5 shadow-sm flex flex-col gap-4">
                              <div className="flex items-center justify-between gap-3 border-b border-[#c2c7cc]/20 pb-3">
                                <span className="text-[#00AFEF] text-xs font-black uppercase tracking-wider font-display bg-[#00AFEF]/10 px-3 py-1 rounded-lg">
                                  {day.dateLabel || `Day ${day.dayNumber}`}
                                </span>
                                <span className="text-xs font-bold text-[#002D40] font-display text-right">{day.theme}</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(day.activities || []).map((act, idx) => (
                                  <div key={`act-${idx}`} className="bg-[#f8fafb] border border-[#c2c7cc]/40 rounded-xl p-3.5 flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[8px] uppercase tracking-widest text-[#00AFEF] font-black">{act.vibe}</span>
                                      <span className="text-[9px] font-black text-[#34E0A1]">★ {act.rating || 4.8}</span>
                                    </div>
                                    <h4 className="text-xs font-black text-[#002D40]">{act.name}</h4>
                                    <p className="text-[10px] text-[#42484c] leading-relaxed">{act.description}</p>
                                  </div>
                                ))}

                                {(day.restaurants || []).map((rest, idx) => (
                                  <div key={`rest-${idx}`} className="bg-orange-50/20 border border-orange-100 rounded-xl p-3.5 flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[8px] uppercase tracking-widest text-orange-600 font-black">Dining</span>
                                      <span className="text-[9px] font-black text-[#34E0A1]">★ {rest.rating || 4.7}</span>
                                    </div>
                                    <h4 className="text-xs font-black text-orange-950">{rest.name}</h4>
                                    <p className="text-[10px] text-orange-900/80 leading-relaxed">{rest.description}</p>
                                  </div>
                                ))}

                                {(day.hangouts || []).map((hng, idx) => (
                                  <div key={`hng-${idx}`} className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-3.5 flex flex-col gap-1.5 md:col-span-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[8px] uppercase tracking-widest text-emerald-700 font-black">Quiet Hangout</span>
                                      <span className="text-[9px] font-black text-[#34E0A1]">★ {hng.rating || 4.8}</span>
                                    </div>
                                    <h4 className="text-xs font-black text-emerald-950">{hng.name}</h4>
                                    <p className="text-[10px] text-emerald-900/80 leading-relaxed">{hng.description}</p>
                                  </div>
                                ))}
                              </div>

                              {day.travelOptions?.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {day.travelOptions.map((option, idx) => (
                                    <div key={`travel-${idx}`} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5">
                                      <div className="flex justify-between items-center gap-2">
                                        <span className="text-[8px] uppercase tracking-widest text-[#00AFEF] font-black">{option.mode || option.name || 'Travel'}</span>
                                        <span className="text-[9px] font-black text-[#34E0A1]">{option.estimatedFare === 0 ? 'Free' : `$${option.estimatedFare}`}</span>
                                      </div>
                                      <p className="text-[10px] text-[#42484c] leading-relaxed">{option.description || option.details || 'Transport option for this day.'}</p>
                                      {option.duration && <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{option.duration}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {day.cabTransfer && (
                                <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                                  <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="bg-[#e0f2fe] text-[#0284c7] p-2.5 rounded-xl shrink-0">
                                      <span className="material-symbols-outlined text-xl">local_taxi</span>
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-[8px] uppercase tracking-widest text-[#0369a1] font-black block">Private Ride Transfer</span>
                                      <h4 className="text-xs font-black text-[#0f172a]">{day.cabTransfer.cabType} (Estimated Fare: ${day.cabTransfer.estimatedFare})</h4>
                                      <p className="text-[10px] text-slate-600 truncate mt-0.5">{day.cabTransfer.routeDescription} · Pickup: {day.cabTransfer.pickupTime}</p>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      setSelectedCabTransfer({
                                        ...day.cabTransfer,
                                        date: day.dateLabel || `Day ${day.dayNumber}`,
                                        theme: day.theme
                                      });
                                      setShowCabModal(true);
                                      setBookingConfirmed(false);
                                      setBookingLoading(false);
                                    }}
                                    className="w-full sm:w-auto bg-[#00AFEF] hover:bg-[#002D40] text-white font-bold py-2.5 px-4 rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer text-center"
                                  >
                                    Book Cab
                                  </button>
                                </div>
                              )}

                              <div className="bg-[#eceeef]/40 rounded-xl p-3 border border-[#c2c7cc]/30 flex items-start gap-2.5 text-[10px] text-[#42484c] font-semibold leading-relaxed">
                                <span className="material-symbols-outlined text-[#34E0A1] text-base leading-none">directions_walk</span>
                                <p>{day.routeInstructions}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-white rounded-2xl border border-[#c2c7cc]/30 p-5 shadow-sm flex flex-col gap-4">
                          <h4 className="text-xs font-extrabold tracking-wider text-[#002D40] uppercase border-b border-[#c2c7cc]/20 pb-3 font-display">
                            Budget snapshot
                          </h4>
                          <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Lodging</span>
                              <span className="text-base font-extrabold text-[#002D40] font-display">${activeAiPlan.costSummary?.hotelCostPerNight || 0}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Activities</span>
                              <span className="text-base font-extrabold text-[#002D40] font-display">${Math.round((activeAiPlan.costSummary?.activitiesCost || 0) / Math.max(1, aiDays))}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Food</span>
                              <span className="text-base font-extrabold text-[#002D40] font-display">${Math.round((activeAiPlan.costSummary?.foodCost || 0) / Math.max(1, aiDays))}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Cab</span>
                              <span className="text-base font-extrabold text-[#002D40] font-display">${Math.round((activeAiPlan.costSummary?.cabCost || 0) / Math.max(1, aiDays))}</span>
                            </div>
                          </div>

                          <div className="h-[1px] bg-[#c2c7cc]/20" />

                          <div className="flex justify-between items-center text-xs font-bold text-[#002D40]">
                            <span>Grand Total</span>
                            <span className="text-[#00AFEF] text-sm font-extrabold font-display">${activeAiPlan.costSummary?.totalTrip || 0}</span>
                          </div>

                          <button 
                            onClick={() => setCurrentPage('bookings')}
                            className="w-full bg-[#00AFEF] hover:bg-[#002D40] text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-wider shadow-sm transition-colors cursor-pointer text-center"
                          >
                            Book My Entire Journey
                          </button>

                          <button
                            onClick={() => {
                              setSelectedDest(activeAiPlan.hotel || destinations.find(d => d.category === 'hotel'));
                              setCurrentPage('detail');
                            }}
                            className="w-full bg-transparent hover:bg-slate-100 text-[#002D40] border border-[#c2c7cc]/80 py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer text-center"
                          >
                            Explore Hotel Details
                          </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-[#c2c7cc]/30 p-5 shadow-sm flex flex-col gap-4">
                          <div className="flex items-center justify-between gap-3 border-b border-[#c2c7cc]/20 pb-3">
                            <div>
                              <h4 className="text-xs font-extrabold tracking-wider text-[#002D40] uppercase font-display flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm text-[#00AFEF]">rate_review</span>
                                Feedback Analysis
                              </h4>
                              <p className="text-[10px] text-slate-500 font-semibold mt-1">Rate the trip components to see an instant quality summary.</p>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#00AFEF] bg-[#00AFEF]/10 px-2.5 py-1 rounded-lg">
                              {feedbackAnalysis.averageScore}/5 · {feedbackAnalysis.sentiment}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { key: 'hotel', label: 'Hotel stay' },
                              { key: 'transport', label: 'Transport' },
                              { key: 'restaurants', label: 'Restaurants' },
                              { key: 'activities', label: 'Activities' }
                            ].map(item => (
                              <label key={item.key} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{item.label}</span>
                                <input
                                  type="range"
                                  min="1"
                                  max="5"
                                  step="0.5"
                                  value={tripFeedback[item.key]}
                                  onChange={(e) => setTripFeedback(prev => ({ ...prev, [item.key]: parseFloat(e.target.value) }))}
                                  className="w-full h-1 bg-slate-200 rounded-lg cursor-pointer accent-[#00AFEF]"
                                />
                                <span className="text-xs font-black text-[#002D40]">{tripFeedback[item.key]}/5</span>
                              </label>
                            ))}
                          </div>

                          <label className="flex flex-col gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Notes</span>
                            <textarea
                              rows="3"
                              value={tripFeedback.note}
                              onChange={(e) => setTripFeedback(prev => ({ ...prev, note: e.target.value }))}
                              placeholder="Add any feedback about pace, hotel comfort, food variety, or transport timing..."
                              className="w-full bg-[#f8fafb] border border-[#c2c7cc]/50 text-[#191c1d] p-3 rounded-lg outline-none text-xs font-semibold focus:border-[#00AFEF] transition-all resize-none"
                            />
                          </label>

                          <button
                            onClick={handleGenerateAutoReport}
                            disabled={!activeAiPlan}
                            className="w-full bg-[#34E0A1] hover:bg-[#1ecf92] disabled:bg-slate-400 text-[#002D40] font-bold py-3 rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer text-center disabled:cursor-not-allowed"
                          >
                            Generate Auto Report
                          </button>

                          <button
                            onClick={handleDownloadAutoReport}
                            disabled={!autoReport?.reportText}
                            className="w-full bg-transparent border border-[#c2c7cc]/70 hover:border-[#00AFEF] hover:bg-[#00AFEF]/5 text-[#002D40] font-bold py-3 rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Download PDF
                          </button>

                          <div className="rounded-xl bg-slate-950/35 border border-[#002D40]/10 p-4">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#34E0A1] block mb-2">Report preview</span>
                            <p className="text-[11px] leading-relaxed text-slate-700 whitespace-pre-line max-h-48 overflow-auto">
                              {autoReport?.reportText || 'Click Generate Auto Report to create a trip summary from the active itinerary.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

        {currentPage === 'new-ai-planner' && (
          <div className="animate-fadeIn">
            <AITripPlanner onConfirmPlan={(plan) => {
              setConfirmedBookings(prev => [plan, ...prev]);
              setCurrentPage('bookings');
            }} />
          </div>
        )}

        {/* ==================== PAGE 5: BOOKINGS & REWARDS ==================== */}
        {currentPage === 'bookings' && (
          <div className="max-w-7xl mx-auto px-6 md:px-20 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
            
            {/* Left Column: Bookings details (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-8">
              <header>
                <h1 className="font-display-lg text-3xl font-extrabold text-[#002D40] mb-2">My Bookings</h1>
                <p className="text-sm text-[#42484c] font-medium">Review and manage your upcoming adventures and past journeys.</p>
              </header>

              {/* Filters */}
              <div className="flex border-b border-[#c2c7cc]/30 mb-4 font-label-bold text-xs font-bold uppercase tracking-wider gap-2">
                <button className="px-4 py-2 text-[#002D40] border-b-2 border-b-[#00AFEF]">Upcoming ({2 + confirmedBookings.length})</button>
                <button className="px-4 py-2 text-[#42484c] hover:text-[#00AFEF] transition-colors">Completed</button>
                <button className="px-4 py-2 text-[#42484c] hover:text-[#00AFEF] transition-colors">Cancelled</button>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Dynamically mapped confirmed AI bookings */}
                {confirmedBookings.map((booking, idx) => (
                  <div key={`ai-booking-${idx}`} className="booking-card bg-white rounded-2xl border border-[#00AFEF]/50 overflow-hidden flex flex-col card-hover shadow-lg shadow-[#00AFEF]/10">
                    <div className="relative h-48 overflow-hidden bg-slate-900 flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-white/20">auto_awesome</span>
                      <div className="absolute inset-0 bg-gradient-to-tr from-[#00af87]/20 to-blue-500/20" />
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center space-x-1 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-[#00af87] animate-pulse"></span>
                        <span className="font-label-caps text-[9px] uppercase tracking-wider text-[#002D40] font-black">AI Confirmed</span>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-headline-sm text-base font-extrabold text-[#002D40] truncate max-w-[80%]">{booking.formData.destination}</h3>
                        <span className="material-symbols-outlined text-[#00AFEF]">flight</span>
                      </div>
                      <p className="text-xs text-[#42484c] mb-4 flex items-center space-x-2 font-semibold">
                        <span className="material-symbols-outlined text-sm">calendar_month</span>
                        <span>{booking.formData.startDate} - {booking.formData.endDate}</span>
                      </p>
                      <div className="mt-auto pt-4 border-t border-[#c2c7cc]/30 flex justify-between items-center">
                        <div className="flex items-center space-x-2 text-[#42484c]">
                          <span className="material-symbols-outlined text-sm">group</span>
                          <span className="text-xs font-bold">{booking.formData.people} Guests</span>
                        </div>
                        <button 
                          className="font-label-bold text-xs uppercase font-extrabold text-[#00AFEF] hover:text-[#002D40] transition-colors"
                        >
                          View Itinerary
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Santorini booking card */}
                <div className="booking-card bg-white rounded-2xl border border-[#c2c7cc]/30 overflow-hidden flex flex-col card-hover">
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    <img 
                      alt="Santorini buildings" 
                      className="card-image w-full h-full object-cover transition-transform duration-500" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBSGiUHFO0_z3EaTh9VU5ujCCw90zAK5tlZfakW8-fbaU9OenZqhbcazi0JEsnpu_IwCdeahSu28ZmsX26Vt0c_hvafy3j8UtEMo_CnQPG6IAYWoF1hyHjFbaj-rV9nni6gXOD9qEzN3A2lNKIGOfk4sFIEuWSJjYTL5A8UkZGgevOECVjG4ri80Gtm2cSAGZFoKbLwTjOlG4aIdlL93ZOya9Sando8cJVaLe2Yetmt9oo9VgR0zI3stgr1hRAA5XB1X2Fb1Yh1J0"
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center space-x-1 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-[#34E0A1]"></span>
                      <span className="font-label-caps text-[9px] uppercase tracking-wider text-[#002D40] font-black">Confirmed</span>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-headline-sm text-base font-extrabold text-[#002D40]">Santorini Escape</h3>
                      <span className="material-symbols-outlined text-[#00AFEF]">flight</span>
                    </div>
                    <p className="text-xs text-[#42484c] mb-4 flex items-center space-x-2 font-semibold">
                      <span className="material-symbols-outlined text-sm">calendar_month</span>
                      <span>Oct 15 - Oct 22, 2026</span>
                    </p>
                    <div className="mt-auto pt-4 border-t border-[#c2c7cc]/30 flex justify-between items-center">
                      <div className="flex items-center space-x-2 text-[#42484c]">
                        <span className="material-symbols-outlined text-sm">group</span>
                        <span className="text-xs font-bold">2 Guests</span>
                      </div>
                      <button 
                        onClick={() => setCurrentPage('search')}
                        className="font-label-bold text-xs uppercase font-extrabold text-[#00AFEF] hover:text-[#002D40] transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>

                {/* Kyoto booking card */}
                <div className="booking-card bg-white rounded-2xl border border-[#c2c7cc]/30 overflow-hidden flex flex-col card-hover">
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    <img 
                      alt="Kyoto Arashiyama path" 
                      className="card-image w-full h-full object-cover transition-transform duration-500" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAA86rNJ_5OGZ_0bjPCTdqx7ky-JemSZEWigao1p8YbiP-rTefSu4ZB56x5LPwMY_lMBwKb8gXS6DSVwUi_7568t42jCmDtjPkGpFLB-fM4-fqSP5l2Nbx_m8_zcWqywvRd72XsGEVv6B15GHa76RR5oESTZacYXVIlVVnnCq4cWRmUp4b-95Chl2SHD-MpDWoPDVlaPg7anjG0TS_2JcrdtBzzb0MP9soFTJT9Lt-yUkfUptJ1jssHSDmi0GWyMjaT7fjtN_OdKyc"
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center space-x-1 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-[#FFC56F]"></span>
                      <span className="font-label-caps text-[9px] uppercase tracking-wider text-[#002D40] font-black">Processing</span>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-headline-sm text-base font-extrabold text-[#002D40]">Kyoto Cultural Tour</h3>
                      <span className="material-symbols-outlined text-[#00AFEF]">explore</span>
                    </div>
                    <p className="text-xs text-[#42484c] mb-4 flex items-center space-x-2 font-semibold">
                      <span className="material-symbols-outlined text-sm">calendar_month</span>
                      <span>Nov 05 - Nov 14, 2026</span>
                    </p>
                    <div className="mt-auto pt-4 border-t border-[#c2c7cc]/30 flex justify-between items-center">
                      <div className="flex items-center space-x-2 text-[#42484c]">
                        <span className="material-symbols-outlined text-sm">group</span>
                        <span className="text-xs font-bold">1 Guest</span>
                      </div>
                      <button 
                        onClick={() => setCurrentPage('search')}
                        className="font-label-bold text-xs uppercase font-extrabold text-[#00AFEF] hover:text-[#002D40] transition-colors"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Right Column: Loyalty widgets & travel credit (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Rewards Points */}
              <div className="bg-[#002D40] text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
                  <span className="material-symbols-outlined text-9xl">star</span>
                </div>
                <div className="relative z-10 flex flex-col gap-4">
                  <div>
                    <h3 className="font-headline-sm text-lg font-extrabold text-white">Voyage Elite Rewards</h3>
                    <div className="text-xs text-white/70 font-semibold mt-0.5">Platinum Member</div>
                  </div>

                  <div className="flex items-baseline space-x-2">
                    <span className="font-display-lg text-4xl font-extrabold">42,500</span>
                    <span className="font-label-caps text-xs text-[#34E0A1] font-black uppercase">Pts</span>
                  </div>

                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="flex justify-between text-xs mb-2 text-white/90">
                      <span>Next Tier: Diamond</span>
                      <span className="font-bold">7,500 pts to go</span>
                    </div>
                    <div className="w-full bg-[#002D40]/50 rounded-full h-2">
                      <div className="bg-[#00AFEF] h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>

                  <button className="w-full py-2.5 bg-[#00AFEF] text-white font-label-bold text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#34E0A1] transition-colors cursor-pointer shadow-md">
                    Redeem Points
                  </button>
                </div>
              </div>

              {/* Travel Credit Widget */}
              <div className="bg-white rounded-2xl border border-[#c2c7cc]/30 p-6 shadow-sm flex flex-col gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#2cbcfd]/20 text-[#00658c] flex items-center justify-center">
                    <span className="material-symbols-outlined">account_balance_wallet</span>
                  </div>
                  <h3 className="font-headline-sm text-base font-extrabold text-[#002D40]">Travel Credit</h3>
                </div>
                
                <div className="font-display-lg text-3xl font-extrabold text-[#002D40]">$850.00</div>
                <p className="text-xs text-[#42484c] font-semibold">Expires Dec 31, 2026</p>
                
                <button className="text-[#00AFEF] font-label-bold text-xs font-bold uppercase hover:text-[#002D40] transition-colors flex items-center space-x-1 mt-2">
                  <span>View Credit History</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ==================== PAGE 6: ABOUT US PHILOSOPHY ==================== */}
        {currentPage === 'about' && (
          <div className="animate-fadeIn">
            {/* Hero Header */}
            <section className="relative h-[480px] w-full flex items-center justify-center overflow-hidden bg-slate-900">
              <img 
                alt="Scenic travel landscapes" 
                className="absolute inset-0 w-full h-full object-cover opacity-50"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAu64zo42UQSMwMp540qu40KesCU9ll5Yco1ipTrTkXLPg-dXcNV1AP7m0TcCGk4SSoakMUofD8aha_Hu28Z3ieN0vCtnhgtYMweAQw73Smd4_VIvBYrxOYHVlY--yDeSrzFwvRVdX0aTJWTLcGMF89TRS75kDbqnTdO5rvyLG39CKG-VuZK6qtFRWZ_lqmisO25y5i6ycfr5oblczwlybb2bDkO3231syMR7KD-nI2NsgyIqe-j2TMsVjQikjKrdIXO4ZsejCscsw"
              />
              <div className="absolute inset-0 bg-[#002D40]/60 mix-blend-multiply" />
              <div className="relative z-10 w-full max-w-3xl px-6 text-center text-white">
                <span className="text-[#34E0A1] text-xs font-black uppercase tracking-widest font-display mb-2">
                  Our Philosophy & Roots
                </span>
                <h1 className="font-display-lg text-3xl md:text-5xl text-white font-extrabold leading-tight mb-4 drop-shadow-md">
                  Redefining Luxury Travel
                </h1>
                <p className="text-xs md:text-sm text-white/90 max-w-xl mx-auto leading-relaxed font-semibold">
                  A legacy of curated exploration and design built around slow-travel, quiet heritage bypasses, and serene environmental connection.
                </p>
              </div>
            </section>

            {/* Core Values grid details */}
            <section className="py-20 max-w-7xl mx-auto px-6 md:px-20 flex flex-col gap-16">
              
              {/* Legacy story */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-6 flex flex-col gap-4">
                  <span className="text-[#00AFEF] text-xs font-black uppercase tracking-widest font-display">Our Legacy</span>
                  <h2 className="font-headline-lg text-2xl text-[#002D40] font-extrabold font-display">A Legacy of Exploration</h2>
                  <p className="text-xs md:text-sm text-[#42484c] leading-relaxed font-medium">
                    Established in 2024, Voyage Elite set out to create alternatives to congested travel circuits. We discovered that by routing through quiet local gems and matching sensory profiles, we can preserve both ancient histories and modern peace of mind.
                  </p>
                </div>
                <div className="md:col-span-6 rounded-2xl overflow-hidden h-[300px] w-full bg-slate-100">
                  <img 
                    alt="Travel path overview" 
                    className="w-full h-full object-cover" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFBDqVItih-3H4zpMmNvvOcmZyI_OLc2od8u7m6AK0I6bwHVegjtw8nGXHW6BxyfgCvIr2bKYbW4BmWar8RJ7utfCMF2GXr11KRPhEVJAXkavIvJciGSy9TWp4fWC3AHjU9J1pfrrkh5z7VzfUCJpTRyQ98Cl-ni6ah0L__6KotWgB_NRcrrpm4BOlPWJUjDMCm_thJWRhsuoUTIJRgRIoQG3x8JbJeKRcXn4RmVwxkav_O-3HJMWH7bl6C3iC3WiDFB05dTVlEeE"
                  />
                </div>
              </div>

              {/* Core values */}
              <div className="bg-[#eceeef]/40 border border-[#c2c7cc]/30 rounded-2xl p-8">
                <h3 className="font-headline-lg text-xl text-[#002D40] font-display mb-8 text-center">Our Core Values</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { title: "Serenity First", desc: "We prioritize crowd-free landscapes and quiet walking loops that bypass municipal congestion indexes." },
                    { title: "Historical Context", desc: "Every walk matches chronological epochs, using digital comparison portals to connect Then and Now." },
                    { title: "Tactile Design", desc: "Premium styling tokens, Plus Jakarta Sans typography, and frosted glass interfaces that mirror environmental flow." }
                  ].map(val => (
                    <div key={val.title} className="bg-white rounded-xl p-6 border border-[#c2c7cc]/30 shadow-sm">
                      <h4 className="font-headline-sm text-base font-extrabold text-[#002D40] mb-2">{val.title}</h4>
                      <p className="text-xs text-[#42484c] leading-relaxed font-medium">{val.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Call to Action */}
              <div className="bg-[#002D40] text-white rounded-2xl p-8 text-center flex flex-col items-center gap-4 border border-[#002D40]/25 shadow-xl">
                <span className="text-[#34E0A1] text-xs font-black uppercase tracking-widest font-display">Begin Your Journey</span>
                <h3 className="font-headline-lg text-2xl text-white font-extrabold">Ready to Transcend the Ordinary?</h3>
                <p className="text-xs text-white/80 max-w-md font-semibold">Join Voyage Elite today to unlock exclusive low-crowd paths and dynamic offline guides.</p>
                <button 
                  onClick={() => setCurrentPage('search')}
                  className="bg-[#00AFEF] text-white px-8 py-2.5 rounded-full font-label-bold text-xs uppercase tracking-wider hover:bg-[#34E0A1] transition-colors cursor-pointer mt-2 shadow-md"
                >
                  Start Planning
                </button>
              </div>

            </section>
          </div>
        )}

      </main>

      {/* ==================== AURA CONCIERGE ONBOARDING MODAL OVERLAY ==================== */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-[#001723]/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6 transition-all duration-300">
          <div className="bg-[#002233] border border-[#00AFEF]/30 text-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#002D40] to-[#00AFEF]/20 px-6 py-5 border-b border-[#00AFEF]/20 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#34E0A1] text-2xl animate-pulse">spa</span>
                <span className="font-display text-sm font-extrabold uppercase tracking-widest text-slate-100">Aura Concierge Assistant</span>
              </div>
              <button 
                onClick={() => {
                  if (!userName) setUserName('Discerning Traveler');
                  setShowOnboarding(false);
                }} 
                className="text-slate-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Steps Container */}
            <div className="flex-grow p-6 md:p-8 overflow-y-auto flex flex-col gap-6 scrollbar-thin">
              
              {/* Step indicator */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-extrabold tracking-wider uppercase border-b border-slate-800 pb-3">
                <span>Tailoring Your Experience</span>
                <span className="text-[#34E0A1]">Step {onboardingStep} of 4</span>
              </div>

              {/* Step 1: Name */}
              {onboardingStep === 1 && (
                <div className="flex flex-col gap-6 animate-slideIn">
                  <div className="flex flex-col gap-2">
                    <h2 className="font-display text-2xl font-black text-white leading-tight">
                      Greetings. Welcome to Voyage Elite.
                    </h2>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      I am your Aura Concierge. Let us customize a quiet, culturally rich slow-travel escape specifically suited to your state of mind.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">
                      How shall we address you?
                    </label>
                    <input 
                      type="text" 
                      placeholder="Enter your name (e.g. Nihar)"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full bg-slate-950/60 border border-[#00AFEF]/30 focus:border-[#34E0A1] rounded-xl px-4 py-3.5 text-sm text-white font-semibold outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <button 
                      onClick={() => {
                        setUserName('Discerning Traveler');
                        setShowOnboarding(false);
                      }}
                      className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
                    >
                      Skip Onboarding
                    </button>
                    <button 
                      onClick={() => setOnboardingStep(2)}
                      disabled={!userName.trim()}
                      className="bg-[#00AFEF] hover:bg-[#34E0A1] disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider transition-all shadow-md"
                    >
                      Next Steps
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Region Preference */}
              {onboardingStep === 2 && (
                <div className="flex flex-col gap-6 animate-slideIn">
                  <div className="flex flex-col gap-1">
                    <h2 className="font-display text-2xl font-black text-white leading-tight">
                      Hello, {userName}.
                    </h2>
                    <p className="text-xs text-slate-300 font-medium">
                      What style of slow-travel journey speaks to your soul today?
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Option A: Bangalore */}
                    <div 
                      onClick={() => setOnboardingDestType('bangalore')}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col gap-2 hover:scale-[1.01] ${
                        onboardingDestType === 'bangalore'
                          ? 'bg-[#00AFEF]/10 border-[#34E0A1] shadow-lg shadow-[#34E0A1]/10'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="material-symbols-outlined text-[#34E0A1] text-2xl">route</span>
                        {onboardingDestType === 'bangalore' && (
                          <span className="material-symbols-outlined text-[#34E0A1] text-sm font-black">check_circle</span>
                        )}
                      </div>
                      <h3 className="font-display text-sm font-black text-white uppercase tracking-wider mt-2">Local Heritage Loops</h3>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        Bangalore slow-travel. Explore 1537 city mud forts, Victorian cantonments, and bougainvillea gardens.
                      </p>
                    </div>

                    {/* Option B: Global */}
                    <div 
                      onClick={() => setOnboardingDestType('global')}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col gap-2 hover:scale-[1.01] ${
                        onboardingDestType === 'global'
                          ? 'bg-[#00AFEF]/10 border-[#34E0A1] shadow-lg shadow-[#34E0A1]/10'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="material-symbols-outlined text-[#34E0A1] text-2xl">public</span>
                        {onboardingDestType === 'global' && (
                          <span className="material-symbols-outlined text-[#34E0A1] text-sm font-black">check_circle</span>
                        )}
                      </div>
                      <h3 className="font-display text-sm font-black text-white uppercase tracking-wider mt-2">Global Elite Getaways</h3>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        International curated loops. Dive into Kyoto Zen tranquility, Amalfi coast, and Folegandros cliffs.
                      </p>
                    </div>

                    {/* Option C: Both */}
                    <div 
                      onClick={() => setOnboardingDestType('all')}
                      className={`md:col-span-2 p-4 rounded-xl border cursor-pointer transition-all duration-300 flex items-center justify-between ${
                        onboardingDestType === 'all'
                          ? 'bg-[#00AFEF]/10 border-[#34E0A1]'
                          : 'bg-slate-950/40 border-slate-800'
                      }`}
                    >
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#34E0A1] text-lg">explore</span>
                        Explore All Curated Realms
                      </span>
                      {onboardingDestType === 'all' && (
                        <span className="material-symbols-outlined text-[#34E0A1] text-sm font-black">check_circle</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <button 
                      onClick={() => setOnboardingStep(1)}
                      className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => setOnboardingStep(3)}
                      className="bg-[#00AFEF] hover:bg-[#34E0A1] text-white font-bold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider transition-all shadow-md"
                    >
                      Next Steps
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Mindset / Sliders */}
              {onboardingStep === 3 && (
                <div className="flex flex-col gap-6 animate-slideIn">
                  <div className="flex flex-col gap-1">
                    <h2 className="font-display text-2xl font-black text-white leading-tight">
                      Atmosphere Profile
                    </h2>
                    <p className="text-xs text-slate-300 font-medium">
                      Define the sensory backdrop of your sanctuary.
                    </p>
                  </div>

                  <div className="flex flex-col gap-5 bg-slate-950/40 p-5 rounded-2xl border border-slate-800">
                    {[
                      {
                        id: 'acoustics',
                        label: 'Acoustics (Noise)',
                        icon: 'volume_down',
                        minLabel: 'Silent Escape',
                        maxLabel: 'Social Hubs',
                        value: sensory.acoustics
                      },
                      {
                        id: 'energy',
                        label: 'Energy (Stamina)',
                        icon: 'bolt',
                        minLabel: 'Lazy Stroll',
                        maxLabel: 'High-Adrenaline',
                        value: sensory.energy
                      }
                    ].map(slider => (
                      <div key={slider.id} className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[#34E0A1] text-sm">{slider.icon}</span>
                            {slider.label}
                          </span>
                          <span className="text-[#34E0A1] bg-[#34E0A1]/10 px-2 py-0.5 rounded font-display">
                            {Math.round(slider.value * 100)}%
                          </span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={slider.value}
                          onChange={(e) => handleSensoryChange(slider.id, parseFloat(e.target.value))}
                          className="w-full h-1 bg-slate-900 border border-slate-850 rounded-lg cursor-pointer accent-[#34E0A1]"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                          <span>{slider.minLabel}</span>
                          <span>{slider.maxLabel}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <button 
                      onClick={() => setOnboardingStep(2)}
                      className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleGenerateRecommendations}
                      className="bg-[#34E0A1] text-[#002D40] hover:bg-[#00AFEF] hover:text-white font-black px-6 py-2.5 rounded-full text-xs uppercase tracking-wider transition-all shadow-md"
                    >
                      Find My Sanctuary
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Recommendations */}
              {onboardingStep === 4 && (
                <div className="flex flex-col gap-6 animate-slideIn">
                  <div className="flex flex-col gap-1">
                    <h2 className="font-display text-2xl font-black text-[#34E0A1] leading-tight">
                      Curated For You, {userName}
                    </h2>
                    <p className="text-xs text-slate-300 font-medium">
                      Select a destination to unlock its history, uncrowded detours, and local guides.
                    </p>
                  </div>

                  {isConciergeLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <span className="material-symbols-outlined text-4xl text-[#34E0A1] animate-spin">sync</span>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Synthesizing sensory options...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-5 max-h-[380px] overflow-y-auto pr-1">
                      
                      {/* Culturally Rich */}
                      <div>
                        <h4 className="text-[10px] font-extrabold tracking-wider text-[#34E0A1] uppercase mb-2 font-display flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">history_edu</span>
                          Culturally Rich Heritage Choices
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {conciergeRecommendations.slice(0, 2).map(dest => (
                            <div 
                              key={`cult-${dest.id}`}
                              onClick={() => {
                                handleSelectCard(dest);
                                setShowOnboarding(false);
                              }}
                              className="bg-slate-950/50 hover:bg-slate-900 border border-slate-800 hover:border-[#34E0A1] p-3 rounded-xl cursor-pointer transition-all flex gap-3 items-center group"
                            >
                              <img 
                                src={dest.nowImage || dest.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPEoZkor3hwFp9pBNfIcFT2R8l4fVo3wwroR_VDv5kBmY-d_bPjZeZi2ABMlN7GUSxDwsfpqslnrpp5LWkyfMijrHRXFFLTLK25wmyaofw65uCXcNApf8nXsxY2cN7DRvGKxbTjtmrYXVGGpoqmb8ljRS_0aby-W32kbDSyk6tZazEc7RiChNOttfWgSXMrqPg4eqPOmQk60H9AaUwWVH6LEZxKme8DB8nBin7GEp7w1qEawua-bFQ-jSr3qnikf0lBZpHzxYGBjA'} 
                                alt={dest.name} 
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                              <div className="flex-grow min-w-0">
                                <h5 className="text-xs font-bold text-slate-100 truncate group-hover:text-[#34E0A1]">{dest.name}</h5>
                                <p className="text-[9px] text-slate-400 truncate">{dest.area} · Era {dest.era}</p>
                              </div>
                              <span className="material-symbols-outlined text-slate-500 text-sm group-hover:text-white transition-colors">arrow_forward</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Serene / Uncrowded */}
                      <div>
                        <h4 className="text-[10px] font-extrabold tracking-wider text-[#00AFEF] uppercase mb-2 font-display flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">spa</span>
                          Serene, Uncrowded Slow-Travel Alternatives
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {conciergeRecommendations.slice(2, 4).map(dest => (
                            <div 
                              key={`uncrowd-${dest.id}`}
                              onClick={() => {
                                handleSelectCard(dest);
                                setShowOnboarding(false);
                              }}
                              className="bg-slate-950/50 hover:bg-slate-900 border border-slate-800 hover:border-[#00AFEF] p-3 rounded-xl cursor-pointer transition-all flex gap-3 items-center group"
                            >
                              <img 
                                src={dest.nowImage || dest.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPEoZkor3hwFp9pBNfIcFT2R8l4fVo3wwroR_VDv5kBmY-d_bPjZeZi2ABMlN7GUSxDwsfpqslnrpp5LWkyfMijrHRXFFLTLK25wmyaofw65uCXcNApf8nXsxY2cN7DRvGKxbTjtmrYXVGGpoqmb8ljRS_0aby-W32kbDSyk6tZazEc7RiChNOttfWgSXMrqPg4eqPOmQk60H9AaUwWVH6LEZxKme8DB8nBin7GEp7w1qEawua-bFQ-jSr3qnikf0lBZpHzxYGBjA'} 
                                alt={dest.name} 
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                              <div className="flex-grow min-w-0">
                                <h5 className="text-xs font-bold text-slate-100 truncate group-hover:text-[#00AFEF]">{dest.name}</h5>
                                <p className="text-[9px] text-slate-400 truncate">{dest.area} · Vibe: {dest.vibe}</p>
                              </div>
                              <span className="material-symbols-outlined text-slate-500 text-sm group-hover:text-white transition-colors">arrow_forward</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                  <div className="flex items-center justify-between mt-6">
                    <button 
                      onClick={() => setOnboardingStep(3)}
                      className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => setShowOnboarding(false)}
                      className="bg-transparent border border-slate-700 hover:border-white text-slate-300 hover:text-white font-bold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider transition-all"
                    >
                      Browse Free-form
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ==================== GLOBAL FOOTER ==================== */}
      <footer className="bg-[#001723] text-white py-12 border-t border-[#c2c7cc]/15">
        <div className="max-w-7xl mx-auto px-6 md:px-20 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="font-headline-sm text-lg font-bold text-[#00AFEF] mb-4 font-display">Voyage Elite</div>
            <p className="text-xs text-white/60 mb-2 font-medium">Premium Global Exploration.</p>
            <p className="text-[10px] text-white/40 font-bold tracking-wide">© 2026 Voyage Elite. All rights reserved.</p>
          </div>
          <div className="col-span-3 flex flex-wrap justify-end gap-x-8 gap-y-3 items-center text-xs text-white/65 font-bold uppercase tracking-wider mt-4 md:mt-0">
            <button onClick={() => setCurrentPage('home')} className="hover:text-[#00AFEF] cursor-pointer">Home</button>
            <button onClick={() => setCurrentPage('search')} className="hover:text-[#00AFEF] cursor-pointer">Destinations</button>
            <button onClick={() => setCurrentPage('bookings')} className="hover:text-[#00AFEF] cursor-pointer">Bookings</button>
            <button onClick={() => setCurrentPage('about')} className="hover:text-[#00AFEF] cursor-pointer">About</button>
          </div>
        </div>
      </footer>

      {/* ==================== 🚖 INTERACTIVE CAB BOOKING MODAL ==================== */}
      {showCabModal && selectedCabTransfer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#c2c7cc]/30 shadow-2xl p-8 max-w-md w-full mx-4 flex flex-col gap-6 relative transform transition-all scale-100">
            <button 
              onClick={() => setShowCabModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-sm w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center transition-colors"
            >
              ✕
            </button>

            <header className="flex flex-col gap-1">
              <span className="text-[#00AFEF] text-[10px] font-black uppercase tracking-widest font-display flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm animate-pulse">local_taxi</span>
                Ride Request Center
              </span>
              <h3 className="font-display text-lg font-black text-[#002D40] uppercase tracking-wide">
                Confirm Cab Reservation
              </h3>
              <p className="text-[10px] text-[#42484c] font-semibold leading-relaxed">
                Schedule a premium, low-congestion private transfer for your upcoming itinerary.
              </p>
            </header>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center text-xs font-bold text-[#0f172a]">
                <span className="text-[#42484c] font-semibold">Scheduled Date:</span>
                <span>{selectedCabTransfer.date}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-[#0f172a]">
                <span className="text-[#42484c] font-semibold">Day Theme:</span>
                <span className="truncate max-w-[200px]">{selectedCabTransfer.theme}</span>
              </div>
              <div className="h-[1px] bg-slate-200" />
              <div className="flex justify-between items-center text-xs font-bold text-[#0f172a]">
                <span className="text-[#42484c] font-semibold">Vehicle Type:</span>
                <span className="text-[#00AFEF] font-extrabold">{selectedCabTransfer.cabType}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-[#0f172a]">
                <span className="text-[#42484c] font-semibold">Pickup Time:</span>
                <span>{selectedCabTransfer.pickupTime}</span>
              </div>
              <div className="h-[1px] bg-slate-200" />
              <div className="flex justify-between items-center text-sm font-black text-[#002D40]">
                <span>Estimated Fare:</span>
                <span className="text-xl font-display text-[#00AFEF]">${selectedCabTransfer.estimatedFare}</span>
              </div>
            </div>

            {bookingConfirmed ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col items-center text-center gap-3 animate-fadeIn">
                <span className="material-symbols-outlined text-4xl text-emerald-500 fill-icon animate-bounce">check_circle</span>
                <div>
                  <h4 className="text-sm font-black text-emerald-950">Reservation Confirmed</h4>
                  <p className="text-[10px] text-emerald-900/80 mt-1 font-semibold leading-relaxed">
                    Premium Cab scheduled for {selectedCabTransfer.pickupTime} on {selectedCabTransfer.date}. Estimated fare of ${selectedCabTransfer.estimatedFare} has been charged to your room.
                  </p>
                </div>
              </div>
            ) : (
              <button
                disabled={bookingLoading}
                onClick={() => {
                  setBookingLoading(true);
                  setTimeout(() => {
                    setBookingLoading(false);
                    setBookingConfirmed(true);
                  }, 1200);
                }}
                className="w-full bg-[#002D40] hover:bg-[#00AFEF] text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {bookingLoading ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">sync</span>
                    <span>Confirming Ride...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">verified_user</span>
                    <span>Confirm Cab Booking</span>
                  </>
                )}
              </button>
            )}

            <button 
              onClick={() => setShowCabModal(false)}
              className="w-full bg-transparent hover:bg-slate-100 text-[#002D40] border border-[#c2c7cc]/80 py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer text-center"
            >
              Close Request
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
