import { stableHash } from "@ari/shared";
import type { GeocodeResult, MapsProvider, RouteMatrixInput, RouteMatrixResult } from "../google-maps/provider";

export type MapboxProviderOptions = {
  accessToken?: string;
  baseUrl?: string;
};

type MapboxGeocodeResponse = {
  features?: Array<{
    place_name?: string;
    center?: [number, number];
    relevance?: number;
  }>;
};

type MapboxMatrixResponse = {
  durations?: number[][];
  distances?: number[][];
};

export class MapboxProvider implements MapsProvider {
  private readonly accessToken?: string;
  private readonly baseUrl: string;

  constructor(options: MapboxProviderOptions = {}) {
    this.accessToken = options.accessToken ?? process.env.MAPBOX_ACCESS_TOKEN;
    this.baseUrl = options.baseUrl ?? "https://api.mapbox.com";
  }

  async geocode(address: string): Promise<GeocodeResult> {
    if (!this.accessToken) return mockGeocode(address);
    const url = new URL(`/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`, this.baseUrl);
    url.searchParams.set("access_token", this.accessToken);
    url.searchParams.set("limit", "1");
    url.searchParams.set("country", "US");
    url.searchParams.set("proximity", "-73.9857,40.7484");

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Mapbox geocode failed: ${response.status}`);
    const body = (await response.json()) as MapboxGeocodeResponse;
    const feature = body.features?.[0];
    if (!feature?.center) return mockGeocode(address);
    return {
      formattedAddress: feature.place_name ?? address,
      lat: feature.center[1],
      lng: feature.center[0]
    };
  }

  async computeRouteMatrix(input: RouteMatrixInput): Promise<RouteMatrixResult> {
    if (!this.accessToken) return mockRouteMatrix(input);

    const geocoded = await Promise.all([...input.origins, ...input.destinations].map((address) => this.geocode(address)));
    const coordinates = geocoded.map((item) => `${item.lng},${item.lat}`).join(";");
    const sources = input.origins.map((_, index) => index).join(";");
    const destinations = input.destinations.map((_, index) => index + input.origins.length).join(";");
    const url = new URL(`/directions-matrix/v1/mapbox/driving/${coordinates}`, this.baseUrl);
    url.searchParams.set("access_token", this.accessToken);
    url.searchParams.set("sources", sources);
    url.searchParams.set("destinations", destinations);
    url.searchParams.set("annotations", "duration,distance");

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Mapbox matrix failed: ${response.status}`);
    const body = (await response.json()) as MapboxMatrixResponse;
    return {
      rows: input.origins.flatMap((origin, originIndex) =>
        input.destinations.map((destination, destinationIndex) => ({
          origin,
          destination,
          durationMinutes: Math.round((body.durations?.[originIndex]?.[destinationIndex] ?? 0) / 60),
          distanceMiles: Number(((body.distances?.[originIndex]?.[destinationIndex] ?? 0) / 1609.344).toFixed(1))
        }))
      )
    };
  }

  staticMapUrl(center: { lat: number; lng: number }, zoom = 12, size = { width: 960, height: 540 }) {
    if (!this.accessToken) return undefined;
    const width = Math.min(Math.max(size.width, 320), 1280);
    const height = Math.min(Math.max(size.height, 240), 1280);
    return `${this.baseUrl}/styles/v1/mapbox/light-v11/static/${center.lng},${center.lat},${zoom}/${width}x${height}@2x?access_token=${this.accessToken}`;
  }
}

function mockGeocode(address: string): GeocodeResult {
  const hash = parseInt(stableHash(address).slice(0, 8), 16);
  return {
    formattedAddress: address,
    lat: 40.675 + (hash % 1050) / 10000,
    lng: -74.02 + ((hash >> 4) % 950) / 10000
  };
}

function mockRouteMatrix(input: RouteMatrixInput): RouteMatrixResult {
  return {
    rows: input.origins.flatMap((origin, originIndex) =>
      input.destinations.map((destination, destinationIndex) => ({
        origin,
        destination,
        durationMinutes: 16 + originIndex * 6 + destinationIndex * 4,
        distanceMiles: Number((1.8 + originIndex * 0.9 + destinationIndex * 0.7).toFixed(1))
      }))
    )
  };
}
