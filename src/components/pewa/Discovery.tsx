import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, MapPin, Search, ArrowRight, Sparkles } from "lucide-react";
import { usePewa } from "@/lib/pewa/store";
import type { Venue } from "@/lib/pewa/types";
import { Button } from "@/components/ui/button";
import { CustomerNav } from "./CustomerNav";
import breakfast from "@/assets/cafe-breakfast.jpg";

export function Discovery({ directory = false }: { directory?: boolean }) {
  const { venues, menus, recents, favourites, campaigns, recordPromotionClick } = usePewa();
  const [q, setQ] = useState("");
  const [service, setService] = useState("");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  // Protected menus (like in-room dining) are hidden from public directory and organic search
  const published = menus.filter((m) => m.status === "published" && !m.isProtected);
  const live = venues.filter((v) => published.some((m) => m.orgId === v.orgId));
  const sections = [...new Set(published.flatMap((m) => m.sections.map((s) => s.name)))];
  const services = [...new Set(live.flatMap((v) => v.services))];
  const areas = [...new Set(live.map((v) => (v.deliveryOnly ? v.serviceArea : v.address)))].filter(
    Boolean,
  );
  const results = live.filter((v) => {
    const mine = published.filter((m) => m.orgId === v.orgId);
    const text = [
      v.name,
      v.tagline,
      v.address,
      v.serviceArea,
      ...v.services,
      ...mine.flatMap((m) =>
        m.sections.flatMap((s) => [
          s.name,
          ...s.offerings.flatMap((o) => [o.name, o.description, ...o.tags]),
        ]),
      ),
    ]
      .join(" ")
      .toLocaleLowerCase();
    return (
      text.includes(q.trim().toLocaleLowerCase()) &&
      (!service || v.services.includes(service)) &&
      (!category || mine.some((m) => m.sections.some((s) => s.name === category))) &&
      (!area || (v.deliveryOnly ? v.serviceArea : v.address) === area) &&
      (!savedOnly || favourites.includes(v.id))
    );
  });
  const recentVenues = recents.flatMap((id) => {
    const v = live.find((v) => v.id === id);
    return v ? [v] : [];
  });
  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-28 pt-5">
      <header className="mb-6 pr-32">
        <Link to="/" className="font-display text-3xl font-bold text-primary">
          pewa
        </Link>
      </header>
      <h1 className="text-3xl leading-tight">
        {directory ? "Menu directory" : "What’s on the menu?"}
      </h1>
      {!directory && (
        <p className="mt-2 text-sm text-muted-foreground">
          Local menus. Straight from the business.
        </p>
      )}
      <label className="mt-5 flex h-12 items-center gap-2 rounded-lg border bg-card px-3 focus-within:ring-2 focus-within:ring-ring">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          aria-label="Search menus"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Business, dish, category or tag"
          className="h-full min-w-0 flex-1 bg-transparent outline-none"
        />
      </label>
      {directory && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            aria-label="Cuisine or category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 min-w-0 rounded-md border bg-card px-2 text-sm"
          >
            <option value="">All categories</option>
            {sections.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Service filter"
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="h-11 min-w-0 rounded-md border bg-card px-2 text-sm"
          >
            <option value="">All services</option>
            {services.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Area filter"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="col-span-2 h-11 min-w-0 rounded-md border bg-card px-2 text-sm"
          >
            <option value="">All areas</option>
            {areas.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
      {!directory && !q && campaigns.filter((c) => c.active).length > 0 && (
        <section className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h2 className="font-display text-lg font-bold">Featured Offers</h2>
            </div>
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              Sponsored
            </span>
          </div>
          <div className="space-y-2.5">
            {campaigns
              .filter((c) => c.active)
              .map((camp) => {
                const v = venues.find((x) => x.id === camp.venueId);
                if (!v) return null;
                return (
                  <Link
                    key={camp.id}
                    to="/m/$slug"
                    params={{ slug: v.slug }}
                    onClick={() => recordPromotionClick(camp.id)}
                    className="block rounded-xl border bg-card p-3 shadow-xs transition-colors hover:border-accent"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{camp.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{camp.tagline}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                        Offer
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs font-medium text-primary">
                      <span>{v.name}</span>
                      <span className="flex items-center gap-0.5 text-[11px] underline">
                        View menu <ArrowRight className="inline h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
          <p className="mt-2.5 text-[10px] text-muted-foreground">
            Sponsored placements are clearly marked and do not influence organic directory ranking.
          </p>
        </section>
      )}
      {!directory && !q && recentVenues.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xl">Recently opened</h2>
          <div className="no-scrollbar flex gap-3 overflow-x-auto">
            {recentVenues.map((v) => (
              <Link
                key={v.id}
                to="/m/$slug"
                params={{ slug: v.slug }}
                className="min-w-44 rounded-lg border bg-secondary p-3"
              >
                <span className="font-semibold">{v.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Open menu again <ArrowRight className="inline h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl">
            {savedOnly
              ? "Favourites"
              : directory
                ? `${results.length} ${results.length === 1 ? "menu" : "menus"}`
                : "Discover menus"}
          </h2>
          <Button
            variant={savedOnly ? "secondary" : "ghost"}
            aria-pressed={savedOnly}
            onClick={() => setSavedOnly(!savedOnly)}
          >
            <Heart className={savedOnly ? "fill-current" : ""} />
            Saved
          </Button>
        </div>
        <div className="space-y-3">
          {results.map((v) => (
            <VenueCard key={v.id} venue={v} />
          ))}
        </div>
        {!results.length && (
          <div className="border-y py-8 text-center">
            <p>No menus found.</p>
            <Button
              variant="link"
              onClick={() => {
                setQ("");
                setService("");
                setCategory("");
                setArea("");
                setSavedOnly(false);
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </section>
      {!directory && (
        <Button asChild variant="outline" className="mt-5 h-11 w-full">
          <Link to="/directory">
            Browse directory
            <ArrowRight />
          </Link>
        </Button>
      )}
      <Link
        to="/onboarding"
        className="mt-8 block border-t pt-5 text-sm font-semibold text-primary"
      >
        Publish your business menu <ArrowRight className="inline h-4 w-4" />
      </Link>
      <CustomerNav />
    </main>
  );
}

function VenueCard({ venue }: { venue: Venue }) {
  const { favourites, toggleFavourite } = usePewa();
  const saved = favourites.includes(venue.id);
  return (
    <article className="relative overflow-hidden rounded-lg border bg-card">
      <Link to="/m/$slug" params={{ slug: venue.slug }} className="block">
        {venue.id === "venue_ggc" ? (
          <img
            src={breakfast}
            alt="Flat white, avocado toast and mandazi"
            width={1280}
            height={768}
            loading="lazy"
            className="h-44 w-full object-cover"
          />
        ) : (
          <div className="flex h-24 items-center justify-center bg-secondary font-display text-4xl text-primary">
            {venue.name[0]}
          </div>
        )}
        <div className="p-4 pr-14">
          <h3 className="font-sans font-semibold">{venue.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{venue.tagline}</p>
          <p className="mt-2 flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            {venue.deliveryOnly ? venue.serviceArea : venue.address}
          </p>
          <p className="mt-2 text-xs font-medium text-primary">{venue.services.join(" · ")}</p>
        </div>
      </Link>
      <Button
        size="icon"
        variant="secondary"
        className="absolute right-3 top-3"
        aria-label={`${saved ? "Unsave" : "Save"} ${venue.name}`}
        aria-pressed={saved}
        onClick={() => toggleFavourite(venue.id)}
      >
        <Heart className={saved ? "fill-current" : ""} />
      </Button>
    </article>
  );
}
