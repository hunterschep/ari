import Link from "next/link";
import type { ReactNode } from "react";
import { Bot, CalendarDays, FileText, Home, Inbox, ListChecks, Map, Plug, Search, Settings, ShieldCheck, UserCog } from "lucide-react";
import { cn } from "@ari/ui";

const nav = [
  { href: "/dashboard", label: "Workspace", icon: Home },
  { href: "/search/search-demo", label: "Map Search", icon: Map },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/tours", label: "Tours", icon: CalendarDays },
  { href: "/application", label: "Application", icon: FileText },
  { href: "/onboarding", label: "Onboarding", icon: ListChecks },
  { href: "/account", label: "Account", icon: UserCog },
  { href: "/settings/automation", label: "Automation", icon: Settings },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/admin", label: "Admin", icon: ShieldCheck }
];

export function AppShell({ children, active }: { children: ReactNode; active?: string }) {
  return (
    <div className="min-h-screen bg-[#f6f7f8] text-zinc-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-200 bg-white md:block">
        <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-950 text-white">
              <Bot className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <div className="text-sm font-semibold leading-4">Ari</div>
              <div className="text-[11px] leading-4 text-zinc-500">NYC renter ops</div>
            </div>
          </div>
          <span className="rounded-md border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">v1</span>
        </div>
        <nav className="space-y-0.5 p-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const selected = active === item.href || active === item.label.toLowerCase() || (active === "dashboard" && item.href === "/dashboard");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-zinc-700 hover:bg-zinc-100",
                  selected && "bg-zinc-950 text-white hover:bg-zinc-950"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-zinc-200 p-3 text-xs text-zinc-500">
          <div className="flex items-center justify-between">
            <span>Mode</span>
            <span className="font-medium text-zinc-700">approval-first</span>
          </div>
        </div>
      </aside>
      <div className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-zinc-200 bg-white px-3 md:hidden">
        <Bot className="h-4 w-4" aria-hidden />
        <span className="text-sm font-semibold">Ari</span>
        <div className="ml-auto flex gap-1 overflow-x-auto">
          {nav.slice(0, 5).map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <main className="md:pl-64">
        <div className="mx-auto max-w-[1540px] px-3 py-4 sm:px-4 lg:px-5">{children}</div>
      </main>
    </div>
  );
}
