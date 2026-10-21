import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Bell, Check, ClipboardList, Fuel } from "lucide-react";
import { toast } from "sonner";
import { usePewa, canManageOrders, canManageBilling, ROLE_LABELS } from "@/lib/pewa/store";
import { pageHead } from "@/lib/pewa/metadata";
import { OrderSnapshot, STATUS_LABELS } from "@/components/pewa/OrderSnapshot";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/orders")({
  head: () =>
    pageHead(
      "Incoming orders",
      "Review guest requests, accept or decline and mark accepted orders ready.",
    ),
  component: OrderCockpit,
});

function OrderCockpit() {
  const {
    orders,
    organisation,
    venues,
    role,
    orderPolicy,
    acceptOrder,
    declineOrder,
    markOrderReady,
  } = usePewa();
  const [tab, setTab] = useState("pending");
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("Unable to fulfil this request");
  const [selectedStationVenueId, setSelectedStationVenueId] = useState<string>("all");

  const orgVenues = venues.filter((v) => v.orgId === organisation?.id);
  const orgOrders = orders.filter((o) => o.orgId === organisation?.id);
  const venueFilteredOrders =
    selectedStationVenueId === "all"
      ? orgOrders
      : orgOrders.filter((o) => o.venueId === selectedStationVenueId);

  const pendingCount = venueFilteredOrders.filter((o) => o.status === "pending").length;
  const preparingCount = venueFilteredOrders.filter((o) => o.status === "accepted").length;
  const readyCount = venueFilteredOrders.filter((o) => o.status === "ready").length;
  const historyCount = venueFilteredOrders.filter((o) =>
    ["ready", "declined", "withdrawn"].includes(o.status),
  ).length;

  const visible = venueFilteredOrders.filter((o) =>
    tab === "pending"
      ? o.status === "pending"
      : tab === "accepted"
        ? o.status === "accepted"
        : tab === "ready"
          ? o.status === "ready"
          : ["ready", "declined", "withdrawn"].includes(o.status),
  );

  const act = (success: boolean) => {
    if (!success)
      toast.error(
        "This request has changed, or acceptance capacity is exhausted. Refresh the decision before trying again.",
      );
  };
  const totalUnits = orderPolicy.included + orderPolicy.topUp;
  const isZeroUnits = totalUnits === 0 && !orderPolicy.expired;

  return (
    <main className="mx-auto max-w-4xl px-4 pt-16 md:pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {organisation?.name}
          </p>
          <h1 className="mt-0.5 text-3xl font-bold">Orders Queue</h1>
        </div>
        <ClipboardList className="h-6 w-6 text-primary" />
      </div>

      {/* Operational Staff / Merchant Station Scope Header */}
      <div className="mt-3 rounded-xl border bg-card p-3 shadow-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {role === "staff" ? "Operational Staff Workspace" : ROLE_LABELS[role]}
            </span>
            <span className="text-xs font-medium text-foreground">
              {orgVenues.find((v) => v.id === selectedStationVenueId)?.name ||
                (selectedStationVenueId === "all"
                  ? `${orgVenues.length} service station${orgVenues.length > 1 ? "s" : ""}`
                  : "All Stations")}
            </span>
          </div>

          {orgVenues.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground font-medium">Service station:</span>
              <select
                aria-label="Filter by service station"
                value={selectedStationVenueId}
                onChange={(e) => setSelectedStationVenueId(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-xs font-semibold"
              >
                <option value="all">All stations ({orgVenues.length})</option>
                {orgVenues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {orgVenues.length > 1 && (
          <p className="text-[11px] text-muted-foreground italic border-t pt-2">
            Prototype note: In this demonstration prototype, staff can switch their active service
            point across organisation venues. A production deployment will bind staff credentials to
            a verified single service station.
          </p>
        )}
      </div>

      {role !== "staff" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card border p-3 text-xs">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {orderPolicy.expired
                ? "Subscription expired · new requests paused"
                : `${totalUnits} acceptance units available`}
              {orderPolicy.overdraftUsed > 0 &&
                ` · ${orderPolicy.overdraftUsed}/10 continuity units used`}
            </span>
          </div>
          {canManageBilling(role) && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-primary underline"
            >
              <Link to="/admin/billing">Manage capacity →</Link>
            </Button>
          )}
        </div>
      )}

      {isZeroUnits && canManageBilling(role) && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-50/60 p-3 text-xs text-amber-950 dark:bg-amber-950/20 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <b>0 units available.</b> New order requests are paused. Admitted orders can use
              continuity units.
            </span>
          </div>
          <Button
            asChild
            size="sm"
            className="h-7 shrink-0 bg-amber-600 text-white hover:bg-amber-700"
          >
            <Link to="/admin/billing">Top up</Link>
          </Button>
        </div>
      )}

      <div
        aria-live="polite"
        className="mt-4 flex items-center gap-2 border-y py-3 font-semibold text-primary"
      >
        <Bell className={pendingCount ? "motion-safe:animate-pulse" : ""} />
        {pendingCount}{" "}
        {pendingCount === 1 ? "request awaiting decision" : "requests awaiting decision"}
      </div>

      <div
        className="my-4 grid grid-cols-4 gap-1.5 sm:gap-2"
        role="tablist"
        aria-label="Order status"
      >
        {[
          { key: "pending", label: "Incoming", count: pendingCount },
          { key: "accepted", label: "Preparing", count: preparingCount },
          { key: "ready", label: "Ready", count: readyCount },
          { key: "history", label: "History", count: historyCount },
        ].map(({ key, label, count }) => (
          <Button
            key={key}
            role="tab"
            size="sm"
            aria-selected={tab === key}
            variant={tab === key ? "default" : "outline"}
            onClick={() => setTab(key)}
            className="flex items-center justify-center gap-1 text-xs px-2"
          >
            <span>{label}</span>
            {count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  tab === key
                    ? "bg-primary-foreground text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            )}
          </Button>
        ))}
      </div>

      {!visible.length && (
        <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">
            No{" "}
            {tab === "pending"
              ? "incoming requests awaiting decision"
              : tab === "accepted"
                ? "orders currently preparing"
                : tab === "ready"
                  ? "orders ready for pickup or dispatch"
                  : "completed past requests"}
            .
          </p>
          <p className="text-xs">
            {tab === "pending"
              ? "New customer requests will show up here in real time."
              : tab === "accepted"
                ? "Accepted orders in preparation will appear here."
                : tab === "ready"
                  ? "Orders marked ready will wait here until handed over."
                  : "Resolved, ready, and declined orders are recorded in history."}
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((order) => (
          <article key={order.id} className="rounded-lg border bg-card p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-sans font-bold">{order.reference}</h2>
              <span className="text-xs font-semibold text-primary">
                {STATUS_LABELS[order.status]}
              </span>
            </div>
            <OrderSnapshot order={order} merchant />
            {order.declineReason && (
              <p className="mt-3 text-sm text-muted-foreground">{order.declineReason}</p>
            )}
            {canManageOrders(role) && order.status === "pending" && (
              <div className="mt-4 space-y-3">
                {declining === order.id ? (
                  <>
                    <label className="block text-sm">
                      Decline reason
                      <select
                        aria-label="Decline reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1 h-11 w-full rounded-md border bg-background px-2"
                      >
                        <option>Unable to fulfil this request</option>
                        <option>Item no longer available</option>
                        <option>Kitchen at capacity</option>
                        <option>Service unavailable</option>
                      </select>
                    </label>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          const ok = declineOrder(order.id, reason);
                          if (ok) {
                            toast.success("Order request declined. Guest notified.");
                          } else {
                            act(false);
                          }
                          setDeclining(null);
                        }}
                      >
                        Confirm decline
                      </Button>
                      <Button variant="outline" onClick={() => setDeclining(null)}>
                        Back
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      className="h-11 flex-1"
                      onClick={() => {
                        const ok = acceptOrder(order.id);
                        if (ok) {
                          toast.success(
                            "Order request accepted. 1 acceptance unit deducted and sent to prep.",
                          );
                        } else {
                          act(false);
                        }
                      }}
                    >
                      <Check />
                      Accept order
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 flex-1"
                      onClick={() => setDeclining(order.id)}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            )}
            {canManageOrders(role) && order.status === "accepted" && (
              <Button
                className="mt-4 h-11 w-full"
                onClick={() => {
                  const ok = markOrderReady(order.id);
                  if (ok) {
                    toast.success("Order marked Ready for guest pickup/dispatch.");
                  } else {
                    act(false);
                  }
                }}
              >
                <Check />
                Mark as ready
              </Button>
            )}
            <Link
              to="/orders/$orderId"
              params={{ orderId: order.id }}
              className="mt-4 block text-center text-xs text-primary underline"
            >
              Customer status
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
