import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Activity,
  BookOpen,
  ClipboardList,
  CreditCard,
  LayoutGrid,
  ShieldAlert,
  Sparkles,
  Users,
  QrCode,
} from "lucide-react";
import {
  ROLE_LABELS,
  isBusinessRole,
  canAuthorMenus,
  canManageOrders,
  canManagePromotions,
  canManageBilling,
  canManageTeam,
  canViewActivity,
  getActiveOrganisationMembership,
  getEffectiveBusinessRole,
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
  const { role, organisation, venues, personalIdentity, memberships } = usePewa();
  const orgVenues = venues.filter((v) => v.orgId === organisation?.id);
  const primaryVenue = orgVenues[0];
  const effectiveRole = getEffectiveBusinessRole({
    role,
    personalIdentity,
    organisation,
    memberships,
  });
  const activeMembership = getActiveOrganisationMembership({
    personalIdentity,
    organisation,
    memberships,
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = useMemo(() => {
    if (effectiveRole === "staff") {
      return [
        { label: "Orders", icon: ClipboardList, to: "/admin/orders", ready: true },
        { label: "Overview", icon: LayoutGrid, to: "/admin", ready: true },
        { label: "Activity", icon: Activity, to: "/admin/activity", ready: true },
      ];
    }
    const items = [
      { label: "Overview", icon: LayoutGrid, to: "/admin", ready: true },
      { label: "Menus", icon: BookOpen, to: "/admin", ready: canAuthorMenus(effectiveRole) },
      {
        label: "QR & Access",
        icon: QrCode,
        to: "/admin/access",
        ready: canAuthorMenus(effectiveRole),
      },
      {
        label: "Orders",
        icon: ClipboardList,
        to: "/admin/orders",
        ready: canManageOrders(effectiveRole),
      },
    ];
    if (canManageTeam(effectiveRole)) {
      items.push({ label: "Team", icon: Users, to: "/admin/team", ready: true });
    }
    if (canManagePromotions(effectiveRole)) {
      items.push({ label: "Promos", icon: Sparkles, to: "/admin/promotions", ready: true });
    }
    if (canViewActivity(effectiveRole)) {
      items.push({ label: "Activity", icon: Activity, to: "/admin/activity", ready: true });
    }
    if (canManageBilling(effectiveRole)) {
      items.push({ label: "Billing", icon: CreditCard, to: "/admin/billing", ready: true });
    }
    return items;
  }, [effectiveRole]);

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
  if (!isBusinessRole(effectiveRole)) {
    return (
      <Centered>
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl">Organisation membership required</h1>
        <p className="text-muted-foreground">
          Personal identity <b>{personalIdentity?.fullName || "Unverified User"}</b> does not hold
          an active membership in <b>{organisation.name}</b>. Switching a visual role selector alone
          does not grant organisation permissions.
        </p>
        <p className="text-sm text-muted-foreground">
          Register your own business or select an authorised membership in Scenario Control.
        </p>
        <Button asChild className="mt-3 h-10" size="sm">
          <Link to="/onboarding">Register a business</Link>
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
          {personalIdentity && (
            <p className="font-semibold text-foreground truncate">{personalIdentity.fullName}</p>
          )}
          <p className="font-medium text-primary">
            {ROLE_LABELS[activeMembership?.role || effectiveRole]}
          </p>
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
      <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b bg-card/95 pl-4 pr-44 backdrop-blur md:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold leading-tight text-primary">pewa</p>
          <p className="truncate text-xs text-muted-foreground">
            {organisation.name} · {ROLE_LABELS[activeMembership?.role || effectiveRole]}
          </p>
        </div>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 max-w-[85vw] overflow-y-auto p-4">
            <SheetHeader className="text-left">
              <SheetTitle className="font-display text-2xl text-primary">pewa</SheetTitle>
            </SheetHeader>
            <p className="mt-2 truncate text-sm font-semibold">{organisation.name}</p>
            {personalIdentity && (
              <p className="truncate text-xs text-muted-foreground">{personalIdentity.fullName}</p>
            )}
            <nav className="mt-4 space-y-1" onClick={() => setMenuOpen(false)}>
              {navItems.map((n) => (
                <NavItem key={n.label} {...n} desktop />
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </header>
      <div className="min-w-0 flex-1 overflow-x-hidden pb-8">
        <Outlet />
      </div>
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
