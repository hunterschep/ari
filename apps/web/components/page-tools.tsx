"use client";

import { useState } from "react";
import { Check, RefreshCw, Send } from "lucide-react";
import { Button } from "@ari/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function ApiActionButton({
  path,
  label,
  doneLabel,
  icon = "check"
}: {
  path: string;
  label: string;
  doneLabel?: string;
  icon?: "check" | "send" | "refresh";
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const Icon = icon === "send" ? Send : icon === "refresh" ? RefreshCw : Check;

  return (
    <Button
      type="button"
      variant={state === "done" ? "secondary" : "default"}
      disabled={state === "loading"}
      onClick={async () => {
        setState("loading");
        try {
          const response = await fetch(`${API_URL}${path}`, { method: "POST" });
          setState(response.ok ? "done" : "error");
        } catch {
          setState("error");
        }
      }}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {state === "done" ? doneLabel ?? "Done" : state === "error" ? "Retry" : label}
    </Button>
  );
}
