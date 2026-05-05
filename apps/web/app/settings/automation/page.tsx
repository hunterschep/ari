import { ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@ari/ui";
import { AppShell } from "../../../components/app-shell";
import { demoSession } from "../../../lib/mock";

export default function AutomationSettingsPage() {
  const policy = demoSession.automationPolicy;

  return (
    <AppShell active="automation">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Automation</h1>
        <p className="text-sm text-zinc-500">Consent, auto-send limits, approval requirements, and calendar/email connection state.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            <CardTitle>Policy</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {Object.entries(policy)
              .filter(([key]) => key !== "requireApprovalFor")
              .map(([key, value]) => (
                <div key={key} className="rounded-md border border-zinc-200 p-3">
                  <div className="text-sm font-medium">{key}</div>
                  <div className="mt-2">
                    {typeof value === "boolean" ? <Badge tone={value ? "green" : "neutral"}>{String(value)}</Badge> : <Input defaultValue={String(value)} />}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            <CardTitle>Approval requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(policy.requireApprovalFor).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm">
                <span>{key}</span>
                <input type="checkbox" defaultChecked={value} className="h-4 w-4" />
              </label>
            ))}
            <div>
              <Label>Email connection</Label>
              <div className="mt-1 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">Transactional email configured in mock mode.</div>
            </div>
            <div>
              <Label>Calendar connection</Label>
              <div className="mt-1 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">Google Calendar consent granted.</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
