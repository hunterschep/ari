import { RefreshCw } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@ari/ui";
import { AppShell } from "../../../components/app-shell";
import { ApiActionButton } from "../../../components/page-tools";
import { ListingTable } from "../../../components/listing-table";
import { getSearchData } from "../../../lib/api";

export default async function SearchPage({ params }: { params: { searchSessionId: string } }) {
  const data = await getSearchData(params.searchSessionId);

  return (
    <AppShell active="search">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ranked listings</h1>
          <p className="text-sm text-zinc-500">{data.session.criteria.city} · {data.session.criteria.neighborhoods.join(", ")} · {data.session.status.toLowerCase()}</p>
        </div>
        <ApiActionButton path={`/v1/search-sessions/${params.searchSessionId}/refresh`} label="Refresh" doneLabel="Refreshed" icon="refresh" />
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-4">
        {[
          ["Candidates", data.results.length],
          ["Contact now", data.results.filter((item) => item.score.recommendation === "CONTACT_NOW").length],
          ["Need review", data.results.filter((item) => item.score.recommendation === "NEEDS_USER_REVIEW").length],
          ["Fee warnings", data.results.filter((item) => item.pricingAdvice.warnings.length).length]
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="text-sm text-zinc-500">{label}</div>
              <div className="mt-1 text-2xl font-semibold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ListingTable results={data.results} />

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden />
          <CardTitle>Agent activity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge>RentCast fixture pull</Badge>
          <Badge>Dedupe complete</Badge>
          <Badge>Scoring complete</Badge>
          <Badge>Top listings explained</Badge>
          <Badge>Outreach drafts pending approval</Badge>
        </CardContent>
      </Card>
    </AppShell>
  );
}
