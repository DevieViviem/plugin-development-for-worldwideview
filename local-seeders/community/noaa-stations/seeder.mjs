const STATIONS_URL = 'https://api.weather.gov/stations?state=TX&limit=100';

export default {
  name: "noaa-stations",
  interval: 600000,
  async fetch(ctx) {
    try {
      const stationsResp = await fetch(STATIONS_URL, {
        headers: { 'User-Agent': 'WorldwideView/1.0 (contact@worldwideview.dev)' }
      });
      if (!stationsResp.ok) {
        console.error(`[NOAA-Stations] Stations error: ${stationsResp.status}`);
        return [];
      }
      const stationsData = await stationsResp.json();
      if (!stationsData.features) return [];
      const entities = [];
      for (const station of stationsData.features.slice(0, 50)) {
        try {
          const obsUrl = `https://api.weather.gov/stations/${station.properties.stationIdentifier}/observations/latest`;
          const obsResp = await fetch(obsUrl, {
            headers: { 'User-Agent': 'WorldwideView/1.0 (contact@worldwideview.dev)' }
          });
          if (!obsResp.ok) continue;
          const obs = await obsResp.json();
          const props = obs.properties;
          const coords = station.geometry.coordinates;
          if (!coords) continue;
          entities.push({
            id: station.properties.stationIdentifier,
            latitude: coords[1],
            longitude: coords[0],
            name: station.properties.name,
            temperature: props.temperature?.value,
            dewpoint: props.dewpoint?.value,
            windSpeed: props.windSpeed?.value,
            windDirection: props.windDirection?.value,
            humidity: props.relativeHumidity?.value,
            visibility: props.visibility?.value,
            description: props.textDescription,
            timestamp: props.timestamp
          });
        } catch (e) {
          continue;
        }
      }
      console.log(`[NOAA-Stations] Poll OK: ${entities.length} stations`);
      return entities;
    } catch (error) {
      console.error(`[NOAA-Stations] Polling error: ${error.message}`);
      return [];
    }
  }
};
