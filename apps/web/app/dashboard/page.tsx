import Link from "next/link";
import { ArrowRight, Bot, CalendarDays, FileText, Inbox, RefreshCw, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@ari/ui";
import { AppShell } from "../../components/app-shell";
import { IntegrationHealth } from "../../components/integration-health";
import { PipelineTable } from "../../components/pipeline-table";
import { TaskQueue } from "../../components/task-queue";
import { getDashboardData } from "../../lib/api";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const summary = data.summary;
  const needsConfig = data.integrationConnections.filter((connection) => connection.status === "NEEDS_CONFIG" || connection.status === "DISCONNECTED").length;

  return (
    <AppShell active="dashboard">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-normal">Workspace</h1>
            <Badge tone="blue">{data.activeSearch?.criteria.city ?? data.profile.targetCity}</Badge>
            <Badge>{data.activeSearch?.status?.toLowerCase() ?? "active"}</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            ${data.profile.budgetMin?.toLocaleString()}-${data.profile.budgetMax?.toLocaleString()} · {data.profile.neighborhoods.join(", ")} · approval-first autonomy
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/search/search-demo" className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-50">
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh search
          </Link>
          <Link href="/account" className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Account readiness
          </Link>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StateTile label="Pipeline" value={summary.pipelineItems} sub={`${summary.newMatches} new`} />
        <StateTile label="Needs user" value={summary.needsUser} sub={`${summary.pendingApprovals} approvals`} tone={summary.needsUser ? "yellow" : "green"} />
        <StateTile label="Awaiting reply" value={summary.awaitingReply} sub="agent side" />
        <StateTile label="Open tasks" value={summary.openTasks} sub="renter queue" tone={summary.openTasks ? "yellow" : "green"} />
        <StateTile label="Tours" value={summary.tours} sub="active" />
        <StateTile label="Documents" value={summary.applicationReady} sub="approved" />
        <StateTile label="Provider gaps" value={needsConfig} sub="config" tone={needsConfig ? "yellow" : "green"} />
        <StateTile label="Workflows" value={data.workflowRuns.length} sub="running" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr_360px]">
        <div className="space-y-4">
          <TaskQueue tasks={data.tasks} />
          <Card>
            <CardHeader>
              <CardTitle>Approval queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-2">
              {data.approvals.slice(0, 4).map((approval) => (
                <div key={approval.id} className="rounded-md border border-zinc-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-zinc-950">{approval.title}</div>
                      <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">{approval.body}</div>
                    </div>
                    <Badge tone={approval.riskScore >= 75 ? "red" : "yellow"}>{approval.riskScore}</Badge>
                  </div>
                </div>
              ))}
              {!data.approvals.length ? <div className="rounded-md border border-zinc-200 p-3 text-sm text-zinc-500">No pending approvals.</div> : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <PipelineTable rows={data.pipeline} />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Agent workflow lane</CardTitle>
              <Badge tone="blue">approval gated</Badge>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-4">
              <WorkflowStep icon={Bot} label="Find" value={`${summary.pipelineItems} ranked`} />
              <WorkflowStep icon={Inbox} label="Contact" value={`${summary.awaitingReply} waiting`} />
              <WorkflowStep icon={CalendarDays} label="Tour" value={`${summary.tours} active`} />
              <WorkflowStep icon={FileText} label="Apply" value={`${summary.applicationReady} docs`} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <IntegrationHealth integrations={data.integrationConnections.slice(0, 6)} compact />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Source ingestion</CardTitle>
              <Link href="/integrations" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-950">
                Details
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2 p-2">
              {data.sourceIngestions.map((ingestion) => (
                <div key={ingestion.id} className="rounded-md border border-zinc-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-zinc-950">{ingestion.provider}</span>
                    <Badge tone={ingestion.status === "SUCCEEDED" ? "green" : "yellow"}>{ingestion.status.toLowerCase()}</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-zinc-500">
                    <span>{ingestion.rowsSeen} seen</span>
                    <span>{ingestion.rowsImported} imported</span>
                    <span>{ingestion.rowsRejected} rejected</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function StateTile({ label, value, sub, tone = "neutral" }: { label: string; value: number; sub: string; tone?: "neutral" | "green" | "yellow" }) {
  const toneClass = tone === "green" ? "border-emerald-200 bg-emerald-50" : tone === "yellow" ? "border-amber-200 bg-amber-50" : "border-zinc-200 bg-white";
  return (
    <div className={`rounded-md border ${toneClass} p-3`}>
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold leading-none text-zinc-950">{value}</div>
      <div className="mt-1 text-[11px] text-zinc-500">{sub}</div>
    </div>
  );
}

function WorkflowStep({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 p-3">
      <Icon className="h-4 w-4 text-zinc-500" aria-hidden />
      <div className="mt-3 text-xs font-medium uppercase text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-950">{value}</div>
    </div>
  );
}
