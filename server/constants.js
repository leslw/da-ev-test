// The 6 DFW high-demand zones monitored by the surge detector (Phase 3).
export const DFW_ZONES = [
  { id: 'dal',      name: 'Dallas Love Field Airport (DAL)',        lat: 32.8471, lng: -96.8518 },
  { id: 'dfw',      name: 'DFW International Airport',               lat: 32.8998, lng: -97.0403 },
  { id: 'deepellum', name: 'Deep Ellum / Downtown Dallas',          lat: 32.7842, lng: -96.7836 },
  { id: 'uptown',   name: 'Uptown Dallas',                          lat: 32.7969, lng: -96.8016 },
  { id: 'frisco',   name: 'Frisco / The Star',                      lat: 33.0915, lng: -96.8357 },
  { id: 'allen',    name: 'Allen Premium Outlets / US-75 (home)',   lat: 33.1107, lng: -96.6739 },
];

// Uber ride categories, ordered roughly by tier. transport_modalities from the
// driver account determine which of these the driver is eligible for.
export const CATEGORIES = ['UberX', 'Comfort', 'XL', 'Black', 'Black SUV', 'Pet', 'Green'];

// Time-of-day buckets used across the analysis engine and shift planner.
export const TIME_BUCKETS = [
  { id: 'morning',    label: 'Morning',    startHour: 5,  endHour: 11 },
  { id: 'afternoon',  label: 'Afternoon',  startHour: 11, endHour: 16 },
  { id: 'evening',    label: 'Evening',    startHour: 16, endHour: 22 },
  { id: 'late_night', label: 'Late Night', startHour: 22, endHour: 5 },
];

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function bucketForHour(hour) {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'afternoon';
  if (hour >= 16 && hour < 22) return 'evening';
  return 'late_night';
}
