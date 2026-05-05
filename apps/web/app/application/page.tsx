import { FileText, LockKeyhole, Upload } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@ari/ui";
import { AppShell } from "../../components/app-shell";
import { ApiActionButton } from "../../components/page-tools";
import { getApplicationData } from "../../lib/api";

export default async function ApplicationPage() {
  const data = await getApplicationData();

  return (
    <AppShell active="application">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Application</h1>
        <p className="text-sm text-zinc-500">Renter profile, document vault, generated packet, missing information checklist, and secure share state.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <FileText className="h-4 w-4" aria-hidden />
            <CardTitle>Document vault</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between rounded-md border border-zinc-200 p-3">
                <div>
                  <div className="font-medium">{document.fileName}</div>
                  <div className="text-sm text-zinc-500">{document.type} · {(document.sizeBytes / 1000).toFixed(0)} KB</div>
                </div>
                <Badge tone={document.containsSensitiveData ? "yellow" : "neutral"}>{document.status}</Badge>
              </div>
            ))}
            <div className="grid gap-3 rounded-md border border-dashed border-zinc-300 p-3 md:grid-cols-[1fr_auto]">
              <div>
                <Label htmlFor="document">New document</Label>
                <Input id="document" type="file" />
              </div>
              <Button type="button" variant="secondary" className="self-end">
                <Upload className="h-4 w-4" aria-hidden />
                Upload
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <LockKeyhole className="h-4 w-4" aria-hidden />
            <CardTitle>Application packet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge tone={data.packet.status === "READY_FOR_REVIEW" ? "yellow" : "neutral"}>{data.packet.status}</Badge>
            <div className="whitespace-pre-line rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">{data.packet.renterSummary}</div>
            <div className="space-y-2">
              {data.packet.checklist?.requiredItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm">
                  <span>{item.label}</span>
                  <Badge tone={item.status === "AVAILABLE" ? "green" : "yellow"}>{item.status}</Badge>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <ApiActionButton path={`/v1/application-packets/${data.packet.id}/approve`} label="Approve" doneLabel="Approved" />
              <ApiActionButton path={`/v1/application-packets/${data.packet.id}/send`} label="Send packet" doneLabel="Sent" icon="send" />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
