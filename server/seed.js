import { seedDemoData } from './services/dataStore.js';
import { pollAllZones } from './services/surgeDetector.js';

const result = seedDemoData({ force: process.argv.includes('--force') });
console.log(`Seed: ${result.seeded ? 'created' : 'skipped (data exists)'} — ${result.trips} trips`);

const readings = await pollAllZones();
console.log(`Surge: primed ${readings.length} zone readings`);
process.exit(0);
