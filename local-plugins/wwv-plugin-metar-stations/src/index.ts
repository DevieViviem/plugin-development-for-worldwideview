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

const FLTCAT_COLORS: Record<string, string> = {
  VFR: "#00CC00",
  MVFR: "#0066FF",
  IFR: "#FF0000",
  LIFR: "#FF00FF",
};

function celsiusToFahrenheit(c: number | null): string {
  if (c === null || c === undefined) return "N/A";
  return `${((c * 9/5) + 32).toFixed(1)}°F`;
}

function ktsToMph(kts: number | null): string {
  if (kts === null || kts === undefined) return "N/A";
  return `${(kts * 1.15078).toFixed(1)} mph`;
}

function getEngineBaseUrl() {
  if (typeof window === "undefined") return "http://localhost:5050";
  return `${window.location.protocol}//${window.location.hostname}:5050`;
}

function METARGlobeComponent({ viewer, enabled }: { viewer: any; enabled: boolean }) {
  const entitiesRef = useRef<any[]>([]);
  const cameraListenerRef = useRef<any>(null);
  const fetchTimerRef = useRef<any>(null);
  const allStationsRef = useRef<any[]>([]);

  const clearEntities = (v: any) => {
    entitiesRef.current.forEach(e => {
      if (!v.isDestroyed()) v.entities.remove(e);
    });
    entitiesRef.current = [];
  };

  const getBbox = (v: any): { south: number; west: number; north: number; east: number } | null => {
    try {
      const Cesium = (globalThis as any).__WWV_HOST__?.Cesium;
      if (!Cesium) return null;
      const rect = v.camera.computeViewRectangle();
      if (!rect) return null;
      return {
        south: Cesium.Math.toDegrees(rect.south),
        west: Cesium.Math.toDegrees(rect.west),
        north: Cesium.Math.toDegrees(rect.north),
        east: Cesium.Math.toDegrees(rect.east),
      };
    } catch {
      return null;
    }
  };

  const drawStationsForView = (v: any) => {
    const Cesium = (globalThis as any).__WWV_HOST__?.Cesium;
    if (!Cesium || v.isDestroyed() || allStationsRef.current.length === 0) return;

    const bbox = getBbox(v);
    clearEntities(v);

    // Filter stations to visible area
    // If bbox is too small or globe is rotated oddly, show all
    const bboxArea = bbox ? (bbox.north - bbox.south) * (bbox.east - bbox.west) : 0;
    const visible = bbox && bboxArea > 1
      ? allStationsRef.current.filter(s =>
          s.latitude >= bbox.south && s.latitude <= bbox.north &&
          s.longitude >= bbox.west && s.longitude <= bbox.east
        )
      : allStationsRef.current;

    // Limit to 400 stations max for performance
    const toShow = visible.slice(0, 400);

    toShow.forEach((s: any) => {
      const color = FLTCAT_COLORS[s.flightCategory] ?? "#AAAAAA";
      const cesiumColor = Cesium.Color.fromCssColorString(color);
      const entity = v.entities.add({
        position: Cesium.Cartesian3.fromDegrees(s.longitude, s.latitude),
        point: {
          pixelSize: 8,
          color: cesiumColor,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1,
          disableDepthTestDistance: 1e7,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        properties: { metar: true, icaoId: s.icaoId }
      });
      entitiesRef.current.push(entity);
    });

    v.scene.requestRender();
    console.log(`[METAR] Showing ${toShow.length} of ${allStationsRef.current.length} stations`);
  };

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    if (!enabled) {
      clearEntities(viewer);
      return;
    }

    const appUrl = `${window.location.protocol}//${window.location.hostname}:3000`;

    const fetchForBbox = async (bbox: { south: number; west: number; north: number; east: number } | null) => {
      try {
        const bboxStr = bbox
          ? `${bbox.south.toFixed(2)},${bbox.west.toFixed(2)},${bbox.north.toFixed(2)},${bbox.east.toFixed(2)}`
          : "-90,-180,90,180";
        const res = await fetch(`${appUrl}/api/metar?bbox=${bboxStr}&hours=1`);
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || viewer.isDestroyed()) return;
        const Cesium = (globalThis as any).__WWV_HOST__?.Cesium;
        if (!Cesium) return;
        clearEntities(viewer);
        entitiesRef.current = [];
        data.filter((s: any) => s.lat && s.lon).forEach((s: any) => {
          const color = FLTCAT_COLORS[s.fltCat] ?? "#AAAAAA";
          const cesiumColor = Cesium.Color.fromCssColorString(color);
          const entity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat),
            point: {
              pixelSize: 8,
              color: cesiumColor,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 1,
              disableDepthTestDistance: 1e7,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            properties: { metar: true, icaoId: s.icaoId }
          });
          entitiesRef.current.push(entity);
        });
        viewer.scene.requestRender();
        console.log(`[METAR] Drew ${entitiesRef.current.length} stations for bbox ${bboxStr}`);
      } catch (e) {
        console.error("[METAR] Fetch error:", e);
      }
    };

    // Initial fetch for full globe
    fetchForBbox(null);

    // Watch camera and fetch appropriate data based on zoom level
    cameraListenerRef.current = viewer.camera.changed.addEventListener(() => {
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = setTimeout(() => {
        const bbox = getBbox(viewer);
        const bboxArea = bbox ? (bbox.north - bbox.south) * (bbox.east - bbox.west) : 99999;
        if (bboxArea < 2000) {
          // Zoomed in — fetch fresh data for visible area
          fetchForBbox(bbox);
        } else {
          // Zoomed out — fetch global data
          fetchForBbox(null);
        }
      }, 1500);
    });

    return () => {
      clearEntities(viewer);
      if (cameraListenerRef.current) {
        cameraListenerRef.current();
        cameraListenerRef.current = null;
      }
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
      allStationsRef.current = [];
    };
  }, [viewer, enabled]);

  return null;
}

export class METARStationsPlugin implements WorldPlugin {
  id = "metar-stations";
  name = "METAR Weather Stations";
  description = "Real-time global aviation weather observations color coded by flight category. Dynamically filters stations based on your view.";
  icon = "Wind";
  category = "natural-disaster" as const;
  version = "1.2.0";

  private ctx?: PluginContext;

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
  }

  destroy(): void {
    this.ctx = undefined;
  }

  async fetch(timeRange: TimeRange): Promise<GeoEntity[]> {
    return [];
  }

  getPollingInterval(): number {
    return 3_600_000;
  }

  getLayerConfig(): LayerConfig {
    return {
      color: "#00CC00",
      clusterEnabled: false,
      clusterDistance: 0,
      disableDefaultRendering: true,
    };
  }

  renderEntity(entity: GeoEntity): CesiumEntityOptions {
    return { type: "point", color: "#00CC00", size: 8 };
  }

  getGlobeComponent() {
    return METARGlobeComponent;
  }

  getSelectionBehavior(): SelectionBehavior {
    return { flyToBaseDistance: 150_000 };
  }

  getLegend() {
    return [
      { label: "VFR — Visual Flight Rules (good)", color: FLTCAT_COLORS.VFR },
      { label: "MVFR — Marginal VFR", color: FLTCAT_COLORS.MVFR },
      { label: "IFR — Instrument Flight Rules", color: FLTCAT_COLORS.IFR },
      { label: "LIFR — Low IFR (severe)", color: FLTCAT_COLORS.LIFR },
    ];
  }
}

export default new METARStationsPlugin();
