import db from '../db.js';
import { DFW_ZONES } from '../constants.js';
import { config, ridesConfigured } from '../config.js';
import { priceEstimate, surgeFromPrices } from './ridesClient.js';
import { mockSurgeReading } from './mockData.js';

const DEFAULT_BASELINE = 12; // baseline $ for the standard test leg

function getBaseline(zoneId, product = 'UberX') {
  const row = db.prepare('SELECT baseline FROM baselines WHERE zone_id = ? AND product = ?').get(zoneId, product);
  return row?.baseline ?? DEFAULT_BASELINE;
}

function setBaseline(zoneId, product, baseline) {
  db.prepare(`
    INSERT INTO baselines (zone_id, product, baseline) VALUES (?, ?, ?)
    ON CONFLICT(zone_id, product) DO UPDATE SET baseline = excluded.baseline
  `).run(zoneId, product, baseline);
}

const insertReading = db.prepare(`
  INSERT INTO surge_readings (zone_id, zone_name, product, estimate, baseline, multiplier, surging, captured_at, source)
  VALUES (@zone_id, @zone_name, @product, @estimate, @baseline, @multiplier, @surging, @captured_at, @source)
`);

// Sample every DFW zone once. Uses the real Rides API when a server token is
// configured; otherwise synthesizes readings so the dashboard stays live.
export async function pollAllZones() {
  const results = [];
  for (const zone of DFW_ZONES) {
    let reading;
    if (ridesConfigured()) {
      try {
        const prices = await priceEstimate(zone.lat, zone.lng);
        const s = surgeFromPrices(prices);
        const baseline = getBaseline(zone.id, s?.product || 'UberX');
        const estimate = s?.estimate || baseline;
        // Prefer Uber's reported multiplier; otherwise infer from price drift.
        const inferred = estimate / baseline;
        const multiplier = s?.multiplier && s.multiplier > 1 ? s.multiplier : Number(inferred.toFixed(1));
        reading = {
          zone_id: zone.id,
          zone_name: zone.name,
          product: s?.product || 'UberX',
          estimate,
          baseline,
          multiplier,
          surging: multiplier > 1.2 ? 1 : 0,
          captured_at: Date.now(),
          source: 'uber',
        };
        // Slowly adapt the baseline toward non-surging prices (EMA).
        if (multiplier <= 1.1) setBaseline(zone.id, reading.product, baseline * 0.9 + estimate * 0.1);
      } catch (err) {
        reading = { ...mockSurgeReading(zone, getBaseline(zone.id)), error: err.message, source: 'mock-fallback' };
      }
    } else {
      reading = mockSurgeReading(zone, getBaseline(zone.id));
    }
    insertReading.run(reading);
    results.push(reading);
  }
  return results;
}

// Latest reading per zone for the live dashboard panel.
export function currentSurge() {
  const rows = db.prepare(`
    SELECT r.* FROM surge_readings r
    JOIN (SELECT zone_id, MAX(captured_at) AS mx FROM surge_readings GROUP BY zone_id) latest
      ON r.zone_id = latest.zone_id AND r.captured_at = latest.mx
    ORDER BY r.multiplier DESC
  `).all();
  // If nothing has been polled yet, return a synthesized snapshot.
  if (!rows.length) {
    return DFW_ZONES.map((z) => mockSurgeReading(z, getBaseline(z.id))).sort((a, b) => b.multiplier - a.multiplier);
  }
  return rows.map((r) => ({ ...r, surging: Boolean(r.surging) }));
}

export function surgeHistory(zoneId, hours = 24) {
  const cutoff = Date.now() - hours * 3600 * 1000;
  return db.prepare(`
    SELECT zone_id, zone_name, multiplier, estimate, captured_at
    FROM surge_readings WHERE zone_id = ? AND captured_at >= ?
    ORDER BY captured_at ASC
  `).all(zoneId, cutoff);
}

export { config };
