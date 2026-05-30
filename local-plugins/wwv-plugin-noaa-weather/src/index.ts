import type {
  WorldPlugin,
  PluginContext,
  GeoEntity,
  TimeRange,
  LayerConfig,
  CesiumEntityOptions,
  SelectionBehavior,
} from "@worldwideview/wwv-plugin-sdk";

export class NOAAWeatherStationsPlugin implements WorldPlugin {
  id = "noaa-stations";
  name = "NOAA Weather Stations";
  description = "Current conditions from NOAA weather observation stations across Texas including temperature, wind, humidity and visibility.";
  icon = "Thermometer";
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
      const res = await fetch(`${engineUrl}/api/noaa-stations?lookback=15m`);
      if (!res.ok) throw new Error(`Engine returned ${res.status}`);
      const data = await res.json();
      if (!data.items) return [];
      return data.items.map((item: any) => ({
        id: item.id,
        pluginId: this.id,
        latitude: item.latitude,
        longitude: item.longitude,
        timestamp: new Date(item.timestamp || Date.now()),
        label: item.id,
        properties: {
          name: item.name,
          temperature: item.temperature !== null ? `${(item.temperature * 9/5 + 32).toFixed(1)}°F` : "N/A",
          windSpeed: item.windSpeed !== null ? `${(item.windSpeed * 2.237).toFixed(1)} mph` : "N/A",
          windDirection: item.windDirection !== null ? `${item.windDirection}°` : "N/A",
          humidity: item.humidity !== null ? `${item.humidity.toFixed(0)}%` : "N/A",
          visibility: item.visibility !== null ? `${(item.visibility / 1609.34).toFixed(1)} mi` : "N/A",
          description: item.description,
        },
      }));
    } catch (e) {
      this.ctx?.onError(e as Error);
      return [];
    }
  }

  getPollingInterval(): number {
    return 600_000;
  }

  getLayerConfig(): LayerConfig {
    return {
      color: "#00AAFF",
      clusterEnabled: true,
      clusterDistance: 40,
    };
  }

  renderEntity(entity: GeoEntity): CesiumEntityOptions {
    return {
      type: "point",
      color: "#00AAFF",
      size: 8,
      outlineColor: "#FFFFFF",
      outlineWidth: 1,
    };
  }

  getSelectionBehavior(): SelectionBehavior {
    return {
      flyToBaseDistance: 200_000,
    };
  }
}

export default new NOAAWeatherStationsPlugin();
