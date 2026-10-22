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

    // 1. Paused campaign
    usePewa.getState().toggleCampaign(camp.id);
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
    usePewa.getState().setOrganisationStatus("org_ggc", "suspended", "Compliance review");
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
    usePewa.getState().setOrganisationStatus("org_ggc", "active");
    usePewa.getState().hideMenu("menu_ggc_allday");
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
    usePewa.getState().hideMenu("menu_ggc_allday");
    render(<Discovery directory={true} initialFilter="saved" />);
    expect(screen.queryByTestId("venue-card-green-garden-cafe")).not.toBeInTheDocument();
    expect(screen.getByText(/Unavailable saved businesses/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Unsave Green Garden Café" }));
    expect(usePewa.getState().favourites).not.toContain("venue_ggc");
  });
});
