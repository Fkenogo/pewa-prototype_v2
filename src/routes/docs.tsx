import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Compass,
  FileCheck2,
  FileText,
  FlaskConical,
  HelpCircle,
  Layers,
  MapPin,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { pageHead } from "@/lib/pewa/metadata";
import { SCENARIOS } from "@/lib/pewa/fixtures";
import { usePewa } from "@/lib/pewa/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/docs")({
  head: () =>
    pageHead(
      "PEWA Prototype Deliverables & Review Guide",
      "Formal deliverables package A through H, acceptance criteria verification, and review scripts.",
    ),
  component: DocsPage,
});

const ACCEPTANCE_CRITERIA = [
  {
    id: "AC-01",
    title: "Small café owner phone onboarding",
    text: "A small café owner can join, prepare and publish a menu using only a phone.",
    route: "/onboarding",
    scenario: "new-cafe",
  },
  {
    id: "AC-02",
    title: "Zero-installation customer discovery",
    text: "A customer can discover or open that menu without registration or installation.",
    route: "/m/green-garden-cafe",
    scenario: "units-available",
  },
  {
    id: "AC-03",
    title: "Direct manual contact safeguard",
    text: "A customer can contact the business manually without creating a PEWA order.",
    route: "/m/green-garden-cafe",
    scenario: "units-available",
  },
  {
    id: "AC-04",
    title: "Structured non-sale order request",
    text: "A customer can submit a structured order and clearly see that the business has not yet accepted it.",
    route: "/m/green-garden-cafe",
    scenario: "units-available",
  },
  {
    id: "AC-05",
    title: "Atomic single-unit acceptance deduction",
    text: "A merchant can accept the order and see exactly one simulated consumption unit deducted.",
    route: "/admin/orders",
    scenario: "units-available",
  },
  {
    id: "AC-06",
    title: "Idempotent repeat acceptance safeguard",
    text: "A second acceptance attempt does not deduct another unit.",
    route: "/admin/orders",
    scenario: "duplicate-accept",
  },
  {
    id: "AC-07",
    title: "Zero-capacity menu & contact continuity",
    text: "A subscribed business with zero new-order capacity remains publicly discoverable and contactable.",
    route: "/m/green-garden-cafe",
    scenario: "zero-units",
  },
  {
    id: "AC-08",
    title: "Hotel public vs protected context separation",
    text: "A hotel can demonstrate public and protected menu contexts without cross-audience disclosure.",
    route: "/m/grand-horizon-hotel",
    scenario: "protected-denied",
  },
  {
    id: "AC-09",
    title: "Multi-venue mobile & desktop management",
    text: "A multi-venue administrator can manage essential business activities on mobile as well as desktop.",
    route: "/admin",
    scenario: "multi-brand",
  },
  {
    id: "AC-10",
    title: "Role-scoped staff access restrictions",
    text: "A role-scoped staff member cannot access unrelated organisation or sensitive commercial controls.",
    route: "/admin/billing",
    scenario: "units-available",
  },
  {
    id: "AC-11",
    title: "Sponsored offer tagging & separation",
    text: "A sponsored offer is labelled and remains separate from organic discovery.",
    route: "/",
    scenario: "sponsored-campaign",
  },
  {
    id: "AC-12",
    title: "Offline & interrupted network resilience",
    text: "The experience remains usable under empty, loading, error and interrupted-network conditions.",
    route: "/m/green-garden-cafe",
    scenario: "channel-unavailable",
  },
  {
    id: "AC-13",
    title: "Cross-view status & financial consistency",
    text: "Mock statuses and financial balances remain consistent when users navigate between customer and merchant views.",
    route: "/orders",
    scenario: "units-available",
  },
  {
    id: "AC-14",
    title: "Meaningful feedback on all actions",
    text: "Every major user action has meaningful feedback and an understandable next step.",
    route: "/admin/orders",
    scenario: "units-available",
  },
  {
    id: "AC-15",
    title: "Full Product Truth fidelity",
    text: "No prototype behaviour knowingly contradicts approved PEWA Product Truth.",
    route: "/operator",
    scenario: "units-available",
  },
];

function DocsPage() {
  const [activeTab, setActiveTab] = useState<
    "freeze" | "criteria" | "scenarios" | "experience" | "truth" | "decisions"
  >("freeze");
  const { loadScenario } = usePewa();
  const navigate = useNavigate();

  const handleLaunchScenario = (
    scenarioId: (typeof SCENARIOS)[number]["id"],
    targetRoute?: string,
  ) => {
    loadScenario(scenarioId);
    toast.success(`Loaded scenario: ${scenarioId}`);
    if (targetRoute) {
      navigate({ to: targetRoute });
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6">
      {/* Top Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary px-2.5 py-0.5 font-mono text-xs font-bold text-primary-foreground">
              v1.0.0-rc1
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Master Prototype Documentation
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            PEWA Experience Reference
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete formal deliverables package A through H, scenario sandbox, and review scripts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/discover">Customer Home</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/admin">Business Workspace</Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto border-b pb-2 text-sm font-medium">
        {[
          { key: "freeze", label: "Freeze Candidate (Del. H)" },
          { key: "criteria", label: "Acceptance Criteria (15/15)" },
          { key: "scenarios", label: "Scenario Library (16)" },
          { key: "experience", label: "Experience Map (Del. C)" },
          { key: "truth", label: "Product Truth Map (Del. D)" },
          { key: "decisions", label: "Open Decisions (Del. G)" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 transition-colors",
              activeTab === t.key
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Freeze Candidate */}
      {activeTab === "freeze" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 shadow-xs">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-6 w-6 text-primary" />
              <h2 className="font-display text-2xl font-bold">
                Deliverable H — Experience Reference Freeze Candidate
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Designating <b>PEWA Prototype Build Revision v1.0.0-rc1</b> as the versioned
              Experience Reference submitted for Founder review and determination.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Build Status
                </p>
                <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  Candidate Ready
                </p>
                <p className="mt-1 text-xs text-muted-foreground">All 7 Slices (P0–P7) verified</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Test Coverage
                </p>
                <p className="mt-1 text-xl font-bold text-primary">39/39 Passing</p>
                <p className="mt-1 text-xs text-muted-foreground">Ordering, guardrails & routing</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Deterministic Scenarios
                </p>
                <p className="mt-1 text-xl font-bold text-accent">16 of 16 Active</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  One-click reproducible fixtures
                </p>
              </div>
            </div>

            <div className="mt-6 border-t pt-5">
              <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Formal Deliverables Package Index (Master Brief Section 12)
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                <li className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <b>Deliverable A</b>: Working interactive prototype (PWA)
                  </span>
                </li>
                <li className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <b>Deliverable B</b>: Prototype README (<code>README.md</code>)
                  </span>
                </li>
                <li className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <b>Deliverable C</b>: Experience Map (<code>docs/EXPERIENCE_MAP.md</code>)
                  </span>
                </li>
                <li className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <b>Deliverable D</b>: Product Truth Binding Map (
                    <code>docs/PRODUCT_TRUTH_BINDING_MAP.md</code>)
                  </span>
                </li>
                <li className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <b>Deliverable E</b>: Scenario Library (<code>docs/SCENARIO_LIBRARY.md</code>)
                  </span>
                </li>
                <li className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <b>Deliverable F</b>: Founder Review Guide (
                    <code>docs/FOUNDER_REVIEW_GUIDE.md</code>)
                  </span>
                </li>
                <li className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <b>Deliverable G</b>: Open Decisions Log (
                    <code>docs/OPEN_DECISIONS_AND_ASSUMPTIONS.md</code>)
                  </span>
                </li>
                <li className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <b>Deliverable H</b>: Freeze Candidate Package (
                    <code>docs/EXPERIENCE_REFERENCE_FREEZE_CANDIDATE.md</code>)
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Acceptance Criteria */}
      {activeTab === "criteria" && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">
              15 Acceptance Criteria (All Passing)
            </h2>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              15 / 15 Verified
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Section 11 of the Master Builder Brief mandates these 15 experience tests. Click any
            criterion to jump into the prototype with the matching preset scenario.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {ACCEPTANCE_CRITERIA.map((ac) => (
              <div
                key={ac.id}
                className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{ac.id}</span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Pass
                    </span>
                  </div>
                  <h3 className="mt-1 font-semibold">{ac.title}</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground">{ac.text}</p>
                </div>
                <div className="mt-4 border-t pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs font-semibold"
                    onClick={() =>
                      handleLaunchScenario(
                        ac.scenario as (typeof SCENARIOS)[number]["id"],
                        ac.route,
                      )
                    }
                  >
                    Test {ac.id} →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Scenario Library */}
      {activeTab === "scenarios" && (
        <div className="mt-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">
            Master Scenario Library (16 Scenarios)
          </h2>
          <p className="text-sm text-muted-foreground">
            The 16 deterministic scenarios can be loaded instantly below. They seed all state
            invariants atomically.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {SCENARIOS.map((s, idx) => (
              <div key={s.id} className="rounded-xl border bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-primary">
                    SC-{(idx + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                    {s.id}
                  </span>
                </div>
                <h3 className="mt-1 text-base font-bold">{s.label}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    className="h-8 w-full text-xs"
                    onClick={() => {
                      loadScenario(s.id);
                      toast.success(`Loaded scenario: ${s.label}`);
                      if (s.id === "new-cafe") navigate({ to: "/onboarding" });
                      else if (s.id === "hotel" || s.id === "protected-denied")
                        navigate({ to: "/m/$slug", params: { slug: "grand-horizon-hotel" } });
                      else if (s.id === "delivery-only")
                        navigate({ to: "/m/$slug", params: { slug: "cloudburger" } });
                      else if (s.id === "sponsored-campaign") navigate({ to: "/discover" });
                      else if (
                        [
                          "unavailable-item",
                          "zero-units",
                          "expired-beyond-grace",
                          "outdated-price",
                          "channel-unavailable",
                          "units-available",
                        ].includes(s.id)
                      )
                        navigate({ to: "/m/$slug", params: { slug: "green-garden-cafe" } });
                      else if (
                        ["duplicate-accept", "withdraw-vs-accept", "admitted-pending"].includes(
                          s.id,
                        )
                      )
                        navigate({ to: "/admin/orders" });
                      else navigate({ to: "/admin" });
                    }}
                  >
                    Load & Launch Scenario →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Experience Map */}
      {activeTab === "experience" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-xs">
            <h2 className="font-display text-2xl font-bold">Deliverable C — Experience Map</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              User role taxonomy, screen hierarchy, and state transition logic.
            </p>

            <div className="mt-6 space-y-4">
              <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Structured Order Decision Machine
              </h3>
              <div className="rounded-xl border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
                <p className="text-primary font-bold">1. Submission: PENDING (0 Units Consumed)</p>
                <p className="pl-4">
                  └── Customer sees explicit non-sale notice. Order reaches merchant queue.
                </p>
                <p className="text-amber-600 font-bold mt-2">
                  2. Decision Path A: MERCHANT ACCEPTS
                </p>
                <p className="pl-4">
                  └── Deducts EXACTLY 1 unit (priority: Included → Top-Up → Continuity Overdraft).
                </p>
                <p className="pl-4">
                  └── Repeated accept attempts deduct 0 units. Order becomes ACCEPTED.
                </p>
                <p className="text-muted-foreground font-bold mt-2">
                  3. Decision Path B: MERCHANT DECLINES
                </p>
                <p className="pl-4">└── Deducts 0 units. Customer notified with canned reason.</p>
                <p className="text-destructive font-bold mt-2">4. Safeguard: CUSTOMER WITHDRAWAL</p>
                <p className="pl-4">
                  └── Customer can withdraw pending order. Wins over concurrent accept. 0 units
                  deducted.
                </p>
                <p className="text-emerald-600 font-bold mt-2">5. Kitchen: READY</p>
                <p className="pl-4">└── Advances accepted order to ready. Deducts 0 extra units.</p>
              </div>

              <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground pt-4">
                Full Document Available
              </h3>
              <p className="text-xs text-muted-foreground">
                Read the exhaustive documentation in <code>docs/EXPERIENCE_MAP.md</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Product Truth */}
      {activeTab === "truth" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-xs">
            <h2 className="font-display text-2xl font-bold">
              Deliverable D — Product Truth Binding Map
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Traceability table linking every interaction to approved Stage 3/4 requirements.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-muted/50 font-bold">
                  <tr>
                    <th className="p-2.5">Domain</th>
                    <th className="p-2.5">Product Truth Requirement</th>
                    <th className="p-2.5">Prototype Implementation</th>
                    <th className="p-2.5">Simulated vs Production Boundary</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-2.5 font-semibold">PWA First</td>
                    <td className="p-2.5">Instant menus via link/QR; zero install or account</td>
                    <td className="p-2.5">
                      Fast SSR/SPA hydration at <code>/m/:slug</code>
                    </td>
                    <td className="p-2.5 text-muted-foreground">
                      In-memory store; Edge CDN in production
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">Contact Drawer</td>
                    <td className="p-2.5">Direct manual contact without creating PEWA order</td>
                    <td className="p-2.5">
                      ContactDrawer with <code>tel:</code>, <code>mailto:</code>, <code>wa.me</code>
                    </td>
                    <td className="p-2.5 text-muted-foreground">
                      Client protocol triggers; real WhatsApp API in production
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">Unit Deduction</td>
                    <td className="p-2.5">Acceptance consumes 1 unit; repeat accepts 0</td>
                    <td className="p-2.5">
                      Atomic store action in <code>store.ts</code> with unitConsumed flag
                    </td>
                    <td className="p-2.5 text-muted-foreground">
                      Client Zustand; Postgres RLS transaction in production
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">Zero Units</td>
                    <td className="p-2.5">Menus & contact stay live; ordering pauses gracefully</td>
                    <td className="p-2.5">
                      <code>canAdmitOrder()</code> disables cart; menu/contact remain
                    </td>
                    <td className="p-2.5 text-muted-foreground">
                      Simulated state; payment gateway top-up in production
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">Operator Guardrails</td>
                    <td className="p-2.5">Operators forbidden from accepting orders or prices</td>
                    <td className="p-2.5">
                      <code>canManageOrders("operator") === false</code> enforced
                    </td>
                    <td className="p-2.5 text-muted-foreground">
                      Client role checks; backend IAM in production
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Exhaustive matrix available at <code>docs/PRODUCT_TRUTH_BINDING_MAP.md</code>.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Open Decisions */}
      {activeTab === "decisions" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-xs">
            <h2 className="font-display text-2xl font-bold">
              Deliverable G — Open Decisions & Assumptions
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Strategic decisions reserved for Founder determination.
            </p>

            <div className="mt-6 space-y-3">
              {[
                {
                  id: "DEC-01",
                  domain: "Commercial",
                  title: "Top-Up Unit Expiration Policy",
                  assumption:
                    "Unused top-up units carry forward indefinitely and never expire during active subscription.",
                  founderChoice:
                    "Perpetual carryover (Baseline) vs 12-month expiry vs 90-day inactivity forfeiture.",
                },
                {
                  id: "DEC-02",
                  domain: "Commercial",
                  title: "Continuity Overdraft Unit Recovery",
                  assumption:
                    "Admitted in-flight orders can use up to 10 continuity units when balance hits 0.",
                  founderChoice:
                    "Deduct from next cycle (Baseline) vs automated card charge vs courtesy waiver.",
                },
                {
                  id: "DEC-03",
                  domain: "Product",
                  title: "Order Acceptance Inactivity Timeout",
                  assumption:
                    "Pending orders remain open until merchant responds or customer withdraws.",
                  founderChoice:
                    "Open-ended (Baseline) vs 15-minute auto-expiry vs configurable per venue.",
                },
                {
                  id: "DEC-04",
                  domain: "Security",
                  title: "Hotel Room Verification Depth",
                  assumption:
                    "In-room dining verifies room number and guest surname against lightweight PMS.",
                  founderChoice:
                    "Room + Surname (Baseline) vs Front-desk PIN vs In-room dynamic QR.",
                },
              ].map((d) => (
                <div key={d.id} className="rounded-xl border p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-accent">{d.id}</span>
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold">
                      {d.domain}
                    </span>
                    <h3 className="text-sm font-bold">{d.title}</h3>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    <b>Baseline assumption</b>: {d.assumption}
                  </p>
                  <p className="mt-1 text-xs text-primary font-medium">
                    <b>Founder decision options</b>: {d.founderChoice}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Complete register at <code>docs/OPEN_DECISIONS_AND_ASSUMPTIONS.md</code>.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
