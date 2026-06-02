import express from 'express';
import http from 'http';
import cors from 'cors';
import destinationsRouter from './routes/destinations.js';
import routingRouter from './routes/routing.js';
import aiPlannerRouter from './routes/aiPlanner.js';
import mlRecommenderRouter from './routes/mlRecommender.js';
import trafficPredictor from './utils/trafficPredictor.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5005;

process.on('exit', (code) => {
  console.log('Process exiting with code:', code);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

// Middlewares
app.use(cors());
app.use(express.json());

// Log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Register REST API endpoints
app.use('/api/destinations', destinationsRouter);
app.use('/api/route', routingRouter);
app.use('/api/plan-trip', aiPlannerRouter);
app.use('/api/recommend', mlRecommenderRouter);

// Serve Static Frontend React Build (for production deployment)
app.use(express.static(path.join(__dirname, '../dist')));

// Catch-all route to serve React's index.html for frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Pre-load traffic CSV dataset at server startup
console.log("Pre-loading Bangalore traffic dataset...");
trafficPredictor.loadDataset().then(() => {
  console.log("Bangalore traffic dataset successfully pre-loaded and indexed on server.");
  
  // Start Express server after database is fully pre-loaded and loaded
  http.createServer(app).listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Voyage Elite Express Server is active!`);
    console.log(`Listening on http://localhost:${PORT}`);
    console.log(`=========================================`);
  });
}).catch(err => {
  console.error("Critical: Failed to pre-load Bangalore traffic dataset:", err);
  
  // Start server anyway with fallback mock heuristics
  http.createServer(app).listen(PORT, () => {
    console.log(`Express Server started on http://localhost:${PORT} using offline mocks.`);
  });
});
