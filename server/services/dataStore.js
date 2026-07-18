import db from '../db.js';
import { config, uberConfigured } from '../config.js';
import { isAuthenticated } from '../tokenStore.js';
import { getProfile, getTrips, normalizeTrip, DriverAccessError } from './uberClient.js';
import { generateTrips, mockProfile } from './mockData.js';
import { CATEGORIES } from '../constants.js';

const upsertTrip = db.prepare(`
  INSERT INTO trips (id, city, category, fare, net_fare, tip, surge_amount, surge_mult, bonus, distance_mi, duration_min, start_time, end_time, source)
  VALUES (@id, @city, @category, @fare, @net_fare, @tip, @surge_amount, @surge_mult, @bonus, @distance_mi, @duration_min, @start_time, @end_time, @source)
  ON CONFLICT(id) DO UPDATE SET
    fare=excluded.fare, net_fare=excluded.net_fare, tip=excluded.tip,
    surge_amount=excluded.surge_amount, surge_mult=excluded.surge_mult, bonus=excluded.bonus,
    distance_mi=excluded.distance_mi, duration_min=excluded.duration_min,
    start_time=excluded.start_time, end_time=excluded.end_time, source=excluded.source
`);

const insertMany = db.transaction((trips) => {
  for (const t of trips) upsertTrip.run(t);
});

export function tripCount() {
  return db.prepare('SELECT COUNT(*) AS c FROM trips').get().c;
}

export function getStoredTrips() {
  return db.prepare('SELECT * FROM trips ORDER BY start_time DESC').all();
}

export function getStoredProfile() {
  const row = db.prepare('SELECT * FROM driver_profile WHERE id = 1').get();
  if (!row) return null;
  return {
    driver_id: row.driver_id,
    first_name: row.first_name,
    last_name: row.last_name,
    rating: row.rating,
    city: row.city,
    activation: row.activation,
    modalities: JSON.parse(row.modalities_json || '[]'),
    source: row.source,
  };
}

function saveProfile(p) {
  db.prepare(`
    INSERT INTO driver_profile (id, driver_id, first_name, last_name, rating, city, activation, modalities_json, source, updated_at)
    VALUES (1, @driver_id, @first_name, @last_name, @rating, @city, @activation, @modalities_json, @source, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      driver_id=excluded.driver_id, first_name=excluded.first_name, last_name=excluded.last_name,
      rating=excluded.rating, city=excluded.city, activation=excluded.activation,
      modalities_json=excluded.modalities_json, source=excluded.source, updated_at=excluded.updated_at
  `).run({
    driver_id: p.driver_id,
    first_name: p.first_name,
    last_name: p.last_name,
    rating: p.rating,
    city: p.city,
    activation: p.activation,
    modalities_json: JSON.stringify(p.modalities || []),
    source: p.source,
    updated_at: Date.now(),
  });
}

export function eligibleCategories() {
  const profile = getStoredProfile();
  const mods = profile?.modalities || [];
  const elig = mods.filter((m) => m.eligible !== false).map((m) => m.category);
  return elig.length ? elig : ['UberX', 'Comfort', 'XL'];
}

// Categories the driver does NOT yet have, surfaced as opportunity flags.
export function opportunityCategories() {
  const have = new Set(eligibleCategories());
  return CATEGORIES.filter((c) => !have.has(c));
}

// Seed the local DB with realistic DFW data so every panel works pre-approval.
export function seedDemoData({ force = false } = {}) {
  if (!force && tripCount() > 0) return { seeded: false, trips: tripCount() };
  const eligible = ['UberX', 'Comfort', 'XL'];
  saveProfile(mockProfile(eligible));
  const trips = generateTrips({ days: 90, eligible });
  insertMany(trips);
  return { seeded: true, trips: trips.length };
}

// Pull fresh data from the Driver API when authorized; on 403/auth issues,
// fall back to whatever is cached (seeding demo data if the DB is empty).
export async function syncFromUber() {
  const result = { profile: false, trips: 0, mode: 'live', message: '' };
  if (!uberConfigured() || !isAuthenticated()) {
    if (tripCount() === 0) seedDemoData();
    result.mode = 'demo';
    result.message = uberConfigured()
      ? 'Not authorized with Uber yet. Visit /auth/uber to connect. Showing cached/demo data.'
      : 'Uber credentials not configured. Showing cached/demo data.';
    return result;
  }
  try {
    const profileRaw = await getProfile();
    saveProfile({
      driver_id: profileRaw.driver_id || profileRaw.partner_id,
      first_name: profileRaw.first_name,
      last_name: profileRaw.last_name,
      rating: profileRaw.rating,
      city: profileRaw.city,
      activation: profileRaw.activation_status || profileRaw.status,
      modalities: (profileRaw.transport_modalities || []).map((m) => ({
        category: m.category || m.name || m,
        eligible: m.eligible !== false,
      })),
      source: 'uber',
    });
    result.profile = true;

    const tripsResp = await getTrips({ limit: '50' });
    const normalized = (tripsResp.trips || []).map(normalizeTrip).filter((t) => t.id);
    insertMany(normalized);
    result.trips = normalized.length;
  } catch (err) {
    if (err instanceof DriverAccessError) {
      if (tripCount() === 0) seedDemoData();
      result.mode = 'demo';
      result.message = err.message;
      return result;
    }
    throw err;
  }
  return result;
}

export { config };
