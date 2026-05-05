import { Activity, DatabaseZap, PlugZap, Webhook } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, Table, Td, Th } from "@ari/ui";
import { AppShell } from "../../components/app-shell";
import { IntegrationHealth } from "../../components/integration-health";
import { getIntegrationsData } from "../../lib/api";

export default async function IntegrationsPage() {
  const data = await getIntegrationsData();
  const connected = data.connections.filter((connection) => connection.status === "CONNECTED" || connection.status === "SANDBOX").length;

  return (
    <AppShell active="/integrations">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Integrations</h1>
            <Badge tone={connected === data.connections.length ? "green" : "yellow"}>{connected}/{data.connections.length} connected</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">Production adapters, sandbox fallbacks, ingestion runs, and webhook events.</p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Metric icon={PlugZap} label="Providers" value={data.connections.length} />
        <Metric icon={DatabaseZap} label="Ingestions" value={data.sourceIngestions.length} />
        <Metric icon={Webhook} label="Webhooks" value={data.webhookEvents.length} />
        <Metric icon={Activity} label="Provider events" value={data.providerEvents.length} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_460px]">
        <IntegrationHealth integrations={data.connections} />
        <Card>
          <CardHeader>
            <CardTitle>Source ingestion</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <thead>
                <tr>
                  <Th>Provider</Th>
                  <Th>Status</Th>
                  <Th>Rows</Th>
                  <Th>Mode</Th>
                </tr>
              </thead>
              <tbody>
                {data.sourceIngestions.map((ingestion) => (
                  <tr key={ingestion.id}>
                    <Td>{ingestion.provider}</Td>
                    <Td><Badge tone={ingestion.status === "SUCCEEDED" ? "green" : "yellow"}>{ingestion.status.toLowerCase()}</Badge></Td>
                    <Td>{ingestion.rowsImported}/{ingestion.rowsSeen}</Td>
                    <Td>{ingestion.mode.toLowerCase()}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <Icon className="h-4 w-4 text-zinc-500" aria-hidden />
      <div className="mt-3 text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold leading-none text-zinc-950">{value}</div>
    </div>
  );
}
