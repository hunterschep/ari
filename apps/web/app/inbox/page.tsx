import Link from "next/link";
import { Inbox, Reply } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@ari/ui";
import { AppShell } from "../../components/app-shell";
import { ApiActionButton } from "../../components/page-tools";
import { getInboxData } from "../../lib/api";

export default async function InboxPage() {
  const conversations = await getInboxData();

  return (
    <AppShell active="inbox">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-sm text-zinc-500">Listing conversations, replies needing attention, follow-ups, and parsed inbound state.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Inbox className="h-4 w-4" aria-hidden />
            <CardTitle>Threads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {conversations.map((conversation) => (
              <Link key={conversation.id} href={`/listings/${conversation.listingId}`} className="block rounded-md border border-zinc-200 p-3 hover:bg-zinc-50">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{conversation.listing?.title ?? conversation.listingId}</span>
                  <Badge tone={conversation.status === "NEEDS_USER" ? "yellow" : "neutral"}>{conversation.status}</Badge>
                </div>
                <div className="mt-1 text-sm text-zinc-500">{conversation.messages?.at(-1)?.body}</div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Reply className="h-4 w-4" aria-hidden />
            <CardTitle>Selected thread</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conversations[0]?.messages?.map((message) => (
              <div key={message.id} className={message.direction === "OUTBOUND" ? "ml-auto max-w-2xl rounded-md border border-zinc-200 bg-white p-3" : "max-w-2xl rounded-md border border-amber-200 bg-amber-50 p-3"}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-zinc-500">
                  <span>{message.direction}</span>
                  {message.intent ? <Badge tone="yellow">{message.intent}</Badge> : null}
                </div>
                <div className="whitespace-pre-line text-sm text-zinc-800">{message.body}</div>
              </div>
            ))}
            {conversations[0] ? (
              <div className="flex justify-end">
                <ApiActionButton path={`/v1/conversations/${conversations[0].id}/reply-draft`} label="Draft reply" doneLabel="Reply drafted" />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
