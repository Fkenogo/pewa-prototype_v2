import { Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  Heart,
  MapPin,
  Search,
  ArrowRight,
  Sparkles,
  Tag as TagIcon,
  Building2,
  X,
} from "lucide-react";
import { formatPrice, usePewa } from "@/lib/pewa/store";
import type { Menu, Offering, Venue } from "@/lib/pewa/types";
import { getVenuePublishedMenus } from "@/lib/pewa/taxonomy";
import {
  getEffectiveOffering,
  getEffectiveOfferingAvailability,
  isOfferingHiddenAtVenue,
} from "@/lib/pewa/availability";
import { canAdmitOrder, getAuthoritativeVenues, getAuthoritativeMenus } from "@/lib/pewa/ordering";
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

const PRIMARY_CATEGORIES = [
  { id: "all", label: "All", emoji: "", category: "" },
  { id: "cafe", label: "Cafés", emoji: "☕", category: "Café" },
  { id: "bakery", label: "Bakeries", emoji: "🥐", category: "Artisan Bakery" },
  {
    id: "restaurant",
    label: "Restaurants & Grills",
    emoji: "🥩",
    category: "Hotel & Hospitality",
  },
  {
    id: "cloud-kitchen",
    label: "Cloud Kitchens",
    emoji: "🛵",
    category: "Delivery & Cloud Kitchen",
  },
  {
    id: "gelato",
    label: "Gelato & Sweets",
    emoji: "🍨",
    category: "Artisan Gelato & Desserts",
  },
];

const NEIGHBORHOOD_FILTERS = [
  { id: "all", label: "All Areas", matches: [] as string[] },
  {
    id: "cbd",
    label: "CBD",
    matches: ["cbd", "moi avenue", "moi ave", "city centre", "central business district"],
  },
  {
    id: "westlands",
    label: "Westlands",
    matches: ["westlands", "karuna close"],
  },
  {
    id: "riverside",
    label: "Riverside",
    matches: ["riverside", "riverside drive"],
  },
  {
    id: "kilimani",
    label: "Kilimani & Lavington",
    matches: ["kilimani", "lavington"],
  },
  {
    id: "village-market",
    label: "Village Market",
    matches: ["village market", "gigiri", "courtyard"],
  },
];

const CURATED_QUICK_TAGS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Halal",
  "Chef's Special",
  "Popular",
];

export function Discovery({ directory = false }: { directory?: boolean }) {
  const {
    venues,
    menus,
    sharedOfferings,
    simulatedTime,
    recents,
    favourites,
    campaigns,
    recordPromotionClick,
    recordPromotionImpression,
  } = usePewa();
  const [q, setQ] = useState("");
  const [service, setService] = useState("");
  const [category, setCategory] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [area, setArea] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);

  // Authoritative catalogue representation shared with cart and order submission
  const allVenues = useMemo(() => getAuthoritativeVenues({ venues }), [venues]);
  const allMenus = useMemo(() => getAuthoritativeMenus({ menus }), [menus]);

  // Eligible public menus for each venue (published and not protected, evaluated against effective published snapshot)
  const getVenuePublicMenus = (v: Venue) =>
    getVenuePublishedMenus(v, allMenus, allVenues, { includeProtected: false });

  const live = allVenues.filter((v) => getVenuePublicMenus(v).length > 0);
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

  const query = q.trim().toLowerCase();
  const queryTokens = query.split(/\s+/).filter(Boolean);

  const results: VenueSearchResult[] = live.flatMap((v) => {
    // 1. Venue-level filters
    if (savedOnly && !favourites.includes(v.id)) return [];
    if (service && !v.services.includes(service)) return [];

    if (area) {
      const venueLoc = (v.deliveryOnly ? v.serviceArea : v.address).toLowerCase();
      const areaFilter = NEIGHBORHOOD_FILTERS.find((f) => f.id === area || f.label === area);
      if (areaFilter && areaFilter.matches.length > 0) {
        const matchesAny = areaFilter.matches.some((term) => venueLoc.includes(term.toLowerCase()));
        if (!matchesAny) return [];
      } else if (!areaFilter && area.toLowerCase() !== "all") {
        if (!venueLoc.includes(area.toLowerCase())) return [];
      }
    }

    const isBusinessCategory =
      Boolean(category) &&
      businessCategories.some((c) => c.toLowerCase() === category.toLowerCase());

    const isSectionCategory =
      Boolean(category) &&
      !isBusinessCategory &&
      sections.some((s) => s.toLowerCase() === category.toLowerCase());

    if (category && !isSectionCategory) {
      const cat = category.toLowerCase();
      const venueCat = (v.category || "").toLowerCase();
      const matchesCat =
        venueCat === cat ||
        (cat === "café" && venueCat.includes("café")) ||
        (cat === "artisan bakery" && (venueCat.includes("bakery") || venueCat.includes("bread"))) ||
        (cat === "hotel & hospitality" &&
          (venueCat.includes("hotel") ||
            venueCat.includes("restaurant") ||
            venueCat.includes("hospitality"))) ||
        (cat === "delivery & cloud kitchen" &&
          (venueCat.includes("delivery") || venueCat.includes("cloud") || v.deliveryOnly)) ||
        (cat === "artisan gelato & desserts" &&
          (venueCat.includes("gelato") || venueCat.includes("dessert")));

      if (!matchesCat) {
        return [];
      }
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
      const effectiveShared = m.publishedSnapshot?.sharedOfferingsSnapshot || sharedOfferings;
      for (const s of m.sections) {
        if (isSectionCategory && s.name.toLowerCase() !== category.toLowerCase()) {
          continue;
        }
        for (const rawOffering of s.offerings) {
          if (isOfferingHiddenAtVenue(rawOffering, v.id, effectiveShared)) continue;
          const availability = getEffectiveOfferingAvailability(rawOffering, v.id, {
            simulatedTime,
            sharedOfferings: effectiveShared,
            venue: v,
          });
          if (!availability.available) continue;
          const o = getEffectiveOffering(rawOffering, v.id, effectiveShared);

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

  const activeCampaigns = campaigns.filter((c) => c.active);
  const hasActiveFilters = Boolean(q || category || area || tagFilter || service || savedOnly);

  const recordedImpressionsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!directory && !hasActiveFilters && activeCampaigns.length > 0) {
      for (const camp of activeCampaigns) {
        if (!recordedImpressionsRef.current.has(camp.id)) {
          recordedImpressionsRef.current.add(camp.id);
          recordPromotionImpression(camp.id);
        }
      }
    }
  }, [directory, hasActiveFilters, activeCampaigns, recordPromotionImpression]);

  const clearAllFilters = () => {
    setQ("");
    setService("");
    setCategory("");
    setTagFilter("");
    setArea("");
    setSavedOnly(false);
  };

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-28 pt-5">
      <header className="mb-4 pr-32">
        <Link to="/" className="font-display text-3xl font-bold text-primary">
          pewa
        </Link>
      </header>
      <h1 className="text-3xl leading-tight">
        {directory ? "Menu directory" : "What’s on the menu?"}
      </h1>
      {!directory && (
        <p className="mt-1 text-sm text-muted-foreground">
          Local menus. Straight from the business. No app needed.
        </p>
      )}

      {/* Main Search Input */}
      <label className="mt-4 flex h-12 items-center gap-2 rounded-xl border bg-card px-3 shadow-xs focus-within:ring-2 focus-within:ring-ring">
        <Search className="h-5 w-5 text-muted-foreground shrink-0" />
        <input
          aria-label="Search menus"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search businesses, dishes, or dietary tags…"
          className="h-full min-w-0 flex-1 bg-transparent outline-none text-base"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </label>

      {/* Primary Category Chips */}
      <div className="mt-3.5">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
          {PRIMARY_CATEGORIES.map((cat) => {
            const isSelected =
              cat.id === "all"
                ? !category
                : category.toLowerCase() === (cat.category || cat.id).toLowerCase();
            return (
              <button
                key={cat.id}
                type="button"
                aria-label={cat.id === "all" ? "All categories" : cat.label}
                onClick={() => {
                  if (cat.id === "all" || isSelected) {
                    setCategory("");
                  } else {
                    setCategory(cat.category || cat.id);
                  }
                }}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {cat.emoji && <span>{cat.emoji}</span>}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Neighborhood & Nearby Area Filter Chips */}
      <div className="mt-2">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-muted-foreground">
          <span className="shrink-0 flex items-center gap-0.5 font-medium pl-0.5 text-[11px]">
            <MapPin className="h-3 w-3" />
            Area:
          </span>
          {NEIGHBORHOOD_FILTERS.map((f) => {
            const isSelected = f.id === "all" ? !area : area === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-label={f.id === "all" ? "All areas" : f.label}
                onClick={() => {
                  if (f.id === "all" || isSelected) {
                    setArea("");
                  } else {
                    setArea(f.id);
                  }
                }}
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  isSelected
                    ? "border-foreground bg-foreground text-background font-semibold shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dietary & Highlight Quick Tag Pills */}
      <div className="mt-2">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-muted-foreground">
          <span className="shrink-0 flex items-center gap-0.5 font-medium pl-0.5 text-[11px]">
            <TagIcon className="h-3 w-3" />
            Tags:
          </span>
          <button
            type="button"
            aria-label="All tags"
            onClick={() => setTagFilter("")}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              !tagFilter
                ? "border-primary bg-primary text-primary-foreground font-semibold"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            All
          </button>
          {CURATED_QUICK_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTagFilter(tagFilter === t ? "" : t)}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                tagFilter === t
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
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

      {/* Featured Offers (Sponsored) */}
      {!directory && !hasActiveFilters && activeCampaigns.length > 0 && (
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
            {activeCampaigns.map((camp) => {
              const v = allVenues.find((x) => x.id === camp.venueId);
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

      {/* Recently Visited */}
      {!directory && !hasActiveFilters && recentVenues.length > 0 && (
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

      {/* Organic Discover Menus List */}
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
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>
                {results.length} {results.length === 1 ? "business" : "businesses"}
              </span>
              {tagFilter && (
                <span>
                  · Tag: <span className="font-semibold text-primary">{tagFilter}</span>
                </span>
              )}
              {category && (
                <span>
                  · Category: <span className="font-semibold text-primary">{category}</span>
                </span>
              )}
              {area && (
                <span>
                  · Area:{" "}
                  <span className="font-semibold text-foreground">
                    {NEIGHBORHOOD_FILTERS.find((f) => f.id === area)?.label || area}
                  </span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
            <Button
              variant={savedOnly ? "secondary" : "ghost"}
              aria-pressed={savedOnly}
              onClick={() => setSavedOnly(!savedOnly)}
              size="sm"
              className="h-8"
            >
              <Heart className={savedOnly ? "fill-current text-primary" : ""} />
              Saved
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {results.map(({ venue, matchingOfferings, isVenueMatch }) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              matchingOfferings={matchingOfferings}
              isVenueMatch={isVenueMatch}
              searchQuery={q}
              allMenus={allMenus}
              allVenues={allVenues}
            />
          ))}
        </div>

        {!results.length && (
          <div className="border-y py-8 text-center space-y-2">
            <p className="text-muted-foreground">No menus match your active filters.</p>
            <Button variant="outline" size="sm" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          </div>
        )}
      </section>

      {!directory && (
        <Button asChild variant="outline" className="mt-6 h-11 w-full font-semibold">
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
  allMenus = [],
  allVenues = [],
}: {
  venue: Venue;
  matchingOfferings?: QualifyingOfferingMatch[];
  isVenueMatch?: boolean;
  searchQuery?: string;
  allMenus?: Menu[];
  allVenues?: Venue[];
}) {
  const { favourites, toggleFavourite, orderPolicy } = usePewa();
  const saved = favourites.includes(venue.id);
  const venueMenu = getVenuePublishedMenus(venue, allMenus, allVenues, {
    includeProtected: false,
  })[0];
  const previewImage = venueMenu?.sections.flatMap((s) => s.offerings).find((o) => o.image)?.image;
  const isMenuOnly = !canAdmitOrder(orderPolicy);

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
            className="h-40 w-full object-cover"
          />
        ) : (
          <div className="flex h-24 items-center justify-center bg-secondary font-display text-3xl font-bold text-primary">
            {venue.name[0]}
          </div>
        )}
        <div className="p-4 pr-14">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-sans font-semibold text-base">{venue.name}</h3>
            {venue.category && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {venue.category}
              </span>
            )}
            {venue.deliveryOnly && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/20">
                🛵 Delivery Only
              </span>
            )}
            {isMenuOnly && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground border">
                📖 Menu & Direct Contact
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{venue.tagline}</p>

          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p className="flex items-start gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
              <span>
                {venue.deliveryOnly ? (
                  <>
                    <span className="font-medium text-foreground">Delivers to:</span>{" "}
                    {venue.serviceArea}
                    <span className="block text-[11px] text-muted-foreground italic">
                      No dine-in storefront · Kitchen dispatch only
                    </span>
                  </>
                ) : (
                  venue.address
                )}
              </span>
            </p>
            <p className="font-medium text-primary text-[11px]">
              {venue.deliveryOnly ? "Delivery only" : venue.services.join(" · ")}
            </p>
          </div>

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
              <div className="mt-2 space-y-2">
                {matchingOfferings.slice(0, 3).map(({ offering, sectionName }) => (
                  <div
                    key={offering.id}
                    className="flex items-center gap-2.5 rounded-md border bg-card/80 p-2 text-foreground transition-colors hover:bg-card"
                  >
                    {offering.image ? (
                      <img
                        src={offering.image}
                        alt={offering.name}
                        loading="lazy"
                        className="h-11 w-11 shrink-0 rounded-md object-cover border"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-muted text-lg">
                        {offering.emoji || "🍽️"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="font-semibold text-xs truncate">{offering.name}</span>
                        <span className="shrink-0 font-bold text-xs text-primary">
                          {formatPrice(offering.price, venue.currency)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.2 font-medium">
                          {sectionName}
                        </span>
                        {offering.tags?.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-primary/10 px-1.5 py-0.2 font-medium text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {matchingOfferings.length > 3 && (
                  <p className="pt-0.5 text-[10px] text-muted-foreground">
                    +{matchingOfferings.length - 3} more item
                    {matchingOfferings.length - 3 > 1 ? "s" : ""} on menu
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
