import { CalendarDays, CheckCircle2 } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@ari/ui";
import { AppShell } from "../../components/app-shell";
import { ApiActionButton } from "../../components/page-tools";
import { getToursData } from "../../lib/api";

export default async function ToursPage() {
  const tours = await getToursData();

  return (
    <AppShell active="tours">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Tours</h1>
        <p className="text-sm text-zinc-500">Proposed slots, user approvals, calendar creation, reminders, and reschedule/cancel state.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <CalendarDays className="h-4 w-4" aria-hidden />
            <CardTitle>Tour queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tours.map((tour) => (
              <div key={tour.id} className="rounded-md border border-zinc-200 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-medium">{tour.location ?? tour.listingId}</div>
                  <Badge tone={tour.status === "CONFIRMED" ? "green" : "yellow"}>{tour.status}</Badge>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {tour.proposedSlots.map((slot, index) => (
                    <div key={slot.startDateTime} className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
                      <div>{new Date(slot.startDateTime).toLocaleString()}</div>
                      <div className="text-xs text-zinc-500">{slot.sourceText}</div>
                      <div className="mt-2 flex gap-2">
                        <ApiActionButton path={`/v1/tours/${tour.id}/select-slot`} label={`Select ${index + 1}`} doneLabel="Selected" />
                        <ApiActionButton path={`/v1/tours/${tour.id}/confirm`} label="Confirm" doneLabel="Confirmed" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Google Calendar write consent granted.
            </div>
            <div className="rounded-md border border-zinc-200 p-3">Timed events use explicit start and end dateTime values.</div>
            <div className="rounded-md border border-zinc-200 p-3">Landlord confirmation is sent only after user approval unless auto-book is explicitly enabled.</div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
