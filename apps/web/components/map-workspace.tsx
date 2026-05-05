import Link from "next/link";
import { LocateFixed, MapPin, Route } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@ari/ui";
import type { InquiryPipelineRow, MapSearchResponse } from "@ari/schemas";

export function MapWorkspace({ map, rows }: { map: MapSearchResponse; rows: InquiryPipelineRow[] }) {
  const west = map.bounds.west;
  const east = map.bounds.east;
  const south = map.bounds.south;
  const north = map.bounds.north;
  const lngSpan = Math.max(east - west, 0.01);
  const latSpan = Math.max(north - south, 0.01);

  return (
    <div className="grid gap-4 xl:grid-cols-[440px_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ranked units</CardTitle>
          <Badge>{rows.length} candidates</Badge>
        </CardHeader>
        <CardContent className="max-h-[720px] space-y-2 overflow-y-auto p-2">
          {rows.map(({ pipeline, listing, score }) => (
            <Link key={pipeline.id} href={`/listings/${listing.id}`} className="block rounded-md border border-zinc-200 bg-white p-3 hover:bg-zinc-50">
              <div className="flex items-start gap-3">
                <img src={listing.media.photos[0] ?? "/images/listing-living.svg"} alt="" className="h-16 w-20 rounded-md border border-zinc-200 object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-zinc-950">{listing.title ?? listing.address.raw}</div>
                  <div className="mt-1 text-xs text-zinc-500">${listing.price.toLocaleString()} · {listing.address.city}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={pipeline.owner === "USER" ? "yellow" : "neutral"}>{pipeline.status.replaceAll("_", " ").toLowerCase()}</Badge>
                    <span className="text-xs font-medium text-zinc-700">{score?.totalScore ?? pipeline.score}/100</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Map view</CardTitle>
            <div className="mt-1 text-xs text-zinc-500">Operational placement, commute, and risk state for the active NYC search.</div>
          </div>
          <Badge tone="blue">Mapbox-ready</Badge>
        </CardHeader>
        <CardContent className="p-3">
          <div className="relative min-h-[620px] overflow-hidden rounded-md border border-zinc-200 bg-[#eef1ef]">
            <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "linear-gradient(#d7dcd8 1px, transparent 1px), linear-gradient(90deg, #d7dcd8 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
            <div className="absolute left-[10%] top-0 h-full w-10 rotate-6 bg-white/70" />
            <div className="absolute left-[44%] top-0 h-full w-8 -rotate-3 bg-white/70" />
            <div className="absolute left-0 top-[34%] h-10 w-full -rotate-2 bg-white/70" />
            <div className="absolute left-0 top-[66%] h-8 w-full rotate-3 bg-white/70" />
            <div className="absolute right-4 top-4 flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 shadow-sm">
              <LocateFixed className="h-3.5 w-3.5" aria-hidden />
              {map.center.lat.toFixed(3)}, {map.center.lng.toFixed(3)}
            </div>
            {map.features.map((feature) => {
              const left = ((feature.lng - west) / lngSpan) * 84 + 8;
              const top = 92 - ((feature.lat - south) / latSpan) * 84;
              return (
                <Link
                  key={feature.id}
                  href={`/listings/${feature.listingId}`}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                  style={{ left: `${Math.min(Math.max(left, 6), 94)}%`, top: `${Math.min(Math.max(top, 8), 92)}%` }}
                >
                  <span className="flex h-8 min-w-12 items-center justify-center gap-1 rounded-md border border-zinc-900 bg-white px-2 text-xs font-semibold shadow-sm">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {feature.score}
                  </span>
                  <span className="mt-1 rounded-md bg-zinc-950 px-1.5 py-0.5 text-[11px] font-medium text-white">${Math.round(feature.price / 100) / 10}k</span>
                </Link>
              );
            })}
            <div className="absolute bottom-4 left-4 grid gap-2 rounded-md border border-zinc-200 bg-white p-3 text-xs shadow-sm sm:grid-cols-3">
              <div>
                <div className="text-zinc-500">Median commute</div>
                <div className="mt-1 font-semibold text-zinc-950">{median(map.features.map((feature) => feature.commuteMinutes ?? 0))} min</div>
              </div>
              <div>
                <div className="text-zinc-500">Warnings</div>
                <div className="mt-1 font-semibold text-zinc-950">{map.features.reduce((sum, feature) => sum + feature.warningCount, 0)}</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-zinc-500">
                  <Route className="h-3.5 w-3.5" aria-hidden />
                  Active bounds
                </div>
                <div className="mt-1 font-semibold text-zinc-950">{map.features.length} pins</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function median(values: number[]) {
  const sorted = values.filter(Boolean).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.floor(sorted.length / 2)] ?? sorted[0]!;
}
