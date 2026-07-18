import { DFW_ZONES, CATEGORIES, bucketForHour } from '../constants.js';

// Deterministic-ish PRNG so seeded data is stable across restarts within a run.
function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// Demand weight by hour of day — drives both trip volume and surge likelihood.
function demandWeight(hour, day) {
  let w = 0.4;
  if (hour >= 6 && hour <= 9) w = 0.9;        // morning commute / airport
  else if (hour >= 11 && hour <= 13) w = 0.6; // lunch
  else if (hour >= 16 && hour <= 19) w = 1.0; // evening peak
  else if (hour >= 20 && hour <= 23) w = 0.75;
  else if (hour >= 0 && hour <= 2) w = 0.55;  // bar close
  const weekend = day === 0 || day === 5 || day === 6;
  if (weekend && (hour >= 20 || hour <= 2)) w += 0.25; // weekend nightlife
  return Math.min(1.3, w);
}

const CATEGORY_RATES = {
  UberX:       { base: 8,  perMile: 0.95, perMin: 0.22 },
  Comfort:     { base: 10, perMile: 1.15, perMin: 0.28 },
  XL:          { base: 12, perMile: 1.35, perMin: 0.32 },
  Black:       { base: 18, perMile: 2.6,  perMin: 0.55 },
  'Black SUV': { base: 24, perMile: 3.4,  perMin: 0.7 },
  Pet:         { base: 11, perMile: 1.1,  perMin: 0.27 },
  Green:       { base: 8,  perMile: 0.95, perMin: 0.22 },
};

export function generateTrips({ days = 90, eligible = ['UberX', 'Comfort', 'XL'], seed = 75070 } = {}) {
  const rand = rng(seed);
  const trips = [];
  const now = Date.now();
  let counter = 0;

  for (let d = 0; d < days; d++) {
    const dayStart = now - d * 24 * 3600 * 1000;
    const dow = new Date(dayStart).getDay();

    for (let hour = 0; hour < 24; hour++) {
      const weight = demandWeight(hour, dow);
      // Number of trips this hour scales with demand.
      const tripCount = Math.floor(rand() * weight * 3);
      for (let i = 0; i < tripCount; i++) {
        const category = eligible[Math.floor(rand() * eligible.length)];
        const rate = CATEGORY_RATES[category] || CATEGORY_RATES.UberX;
        const distance = round(2 + rand() * 16, 1);
        const duration = round(distance * (2 + rand() * 1.5) + 3, 1);

        const surging = rand() < weight * 0.35;
        const surgeMult = surging ? round(1.2 + rand() * 1.3, 1) : 1;

        const baseFare = rate.base + distance * rate.perMile + duration * rate.perMin;
        const fare = round(baseFare * surgeMult, 2);
        const surgeAmount = round(fare - baseFare, 2);
        const tip = rand() < 0.45 ? round(rand() * 7, 2) : 0;
        const netFare = round(fare * 0.78, 2); // after Uber's cut
        const bonus = rand() < 0.08 ? round(2 + rand() * 6, 2) : 0;

        const startMs = dayStart - (60 - Math.floor(rand() * 60)) * 60 * 1000 + hour * 3600 * 1000;
        const zone = DFW_ZONES[Math.floor(rand() * DFW_ZONES.length)];

        trips.push({
          id: `mock-${seed}-${counter++}`,
          city: 'Dallas-Fort Worth',
          category,
          fare,
          net_fare: netFare,
          tip,
          surge_amount: surgeAmount,
          surge_mult: surgeMult,
          bonus,
          distance_mi: distance,
          duration_min: duration,
          start_time: startMs,
          end_time: startMs + duration * 60 * 1000,
          source: 'mock',
          _zone: zone.id,
        });
      }
    }
  }
  return trips;
}

export function mockProfile(eligible = ['UberX', 'Comfort', 'XL']) {
  return {
    driver_id: 'mock-driver-75070',
    first_name: 'Sample',
    last_name: 'Driver',
    rating: 4.92,
    city: 'Dallas-Fort Worth, TX',
    activation: 'active',
    modalities: eligible.map((c) => ({ category: c, eligible: true })),
    source: 'mock',
  };
}

// Synthesize a surge reading for a zone using time-of-day demand. Used when no
// rider-side server token is configured (the public surge API is gated).
export function mockSurgeReading(zone, baseline = 12) {
  const now = new Date();
  const weight = demandWeight(now.getHours(), now.getDay());
  const jitter = (Math.random() - 0.5) * 0.3;
  const multiplier = round(Math.max(1, 1 + (weight - 0.5) * 1.6 + jitter), 1);
  const estimate = round(baseline * multiplier, 2);
  return {
    zone_id: zone.id,
    zone_name: zone.name,
    product: 'UberX',
    estimate,
    baseline,
    multiplier,
    surging: multiplier > 1.2 ? 1 : 0,
    captured_at: Date.now(),
    source: 'mock',
  };
}

function round(n, p = 2) {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

export { CATEGORIES };
