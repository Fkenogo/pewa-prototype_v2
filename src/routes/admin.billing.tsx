import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CreditCard,
  Fuel,
  Info,
  PackagePlus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { canManageBilling, usePewa } from "@/lib/pewa/store";
import { pageHead } from "@/lib/pewa/metadata";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/billing")({
  head: () =>
    pageHead(
      "Subscription & Acceptance Units",
      "Manage your monthly order capacity, top-up balances, and subscription entitlements.",
    ),
  component: BillingDashboard,
});

const TOP_UP_BUNDLES = [
  { units: 50, price: "$12.00", perUnit: "$0.24", popular: false },
  { units: 100, price: "$20.00", perUnit: "$0.20", popular: true },
  { units: 250, price: "$45.00", perUnit: "$0.18", popular: false },
  { units: 500, price: "$80.00", perUnit: "$0.16", popular: false },
];

function BillingDashboard() {
  const {
    organisation,
    role,
    orderPolicy,
    activity,
    addTopUpUnits,
    renewBillingCycle,
    setSubscriptionExpired,
  } = usePewa();

  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<number>(100);

  if (!canManageBilling(role)) {
    return (
      <main className="mx-auto max-w-lg px-4 pt-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Access restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Billing, subscriptions, and capacity replenishment are reserved for{" "}
          <b>Organisation Owners</b> and <b>Administrators</b>. Operational staff cannot view or
          modify commercial balances.
        </p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link to="/admin">Back to workspace</Link>
          </Button>
        </div>
      </main>
    );
  }

  const includedMax = orderPolicy.includedMax || 200;
  const overdraftMax = orderPolicy.overdraftMax || 10;
  const includedPct = Math.round((orderPolicy.included / includedMax) * 100);
  const totalAvailable = orderPolicy.included + orderPolicy.topUp;
  const isExhausted = totalAvailable === 0 && !orderPolicy.expired;
  const hasContinuityUsed = orderPolicy.overdraftUsed > 0;

  const billingLogs = activity
    .filter((a) => a.kind.startsWith("billing.") || a.kind.startsWith("order.accepted"))
    .slice(0, 8);

  const handlePurchase = () => {
    const bundle = TOP_UP_BUNDLES.find((b) => b.units === selectedBundle);
    if (!bundle) return;
    addTopUpUnits(bundle.units);
    setTopUpModalOpen(false);
    toast.success(`Successfully added +${bundle.units} top-up units to your capacity.`);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 pt-16 md:pt-6">
      {/* Breadcrumb / Org Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{organisation?.name}</p>
          <h1 className="text-3xl font-bold">Subscription & Capacity</h1>
        </div>
        <Button
          onClick={() => setTopUpModalOpen(true)}
          className="h-11 rounded-xl bg-primary text-primary-foreground shadow-sm"
        >
          <PackagePlus className="mr-2 h-4 w-4" /> Top up units
        </Button>
      </div>

      {/* Critical Zero-Unit or Expired Exhaustion Alert */}
      {isExhausted && (
        <section
          role="alert"
          className="mt-6 rounded-2xl border-2 border-amber-500/30 bg-amber-50/50 p-4 text-amber-950 dark:bg-amber-950/20 dark:text-amber-200"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="font-semibold">0 Acceptance Units Available — New Requests Paused</p>
              <p className="text-sm opacity-90">
                <b>Your menus, direct links, and QR codes remain 100% active.</b> Customers can
                still browse dishes and contact your venue directly via WhatsApp or phone.
                Structured order submissions will resume the moment capacity is replenished.
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={() => setTopUpModalOpen(true)}
                  className="bg-amber-600 text-white hover:bg-amber-700"
                >
                  <PackagePlus className="mr-1.5 h-3.5 w-3.5" /> Purchase top-up bundle
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {orderPolicy.expired && (
        <section
          role="alert"
          className="mt-6 rounded-2xl border-2 border-destructive/30 bg-destructive/10 p-4 text-destructive"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Subscription Expired Beyond Grace Period</p>
              <p className="text-sm opacity-90">
                New structured order requests are paused. Your public menu and direct contact
                methods remain online so customers can reach your team directly.
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    renewBillingCycle();
                    toast.success("Subscription reactivated with 200 included units.");
                  }}
                  className="border-destructive text-destructive hover:bg-destructive/10"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Renew monthly subscription
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Fuel-Gauge / Capacity Meters */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {/* Included Units Meter */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Fuel className="h-4 w-4 text-primary" /> Included monthly units
            </div>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
              {orderPolicy.tier || "Base Tier"}
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight text-foreground">
              {orderPolicy.included}
            </span>
            <span className="text-sm font-medium text-muted-foreground">/ {includedMax}</span>
          </div>
          <Progress value={includedPct} className="mt-3 h-2" />
          <p className="mt-3 text-xs text-muted-foreground">
            200 units included per monthly cycle. Deducted <b>only</b> upon order confirmation.
            Unused included units reset at monthly period renewal.
          </p>
        </div>

        {/* Top-Up Units Meter */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Sparkles className="h-4 w-4 text-accent" /> Top-up units
            </div>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
              Carries forward
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight text-foreground">
              +{orderPolicy.topUp}
            </span>
            <span className="text-sm font-medium text-muted-foreground">purchased</span>
          </div>
          <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="bg-accent transition-all duration-300"
              style={{ width: `${Math.min(100, (orderPolicy.topUp / 200) * 100)}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Purchased bundles never expire at cycle boundaries. Consumed only after included monthly
            units reach 0.
          </p>
        </div>

        {/* Continuity / Overdraft Meter */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Zap className="h-4 w-4 text-amber-500" /> Continuity overdraft
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                hasContinuityUsed
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {hasContinuityUsed ? "Debt-backed" : "Ready"}
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight text-foreground">
              {orderPolicy.overdraftUsed}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              / {overdraftMax} max used
            </span>
          </div>
          <Progress value={(orderPolicy.overdraftUsed / overdraftMax) * 100} className="mt-3 h-2" />
          <p className="mt-3 text-xs text-muted-foreground">
            Up to 10 recoverable units allow in-flight customer orders to be admitted when units
            reach zero. Settled on next top-up or renewal.
          </p>
        </div>
      </div>

      {/* Product Truth Mechanics Card */}
      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Info className="h-5 w-5 text-primary" /> Approved Product Truth & Consumption Invariants
        </h2>
        <ul className="mt-3 grid gap-2.5 text-xs leading-relaxed text-muted-foreground sm:grid-cols-2">
          <li className="flex items-start gap-2 rounded-xl bg-muted/40 p-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <b>Exact Deduction Rule:</b> Exactly 1 unit is consumed if and only if an authorized
              merchant confirms an order request.
            </span>
          </li>
          <li className="flex items-start gap-2 rounded-xl bg-muted/40 p-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <b>Zero-Fee Exits:</b> Units are <i>never</i> deducted on order submission, customer
              withdrawal, decline, or "Ready" status updates.
            </span>
          </li>
          <li className="flex items-start gap-2 rounded-xl bg-muted/40 p-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <b>Graceful Zero-Capacity:</b> When capacity hits 0, public menus and direct WhatsApp
              / call links stay online; only new structured submissions pause.
            </span>
          </li>
          <li className="flex items-start gap-2 rounded-xl bg-muted/40 p-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <b>Carry-Forward Guarantee:</b> Included 200 units expire at monthly renewal, while
              purchased top-up units carry forward indefinitely.
            </span>
          </li>
        </ul>
      </section>

      {/* Simulation & Scenario Testing Controls */}
      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold">Prototype Simulation Sandbox</h2>
            <p className="text-xs text-muted-foreground">
              Test lifecycle edge cases deterministically per Slice P4 acceptance criteria.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              usePewa.setState({
                orderPolicy: { ...orderPolicy, included: 0, topUp: 0 },
              });
              usePewa.getState().log({
                kind: "billing.simulated",
                message: "Simulated 0 acceptance units exhaustion",
              });
              toast.info("Simulated 0 units exhaustion. Check the public menu!");
            }}
          >
            Simulate 0 units exhaustion
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              renewBillingCycle();
              toast.success("Billing cycle renewed: 200 included units refreshed.");
            }}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Simulate monthly cycle renewal
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSubscriptionExpired(!orderPolicy.expired);
              toast.info(`Subscription ${!orderPolicy.expired ? "marked expired" : "restored"}.`);
            }}
          >
            {orderPolicy.expired ? "Restore subscription" : "Simulate expired beyond grace"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              addTopUpUnits(100);
              toast.success("Added +100 top-up test units.");
            }}
          >
            +100 Quick top-up
          </Button>
        </div>
      </section>

      {/* Activity & Deduction Audit Trail */}
      <section className="mt-6 mb-8 rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="font-display text-lg font-bold">Recent Capacity & Deduction Activity</h2>
        {!billingLogs.length ? (
          <p className="mt-4 py-6 text-center text-xs text-muted-foreground">
            No consumption or billing events logged yet. Accept an order or purchase units to see
            the audit trail.
          </p>
        ) : (
          <div className="mt-3 divide-y text-xs">
            {billingLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      log.kind === "order.accepted"
                        ? "bg-blue-500"
                        : log.kind === "billing.topup"
                          ? "bg-emerald-500"
                          : "bg-muted-foreground"
                    }`}
                  />
                  <span>{log.message}</span>
                </div>
                <span
                  className="shrink-0 font-mono text-[11px] text-muted-foreground"
                  suppressHydrationWarning
                >
                  {new Date(log.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Top-up Purchase Dialog */}
      <Dialog open={topUpModalOpen} onOpenChange={setTopUpModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CreditCard className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center font-display text-xl">
              Replenish Acceptance Units
            </DialogTitle>
            <DialogDescription className="text-center">
              Top-up units carry forward across monthly billing periods. Units are consumed only
              when orders are confirmed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-3">
            {TOP_UP_BUNDLES.map((bundle) => (
              <label
                key={bundle.units}
                className={`relative flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
                  selectedBundle === bundle.units
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="topup_bundle"
                    checked={selectedBundle === bundle.units}
                    onChange={() => setSelectedBundle(bundle.units)}
                    className="h-4 w-4 text-primary"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">+{bundle.units} Units</span>
                      {bundle.popular && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                          Best value
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {bundle.perUnit} per accepted order
                    </p>
                  </div>
                </div>
                <span className="font-display text-base font-bold text-foreground">
                  {bundle.price}
                </span>
              </label>
            ))}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="h-11 w-full" onClick={handlePurchase}>
              Confirm & add +{selectedBundle} units
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full"
              onClick={() => setTopUpModalOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
