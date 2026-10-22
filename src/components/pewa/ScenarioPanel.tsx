import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { FlaskConical, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import {
  ROLE_LABELS,
  canAccessOperatorConsole,
  getActiveOrganisationMembership,
  getEffectiveBusinessRole,
  isBusinessRole,
  usePewa,
} from "@/lib/pewa/store";
import { SCENARIOS } from "@/lib/pewa/fixtures";
import type { Role } from "@/lib/pewa/types";
import { cn } from "@/lib/utils";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

export function ScenarioPanel() {
  const [open, setOpen] = useState(false);
  const state = usePewa();
  const {
    role,
    scenario,
    setRole,
    loadScenario,
    reset,
    activity,
    venues,
    organisation,
    orders,
    personalIdentity,
  } = state;
  const activeMembership = getActiveOrganisationMembership(state);
  const effectiveRole = getEffectiveBusinessRole(state);
  const isFailClosed = isBusinessRole(role) && effectiveRole === "customer";
  const navigate = useNavigate();
  const myVenue = venues.find((v) => v.orgId === organisation?.id);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open prototype scenario panel"
        className="fixed right-3 top-3 z-50 flex h-11 items-center gap-1.5 rounded-full bg-proto px-3 text-xs font-semibold text-proto-foreground shadow-lg"
      >
        <FlaskConical className="h-4 w-4" />
        <span className="max-w-24 truncate">{ROLE_LABELS[role]}</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-foreground/30"
          onClick={() => setOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-sm flex-col overflow-y-auto bg-proto p-4 text-proto-foreground pb-safe"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <span className="inline-block rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                  UNFROZEN — FOUNDER REFINEMENT IN PROGRESS
                </span>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">
                  R3-A: Identity &amp; Business Onboarding
                </p>
                <h2 className="text-xl font-bold">Scenario control</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-proto-foreground/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Operational Staff Workspace Shortcut */}
            {role === "staff" && (
              <div className="mb-5 rounded-xl border border-accent/40 bg-accent/20 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Operational Staff Active</span>
                  <span className="rounded bg-accent/30 px-1.5 py-0.5 text-[10px]">Staff Mode</span>
                </div>
                <p className="text-xs text-proto-foreground/80">
                  Assigned to <b>{organisation?.name}</b>
                  {myVenue && ` · Station: ${myVenue.name}`}
                </p>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate({ to: "/admin/orders" });
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-accent py-2 text-xs font-bold text-accent-foreground hover:bg-accent/80 transition-colors"
                >
                  Open Staff Orders Workspace →
                </button>
              </div>
            )}

            <section className="mb-5">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-sans text-xs font-bold uppercase tracking-wider opacity-70">
                  Demonstration Persona Switcher
                </h3>
                <span className="rounded bg-proto-foreground/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                  Simulation Only
                </span>
              </div>
              <p className="mb-2 text-[11px] opacity-75">
                {personalIdentity ? (
                  <>
                    Identity: <b>{personalIdentity.fullName}</b>
                    {activeMembership && organisation
                      ? ` · ${ROLE_LABELS[activeMembership.role]} at ${organisation.name}`
                      : ""}
                  </>
                ) : (
                  <>Unregistered guest / first-time visitor</>
                )}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={cn(
                      "min-h-11 rounded-lg border border-proto-foreground/20 px-2 text-left text-xs font-medium",
                      role === r && "bg-proto-foreground text-proto",
                    )}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
              {isFailClosed && (
                <div className="mt-2.5 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2 text-[11px] text-amber-200">
                  <b>Fail-closed boundary:</b> No active {ROLE_LABELS[role]} membership exists for{" "}
                  <b>{personalIdentity?.fullName || "this identity"}</b> in{" "}
                  {organisation?.name || "the active organisation"}. Business actions remain
                  restricted.
                </div>
              )}
            </section>

            <section className="mb-5">
              <h3 className="mb-2 font-sans text-xs font-bold uppercase tracking-wider opacity-70">
                Jump to
              </h3>
              <div className="flex flex-wrap gap-2 text-xs">
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-proto-foreground/10 px-3 py-2"
                >
                  Customer home
                </Link>
                <Link
                  to="/onboarding"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-proto-foreground/10 px-3 py-2"
                >
                  Business onboarding
                </Link>
                {role === "staff" ? (
                  <Link
                    to="/admin/orders"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-accent text-accent-foreground px-3 py-2 font-bold"
                  >
                    Staff orders workspace
                  </Link>
                ) : (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-proto-foreground/10 px-3 py-2"
                  >
                    Business workspace
                  </Link>
                )}
                <Link
                  to="/directory"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-proto-foreground/10 px-3 py-2"
                >
                  Directory
                </Link>
                {role !== "staff" && (
                  <Link
                    to="/admin/orders"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-proto-foreground/10 px-3 py-2"
                  >
                    Merchant orders
                  </Link>
                )}
                <Link
                  to="/orders"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-proto-foreground/10 px-3 py-2"
                >
                  Customer requests ({orders.length})
                </Link>
                {myVenue && (
                  <Link
                    to="/m/$slug"
                    params={{ slug: myVenue.slug }}
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-proto-foreground/10 px-3 py-2"
                  >
                    My public menu
                  </Link>
                )}
                <Link
                  to="/m/$slug"
                  params={{ slug: "green-garden-cafe" }}
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-proto-foreground/10 px-3 py-2"
                >
                  /m/green-garden-cafe
                </Link>
                {canAccessOperatorConsole(role) && (
                  <Link
                    to="/operator"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-proto-foreground/20 px-3 py-2 font-semibold"
                  >
                    Operator console
                  </Link>
                )}
                <Link
                  to="/docs"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-accent/40 text-accent-foreground px-3 py-2 font-bold hover:bg-accent/60"
                >
                  Deliverables & Review Guide →
                </Link>
              </div>
            </section>

            <section className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-sans text-xs font-bold uppercase tracking-wider opacity-70">
                  Network Resilience
                </h3>
              </div>
              <button
                onClick={() => {
                  const next = !usePewa.getState().simulatedOffline;
                  usePewa.getState().setSimulatedOffline(next);
                  toast(next ? "Simulated offline mode enabled" : "Online connection restored");
                }}
                className={cn(
                  "flex min-h-10 w-full items-center justify-between rounded-lg border px-3 text-xs font-semibold transition-colors",
                  usePewa.getState().simulatedOffline
                    ? "border-amber-400 bg-amber-500/20 text-amber-200"
                    : "border-proto-foreground/20 hover:bg-proto-foreground/10",
                )}
              >
                <span>Offline Network Simulation</span>
                <span className="font-mono text-[10px]">
                  {usePewa.getState().simulatedOffline ? "OFFLINE (Active)" : "ONLINE"}
                </span>
              </button>
            </section>

            <section className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-sans text-xs font-bold uppercase tracking-wider opacity-70">
                  Scenario
                </h3>
                <button
                  onClick={() => {
                    reset();
                    toast.success("Scenario state reset");
                  }}
                  className="flex min-h-9 items-center gap-1 rounded-full bg-accent px-3 text-xs font-semibold text-accent-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              </div>
              <ul className="space-y-1.5">
                {SCENARIOS.map((s) => (
                  <li key={s.id}>
                    <button
                      disabled={!s.ready}
                      onClick={() => {
                        loadScenario(s.id);
                        setOpen(false);
                        if (s.id === "new-cafe") navigate({ to: "/onboarding" });
                        else if (s.id === "hotel" || s.id === "protected-denied")
                          navigate({ to: "/m/$slug", params: { slug: "grand-horizon-hotel" } });
                        else if (s.id === "delivery-only")
                          navigate({ to: "/m/$slug", params: { slug: "cloudburger" } });
                        else if (s.id === "sponsored-campaign") navigate({ to: "/" });
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
                        toast(`Loaded: ${s.label}`);
                      }}
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between rounded-lg border border-proto-foreground/15 px-3 text-left text-sm",
                        scenario === s.id && "border-accent bg-proto-foreground/10",
                        !s.ready && "opacity-40",
                      )}
                    >
                      <span>{s.label}</span>
                      <span className="text-[10px] opacity-70">
                        {s.ready ? s.hint : `Coming · ${s.hint}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="mb-2 font-sans text-xs font-bold uppercase tracking-wider opacity-70">
                Event log
              </h3>
              <ul className="space-y-1 font-mono text-[11px] opacity-80">
                {activity.length === 0 && <li>No events yet.</li>}
                {activity.slice(0, 15).map((e) => (
                  <li key={e.id}>
                    <span className="opacity-60" suppressHydrationWarning>
                      {new Date(e.at).toLocaleTimeString()} · {e.role}
                    </span>{" "}
                    {e.message}
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
