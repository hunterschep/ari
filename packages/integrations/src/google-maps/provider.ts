import { stableHash } from "@ari/shared";

export type GeocodeResult = {
  formattedAddress: string;
  lat: number;
  lng: number;
};

export type RouteMatrixInput = {
  origins: string[];
  destinations: string[];
};

export type RouteMatrixResult = {
  rows: Array<{ origin: string; destination: string; durationMinutes: number; distanceMiles: number }>;
};

export interface MapsProvider {
  geocode(address: string): Promise<GeocodeResult>;
  computeRouteMatrix(input: RouteMatrixInput): Promise<RouteMatrixResult>;
}

export class MockMapsProvider implements MapsProvider {
  async geocode(address: string): Promise<GeocodeResult> {
    const hash = parseInt(stableHash(address).slice(0, 8), 16);
    return {
      formattedAddress: address,
      lat: 40.65 + (hash % 1200) / 10000,
      lng: -74.02 + (hash % 900) / 10000
    };
  }

  async computeRouteMatrix(input: RouteMatrixInput): Promise<RouteMatrixResult> {
    return {
      rows: input.origins.flatMap((origin, originIndex) =>
        input.destinations.map((destination, destinationIndex) => ({
          origin,
          destination,
          durationMinutes: 18 + originIndex * 7 + destinationIndex * 5,
          distanceMiles: 2.1 + originIndex + destinationIndex * 0.8
        }))
      )
    };
  }
}
