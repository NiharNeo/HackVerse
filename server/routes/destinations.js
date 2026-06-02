import express from 'express';
import destinations from '../../destinations.json' with { type: 'json' };

const router = express.Router();

// GET /api/destinations - returns all destinations, supporting filters
router.get('/', (req, res) => {
  const { category, era, query } = req.query;

  let filtered = [...destinations];

  if (category && category !== 'all') {
    filtered = filtered.filter(d => d.category === category);
  }

  if (era && era !== 'all') {
    filtered = filtered.filter(d => d.era === era);
  }

  if (query && query.trim() !== '') {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(d => 
      d.name.toLowerCase().includes(q) || 
      d.area.toLowerCase().includes(q) || 
      d.vibe.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q))
    );
  }

  res.json(filtered);
});

// GET /api/destinations/:id - returns details for a single destination
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const match = destinations.find(d => d.id === id);

  if (match) {
    res.json(match);
  } else {
    res.status(404).json({ error: `Destination with ID '${id}' not found.` });
  }
});

// POST /api/destinations/recommend - recommends destinations based on sensory sliders
router.post('/recommend', (req, res) => {
  const { acoustics, energy, category, era } = req.body;

  let pool = [...destinations];

  if (category && category !== 'all') {
    pool = pool.filter(d => d.category === category);
  }
  if (era && era !== 'all') {
    pool = pool.filter(d => d.era === era);
  }

  // Rank destinations by sensory alignment
  // If user sets low acoustics, prioritize lower noise. If high energy, prioritize higher energy.
  const scored = pool.map(dest => {
    let score = 0;
    if (dest.sensory) {
      if (acoustics !== undefined) {
        // Acoustic match: lower diff is better
        score += (1 - Math.abs((dest.sensory.acoustics || 0.5) - acoustics)) * 1.5;
      }
      if (energy !== undefined) {
        // Energy match: lower diff is better
        score += (1 - Math.abs((dest.sensory.energy || 0.5) - energy)) * 1.5;
      }
    } else {
      // Neutral default match for spots without explicit sensory scores
      score = 1.0;
    }
    return { ...dest, matchScore: score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.matchScore - a.matchScore);

  res.json(scored);
});

export default router;
