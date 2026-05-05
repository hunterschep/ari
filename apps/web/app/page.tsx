import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Label } from "@ari/ui";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-8 md:grid-cols-[1fr_420px]">
        <section>
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-950 text-sm font-semibold text-white">A</div>
            <span className="text-sm font-semibold">Ari</span>
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-normal text-zinc-950 md:text-5xl">
            Apartment hunting without handing the workflow to a broker.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600">
            Ari finds units, ranks tradeoffs, drafts outreach, tracks replies, schedules tours, prepares packets, and flags fee risk from one renter-owned workspace.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Ranked listings", "Approval-gated outreach", "Tour scheduling", "Application packets"].map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
          <div className="mt-8 flex gap-3">
            <Button>
              <Link href="/dashboard" className="inline-flex items-center gap-2">
                Open demo <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button variant="secondary">
              <Link href="/onboarding">Start onboarding</Link>
            </Button>
          </div>
        </section>

        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-3 border-b border-zinc-200 pb-4">
              <img src="/images/listing-kitchen.svg" alt="" className="h-20 w-28 rounded-md border border-zinc-200 object-cover" />
              <div>
                <div className="font-medium">1 bed near McCarren Park</div>
                <div className="text-sm text-zinc-500">$3,650 · 91/100 fit</div>
              </div>
            </div>
            <div className="space-y-3">
              {["Direct leasing email found", "No broker fee detected", "Saturday tour slot available", "Packet ready after ID upload"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-zinc-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                  {item}
                </div>
              ))}
            </div>
            <form className="mt-6 space-y-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" />
              </div>
              <Button className="w-full" type="button">
                Join waitlist
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
