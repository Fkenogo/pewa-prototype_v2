import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { FlaskConical, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS, usePewa } from "@/lib/pewa/store";
import { SCENARIOS } from "@/lib/pewa/fixtures";
import type { Role } from "@/lib/pewa/types";
import { cn } from "@/lib/utils";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

export function ScenarioPanel() {
  const [open, setOpen] = useState(false);
  const { role, scenario, setRole, loadScenario, reset, activity, venues, organisation } = usePewa();
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
        <div className="fixed inset-0 z-50 flex justify-end bg-foreground/30" onClick={() => setOpen(false)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-sm flex-col overflow-y-auto bg-proto p-4 text-proto-foreground pb-safe"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Prototype only</p>
                <h2 className="text-xl">Scenario control</h2>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-proto-foreground/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <section className="mb-5">
              <h3 className="mb-2 font-sans text-xs font-bold uppercase tracking-wider opacity-70">Acting as</h3>
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
            </section>

            <section className="mb-5">
              <h3 className="mb-2 font-sans text-xs font-bold uppercase tracking-wider opacity-70">Jump to</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                <Link to="/" onClick={() => setOpen(false)} className="rounded-full bg-proto-foreground/10 px-3 py-2">Customer home</Link>
                <Link to="/admin" onClick={() => setOpen(false)} className="rounded-full bg-proto-foreground/10 px-3 py-2">Business workspace</Link>
                {myVenue && (
                  <Link to="/m/$slug" params={{ slug: myVenue.slug }} onClick={() => setOpen(false)} className="rounded-full bg-proto-foreground/10 px-3 py-2">My public menu</Link>
                )}
                <Link to="/m/$slug" params={{ slug: "green-garden-cafe" }} onClick={() => setOpen(false)} className="rounded-full bg-proto-foreground/10 px-3 py-2">/m/green-garden-cafe</Link>
              </div>
            </section>

            <section className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-sans text-xs font-bold uppercase tracking-wider opacity-70">Scenario</h3>
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
                        navigate({ to: s.id === "new-cafe" ? "/onboarding" : s.id === "unavailable-item" ? "/m/$slug" : "/admin", params: { slug: "green-garden-cafe" } } as never);
                        toast(`Loaded: ${s.label}`);
                      }}
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between rounded-lg border border-proto-foreground/15 px-3 text-left text-sm",
                        scenario === s.id && "border-accent bg-proto-foreground/10",
                        !s.ready && "opacity-40",
                      )}
                    >
                      <span>{s.label}</span>
                      <span className="text-[10px] opacity-70">{s.ready ? s.hint : `Coming · ${s.hint}`}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="mb-2 font-sans text-xs font-bold uppercase tracking-wider opacity-70">Event log</h3>
              <ul className="space-y-1 font-mono text-[11px] opacity-80">
                {activity.length === 0 && <li>No events yet.</li>}
                {activity.slice(0, 15).map((e) => (
                  <li key={e.id}>
                    <span className="opacity-60">{new Date(e.at).toLocaleTimeString()} · {e.role}</span> {e.message}
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
