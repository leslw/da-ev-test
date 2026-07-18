import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  byTimeOfDay,
  byCategory,
  surgeStats,
  consistencyScore,
  bestWorstWindows,
  filterByWindow,
} from './earnings.js';

// A small fixed fixture: two days, two categories, one surged trip.
function at(daysAgo, hour) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

const trips = [
  { id: 'a', category: 'UberX', fare: 20, net_fare: 16, tip: 2, bonus: 0, surge_mult: 1, surge_amount: 0, distance_mi: 5, duration_min: 30, start_time: at(1, 8) },
  { id: 'b', category: 'UberX', fare: 30, net_fare: 24, tip: 0, bonus: 0, surge_mult: 1.5, surge_amount: 10, distance_mi: 8, duration_min: 40, start_time: at(1, 18) },
  { id: 'c', category: 'Black', fare: 60, net_fare: 48, tip: 5, bonus: 0, surge_mult: 1, surge_amount: 0, distance_mi: 10, duration_min: 25, start_time: at(2, 18) },
];

test('byCategory sorts by EpH and computes per-mile/minute', () => {
  const rows = byCategory(trips);
  assert.equal(rows[0].category, 'Black'); // highest EpH (short, pricey)
  const black = rows.find((r) => r.category === 'Black');
  assert.equal(black.trips, 1);
  assert.ok(black.eph > 0);
  assert.ok(black.perMile > 0);
});

test('byCategory filters to eligible categories only', () => {
  const rows = byCategory(trips, ['UberX']);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].category, 'UberX');
});

test('byTimeOfDay buckets trips into the four blocks', () => {
  const rows = byTimeOfDay(trips);
  const morning = rows.find((r) => r.id === 'morning');
  const evening = rows.find((r) => r.id === 'evening');
  assert.equal(morning.trips, 1);
  assert.equal(evening.trips, 2);
});

test('surgeStats flags surged trips and averages the multiplier', () => {
  const s = surgeStats(trips);
  assert.equal(s.surgeTrips, 1);
  assert.equal(s.avgSurgeMultiplier, 1.5);
  assert.ok(s.surgeFrequency > 0 && s.surgeFrequency < 1);
});

test('consistencyScore returns a 0-100 score across multiple days', () => {
  const c = consistencyScore(trips);
  assert.equal(c.activeDays, 2);
  assert.ok(c.score >= 0 && c.score <= 100);
});

test('filterByWindow excludes trips outside the window', () => {
  const old = [...trips, { id: 'z', category: 'UberX', net_fare: 10, distance_mi: 3, duration_min: 15, start_time: at(120, 12) }];
  assert.equal(filterByWindow(old, 30).length, 3);
});

test('bestWorstWindows requires at least two trips per window', () => {
  const { best } = bestWorstWindows(trips);
  // Only the evening windows have repeats across days; single-trip windows drop out.
  for (const w of best) assert.ok(w.trips >= 2);
});
