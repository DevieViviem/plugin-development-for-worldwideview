"use client";
//#region local-plugins/wwv-plugin-noaa-radar/src/index.ts
var NOAARadarPlugin = class {
	constructor() {
		this.id = "noaa-radar";
		this.name = "NOAA Doppler Radar";
		this.description = "NOAA Next Generation Radar (NEXRAD) station locations across the US with links to live radar imagery.";
		this.icon = "Radio";
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
			const res = await fetch(`${engineUrl}/api/noaa-radar?lookback=15m`);
			if (!res.ok) throw new Error(`Engine returned ${res.status}`);
			const data = await res.json();
			if (!data.items) return [];
			return data.items.map((item) => ({
				id: item.id,
				pluginId: this.id,
				latitude: item.latitude,
				longitude: item.longitude,
				timestamp: /* @__PURE__ */ new Date(),
				label: item.id,
				properties: {
					name: item.name,
					stationType: item.stationType,
					radarUrl: item.radarUrl
				}
			}));
		} catch (e) {
			this.ctx?.onError(e);
			return [];
		}
	}
	getPollingInterval() {
		return 3e5;
	}
	getLayerConfig() {
		return {
			color: "#00FF88",
			clusterEnabled: false,
			clusterDistance: 0
		};
	}
	renderEntity(entity) {
		return {
			type: "point",
			color: "#00FF88",
			size: 6,
			outlineColor: "#FFFFFF",
			outlineWidth: 1
		};
	}
	getSelectionBehavior() {
		return { flyToBaseDistance: 3e5 };
	}
};
var src_default = new NOAARadarPlugin();
//#endregion
export { NOAARadarPlugin, src_default as default };

//# sourceMappingURL=frontend.mjs.map