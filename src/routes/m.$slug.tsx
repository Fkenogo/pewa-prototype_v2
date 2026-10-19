import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, MessageCircle } from "lucide-react";
import { formatPrice, usePewa } from "@/lib/pewa/store";
import type { Offering } from "@/lib/pewa/types";
import { ContactDrawer } from "@/components/pewa/ContactDrawer";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/m/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${name} — Menu on PEWA` },
        { name: "description", content: `Browse the ${name} menu. No app or account needed.` },
        { property: "og:title", content: `${name} — Menu` },
        { property: "og:description", content: `Browse the ${name} menu instantly.` },
      ],
    };
  },
  component: PublicMenu,
});

function PublicMenu() {
  const { slug } = Route.useParams();
  const { venues, menus } = usePewa();
  const venue = venues.find((v) => v.slug === slug);
  const live = menus.filter((m) => m.orgId === venue?.orgId && m.status === "published");
  const [menuIdx, setMenuIdx] = useState(0);
  const [contact, setContact] = useState(false);
  const [detail, setDetail] = useState<Offering | null>(null);

  if (!venue) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-2xl">We couldn't find this menu</h1>
        <p className="text-muted-foreground">The link may be mistyped.</p>
        <Link to="/" className="font-semibold text-primary underline">Browse menus</Link>
      </main>
    );
  }
  const menu = live[Math.min(menuIdx, live.length - 1)];
  const currency = venue.currency;

  return (
    <main className="mx-auto min-h-screen max-w-lg pb-28">
      <header className="bg-primary px-4 pb-6 pt-16 text-primary-foreground">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground font-display text-3xl text-primary">{venue.name[0]}</div>
        <h1 className="mt-3 text-3xl">{venue.name}</h1>
        {venue.tagline && <p className="opacity-80">{venue.tagline}</p>}
        <p className="mt-2 flex items-center gap-1 text-sm opacity-80">
          <MapPin className="h-4 w-4" /> {venue.deliveryOnly ? `Delivers to ${venue.serviceArea}` : venue.address}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {venue.services.map((s) => (
            <span key={s} className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium">{s}</span>
          ))}
        </div>
      </header>

      {!menu ? (
        <p className="p-6 text-center text-muted-foreground">This business hasn't published a menu yet. You can still contact them directly.</p>
      ) : (
        <>
          {live.length > 1 && (
            <div className="flex gap-2 px-4 pt-4">
              {live.map((m, i) => (
                <button key={m.id} onClick={() => setMenuIdx(i)} className={cn("min-h-10 rounded-full border px-4 text-sm font-medium", i === menuIdx && "border-primary bg-primary text-primary-foreground")}>{m.name}</button>
              ))}
            </div>
          )}
          <nav className="no-scrollbar sticky top-0 z-30 flex gap-2 overflow-x-auto border-b bg-background/95 px-4 py-3 backdrop-blur">
            {menu.sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="flex min-h-10 shrink-0 items-center rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground">{s.name}</a>
            ))}
          </nav>
          {menu.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-16 px-4 pt-6">
              <h2 className="mb-3 text-2xl">{s.name}</h2>
              <ul className="space-y-2">
                {s.offerings.map((o) => (
                  <li key={o.id}>
                    <button onClick={() => setDetail(o)} className={cn("flex w-full gap-3 rounded-2xl border bg-card p-3 text-left", !o.available && "opacity-60")}>
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-3xl">{o.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-semibold">{o.name}</span>
                          <span className="shrink-0 font-semibold">{formatPrice(o.price, currency)}</span>
                        </span>
                        <span className="line-clamp-2 text-sm text-muted-foreground">{o.description}</span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {!o.available && <span className="rounded-full bg-status-soldout/15 px-2 py-0.5 text-[11px] font-semibold text-status-soldout">Sold out today</span>}
                          {o.tags.map((t) => (
                            <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{t}</span>
                          ))}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      <p className="px-4 pt-10 text-center text-xs text-muted-foreground">
        Prices and dishes are set by {venue.name}. Menu powered by <Link to="/" className="underline">PEWA</Link>.
      </p>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-4 pb-safe">
        <button onClick={() => setContact(true)} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent text-base font-semibold text-accent-foreground shadow-xl">
          <MessageCircle className="h-5 w-5" /> Contact business
        </button>
      </div>

      <ContactDrawer venue={venue} open={contact} onOpenChange={setContact} />

      <Drawer open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DrawerContent className="mx-auto max-w-lg">
          {detail && (
            <>
              <DrawerHeader className="text-left">
                <div className="mb-2 text-5xl">{detail.emoji}</div>
                <DrawerTitle className="font-display text-2xl">{detail.name}</DrawerTitle>
                <DrawerDescription>{detail.description}</DrawerDescription>
                <p className="pt-1 text-lg font-semibold">{formatPrice(detail.price, currency)}</p>
                {!detail.available && <p className="text-sm font-semibold text-status-soldout">Not available right now</p>}
              </DrawerHeader>
              <div className="space-y-4 px-4 pb-safe">
                {detail.modifiers.map((g) => (
                  <div key={g.id}>
                    <p className="mb-1 text-sm font-semibold">{g.name}</p>
                    <ul className="divide-y rounded-xl border">
                      {g.options.map((o) => (
                        <li key={o.id} className="flex min-h-11 items-center justify-between px-3 text-sm">
                          {o.name}
                          <span className="text-muted-foreground">{o.priceDelta ? `+${formatPrice(o.priceDelta, currency)}` : "Included"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <button onClick={() => { setDetail(null); setContact(true); }} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground">
                  <MessageCircle className="h-4 w-4" /> Ask about this item
                </button>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </main>
  );
}
