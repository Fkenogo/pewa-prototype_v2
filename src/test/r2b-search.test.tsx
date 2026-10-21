import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { usePewa } from "@/lib/pewa/store";
import { Discovery } from "@/components/pewa/Discovery";

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

describe("R2-B: Search & Relevance Refinement", () => {
  beforeEach(() => {
    usePewa.getState().reset();
    usePewa.getState().loadScenario("multi-brand");
  });

  describe("Scenario Search A — Dish search returns relevant published offerings", () => {
    it("matches specific dish names (e.g. sourdough) and displays qualifying item card", () => {
      render(<Discovery initialQuery="sourdough" />);

      // Sol Artisan Bakery should match with Country Sourdough Loaf
      expect(screen.getByText("Sol Artisan Bakery")).toBeInTheDocument();
      expect(screen.getByText("Country Sourdough Loaf")).toBeInTheDocument();
      // Should show the matching offering count banner
      expect(screen.getByText(/matching item/i)).toBeInTheDocument();
    });

    it("matches specific beverages (e.g. cold brew) across relevant venues", () => {
      render(<Discovery initialQuery="cold brew" />);

      // Green Garden Café should appear with Cold Brew
      expect(screen.getByText("Green Garden Café")).toBeInTheDocument();
      expect(screen.getByText("Cold Brew")).toBeInTheDocument();
    });
  });

  describe("Scenario Search B — Dietary tags and categories search", () => {
    it("matches dietary tags (e.g. vegan) across published offerings without permanent chip rows", () => {
      render(<Discovery initialQuery="vegan" />);

      // Venues with vegan items should show up
      expect(screen.getByText("Green Garden Café")).toBeInTheDocument();
      // Verify no permanent row of tag chips exists on Home (chips only exist in the modal dialog)
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("matches gluten-free tag query across offerings", () => {
      render(<Discovery initialQuery="gluten-free" />);

      expect(screen.getByText("Gelato Craft Lab")).toBeInTheDocument();
    });
  });

  describe("Scenario Search C — Neighborhood, delivery-only, and compound multi-token queries", () => {
    it("matches neighborhood location searches (e.g. westlands)", () => {
      render(<Discovery initialQuery="westlands" />);

      // Sol Artisan Bakery is in Westlands (Karuna Close)
      expect(screen.getByText("Sol Artisan Bakery")).toBeInTheDocument();
    });

    it("matches CBD neighborhood searches", () => {
      render(<Discovery initialQuery="cbd" />);

      // Green Garden Café is on Moi Avenue / CBD
      expect(screen.getByText("Green Garden Café")).toBeInTheDocument();
    });

    it("matches delivery-only kitchen query (e.g. delivery or cloud kitchen)", () => {
      render(<Discovery initialQuery="cloud kitchen" />);

      // CloudBurger Kitchen is delivery-only
      expect(screen.getByText("CloudBurger Kitchen")).toBeInTheDocument();
      expect(screen.getAllByText(/Delivery Only/i).length).toBeGreaterThan(0);
    });

    it("satisfies compound queries combining venue location and offering (e.g. westlands sourdough)", () => {
      render(<Discovery initialQuery="westlands sourdough" />);

      // Westlands is the location of Sol Artisan Bakery, and sourdough is the dish
      expect(screen.getByText("Sol Artisan Bakery")).toBeInTheDocument();
      expect(screen.getByText("Country Sourdough Loaf")).toBeInTheDocument();
    });

    it("satisfies compound queries combining venue neighborhood and beverage (e.g. cbd coffee)", () => {
      render(<Discovery initialQuery="cbd coffee" />);

      // CBD matches Green Garden Café, coffee matches coffee drinks
      expect(screen.getByText("Green Garden Café")).toBeInTheDocument();
    });
  });

  describe("Scenario Search D — Publication integrity", () => {
    it("never leaks protected hotel room-service menus into public search results", () => {
      render(<Discovery initialQuery="room service" />);

      // Grand Horizon Hotel has a protected room service menu that requires room verification
      // It should not leak into public discovery
      expect(screen.queryByText("In-Room Dining (Guest Only)")).not.toBeInTheDocument();
    });

    it("never leaks draft or unpublished items into public search results", () => {
      // Add an unpublished draft offering to an existing venue
      const st = usePewa.getState();
      const firstMenu = st.menus[0];
      expect(firstMenu).toBeDefined();
      if (!firstMenu) return;
      const firstSection = firstMenu.sections[0];
      expect(firstSection).toBeDefined();
      if (!firstSection) return;

      // Add a draft item
      st.upsertOffering(firstMenu.id, firstSection.id, {
        name: "TopSecretDraftItem12345",
        description: "Draft test",
        price: 999,
        available: true,
        tags: [],
        emoji: "🔒",
        modifiers: [],
      });

      // The publishedSnapshot was NOT updated with this item
      render(<Discovery initialQuery="TopSecretDraftItem12345" />);

      expect(screen.queryByText("TopSecretDraftItem12345")).not.toBeInTheDocument();
    });

    it("does not leak items hidden at a specific venue", () => {
      const st = usePewa.getState();
      const firstMenu = st.menus[0];
      expect(firstMenu).toBeDefined();
      if (!firstMenu) return;
      const firstSection = firstMenu.sections[0];
      expect(firstSection).toBeDefined();
      if (!firstSection) return;
      const targetOffering = firstSection.offerings[0];
      expect(targetOffering).toBeDefined();
      if (!targetOffering) return;
      const firstVenue = st.venues[0];
      expect(firstVenue).toBeDefined();
      if (!firstVenue) return;

      // Mark this offering hidden at the venue
      st.toggleOfferingVenueAvailability(
        firstMenu.id,
        firstSection.id,
        targetOffering.id,
        firstVenue.id,
      );

      render(<Discovery initialQuery={targetOffering.name} />);

      // It should either not appear or not show as a qualifying offering for that venue
      const itemTitle = screen.queryByText(targetOffering.name);
      if (itemTitle) {
        // If it appears, ensure it's not shown as available under that venue
        expect(itemTitle).not.toBeVisible();
      }
    });
  });
});
