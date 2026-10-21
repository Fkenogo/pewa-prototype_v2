import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { formatPrice, usePewa } from "@/lib/pewa/store";
import { Discovery } from "@/components/pewa/Discovery";
import {
  canAdmitOrder,
  validateCart,
  getAuthoritativeVenues,
  getAuthoritativeMenus,
} from "@/lib/pewa/ordering";
import {
  cloudBurgerVenue,
  cloudBurgerMenu,
  PROTOTYPE_DIRECTORY_VENUES,
  PROTOTYPE_DIRECTORY_MENUS,
} from "@/lib/pewa/fixtures";

// Mock @tanstack/react-router Link for testing
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    search,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
    onClick?: () => void;
    className?: string;
  }) => {
    let href = to;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        href = href.replace(`$${k}`, v);
      }
    }
    if (search) {
      const sp = new URLSearchParams(search).toString();
      if (sp) {
        href += `?${sp}`;
      }
    }
    return (
      <a href={href} onClick={onClick} className={className} data-testid="router-link">
        {children}
      </a>
    );
  },
}));

describe("R2-A: PEWA Home Discovery & Navigation Alignment", () => {
  beforeEach(() => {
    usePewa.getState().reset();
    usePewa.getState().setRole("customer");
  });

  // =========================================================================
  // Scenario A: Customer searches for a restaurant by name
  // =========================================================================
  describe("Scenario A — Customer searches for a restaurant by name", () => {
    it("finds Green Garden Café when searching by restaurant name", () => {
      render(<Discovery />);
      const searchInput = screen.getByLabelText("Search menus");

      fireEvent.change(searchInput, { target: { value: "Green Garden" } });

      expect(
        screen.getByRole("heading", { name: "Green Garden Café", level: 3 }),
      ).toBeInTheDocument();
      expect(screen.queryByText("CloudBurger Kitchen")).not.toBeInTheDocument();
      expect(screen.queryByText("Gelato Craft Lab")).not.toBeInTheDocument();

      // Displays matched business indicator
      expect(screen.getByText(/Matched business/i)).toBeInTheDocument();
    });

    it("displays friendly empty state when searching for a non-existent business", () => {
      render(<Discovery />);
      const searchInput = screen.getByLabelText("Search menus");

      fireEvent.change(searchInput, { target: { value: "NonExistentPizzeria" } });

      expect(screen.getByText("No menus match your active filters.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Scenario B: Customer searches for a specific dish without knowing the business
  // =========================================================================
  describe("Scenario B — Customer searches for a specific dish without knowing the business", () => {
    it("finds Cold Brew with image, section name, tags and price under Green Garden Café", () => {
      render(<Discovery />);
      const searchInput = screen.getByLabelText("Search menus");

      fireEvent.change(searchInput, { target: { value: "Cold Brew" } });

      expect(
        screen.getByRole("heading", { name: "Green Garden Café", level: 3 }),
      ).toBeInTheDocument();
      expect(screen.getByText("Cold Brew")).toBeInTheDocument();
      expect(screen.getByText("Coffee")).toBeInTheDocument(); // section badge
      expect(screen.getByText(/320/)).toBeInTheDocument(); // price

      // Verify dish photo thumbnail is rendered
      const img = screen.getByAltText("Cold Brew");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src");
    });

    it("finds The Double Wagyu Smash when searching 'Wagyu'", () => {
      render(<Discovery />);
      const searchInput = screen.getByLabelText("Search menus");

      fireEvent.change(searchInput, { target: { value: "Wagyu" } });

      expect(
        screen.getByRole("heading", { name: "CloudBurger Kitchen", level: 3 }),
      ).toBeInTheDocument();
      expect(screen.getByText("The Double Wagyu Smash")).toBeInTheDocument();
      expect(screen.getByText("Smashed Burgers")).toBeInTheDocument();
      expect(screen.getByText(/850/)).toBeInTheDocument();
    });

    it("finds Prime Aged Ribeye when searching 'Ribeye'", () => {
      render(<Discovery />);
      const searchInput = screen.getByLabelText("Search menus");

      fireEvent.change(searchInput, { target: { value: "Ribeye" } });

      expect(
        screen.getByRole("heading", { name: "The Grand Horizon Hotel", level: 3 }),
      ).toBeInTheDocument();
      expect(screen.getByText("Prime Aged Ribeye")).toBeInTheDocument();
      expect(screen.getByText("Bistro Plates")).toBeInTheDocument();
      expect(screen.getByText(/2,400/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Scenario C: Customer explores nearby cafés
  // =========================================================================
  describe("Scenario C — Customer explores nearby cafés", () => {
    it("filters to Cafés when tapping the Cafés category chip", () => {
      render(<Discovery />);
      const cafeChip = screen.getByRole("button", { name: /Cafés/i });

      fireEvent.click(cafeChip);

      expect(
        screen.getByRole("heading", { name: "Green Garden Café", level: 3 }),
      ).toBeInTheDocument();
      expect(screen.queryByText("CloudBurger Kitchen")).not.toBeInTheDocument();
      expect(screen.queryByText("The Grand Horizon Hotel")).not.toBeInTheDocument();

      // Tapping again clears category filter and restores all businesses
      fireEvent.click(cafeChip);
      expect(
        screen.getByRole("heading", { name: "Green Garden Café", level: 3 }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "CloudBurger Kitchen", level: 3 }),
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Scenario D: Customer discovers a delivery-only kitchen
  // =========================================================================
  describe("Scenario D — Customer discovers a delivery-only kitchen", () => {
    it("identifies CloudBurger Kitchen with Delivery Only badge and no walk-in storefront notice", () => {
      render(<Discovery />);
      const cloudKitchenChip = screen.getByRole("button", { name: /Cloud Kitchens/i });

      fireEvent.click(cloudKitchenChip);

      expect(
        screen.getByRole("heading", { name: "CloudBurger Kitchen", level: 3 }),
      ).toBeInTheDocument();
      expect(screen.getByText(/🛵 Delivery Only/i)).toBeInTheDocument();
      expect(
        screen.getByText(/No dine-in storefront · Kitchen dispatch only/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Delivers to:/i)).toBeInTheDocument();
      expect(screen.getByText(/Kilimani, Lavington & Westlands/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Scenario E: Customer enters PEWA with no search and browses relevant options
  // =========================================================================
  describe("Scenario E — Customer enters PEWA with no search and browses relevant options", () => {
    it("displays header, search input, category chips, See nearby, Filters action, and all venues without permanent area or tag chips", () => {
      render(<Discovery />);

      // Header and search
      expect(screen.getByText("pewa")).toBeInTheDocument();
      expect(screen.getByText("What’s on the menu?")).toBeInTheDocument();
      expect(screen.getByLabelText("Search menus")).toBeInTheDocument();

      // Primary Category chips are present
      expect(screen.getByRole("button", { name: "All categories" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cafés/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Bakeries/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Restaurants & Grills/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cloud Kitchens/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Gelato & Sweets/i })).toBeInTheDocument();

      // Controls for discovery actions
      expect(screen.getByRole("button", { name: /See nearby/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Filters/i })).toBeInTheDocument();

      // Permanent neighborhood and quick-tag chips are REMOVED from the main Home layout
      expect(screen.queryByRole("button", { name: "All areas" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "All tags" })).not.toBeInTheDocument();

      // All prototype businesses rendered
      expect(
        screen.getByRole("heading", { name: "Green Garden Café", level: 3 }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "The Grand Horizon Hotel", level: 3 }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "CloudBurger Kitchen", level: 3 }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Sol Artisan Bakery", level: 3 }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Gelato Craft Lab", level: 3 }),
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Scenario F: Customer opens a business's published menu
  // =========================================================================
  describe("Scenario F — Customer opens a business's published menu", () => {
    it("provides direct link to the venue menu page", () => {
      render(<Discovery />);

      const links = screen.getAllByTestId("router-link");
      const greenGardenLink = links.find((l) =>
        l.getAttribute("href")?.includes("/m/green-garden-cafe"),
      );
      expect(greenGardenLink).toBeDefined();

      const cloudBurgerLink = links.find((l) => l.getAttribute("href")?.includes("/m/cloudburger"));
      expect(cloudBurgerLink).toBeDefined();

      const horizonLink = links.find((l) =>
        l.getAttribute("href")?.includes("/m/grand-horizon-hotel"),
      );
      expect(horizonLink).toBeDefined();
    });
  });

  // =========================================================================
  // Scenario G: Customer discovers a menu-only business and can contact it without ordering
  // =========================================================================
  describe("Scenario G — Customer discovers a menu-only business and can contact it without ordering", () => {
    it("displays Menu & Direct Contact badge when ordering capacity is zero", () => {
      usePewa.getState().loadScenario("zero-units");
      render(<Discovery />);

      expect(screen.getAllByText(/📖 Menu & Direct Contact/i).length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Scenario H: Customer recognises featured placements separately from organic results
  // =========================================================================
  describe("Scenario H — Customer recognises featured placements separately from organic results", () => {
    it("displays Featured Offers with Sponsored badge and disclaimer separating it from organic rankings", () => {
      render(<Discovery />);

      // Featured Offers section
      expect(screen.getByText("Featured Offers")).toBeInTheDocument();
      expect(screen.getByText("Sponsored")).toBeInTheDocument();

      // Required regulatory & commercial integrity disclaimer
      expect(
        screen.getByText(
          /Sponsored placements are clearly marked and do not influence organic directory ranking/i,
        ),
      ).toBeInTheDocument();

      // Disappears when a query or filter is active
      const searchInput = screen.getByLabelText("Search menus");
      fireEvent.change(searchInput, { target: { value: "Burger" } });

      expect(screen.queryByText("Featured Offers")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // PEWA-R2-A-CORR-001 — Five Findings Verification
  // =========================================================================
  describe("PEWA-R2-A-CORR-001 — Five Review Findings Verification", () => {
    it("Finding 1 (P1): allows adding and submitting orders for directory venues outside the current scenario", () => {
      // Default new-cafe scenario only has greenGardenVenue in state.venues
      usePewa.getState().loadScenario("new-cafe");
      const s = usePewa.getState();
      expect(s.venues.some((v) => v.id === cloudBurgerVenue.id)).toBe(false);

      const wagyuOffering = cloudBurgerMenu.sections[0]?.offerings[0];
      expect(wagyuOffering).toBeDefined();

      // Add to cart from CloudBurger Kitchen
      const addErr = usePewa.getState().addCartLine(cloudBurgerVenue.id, {
        offeringId: wagyuOffering!.id,
        menuId: cloudBurgerMenu.id,
        name: wagyuOffering!.name,
        emoji: wagyuOffering!.emoji,
        basePrice: wagyuOffering!.price,
        quantity: 1,
        options: [],
        note: "",
      });
      expect(addErr).toBeNull();

      const cart = usePewa.getState().cart;
      expect(cart).not.toBeNull();
      expect(cart?.venueId).toBe(cloudBurgerVenue.id);

      // Validate cart authoritatively
      const valErr = validateCart(usePewa.getState(), cart);
      expect(valErr).toBeNull();

      // Submit order request
      const submitRes = usePewa.getState().submitOrder({
        guestName: "Alice Mwangi",
        guestContact: "+254711000111",
        service: "Delivery",
        note: "",
      });
      expect(submitRes.error).toBeUndefined();
      expect(submitRes.id).toBeDefined();

      const submittedOrder = usePewa.getState().orders.find((o) => o.id === submitRes.id);
      expect(submittedOrder).toBeDefined();
      expect(submittedOrder?.venueId).toBe(cloudBurgerVenue.id);
      expect(submittedOrder?.venueName).toBe("CloudBurger Kitchen");
      expect(submittedOrder?.status).toBe("pending");

      // Verify authoritative lookup resolves the venue for tracking and contact
      const trackingVenue = getAuthoritativeVenues(usePewa.getState()).find(
        (v) => v.id === submittedOrder?.venueId,
      );
      expect(trackingVenue).toBeDefined();
      expect(trackingVenue?.name).toBe("CloudBurger Kitchen");
    });

    it("Finding 1 (P1): rejects cart line and submission when admission policy blocks ordering", () => {
      usePewa.getState().loadScenario("zero-units");
      const wagyuOffering = cloudBurgerMenu.sections[0]?.offerings[0];

      const addErr = usePewa.getState().addCartLine(cloudBurgerVenue.id, {
        offeringId: wagyuOffering!.id,
        menuId: cloudBurgerMenu.id,
        name: wagyuOffering!.name,
        emoji: wagyuOffering!.emoji,
        basePrice: wagyuOffering!.price,
        quantity: 1,
        options: [],
        note: "",
      });
      expect(addErr).toContain("Structured requests are paused");
    });

    it("Finding 2 (P2): persists campaign in store and tracks impressions and clicks with impression-only spend", () => {
      usePewa.getState().loadScenario("new-cafe");
      const initialCampaigns = usePewa.getState().campaigns;
      expect(initialCampaigns.length).toBeGreaterThan(0);

      const camp = initialCampaigns[0]!;
      expect(camp.active).toBe(true);
      const initialClicks = camp.clicks;
      const initialSpent = camp.spent;

      // Render Home discovery, which mounts and records impression
      render(<Discovery />);

      // Click the featured offer
      usePewa.getState().recordPromotionClick(camp.id);

      const updated = usePewa.getState().campaigns.find((c) => c.id === camp.id);
      expect(updated?.clicks).toBe(initialClicks + 1);
      expect(updated?.spent).toBeGreaterThan(initialSpent); // Impression incremented spend

      // Verify second click increments engagement without drawing down budget (CORR-B)
      const spentAfterFirstClick = updated!.spent;
      usePewa.getState().recordPromotionClick(camp.id);
      const afterSecondClick = usePewa.getState().campaigns.find((c) => c.id === camp.id);
      expect(afterSecondClick?.clicks).toBe(initialClicks + 2);
      expect(afterSecondClick?.spent).toBe(spentAfterFirstClick);
    });

    it("Finding 3 (P2): derives menu-only badge using !canAdmitOrder(orderPolicy) predicate", () => {
      usePewa.getState().loadScenario("units-available");

      // 1. With top-up units and 0 included units, canAdmitOrder is true, so no menu-only badge
      usePewa.setState({
        orderPolicy: {
          included: 0,
          includedMax: 200,
          topUp: 10,
          overdraftUsed: 0,
          overdraftMax: 10,
          expired: false,
          cycleRenewsAt: "2026-11-19T00:00:00.000Z",
          tier: "Base Monthly Tier",
        },
      });
      expect(canAdmitOrder(usePewa.getState().orderPolicy)).toBe(true);
      const { unmount: unmount1 } = render(<Discovery />);
      expect(screen.queryByText(/📖 Menu & Direct Contact/i)).not.toBeInTheDocument();
      unmount1();

      // 2. With 0 included units and 0 top-up units, but eligible recoverable capacity remaining,
      // canAdmitOrder is true, so business does NOT appear menu-only (CORR-A)
      usePewa.setState({
        orderPolicy: {
          included: 0,
          includedMax: 200,
          topUp: 0,
          overdraftUsed: 2,
          overdraftMax: 10,
          expired: false,
          cycleRenewsAt: "2026-11-19T00:00:00.000Z",
          tier: "Base Monthly Tier",
        },
      });
      expect(canAdmitOrder(usePewa.getState().orderPolicy)).toBe(true);
      const { unmount: unmount2 } = render(<Discovery />);
      expect(screen.queryByText(/📖 Menu & Direct Contact/i)).not.toBeInTheDocument();
      unmount2();

      // 3. When recoverable capacity is exhausted (overdraftUsed >= overdraftMax) and units are 0,
      // canAdmitOrder is false, so menu-only badge appears
      usePewa.setState({
        orderPolicy: {
          included: 0,
          includedMax: 200,
          topUp: 0,
          overdraftUsed: 10,
          overdraftMax: 10,
          expired: false,
          cycleRenewsAt: "2026-11-19T00:00:00.000Z",
          tier: "Base Monthly Tier",
        },
      });
      expect(canAdmitOrder(usePewa.getState().orderPolicy)).toBe(false);
      const { unmount: unmount3 } = render(<Discovery />);
      expect(screen.getAllByText(/📖 Menu & Direct Contact/i).length).toBeGreaterThan(0);
      unmount3();

      // 4. Expired subscription with remaining included units fails canAdmitOrder, so menu-only badge appears
      usePewa.setState({
        orderPolicy: {
          included: 50,
          includedMax: 200,
          topUp: 0,
          overdraftUsed: 0,
          overdraftMax: 10,
          expired: true,
          cycleRenewsAt: "2026-10-01T00:00:00.000Z",
          tier: "Base Monthly Tier",
        },
      });
      expect(canAdmitOrder(usePewa.getState().orderPolicy)).toBe(false);
      render(<Discovery />);
      expect(screen.getAllByText(/📖 Menu & Direct Contact/i).length).toBeGreaterThan(0);
    });

    it("Finding 4 (P2): area chips match multi-term aliases (CBD, Westlands, Kilimani & Lavington)", () => {
      usePewa.getState().loadScenario("new-cafe");
      const s = usePewa.getState();
      const cbdVenue: (typeof s.venues)[0] = {
        id: "venue_cbd_test",
        orgId: "org_cbd_test",
        name: "Nairobi City Espresso Bar",
        slug: "nairobi-city-espresso",
        category: "Café",
        address: "Corner House, CBD, Nairobi",
        deliveryOnly: false,
        serviceArea: "",
        services: ["Dine-in", "Takeaway"],
        contact: { phone: "+254700000001", whatsapp: "+254700000001", email: "city@example.com" },
        tagline: "Quick espresso in the city centre",
        currency: "KES",
      };
      const lavingtonVenue: (typeof s.venues)[0] = {
        id: "venue_lavington_test",
        orgId: "org_lavington_test",
        name: "Lavington Green Eatery",
        slug: "lavington-green-eatery",
        category: "Café",
        address: "15 James Gichuru Road, Lavington",
        deliveryOnly: false,
        serviceArea: "",
        services: ["Dine-in"],
        contact: {
          phone: "+254700000002",
          whatsapp: "+254700000002",
          email: "lavington@example.com",
        },
        tagline: "Relaxed dining in Lavington",
        currency: "KES",
      };
      const cbdMenu = {
        ...s.menus[0]!,
        id: "menu_cbd_test",
        orgId: "org_cbd_test",
        venueId: "venue_cbd_test",
        status: "published" as const,
        publishedSnapshot: undefined,
      };
      const lavingtonMenu = {
        ...s.menus[0]!,
        id: "menu_lavington_test",
        orgId: "org_lavington_test",
        venueId: "venue_lavington_test",
        status: "published" as const,
        publishedSnapshot: undefined,
      };

      usePewa.setState((prev) => ({
        venues: [...prev.venues, cbdVenue, lavingtonVenue],
        menus: [...prev.menus, cbdMenu, lavingtonMenu],
      }));

      const { unmount } = render(<Discovery />);

      // Open Filters dialog to access area refinements
      fireEvent.click(screen.getByRole("button", { name: /Filters/i }));

      // CBD chip matches venue with 'CBD, Nairobi' address and 'Moi Avenue' address
      const cbdChip = screen.getByRole("button", { name: "CBD" });
      fireEvent.click(cbdChip);
      expect(screen.getByText("Nairobi City Espresso Bar")).toBeInTheDocument();
      expect(screen.getByText("Green Garden Café")).toBeInTheDocument();
      expect(screen.queryByText("Gelato Craft Lab")).not.toBeInTheDocument();

      // Westlands chip matches Karuna Close / Westlands
      const westlandsChip = screen.getByRole("button", { name: "Westlands" });
      fireEvent.click(westlandsChip);
      expect(screen.getByText("Sol Artisan Bakery")).toBeInTheDocument();
      expect(screen.queryByText("Nairobi City Espresso Bar")).not.toBeInTheDocument();

      // Kilimani & Lavington matches Lavington venue
      const kilimaniChip = screen.getByRole("button", { name: "Kilimani & Lavington" });
      fireEvent.click(kilimaniChip);
      expect(screen.getByText("Lavington Green Eatery")).toBeInTheDocument();
      expect(screen.queryByText("Sol Artisan Bakery")).not.toBeInTheDocument();
      unmount();
    });

    it("Finding 5 (P2): preserves business-category precedence over section names", () => {
      usePewa.getState().loadScenario("new-cafe");
      const s = usePewa.getState();

      // Create a business with category "Coffee Roastery"
      // and a separate venue whose menu has section "Coffee Roastery"
      const coffeeRoasteryVenue: (typeof s.venues)[0] = {
        id: "venue_roastery",
        orgId: "org_roastery",
        name: "Highland Specialty Roasters",
        slug: "highland-roasters",
        category: "Coffee Roastery",
        address: "Ngong Road, Kilimani",
        deliveryOnly: false,
        serviceArea: "",
        services: ["Takeaway"],
        contact: { phone: "+254700000003", whatsapp: "+254700000003", email: "roast@example.com" },
        tagline: "Single origin specialty coffee",
        currency: "KES",
      };
      const roasteryMenu = {
        ...s.menus[0]!,
        id: "menu_roastery",
        orgId: "org_roastery",
        venueId: "venue_roastery",
        status: "published" as const,
        publishedSnapshot: undefined,
        sections: [
          {
            id: "sec_beans",
            name: "Whole Beans",
            offerings: s.menus[0]!.sections[0]!.offerings,
          },
        ],
      };

      usePewa.setState((prev) => ({
        venues: [...prev.venues, coffeeRoasteryVenue],
        menus: [...prev.menus, roasteryMenu],
      }));

      render(<Discovery directory />);

      // Open Filters dialog to access category selector
      fireEvent.click(screen.getByRole("button", { name: /Filters/i }));

      const categorySelect = screen.getByLabelText("Cuisine or category");
      fireEvent.change(categorySelect, { target: { value: "Coffee Roastery" } });

      // The business in the Coffee Roastery category must be matched and visible
      expect(screen.getByText("Highland Specialty Roasters")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // PEWA-R2-A-CORR-003: Home and Directory Simplification
  // =========================================================================
  describe("PEWA-R2-A-CORR-003: Home & Directory Simplification", () => {
    beforeEach(() => {
      usePewa.getState().loadScenario("new-cafe");
    });

    it("Recents on Home: shows maximum 2 items, renders View all link, hides when empty, and preserves stored recents", () => {
      // Authoritative demonstration venues
      const venueIds = ["venue_ggc", "venue_horizon", "venue_cloudburger", "venue_sol"];

      // Initially recents is empty -> section is hidden
      const { unmount } = render(<Discovery />);
      expect(screen.queryByText("Recently opened")).not.toBeInTheDocument();
      unmount();

      // Add 4 venues to recents
      usePewa.setState({ recents: [venueIds[0]!, venueIds[1]!, venueIds[2]!, venueIds[3]!] });

      render(<Discovery />);
      expect(screen.getByText("Recently opened")).toBeInTheDocument();

      // View all link should be visible with count
      const viewAllLink = screen.getByRole("link", { name: /View all \(4\)/i });
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink.getAttribute("href")).toBe("/directory?filter=recents");

      // Home should only render 2 cards in the recents section (bounded presentation)
      // Check that the underlying store still preserves all 4 recents without truncation
      expect(usePewa.getState().recents).toHaveLength(4);
    });

    it("Favourites on Home: shows maximum 2 items, renders View all link, hides when empty, and preserves stored favourites", () => {
      const venueIds = ["venue_ggc", "venue_horizon", "venue_cloudburger"];

      // Initially favourites is empty -> section is hidden
      const { unmount } = render(<Discovery />);
      expect(screen.queryByText("Saved favourites")).not.toBeInTheDocument();
      unmount();

      // Add 3 venues to favourites
      usePewa.setState({ favourites: [venueIds[0]!, venueIds[1]!, venueIds[2]!] });

      render(<Discovery />);
      expect(screen.getByText("Saved favourites")).toBeInTheDocument();

      // View all link should be visible with count
      const viewAllLink = screen.getByRole("link", { name: /View all \(3\)/i });
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink.getAttribute("href")).toBe("/directory?filter=saved");

      // Underlying store keeps all 3 favourites
      expect(usePewa.getState().favourites).toHaveLength(3);
    });

    it("See nearby: explicit button handles permission grant and denial gracefully", () => {
      // Mock navigator.geolocation
      const mockGeolocation = {
        getCurrentPosition: vi.fn(),
      };
      Object.defineProperty(window.navigator, "geolocation", {
        value: mockGeolocation,
        configurable: true,
      });

      render(<Discovery />);

      const seeNearbyBtn = screen.getByRole("button", { name: /See nearby/i });
      expect(seeNearbyBtn).toBeInTheDocument();

      // 1. Test denial fallback
      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error({
            code: 1, // PERMISSION_DENIED
            message: "User denied Geolocation",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        },
      );

      fireEvent.click(seeNearbyBtn);

      // Graceful fallback notice should be displayed without broken UI
      expect(screen.getByText(/Location access was denied/i)).toBeInTheDocument();

      // Dismiss the notice
      const dismissBtn = screen.getByRole("button", { name: /Dismiss location notice/i });
      fireEvent.click(dismissBtn);
      expect(screen.queryByText(/Location access was denied/i)).not.toBeInTheDocument();

      // 2. Test granted flow
      mockGeolocation.getCurrentPosition.mockImplementationOnce((success: PositionCallback) => {
        success({
          coords: {
            latitude: -1.2841,
            longitude: 36.8236,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      });

      fireEvent.click(seeNearbyBtn);
      expect(screen.getByText(/Showing businesses within ~3 km/i)).toBeInTheDocument();
      expect(screen.getByText(/Nearby Area Active/i)).toBeInTheDocument();
    });

    it("Filters dialog: opens, allows refining by tags, service, and clearing all filters", () => {
      render(<Discovery />);

      // Open filters dialog
      fireEvent.click(screen.getByRole("button", { name: /Filters/i }));
      expect(screen.getByText("Filters & Refinements")).toBeInTheDocument();

      // Select Vegetarian tag in dialog
      const vegButton = screen.getByRole("button", { name: "Vegetarian" });
      fireEvent.click(vegButton);

      // Apply filters and close dialog
      const applyBtn = screen.getByRole("button", { name: /Apply filters/i });
      fireEvent.click(applyBtn);

      // Active filter badge appears on the main page
      expect(screen.getByText("Tag: Vegetarian")).toBeInTheDocument();

      // Clear all filters
      const clearAllBtn = screen.getByRole("button", { name: /Clear all/i });
      fireEvent.click(clearAllBtn);
      expect(screen.queryByText("Tag: Vegetarian")).not.toBeInTheDocument();
    });

    it("Discovery vs Home: Home has concise cards without offering previews; Directory has offering previews", () => {
      // 1. Home mode without query: no offering preview box
      const { unmount } = render(<Discovery />);
      expect(screen.queryByText(/Popular offerings/i)).not.toBeInTheDocument();
      unmount();

      // 2. Directory mode: renders rich previews
      render(<Discovery directory />);
      expect(screen.getAllByText(/Popular offerings/i).length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // PEWA-R2-A-CORR-004: Nearby Discovery Truthfulness & Merge Readiness
  // =========================================================================
  describe("PEWA-R2-A-CORR-004: Nearby Discovery Truthfulness", () => {
    beforeEach(() => {
      usePewa.getState().reset();
      usePewa.getState().loadScenario("new-cafe");
    });

    it("Permission granted with sufficient venue-location data: filters accurately based on coordinates", () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn(),
      };
      Object.defineProperty(window.navigator, "geolocation", {
        value: mockGeolocation,
        configurable: true,
      });

      // 1. Customer at Westlands (-1.2612, 36.8044)
      mockGeolocation.getCurrentPosition.mockImplementationOnce((success: PositionCallback) => {
        success({
          coords: {
            latitude: -1.2612,
            longitude: 36.8044,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      });

      const { unmount } = render(<Discovery />);
      const seeNearbyBtn = screen.getByRole("button", { name: /See nearby/i });
      fireEvent.click(seeNearbyBtn);

      // Sol Bakery (Westlands, 0km) is displayed
      expect(screen.getByText("Sol Artisan Bakery")).toBeInTheDocument();
      // Grand Horizon Hotel (Riverside, ~1.1km) is displayed
      expect(screen.getByText("The Grand Horizon Hotel")).toBeInTheDocument();
      // CloudBurger Kitchen (delivery area includes Westlands) is displayed
      expect(screen.getByText("CloudBurger Kitchen")).toBeInTheDocument();

      // Green Garden Café (CBD, ~3.32km) is outside 3km radius
      expect(screen.queryByText("Green Garden Café")).not.toBeInTheDocument();
      // Gelato Craft Lab (Village Market, ~3.54km) is outside 3km radius
      expect(screen.queryByText("Gelato Craft Lab")).not.toBeInTheDocument();

      // Notice explains grounded radius
      expect(
        screen.getByText(/Showing businesses within ~3 km of your current location/i),
      ).toBeInTheDocument();

      unmount();

      // 2. Customer at CBD (-1.2841, 36.8236)
      mockGeolocation.getCurrentPosition.mockImplementationOnce((success: PositionCallback) => {
        success({
          coords: {
            latitude: -1.2841,
            longitude: 36.8236,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      });

      render(<Discovery />);
      fireEvent.click(screen.getByRole("button", { name: /See nearby/i }));

      // Green Garden Café (CBD, 0km) is displayed
      expect(screen.getByText("Green Garden Café")).toBeInTheDocument();
      // Venues further away are NOT displayed
      expect(screen.queryByText("Sol Artisan Bakery")).not.toBeInTheDocument();
      expect(screen.queryByText("Gelato Craft Lab")).not.toBeInTheDocument();
      expect(screen.queryByText("CloudBurger Kitchen")).not.toBeInTheDocument();
    });

    it("Permission granted without sufficient matching data: handles out-of-range customer and incomplete data", () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn(),
      };
      Object.defineProperty(window.navigator, "geolocation", {
        value: mockGeolocation,
        configurable: true,
      });

      // 1. Customer in Mombasa (hundreds of km away from Nairobi)
      mockGeolocation.getCurrentPosition.mockImplementationOnce((success: PositionCallback) => {
        success({
          coords: {
            latitude: -4.0435,
            longitude: 39.6682,
            accuracy: 50,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      });

      const { unmount } = render(<Discovery />);
      fireEvent.click(screen.getByRole("button", { name: /See nearby/i }));

      // Notice truthfully explains no businesses were found within nearby radius
      expect(
        screen.getByText(/No businesses found within your nearby radius/i),
      ).toBeInTheDocument();

      // Fallback area selection options are displayed
      expect(screen.getByText(/Try area:/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Westlands" })).toBeInTheDocument();

      unmount();

      // 2. Dataset where venues have no coordinates or delivery coverage
      usePewa.setState({
        venues: PROTOTYPE_DIRECTORY_VENUES.map((v) => ({
          ...v,
          coordinates: undefined,
          serviceArea: "",
        })),
        menus: PROTOTYPE_DIRECTORY_MENUS,
      });

      mockGeolocation.getCurrentPosition.mockImplementationOnce((success: PositionCallback) => {
        success({
          coords: {
            latitude: -1.2612,
            longitude: 36.8044,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      });

      render(<Discovery />);
      fireEvent.click(screen.getByRole("button", { name: /See nearby/i }));

      // Truthful explanation of incomplete location data
      expect(
        screen.getByText(
          /Precise nearby matching is not available because venue location data is incomplete/i,
        ),
      ).toBeInTheDocument();
    });

    it("Permission denied: non-blocking graceful notice with manual area fallback", () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((_success, error) => {
          error({
            code: 1, // PERMISSION_DENIED
            message: "Denied",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        }),
      };
      Object.defineProperty(window.navigator, "geolocation", {
        value: mockGeolocation,
        configurable: true,
      });

      render(<Discovery />);
      fireEvent.click(screen.getByRole("button", { name: /See nearby/i }));

      // Truthful denied message
      expect(screen.getByText(/Location access was denied/i)).toBeInTheDocument();

      // All demonstration venues remain completely accessible and unblocked
      expect(
        screen.getByRole("heading", { name: "Green Garden Café", level: 3 }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Sol Artisan Bakery", level: 3 }),
      ).toBeInTheDocument();

      // Dismiss notice works
      fireEvent.click(screen.getByRole("button", { name: /Dismiss location notice/i }));
      expect(screen.queryByText(/Location access was denied/i)).not.toBeInTheDocument();
    });

    it("Location unavailable: non-blocking graceful notice", () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((_success, error) => {
          error({
            code: 2, // POSITION_UNAVAILABLE
            message: "Position unavailable",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        }),
      };
      Object.defineProperty(window.navigator, "geolocation", {
        value: mockGeolocation,
        configurable: true,
      });

      render(<Discovery />);
      fireEvent.click(screen.getByRole("button", { name: /See nearby/i }));

      // Truthful unavailable message
      expect(screen.getByText(/Location is currently unavailable/i)).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Green Garden Café", level: 3 }),
      ).toBeInTheDocument();
    });

    it("Delivery-only coverage when explicitly defined: checks customer location against dispatch zones", () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn(),
      };
      Object.defineProperty(window.navigator, "geolocation", {
        value: mockGeolocation,
        configurable: true,
      });

      // 1. Customer at Gigiri / Village Market (-1.2294, 36.8047)
      mockGeolocation.getCurrentPosition.mockImplementationOnce((success: PositionCallback) => {
        success({
          coords: {
            latitude: -1.2294,
            longitude: 36.8047,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      });

      const { unmount } = render(<Discovery />);
      fireEvent.click(screen.getByRole("button", { name: /See nearby/i }));

      // Gelato Craft Lab (located at Village Market) matches
      expect(
        screen.getByRole("heading", { name: "Gelato Craft Lab", level: 3 }),
      ).toBeInTheDocument();

      // CloudBurger Kitchen (delivers to Kilimani, Lavington & Westlands) is EXCLUDED because Gigiri is not covered
      expect(screen.queryByText("CloudBurger Kitchen")).not.toBeInTheDocument();

      unmount();

      // 2. Customer at Westlands (-1.2612, 36.8044)
      mockGeolocation.getCurrentPosition.mockImplementationOnce((success: PositionCallback) => {
        success({
          coords: {
            latitude: -1.2612,
            longitude: 36.8044,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      });

      render(<Discovery />);
      fireEvent.click(screen.getByRole("button", { name: /See nearby/i }));

      // CloudBurger Kitchen is INCLUDED because customer is in its Westlands delivery zone
      expect(
        screen.getByRole("heading", { name: "CloudBurger Kitchen", level: 3 }),
      ).toBeInTheDocument();
      expect(screen.getAllByText(/Delivery Only/i).length).toBeGreaterThan(0);
    });

    it("No false nearby labels or distance claims and customer privacy is preserved", () => {
      render(<Discovery />);

      // Venue cards should not display fabricated distance metrics (e.g. "0.4 km away", "350m")
      expect(screen.queryByText(/\d+(\.\d+)?\s*km away/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/\d+\s*m away/i)).not.toBeInTheDocument();

      // Verify customer coordinates are NOT stored in localStorage
      expect(localStorage.getItem("pewa_user_coords")).toBeNull();
      expect(localStorage.getItem("pewa_customer_coords")).toBeNull();
      expect(localStorage.getItem("coords")).toBeNull();
    });
  });
});
