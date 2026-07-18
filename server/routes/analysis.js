import express from 'express';
import { fullAnalysis } from '../analysis/earnings.js';
import { getStoredTrips, eligibleCategories, syncFromUber, tripCount } from '../services/dataStore.js';
import { mergeManualTrips } from './manual.js';

const router = express.Router();

async function loadTrips() {
  if (tripCount() === 0) await syncFromUber();
  return mergeManualTrips(getStoredTrips());
}

router.get('/', async (req, res, next) => {
  try {
    const window = Number(req.query.window) || 30; // 30 | 60 | 90
    const onlyEligible = req.query.eligibleOnly !== 'false';
    const trips = await loadTrips();
    const eligible = onlyEligible ? eligibleCategories() : null;
    res.json(fullAnalysis(trips, { window, eligible }));
  } catch (err) {
    next(err);
  }
});

export default router;
