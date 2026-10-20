import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Eye,
  Info,
  MessageCircle,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { canViewActivity, usePewa } from "@/lib/pewa/store";
import { pageHead } from "@/lib/pewa/metadata";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/activity")({
  head: () =>
    pageHead(
      "PEWA-Observed Activity",
      "Real-time digital interaction insights observed on your published web menus.",
    ),
  component: ActivityPage,
});

function ActivityPage() {
  const { organisation, orders, activity, campaigns, role } = usePewa();
  const [filter, setFilter] = useState<string>("all");

  if (!canViewActivity(role)) {
    return (
      <main className="mx-auto max-w-sm px-4 pt-16 text-center">
        <h1 className="text-2xl font-bold">Activity restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You must be logged in with a business role to view operational activity.
        </p>
      </main>
    );
  }

  // Derive PEWA-observed metrics
  const orgOrders = orders.filter((o) => o.orgId === organisation?.id);
  const totalRequests = orgOrders.length;
  const acceptedOrders = orgOrders.filter(
    (o) => o.status === "accepted" || o.status === "ready",
  ).length;
  const acceptanceRate =
    totalRequests > 0 ? `${Math.round((acceptedOrders / totalRequests) * 100)}%` : "—";

  const contactEvents = activity.filter(
    (a) =>
      a.kind === "contact.whatsapp" || a.kind === "contact.phone" || a.kind === "contact.email",
  ).length;

  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);

  const filteredLogs = activity.filter((item) => {
    if (filter === "all") return true;
    if (filter === "orders") return item.kind.startsWith("order.");
    if (filter === "menu")
      return (
        item.kind.startsWith("menu.") ||
        item.kind.startsWith("offering.") ||
        item.kind.startsWith("section.")
      );
    if (filter === "billing") return item.kind.startsWith("billing.");
    if (filter === "promos") return item.kind.startsWith("promo.");
    return true;
  });

  return (
    <main className="mx-auto max-w-4xl px-4 pt-16 md:pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{organisation?.name}</p>
          <h1 className="text-3xl font-bold">Activity & Insights</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-primary">
          <Activity className="h-3.5 w-3.5" />
          <span>Real-time observed</span>
        </div>
      </div>

      {/* Transparent Disclaimer */}
      <section className="mt-6 rounded-2xl border bg-card p-4 text-xs text-muted-foreground shadow-xs">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">PEWA Observed Metrics Disclaimer</p>
            <p>
              These metrics reflect digital events recorded directly on your PEWA web menus (such as
              menu pageviews, contact taps, and order requests). PEWA does <b>not</b> claim to track
              off-platform meal turnover, physical table occupancy, or offline cash/card payments.
            </p>
          </div>
        </div>
      </section>

      {/* Metric Cards Grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Order Requests</span>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold">{totalRequests}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Submitted by customers</p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Accepted Orders</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold">{acceptedOrders}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Confirmed by team</p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Acceptance Rate</span>
            <ArrowUpRight className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold">{acceptanceRate}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Requests converted</p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Featured Views</span>
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold">{totalImpressions}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Delivered ad views</p>
        </div>
      </div>

      {/* Activity Event Stream */}
      <section className="mt-8 mb-12 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold">Observed Activity Stream</h2>
          <div className="flex flex-wrap gap-1">
            {[
              { key: "all", label: "All" },
              { key: "orders", label: "Orders" },
              { key: "menu", label: "Menu Edits" },
              { key: "billing", label: "Billing" },
              { key: "promos", label: "Promotions" },
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={filter === key ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {!filteredLogs.length ? (
          <div className="rounded-2xl border bg-card py-10 text-center text-xs text-muted-foreground">
            No events match the selected category.
          </div>
        ) : (
          <div className="rounded-2xl border bg-card divide-y shadow-xs">
            {filteredLogs.map((evt) => (
              <div key={evt.id} className="flex items-start justify-between gap-4 p-3.5 text-xs">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                      evt.kind.startsWith("order.accepted")
                        ? "bg-blue-500"
                        : evt.kind.startsWith("order.submitted")
                          ? "bg-amber-500"
                          : evt.kind.startsWith("billing.")
                            ? "bg-emerald-500"
                            : evt.kind.startsWith("promo.")
                              ? "bg-accent"
                              : "bg-muted-foreground"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-foreground">{evt.message}</p>
                    <span className="text-[11px] text-muted-foreground">Role: {evt.role}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" />
                  <span suppressHydrationWarning>
                    {new Date(evt.at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
