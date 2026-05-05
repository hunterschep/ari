import { Activity, Database, Flag, RotateCcw, Wrench } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, Table, Td, Th } from "@ari/ui";
import { AppShell } from "../../components/app-shell";
import { getAdminData } from "../../lib/api";

export default async function AdminPage() {
  const data = await getAdminData();

  return (
    <AppShell active="admin">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-zinc-500">Ops dashboard, agent runs, tool calls, listing review, conversations, compliance flags, integrations, and workflow retries.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetric icon={Database} label="Listings" value={data.listings.length} />
        <AdminMetric icon={Activity} label="Agent runs" value={data.agentRuns.length} />
        <AdminMetric icon={Wrench} label="Tool calls" value={data.toolCalls.length} />
        <AdminMetric icon={Flag} label="Flags" value={data.complianceFlags.length} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Listing review</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden />
              <CardTitle>Workflows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.workflows.map((workflow) => (
                <div key={workflow.id} className="rounded-md border border-zinc-200 p-3 text-sm">
                  <div className="font-medium">{workflow.workflowType ?? workflow.id}</div>
                  <Badge>{workflow.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Audit log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.auditLogs.length ? data.auditLogs.slice(0, 5).map((log) => <div key={log.id}>{log.action}</div>) : <div className="text-zinc-500">No audit events in fallback data.</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function AdminMetric({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-sm text-zinc-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-zinc-500" aria-hidden />
      </CardContent>
    </Card>
  );
}
