import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle2, FileText, Inbox, Search } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@ari/ui";
import { AppShell } from "../../components/app-shell";
import { getDashboardData } from "../../lib/api";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const highFit = data.results.filter((item) => item.score.recommendation === "CONTACT_NOW");

  return (
    <AppShell active="dashboard">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-zinc-500">{data.profile.targetCity} search · ${data.profile.budgetMax?.toLocaleString()} max · {data.profile.neighborhoods.join(", ")}</p>
        </div>
        <Button variant="secondary">
          <Link href="/search/search-demo">Open ranked search</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Needs your approval</CardTitle>
            <Badge tone={data.approvals.length ? "yellow" : "green"}>{data.approvals.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.approvals.map((approval) => (
              <div key={approval.id} className="rounded-md border border-zinc-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{approval.title}</div>
                    <div className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-zinc-600">{approval.body}</div>
                  </div>
                  <Badge tone="yellow">risk {approval.riskScore}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search state</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <StateRow icon={Search} label="Ranked units" value={String(data.results.length)} />
            <StateRow icon={Inbox} label="Conversations" value={String(data.conversations.length)} />
            <StateRow icon={CalendarDays} label="Tours pending" value={String(data.tours.length)} />
            <StateRow icon={FileText} label="Documents" value={String(data.documents.length)} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New high-fit units</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {highFit.map(({ listing, score, pricingAdvice }) => (
              <Link href={`/listings/${listing.id}`} key={listing.id} className="flex items-center justify-between rounded-md border border-zinc-200 p-3 hover:bg-zinc-50">
                <div className="flex min-w-0 items-center gap-3">
                  <img src={listing.media.photos[0] ?? "/images/listing-living.svg"} alt="" className="h-14 w-20 rounded-md border border-zinc-200 object-cover" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{listing.title}</div>
                    <div className="text-sm text-zinc-500">${listing.price.toLocaleString()} · {pricingAdvice.verdict.replaceAll("_", " ").toLowerCase()}</div>
                  </div>
                </div>
                <Badge tone="green">{score.totalScore}/100</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.results
              .filter((item) => item.pricingAdvice.warnings.length > 0)
              .map((item) => (
                <div key={item.listing.id} className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{item.pricingAdvice.warnings[0]}</span>
                </div>
              ))}
            <div className="flex gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Sensitive sends require logged approval.
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function StateRow({ icon: Icon, label, value }: { icon: typeof Search; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
      <span className="flex items-center gap-2 text-zinc-600">
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </span>
      <span className="font-medium text-zinc-950">{value}</span>
    </div>
  );
}
