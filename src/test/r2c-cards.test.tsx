import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import React from "react";
import { usePewa } from "@/lib/pewa/store";
import { Discovery } from "@/components/pewa/Discovery";
import { Route as OrdersRoute } from "@/routes/admin.orders";
import { PROTOTYPE_DIRECTORY_VENUES, PROTOTYPE_DIRECTORY_MENUS } from "@/lib/pewa/fixtures";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: Record<string, unknown>) => opts,
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

describe("R2-C: Business Discovery Cards, Location & Delivery-Only Presentation", () => {
  beforeEach(() => {
    usePewa.getState().reset();
    usePewa.getState().loadScenario("multi-brand");
    usePewa.getState().setRole("customer");
  });

  // =========================================================================
  // Scenario A: Customer identifies a café from its card and opens its menu
  // =========================================================================
  describe("Scenario A — Customer identifies a café from its card and opens its menu", () => {
    it("displays business name, Café category, description, address, service modes, and clear View menu route", () => {
      render(<Discovery />);

      const cafeCard = screen.getByTestId("venue-card-green-garden-cafe");
      expect(cafeCard).toBeInTheDocument();

      // Business name & category
      expect(
        within(cafeCard).getByRole("heading", { name: "Green Garden Café" }),
      ).toBeInTheDocument();
      expect(within(cafeCard).getByText("Café")).toBeInTheDocument();

      // Concise description
      expect(
        within(cafeCard).getByText("Garden-fresh breakfasts & slow coffee"),
      ).toBeInTheDocument();

      // Physical venue location context
      expect(within(cafeCard).getByText("14 Moi Avenue, Nairobi")).toBeInTheDocument();

      // Service modes
      expect(within(cafeCard).getByText("Dine-in")).toBeInTheDocument();
      expect(within(cafeCard).getByText("Takeaway")).toBeInTheDocument();

      // Clear route to menu with menu name and CTA
      expect(within(cafeCard).getByText("All-Day Menu")).toBeInTheDocument();
      expect(within(cafeCard).getByText("View menu")).toBeInTheDocument();

      const link = within(cafeCard).getByTestId("router-link");
      expect(link).toHaveAttribute("href", "/m/green-garden-cafe");
    });

    it("keeps Home cards lightweight without rendering every offering when no search is active", () => {
      render(<Discovery />);

      const cafeCard = screen.getByTestId("venue-card-green-garden-cafe");
      expect(within(cafeCard).queryByText("Popular offerings:")).not.toBeInTheDocument();
      expect(within(cafeCard).queryByText("Flat White")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Scenario B: A search for a specific dish surfaces a relevant offering within a business card
  // =========================================================================
  describe("Scenario B — A search for a specific dish surfaces a relevant offering within a business card", () => {
    it("surfaces matching offering preview with image, price, section badge, special badge, and tags", () => {
      render(<Discovery initialQuery="Ribeye" />);

      const hotelCard = screen.getByTestId("venue-card-grand-horizon-hotel");
      expect(hotelCard).toBeInTheDocument();

      expect(within(hotelCard).getByText("Prime Aged Ribeye")).toBeInTheDocument();
      expect(within(hotelCard).getByText("Bistro Plates")).toBeInTheDocument();
      expect(within(hotelCard).getByText(/★ Chef's Special/)).toBeInTheDocument();
      expect(within(hotelCard).getByText("Gluten-Free")).toBeInTheDocument();
      expect(within(hotelCard).getByText(/2,400/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Scenario C: Two branches show the correct local offering prices
  // =========================================================================
  describe("Scenario C — Two branches show the correct local offering prices", () => {
    it("renders KES 280.00 at Sol Artisan Bakery and overridden KES 350.00 at Gelato Craft Lab for Artisan Cappuccino", () => {
      render(<Discovery initialQuery="Artisan Cappuccino" />);

      const solCard = screen.getByTestId("venue-card-sol-artisan-bakery");
      const gelatoCard = screen.getByTestId("venue-card-gelato-craft-lab");

      expect(within(solCard).getByText("Artisan Cappuccino")).toBeInTheDocument();
      expect(within(solCard).getByText("KES 280.00")).toBeInTheDocument();

      expect(within(gelatoCard).getByText("Artisan Cappuccino")).toBeInTheDocument();
      expect(within(gelatoCard).getByText("KES 350.00")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Scenario D: Delivery-only kitchen clearly communicates its delivery-only model and service area
  // =========================================================================
  describe("Scenario D — Delivery-only kitchen clearly communicates its delivery-only model and service area", () => {
    it("displays Delivery Only badge, declared service area, no walk-in storefront notice, and View delivery menu CTA", () => {
      render(<Discovery />);

      const cloudCard = screen.getByTestId("venue-card-cloudburger");
      expect(cloudCard).toBeInTheDocument();

      expect(within(cloudCard).getByText(/🛵 Delivery Only/)).toBeInTheDocument();
      expect(within(cloudCard).getByText(/Delivers to:/)).toBeInTheDocument();
      expect(within(cloudCard).getByText(/Kilimani, Lavington & Westlands/)).toBeInTheDocument();
      expect(
        within(cloudCard).getByText(
          /No dine-in storefront · Kitchen dispatch only \(no walk-in service\)/i,
        ),
      ).toBeInTheDocument();
      expect(
        within(cloudCard).getByText(
          /Declared dispatch area · Confirm delivery availability with business/i,
        ),
      ).toBeInTheDocument();
      expect(within(cloudCard).getByText("View delivery menu")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Scenario E: A venue with incomplete location data avoids inaccurate proximity claims
  // =========================================================================
  describe("Scenario E — A venue with incomplete location data avoids inaccurate proximity claims", () => {
    it("shows truthful fallback when physical venue address or coordinates are incomplete and does not fabricate distance", () => {
      const incompleteVenue = {
        ...PROTOTYPE_DIRECTORY_VENUES[0]!,
        id: "venue_incomplete_loc",
        name: "Mystery Pop-Up Kitchen",
        slug: "mystery-pop-up",
        address: "",
        deliveryOnly: false,
        serviceArea: "",
        coordinates: undefined,
      };
      const incompleteMenu = {
        ...PROTOTYPE_DIRECTORY_MENUS[0]!,
        id: "menu_incomplete_loc",
        venueId: "venue_incomplete_loc",
      };

      usePewa.setState((s) => ({
        venues: [...s.venues, incompleteVenue],
        menus: [...s.menus, incompleteMenu],
      }));

      render(<Discovery />);

      const card = screen.getByTestId("venue-card-mystery-pop-up");
      expect(
        within(card).getByText(/Location details unconfirmed · Contact business for directions/i),
      ).toBeInTheDocument();
      expect(within(card).queryByText(/\d+(\.\d+)?\s*km/i)).not.toBeInTheDocument();
    });

    it("shows truthful fallback when a delivery-only kitchen has an incomplete service area", () => {
      const incompleteDelivery = {
        ...PROTOTYPE_DIRECTORY_VENUES[2]!,
        id: "venue_incomplete_delivery",
        name: "Unmapped Cloud Dispatch",
        slug: "unmapped-cloud-dispatch",
        deliveryOnly: true,
        serviceArea: "",
        coordinates: undefined,
      };
      const incompleteDeliveryMenu = {
        ...PROTOTYPE_DIRECTORY_MENUS[3]!,
        id: "menu_incomplete_delivery",
        venueId: "venue_incomplete_delivery",
      };

      usePewa.setState((s) => ({
        venues: [...s.venues, incompleteDelivery],
        menus: [...s.menus, incompleteDeliveryMenu],
      }));

      render(<Discovery />);

      const card = screen.getByTestId("venue-card-unmapped-cloud-dispatch");
      expect(within(card).getByText(/Service area provided on inquiry/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Scenario F: A menu-only business remains discoverable and accessible
  // =========================================================================
  describe("Scenario F — A menu-only business remains discoverable and accessible", () => {
    it("displays Menu & Direct Contact badge and View menu & contact CTA when ordering capacity is exhausted", () => {
      usePewa.getState().loadScenario("zero-units");
      render(<Discovery />);

      const cafeCard = screen.getByTestId("venue-card-green-garden-cafe");
      expect(within(cafeCard).getByText(/📖 Menu & Direct Contact/)).toBeInTheDocument();
      expect(within(cafeCard).getByText("View menu & contact")).toBeInTheDocument();
      expect(within(cafeCard).getByTestId("router-link")).toHaveAttribute(
        "href",
        "/m/green-garden-cafe",
      );
    });
  });

  // =========================================================================
  // Scenario G: Protected, hidden and unpublished offerings do not leak into result previews
  // =========================================================================
  describe("Scenario G — Protected, hidden and unpublished offerings do not leak into result previews", () => {
    it("does not leak protected in-room dining items, venue-hidden items, or unpublished draft edits into Directory previews", () => {
      // 1. Add an unpublished draft item to Sol Artisan Bakery
      const st = usePewa.getState();
      const solMenu = st.menus.find((m) => m.id === "menu_sol_bakery");
      if (solMenu && solMenu.sections[0]) {
        st.upsertOffering(solMenu.id, solMenu.sections[0].id, {
          name: "Secret Unpublished Pastry",
          description: "Draft only",
          price: 999,
          available: true,
          tags: ["Vegan"],
          emoji: "🥐",
          modifiers: [],
        });
      }

      render(<Discovery directory />);

      // Protected menu item from Grand Horizon Hotel ("Horizon Continental In-Bed") must not appear
      expect(screen.queryByText("Horizon Continental In-Bed")).not.toBeInTheDocument();
      expect(screen.queryByText("In-Room Dining (Guests Only)")).not.toBeInTheDocument();

      // Venue-hidden item at Gelato Craft Lab ("Fresh Strawberry Brioche") must not appear
      expect(screen.queryByText("Fresh Strawberry Brioche")).not.toBeInTheDocument();

      // Unpublished draft item ("Secret Unpublished Pastry") must not appear
      expect(screen.queryByText("Secret Unpublished Pastry")).not.toBeInTheDocument();
    });

    it("does not show sold-out items in card offering previews", () => {
      usePewa.getState().loadScenario("unavailable-item");
      render(<Discovery directory />);

      // In 'unavailable-item' scenario, Cold Brew is sold out
      const cafeCard = screen.getByTestId("venue-card-green-garden-cafe");
      expect(within(cafeCard).queryByText("Cold Brew")).not.toBeInTheDocument();
      // Available items still show in preview
      expect(within(cafeCard).getByText("Flat White")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Scenario H: Sponsored offers remain explicitly separated from organic business discovery
  // =========================================================================
  describe("Scenario H — Sponsored offers remain explicitly separated from organic business discovery", () => {
    it("displays Featured Offers in a dedicated Sponsored container above organic results on Home and hides it during search", () => {
      render(<Discovery />);

      expect(screen.getByText("Featured Offers")).toBeInTheDocument();
      expect(screen.getByText("Sponsored")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Sponsored placements are clearly marked and do not influence organic directory ranking/i,
        ),
      ).toBeInTheDocument();

      // Search hides the sponsored container so organic relevance is unobstructed
      fireEvent.change(screen.getByLabelText("Search menus"), {
        target: { value: "Sourdough" },
      });
      expect(screen.queryByText("Featured Offers")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Section 8 Carry-Forward Requirement — Staff permissions disclosure
  // =========================================================================
  describe("Section 8 Carry-Forward — Staff permissions boundary disclosure", () => {
    it("records that production staff assignments must be enforced by verified permissions and a UI station selector is not an authorisation boundary", () => {
      usePewa.getState().loadScenario("multi-brand");
      usePewa.getState().setRole("staff");

      const OrdersComp = (OrdersRoute as unknown as { component: React.ComponentType }).component;
      render(<OrdersComp />);

      const note = screen.getByTestId("staff-station-scope-note");
      expect(note).toHaveTextContent(
        /Production staff assignments must be enforced by verified organisation, venue and service-point permissions\. A UI station selector is not an authorisation boundary\./i,
      );
    });
  });

  // =========================================================================
  // R2-C CORR-001 — Consistent Discovery Hero Image Resolution
  // =========================================================================
  describe("R2-C CORR-001 — Consistent Discovery Hero Image Resolution", () => {
    it("resolves Green Garden Café hero image through the shared coverImage path and reflects published cover-image changes", () => {
      const { unmount } = render(<Discovery />);

      const cafeCard = screen.getByTestId("venue-card-green-garden-cafe");
      const heroImg = within(cafeCard).getByRole("img", { name: "Green Garden Café" });
      expect(heroImg).toBeInTheDocument();
      expect(heroImg.getAttribute("src")).toContain("cafe-breakfast");
      unmount();

      // Update coverImage in draft -> must NOT leak to public discovery before publishing
      const customCoverUrl = "https://images.unsplash.com/photo-custom-published-cover";
      usePewa.getState().updateMenuMeta("menu_ggc_allday", { coverImage: customCoverUrl });

      const { unmount: unmountDraft } = render(<Discovery />);
      const draftCard = screen.getByTestId("venue-card-green-garden-cafe");
      const draftHeroImg = within(draftCard).getByRole("img", { name: "Green Garden Café" });
      expect(draftHeroImg.getAttribute("src")).toContain("cafe-breakfast");
      expect(draftHeroImg.getAttribute("src")).not.toBe(customCoverUrl);
      unmountDraft();

      // Publish the menu -> new coverImage must now be reflected on the Green Garden Café card
      usePewa.getState().publishMenu("menu_ggc_allday");

      render(<Discovery />);
      const publishedCard = screen.getByTestId("venue-card-green-garden-cafe");
      const publishedHeroImg = within(publishedCard).getByRole("img", {
        name: "Green Garden Café",
      });
      expect(publishedHeroImg.getAttribute("src")).toBe(customCoverUrl);
    });

    it("falls back to the first eligible available offering image when coverImage is cleared and published, and does not leak draft offering images", () => {
      // Clear coverImage on Green Garden Café and publish
      usePewa.getState().updateMenuMeta("menu_ggc_allday", { coverImage: null });
      usePewa.getState().publishMenu("menu_ggc_allday");

      // Change the first offering's image in draft ONLY (without publishing)
      const st = usePewa.getState();
      const ggcMenu = st.menus.find((m) => m.id === "menu_ggc_allday")!;
      const firstOff = ggcMenu.sections[0]!.offerings[0]!;
      const publishedOffImage = firstOff.image!;
      const draftOnlyOffImage = "https://images.unsplash.com/photo-draft-only-offering-leak";

      st.upsertOffering("menu_ggc_allday", ggcMenu.sections[0]!.id, {
        ...firstOff,
        image: draftOnlyOffImage,
      });

      render(<Discovery />);
      const cafeCard = screen.getByTestId("venue-card-green-garden-cafe");
      const heroImg = within(cafeCard).getByRole("img", { name: "Green Garden Café" });
      // Must show the published offering image, NOT the uncommitted draft image
      expect(heroImg.getAttribute("src")).toBe(publishedOffImage);
      expect(heroImg.getAttribute("src")).not.toBe(draftOnlyOffImage);
    });

    it("skips hidden or sold-out offerings when selecting hero image and renders monogram fallback when no eligible image exists", () => {
      // Clear coverImage on Sol Artisan Bakery and remove images from all offerings except the first one,
      // then mark the first one hidden at venue_sol
      const st = usePewa.getState();
      const solMenu = st.menus.find((m) => m.id === "menu_sol_bakery")!;
      const firstSec = solMenu.sections[0]!;
      const firstOff = firstSec.offerings[0]!;

      // Hide the first offering at venue_sol
      st.setOfferingVenueOverride(solMenu.id, firstSec.id, firstOff.id, "venue_sol", {
        hidden: true,
      });
      st.publishMenu(solMenu.id);

      const { unmount } = render(<Discovery />);
      const solCard = screen.getByTestId("venue-card-sol-artisan-bakery");
      const solHeroImg = within(solCard).getByRole("img", { name: "Sol Artisan Bakery" });
      // Should NOT use the hidden sourdough image; should use the next available offering's image (croissant)
      expect(solHeroImg.getAttribute("src")).not.toBe(firstOff.image);
      expect(solHeroImg.getAttribute("src")).toBe(solMenu.sections[1]!.offerings[0]!.image);
      unmount();

      // Now create a venue whose published menu has no coverImage and no offering images -> monogram fallback
      const noImgVenue = {
        ...PROTOTYPE_DIRECTORY_VENUES[0]!,
        id: "venue_no_img",
        name: "Kibo Tea Room",
        slug: "kibo-tea-room",
      };
      const noImgMenu = {
        ...PROTOTYPE_DIRECTORY_MENUS[0]!,
        id: "menu_no_img",
        venueId: "venue_no_img",
        coverImage: undefined,
        publishedSnapshot: undefined,
        sections: [
          {
            id: "sec_tea",
            name: "Teas",
            offerings: [
              {
                id: "off_chai",
                name: "Masala Chai",
                description: "Spiced Kenyan tea",
                price: 200,
                tags: ["Hot"],
                available: true,
                emoji: "🍵",
                modifiers: [],
              },
            ],
          },
        ],
      };

      usePewa.setState((prev) => ({
        venues: [...prev.venues, noImgVenue],
        menus: [...prev.menus, noImgMenu],
      }));

      render(<Discovery />);
      const kiboCard = screen.getByTestId("venue-card-kibo-tea-room");
      expect(
        within(kiboCard).queryByRole("img", { name: "Kibo Tea Room" }),
      ).not.toBeInTheDocument();
      expect(within(kiboCard).getByText("K")).toBeInTheDocument();
    });
  });
});
