import { TIME_BUCKETS, DAYS, bucketForHour } from '../constants.js';

const HOUR_MS = 3600 * 1000;

// ---- helpers ---------------------------------------------------------------

function tripEarnings(t) {
  // What the driver actually keeps: net fare + tip + bonus (surge is already
  // folded into fare/net_fare for driver-side payments).
  return (t.net_fare ?? t.fare ?? 0) + (t.tip ?? 0) + (t.bonus ?? 0);
}

function round(n, places = 2) {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((x) => (x - m) ** 2)));
}

// Aggregate a list of trips into a single performance row.
function summarize(trips) {
  const totalEarnings = trips.reduce((s, t) => s + tripEarnings(t), 0);
  const totalMinutes = trips.reduce((s, t) => s + (t.duration_min || 0), 0);
  const totalMiles = trips.reduce((s, t) => s + (t.distance_mi || 0), 0);
  const hours = totalMinutes / 60;
  return {
    trips: trips.length,
    earnings: round(totalEarnings),
    hours: round(hours),
    eph: round(hours > 0 ? totalEarnings / hours : 0),
    perMile: round(totalMiles > 0 ? totalEarnings / totalMiles : 0),
    perMinute: round(totalMinutes > 0 ? totalEarnings / totalMinutes : 0),
  };
}

// ---- public API ------------------------------------------------------------

export function filterByWindow(trips, days) {
  if (!days) return trips;
  const cutoff = Date.now() - days * 24 * HOUR_MS;
  return trips.filter((t) => (t.start_time || 0) >= cutoff);
}

export function byTimeOfDay(trips) {
  const groups = Object.fromEntries(TIME_BUCKETS.map((b) => [b.id, []]));
  for (const t of trips) {
    const hour = new Date(t.start_time).getHours();
    groups[bucketForHour(hour)].push(t);
  }
  return TIME_BUCKETS.map((b) => ({
    id: b.id,
    label: b.label,
    ...summarize(groups[b.id]),
  }));
}

export function byDayOfWeek(trips) {
  const groups = DAYS.map(() => []);
  for (const t of trips) groups[new Date(t.start_time).getDay()].push(t);
  return DAYS.map((label, i) => ({ id: label, label, ...summarize(groups[i]) }));
}

export function byCategory(trips, eligible = null) {
  const groups = new Map();
  for (const t of trips) {
    const key = t.category || 'Unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  let rows = [...groups.entries()].map(([category, list]) => ({
    category,
    ...summarize(list),
  }));
  if (eligible && eligible.length) {
    rows = rows.filter((r) => eligible.includes(r.category));
  }
  return rows.sort((a, b) => b.eph - a.eph);
}

// Best & worst day-of-week + time-of-day combinations.
export function bestWorstWindows(trips, limit = 5) {
  const groups = new Map();
  for (const t of trips) {
    const d = new Date(t.start_time);
    const key = `${DAYS[d.getDay()]} ${bucketForHour(d.getHours())}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  const rows = [...groups.entries()]
    .map(([window, list]) => {
      const [day, bucket] = window.split(' ');
      const label = TIME_BUCKETS.find((b) => b.id === bucket)?.label || bucket;
      return { window: `${day} ${label}`, day, bucket, ...summarize(list) };
    })
    // Require a little data so a single lucky trip doesn't top the chart.
    .filter((r) => r.trips >= 2)
    .sort((a, b) => b.eph - a.eph);
  return {
    best: rows.slice(0, limit),
    worst: rows.slice(-limit).reverse(),
  };
}

export function surgeStats(trips) {
  const surged = trips.filter((t) => (t.surge_mult || 1) > 1 || (t.surge_amount || 0) > 0);
  const multipliers = surged
    .map((t) => t.surge_mult || (t.fare ? (t.fare + (t.surge_amount || 0)) / t.fare : 1))
    .filter((m) => m > 1);
  return {
    totalTrips: trips.length,
    surgeTrips: surged.length,
    surgeFrequency: round(trips.length ? surged.length / trips.length : 0, 3),
    avgSurgeMultiplier: round(multipliers.length ? mean(multipliers) : 0, 2),
    surgeEarnings: round(surged.reduce((s, t) => s + (t.surge_amount || 0), 0)),
  };
}

// Income consistency: lower day-to-day variance => higher score (0-100).
export function consistencyScore(trips) {
  const byDay = new Map();
  for (const t of trips) {
    const day = new Date(t.start_time).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + tripEarnings(t));
  }
  const daily = [...byDay.values()];
  if (daily.length < 2) {
    return { score: null, dailyMean: round(mean(daily)), dailyStdDev: 0, activeDays: daily.length };
  }
  const m = mean(daily);
  const cv = m > 0 ? stddev(daily) / m : 1; // coefficient of variation
  const score = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
  return {
    score,
    dailyMean: round(m),
    dailyStdDev: round(stddev(daily)),
    activeDays: daily.length,
  };
}

// Ranked, plain-language recommendations derived from the aggregates above.
export function recommendations(trips, eligible = null) {
  const recs = [];
  const tod = byTimeOfDay(trips).filter((r) => r.trips > 0);
  const dow = byDayOfWeek(trips).filter((r) => r.trips > 0);
  const cats = byCategory(trips, eligible).filter((r) => r.trips > 0);
  const windows = bestWorstWindows(trips);
  const surge = surgeStats(trips);

  if (tod.length) {
    const top = [...tod].sort((a, b) => b.eph - a.eph)[0];
    recs.push({
      priority: 1,
      title: `Prioritize the ${top.label.toLowerCase()} block`,
      detail: `${top.label} averages $${top.eph}/hr across ${top.trips} trips — your strongest time-of-day window.`,
    });
  }
  if (dow.length) {
    const top = [...dow].sort((a, b) => b.eph - a.eph)[0];
    recs.push({
      priority: 2,
      title: `${top.label} is your best day`,
      detail: `${top.label} earns $${top.eph}/hr on average. Protect this day for driving.`,
    });
  }
  if (cats.length) {
    const top = cats[0];
    recs.push({
      priority: 3,
      title: `Lead with ${top.category}`,
      detail: `${top.category} returns $${top.eph}/hr ($${top.perMile}/mi). Favor it when you can choose.`,
    });
  }
  if (windows.best.length) {
    const w = windows.best[0];
    recs.push({
      priority: 4,
      title: `Top window: ${w.window}`,
      detail: `${w.window} is your single best window at $${w.eph}/hr.`,
    });
  }
  if (surge.surgeTrips > 0) {
    recs.push({
      priority: 5,
      title: `Chase surge selectively`,
      detail: `${Math.round(surge.surgeFrequency * 100)}% of trips hit surge (avg ${surge.avgSurgeMultiplier}x). Watch the live surge panel to position ahead of spikes.`,
    });
  }
  return recs.sort((a, b) => a.priority - b.priority);
}

export function fullAnalysis(trips, { window = 30, eligible = null } = {}) {
  const scoped = filterByWindow(trips, window);
  return {
    window,
    tripCount: scoped.length,
    overall: summarizePublic(scoped),
    byTimeOfDay: byTimeOfDay(scoped),
    byDayOfWeek: byDayOfWeek(scoped),
    byCategory: byCategory(scoped, eligible),
    windows: bestWorstWindows(scoped),
    surge: surgeStats(scoped),
    consistency: consistencyScore(scoped),
    recommendations: recommendations(scoped, eligible),
  };
}

function summarizePublic(trips) {
  return summarize(trips);
}
