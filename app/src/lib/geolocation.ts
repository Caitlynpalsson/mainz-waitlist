/** Native builds have no browser geolocation in this slice. The zip or city field still works. */
export function requestDeviceLocation(): Promise<{ lat: number; lng: number }> {
  return Promise.reject(new Error('location is not available here. type a zip or city.'));
}
