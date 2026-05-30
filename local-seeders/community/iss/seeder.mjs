const WTIA_URL = 'https://api.wheretheiss.at/v1/satellites/25544';

export default {
  name: "iss",
  interval: 5000,
  async fetch(ctx) {
    const { redis } = ctx;
    try {
      const response = await fetch(WTIA_URL);
      const data = await response.json();
      const entities = [{
        id: "25544",
        name: "International Space Station",
        latitude: data.latitude,
        longitude: data.longitude,
        altitude: data.altitude * 1000,
        velocity: data.velocity,
        visibility: data.visibility,
        footprint: data.footprint
      }];
      console.log(`[ISS] Poll OK: ${data.latitude}, ${data.longitude}`);
      return entities;
    } catch (error) {
      console.error(`[ISS] Polling error: ${error.message}`);
      return [];
    }
  }
};
