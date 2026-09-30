import * as Location from 'expo-location';
import type { RollLocation } from '../../rolls/types';

export function isValidLocation(value: unknown): value is RollLocation {
  if (!value || typeof value !== 'object' || !('latitude' in value) || !('longitude' in value)) return false;
  return typeof value.latitude === 'number' && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
    typeof value.longitude === 'number' && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180;
}
export function locationLabel(location: RollLocation): string {
  return location.name || location.address?.split(',')[0] || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}
export const locationService = {
  async getCurrentLocation(): Promise<{ status: 'granted'; location: RollLocation } | { status: 'denied' }> {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
    const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { status: 'granted', location: { latitude: result.coords.latitude, longitude: result.coords.longitude } };
  },
  async reverseGeocode(coordinate: RollLocation): Promise<RollLocation> {
    try {
      const [place] = await Location.reverseGeocodeAsync(coordinate);
      if (!place) return coordinate;
      const address = [...new Set([place.name, place.street, place.city, place.region, place.country].filter(Boolean))].join(', ');
      return { ...coordinate, name: coordinate.name || place.city || place.district || place.name || undefined, address: address || undefined };
    } catch { return coordinate; }
  },
  async search(query: string): Promise<RollLocation[]> {
    if (!query.trim()) return [];
    // Native geocoding: no third-party API key or startup permission request.
    // iOS supports this independently of device-location permission.
    const results = await Location.geocodeAsync(query.trim());
    return results.filter(isValidLocation).slice(0, 5).map(({ latitude, longitude }) => ({ latitude, longitude, name: query.trim() }));
  },
};
