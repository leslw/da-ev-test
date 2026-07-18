import express from 'express';
import { weeklyPlan, airportWindows, driveNowSignal } from '../services/shiftPlanner.js';
import { getStoredTrips, syncFromUber, tripCount } from '../services/dataStore.js';
import { mergeManualTrips } from './manual.js';

const router = express.Router();

async function loadTrips() {
  if (tripCount() === 0) await syncFromUber();
  return mergeManualTrips(getStoredTrips());
}

router.get('/plan', async (req, res, next) => {
  try {
    const window = Number(req.query.window) || 60;
    const trips = await loadTrips();
    res.json({
      window,
      plan: weeklyPlan(trips, { window }),
      airportWindows: airportWindows(),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/drive-now', async (req, res, next) => {
  try {
    const trips = await loadTrips();
    res.json(driveNowSignal(trips));
  } catch (err) {
    next(err);
  }
});

export default router;
