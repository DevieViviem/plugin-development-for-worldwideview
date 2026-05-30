const NOAA_ALERTS_URL = 'https://api.weather.gov/alerts/active?status=actual&message_type=alert,update';

export default {
  name: "noaa-alerts",
  interval: 300000,
  async fetch(ctx) {
    try {
      const response = await fetch(NOAA_ALERTS_URL, {
        headers: { 'User-Agent': 'WorldwideView/1.0 (contact@worldwideview.dev)' }
      });
      if (!response.ok) {
        console.error(`[NOAA-Alerts] API error: ${response.status}`);
        return [];
      }
      const data = await response.json();
      if (!data.features) return [];
      const entities = data.features
        .filter(f => f.geometry && f.geometry.coordinates)
        .map(f => {
          const props = f.properties;
          let lat, lon, polygon = null;
          if (f.geometry.type === 'Polygon') {
            const coords = f.geometry.coordinates[0];
            lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
            lon = coords.reduce((s, c) => s + c[0], 0) / coords.length;
            polygon = coords.map(c => ({ longitude: c[0], latitude: c[1] }));
          } else if (f.geometry.type === 'MultiPolygon') {
            const coords = f.geometry.coordinates[0][0];
            lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
            lon = coords.reduce((s, c) => s + c[0], 0) / coords.length;
            polygon = coords.map(c => ({ longitude: c[0], latitude: c[1] }));
          } else if (f.geometry.type === 'Point') {
            lon = f.geometry.coordinates[0];
            lat = f.geometry.coordinates[1];
          } else {
            return null;
          }
          return {
            id: f.id,
            latitude: lat,
            longitude: lon,
            event: props.event,
            severity: props.severity,
            urgency: props.urgency,
            headline: props.headline,
            description: props.description,
            onset: props.onset,
            expires: props.expires,
            areaDesc: props.areaDesc,
            polygon
          };
        })
        .filter(Boolean);
      console.log(`[NOAA-Alerts] Poll OK: ${entities.length} active alerts`);
      return entities;
    } catch (error) {
      console.error(`[NOAA-Alerts] Polling error: ${error.message}`);
      return [];
    }
  }
};
