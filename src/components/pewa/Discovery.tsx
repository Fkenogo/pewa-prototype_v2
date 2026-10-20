import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Heart,
  MapPin,
  Search,
  ArrowRight,
  Sparkles,
  Tag as TagIcon,
  Building2,
} from "lucide-react";
import { formatPrice, getLiveMenu, usePewa } from "@/lib/pewa/store";
import type { Offering, Venue } from "@/lib/pewa/types";
import { isMenuEligibleForVenue } from "@/lib/pewa/taxonomy";
import { Button } from "@/components/ui/button";
import { CustomerNav } from "./CustomerNav";
import { cn } from "@/lib/utils";
import breakfast from "@/assets/cafe-breakfast.jpg";

export interface QualifyingOfferingMatch {
  offering: Offering;
  menuName: string;
  sectionName: string;
}

export interface VenueSearchResult {
  venue: Venue;
  matchingOfferings: QualifyingOfferingMatch[];
  isVenueMatch: boolean;
}

export function Discovery({ directory = false }: { directory?: boolean }) {
  const { venues, menus, recents, favourites, campaigns, recordPromotionClick } = usePewa();
  const [q, setQ] = useState("");
  const [service, setService] = useState("");
  const [category, setCategory] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [area, setArea] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);

  // Eligible public menus for each venue (published and not protected)
  const getVenuePublicMenus = (v: Venue) =>
    menus
      .filter(
        (m) => m.status === "published" && !m.isProtected && isMenuEligibleForVenue(m, v, venues),
      )
      .map(getLiveMenu);

  const live = venues.filter((v) => getVenuePublicMenus(v).length > 0);
  const businessCategories = [...new Set(live.map((v) => v.category).filter(Boolean))] as string[];
  const sections = [
    ...new Set(
      live.flatMap((v) => getVenuePublicMenus(v).flatMap((m) => m.sections.map((s) => s.name))),
    ),
  ];
  const services = [...new Set(live.flatMap((v) => v.services))];
  const areas = [...new Set(live.map((v) => (v.deliveryOnly ? v.serviceArea : v.address)))].filter(
    Boolean,
  );

  const curatedQuickTags = [
    "Vegetarian",
    "Vegan",
    "Gluten-Free",
    "Halal",
    "Chef's Special",
    "Popular",
  ];

  const query = q.trim().toLowerCase();
  const queryTokens = query.split(/\s+/).filter(Boolean);

  const results: VenueSearchResult[] = live.flatMap((v) => {
    // 1. Venue-level filters
    if (savedOnly && !favourites.includes(v.id)) return [];
    if (service && !v.services.includes(service)) return [];
    if (area && (v.deliveryOnly ? v.serviceArea : v.address) !== area) return [];

    const isBusinessCategory = category && businessCategories.includes(category);
    const isSectionCategory = category && !isBusinessCategory;

    if (isBusinessCategory && v.category?.toLowerCase() !== category.toLowerCase()) {
      return [];
    }

    const venueText = [v.name, v.tagline, v.category || "", v.address, v.serviceArea, ...v.services]
      .join(" ")
      .toLowerCase();

    const venueMatchesQuery =
      queryTokens.length > 0 && queryTokens.every((tok) => venueText.includes(tok));

    // 2. Offering-level analysis across eligible public menus
    const venueMenus = getVenuePublicMenus(v);
    const qualifyingOfferings: QualifyingOfferingMatch[] = [];

    for (const m of venueMenus) {
      for (const s of m.sections) {
        if (isSectionCategory && s.name.toLowerCase() !== category.toLowerCase()) {
          continue;
        }
        for (const o of s.offerings) {
          // Protected, unpublished, hidden, or sold-out offerings do not satisfy search criteria
          if (!o.available) continue;

          // Check tag filter
          if (tagFilter && !o.tags?.some((t) => t.toLowerCase() === tagFilter.toLowerCase())) {
            continue;
          }

          // Check offering query match
          const offText = [o.name, o.description, s.name, ...(o.tags || []), o.specialBadge || ""]
            .join(" ")
            .toLowerCase();

          const offMatchesQuery =
            queryTokens.length === 0 || queryTokens.every((tok) => offText.includes(tok));

          if (offMatchesQuery) {
            qualifyingOfferings.push({
              offering: o,
              menuName: m.name,
              sectionName: s.name,
            });
          }
        }
      }
    }

    // 3. Determine if the business qualifies:
    // If a tag filter is active, at least one offering MUST match the tag filter
    if (tagFilter && qualifyingOfferings.length === 0) {
      return [];
    }

    // If a section category was selected, at least one offering MUST be in that section
    if (isSectionCategory && qualifyingOfferings.length === 0) {
      return [];
    }

    // If a search query is active:
    const isVenueMatch = Boolean(queryTokens.length > 0 && venueMatchesQuery);
    if (queryTokens.length > 0) {
      const hasQualifyingItem = qualifyingOfferings.length > 0;
      const directVenueMatch = venueMatchesQuery && (!tagFilter || qualifyingOfferings.length > 0);

      if (!hasQualifyingItem && !directVenueMatch) {
        return [];
      }
    }

    return [{ venue: v, matchingOfferings: qualifyingOfferings, isVenueMatch }];
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

      {/* Main Search Input */}
      <label className="mt-5 flex h-12 items-center gap-2 rounded-lg border bg-card px-3 focus-within:ring-2 focus-within:ring-ring">
        <Search className="h-5 w-5 text-muted-foreground shrink-0" />
        <input
          aria-label="Search menus"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Business, dish, category or tag"
          className="h-full min-w-0 flex-1 bg-transparent outline-none text-base"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </label>

      {/* Dietary & Highlight Quick Tag Pills */}
      <div className="no-scrollbar mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setTagFilter("")}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            !tagFilter
              ? "border-primary bg-primary text-primary-foreground font-semibold"
              : "border-border bg-card text-muted-foreground hover:bg-muted",
          )}
        >
          All
        </button>
        {curatedQuickTags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTagFilter(tagFilter === t ? "" : t)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              tagFilter === t
                ? "border-primary bg-primary text-primary-foreground font-semibold"
                : "border-border bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {directory && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            aria-label="Cuisine or category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 min-w-0 rounded-md border bg-card px-2 text-sm"
          >
            <option value="">All categories</option>
            {businessCategories.length > 0 && (
              <optgroup label="Business Categories">
                {businessCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
            )}
            {sections.length > 0 && (
              <optgroup label="Menu Sections">
                {sections.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <select
            aria-label="Service filter"
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="h-11 min-w-0 rounded-md border bg-card px-2 text-sm"
          >
            <option value="">All services</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
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
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {!directory && !q && !tagFilter && campaigns.filter((c) => c.active).length > 0 && (
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
                      <span>View offer →</span>
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

      {!directory && !q && !tagFilter && recentVenues.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-semibold">Recently opened</h2>
          <div className="no-scrollbar flex gap-3 overflow-x-auto">
            {recentVenues.map((v) => (
              <Link
                key={v.id}
                to="/m/$slug"
                params={{ slug: v.slug }}
                className="min-w-44 rounded-lg border bg-secondary p-3 shadow-xs"
              >
                <span className="font-semibold block truncate">{v.name}</span>
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
          <div>
            <h2 className="text-xl font-semibold">
              {savedOnly
                ? "Favourites"
                : directory
                  ? `${results.length} ${results.length === 1 ? "menu" : "menus"}`
                  : "Discover menus"}
            </h2>
            {tagFilter && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Filtered by tag: <span className="font-semibold text-primary">{tagFilter}</span>
              </p>
            )}
          </div>
          <Button
            variant={savedOnly ? "secondary" : "ghost"}
            aria-pressed={savedOnly}
            onClick={() => setSavedOnly(!savedOnly)}
          >
            <Heart className={savedOnly ? "fill-current text-primary" : ""} />
            Saved
          </Button>
        </div>
        <div className="space-y-3">
          {results.map(({ venue, matchingOfferings, isVenueMatch }) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              matchingOfferings={matchingOfferings}
              isVenueMatch={isVenueMatch}
              searchQuery={q}
            />
          ))}
        </div>
        {!results.length && (
          <div className="border-y py-8 text-center space-y-2">
            <p className="text-muted-foreground">No menus match your active filters.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQ("");
                setService("");
                setCategory("");
                setTagFilter("");
                setArea("");
                setSavedOnly(false);
              }}
            >
              Clear all filters
            </Button>
          </div>
        )}
      </section>

      {!directory && (
        <Button asChild variant="outline" className="mt-5 h-11 w-full font-semibold">
          <Link to="/directory">
            Browse full directory
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

function VenueCard({
  venue,
  matchingOfferings = [],
  isVenueMatch = false,
  searchQuery = "",
}: {
  venue: Venue;
  matchingOfferings?: QualifyingOfferingMatch[];
  isVenueMatch?: boolean;
  searchQuery?: string;
}) {
  const { favourites, toggleFavourite, menus, venues } = usePewa();
  const saved = favourites.includes(venue.id);
  const venueMenuRaw = menus.find(
    (m) => m.status === "published" && !m.isProtected && isMenuEligibleForVenue(m, venue, venues),
  );
  const venueMenu = venueMenuRaw ? getLiveMenu(venueMenuRaw) : undefined;
  const previewImage = venueMenu?.sections.flatMap((s) => s.offerings).find((o) => o.image)?.image;

  return (
    <article className="relative overflow-hidden rounded-xl border bg-card shadow-xs transition-shadow hover:shadow-sm">
      <Link to="/m/$slug" params={{ slug: venue.slug }} className="block">
        {venue.id === "venue_ggc" ? (
          <img
            src={breakfast}
            alt="Green Garden Café breakfast platter"
            width={1280}
            height={768}
            loading="lazy"
            className="h-44 w-full object-cover"
          />
        ) : previewImage ? (
          <img
            src={previewImage}
            alt={venue.name}
            loading="lazy"
            className="h-36 w-full object-cover"
          />
        ) : (
          <div className="flex h-20 items-center justify-center bg-secondary font-display text-3xl font-bold text-primary">
            {venue.name[0]}
          </div>
        )}
        <div className="p-4 pr-14">
          <div className="flex items-center gap-2">
            <h3 className="font-sans font-semibold text-base">{venue.name}</h3>
            {venue.category && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {venue.category}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{venue.tagline}</p>
          <p className="mt-2 flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {venue.deliveryOnly ? `Delivers to ${venue.serviceArea}` : venue.address}
          </p>
          <p className="mt-2 text-xs font-medium text-primary">{venue.services.join(" · ")}</p>

          {/* Contextual Matching Offerings or Business Match Explanation */}
          {matchingOfferings.length > 0 ? (
            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {isVenueMatch
                    ? `Matched business & ${matchingOfferings.length} menu item${matchingOfferings.length > 1 ? "s" : ""}:`
                    : `${matchingOfferings.length} matching item${matchingOfferings.length > 1 ? "s" : ""}:`}
                </span>
              </div>
              <div className="mt-1.5 space-y-1">
                {matchingOfferings.slice(0, 2).map(({ offering, sectionName }) => (
                  <div
                    key={offering.id}
                    className="flex items-baseline justify-between gap-2 text-foreground"
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{offering.name}</span>
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        ({sectionName})
                      </span>
                      {offering.tags?.length > 0 && (
                        <span className="ml-1.5 text-[10px] text-primary/80">
                          · {offering.tags.slice(0, 2).join(", ")}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 font-semibold text-xs">
                      {formatPrice(offering.price, venue.currency)}
                    </span>
                  </div>
                ))}
                {matchingOfferings.length > 2 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{matchingOfferings.length - 2} more item
                    {matchingOfferings.length - 2 > 1 ? "s" : ""} on menu
                  </p>
                )}
              </div>
            </div>
          ) : isVenueMatch ? (
            <div className="mt-3 rounded-lg border border-border bg-muted/40 p-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>Matched business: {venue.name}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                No individual menu items matched "{searchQuery.trim()}". Tap to view full menu.
              </p>
            </div>
          ) : null}
        </div>
      </Link>
      <Button
        size="icon"
        variant="secondary"
        className="absolute right-3 top-3 h-9 w-9 rounded-full bg-background/80 backdrop-blur shadow-xs"
        aria-label={`${saved ? "Unsave" : "Save"} ${venue.name}`}
        aria-pressed={saved}
        onClick={(e) => {
          e.preventDefault();
          toggleFavourite(venue.id);
        }}
      >
        <Heart className={saved ? "fill-current text-primary" : "text-muted-foreground"} />
      </Button>
    </article>
  );
}
