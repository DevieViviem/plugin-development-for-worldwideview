const RADAR_STATIONS_URL = 'https://api.weather.gov/radar/stations';

export default {
  name: "noaa-radar",
  interval: 300000,
  async fetch(ctx) {
    try {
      const response = await fetch(RADAR_STATIONS_URL, {
        headers: { 'User-Agent': 'WorldwideView/1.0 (contact@worldwideview.dev)' }
      });
      if (!response.ok) {
        console.error(`[NOAA-Radar] API error: ${response.status}`);
        return [];
      }
      const data = await response.json();
      if (!data.features) return [];
      const entities = data.features
        .filter(f => f.geometry && f.geometry.coordinates)
        .map(f => {
          const coords = f.geometry.coordinates;
          const props = f.properties;
          return {
            id: props.stationIdentifier,
            latitude: coords[1],
            longitude: coords[0],
            name: props.name,
            stationType: props.stationType,
            radarUrl: `https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?service=WMS&version=1.3.0&request=GetMap&layers=conus_bref_qcd&bbox=-126,24,-66,50&width=800&height=400&crs=EPSG:4326&format=image/png&transparent=true`,
            timeStamp: new Date().toISOString()
          };
        });
      console.log(`[NOAA-Radar] Poll OK: ${entities.length} radar stations`);
      return entities;
    } catch (error) {
      console.error(`[NOAA-Radar] Polling error: ${error.message}`);
      return [];
    }
  }
};
