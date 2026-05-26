import express from 'express';
import { currentSurge, surgeHistory, pollAllZones } from '../services/surgeDetector.js';
import { ridesConfigured } from '../config.js';

const router = express.Router();

// Live snapshot: which DFW zones appear to be surging right now.
router.get('/', (req, res) => {
  res.json({
    ridesApiConfigured: ridesConfigured(),
    capturedAt: Date.now(),
    zones: currentSurge(),
  });
});

router.get('/history/:zoneId', (req, res) => {
  const hours = Math.min(Number(req.query.hours) || 24, 168);
  res.json({ zoneId: req.params.zoneId, readings: surgeHistory(req.params.zoneId, hours) });
});

// Force an immediate poll (otherwise runs on the node-cron schedule).
router.post('/poll', async (req, res, next) => {
  try {
    const readings = await pollAllZones();
    res.json({ polled: readings.length, zones: readings });
  } catch (err) {
    next(err);
  }
});

export default router;
