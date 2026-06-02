import express from 'express';
import synaptic from 'synaptic';

const router = express.Router();
const { Architect, Trainer } = synaptic;

// Define a simple 2-input, 5-hidden, 7-output Neural Network
const myNetwork = new Architect.Perceptron(2, 5, 7);
const trainer = new Trainer(myNetwork);

// Map of outputs to destination IDs
const destMap = [
  'kyoto',
  'santorini',
  'folegandros',
  'tokyo',
  'bangalore',
  'lyon',
  'kanazawa'
];

// Synthetic training data for the neural network
const trainingSet = [
  // Kyoto: Serene, Low energy
  { input: [0.1, 0.1], output: [1, 0, 0, 0, 0, 0, 0] },
  { input: [0.2, 0.2], output: [1, 0, 0, 0, 0, 0, 0] },
  // Santorini: Moderate acoustics, Relaxing/Moderate energy
  { input: [0.5, 0.4], output: [0, 1, 0, 0, 0, 0, 0] },
  { input: [0.6, 0.5], output: [0, 1, 0, 0, 0, 0, 0] },
  // Folegandros: Serene, Very low energy
  { input: [0.2, 0.1], output: [0, 0, 1, 0, 0, 0, 0] },
  // Tokyo: High noise, High energy
  { input: [0.9, 0.9], output: [0, 0, 0, 1, 0, 0, 0] },
  { input: [0.8, 0.9], output: [0, 0, 0, 1, 0, 0, 0] },
  // Bangalore: High noise, Moderate-High energy
  { input: [0.8, 0.7], output: [0, 0, 0, 0, 1, 0, 0] },
  // Lyon: Moderate noise, High energy (gastronomy, walking)
  { input: [0.6, 0.8], output: [0, 0, 0, 0, 0, 1, 0] },
  // Kanazawa: Low noise, Moderate energy
  { input: [0.3, 0.5], output: [0, 0, 0, 0, 0, 0, 1] }
];

console.log("Training ML Recommendation Model...");
trainer.train(trainingSet, {
  rate: 0.1,
  iterations: 20000,
  error: 0.005,
  shuffle: true,
  log: 10000,
  cost: Trainer.cost.CROSS_ENTROPY
});
console.log("ML Model Training Complete.");

router.post('/', (req, res) => {
  try {
    const { acoustics = 0.5, energy = 0.5 } = req.body;
    
    // Run inference through the Neural Network
    const output = myNetwork.activate([acoustics, energy]);
    
    // Map outputs to destination IDs
    const results = destMap.map((id, index) => ({
      id,
      score: output[index]
    }));

    // Sort by confidence score descending
    results.sort((a, b) => b.score - a.score);

    res.json({ recommendations: results });
  } catch (error) {
    console.error("Error running ML model:", error);
    res.status(500).json({ error: "Failed to run ML model." });
  }
});

export default router;
