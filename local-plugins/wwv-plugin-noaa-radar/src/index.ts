import type {
  WorldPlugin,
  PluginContext,
  GeoEntity,
  TimeRange,
  LayerConfig,
  CesiumEntityOptions,
  SelectionBehavior,
} from "@worldwideview/wwv-plugin-sdk";

export class NOAARadarPlugin implements WorldPlugin {
  id = "noaa-radar";
  name = "NOAA Doppler Radar";
  description = "NOAA Next Generation Radar (NEXRAD) station locations across the US with links to live radar imagery.";
  icon = "Radio";
  category = "natural-disaster" as const;
  version = "1.0.0";

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
      const res = await fetch(`${engineUrl}/api/noaa-radar?lookback=15m`);
      if (!res.ok) throw new Error(`Engine returned ${res.status}`);
      const data = await res.json();
      if (!data.items) return [];
      return data.items.map((item: any) => ({
        id: item.id,
        pluginId: this.id,
        latitude: item.latitude,
        longitude: item.longitude,
        timestamp: new Date(),
        label: item.id,
        properties: {
          name: item.name,
          stationType: item.stationType,
          radarUrl: item.radarUrl,
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
      color: "#00FF88",
      clusterEnabled: false,
      clusterDistance: 0,
    };
  }

  renderEntity(entity: GeoEntity): CesiumEntityOptions {
    return {
      type: "point",
      color: "#00FF88",
      size: 6,
      outlineColor: "#FFFFFF",
      outlineWidth: 1,
    };
  }

  getSelectionBehavior(): SelectionBehavior {
    return {
      flyToBaseDistance: 300_000,
    };
  }
}

export default new NOAARadarPlugin();
