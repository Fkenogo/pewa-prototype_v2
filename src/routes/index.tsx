import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, MapPin, Search, Store } from "lucide-react";
import { usePewa } from "@/lib/pewa/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PEWA — Browse local menus, no app needed" },
      { name: "description", content: "Find cafés and restaurants near you and open their menus instantly. No download, no account." },
      { property: "og:title", content: "PEWA — Browse local menus, no app needed" },
      { property: "og:description", content: "Open café and restaurant menus instantly. No download, no account." },
    ],
  }),
  component: Home,
});

function Home() {
  const { venues, menus } = usePewa();
  const [q, setQ] = useState("");
  const live = useMemo(
    () => venues.filter((v) => menus.some((m) => m.orgId === v.orgId && m.status === "published")),
    [venues, menus],
  );
  const results = live.filter((v) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    const dishes = menus.filter((m) => m.orgId === v.orgId).flatMap((m) => m.sections.flatMap((s) => [s.name, ...s.offerings.map((o) => o.name)]));
    return [v.name, v.tagline, v.address, ...dishes].some((t) => t?.toLowerCase().includes(needle));
  });

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-24 pt-5">
      <header className="mb-6 pr-28">
        <span className="font-display text-3xl font-bold text-primary">pewa</span>
      </header>
      <h1 className="text-4xl leading-tight">What's on the menu near you?</h1>
      <p className="mt-2 text-muted-foreground">Open any menu instantly. No app, no account.</p>

      <label className="mt-5 flex h-12 items-center gap-2 rounded-xl border bg-card px-3 focus-within:ring-2 focus-within:ring-ring">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cafés, dishes…" className="h-full flex-1 bg-transparent outline-none" />
      </label>

      <section className="mt-6 space-y-3">
        <h2 className="text-lg">Menus</h2>
        {results.length === 0 && <p className="text-sm text-muted-foreground">No menus match “{q}”.</p>}
        {results.map((v) => (
          <Link key={v.id} to="/m/$slug" params={{ slug: v.slug }} className="flex items-center gap-3 rounded-2xl border bg-card p-3 transition hover:border-primary">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary font-display text-2xl text-primary">{v.name[0]}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{v.name}</p>
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {v.deliveryOnly ? `Delivers: ${v.serviceArea}` : v.address}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </section>

      <Link to="/onboarding" className="mt-8 flex items-center gap-3 rounded-2xl bg-primary p-4 text-primary-foreground">
        <Store className="h-6 w-6" />
        <span className="flex-1">
          <span className="block font-semibold">Run a café or restaurant?</span>
          <span className="block text-sm opacity-80">Publish your menu from your phone in minutes.</span>
        </span>
        <ArrowRight className="h-5 w-5" />
      </Link>
    </main>
  );
}
