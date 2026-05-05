import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@ari/ui";
import { AppShell } from "../../../components/app-shell";
import { MapWorkspace } from "../../../components/map-workspace";
import { ApiActionButton } from "../../../components/page-tools";
import { getSearchData } from "../../../lib/api";

export default async function SearchPage({ params }: { params: { searchSessionId: string } }) {
  const data = await getSearchData(params.searchSessionId);
  const warnings = data.results.filter((item) => item.pricingAdvice.warnings.length).length;
  const contactNow = data.results.filter((item) => item.score.recommendation === "CONTACT_NOW").length;

  return (
    <AppShell active="/search/search-demo">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">Map search</h1>
            <Badge tone="blue">{data.session.criteria.city}</Badge>
            <Badge>{data.session.status.toLowerCase()}</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {data.session.criteria.neighborhoods.join(", ")} · ${data.session.criteria.budgetMin?.toLocaleString()}-${data.session.criteria.budgetMax.toLocaleString()} · {data.map.features.length} pins
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters
          </button>
          <ApiActionButton path={`/v1/search-sessions/${params.searchSessionId}/refresh`} label="Refresh" doneLabel="Refreshed" icon="refresh" />
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <SearchMetric label="Candidates" value={data.results.length} sub="ranked" />
        <SearchMetric label="Contact now" value={contactNow} sub="high fit" tone="green" />
        <SearchMetric label="Need review" value={data.inquiries.filter((row) => row.pipeline.owner === "USER").length} sub="user owned" tone="yellow" />
        <SearchMetric label="Fee warnings" value={warnings} sub="NY checks" tone={warnings ? "yellow" : "green"} />
        <SearchMetric label="Median commute" value={median(data.map.features.map((feature) => feature.commuteMinutes ?? 0))} sub="minutes" />
      </div>

      <MapWorkspace map={data.map} rows={data.inquiries} />

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden />
          <CardTitle>Agent activity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge>RentCast source sync</Badge>
          <Badge>Mapbox geocode fallback</Badge>
          <Badge>Dedupe complete</Badge>
          <Badge>Scoring complete</Badge>
          <Badge>Approval-gated outreach</Badge>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function SearchMetric({ label, value, sub, tone = "neutral" }: { label: string; value: number; sub: string; tone?: "neutral" | "green" | "yellow" }) {
  const toneClass = tone === "green" ? "border-emerald-200 bg-emerald-50" : tone === "yellow" ? "border-amber-200 bg-amber-50" : "border-zinc-200 bg-white";
  return (
    <div className={`rounded-md border ${toneClass} p-3`}>
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold leading-none text-zinc-950">{value}</div>
      <div className="mt-1 text-[11px] text-zinc-500">{sub}</div>
    </div>
  );
}

function median(values: number[]) {
  const sorted = values.filter(Boolean).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.floor(sorted.length / 2)] ?? sorted[0]!;
}
