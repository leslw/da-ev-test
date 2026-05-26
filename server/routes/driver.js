import express from 'express';
import { config } from '../config.js';
import { isAuthenticated } from '../tokenStore.js';
import { uberConfigured } from '../config.js';
import {
  syncFromUber,
  getStoredProfile,
  getStoredTrips,
  tripCount,
  eligibleCategories,
} from '../services/dataStore.js';

const router = express.Router();

// Connection / mode status for the frontend banner.
router.get('/status', (req, res) => {
  res.json({
    uberConfigured: uberConfigured(),
    authenticated: isAuthenticated(),
    demoMode: config.demoMode,
    cachedTrips: tripCount(),
  });
});

// Pull (or refresh) data; gracefully degrades to demo/cached data on 403.
router.post('/sync', async (req, res, next) => {
  try {
    const result = await syncFromUber();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/profile', async (req, res, next) => {
  try {
    if (tripCount() === 0) await syncFromUber();
    const profile = getStoredProfile();
    if (!profile) return res.status(404).json({ error: 'No profile yet. POST /api/driver/sync first.' });
    res.json({ ...profile, eligibleCategories: eligibleCategories() });
  } catch (err) {
    next(err);
  }
});

router.get('/trips', async (req, res, next) => {
  try {
    if (tripCount() === 0) await syncFromUber();
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    const trips = getStoredTrips().slice(0, limit);
    res.json({ count: trips.length, trips });
  } catch (err) {
    next(err);
  }
});

// Earnings/payments view derived from trip breakdowns.
router.get('/payments', async (req, res, next) => {
  try {
    if (tripCount() === 0) await syncFromUber();
    const trips = getStoredTrips();
    const payments = trips.map((t) => ({
      trip_id: t.id,
      timestamp: t.start_time,
      net_fare: t.net_fare,
      tips: t.tip,
      surge: t.surge_amount,
      bonuses: t.bonus,
      total: Number(((t.net_fare || 0) + (t.tip || 0) + (t.bonus || 0)).toFixed(2)),
    }));
    const totals = payments.reduce(
      (acc, p) => ({
        net_fare: acc.net_fare + p.net_fare,
        tips: acc.tips + p.tips,
        surge: acc.surge + p.surge,
        bonuses: acc.bonuses + p.bonuses,
        total: acc.total + p.total,
      }),
      { net_fare: 0, tips: 0, surge: 0, bonuses: 0, total: 0 },
    );
    Object.keys(totals).forEach((k) => (totals[k] = Number(totals[k].toFixed(2))));
    res.json({ count: payments.length, totals, payments: payments.slice(0, Number(req.query.limit) || 100) });
  } catch (err) {
    next(err);
  }
});

export default router;
