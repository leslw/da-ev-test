import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const env = process.env;

export const config = {
  port: Number(env.PORT) || 4000,
  sessionSecret: env.SESSION_SECRET || 'dev-only-insecure-secret-change-me',

  // Uber Driver API (OAuth 2.0 Authorization Code flow)
  uber: {
    clientId: env.UBER_CLIENT_ID || '',
    clientSecret: env.UBER_CLIENT_SECRET || '',
    redirectUri: env.UBER_REDIRECT_URI || 'http://localhost:4000/auth/uber/callback',
    authorizationUrl: 'https://auth.uber.com/oauth/v2/authorize',
    tokenUrl: 'https://auth.uber.com/oauth/v2/token',
    apiBase: 'https://api.uber.com',
    scopes: ['partner.accounts', 'partner.payments', 'partner.trips'],
  },

  // Uber Rides API (rider-side) server token, used for the surge detector
  ridesServerToken: env.UBER_SERVER_TOKEN || '',
  ridesApiBase: 'https://api.uber.com',

  // Surge polling cadence (cron expression). Default: every 10 minutes.
  surgeCron: env.SURGE_CRON || '*/10 * * * *',

  // When true, the app fabricates realistic readings/data so every panel works
  // before Driver API access is approved. Auto-enabled when credentials are missing.
  get demoMode() {
    return env.DEMO_MODE === 'true' || !this.uber.clientId || !this.uber.clientSecret;
  },
};

export function uberConfigured() {
  return Boolean(config.uber.clientId && config.uber.clientSecret);
}

export function ridesConfigured() {
  return Boolean(config.ridesServerToken);
}
