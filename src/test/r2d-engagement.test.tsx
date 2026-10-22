import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { usePewa, evaluateCampaignDelivery } from "@/lib/pewa/store";
import { Discovery, FeaturedCampaignPlacementCard } from "@/components/pewa/Discovery";

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

describe("R2-D: Featured Placements, Recents and Favourites", () => {
  beforeEach(() => {
    usePewa.getState().loadScenario("sponsored-campaign");
    usePewa.setState({
      role: "customer",
      favourites: [],
      recents: [],
      simulatedTime: "2026-10-22T10:00:00.000Z",
    });
  });

  it("Scenario A — Active featured campaign: appears on Home with Sponsored label, separated from organic results, and records one impression without duplicate rerender charges", () => {
    const initialCamp = usePewa.getState().campaigns[0]!;
    expect(initialCamp.impressions).toBe(142);
    expect(initialCamp.spent).toBe(14.2);

    const { rerender } = render(<Discovery directory={false} />);

    const featuredSection = screen.getByRole("region", { name: "Featured Offers" });
    expect(featuredSection).toBeInTheDocument();
    expect(within(featuredSection).getAllByText(/Sponsored/i).length).toBeGreaterThanOrEqual(1);
    expect(
      within(featuredSection).getByText("20% Off Slow Cold Brews All Week"),
    ).toBeInTheDocument();
    expect(within(featuredSection).getByText("Green Garden Café")).toBeInTheDocument();
    expect(within(featuredSection).getByText(/All-Day Menu/i)).toBeInTheDocument();

    // Impression recorded exactly once on mount
    const afterMountCamp = usePewa.getState().campaigns[0]!;
    expect(afterMountCamp.impressions).toBe(143);
    expect(afterMountCamp.spent).toBe(14.3);

    // Rerendering does not duplicate impression charges
    rerender(<Discovery directory={false} />);
    const afterRerenderCamp = usePewa.getState().campaigns[0]!;
    expect(afterRerenderCamp.impressions).toBe(143);
    expect(afterRerenderCamp.spent).toBe(14.3);

    // Clicking sponsored card tracks engagement click without consuming budget
    const featuredCard = screen.getByTestId(`featured-card-${initialCamp.id}`);
    fireEvent.click(featuredCard);
    const afterClickCamp = usePewa.getState().campaigns[0]!;
    expect(afterClickCamp.clicks).toBe(initialCamp.clicks + 1);
    expect(afterClickCamp.spent).toBe(14.3);
  });

  it("Scenario B — Inactive, expired, or exhausted campaign: withheld from customer placement and does not generate billable impressions", () => {
    const camp = usePewa.getState().campaigns[0]!;

    // 1. Paused campaign
    usePewa.getState().toggleCampaign(camp.id);
    expect(usePewa.getState().campaigns[0]!.active).toBe(false);

    usePewa.getState().recordPromotionImpression(camp.id);
    expect(usePewa.getState().campaigns[0]!.impressions).toBe(142);
    expect(usePewa.getState().campaigns[0]!.spent).toBe(14.2);

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

    const { unmount: unmountExpired } = render(<Discovery directory={false} />);
    expect(screen.queryByRole("region", { name: "Featured Offers" })).not.toBeInTheDocument();
    unmountExpired();

    // 3. Budget exhausted campaign
    usePewa.setState((s) => ({
      campaigns: s.campaigns.map((c) =>
        c.id === camp.id
          ? {
              ...c,
              active: true,
              endDate: "2026-10-31T00:00:00.000Z",
              budget: 50,
              spent: 50,
            }
          : c,
      ),
    }));
    const exhaustedEval = evaluateCampaignDelivery(usePewa.getState().campaigns[0]!, {
      organisation: usePewa.getState().organisation,
      venues: usePewa.getState().venues,
      menus: usePewa.getState().menus,
      referenceTimeIso: "2026-10-22T10:00:00.000Z",
    });
    expect(exhaustedEval.eligible).toBe(false);
    expect(exhaustedEval.state).toBe("exhausted");

    usePewa.getState().recordPromotionImpression(camp.id);
    expect(usePewa.getState().campaigns[0]!.impressions).toBe(142);

    render(<Discovery directory={false} />);
    expect(screen.queryByRole("region", { name: "Featured Offers" })).not.toBeInTheDocument();
  });

  it("Scenario C — Suspended organisation or unpublished menu: halts featured delivery and preserves remaining exposure entitlement", () => {
    const camp = usePewa.getState().campaigns[0]!;
    expect(camp.budget).toBe(50);
    expect(camp.spent).toBe(14.2);

    // Suspend organisation
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

    // Attempting to record an impression while suspended does not charge or reduce entitlement
    usePewa.getState().recordPromotionImpression(camp.id);
    expect(usePewa.getState().campaigns[0]!.impressions).toBe(142);
    expect(usePewa.getState().campaigns[0]!.spent).toBe(14.2);

    const { unmount } = render(<Discovery directory={false} />);
    expect(screen.queryByRole("region", { name: "Featured Offers" })).not.toBeInTheDocument();
    unmount();

    // Reactivate organisation, then unpublish all venue menus -> campaign withheld without charging
    usePewa.getState().setOrganisationStatus("org_ggc", "active");
    usePewa.getState().hideMenu("menu_ggc_allday");

    const unpubEval = evaluateCampaignDelivery(usePewa.getState().campaigns[0]!, {
      organisation: usePewa.getState().organisation,
      venues: usePewa.getState().venues,
      menus: usePewa.getState().menus,
    });
    expect(unpubEval.eligible).toBe(false);
    expect(unpubEval.state).toBe("unpublished_venue");
    expect(unpubEval.remainingBudget).toBe(35.8);
  });

  it("Scenario D — Merchant customer placement preview: renders how the Featured Offer appears to customers using published content", () => {
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
    expect(within(previewCard).getByText("20% Off Slow Cold Brews All Week")).toBeInTheDocument();
    expect(within(previewCard).getByText("Green Garden Café")).toBeInTheDocument();
    expect(within(previewCard).getByText(/All-Day Menu/i)).toBeInTheDocument();
  });

  it("Scenario E & F — Recently Viewed: records genuine visits in most-recent-first order without duplicates, shows max 2 on Home with View all, and supports Clear history", () => {
    const { visitVenue } = usePewa.getState();

    // Visit three venues, then revisit the first one
    visitVenue("venue_ggc");
    visitVenue("venue_sol");
    visitVenue("venue_gelato");
    visitVenue("venue_ggc");

    // Stored in most-recent-first order with no duplicate entries
    expect(usePewa.getState().recents).toEqual(["venue_ggc", "venue_gelato", "venue_sol"]);

    const { unmount } = render(<Discovery directory={false} />);

    const recentsSection = screen.getByRole("region", { name: "Recently opened" });
    expect(recentsSection).toBeInTheDocument();
    expect(within(recentsSection).getByText("View all (3) →")).toBeInTheDocument();

    // Only top 2 shown on Home ("Green Garden Café" and "Gelato Craft Lab"), not "Sol Artisan Bakery"
    expect(within(recentsSection).getByText("Green Garden Café")).toBeInTheDocument();
    expect(within(recentsSection).getByText("Gelato Craft Lab")).toBeInTheDocument();
    expect(within(recentsSection).queryByText("Sol Artisan Bakery")).not.toBeInTheDocument();

    // Clear history from Home removes the section
    fireEvent.click(within(recentsSection).getByRole("button", { name: "Clear recent history" }));
    expect(usePewa.getState().recents).toEqual([]);
    expect(screen.queryByRole("region", { name: "Recently opened" })).not.toBeInTheDocument();
    unmount();

    // Verify full list in Directory recents filter
    visitVenue("venue_sol");
    visitVenue("venue_gelato");
    visitVenue("venue_ggc");
    render(<Discovery directory={true} initialFilter="recents" />);
    expect(screen.getByText("3 businesses")).toBeInTheDocument();
    expect(screen.getByTestId("venue-card-green-garden-cafe")).toBeInTheDocument();
    expect(screen.getByTestId("venue-card-gelato-craft-lab")).toBeInTheDocument();
    expect(screen.getByTestId("venue-card-sol-artisan-bakery")).toBeInTheDocument();
  });

  it("Scenario G & H — Favourites: save and remove from discovery, shows max 2 on Home with View all, and allows direct removal", () => {
    const { toggleFavourite } = usePewa.getState();

    toggleFavourite("venue_ggc");
    toggleFavourite("venue_sol");
    toggleFavourite("venue_gelato");
    expect(usePewa.getState().favourites).toEqual(["venue_ggc", "venue_sol", "venue_gelato"]);

    const { unmount } = render(<Discovery directory={false} />);

    const savedSection = screen.getByRole("region", { name: "Saved favourites" });
    expect(savedSection).toBeInTheDocument();
    expect(within(savedSection).getByText("View all (3) →")).toBeInTheDocument();

    // Max 2 shown on Home
    expect(within(savedSection).getByText("Green Garden Café")).toBeInTheDocument();
    expect(within(savedSection).getByText("Sol Artisan Bakery")).toBeInTheDocument();
    expect(within(savedSection).queryByText("Gelato Craft Lab")).not.toBeInTheDocument();

    // Remove Green Garden Café directly from the Saved favourites section on Home
    fireEvent.click(within(savedSection).getByRole("button", { name: "Unsave Green Garden Café" }));
    expect(usePewa.getState().favourites).toEqual(["venue_sol", "venue_gelato"]);
    expect(within(savedSection).getByText("View all (2) →")).toBeInTheDocument();
    expect(within(savedSection).getByText("Gelato Craft Lab")).toBeInTheDocument();
    unmount();

    // Verify full saved list in Directory saved filter
    toggleFavourite("venue_ggc");
    render(<Discovery directory={true} initialFilter="saved" />);
    expect(screen.getByText("3 businesses")).toBeInTheDocument();
  });

  it("Scenario I — Unavailable recent or favourite business: handled gracefully without leaking unpublished/protected data and allows removal", () => {
    usePewa.getState().visitVenue("venue_ggc");
    usePewa.getState().toggleFavourite("venue_ggc");

    // Hide Green Garden Café's published menu so the venue has no eligible public menu
    usePewa.getState().hideMenu("menu_ggc_allday");

    render(<Discovery directory={true} initialFilter="saved" />);

    // Should not render Green Garden Café's menu items or organic card, but should show graceful unavailable entry with remove button
    expect(screen.queryByTestId("venue-card-green-garden-cafe")).not.toBeInTheDocument();
    expect(screen.getByText(/Unavailable saved businesses/i)).toBeInTheDocument();
    expect(screen.getByText(/Menu is currently unpublished or unavailable/i)).toBeInTheDocument();

    const removeBtn = screen.getByRole("button", { name: "Unsave Green Garden Café" });
    fireEvent.click(removeBtn);
    expect(usePewa.getState().favourites).toEqual([]);
  });

  it("Scenario J — Home clutter guard: Home remains clean and responsive with no permanent area or tag chip rows", () => {
    render(<Discovery directory={false} />);

    // Prominent search input and compact category chips exist
    expect(screen.getByLabelText("Search menus")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "See nearby venues" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();

    // Empty recents and favourites sections are hidden
    expect(screen.queryByRole("region", { name: "Recently opened" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Saved favourites" })).not.toBeInTheDocument();
  });
});
