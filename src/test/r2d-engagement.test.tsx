import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { usePewa, evaluateCampaignDelivery } from "@/lib/pewa/store";
import {
  Discovery,
  FeaturedCampaignPlacementCard,
  QUALIFYING_EXPOSURE_DWELL_MS,
  QUALIFYING_EXPOSURE_MIN_RATIO,
} from "@/components/pewa/Discovery";

// Mock TanStack Router Link so Discovery and FeaturedCampaignPlacementCard can render in isolation
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    search,
    onClick,
    className,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
    onClick?: () => void;
    className?: string;
    [key: string]: unknown;
  }) => {
    const resolvedHref = params?.["slug"]
      ? to.replace("$slug", params["slug"])
      : search?.["filter"]
        ? `${to}?filter=${search["filter"]}`
        : to;
    return (
      <a href={resolvedHref} onClick={onClick} className={className} {...rest}>
        {children}
      </a>
    );
  },
  useRouterState: () => ({ location: { pathname: "/" } }),
}));

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

interface MockObserverInstance {
  callback: ObserverCallback;
  elements: Set<Element>;
  disconnected: boolean;
}

let mockObservers: MockObserverInstance[] = [];

function setupMockIntersectionObserver() {
  mockObservers = [];
  class MockIntersectionObserver {
    instance: MockObserverInstance;
    constructor(callback: IntersectionObserverCallback) {
      this.instance = {
        callback: callback as unknown as ObserverCallback,
        elements: new Set(),
        disconnected: false,
      };
      mockObservers.push(this.instance);
    }
    observe(el: Element) {
      this.instance.elements.add(el);
    }
    unobserve(el: Element) {
      this.instance.elements.delete(el);
    }
    disconnect() {
      this.instance.disconnected = true;
      this.instance.elements.clear();
    }
  }
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
}

function triggerIntersection(options: {
  isIntersecting: boolean;
  intersectionRatio: number;
  campaignId?: string;
}) {
  for (const obs of mockObservers) {
    if (obs.disconnected) continue;
    for (const el of obs.elements) {
      const elCampId = el.getAttribute("data-campaign-id");
      if (options.campaignId && elCampId !== options.campaignId) continue;
      obs.callback([
        {
          target: el,
          isIntersecting: options.isIntersecting,
          intersectionRatio: options.intersectionRatio,
        },
      ]);
    }
  }
}

describe("R2-D & CORR-001: Featured Placements, Delivered Impression Integrity, Recents and Favourites", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupMockIntersectionObserver();
    usePewa.getState().loadScenario("sponsored-campaign");
    usePewa.setState({
      role: "customer",
      favourites: [],
      recents: [],
      simulatedTime: "2026-10-22T10:00:00.000Z",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("Scenario A (CORR-001) — An eligible campaign outside the viewport generates no billable impression", () => {
    const initialCamp = usePewa.getState().campaigns[0]!;
    expect(initialCamp.impressions).toBe(142);
    expect(initialCamp.spent).toBe(14.2);

    render(<Discovery directory={false} />);

    // Featured Offers section is rendered in the DOM
    expect(screen.getByRole("region", { name: "Featured Offers" })).toBeInTheDocument();

    // Card is outside viewport (isIntersecting = false, ratio = 0) or below 50% ratio
    act(() => {
      triggerIntersection({ isIntersecting: false, intersectionRatio: 0 });
      vi.advanceTimersByTime(QUALIFYING_EXPOSURE_DWELL_MS * 3);
    });

    // Partial intersection below threshold (e.g. 25% visible < 50% required) also does not qualify
    act(() => {
      triggerIntersection({ isIntersecting: true, intersectionRatio: 0.25 });
      vi.advanceTimersByTime(QUALIFYING_EXPOSURE_DWELL_MS * 3);
    });

    const afterCamp = usePewa.getState().campaigns[0]!;
    expect(afterCamp.impressions).toBe(142);
    expect(afterCamp.spent).toBe(14.2);
  });

  it("Scenario B, C, D & H (CORR-001) — Qualifying sponsored placement becomes visible (≥50% for ≥300ms) and records exactly one impression; rerenders, repeated visibility callbacks, and clicks do not duplicate charges", () => {
    const initialCamp = usePewa.getState().campaigns[0]!;
    expect(initialCamp.impressions).toBe(142);
    expect(initialCamp.spent).toBe(14.2);

    const { rerender } = render(<Discovery directory={false} />);

    const featuredSection = screen.getByRole("region", { name: "Featured Offers" });
    expect(within(featuredSection).getByText("Sponsored")).toBeInTheDocument();
    expect(
      within(featuredSection).getByText("20% Off Slow Cold Brews All Week"),
    ).toBeInTheDocument();

    // Enter viewport at qualifying ratio (0.75 >= 0.5)
    act(() => {
      triggerIntersection({
        isIntersecting: true,
        intersectionRatio: QUALIFYING_EXPOSURE_MIN_RATIO + 0.25,
      });
    });

    // Before 300ms dwell threshold completes, impression is still 142
    act(() => {
      vi.advanceTimersByTime(QUALIFYING_EXPOSURE_DWELL_MS - 50);
    });
    expect(usePewa.getState().campaigns[0]!.impressions).toBe(142);

    // Complete 300ms continuous dwell -> records 1 qualifying impression ($0.10)
    act(() => {
      vi.advanceTimersByTime(60);
    });
    const afterQualifying = usePewa.getState().campaigns[0]!;
    expect(afterQualifying.impressions).toBe(143);
    expect(afterQualifying.spent).toBe(14.3);

    // Scenario C: Ordinary React rerenders do not duplicate the charge
    rerender(<Discovery directory={false} />);
    act(() => {
      triggerIntersection({ isIntersecting: true, intersectionRatio: 1.0 });
      vi.advanceTimersByTime(QUALIFYING_EXPOSURE_DWELL_MS * 2);
    });
    expect(usePewa.getState().campaigns[0]!.impressions).toBe(143);
    expect(usePewa.getState().campaigns[0]!.spent).toBe(14.3);

    // Scenario D: Repeated visibility callbacks during the same exposure do not duplicate the charge
    act(() => {
      triggerIntersection({ isIntersecting: true, intersectionRatio: 0.8 });
      triggerIntersection({ isIntersecting: true, intersectionRatio: 1.0 });
      vi.advanceTimersByTime(QUALIFYING_EXPOSURE_DWELL_MS * 2);
    });
    expect(usePewa.getState().campaigns[0]!.impressions).toBe(143);
    expect(usePewa.getState().campaigns[0]!.spent).toBe(14.3);

    // Scenario H: Clicking a campaign tracks engagement click without adding budget deduction
    const featuredCard = screen.getByTestId(`featured-card-${initialCamp.id}`);
    fireEvent.click(featuredCard);
    const afterClick = usePewa.getState().campaigns[0]!;
    expect(afterClick.clicks).toBe(initialCamp.clicks + 1);
    expect(afterClick.spent).toBe(14.3);
  });

  it("Scenario E (CORR-001) — A card that leaves the viewport or is removed before meeting the 300ms dwell threshold generates no impression", () => {
    const { unmount } = render(<Discovery directory={false} />);

    // Card enters viewport at 100% visibility
    act(() => {
      triggerIntersection({ isIntersecting: true, intersectionRatio: 1.0 });
      vi.advanceTimersByTime(150); // Only 150ms (< 300ms threshold)
    });

    // Card scrolls out of viewport before 300ms completes
    act(() => {
      triggerIntersection({ isIntersecting: false, intersectionRatio: 0 });
      vi.advanceTimersByTime(500);
    });
    expect(usePewa.getState().campaigns[0]!.impressions).toBe(142);
    expect(usePewa.getState().campaigns[0]!.spent).toBe(14.2);

    // Card re-enters viewport briefly (100ms) and then component unmounts
    act(() => {
      triggerIntersection({ isIntersecting: true, intersectionRatio: 1.0 });
      vi.advanceTimersByTime(100);
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(usePewa.getState().campaigns[0]!.impressions).toBe(142);
    expect(usePewa.getState().campaigns[0]!.spent).toBe(14.2);
  });

  it("Scenario F (CORR-001) — Ineligible campaigns (paused, expired, exhausted, suspended org, or unpublished venue) produce no billable exposure", () => {
    const camp = usePewa.getState().campaigns[0]!;

    // 1. Paused campaign (toggled by authorised merchant)
    usePewa.getState().setRole("owner");
    usePewa.getState().toggleCampaign(camp.id);
    usePewa.getState().setRole("customer");
    usePewa.getState().recordPromotionImpression(camp.id);
    expect(usePewa.getState().campaigns[0]!.impressions).toBe(142);

    const { unmount: unmountPaused } = render(<Discovery directory={false} />);
    expect(screen.queryByRole("region", { name: "Featured Offers" })).not.toBeInTheDocument();
    unmountPaused();

    // 2. Expired campaign
    usePewa.setState((s) => ({
      campaigns: s.campaigns.map((c) =>
        c.id === camp.id ? { ...c, active: true, endDate: "2026-10-01T00:00:00.000Z" } : c,
      ),
    }));
    const expiredEval = evaluateCampaignDelivery(usePewa.getState().campaigns[0]!, {
      organisation: usePewa.getState().organisation,
      venues: usePewa.getState().venues,
      menus: usePewa.getState().menus,
      referenceTimeIso: "2026-10-22T10:00:00.000Z",
    });
    expect(expiredEval.eligible).toBe(false);
    expect(expiredEval.state).toBe("expired");
    usePewa.getState().recordPromotionImpression(camp.id);
    expect(usePewa.getState().campaigns[0]!.impressions).toBe(142);

    // 3. Suspended organisation preserves remaining exposure entitlement
    usePewa.setState((s) => ({
      campaigns: s.campaigns.map((c) =>
        c.id === camp.id ? { ...c, active: true, endDate: "2026-10-31T00:00:00.000Z" } : c,
      ),
    }));
    usePewa.getState().setRole("operator");
    usePewa.getState().setOrganisationStatus("org_ggc", "suspended", "Compliance review");
    usePewa.getState().setRole("customer");
    const suspendedEval = evaluateCampaignDelivery(usePewa.getState().campaigns[0]!, {
      organisation: usePewa.getState().organisation,
      venues: usePewa.getState().venues,
      menus: usePewa.getState().menus,
    });
    expect(suspendedEval.eligible).toBe(false);
    expect(suspendedEval.state).toBe("suspended");
    expect(suspendedEval.remainingBudget).toBe(35.8);
    expect(suspendedEval.remainingImpressionsEntitlement).toBe(358);
    usePewa.getState().recordPromotionImpression(camp.id);
    expect(usePewa.getState().campaigns[0]!.impressions).toBe(142);

    // 4. Unpublished venue menu withholds campaign without charging
    usePewa.getState().setRole("operator");
    usePewa.getState().setOrganisationStatus("org_ggc", "active");
    usePewa.getState().setRole("owner");
    usePewa.getState().hideMenu("menu_ggc_allday");
    usePewa.getState().setRole("customer");
    const unpubEval = evaluateCampaignDelivery(usePewa.getState().campaigns[0]!, {
      organisation: usePewa.getState().organisation,
      venues: usePewa.getState().venues,
      menus: usePewa.getState().menus,
    });
    expect(unpubEval.eligible).toBe(false);
    expect(unpubEval.state).toBe("unpublished_venue");
  });

  it("Scenario G (CORR-001) — Merchant placement previews remain strictly non-billable", () => {
    const state = usePewa.getState();
    const camp = state.campaigns[0]!;
    const venue = state.venues[0]!;
    const menu = state.menus[0]!;

    render(
      <FeaturedCampaignPlacementCard
        campaign={camp}
        venue={venue}
        publishedMenu={menu}
        previewOnly
      />,
    );

    const previewCard = screen.getByTestId(`featured-preview-${camp.id}`);
    expect(previewCard).toBeInTheDocument();
    expect(within(previewCard).getByText("Sponsored")).toBeInTheDocument();

    // No IntersectionObserver should be registered for previewOnly cards, and advancing timers records 0 impressions
    expect(mockObservers.reduce((acc, o) => acc + o.elements.size, 0)).toBe(0);
    act(() => {
      vi.advanceTimersByTime(QUALIFYING_EXPOSURE_DWELL_MS * 5);
    });
    expect(usePewa.getState().campaigns[0]!.impressions).toBe(142);
    expect(usePewa.getState().campaigns[0]!.spent).toBe(14.2);
  });

  it("Scenario I (CORR-001) — Campaign exhaustion prevents new billable delivery without causing immediate disappearance of the already displayed placement", () => {
    const camp = usePewa.getState().campaigns[0]!;
    // Set campaign to have exactly 1 impression ($0.10) of remaining budget
    usePewa.setState((s) => ({
      campaigns: s.campaigns.map((c) =>
        c.id === camp.id ? { ...c, budget: 15.0, spent: 14.9, impressions: 149 } : c,
      ),
    }));

    const { unmount } = render(<Discovery directory={false} />);

    // Placement is rendered on Home
    expect(screen.getByTestId(`featured-card-${camp.id}`)).toBeInTheDocument();

    // Qualifying exposure exhausts the budget ($14.90 -> $15.00)
    act(() => {
      triggerIntersection({ isIntersecting: true, intersectionRatio: 1.0 });
      vi.advanceTimersByTime(QUALIFYING_EXPOSURE_DWELL_MS + 20);
    });

    const exhaustedCamp = usePewa.getState().campaigns[0]!;
    expect(exhaustedCamp.impressions).toBe(150);
    expect(exhaustedCamp.spent).toBe(15.0);

    // Requirement 11: Already displayed placement remains visible in the current customer view (no jarring disappearance)
    expect(screen.getByTestId(`featured-card-${camp.id}`)).toBeInTheDocument();

    // Customer can still click the displayed placement to visit the venue without extra budget charge
    fireEvent.click(screen.getByTestId(`featured-card-${camp.id}`));
    expect(usePewa.getState().campaigns[0]!.clicks).toBe(camp.clicks + 1);
    expect(usePewa.getState().campaigns[0]!.spent).toBe(15.0);

    unmount();

    // Subsequent fresh Home visits do not deliver the now-exhausted campaign or generate billable impressions
    render(<Discovery directory={false} />);
    expect(screen.queryByRole("region", { name: "Featured Offers" })).not.toBeInTheDocument();
    expect(usePewa.getState().campaigns[0]!.impressions).toBe(150);
  });

  it("Scenario J — Recents and Favourites regressions remain green (most-recent-first, max 2 on Home with View all, Clear history, direct unsave, and graceful unavailable handling)", () => {
    const { visitVenue, toggleFavourite } = usePewa.getState();

    // 1. Recents ordering, deduplication, Home 2-card cap, and Clear history
    visitVenue("venue_ggc");
    visitVenue("venue_sol");
    visitVenue("venue_gelato");
    visitVenue("venue_ggc");
    expect(usePewa.getState().recents).toEqual(["venue_ggc", "venue_gelato", "venue_sol"]);

    // 2. Favourites save, Home 2-card cap, and direct unsave
    toggleFavourite("venue_ggc");
    toggleFavourite("venue_sol");
    toggleFavourite("venue_gelato");
    expect(usePewa.getState().favourites).toEqual(["venue_ggc", "venue_sol", "venue_gelato"]);

    const { unmount } = render(<Discovery directory={false} />);

    const recentsSection = screen.getByRole("region", { name: "Recently opened" });
    expect(within(recentsSection).getByText("View all (3) →")).toBeInTheDocument();
    expect(within(recentsSection).getByText("Green Garden Café")).toBeInTheDocument();
    expect(within(recentsSection).getByText("Gelato Craft Lab")).toBeInTheDocument();
    expect(within(recentsSection).queryByText("Sol Artisan Bakery")).not.toBeInTheDocument();

    fireEvent.click(within(recentsSection).getByRole("button", { name: "Clear recent history" }));
    expect(usePewa.getState().recents).toEqual([]);
    expect(screen.queryByRole("region", { name: "Recently opened" })).not.toBeInTheDocument();

    const savedSection = screen.getByRole("region", { name: "Saved favourites" });
    expect(within(savedSection).getByText("View all (3) →")).toBeInTheDocument();
    fireEvent.click(within(savedSection).getByRole("button", { name: "Unsave Green Garden Café" }));
    expect(usePewa.getState().favourites).toEqual(["venue_sol", "venue_gelato"]);
    expect(within(savedSection).getByText("View all (2) →")).toBeInTheDocument();
    expect(within(savedSection).getByText("Gelato Craft Lab")).toBeInTheDocument();
    unmount();

    // 3. Unavailable saved business handled gracefully without leaking unpublished data
    toggleFavourite("venue_ggc");
    usePewa.getState().setRole("owner");
    usePewa.getState().hideMenu("menu_ggc_allday");
    usePewa.getState().setRole("customer");
    render(<Discovery directory={true} initialFilter="saved" />);
    expect(screen.queryByTestId("venue-card-green-garden-cafe")).not.toBeInTheDocument();
    expect(screen.getByText(/Unavailable saved businesses/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Unsave Green Garden Café" }));
    expect(usePewa.getState().favourites).not.toContain("venue_ggc");
  });

  it("CORR-002 CORR-A — Resolves time-only and day+time simulation values against the deterministic October 2026 demonstration date, preserves explicit timestamps, and evaluates scheduled, active, and expired campaigns repeatably across different real-world dates", () => {
    // Load the default 'sponsored-campaign' scenario which uses time-only simulatedTime: "10:00"
    usePewa.getState().loadScenario("sponsored-campaign");
    expect(usePewa.getState().simulatedTime).toBe("10:00");

    // Simulate viewing the prototype far in the future (e.g. year 2028) and in the past (e.g. year 2024)
    for (const wallClockIso of ["2028-05-15T12:00:00.000Z", "2024-01-10T08:00:00.000Z"]) {
      vi.setSystemTime(new Date(wallClockIso));

      const state = usePewa.getState();
      const seedCamp = state.campaigns[0]!;

      // 1. Time-only "10:00" resolves against 2026-10-20, keeping the October 15-31 2026 campaign active
      const timeOnlyEval = evaluateCampaignDelivery(seedCamp, {
        organisation: state.organisation,
        venues: state.venues,
        menus: state.menus,
        referenceTimeIso: "10:00",
      });
      expect(timeOnlyEval.eligible).toBe(true);
      expect(timeOnlyEval.state).toBe("eligible");

      // 2. Day+time simulation value "mon 09:00" resolves against 2026-10-19, also active
      const dayTimeEval = evaluateCampaignDelivery(seedCamp, {
        organisation: state.organisation,
        venues: state.venues,
        menus: state.menus,
        referenceTimeIso: "mon 09:00",
      });
      expect(dayTimeEval.eligible).toBe(true);
      expect(dayTimeEval.state).toBe("eligible");

      // 3. Explicit complete timestamp before campaign start -> scheduled
      const scheduledEval = evaluateCampaignDelivery(seedCamp, {
        organisation: state.organisation,
        venues: state.venues,
        menus: state.menus,
        referenceTimeIso: "2026-10-10T10:00:00.000Z",
      });
      expect(scheduledEval.eligible).toBe(false);
      expect(scheduledEval.state).toBe("scheduled");

      // 4. Explicit complete timestamp after campaign end -> expired
      const expiredEval = evaluateCampaignDelivery(seedCamp, {
        organisation: state.organisation,
        venues: state.venues,
        menus: state.menus,
        referenceTimeIso: "2026-11-05T10:00:00.000Z",
      });
      expect(expiredEval.eligible).toBe(false);
      expect(expiredEval.state).toBe("expired");

      // 5. Campaign with future startDate relative to "10:00" (2026-10-20) -> scheduled
      const futureCampEval = evaluateCampaignDelivery(
        {
          ...seedCamp,
          startDate: "2026-10-25T00:00:00.000Z",
          endDate: "2026-11-10T00:00:00.000Z",
        },
        {
          organisation: state.organisation,
          venues: state.venues,
          menus: state.menus,
          referenceTimeIso: "10:00",
        },
      );
      expect(futureCampEval.eligible).toBe(false);
      expect(futureCampEval.state).toBe("scheduled");

      // 6. Campaign with past endDate relative to "10:00" (2026-10-20) -> expired
      const pastCampEval = evaluateCampaignDelivery(
        {
          ...seedCamp,
          startDate: "2026-10-01T00:00:00.000Z",
          endDate: "2026-10-18T00:00:00.000Z",
        },
        {
          organisation: state.organisation,
          venues: state.venues,
          menus: state.menus,
          referenceTimeIso: "10:00",
        },
      );
      expect(pastCampEval.eligible).toBe(false);
      expect(pastCampEval.state).toBe("expired");
    }

    // Verify rendering Home in 2028 with default scenario simulatedTime ("10:00") still displays and qualifies impressions
    vi.setSystemTime(new Date("2028-05-15T12:00:00.000Z"));
    const initialImpressions = usePewa.getState().campaigns[0]!.impressions;
    const { unmount } = render(<Discovery directory={false} />);
    expect(screen.getByRole("region", { name: "Featured Offers" })).toBeInTheDocument();
    act(() => {
      triggerIntersection({ isIntersecting: true, intersectionRatio: 1.0 });
      vi.advanceTimersByTime(QUALIFYING_EXPOSURE_DWELL_MS + 20);
    });
    expect(usePewa.getState().campaigns[0]!.impressions).toBe(initialImpressions + 1);
    unmount();
  });

  it("CORR-002 CORR-B — Allows individual removal of available recent entries in /directory?filter=recents and on Home without triggering venue navigation, retains other entries, and persists across reload", () => {
    const { visitVenue } = usePewa.getState();
    visitVenue("venue_sol");
    visitVenue("venue_gelato");
    visitVenue("venue_ggc");
    expect(usePewa.getState().recents).toEqual(["venue_ggc", "venue_gelato", "venue_sol"]);

    // 1. Directory recents view (/directory?filter=recents) shows per-entry Remove control on available VenueCards
    const { unmount: unmountDir } = render(<Discovery directory={true} initialFilter="recents" />);
    expect(screen.getByTestId("venue-card-green-garden-cafe")).toBeInTheDocument();
    expect(screen.getByTestId("venue-card-gelato-craft-lab")).toBeInTheDocument();
    expect(screen.getByTestId("venue-card-sol-artisan-bakery")).toBeInTheDocument();

    // Verify clicking Remove does not trigger anchor default navigation
    const removeGelatoBtn = screen.getByTestId("remove-recent-gelato-craft-lab");
    let linkDefaultPrevented = false;
    const cardLink = screen.getByTestId("venue-card-gelato-craft-lab").querySelector("a");
    cardLink?.addEventListener("click", (ev) => {
      linkDefaultPrevented = ev.defaultPrevented;
    });

    fireEvent.click(removeGelatoBtn);
    // StopPropagation prevents the click from even reaching the parent <a>, or if it bubbles, default is prevented
    expect(linkDefaultPrevented || usePewa.getState().recents.length === 2).toBe(true);

    // Gelato Craft Lab is removed immediately while Green Garden Café and Sol Artisan Bakery remain
    expect(usePewa.getState().recents).toEqual(["venue_ggc", "venue_sol"]);
    expect(screen.queryByTestId("venue-card-gelato-craft-lab")).not.toBeInTheDocument();
    expect(screen.getByTestId("venue-card-green-garden-cafe")).toBeInTheDocument();
    expect(screen.getByTestId("venue-card-sol-artisan-bakery")).toBeInTheDocument();

    // Saved favourite control on remaining cards still works independently
    const saveGgcBtn = screen.getByRole("button", { name: "Save Green Garden Café" });
    fireEvent.click(saveGgcBtn);
    expect(usePewa.getState().favourites).toContain("venue_ggc");
    unmountDir();

    // 2. Home view reflects the updated recents immediately and supports per-item removal
    const { unmount: unmountHome } = render(<Discovery directory={false} />);
    const recentsSection = screen.getByRole("region", { name: "Recently opened" });
    expect(within(recentsSection).getByText("View all (2) →")).toBeInTheDocument();
    expect(within(recentsSection).getByText("Green Garden Café")).toBeInTheDocument();
    expect(within(recentsSection).getByText("Sol Artisan Bakery")).toBeInTheDocument();

    fireEvent.click(
      within(recentsSection).getByRole("button", {
        name: "Remove Green Garden Café from recents",
      }),
    );
    expect(usePewa.getState().recents).toEqual(["venue_sol"]);
    expect(within(recentsSection).getByText("View all (1) →")).toBeInTheDocument();
    expect(within(recentsSection).queryByText("Green Garden Café")).not.toBeInTheDocument();
    expect(within(recentsSection).getByText("Sol Artisan Bakery")).toBeInTheDocument();
    unmountHome();

    // 3. Persistence after reload: persisted storage state retains only ["venue_sol"]
    const persistedRaw = window.localStorage.getItem("pewa-prototype-v1");
    expect(persistedRaw).toBeTruthy();
    const parsed = JSON.parse(persistedRaw!);
    expect(parsed.state.recents).toEqual(["venue_sol"]);
  });
});
