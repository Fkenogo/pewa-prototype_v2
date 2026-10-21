import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Activity,
  BookOpen,
  ClipboardList,
  CreditCard,
  LayoutGrid,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  ROLE_LABELS,
  isBusinessRole,
  canAuthorMenus,
  canManageOrders,
  canManagePromotions,
  canManageBilling,
  canViewActivity,
  usePewa,
} from "@/lib/pewa/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Business workspace — PEWA" },
      {
        name: "description",
        content: "Manage your menus, items and availability from your phone.",
      },
      { property: "og:title", content: "Business workspace — PEWA" },
      {
        property: "og:description",
        content: "Manage menus, items and availability from your phone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { role, organisation, venues } = usePewa();
  const orgVenues = venues.filter((v) => v.orgId === organisation?.id);
  const primaryVenue = orgVenues[0];

  const navItems = useMemo(() => {
    if (role === "staff") {
      return [
        { label: "Orders", icon: ClipboardList, to: "/admin/orders", ready: true },
        { label: "Overview", icon: LayoutGrid, to: "/admin", ready: true },
        { label: "Activity", icon: Activity, to: "/admin/activity", ready: true },
      ];
    }
    const items = [
      { label: "Overview", icon: LayoutGrid, to: "/admin", ready: true },
      { label: "Menus", icon: BookOpen, to: "/admin", ready: canAuthorMenus(role) },
      { label: "Orders", icon: ClipboardList, to: "/admin/orders", ready: canManageOrders(role) },
    ];
    if (canManagePromotions(role)) {
      items.push({ label: "Promos", icon: Sparkles, to: "/admin/promotions", ready: true });
    }
    if (canViewActivity(role)) {
      items.push({ label: "Activity", icon: Activity, to: "/admin/activity", ready: true });
    }
    if (canManageBilling(role)) {
      items.push({ label: "Billing", icon: CreditCard, to: "/admin/billing", ready: true });
    }
    return items;
  }, [role]);

  if (!isBusinessRole(role)) {
    return (
      <Centered>
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl">Business workspace only</h1>
        <p className="text-muted-foreground">
          You're acting as <b>{ROLE_LABELS[role]}</b>.{" "}
          {role === "operator"
            ? "Operators can't edit a business's menus or prices."
            : "Customers don't need an account to browse."}
        </p>
        <p className="text-sm text-muted-foreground">
          Switch role from the panel in the top-right.
        </p>
        {role === "operator" && (
          <Button asChild className="mt-3 h-10" size="sm">
            <Link to="/operator">Open PEWA Operator Console</Link>
          </Button>
        )}
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
        <p className="mt-1 truncate text-sm font-semibold text-foreground">{organisation.name}</p>
        <div className="mt-2 rounded-lg border bg-card/60 p-2 text-xs space-y-0.5">
          <p className="font-medium text-foreground">{ROLE_LABELS[role]}</p>
          {primaryVenue && (
            <p className="text-[11px] text-muted-foreground truncate">
              Station: {primaryVenue.name}
            </p>
          )}
        </div>
        <nav className="mt-5 space-y-1">
          {navItems.map((n) => (
            <NavItem key={n.label} {...n} desktop />
          ))}
        </nav>
      </aside>
      <div className="flex-1 pb-24 md:pb-8">
        <Outlet />
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-safe pt-1 md:hidden"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))`,
        }}
      >
        {navItems.map((n) => (
          <NavItem key={n.label} {...n} />
        ))}
      </nav>
    </div>
  );
}

function NavItem({
  label,
  icon: Icon,
  to,
  ready,
  desktop,
}: {
  label: string;
  icon: typeof LayoutGrid;
  to?: string;
  ready: boolean;
  desktop?: boolean;
}) {
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
    <Link to={to} className={`${cls} text-primary`}>
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
      {children}
    </main>
  );
}
