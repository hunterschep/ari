import Link from "next/link";
import type { ReactNode } from "react";
import { Bot, CalendarDays, FileText, Home, Inbox, ListChecks, Search, Settings, ShieldCheck } from "lucide-react";
import { cn } from "@ari/ui";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/onboarding", label: "Onboarding", icon: ListChecks },
  { href: "/search/search-demo", label: "Search", icon: Search },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/tours", label: "Tours", icon: CalendarDays },
  { href: "/application", label: "Application", icon: FileText },
  { href: "/settings/automation", label: "Automation", icon: Settings },
  { href: "/admin", label: "Admin", icon: ShieldCheck }
];

export function AppShell({ children, active }: { children: ReactNode; active?: string }) {
  return (
    <div className="min-h-screen bg-paper text-zinc-950">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-line bg-white md:block">
        <div className="flex h-14 items-center gap-2 border-b border-line px-4">
          <Bot className="h-5 w-5" aria-hidden />
          <span className="text-sm font-semibold">Ari</span>
        </div>
        <nav className="p-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const selected = active === item.href || active === item.label.toLowerCase();
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-zinc-700 hover:bg-zinc-100",
                  selected && "bg-zinc-100 text-zinc-950"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="md:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
