import Link from "next/link";
import { ArrowUpRight, Clock3, MessageSquareText } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, Table, Td, Th } from "@ari/ui";
import type { InquiryPipelineRow, ListingPipelineStatus } from "@ari/schemas";

const statusTone: Record<ListingPipelineStatus, "neutral" | "green" | "yellow" | "red" | "blue"> = {
  NEW_MATCH: "blue",
  DRAFTED: "blue",
  APPROVAL_PENDING: "yellow",
  CONTACTED: "blue",
  AWAITING_REPLY: "neutral",
  REPLIED: "green",
  TOUR_PROPOSED: "yellow",
  TOUR_CONFIRMED: "green",
  APPLICATION_REQUESTED: "yellow",
  APPLIED: "green",
  SKIPPED: "red",
  STALE: "red",
  PAUSED: "neutral"
};

export function PipelineTable({ rows, title = "Inquiry pipeline" }: { rows: InquiryPipelineRow[]; title?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Link href="/search/search-demo" className="inline-flex h-7 items-center gap-1 rounded-md border border-zinc-300 px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
          Open map
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <thead>
            <tr>
              <Th>Listing</Th>
              <Th>Status</Th>
              <Th>Owner</Th>
              <Th>Next action</Th>
              <Th>Follow-up</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ pipeline, listing, score, conversationId, lastMessageAt }) => (
              <tr key={pipeline.id} className="hover:bg-zinc-50">
                <Td>
                  <Link href={`/listings/${listing.id}`} className="flex min-w-[260px] items-center gap-3">
                    <img src={listing.media.photos[0] ?? "/images/listing-living.svg"} alt="" className="h-12 w-16 rounded-md border border-zinc-200 object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-zinc-950">{listing.title ?? listing.address.raw}</span>
                      <span className="block truncate text-xs text-zinc-500">
                        ${listing.price.toLocaleString()} · {listing.address.city} · {score?.totalScore ?? pipeline.score}/100
                      </span>
                    </span>
                  </Link>
                </Td>
                <Td>
                  <Badge tone={statusTone[pipeline.status]}>{pipeline.status.replaceAll("_", " ").toLowerCase()}</Badge>
                  {pipeline.riskFlags.length ? <div className="mt-1 text-[11px] text-red-700">{pipeline.riskFlags.length} risk flag</div> : null}
                </Td>
                <Td>
                  <div className="text-sm font-medium text-zinc-800">{pipeline.owner}</div>
                  <div className="text-[11px] text-zinc-500">{pipeline.priority.toLowerCase()} priority</div>
                </Td>
                <Td>
                  <div className="max-w-sm text-sm text-zinc-700">{pipeline.nextAction}</div>
                  {conversationId ? (
                    <Link href="/inbox" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-950">
                      <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
                      Conversation
                    </Link>
                  ) : null}
                </Td>
                <Td>
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden />
                    {pipeline.nextFollowUpAt
                      ? new Date(pipeline.nextFollowUpAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : lastMessageAt
                        ? "recent reply"
                        : "not set"}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}
