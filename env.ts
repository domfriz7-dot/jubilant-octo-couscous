import { optionalEnv } from './env';

/**
 * Google Places API Configuration
 *
 * To enable location-based date suggestions:
 * 1. Go to https://console.cloud.google.com
 * 2. Enable "Places API" for your project
 * 3. Create an API key (restrict to Places API + your app)
 * 4. Replace the empty string below with your key
 *
 * The app works fine without this — it just won't show
 * nearby venue suggestions on the Tonight screen.
 */

const PLACES_CONFIG = {
  // Prefer an Expo public env var if provided (safe for client-side usage).
  // Set in app config (e.g. app.json) or .env:
  // EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=AIzaSy...
  apiKey: optionalEnv('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY'),
  defaultRadiusM: 5000,
  minRating: 3.5,
  maxResults: 5,
};

export function getPlacesConfig() {
  return PLACES_CONFIG;
}

export function setPlacesApiKey(key: string) {
  PLACES_CONFIG.apiKey = key;
}