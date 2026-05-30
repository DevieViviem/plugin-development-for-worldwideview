"use client";
//#region local-plugins/wwv-plugin-noaa-alerts/src/index.ts
var SEVERITY_COLORS = {
	Extreme: "#FF0000",
	Severe: "#FF6600",
	Moderate: "#FFAA00",
	Minor: "#FFFF00",
	Unknown: "#AAAAAA"
};
function NOAAAlertsGlobeComponent({ viewer, enabled }) {
	const primitivesRef = globalThis.__WWV_HOST__.React.useRef([]);
	globalThis.__WWV_HOST__.React.useEffect(() => {
		if (!viewer || viewer.isDestroyed()) return;
		primitivesRef.current.forEach((p) => {
			if (!viewer.isDestroyed() && viewer.scene.primitives.contains(p)) viewer.scene.primitives.remove(p);
		});
		primitivesRef.current = [];
		if (!enabled) return;
		const Cesium = globalThis.__WWV_HOST__?.Cesium;
		if (!Cesium) return;
		const engineUrl = globalThis.__WWV_HOST__?.getEngineUrl?.() ?? "http://localhost:5050";
		fetch(`${engineUrl}/api/noaa-alerts?lookback=15m`).then((r) => r.json()).then((data) => {
			if (!data.items || viewer.isDestroyed()) return;
			data.items.forEach((item) => {
				if (!item.polygon || item.polygon.length < 3) return;
				const color = Cesium.Color.fromCssColorString(SEVERITY_COLORS[item.severity] ?? "#AAAAAA").withAlpha(.3);
				const outlineColor = Cesium.Color.fromCssColorString(SEVERITY_COLORS[item.severity] ?? "#AAAAAA");
				const positions = item.polygon.map((p) => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude));
				const entity = viewer.entities.add({
					polygon: {
						hierarchy: new Cesium.PolygonHierarchy(positions),
						material: color,
						outline: true,
						outlineColor,
						outlineWidth: 2,
						heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
					},
					properties: { noaa_alert: true }
				});
				primitivesRef.current.push(entity);
			});
			viewer.scene.requestRender();
		}).catch(console.error);
		return () => {
			primitivesRef.current.forEach((e) => {
				if (!viewer.isDestroyed()) viewer.entities.remove(e);
			});
			primitivesRef.current = [];
		};
	}, [viewer, enabled]);
	return null;
}
var NOAAWeatherAlertsPlugin = class {
	constructor() {
		this.id = "noaa-alerts";
		this.name = "NOAA Weather Alerts";
		this.description = "Live weather alerts, warnings, and advisories from the National Weather Service covering TX, LA, MS, AL, and FL.";
		this.icon = "CloudLightning";
		this.category = "natural-disaster";
		this.version = "1.0.2";
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
			const res = await fetch(`${engineUrl}/api/noaa-alerts?lookback=15m`);
			if (!res.ok) throw new Error(`Engine returned ${res.status}`);
			const data = await res.json();
			if (!data.items) return [];
			return data.items.map((item) => ({
				id: item.id,
				pluginId: this.id,
				latitude: item.latitude,
				longitude: item.longitude,
				timestamp: new Date(item.onset || Date.now()),
				label: item.event,
				properties: {
					event: item.event,
					severity: item.severity,
					urgency: item.urgency,
					headline: item.headline,
					description: item.description,
					onset: item.onset,
					expires: item.expires,
					areaDesc: item.areaDesc,
					polygon: item.polygon
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
			color: "#FF6600",
			clusterEnabled: true,
			clusterDistance: 50,
			disableDefaultRendering: false
		};
	}
	renderEntity(entity) {
		return {
			type: "point",
			color: SEVERITY_COLORS[entity.properties.severity ?? "Unknown"] ?? SEVERITY_COLORS.Unknown,
			size: 10,
			outlineColor: "#FFFFFF",
			outlineWidth: 2
		};
	}
	getGlobeComponent() {
		return NOAAAlertsGlobeComponent;
	}
	getSelectionBehavior() {
		return { flyToBaseDistance: 5e5 };
	}
	getLegend() {
		return [
			{
				label: "Extreme",
				color: SEVERITY_COLORS.Extreme
			},
			{
				label: "Severe",
				color: SEVERITY_COLORS.Severe
			},
			{
				label: "Moderate",
				color: SEVERITY_COLORS.Moderate
			},
			{
				label: "Minor",
				color: SEVERITY_COLORS.Minor
			}
		];
	}
};
var src_default = new NOAAWeatherAlertsPlugin();
//#endregion
export { NOAAWeatherAlertsPlugin, src_default as default };

//# sourceMappingURL=frontend.mjs.map