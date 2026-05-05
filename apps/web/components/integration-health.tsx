import { CheckCircle2, PlugZap, TriangleAlert } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@ari/ui";
import type { IntegrationConnection } from "@ari/schemas";

export function IntegrationHealth({ integrations, compact = false }: { integrations: IntegrationConnection[]; compact?: boolean }) {
  const needsConfig = integrations.filter((item) => item.status === "NEEDS_CONFIG" || item.status === "DISCONNECTED");
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Integration health</CardTitle>
        <Badge tone={needsConfig.length ? "yellow" : "green"}>{needsConfig.length ? `${needsConfig.length} needs config` : "healthy"}</Badge>
      </CardHeader>
      <CardContent className={compact ? "space-y-2 p-2" : "grid gap-2 p-2 md:grid-cols-2"}>
        {integrations.map((integration) => {
          const healthy = integration.status === "CONNECTED" || integration.status === "SANDBOX";
          const Icon = healthy ? CheckCircle2 : TriangleAlert;
          return (
            <div key={integration.id} className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
                {healthy ? <Icon className="h-4 w-4 text-emerald-600" aria-hidden /> : <Icon className="h-4 w-4 text-amber-600" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-zinc-950">{integration.label}</div>
                <div className="truncate text-xs text-zinc-500">{integration.provider.replaceAll("_", " ").toLowerCase()} · {integration.mode.toLowerCase()}</div>
              </div>
              <Badge tone={healthy ? "green" : "yellow"}>{integration.status.replaceAll("_", " ").toLowerCase()}</Badge>
            </div>
          );
        })}
        {!integrations.length ? (
          <div className="flex items-center gap-2 rounded-md border border-zinc-200 p-3 text-sm text-zinc-600">
            <PlugZap className="h-4 w-4" aria-hidden />
            No providers registered.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
