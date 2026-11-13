// Called from the tap handler with nothing awaited first, so iOS Safari still
// treats getCurrentPosition as part of the user gesture.
export function requestDeviceLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('location is not available in this browser. type a zip or city.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => {
        if (error.code === 1) reject(new Error('location is off. type a zip or city instead.'));
        else if (error.code === 3) reject(new Error('that took too long. type a zip or city instead.'));
        else reject(new Error('location is unavailable. type a zip or city instead.'));
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  });
}
