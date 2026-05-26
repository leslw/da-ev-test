import express from 'express';
import db from '../db.js';

const router = express.Router();

// ---- manual weekly earnings entries ----------------------------------------

router.get('/entries', (req, res) => {
  res.json({ entries: db.prepare('SELECT * FROM manual_entries ORDER BY week DESC, category').all() });
});

router.post('/entries', (req, res) => {
  const { week, category, hours, earnings, trips } = req.body || {};
  if (!week || !category || hours == null || earnings == null) {
    return res.status(400).json({ error: 'week, category, hours and earnings are required' });
  }
  const info = db.prepare(`
    INSERT INTO manual_entries (week, category, hours, earnings, trips, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(week, category, Number(hours), Number(earnings), Number(trips) || 0, Date.now());
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/entries/:id', (req, res) => {
  db.prepare('DELETE FROM manual_entries WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---- local events (Phase 5 calendar integration) ---------------------------

router.get('/events', (req, res) => {
  res.json({ events: db.prepare('SELECT * FROM events ORDER BY date').all() });
});

router.post('/events', (req, res) => {
  const { name, date, location, notes } = req.body || {};
  if (!name || !date) return res.status(400).json({ error: 'name and date are required' });
  const info = db.prepare(`
    INSERT INTO events (name, date, location, notes, created_at) VALUES (?, ?, ?, ?, ?)
  `).run(name, date, location || '', notes || '', Date.now());
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/events/:id', (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

// Convert weekly manual entries into synthetic trips so the analysis engine and
// shift planner work on manual data when the Driver API is unavailable. Trips
// are spread across the entry's week at typical peak hours.
const PEAK_HOURS = [7, 8, 12, 17, 18, 19, 21];

export function mergeManualTrips(storedTrips) {
  const entries = db.prepare('SELECT * FROM manual_entries').all();
  if (!entries.length) return storedTrips;

  const synthetic = [];
  for (const e of entries) {
    const n = Math.max(1, e.trips || Math.round(e.hours * 1.5));
    const weekStart = new Date(`${e.week}T00:00:00`).getTime() || Date.now();
    const perTripEarnings = e.earnings / n;
    const perTripMinutes = (e.hours * 60) / n;
    for (let i = 0; i < n; i++) {
      const dayOffset = i % 7;
      const hour = PEAK_HOURS[i % PEAK_HOURS.length];
      const start = weekStart + dayOffset * 86400000 + hour * 3600000;
      synthetic.push({
        id: `manual-${e.id}-${i}`,
        city: 'Dallas-Fort Worth',
        category: e.category,
        fare: Number(perTripEarnings.toFixed(2)),
        net_fare: Number(perTripEarnings.toFixed(2)),
        tip: 0,
        surge_amount: 0,
        surge_mult: 1,
        bonus: 0,
        distance_mi: Number((perTripMinutes / 3).toFixed(1)),
        duration_min: Number(perTripMinutes.toFixed(1)),
        start_time: start,
        end_time: start + perTripMinutes * 60000,
        source: 'manual',
      });
    }
  }
  return [...storedTrips, ...synthetic];
}
