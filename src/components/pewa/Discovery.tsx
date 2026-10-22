import { Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  Heart,
  MapPin,
  Search,
  ArrowRight,
  Sparkles,
  Building2,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { evaluateCampaignDelivery, formatPrice, usePewa } from "@/lib/pewa/store";
import type { Menu, Offering, PromotionCampaign, SharedOffering, Venue } from "@/lib/pewa/types";
import { getVenuePublishedMenus } from "@/lib/pewa/taxonomy";
import {
  getEffectiveOffering,
  getEffectiveOfferingAvailability,
  isOfferingHiddenAtVenue,
} from "@/lib/pewa/availability";
import { canAdmitOrder, getAuthoritativeVenues, getAuthoritativeMenus } from "@/lib/pewa/ordering";
import { evaluateVenueProximity, hasVenueLocationData } from "@/lib/pewa/proximity";
import type { VenueCoordinates } from "@/lib/pewa/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomerNav } from "./CustomerNav";
import { cn } from "@/lib/utils";

export interface QualifyingOfferingMatch {
  offering: Offering;
  menuName: string;
  sectionName: string;
  score?: number;
}

export interface VenueSearchResult {
  venue: Venue;
  matchingOfferings: QualifyingOfferingMatch[];
  isVenueMatch: boolean;
  score?: number;
}

export const PRIMARY_CATEGORIES = [
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

export const NEIGHBORHOOD_FILTERS = [
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

export const CURATED_QUICK_TAGS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Halal",
  "Chef's Special",
  "Popular",
];

export function Discovery({
  directory = false,
  initialFilter,
  initialQuery = "",
  initialArea = "",
}: {
  directory?: boolean;
  initialFilter?: string | undefined;
  initialQuery?: string | undefined;
  initialArea?: string | undefined;
}) {
  const {
    organisation,
    venues,
    menus,
    sharedOfferings,
    simulatedTime,
    recents,
    clearRecents,
    removeRecent,
    favourites,
    toggleFavourite,
    campaigns,
    recordPromotionClick,
    recordPromotionImpression,
  } = usePewa();

  const [q, setQ] = useState(initialQuery);
  const [service, setService] = useState("");
  const [category, setCategory] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [area, setArea] = useState(initialArea);
  const [savedOnly, setSavedOnly] = useState(initialFilter === "saved");
  const [recentsOnly, setRecentsOnly] = useState(initialFilter === "recents");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [nearbyStatus, setNearbyStatus] = useState<
    "idle" | "requesting" | "granted" | "denied" | "unavailable" | "unsupported"
  >("idle");
  const [nearbyCoords, setNearbyCoords] = useState<VenueCoordinates | null>(null);
  const [nearbyNotice, setNearbyNotice] = useState<string | null>(null);

  useEffect(() => {
    if (initialFilter === "saved") setSavedOnly(true);
    if (initialFilter === "recents") setRecentsOnly(true);
    if (initialQuery) setQ(initialQuery);
    if (initialArea) setArea(initialArea);
  }, [initialFilter, initialQuery, initialArea]);

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

  const query = q.trim().toLowerCase();
  const queryTokens = query.split(/\s+/).filter(Boolean);

  const results: VenueSearchResult[] = live.flatMap((v) => {
    // 1. Venue-level filters
    if (savedOnly && !favourites.includes(v.id)) return [];
    if (recentsOnly && !recents.includes(v.id)) return [];
    if (service && !v.services.includes(service)) return [];

    // Proximity / Nearby filter based on genuine coordinates or delivery coverage
    if (nearbyStatus === "granted" && nearbyCoords) {
      const prox = evaluateVenueProximity(v, nearbyCoords);
      if (!prox.isNearby) {
        return [];
      }
    }

    const venueLoc = (v.deliveryOnly ? v.serviceArea : v.address).toLowerCase();

    if (area) {
      const areaFilter = NEIGHBORHOOD_FILTERS.find(
        (f) => f.id === area || f.label.toLowerCase() === area.toLowerCase(),
      );
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

    // Map which query tokens match venue text, delivery mode, or area aliases
    const venueMatchedTokens = new Set<string>();
    for (const tok of queryTokens) {
      if (
        venueText.includes(tok) ||
        (v.deliveryOnly && (tok === "delivery" || tok === "kitchen" || tok === "cloud"))
      ) {
        venueMatchedTokens.add(tok);
      } else {
        const matchingAreaFilter = NEIGHBORHOOD_FILTERS.find(
          (f) =>
            f.id.includes(tok) ||
            f.label.toLowerCase().includes(tok) ||
            f.matches.some((m) => m.includes(tok)),
        );
        if (matchingAreaFilter && matchingAreaFilter.matches.some((m) => venueLoc.includes(m))) {
          venueMatchedTokens.add(tok);
        }
      }
    }
    const venueMatchesAllTokens =
      queryTokens.length > 0 && queryTokens.every((tok) => venueMatchedTokens.has(tok));

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

          // Check offering query tokens match
          const offNameLower = o.name.toLowerCase();
          const offDescLower = (o.description || "").toLowerCase();
          const sNameLower = s.name.toLowerCase();
          const offTagsLower = (o.tags || []).map((t) => t.toLowerCase());

          const offMatchedTokens = new Set<string>();
          for (const tok of queryTokens) {
            if (
              offNameLower.includes(tok) ||
              offDescLower.includes(tok) ||
              sNameLower.includes(tok) ||
              offTagsLower.some((t) => t.includes(tok)) ||
              (o.specialBadge && o.specialBadge.toLowerCase().includes(tok))
            ) {
              offMatchedTokens.add(tok);
            }
          }

          // Check if offering satisfies query (directly or via compound match with venue)
          const directMatch =
            queryTokens.length === 0 || queryTokens.every((tok) => offMatchedTokens.has(tok));
          const compoundMatch =
            queryTokens.length > 0 &&
            offMatchedTokens.size > 0 &&
            queryTokens.every((tok) => venueMatchedTokens.has(tok) || offMatchedTokens.has(tok));

          if (directMatch || compoundMatch) {
            // Calculate deterministic offering score
            let offScore = 0;
            if (query && offNameLower === query) offScore += 120;
            else if (query && offNameLower.startsWith(query)) offScore += 90;
            else if (query && offNameLower.includes(query)) offScore += 60;

            for (const tok of queryTokens) {
              if (offNameLower === tok) offScore += 50;
              else if (offNameLower.startsWith(tok)) offScore += 35;
              else if (offNameLower.includes(tok)) offScore += 20;

              if (offTagsLower.some((t) => t === tok)) offScore += 40;
              else if (offTagsLower.some((t) => t.includes(tok))) offScore += 25;

              if (sNameLower.includes(tok)) offScore += 20;
              if (offDescLower.includes(tok)) offScore += 10;
            }

            qualifyingOfferings.push({
              offering: o,
              menuName: m.name,
              sectionName: s.name,
              score: offScore,
            });
          }
        }
      }
    }

    // Sort qualifying offerings deterministically by score descending, then offering name when a query is active
    if (queryTokens.length > 0) {
      qualifyingOfferings.sort((a, b) => {
        const scoreDiff = (b.score || 0) - (a.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return a.offering.name.localeCompare(b.offering.name);
      });
    }

    // 3. Determine if the business qualifies:
    if (tagFilter && qualifyingOfferings.length === 0) {
      return [];
    }

    if (isSectionCategory && qualifyingOfferings.length === 0) {
      return [];
    }

    const isVenueMatch = Boolean(queryTokens.length > 0 && venueMatchesAllTokens);
    if (queryTokens.length > 0) {
      const hasQualifyingItem =
        qualifyingOfferings.length > 0 && qualifyingOfferings.some((item) => (item.score || 0) > 0);
      const directVenueMatch = isVenueMatch && (!tagFilter || qualifyingOfferings.length > 0);

      if (!hasQualifyingItem && !directVenueMatch) {
        return [];
      }
    }

    // Calculate deterministic venue score
    let venueScore = 0;
    const vNameLower = v.name.toLowerCase();
    if (query && vNameLower === query) venueScore += 200;
    else if (query && vNameLower.startsWith(query)) venueScore += 150;
    else if (query && vNameLower.includes(query)) venueScore += 100;

    for (const tok of queryTokens) {
      if (vNameLower === tok) venueScore += 60;
      else if (vNameLower.startsWith(tok)) venueScore += 45;
      else if (vNameLower.includes(tok)) venueScore += 30;

      if ((v.category || "").toLowerCase().includes(tok)) venueScore += 35;
      if (venueLoc.includes(tok)) venueScore += 30;
      if ((v.tagline || "").toLowerCase().includes(tok)) venueScore += 15;
      if (v.services.some((srv) => srv.toLowerCase().includes(tok))) venueScore += 15;
      if (v.deliveryOnly && (tok === "delivery" || tok === "cloud" || tok === "kitchen")) {
        venueScore += 35;
      }
    }

    // Add top offering score contribution
    const topOffScore = qualifyingOfferings.length > 0 ? qualifyingOfferings[0]?.score || 0 : 0;
    venueScore += topOffScore;

    // Compound bonus: if multiple tokens and both venue & offering matched
    if (queryTokens.length > 1 && venueMatchedTokens.size > 0 && qualifyingOfferings.length > 0) {
      venueScore += 25;
    }

    return [{ venue: v, matchingOfferings: qualifyingOfferings, isVenueMatch, score: venueScore }];
  });

  // Sort overall results deterministically by score when a query is present, or by recent visit order when recentsOnly is active
  if (queryTokens.length > 0) {
    results.sort((a, b) => {
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return a.venue.name.localeCompare(b.venue.name);
    });
  } else if (recentsOnly) {
    results.sort((a, b) => recents.indexOf(a.venue.id) - recents.indexOf(b.venue.id));
  }

  const recentVenues = recents.flatMap((id) => {
    const v = live.find((x) => x.id === id);
    return v ? [v] : [];
  });

  const unavailableRecents = recents.flatMap((id) => {
    if (live.some((x) => x.id === id)) return [];
    const v = allVenues.find((x) => x.id === id);
    return [{ id, name: v?.name || "Previously visited menu" }];
  });

  const favouriteVenues = favourites.flatMap((id) => {
    const v = live.find((x) => x.id === id);
    return v ? [v] : [];
  });

  const unavailableFavourites = favourites.flatMap((id) => {
    if (live.some((x) => x.id === id)) return [];
    const v = allVenues.find((x) => x.id === id);
    return [{ id, name: v?.name || "Saved business" }];
  });

  const recordedImpressionsRef = useRef<Set<string>>(new Set());
  const [deliveredInViewIds, setDeliveredInViewIds] = useState<string[]>([]);

  const activeCampaigns = useMemo(
    () =>
      campaigns.filter((c) => {
        const evaluation = evaluateCampaignDelivery(c, {
          organisation,
          venues,
          menus,
          referenceTimeIso: simulatedTime,
        });
        if (evaluation.eligible) return true;
        // Requirement 11: Ensure a campaign exhausted by its qualifying impression does not
        // immediately disappear from the already displayed customer placement.
        if (evaluation.state === "exhausted" && deliveredInViewIds.includes(c.id)) {
          return true;
        }
        return false;
      }),
    [campaigns, organisation, venues, menus, simulatedTime, deliveredInViewIds],
  );

  const handleQualifyingExposure = (campaignId: string) => {
    if (recordedImpressionsRef.current.has(campaignId)) return;
    recordedImpressionsRef.current.add(campaignId);
    setDeliveredInViewIds((prev) => (prev.includes(campaignId) ? prev : [...prev, campaignId]));
    recordPromotionImpression(campaignId);
  };

  const venuesWithLocationData = useMemo(() => live.filter((v) => hasVenueLocationData(v)), [live]);

  const activeFilterCount =
    (category ? 1 : 0) +
    (area ? 1 : 0) +
    (tagFilter ? 1 : 0) +
    (service ? 1 : 0) +
    (savedOnly ? 1 : 0) +
    (recentsOnly ? 1 : 0) +
    (nearbyStatus === "granted" && nearbyCoords !== null ? 1 : 0);

  const hasActiveFilters = Boolean(
    q ||
    category ||
    area ||
    tagFilter ||
    service ||
    savedOnly ||
    recentsOnly ||
    (nearbyStatus === "granted" && nearbyCoords !== null),
  );

  const clearAllFilters = () => {
    setQ("");
    setService("");
    setCategory("");
    setTagFilter("");
    setArea("");
    setSavedOnly(false);
    setRecentsOnly(false);
    setNearbyStatus("idle");
    setNearbyCoords(null);
    setNearbyNotice(null);
  };

  const handleSeeNearby = () => {
    if (nearbyStatus === "granted") {
      setNearbyStatus("idle");
      setNearbyCoords(null);
      setNearbyNotice(null);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNearbyStatus("unsupported");
      setNearbyCoords(null);
      setNearbyNotice(
        "Location services are not supported by this browser. You can search by area (e.g. Westlands, CBD) or select an area manually.",
      );
      return;
    }

    setNearbyStatus("requesting");
    setNearbyNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: VenueCoordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        // Preserving customer privacy: coordinates are held strictly in component memory and never persisted
        setNearbyCoords(coords);
        setNearbyStatus("granted");

        const dataAvailableVenues = live.filter((v) => hasVenueLocationData(v));
        if (dataAvailableVenues.length === 0) {
          setNearbyNotice(
            "Precise nearby matching is not available because venue location data is incomplete. You can search by area or select a neighborhood manually.",
          );
        } else {
          const matchingVenues = live.filter((v) => evaluateVenueProximity(v, coords).isNearby);
          if (matchingVenues.length === 0) {
            setNearbyNotice(
              "No businesses found within your nearby radius (~3 km) based on your current location. You can browse all venues or select an area manually.",
            );
          } else {
            const allVerified = matchingVenues.every(
              (v) => evaluateVenueProximity(v, coords).isVerified,
            );
            if (allVerified) {
              setNearbyNotice("Showing verified businesses within ~3 km of your current location.");
            } else {
              setNearbyNotice(
                "Nearby preview using sample business locations (~3 km radius). Delivery coverage is an illustrative prototype estimate, not confirmed merchant delivery coverage or a service guarantee.",
              );
            }
          }
        }
      },
      (err) => {
        setNearbyCoords(null);
        if (err && err.code === 1) {
          setNearbyStatus("denied");
          setNearbyNotice(
            "Location access was denied. You can search by neighborhood (e.g. Westlands, CBD) or browse all menus.",
          );
        } else {
          setNearbyStatus("unavailable");
          setNearbyNotice(
            "Location is currently unavailable. You can search by area or browse all menus.",
          );
        }
      },
      { timeout: 5000, maximumAge: 60000 },
    );
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

      {/* Discovery Action Bar: See Nearby & Optional Filters */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant={nearbyStatus === "granted" ? "secondary" : "outline"}
            size="sm"
            onClick={handleSeeNearby}
            className={cn(
              "h-8 gap-1 rounded-full text-xs font-medium transition-colors",
              nearbyStatus === "granted" &&
                "border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
            )}
            aria-label="See nearby venues"
          >
            <MapPin
              className={cn(
                "h-3.5 w-3.5",
                nearbyStatus === "granted"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-primary",
              )}
            />
            {nearbyStatus === "granted" ? "Nearby active" : "See nearby"}
          </Button>

          <Button
            type="button"
            variant={activeFilterCount > 0 ? "secondary" : "outline"}
            size="sm"
            onClick={() => setFiltersOpen(true)}
            className="h-8 gap-1.5 rounded-full text-xs font-medium"
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Primary Category Chips */}
      <div className="mt-3">
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

      {/* Active Filter Pills (Shown only when filters are active) */}
      {hasActiveFilters && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
          {category && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 font-medium text-primary text-[11px]">
              Category: {category}
              <button
                type="button"
                onClick={() => setCategory("")}
                className="hover:opacity-75"
                aria-label="Remove category filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {area && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary border px-2 py-0.5 font-medium text-foreground text-[11px]">
              Area: {NEIGHBORHOOD_FILTERS.find((f) => f.id === area)?.label || area}
              <button
                type="button"
                onClick={() => setArea("")}
                className="hover:opacity-75"
                aria-label="Remove area filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {tagFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary border px-2 py-0.5 font-medium text-foreground text-[11px]">
              Tag: {tagFilter}
              <button
                type="button"
                onClick={() => setTagFilter("")}
                className="hover:opacity-75"
                aria-label="Remove tag filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {service && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary border px-2 py-0.5 font-medium text-foreground text-[11px]">
              Service: {service}
              <button
                type="button"
                onClick={() => setService("")}
                className="hover:opacity-75"
                aria-label="Remove service filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {savedOnly && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary border px-2 py-0.5 font-medium text-foreground text-[11px]">
              Favourites Only
              <button
                type="button"
                onClick={() => setSavedOnly(false)}
                className="hover:opacity-75"
                aria-label="Remove saved filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {recentsOnly && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary border px-2 py-0.5 font-medium text-foreground text-[11px]">
              Recently Opened
              <button
                type="button"
                onClick={() => setRecentsOnly(false)}
                className="hover:opacity-75"
                aria-label="Remove recents filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {nearbyStatus === "granted" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-400 text-[11px]">
              Nearby Preview Active
              <button
                type="button"
                onClick={() => {
                  setNearbyStatus("idle");
                  setNearbyCoords(null);
                  setNearbyNotice(null);
                }}
                className="hover:opacity-75"
                aria-label="Reset nearby location"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Nearby Notice or Denial Fallback Banner */}
      {nearbyNotice && (
        <div
          role={
            nearbyStatus === "denied" ||
            nearbyStatus === "unavailable" ||
            nearbyStatus === "unsupported"
              ? "alert"
              : "status"
          }
          className={cn(
            "mt-3 flex items-start justify-between gap-2 rounded-xl border p-3 text-xs shadow-xs",
            nearbyStatus === "granted" && results.length > 0
              ? "border-emerald-500/30 bg-emerald-50/60 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-200"
              : "border-amber-500/30 bg-amber-50/70 text-amber-950 dark:bg-amber-950/20 dark:text-amber-200",
          )}
        >
          <div className="flex items-start gap-2">
            <MapPin
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                nearbyStatus === "granted" && results.length > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400",
              )}
            />
            <div className="space-y-1">
              <p className="font-semibold">
                {nearbyStatus === "granted" && results.length > 0
                  ? "Nearby Preview (Sample Locations)"
                  : "Location Discovery Notice"}
              </p>
              <p className="text-[11px] opacity-90">{nearbyNotice}</p>

              {(nearbyStatus !== "granted" || results.length === 0) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Try area:
                  </span>
                  {NEIGHBORHOOD_FILTERS.filter((f) => f.id !== "all")
                    .slice(0, 4)
                    .map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setArea(f.id);
                          setNearbyNotice(null);
                        }}
                        className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted"
                      >
                        {f.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNearbyNotice(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
            aria-label="Dismiss location notice"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Optional Filters Dialog */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filters & Refinements</DialogTitle>
            <DialogDescription>
              Filter menus by neighborhood, category, dietary preference, or service.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Area / Neighborhood Filter */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Area / Neighborhood
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {NEIGHBORHOOD_FILTERS.map((f) => {
                  const isSelected = f.id === "all" ? !area : area === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      aria-label={f.id === "all" ? "All areas" : f.label}
                      onClick={() => setArea(f.id === "all" || isSelected ? "" : f.id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground font-semibold"
                          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Business Category or Menu Section */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Category or Cuisine
              </h4>
              <select
                aria-label="Cuisine or category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full rounded-md border bg-card px-2.5 text-xs text-foreground outline-none"
              >
                <option value="">All categories & sections</option>
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
            </div>

            {/* Dietary & Special Tags */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Dietary & Special Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {CURATED_QUICK_TAGS.map((t) => {
                  const isSelected = tagFilter.toLowerCase() === t.toLowerCase();
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTagFilter(isSelected ? "" : t)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground font-semibold"
                          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Service Types */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Service Available
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {["Dine-in", "Takeaway", "Delivery"].map((s) => {
                  const isSelected = service === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setService(isSelected ? "" : s)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground font-semibold"
                          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Saved Only */}
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="text-xs font-medium">Saved favourites only</span>
              <Button
                variant={savedOnly ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSavedOnly(!savedOnly)}
                className="h-8 text-xs gap-1"
              >
                <Heart className={cn("h-3.5 w-3.5", savedOnly && "fill-primary text-primary")} />
                {savedOnly ? "Only Saved" : "All Menus"}
              </Button>
            </div>
          </div>

          <DialogFooter className="flex-row items-center justify-between sm:justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setArea("");
                setTagFilter("");
                setService("");
                setSavedOnly(false);
              }}
              className="text-xs text-muted-foreground"
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={() => setFiltersOpen(false)}
              className="text-xs font-semibold"
            >
              Apply filters ({results.length} {results.length === 1 ? "result" : "results"})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Featured Offers (Sponsored, Home only) */}
      {!directory && !hasActiveFilters && activeCampaigns.length > 0 && (
        <section
          aria-label="Featured Offers"
          className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-4 shadow-xs"
        >
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
              const pubMenus = getVenuePublishedMenus(v, allMenus, allVenues, {
                includeProtected: false,
              });
              const pubMenu = pubMenus[0];
              if (!pubMenu) return null;
              return (
                <FeaturedCampaignPlacementCard
                  key={camp.id}
                  campaign={camp}
                  venue={v}
                  publishedMenu={pubMenu}
                  onQualifyingExposure={() => handleQualifyingExposure(camp.id)}
                  onClick={() => recordPromotionClick(camp.id)}
                />
              );
            })}
          </div>
          <p className="mt-2.5 text-[10px] text-muted-foreground">
            Sponsored placements are clearly marked and do not influence organic directory ranking.
          </p>
        </section>
      )}

      {/* Recently Visited (Home only, max 2, hidden if empty) */}
      {!directory &&
        !hasActiveFilters &&
        (recentVenues.length > 0 || unavailableRecents.length > 0) && (
          <section className="mt-6" aria-label="Recently opened">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h2 className="text-base font-bold">Recently opened</h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={clearRecents}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground underline"
                  aria-label="Clear recent history"
                >
                  Clear history
                </button>
                {recentVenues.length + unavailableRecents.length > 0 && (
                  <Link
                    to="/directory"
                    search={{ filter: "recents" }}
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
                  >
                    View all ({recentVenues.length + unavailableRecents.length}) →
                  </Link>
                )}
              </div>
            </div>
            {recentVenues.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5">
                {recentVenues.slice(0, 2).map((v) => (
                  <Link
                    key={v.id}
                    to="/m/$slug"
                    params={{ slug: v.slug }}
                    className="block rounded-xl border bg-card p-3 shadow-xs hover:border-primary transition-colors"
                  >
                    <span className="block truncate font-semibold text-sm">{v.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {v.category || "Menu"}
                    </span>
                    <span className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary">
                      Open menu <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {recentVenues.length === 0 && unavailableRecents.length > 0 && (
              <div className="rounded-xl border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground flex items-center justify-between gap-2">
                <span>
                  {unavailableRecents.length}{" "}
                  {unavailableRecents.length === 1
                    ? "recently viewed menu is"
                    : "recently viewed menus are"}{" "}
                  currently unavailable.
                </span>
                <button
                  type="button"
                  onClick={clearRecents}
                  className="shrink-0 font-semibold text-primary hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </section>
        )}

      {/* Saved Favourites (Home only, max 2, hidden if empty) */}
      {!directory &&
        !hasActiveFilters &&
        (favouriteVenues.length > 0 || unavailableFavourites.length > 0) && (
          <section className="mt-5" aria-label="Saved favourites">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-base font-bold">Saved favourites</h2>
              <Link
                to="/directory"
                search={{ filter: "saved" }}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
              >
                View all ({favouriteVenues.length + unavailableFavourites.length}) →
              </Link>
            </div>
            {favouriteVenues.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5">
                {favouriteVenues.slice(0, 2).map((v) => (
                  <div
                    key={v.id}
                    className="relative rounded-xl border bg-card p-3 shadow-xs hover:border-primary transition-colors"
                  >
                    <Link to="/m/$slug" params={{ slug: v.slug }} className="block pr-6">
                      <span className="block truncate font-semibold text-sm">{v.name}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {v.deliveryOnly ? "Delivery only" : v.address.split(",")[0]}
                      </span>
                      <span className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary">
                        <Heart className="h-3 w-3 fill-primary text-primary" /> View menu
                      </span>
                    </Link>
                    <button
                      type="button"
                      aria-label={`Unsave ${v.name}`}
                      onClick={() => toggleFavourite(v.id)}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-primary hover:bg-muted transition-colors"
                    >
                      <Heart className="h-3.5 w-3.5 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {favouriteVenues.length === 0 && unavailableFavourites.length > 0 && (
              <div className="space-y-2">
                {unavailableFavourites.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-dashed bg-muted/40 p-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-muted-foreground">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Menu currently unavailable
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={() => toggleFavourite(item.id)}
                      aria-label={`Unsave ${item.name}`}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

      {/* Organic Discover Menus List */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {savedOnly
                ? "Favourites"
                : recentsOnly
                  ? "Recently opened"
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
            {recentsOnly && recents.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearRecents}
                className="h-8 px-2.5 text-xs"
                aria-label="Clear recent history"
              >
                Clear history
              </Button>
            )}
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
              sharedOfferings={sharedOfferings}
              simulatedTime={simulatedTime}
              nearbyActive={nearbyStatus === "granted" && nearbyCoords !== null}
              nearbyCoords={nearbyCoords}
              directory={directory}
            />
          ))}
        </div>

        {/* Graceful handling of unavailable saved or recent businesses */}
        {savedOnly && unavailableFavourites.length > 0 && (
          <div className="mt-4 space-y-2 rounded-xl border border-dashed bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Unavailable saved businesses ({unavailableFavourites.length})
            </p>
            {unavailableFavourites.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Menu is currently unpublished or unavailable
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={() => toggleFavourite(item.id)}
                  aria-label={`Unsave ${item.name}`}
                >
                  Remove from saved
                </Button>
              </div>
            ))}
          </div>
        )}

        {recentsOnly && unavailableRecents.length > 0 && (
          <div className="mt-4 space-y-2 rounded-xl border border-dashed bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Previously visited menus currently unavailable ({unavailableRecents.length})
            </p>
            {unavailableRecents.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Menu is currently unpublished or archived
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={() => removeRecent(item.id)}
                  aria-label={`Remove ${item.name} from history`}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {!results.length &&
          !(savedOnly && unavailableFavourites.length > 0) &&
          !(recentsOnly && unavailableRecents.length > 0) && (
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
  sharedOfferings,
  simulatedTime,
  nearbyActive = false,
  nearbyCoords = null,
  directory = false,
}: {
  venue: Venue;
  matchingOfferings?: QualifyingOfferingMatch[];
  isVenueMatch?: boolean;
  searchQuery?: string;
  allMenus?: Menu[];
  allVenues?: Venue[];
  sharedOfferings?: SharedOffering[] | undefined;
  simulatedTime?: string | undefined;
  nearbyActive?: boolean;
  nearbyCoords?: VenueCoordinates | null;
  directory?: boolean;
}) {
  const { favourites, toggleFavourite, orderPolicy } = usePewa();
  const saved = favourites.includes(venue.id);
  const publicMenus = getVenuePublishedMenus(venue, allMenus, allVenues, {
    includeProtected: false,
  });
  const venueMenu = publicMenus[0];

  const effectivePreviewImage = useMemo(() => {
    for (const m of publicMenus) {
      if (m.coverImage) return m.coverImage;
    }
    for (const m of publicMenus) {
      const effectiveShared = m.publishedSnapshot?.sharedOfferingsSnapshot || sharedOfferings;
      for (const s of m.sections) {
        for (const rawOff of s.offerings) {
          if (isOfferingHiddenAtVenue(rawOff, venue.id, effectiveShared)) continue;
          const avail = getEffectiveOfferingAvailability(rawOff, venue.id, {
            simulatedTime,
            sharedOfferings: effectiveShared,
            venue,
          });
          if (!avail.available) continue;
          const eff = getEffectiveOffering(rawOff, venue.id, effectiveShared);
          if (eff.image) return eff.image;
        }
      }
    }
    return undefined;
  }, [publicMenus, venue, sharedOfferings, simulatedTime]);

  const isMenuOnly = !canAdmitOrder(orderPolicy);

  // Home only renders matching offering previews when a search query is active;
  // Directory retains richer preview rendering.
  const shouldRenderOfferings = directory || Boolean(searchQuery.trim());

  const proximityInfo =
    nearbyActive && nearbyCoords ? evaluateVenueProximity(venue, nearbyCoords) : null;

  const hasAddress = Boolean(venue.address && venue.address.trim().length > 0);
  const hasServiceArea = Boolean(venue.serviceArea && venue.serviceArea.trim().length > 0);

  return (
    <article
      data-testid={`venue-card-${venue.slug}`}
      className="relative overflow-hidden rounded-xl border bg-card shadow-xs transition-shadow hover:shadow-sm"
    >
      <Link to="/m/$slug" params={{ slug: venue.slug }} className="block">
        {effectivePreviewImage ? (
          <img
            src={effectivePreviewImage}
            alt={venue.name}
            loading="lazy"
            className="h-44 w-full object-cover"
          />
        ) : (
          <div className="flex h-24 items-center justify-center bg-secondary font-display text-3xl font-bold text-primary">
            {venue.name[0]}
          </div>
        )}
        <div className="p-4">
          <div className="pr-12">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="font-sans font-semibold text-base leading-snug">{venue.name}</h3>
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

            {venue.tagline && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{venue.tagline}</p>
            )}
          </div>

          {/* Location & Service-Area Context */}
          <div className="mt-2.5 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
              <div className="min-w-0 flex-1">
                {venue.deliveryOnly ? (
                  <>
                    <p className="text-foreground">
                      <span className="font-medium">Delivers to:</span>{" "}
                      {hasServiceArea ? venue.serviceArea : "Service area provided on inquiry"}
                    </p>
                    <p className="text-[11px] text-muted-foreground italic">
                      No dine-in storefront · Kitchen dispatch only (no walk-in service)
                    </p>
                    {venue.deliveryCoverageStatus !== "confirmed_merchant_coverage" &&
                      hasServiceArea && (
                        <p className="text-[10px] text-muted-foreground/90">
                          Declared dispatch area · Confirm delivery availability with business
                        </p>
                      )}
                  </>
                ) : hasAddress ? (
                  <p className="text-foreground/90">{venue.address}</p>
                ) : (
                  <p className="italic text-muted-foreground">
                    Location details unconfirmed · Contact business for directions
                  </p>
                )}

                {proximityInfo && proximityInfo.isNearby && (
                  <p className="mt-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                    {proximityInfo.isVerified
                      ? venue.deliveryOnly
                        ? "Within verified merchant delivery area"
                        : "Within ~3 km of verified storefront location"
                      : venue.deliveryOnly
                        ? "Matches prototype dispatch preview zone (illustrative)"
                        : "Within ~3 km sample reference area (illustrative)"}
                  </p>
                )}
              </div>
            </div>

            {/* Service Modes */}
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {venue.deliveryOnly ? (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Delivery only
                </span>
              ) : venue.services.length > 0 ? (
                venue.services.map((srv) => (
                  <span
                    key={srv}
                    className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                  >
                    {srv}
                  </span>
                ))
              ) : (
                <span className="text-[11px] font-medium text-primary">Direct inquiry</span>
              )}
              <span className="sr-only">
                {venue.deliveryOnly ? "Delivery only" : venue.services.join(" · ")}
              </span>
            </div>
          </div>

          {/* Contextual Matching Offerings or Business Match Explanation */}
          {shouldRenderOfferings && matchingOfferings.length > 0 ? (
            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {searchQuery.trim()
                    ? isVenueMatch
                      ? `Matched business & ${matchingOfferings.length} menu item${matchingOfferings.length > 1 ? "s" : ""}:`
                      : `${matchingOfferings.length} matching item${matchingOfferings.length > 1 ? "s" : ""}:`
                    : "Popular offerings:"}
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
                      <div className="flex items-baseline justify-between gap-1.5">
                        <span className="font-semibold text-xs truncate">{offering.name}</span>
                        <span className="shrink-0 font-bold text-xs text-primary">
                          {formatPrice(offering.price, venue.currency)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.2 font-medium">
                          {sectionName}
                        </span>
                        {offering.specialBadge && (
                          <span className="rounded-full bg-accent/20 px-1.5 py-0.2 font-semibold text-accent">
                            ★ {offering.specialBadge}
                          </span>
                        )}
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
          ) : isVenueMatch && searchQuery ? (
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

          {/* Clear Route to Business Menu CTA Footer */}
          <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-xs">
            <span className="text-[11px] text-muted-foreground truncate pr-2">
              {venueMenu ? venueMenu.name : "Published menu"}
              {publicMenus.length > 1 ? ` (+${publicMenus.length - 1} more)` : ""}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary">
              {venue.deliveryOnly
                ? "View delivery menu"
                : isMenuOnly
                  ? "View menu & contact"
                  : "View menu"}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
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

/**
 * Prototype Qualifying-Exposure Visibility Criterion (R2-D CORR-001):
 * A rendered customer-facing sponsored placement card qualifies for a delivered impression
 * only when at least 50% of the card (`QUALIFYING_EXPOSURE_MIN_RATIO = 0.5`) is intersecting
 * the browser viewport continuously for at least 300ms (`QUALIFYING_EXPOSURE_DWELL_MS = 300`).
 *
 * Note: This client-side IntersectionObserver mechanism is a deterministic prototype
 * exposure simulation and is NOT production-grade advertising billing or fraud prevention.
 */
export const QUALIFYING_EXPOSURE_MIN_RATIO = 0.5;
export const QUALIFYING_EXPOSURE_DWELL_MS = 300;

export function FeaturedCampaignPlacementCard({
  campaign,
  venue,
  publishedMenu,
  onClick,
  onQualifyingExposure,
  previewOnly = false,
}: {
  campaign: Pick<PromotionCampaign, "id" | "title" | "tagline" | "badgeText">;
  venue: Venue;
  publishedMenu?: Menu | undefined;
  onClick?: () => void;
  onQualifyingExposure?: () => void;
  previewOnly?: boolean;
}) {
  const { sharedOfferings, simulatedTime } = usePewa();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const hasQualifiedRef = useRef(false);
  const onQualifyingExposureRef = useRef(onQualifyingExposure);
  onQualifyingExposureRef.current = onQualifyingExposure;

  useEffect(() => {
    // Requirement 7: Merchant preview cards are strictly non-billable and never attach exposure observers.
    if (previewOnly) return;
    if (hasQualifiedRef.current) return;
    const el = cardRef.current;
    if (!el || typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return;
    }

    let dwellTimer: ReturnType<typeof setTimeout> | null = null;

    const clearPendingDwell = () => {
      if (dwellTimer !== null) {
        clearTimeout(dwellTimer);
        dwellTimer = null;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (hasQualifiedRef.current) {
            clearPendingDwell();
            return;
          }
          const meetsRatio =
            entry.isIntersecting &&
            (entry.intersectionRatio === undefined ||
              entry.intersectionRatio >= QUALIFYING_EXPOSURE_MIN_RATIO);

          if (meetsRatio) {
            if (dwellTimer === null) {
              dwellTimer = setTimeout(() => {
                dwellTimer = null;
                if (!hasQualifiedRef.current) {
                  hasQualifiedRef.current = true;
                  onQualifyingExposureRef.current?.();
                  observer.disconnect();
                }
              }, QUALIFYING_EXPOSURE_DWELL_MS);
            }
          } else {
            // Requirement 5: Cancel pending exposure qualification when card leaves viewport threshold
            clearPendingDwell();
          }
        }
      },
      { threshold: [0, QUALIFYING_EXPOSURE_MIN_RATIO, 1] },
    );

    observer.observe(el);

    return () => {
      // Requirement 5: Cancel pending exposure qualification on unmount
      clearPendingDwell();
      observer.disconnect();
    };
  }, [previewOnly, campaign.id]);

  const publishedCoverImage = useMemo(() => {
    if (!publishedMenu) return undefined;
    if (publishedMenu.coverImage) return publishedMenu.coverImage;
    const effectiveShared =
      publishedMenu.publishedSnapshot?.sharedOfferingsSnapshot || sharedOfferings;
    for (const s of publishedMenu.sections) {
      for (const rawOff of s.offerings) {
        if (isOfferingHiddenAtVenue(rawOff, venue.id, effectiveShared)) continue;
        const avail = getEffectiveOfferingAvailability(rawOff, venue.id, {
          simulatedTime,
          sharedOfferings: effectiveShared,
          venue,
        });
        if (!avail.available) continue;
        const eff = getEffectiveOffering(rawOff, venue.id, effectiveShared);
        if (eff.image) return eff.image;
      }
    }
    return undefined;
  }, [publishedMenu, venue, sharedOfferings, simulatedTime]);

  const locationSummary = venue.deliveryOnly
    ? `Delivery only · ${venue.serviceArea || "Declared dispatch area"}`
    : venue.address
      ? venue.address.split(",")[0]
      : "Direct inquiry";

  const content = (
    <div className="flex items-start gap-3">
      {publishedCoverImage ? (
        <img
          src={publishedCoverImage}
          alt={venue.name}
          loading="lazy"
          className="h-14 w-14 shrink-0 rounded-lg object-cover border"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-secondary font-display text-xl font-bold text-primary">
          {venue.name[0]}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {(previewOnly ||
              (campaign.badgeText && campaign.badgeText.toLowerCase() !== "sponsored")) && (
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                  Sponsored
                </span>
                {campaign.badgeText && campaign.badgeText.toLowerCase() !== "sponsored" && (
                  <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                    {campaign.badgeText}
                  </span>
                )}
              </div>
            )}
            <p className="text-sm font-semibold leading-snug text-foreground">
              {campaign.title || "Featured Offer Title"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {campaign.tagline || venue.tagline || "Available on our published menu"}
            </p>
          </div>
          <span className="shrink-0 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
            Offer
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-1.5 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground min-w-0">
            <span className="font-semibold text-primary truncate">{venue.name}</span>
            {venue.category && <span>· {venue.category}</span>}
            <span className="truncate">· {locationSummary}</span>
            {publishedMenu && (
              <span className="text-[11px] text-muted-foreground truncate">
                · {publishedMenu.name}
              </span>
            )}
          </div>
          <span className="shrink-0 font-semibold text-primary">View offer →</span>
        </div>
      </div>
    </div>
  );

  if (previewOnly) {
    return (
      <div
        data-testid={`featured-preview-${campaign.id}`}
        className="block rounded-xl border border-accent/40 bg-card p-3 shadow-xs"
      >
        {content}
      </div>
    );
  }

  return (
    <div ref={cardRef} data-campaign-id={campaign.id}>
      <Link
        to="/m/$slug"
        params={{ slug: venue.slug }}
        onClick={onClick}
        data-testid={`featured-card-${campaign.id}`}
        className="block rounded-xl border bg-card p-3 shadow-xs transition-colors hover:border-accent"
      >
        {content}
      </Link>
    </div>
  );
}
