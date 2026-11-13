import * as Location from 'expo-location';

/** Asks only while the app is open, and only after the location button is pressed. */
export async function requestDeviceLocation(): Promise<{ lat: number; lng: number }> {
  const current = await Location.getForegroundPermissionsAsync();
  let granted = current.granted;
  if (!granted) {
    const asked = await Location.requestForegroundPermissionsAsync();
    granted = asked.granted;
  }
  if (!granted) throw new Error('location is off. type a zip or city.');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}
