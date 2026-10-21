import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { formatPrice, usePewa } from "@/lib/pewa/store";
import { Discovery } from "@/components/pewa/Discovery";

// Mock @tanstack/react-router Link for testing
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
    onClick?: () => void;
    className?: string;
  }) => {
    let href = to;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        href = href.replace(`$${k}`, v);
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
    it("displays header, search input, category chips, neighborhood chips, quick tags, and all venues", () => {
      render(<Discovery />);

      // Header and search
      expect(screen.getByText("pewa")).toBeInTheDocument();
      expect(screen.getByText("What’s on the menu?")).toBeInTheDocument();
      expect(screen.getByLabelText("Search menus")).toBeInTheDocument();

      // Category chips
      expect(screen.getByRole("button", { name: "All categories" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cafés/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Bakeries/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Restaurants & Grills/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cloud Kitchens/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Gelato & Sweets/i })).toBeInTheDocument();

      // Neighborhood chips
      expect(screen.getByRole("button", { name: "All areas" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "CBD" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Westlands" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Riverside" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Kilimani & Lavington" })).toBeInTheDocument();

      // Quick tags
      expect(screen.getByRole("button", { name: "All tags" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Vegetarian" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Vegan" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Gluten-Free" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Halal" })).toBeInTheDocument();

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
});
