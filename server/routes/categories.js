import express from 'express';
import { byCategory } from '../analysis/earnings.js';
import { filterByWindow } from '../analysis/earnings.js';
import {
  getStoredTrips,
  eligibleCategories,
  opportunityCategories,
  syncFromUber,
  tripCount,
} from '../services/dataStore.js';

const router = express.Router();

// Phase 4: category optimizer — side-by-side EpH, a recommendation, and
// "opportunity flags" for categories the driver is close to qualifying for.
router.get('/', async (req, res, next) => {
  try {
    if (tripCount() === 0) await syncFromUber();
    const window = Number(req.query.window) || 30;
    const trips = filterByWindow(getStoredTrips(), window);
    const eligible = eligibleCategories();

    const eligibleRows = byCategory(trips, eligible);
    const allRows = byCategory(trips, null);
    const recommended = eligibleRows[0]?.category || null;

    // Opportunity flags: higher-tier categories the driver lacks, annotated
    // with the EpH they'd unlock based on the fleet-wide data we do have.
    const opportunities = opportunityCategories().map((category) => {
      const observed = allRows.find((r) => r.category === category);
      return {
        category,
        potentialEph: observed?.eph || null,
        note: observed
          ? `Drivers running ${category} in your data average $${observed.eph}/hr.`
          : `Add ${category} to expand the ride types you can accept.`,
      };
    });

    res.json({
      window,
      eligible,
      recommended,
      categories: eligibleRows,
      opportunities,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
