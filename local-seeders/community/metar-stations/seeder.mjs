const BASE_URL = 'https://aviationweather.gov/api/data/metar';
const HEADERS = { 'User-Agent': 'WorldwideView/1.0 (contact@worldwideview.dev)' };

// Flight category colors
const FLTCAT_COLORS = {
  VFR: '#00CC00',   // Green - good conditions
  MVFR: '#0066FF',  // Blue - marginal
  IFR: '#FF0000',   // Red - instrument conditions
  LIFR: '#FF00FF',  // Magenta - low instrument
};

export default {
  name: "metar-stations",
  interval: 3600000,
  async fetch(ctx) {
    try {
      // Fetch global METAR data
      const url = `${BASE_URL}?format=json&hours=1&bbox=-90,-180,90,180`;
      const response = await fetch(url, { headers: HEADERS });
      if (!response.ok) {
        console.error(`[METAR] API error: ${response.status}`);
        return [];
      }
      const data = await response.json();
      if (!Array.isArray(data)) return [];

      const entities = data
        .filter(s => s.lat !== null && s.lon !== null)
        .map(s => ({
          id: s.icaoId,
          latitude: s.lat,
          longitude: s.lon,
          name: s.name,
          icaoId: s.icaoId,
          temperature: s.temp,
          dewpoint: s.dewp,
          windSpeed: s.wspd,
          windDirection: s.wdir,
          visibility: s.visib,
          altimeter: s.altim,
          cover: s.cover,
          clouds: s.clouds,
          flightCategory: s.fltCat,
          wxString: s.wxString || null,
          rawOb: s.rawOb,
          elevation: s.elev,
          reportTime: s.reportTime,
          metarType: s.metarType,
          color: FLTCAT_COLORS[s.fltCat] || '#AAAAAA'
        }));

      console.log(`[METAR] Poll OK: ${entities.length} global stations`);
      return entities;
    } catch (error) {
      console.error(`[METAR] Polling error: ${error.message}`);
      return [];
    }
  }
};
