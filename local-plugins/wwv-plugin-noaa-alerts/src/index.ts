import type {
  WorldPlugin,
  PluginContext,
  GeoEntity,
  TimeRange,
  LayerConfig,
  CesiumEntityOptions,
  SelectionBehavior,
} from "@worldwideview/wwv-plugin-sdk";
import { useEffect, useRef } from "react";

const SEVERITY_COLORS: Record<string, string> = {
  Extreme: "#FF0000",
  Severe: "#FF6600",
  Moderate: "#FFAA00",
  Minor: "#FFFF00",
  Unknown: "#AAAAAA",
};

function NOAAAlertsGlobeComponent({ viewer, enabled }: { viewer: any; enabled: boolean }) {
  const primitivesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    // Clean up existing primitives
    primitivesRef.current.forEach(p => {
      if (!viewer.isDestroyed() && viewer.scene.primitives.contains(p)) {
        viewer.scene.primitives.remove(p);
      }
    });
    primitivesRef.current = [];

    if (!enabled) return;

    const Cesium = (globalThis as any).__WWV_HOST__?.Cesium;
    if (!Cesium) return;

    // Fetch alert data and draw polygons
    const engineUrl = (globalThis as any).__WWV_HOST__?.getEngineUrl?.() ?? "http://localhost:5050";
    fetch(`${engineUrl}/api/noaa-alerts?lookback=15m`)
      .then(r => r.json())
      .then(data => {
        if (!data.items || viewer.isDestroyed()) return;
        data.items.forEach((item: any) => {
          if (!item.polygon || item.polygon.length < 3) return;
          const color = Cesium.Color.fromCssColorString(SEVERITY_COLORS[item.severity] ?? "#AAAAAA").withAlpha(0.3);
          const outlineColor = Cesium.Color.fromCssColorString(SEVERITY_COLORS[item.severity] ?? "#AAAAAA");
          const positions = item.polygon.map((p: any) =>
            Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude)
          );
          const entity = viewer.entities.add({
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(positions),
              material: color,
              outline: true,
              outlineColor,
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            properties: { noaa_alert: true }
          });
          primitivesRef.current.push(entity);
        });
        viewer.scene.requestRender();
      })
      .catch(console.error);

    return () => {
      primitivesRef.current.forEach(e => {
        if (!viewer.isDestroyed()) viewer.entities.remove(e);
      });
      primitivesRef.current = [];
    };
  }, [viewer, enabled]);

  return null;
}

export class NOAAWeatherAlertsPlugin implements WorldPlugin {
  id = "noaa-alerts";
  name = "NOAA Weather Alerts";
  description = "Live weather alerts, warnings, and advisories from the National Weather Service covering TX, LA, MS, AL, and FL.";
  icon = "CloudLightning";
  category = "natural-disaster" as const;
  version = "1.0.2";

  private ctx?: PluginContext;

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
  }

  destroy(): void {
    this.ctx = undefined;
  }

  async fetch(timeRange: TimeRange): Promise<GeoEntity[]> {
    try {
      const engineUrl = this.ctx?.getEngineUrl() ?? "http://localhost:5050";
      const res = await fetch(`${engineUrl}/api/noaa-alerts?lookback=15m`);
      if (!res.ok) throw new Error(`Engine returned ${res.status}`);
      const data = await res.json();
      if (!data.items) return [];
      return data.items.map((item: any) => ({
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
          polygon: item.polygon,
        },
      }));
    } catch (e) {
      this.ctx?.onError(e as Error);
      return [];
    }
  }

  getPollingInterval(): number {
    return 300_000;
  }

  getLayerConfig(): LayerConfig {
    return {
      color: "#FF6600",
      clusterEnabled: true,
      clusterDistance: 50,
      disableDefaultRendering: false,
    };
  }

  renderEntity(entity: GeoEntity): CesiumEntityOptions {
    const severity = entity.properties.severity as string ?? "Unknown";
    const color = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.Unknown;
    return {
      type: "point",
      color,
      size: 10,
      outlineColor: "#FFFFFF",
      outlineWidth: 2,
    };
  }

  getGlobeComponent() {
    return NOAAAlertsGlobeComponent;
  }

  getSelectionBehavior(): SelectionBehavior {
    return { flyToBaseDistance: 500_000 };
  }

  getLegend() {
    return [
      { label: "Extreme", color: SEVERITY_COLORS.Extreme },
      { label: "Severe", color: SEVERITY_COLORS.Severe },
      { label: "Moderate", color: SEVERITY_COLORS.Moderate },
      { label: "Minor", color: SEVERITY_COLORS.Minor },
    ];
  }
}

export default new NOAAWeatherAlertsPlugin();
