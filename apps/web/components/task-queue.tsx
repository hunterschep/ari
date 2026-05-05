import { AlertCircle, CalendarClock, CheckCircle2, FileText, MessageSquareText, Plug, ShieldAlert } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@ari/ui";
import type { ListingTask } from "@ari/schemas";

const taskIcons = {
  APPROVE_OUTREACH: MessageSquareText,
  REPLY_TO_LANDLORD: MessageSquareText,
  SELECT_TOUR_SLOT: CalendarClock,
  UPLOAD_DOCUMENT: FileText,
  APPROVE_PACKET: FileText,
  REVIEW_RISK: ShieldAlert,
  FOLLOW_UP: CalendarClock,
  CONNECT_INTEGRATION: Plug,
  PROFILE_GAP: AlertCircle
};

export function TaskQueue({ tasks }: { tasks: ListingTask[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Task queue</CardTitle>
        <Badge tone={tasks.length ? "yellow" : "green"}>{tasks.length} open</Badge>
      </CardHeader>
      <CardContent className="space-y-2 p-2">
        {tasks.map((task) => {
          const Icon = taskIcons[task.type] ?? AlertCircle;
          return (
            <div key={task.id} className="rounded-md border border-zinc-200 bg-white p-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-medium text-zinc-950">{task.title}</div>
                    <Badge tone={task.priority === "URGENT" ? "red" : task.priority === "HIGH" ? "yellow" : "neutral"}>{task.priority.toLowerCase()}</Badge>
                  </div>
                  {task.body ? <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">{task.body}</div> : null}
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
                    <span>{task.type.replaceAll("_", " ").toLowerCase()}</span>
                    {task.dueAt ? <span>Due {new Date(task.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span> : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!tasks.length ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            No active renter tasks.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
