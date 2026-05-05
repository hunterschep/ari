import { normalizeListing } from "@ari/agents";

export type LandlordFeedRow = {
  address: string;
  unit?: string;
  price: number;
  bedrooms: number;
  bathrooms?: number;
  availableDate?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  amenities?: string;
  photos?: string;
};

export function importLandlordFeed(rows: LandlordFeedRow[]) {
  return rows.map((row) =>
    normalizeListing(
      {
        ...row,
        city: inferCity(row.address),
        state: "NY",
        amenities: row.amenities?.split(",").map((item) => item.trim()).filter(Boolean) ?? [],
        photos: row.photos?.split(",").map((item) => item.trim()).filter(Boolean) ?? [],
        title: row.description?.slice(0, 80) ?? row.address
      },
      "LANDLORD_FEED"
    )
  );
}

function inferCity(address: string) {
  const lower = address.toLowerCase();
  if (lower.includes("lic") || lower.includes("long island city")) return "LIC";
  if (lower.includes("greenpoint") || lower.includes("williamsburg") || lower.includes("brooklyn")) return "Brooklyn";
  return "NYC";
}
