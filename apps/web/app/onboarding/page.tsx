import { CalendarDays, Home, MessageSquare, ShieldCheck, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@ari/ui";
import { AppShell } from "../../components/app-shell";
import { demoProfile } from "../../lib/mock";

export default function OnboardingPage() {
  return (
    <AppShell active="onboarding">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Onboarding</h1>
        <p className="text-sm text-zinc-500">Saveable renter profile, search criteria, availability, application readiness, and automation policy.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <OnboardingCard title="User profile" icon={UserRound}>
          <Field label="Legal name" value={demoProfile.legalName} />
          <Field label="Email" value={demoProfile.email} />
          <Field label="Phone" value={demoProfile.phone} />
          <Field label="Employment" value={demoProfile.employment?.employer} />
        </OnboardingCard>
        <OnboardingCard title="Search criteria" icon={Home}>
          <Field label="Target city" value={demoProfile.targetCity} />
          <Field label="Move-in date" value={demoProfile.moveInDate} />
          <Field label="Budget max" value={String(demoProfile.budgetMax)} />
          <Field label="Neighborhoods" value={demoProfile.neighborhoods.join(", ")} />
        </OnboardingCard>
        <OnboardingCard title="Availability" icon={CalendarDays}>
          <Field label="Tue" value="6:00 PM - 8:30 PM" />
          <Field label="Thu" value="6:00 PM - 8:30 PM" />
          <Field label="Sat" value="9:30 AM - 12:00 PM" />
          <Field label="Timezone" value="America/New_York" />
        </OnboardingCard>
        <OnboardingCard title="Application readiness" icon={ShieldCheck}>
          <Field label="Occupants" value={demoProfile.occupants.map((item) => item.name).join(", ")} />
          <Field label="Pets" value={demoProfile.pets.map((pet) => `${pet.name ?? "Pet"} (${pet.type})`).join(", ")} />
          <Field label="Income" value={demoProfile.income?.annualIncome ? `$${demoProfile.income.annualIncome.toLocaleString()}` : ""} />
          <Field label="Readiness" value={demoProfile.applicationReadiness} />
        </OnboardingCard>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2">
            <MessageSquare className="h-4 w-4" aria-hidden />
            <CardTitle>Communication and deal-breakers</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="tone">Preferred tone</Label>
              <Input id="tone" defaultValue={demoProfile.messageTone} />
            </div>
            <div>
              <Label htmlFor="dealbreakers">Deal-breakers</Label>
              <Textarea id="dealbreakers" defaultValue={demoProfile.dealBreakers.join("\n")} />
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button">Save onboarding</Button>
      </div>
    </AppShell>
  );
}

function OnboardingCard({ title, icon: Icon, children }: { title: string; icon: typeof UserRound; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Icon className="h-4 w-4" aria-hidden />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input defaultValue={value ?? ""} />
    </div>
  );
}
