import axios from 'axios';
import { config } from '../config.js';
import { getTokens, saveTokens } from '../tokenStore.js';

// Error raised when the Driver API rejects us for not-yet-approved access.
export class DriverAccessError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'DriverAccessError';
    this.status = status;
  }
}

async function refreshAccessToken() {
  const tokens = getTokens();
  if (!tokens?.refresh_token) {
    throw new DriverAccessError('No refresh token available — re-authorize via /auth/uber', 401);
  }
  const body = new URLSearchParams({
    client_id: config.uber.clientId,
    client_secret: config.uber.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
  });
  const { data } = await axios.post(config.uber.tokenUrl, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  saveTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    scope: data.scope,
    expiresIn: data.expires_in,
  });
  return data.access_token;
}

async function validAccessToken() {
  const tokens = getTokens();
  if (!tokens?.access_token) {
    throw new DriverAccessError('Not authenticated with Uber — start at /auth/uber', 401);
  }
  // Refresh a minute early to avoid races near expiry.
  if (tokens.expires_at && Date.now() > tokens.expires_at - 60_000) {
    return refreshAccessToken();
  }
  return tokens.access_token;
}

async function driverGet(pathname, { retryOnAuth = true } = {}) {
  const token = await validAccessToken();
  try {
    const { data } = await axios.get(`${config.uber.apiBase}${pathname}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 15_000,
    });
    return data;
  } catch (err) {
    const status = err.response?.status;
    if (status === 401 && retryOnAuth) {
      await refreshAccessToken();
      return driverGet(pathname, { retryOnAuth: false });
    }
    if (status === 403) {
      throw new DriverAccessError(
        'Uber Driver API access is not approved yet (HTTP 403). The app is running on cached/demo data until your limited-access application is granted.',
        403,
      );
    }
    throw err;
  }
}

export function getProfile() {
  return driverGet('/v1/partners/me');
}

export function getPayments(params = {}) {
  const qs = new URLSearchParams({ limit: '50', ...params }).toString();
  return driverGet(`/v1/partners/payments?${qs}`);
}

export function getTrips(params = {}) {
  const qs = new URLSearchParams({ limit: '50', ...params }).toString();
  return driverGet(`/v1/partners/trips?${qs}`);
}

// Normalize an Uber Driver API trip payload into our internal trip shape.
export function normalizeTrip(raw) {
  const breakdown = raw.fare_breakdown || {};
  const surgeAmount = Number(breakdown.surge || 0);
  const fare = Number(raw.fare || breakdown.total || 0);
  return {
    id: raw.trip_id || raw.uuid,
    city: raw.city_name || raw.city || 'Dallas-Fort Worth',
    category: raw.vehicle_type || raw.product || 'UberX',
    fare,
    net_fare: Number(breakdown.net_fare ?? fare * 0.78),
    tip: Number(breakdown.tip || 0),
    surge_amount: surgeAmount,
    surge_mult: surgeAmount > 0 && fare > surgeAmount ? Number((fare / (fare - surgeAmount)).toFixed(2)) : 1,
    bonus: Number(breakdown.bonus || 0),
    distance_mi: Number(raw.distance || 0),
    duration_min: Number(raw.duration ? raw.duration / 60 : 0),
    start_time: Number(raw.start_time ? raw.start_time * 1000 : Date.now()),
    end_time: Number(raw.dropoff_time ? raw.dropoff_time * 1000 : Date.now()),
    source: 'uber',
  };
}
