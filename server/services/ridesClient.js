import axios from 'axios';
import { config, ridesConfigured } from '../config.js';

// Rider-side Uber Rides API. Uses a server token (not the driver OAuth token).
// Powers the surge detector (Phase 3). The public surge endpoint is gated, so
// we infer surge by comparing live price estimates to a stored baseline.

export async function listProducts(lat, lng) {
  if (!ridesConfigured()) throw new Error('No UBER_SERVER_TOKEN configured');
  const { data } = await axios.get(`${config.ridesApiBase}/v1.2/products`, {
    params: { latitude: lat, longitude: lng },
    headers: { Authorization: `Token ${config.ridesServerToken}`, 'Accept-Language': 'en_US' },
    timeout: 15_000,
  });
  return data.products || [];
}

// A short fixed test route anchored at the zone, used to sample price.
export async function priceEstimate(startLat, startLng) {
  if (!ridesConfigured()) throw new Error('No UBER_SERVER_TOKEN configured');
  const { data } = await axios.get(`${config.ridesApiBase}/v1.2/estimates/price`, {
    params: {
      start_latitude: startLat,
      start_longitude: startLng,
      end_latitude: startLat + 0.03, // ~2 mi test leg
      end_longitude: startLng + 0.03,
    },
    headers: { Authorization: `Token ${config.ridesServerToken}`, 'Accept-Language': 'en_US' },
    timeout: 15_000,
  });
  return data.prices || [];
}

// Pull the surge multiplier Uber reports directly, falling back to an estimate.
export function surgeFromPrices(prices) {
  const uberX = prices.find((p) => /uberx/i.test(p.display_name)) || prices[0];
  if (!uberX) return null;
  const multiplier = uberX.surge_multiplier || 1;
  const estimate = uberX.high_estimate || uberX.low_estimate || 0;
  return { product: uberX.display_name, multiplier, estimate };
}
