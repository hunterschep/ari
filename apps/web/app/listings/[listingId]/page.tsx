import { AlertTriangle, Building2, CalendarDays, DollarSign, MessageSquare, ShieldCheck } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@ari/ui";
import { AppShell } from "../../../components/app-shell";
import { ApiActionButton } from "../../../components/page-tools";
import { getListingData } from "../../../lib/api";

export default async function ListingPage({ params }: { params: { listingId: string } }) {
  const detail = await getListingData(params.listingId);
  const listing = detail.listing;

  return (
    <AppShell active="search">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{listing.title ?? listing.address.raw}</h1>
          <p className="text-sm text-zinc-500">{listing.address.raw}{listing.address.unit ? `, ${listing.address.unit}` : ""} · ${listing.price.toLocaleString()} · {listing.bedrooms} bed</p>
        </div>
        <div className="flex gap-2">
          <ApiActionButton path={`/v1/listings/${listing.id}/message-drafts`} label="Draft outreach" doneLabel="Draft created" icon="send" />
          <ApiActionButton path={`/v1/listings/${listing.id}/save`} label="Save" doneLabel="Saved" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <img src={listing.media.photos[0] ?? "/images/listing-living.svg"} alt="" className="h-72 w-full rounded-t-lg object-cover" />
              <div className="grid gap-4 p-4 md:grid-cols-3">
                <Metric label="Fit score" value={`${detail.score?.totalScore ?? 0}/100`} />
                <Metric label="Freshness" value={listing.freshness} />
                <Metric label="Contact confidence" value={listing.contacts[0]?.confidence ?? "UNKNOWN"} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <MessageSquare className="h-4 w-4" aria-hidden />
              <CardTitle>Fit explanation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <ReasonList title="Positives" items={detail.score?.reasons.positives ?? []} />
              <ReasonList title="Concerns" items={detail.score?.reasons.negatives ?? []} />
              <ReasonList title="Uncertain" items={detail.score?.reasons.uncertainties ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <DollarSign className="h-4 w-4" aria-hidden />
              <CardTitle>Pricing advice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone={detail.pricingAdvice.verdict === "GOOD_DEAL" ? "green" : detail.pricingAdvice.verdict.includes("OVER") ? "yellow" : "neutral"}>
                  {detail.pricingAdvice.verdict.replaceAll("_", " ")}
                </Badge>
                <Badge>Total known move-in ${detail.pricingAdvice.moveInCostEstimate.totalKnownCost.toLocaleString()}</Badge>
              </div>
              {detail.pricingAdvice.estimatedFairRent ? (
                <p className="text-sm text-zinc-600">
                  Fair-rent band ${detail.pricingAdvice.estimatedFairRent.low.toLocaleString()}-${detail.pricingAdvice.estimatedFairRent.high.toLocaleString()} from comparable active units.
                </p>
              ) : null}
              {detail.pricingAdvice.negotiationAdvice.messageDraft ? (
                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">{detail.pricingAdvice.negotiationAdvice.messageDraft}</div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Building2 className="h-4 w-4" aria-hidden />
              <CardTitle>Building signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Risk bucket</span><Badge>{detail.buildingRisk.bucket}</Badge></div>
              <div className="flex justify-between"><span>Data confidence</span><span>{detail.buildingRisk.signals.dataConfidence}%</span></div>
              <p className="text-zinc-500">Public-data risk signals only.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              <CardTitle>Fee review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {detail.pricingAdvice.warnings.length ? detail.pricingAdvice.warnings.map((warning) => <div key={warning} className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">{warning}</div>) : <div className="text-sm text-zinc-600">No fee rule warnings.</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <CalendarDays className="h-4 w-4" aria-hidden />
              <CardTitle>Tour action</CardTitle>
            </CardHeader>
            <CardContent>
              <ApiActionButton path={`/v1/listings/${listing.id}/tour-request`} label="Request tour" doneLabel="Request drafted" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              <CardTitle>Application action</CardTitle>
            </CardHeader>
            <CardContent>
              <ApiActionButton path={`/v1/listings/${listing.id}/application-packet`} label="Prepare packet" doneLabel="Packet ready" />
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function ReasonList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{title}</div>
      <ul className="space-y-1 text-sm text-zinc-600">
        {items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>None</li>}
      </ul>
    </div>
  );
}
