import cron from 'node-cron';
import { config } from './config.js';
import { pollAllZones } from './services/surgeDetector.js';

// Phase 3: poll the DFW hotspots on a schedule (default every 10 minutes).
export function startSurgePolling() {
  if (!cron.validate(config.surgeCron)) {
    console.warn(`[cron] invalid SURGE_CRON "${config.surgeCron}", skipping surge polling`);
    return;
  }
  // Prime one reading immediately so the dashboard isn't empty on boot.
  pollAllZones().catch((err) => console.warn('[cron] initial surge poll failed:', err.message));

  cron.schedule(config.surgeCron, () => {
    pollAllZones().catch((err) => console.warn('[cron] surge poll failed:', err.message));
  });
  console.log(`[cron] surge polling scheduled: ${config.surgeCron}`);
}
