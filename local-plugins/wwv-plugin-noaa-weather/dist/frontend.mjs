"use client";
//#region local-plugins/wwv-plugin-noaa-weather/src/index.ts
var NOAAWeatherStationsPlugin = class {
	constructor() {
		this.id = "noaa-stations";
		this.name = "NOAA Weather Stations";
		this.description = "Current conditions from NOAA weather observation stations across Texas including temperature, wind, humidity and visibility.";
		this.icon = "Thermometer";
		this.category = "natural-disaster";
		this.version = "1.0.0";
	}
	async initialize(ctx) {
		this.ctx = ctx;
	}
	destroy() {
		this.ctx = void 0;
	}
	async fetch(timeRange) {
		try {
			const engineUrl = this.ctx?.getEngineUrl() ?? "http://localhost:5050";
			const res = await fetch(`${engineUrl}/api/noaa-stations?lookback=15m`);
			if (!res.ok) throw new Error(`Engine returned ${res.status}`);
			const data = await res.json();
			if (!data.items) return [];
			return data.items.map((item) => ({
				id: item.id,
				pluginId: this.id,
				latitude: item.latitude,
				longitude: item.longitude,
				timestamp: new Date(item.timestamp || Date.now()),
				label: item.id,
				properties: {
					name: item.name,
					temperature: item.temperature !== null ? `${(item.temperature * 9 / 5 + 32).toFixed(1)}°F` : "N/A",
					windSpeed: item.windSpeed !== null ? `${(item.windSpeed * 2.237).toFixed(1)} mph` : "N/A",
					windDirection: item.windDirection !== null ? `${item.windDirection}°` : "N/A",
					humidity: item.humidity !== null ? `${item.humidity.toFixed(0)}%` : "N/A",
					visibility: item.visibility !== null ? `${(item.visibility / 1609.34).toFixed(1)} mi` : "N/A",
					description: item.description
				}
			}));
		} catch (e) {
			this.ctx?.onError(e);
			return [];
		}
	}
	getPollingInterval() {
		return 6e5;
	}
	getLayerConfig() {
		return {
			color: "#00AAFF",
			clusterEnabled: true,
			clusterDistance: 40
		};
	}
	renderEntity(entity) {
		return {
			type: "point",
			color: "#00AAFF",
			size: 8,
			outlineColor: "#FFFFFF",
			outlineWidth: 1
		};
	}
	getSelectionBehavior() {
		return { flyToBaseDistance: 2e5 };
	}
};
var src_default = new NOAAWeatherStationsPlugin();
//#endregion
export { NOAAWeatherStationsPlugin, src_default as default };

//# sourceMappingURL=frontend.mjs.map