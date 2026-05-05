import { KeyRound, Mail, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@ari/ui";
import { AppShell } from "../../components/app-shell";
import { IntegrationHealth } from "../../components/integration-health";
import { getAccountData } from "../../lib/api";

export default async function AccountPage() {
  const data = await getAccountData();
  const settings = data.accountSettings;

  return (
    <AppShell active="/account">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Account</h1>
            <Badge tone={settings.authProvider === "CLERK" ? "green" : "yellow"}>{settings.authProvider.replaceAll("_", " ").toLowerCase()}</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">Identity, notification, security, consent, and data controls for production signup.</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile and identity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <AccountField icon={UserRound} label="Legal name" value={settings.legalName ?? "Not set"} />
              <AccountField icon={Mail} label="Email" value={settings.email} />
              <AccountField icon={Smartphone} label="Phone" value={settings.phone ?? "Not set"} />
              <AccountField icon={KeyRound} label="Clerk user" value={settings.clerkUserId ?? "Configure Clerk keys"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <PolicyCell label="MFA" value={settings.security.mfaEnabled ? "Enabled" : "Not enabled"} tone={settings.security.mfaEnabled ? "green" : "yellow"} />
              <PolicyCell label="Sessions" value={String(settings.security.sessions)} />
              <PolicyCell label="Timezone" value={settings.timezone} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data controls</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <PolicyCell label="Model training" value={settings.dataControls.allowTraining ? "Allowed" : "Disabled"} tone="green" />
              <PolicyCell label="Document retention" value={settings.dataControls.retainApplicationDocs ? "Enabled" : "Disabled"} />
              <PolicyCell label="Financial redaction" value={settings.dataControls.redactFinancialsByDefault ? "Default on" : "Manual"} tone="green" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consents</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {data.consents.map((consent) => (
                <div key={consent.id} className="rounded-md border border-zinc-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-zinc-950">{consent.type.replaceAll("_", " ").toLowerCase()}</span>
                    <Badge tone={consent.status === "GRANTED" ? "green" : "red"}>{consent.status.toLowerCase()}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">{consent.scope.toLowerCase()} · granted {new Date(consent.grantedAt).toLocaleDateString("en-US")}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              <CardTitle>Signup readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-2">
              <ReadinessRow label="Clerk provider" ok={settings.authProvider === "CLERK"} detail={settings.authProvider === "CLERK" ? "Production auth selected" : "Using local fallback"} />
              <ReadinessRow label="MFA policy" ok={settings.security.mfaEnabled} detail={settings.security.mfaEnabled ? "MFA available" : "Enable in Clerk"} />
              <ReadinessRow label="Data defaults" ok={settings.dataControls.redactFinancialsByDefault} detail="Sensitive facts redact by default" />
            </CardContent>
          </Card>
          <IntegrationHealth integrations={data.integrationConnections.filter((item) => item.provider === "CLERK" || item.provider === "GOOGLE_CALENDAR" || item.provider === "S3")} compact />
        </div>
      </div>
    </AppShell>
  );
}

function AccountField({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 p-3">
      <Icon className="h-4 w-4 text-zinc-500" aria-hidden />
      <div className="mt-3 text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-zinc-950">{value}</div>
    </div>
  );
}

function PolicyCell({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "green" | "yellow" }) {
  const toneClass = tone === "green" ? "border-emerald-200 bg-emerald-50" : tone === "yellow" ? "border-amber-200 bg-amber-50" : "border-zinc-200 bg-white";
  return (
    <div className={`rounded-md border ${toneClass} p-3`}>
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-950">{value}</div>
    </div>
  );
}

function ReadinessRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3">
      <div>
        <div className="text-sm font-medium text-zinc-950">{label}</div>
        <div className="mt-1 text-xs text-zinc-500">{detail}</div>
      </div>
      <Badge tone={ok ? "green" : "yellow"}>{ok ? "ready" : "todo"}</Badge>
    </div>
  );
}
