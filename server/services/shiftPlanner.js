import db from '../db.js';
import { TIME_BUCKETS, DAYS, bucketForHour } from '../constants.js';
import { byTimeOfDay, byDayOfWeek, bestWorstWindows, filterByWindow } from '../analysis/earnings.js';

// Build a ranked weekly shift plan from historical EpH by day + time block.
export function weeklyPlan(trips, { window = 60 } = {}) {
  const scoped = filterByWindow(trips, window);
  const { best } = bestWorstWindows(scoped, 14);

  // Group best windows by day, keep the top time blocks per day.
  const byDay = new Map();
  for (const w of best) {
    if (!byDay.has(w.day)) byDay.set(w.day, []);
    byDay.get(w.day).push(w);
  }

  const plan = DAYS.map((day) => {
    const blocks = (byDay.get(day) || []).sort((a, b) => b.eph - a.eph).slice(0, 2);
    return {
      day,
      shifts: blocks.map((b) => {
        const bucket = TIME_BUCKETS.find((t) => t.label === b.bucket || t.id === b.bucket) ||
          TIME_BUCKETS.find((t) => b.window.includes(t.label));
        return {
          block: b.window,
          start: bucket ? labelHour(bucket.startHour) : null,
          end: bucket ? labelHour(bucket.endHour) : null,
          expectedEph: b.eph,
          trips: b.trips,
        };
      }),
    };
  }).filter((d) => d.shifts.length);

  return plan.sort((a, b) => (b.shifts[0]?.expectedEph || 0) - (a.shifts[0]?.expectedEph || 0));
}

// Airport windows tend to spike early morning and late afternoon.
export function airportWindows() {
  return [
    { airport: 'DFW International', windows: ['5:00–8:00 AM', '4:00–7:00 PM'], note: 'Inbound business + evening arrivals.' },
    { airport: 'Dallas Love Field (DAL)', windows: ['6:00–9:00 AM', '5:00–8:00 PM'], note: 'Southwest banks drive predictable spikes.' },
  ];
}

// "Drive Now?" signal: compare current day+time to historical EpH percentile.
export function driveNowSignal(trips) {
  const scoped = filterByWindow(trips, 60);
  const now = new Date();
  const curDay = DAYS[now.getDay()];
  const curBucket = bucketForHour(now.getHours());

  const tod = byTimeOfDay(scoped);
  const ephs = tod.map((t) => t.eph).filter((e) => e > 0);
  const maxEph = Math.max(0, ...ephs);
  const current = tod.find((t) => t.id === curBucket);
  const curEph = current?.eph || 0;

  const ratio = maxEph > 0 ? curEph / maxEph : 0;
  let signal = 'red';
  let message = `${curBucket.replace('_', ' ')} historically earns $${curEph}/hr — below your best windows.`;
  if (ratio >= 0.8) {
    signal = 'green';
    message = `Strong window: ${curBucket.replace('_', ' ')} averages $${curEph}/hr — close to your best. Get out there.`;
  } else if (ratio >= 0.55) {
    signal = 'yellow';
    message = `Decent window: ${curBucket.replace('_', ' ')} averages $${curEph}/hr. Worth driving if you're available.`;
  }

  // Event boost: any high-opportunity event today bumps the signal.
  const today = now.toISOString().slice(0, 10);
  const events = db.prepare('SELECT * FROM events WHERE date = ?').all(today);
  if (events.length && signal !== 'green') {
    signal = signal === 'red' ? 'yellow' : 'green';
    message += ` ${events.length} local event(s) today — demand likely elevated.`;
  }

  return { signal, currentEph: curEph, bestEph: maxEph, day: curDay, bucket: curBucket, events, message };
}

function labelHour(h) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:00 ${ampm}`;
}
