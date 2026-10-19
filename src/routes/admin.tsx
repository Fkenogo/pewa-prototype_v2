import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Activity, BookOpen, ClipboardList, LayoutGrid, MoreHorizontal, ShieldAlert } from "lucide-react";
import { ROLE_LABELS, isBusinessRole, usePewa } from "@/lib/pewa/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Business workspace — PEWA" },
      { name: "description", content: "Manage your menus, items and availability from your phone." },
      { property: "og:title", content: "Business workspace — PEWA" },
      { property: "og:description", content: "Manage menus, items and availability from your phone." },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { label: "Overview", icon: LayoutGrid, to: "/admin", ready: true },
  { label: "Menus", icon: BookOpen, to: "/admin", ready: true },
  { label: "Orders", icon: ClipboardList, ready: false },
  { label: "Activity", icon: Activity, ready: false },
  { label: "More", icon: MoreHorizontal, ready: false },
];

function AdminLayout() {
  const { role, organisation } = usePewa();

  if (!isBusinessRole(role)) {
    return (
      <Centered>
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl">Business workspace only</h1>
        <p className="text-muted-foreground">
          You're acting as <b>{ROLE_LABELS[role]}</b>. {role === "operator" ? "Operators can't edit a business's menus or prices." : "Customers don't need an account to browse."}
        </p>
        <p className="text-sm text-muted-foreground">Switch role from the panel in the top-right.</p>
      </Centered>
    );
  }
  if (!organisation) {
    return (
      <Centered>
        <h1 className="text-2xl">No business yet</h1>
        <p className="text-muted-foreground">Set up your business to start building a menu.</p>
        <Button asChild size="lg" className="h-12">
          <Link to="/onboarding">Start setup</Link>
        </Button>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar p-4 md:block">
        <p className="font-display text-2xl font-bold text-primary">pewa</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{organisation.name}</p>
        <nav className="mt-6 space-y-1">
          {NAV.map((n) => (
            <NavItem key={n.label} {...n} desktop />
          ))}
        </nav>
      </aside>
      <div className="flex-1 pb-24 md:pb-8">
        <Outlet />
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card pb-safe pt-1 md:hidden">
        {NAV.map((n) => (
          <NavItem key={n.label} {...n} />
        ))}
      </nav>
    </div>
  );
}

function NavItem({ label, icon: Icon, to, ready, desktop }: { label: string; icon: typeof LayoutGrid; to?: string; ready: boolean; desktop?: boolean }) {
  const cls = desktop
    ? "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium"
    : "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium";
  if (!ready || !to)
    return (
      <span className={`${cls} text-muted-foreground/50`} title="Coming in a later slice">
        <Icon className="h-5 w-5" />
        {label}
      </span>
    );
  return (
    <Link to="/admin" className={`${cls} text-primary`}>
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">{children}</main>;
}
