import { MockMapsProvider } from "@ari/integrations";

export async function geocodeAddress(address: string) {
  return new MockMapsProvider().geocode(address);
}
