import { Activity, Database, Flag, GitBranch, ListTodo, PlugZap, RotateCcw, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, Table, Td, Th } from "@ari/ui";
import { AppShell } from "../../components/app-shell";
import { PipelineTable } from "../../components/pipeline-table";
import { getAdminData } from "../../lib/api";

export default async function AdminPage() {
  const data = await getAdminData();
  const ops = data.ops;

  return (
    <AppShell active="admin">
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">Admin</h1>
          <Badge tone={ops.totals.openFlags ? "red" : "green"}>{ops.totals.openFlags} open flags</Badge>
        </div>
        <p className="mt-1 text-sm text-zinc-500">Ops control plane for users, listing sources, workflow runs, provider health, approvals, and compliance.</p>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <AdminMetric icon={Database} label="Listings" value={ops.totals.listings} />
        <AdminMetric icon={GitBranch} label="Pipeline" value={ops.totals.pipeline} />
        <AdminMetric icon={ListTodo} label="Open tasks" value={ops.totals.openTasks} tone={ops.totals.openTasks ? "yellow" : "green"} />
        <AdminMetric icon={Activity} label="Agent runs" value={data.agentRuns.length} />
        <AdminMetric icon={Wrench} label="Tool calls" value={data.toolCalls.length} />
        <AdminMetric icon={PlugZap} label="Providers" value={ops.integrations.length} />
        <AdminMetric icon={RotateCcw} label="Workflows" value={ops.workflows.length} />
        <AdminMetric icon={Flag} label="Flags" value={ops.totals.openFlags} tone={ops.totals.openFlags ? "yellow" : "green"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <PipelineTable rows={ops.pipeline} title="Pipeline supervision" />
          <Card>
            <CardHeader>
              <CardTitle>Listing review</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <thead>
                  <tr>
                    <Th>Listing</Th>
                    <Th>Source</Th>
                    <Th>Confidence</Th>
                    <Th>Dedupe</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.listings.map((listing) => (
                    <tr key={listing.id}>
                      <Td>{listing.title ?? listing.address.raw}</Td>
                      <Td>{listing.source}</Td>
                      <Td>{listing.confidence}</Td>
                      <Td>{listing.dedupeState}</Td>
                      <Td><Badge>{listing.status}</Badge></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden />
              <CardTitle>Workflows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-2">
              {ops.workflows.map((workflow) => (
                <div key={workflow.id} className="rounded-md border border-zinc-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-zinc-950">{workflow.workflowType ?? workflow.id}</span>
                    <Badge>{workflow.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Provider gaps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-2">
              {ops.integrations
                .filter((integration) => integration.status !== "CONNECTED")
                .slice(0, 8)
                .map((integration) => (
                  <div key={integration.id} className="rounded-md border border-zinc-200 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-zinc-950">{integration.provider}</span>
                      <Badge tone="yellow">{integration.status.replaceAll("_", " ").toLowerCase()}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">{integration.configRequired.join(", ") || integration.mode}</div>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.auditLogs.length ? data.auditLogs.slice(0, 6).map((log) => <div key={log.id}>{log.action}</div>) : <div className="text-zinc-500">No audit events in fallback data.</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function AdminMetric({ icon: Icon, label, value, tone = "neutral" }: { icon: LucideIcon; label: string; value: number; tone?: "neutral" | "green" | "yellow" }) {
  const toneClass = tone === "green" ? "border-emerald-200 bg-emerald-50" : tone === "yellow" ? "border-amber-200 bg-amber-50" : "border-zinc-200 bg-white";
  return (
    <div className={`rounded-md border ${toneClass} p-3`}>
      <Icon className="h-4 w-4 text-zinc-500" aria-hidden />
      <div className="mt-3 text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold leading-none text-zinc-950">{value}</div>
    </div>
  );
}
