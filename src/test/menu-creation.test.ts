import { beforeEach, describe, expect, it } from "vitest";
import { usePewa } from "../lib/pewa/store";
import { getSuggestedMenuNamesForCategory, getVenueBrandContext } from "../lib/pewa/taxonomy";
import type { Offering } from "../lib/pewa/types";

describe("R1-B — Mobile-First Menu Creation and Organisation Experience", () => {
  beforeEach(() => {
    usePewa.getState().reset();
    usePewa.getState().setRole("owner");
  });

  describe("Step 1 & 2 Helpers — Brand Context & Suggested Menu Names", () => {
    it("derives single-venue brand context correctly", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const state = usePewa.getState();
      const venue = state.venues[0];
      expect(venue).toBeDefined();
      if (!venue) return;

      const context = getVenueBrandContext(venue, state.organisation);
      expect(context.isMultiVenue).toBe(false);
      expect(context.isMultiBrand).toBe(false);
      expect(context.displayLabel).toContain("Green Garden");
    });

    it("derives multi-brand context correctly for horizon group", () => {
      usePewa.getState().loadScenario("multi-brand");
      const state = usePewa.getState();
      expect(state.venues.length).toBeGreaterThanOrEqual(3);
      const venue = state.venues[0];
      if (!venue) return;

      const context = getVenueBrandContext(venue, state.organisation);
      expect(context.isMultiVenue).toBe(true);
      expect(context.isMultiBrand).toBe(true);
      expect(context.displayLabel).toContain("Horizon");
    });

    it("provides suggested menu names for various business categories", () => {
      const cafeNames = getSuggestedMenuNamesForCategory("cafe");
      expect(cafeNames).toContain("All-Day Menu");
      expect(cafeNames).toContain("Breakfast & Brunch");

      const restaurantNames = getSuggestedMenuNamesForCategory("restaurant");
      expect(restaurantNames).toContain("Dinner Menu");
      expect(restaurantNames).toContain("Chef's Tasting");

      const hotelNames = getSuggestedMenuNamesForCategory("hotel");
      expect(hotelNames).toContain("In-Room Dining");
      expect(hotelNames).toContain("Breakfast Menu");

      const bakeryNames = getSuggestedMenuNamesForCategory("bakery");
      expect(bakeryNames).toContain("Fresh Bakes & Pastries");

      const defaultNames = getSuggestedMenuNamesForCategory(undefined);
      expect(defaultNames.length).toBeGreaterThan(0);
    });
  });

  describe("Store Operations — Batch Sections, Reordering, Moving Offerings, Duplication", () => {
    it("creates a menu with structured input and initial sections", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const state = usePewa.getState();
      const venue = state.venues[0]!;

      const menuId = state.addMenu({
        name: "Spring Special",
        venueId: venue.id,
        venueIds: [venue.id],
        description: "Fresh seasonal ingredients",
        isProtected: false,
        initialSections: ["Small Plates", "Mains", "Seasonal Desserts"],
      });

      expect(menuId).toBeTruthy();
      const newMenu = usePewa.getState().menus.find((m) => m.id === menuId)!;
      expect(newMenu).toBeDefined();
      expect(newMenu.name).toBe("Spring Special");
      expect(newMenu.description).toBe("Fresh seasonal ingredients");
      expect(newMenu.status).toBe("draft");
      expect(newMenu.sections).toHaveLength(3);
      expect(newMenu.sections[0]!.name).toBe("Small Plates");
      expect(newMenu.sections[1]!.name).toBe("Mains");
      expect(newMenu.sections[2]!.name).toBe("Seasonal Desserts");
    });

    it("adds sections in batch to an existing menu", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const state = usePewa.getState();
      const menu = state.menus[0]!;
      const initialCount = menu.sections.length;

      usePewa
        .getState()
        .addSectionsBatch(menu.id, ["Craft Cocktails", "Wines by the Glass", "Desserts"]);

      const updatedMenu = usePewa.getState().menus.find((m) => m.id === menu.id)!;
      expect(updatedMenu.sections.length).toBe(initialCount + 3);
      const names = updatedMenu.sections.map((s) => s.name);
      expect(names).toContain("Craft Cocktails");
      expect(names).toContain("Wines by the Glass");
      expect(names).toContain("Desserts");
    });

    it("reorders sections up and down cleanly", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const state = usePewa.getState();
      const menu = state.menus[0]!;
      const sec1 = menu.sections[0]!.id;
      const sec2 = menu.sections[1]!.id;

      // Swap sec1 and sec2 by moving sec2 before sec1
      usePewa
        .getState()
        .reorderSections(menu.id, [sec2, sec1, ...menu.sections.slice(2).map((s) => s.id)]);

      const updated = usePewa.getState().menus.find((m) => m.id === menu.id)!;
      expect(updated.sections[0]!.id).toBe(sec2);
      expect(updated.sections[1]!.id).toBe(sec1);
    });

    it("moves an offering between sections atomically", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const state = usePewa.getState();
      const menu = state.menus[0]!;
      const sourceSec = menu.sections[0]!;
      const targetSec = menu.sections[1]!;
      const offering = sourceSec.offerings[0]!;

      expect(sourceSec.offerings.map((o) => o.id)).toContain(offering.id);
      expect(targetSec.offerings.map((o) => o.id)).not.toContain(offering.id);

      usePewa
        .getState()
        .moveOfferingBetweenSections(menu.id, sourceSec.id, targetSec.id, offering.id);

      const updatedMenu = usePewa.getState().menus.find((m) => m.id === menu.id)!;
      const updatedSource = updatedMenu.sections.find((s) => s.id === sourceSec.id)!;
      const updatedTarget = updatedMenu.sections.find((s) => s.id === targetSec.id)!;

      expect(updatedSource.offerings.map((o) => o.id)).not.toContain(offering.id);
      expect(updatedTarget.offerings.map((o) => o.id)).toContain(offering.id);
    });

    it("updates menu metadata (name, description, visibility, venues)", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const state = usePewa.getState();
      const menu = state.menus[0]!;

      usePewa.getState().updateMenuMeta(menu.id, {
        name: "Renamed Main Menu",
        description: "Updated description for dining",
        isProtected: true,
      });

      const updated = usePewa.getState().menus.find((m) => m.id === menu.id)!;
      expect(updated.name).toBe("Renamed Main Menu");
      expect(updated.description).toBe("Updated description for dining");
      expect(updated.isProtected).toBe(true);
    });

    it("duplicates an existing menu as draft with copy suffix", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const state = usePewa.getState();
      const menu = state.menus[0]!;
      const initialMenuCount = state.menus.length;

      const dupId = usePewa.getState().duplicateMenu(menu.id);
      expect(dupId).toBeTruthy();
      expect(dupId).not.toBe(menu.id);

      const dup = usePewa.getState().menus.find((m) => m.id === dupId)!;
      expect(dup).toBeDefined();
      expect(dup.name).toBe(`${menu.name} (Copy)`);
      expect(dup.status).toBe("draft");
      expect(dup.sections.length).toBe(menu.sections.length);

      const freshState = usePewa.getState();
      expect(freshState.menus.length).toBe(initialMenuCount + 1);
    });

    it("deletes a menu safely without affecting other menus", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const state = usePewa.getState();
      const menu = state.menus[0]!;
      const dupId = usePewa.getState().duplicateMenu(menu.id);

      expect(usePewa.getState().menus.find((m) => m.id === dupId)).toBeDefined();

      usePewa.getState().deleteMenu(dupId);
      expect(usePewa.getState().menus.find((m) => m.id === dupId)).toBeUndefined();
      expect(usePewa.getState().menus.find((m) => m.id === menu.id)).toBeDefined();
    });
  });

  describe("Scenario A — New Café Menu Creation", () => {
    it("allows a new business to create, structure, populate, and publish a menu", () => {
      usePewa.getState().loadScenario("new-cafe");

      // Setup minimal mock venue & org for new cafe
      const venueId = "venue_new_cafe";
      usePewa.setState({
        organisation: {
          id: "org_new",
          name: "Morning Roast",
          businessType: "Café",
          currency: "USD",
          status: "active",
        },
        venues: [
          {
            id: venueId,
            orgId: "org_new",
            name: "Morning Roast Café",
            slug: "morning-roast-cafe",
            currency: "USD",
            category: "Café",
            businessCategory: "cafe",
            address: "123 Coffee Way",
            deliveryOnly: false,
            serviceArea: "",
            services: ["Dine-in"],
            contact: { phone: "", whatsapp: "", email: "" },
            tagline: "Morning roast",
          },
        ],
      });

      // 1. Create menu with suggested name & initial batch sections
      const menuId = usePewa.getState().addMenu({
        name: "Morning Menu",
        venueId,
        venueIds: [venueId],
        description: "Artisan espresso and fresh pastries",
        initialSections: ["Espresso & Coffee", "Fresh Pastries"],
      });

      const menu = usePewa.getState().menus.find((m) => m.id === menuId)!;
      expect(menu).toBeDefined();
      expect(menu.status).toBe("draft");
      expect(menu.sections).toHaveLength(2);

      // 2. Add custom section "Daily Sandwiches"
      usePewa.getState().addSection(menu.id, "Daily Sandwiches");
      const withSection = usePewa.getState().menus.find((m) => m.id === menu.id)!;
      expect(withSection.sections).toHaveLength(3);
      const sandwichSec = withSection.sections.find((s) => s.name === "Daily Sandwiches")!;

      // 3. Add offering to section
      const sampleItem: Offering = {
        id: "item_croissant",
        name: "Butter Croissant",
        description: "Flaky golden French pastry baked fresh daily",
        price: 450,
        available: true,
        tags: ["Vegetarian", "Fresh Baked", "Staff Pick"],
        modifiers: [],
        emoji: "🥐",
        image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80",
      };
      usePewa.getState().upsertOffering(menu.id, sandwichSec.id, sampleItem);

      // 4. Publish menu
      usePewa.getState().setMenuStatus(menu.id, "published");
      const published = usePewa.getState().menus.find((m) => m.id === menu.id)!;
      expect(published.status).toBe("published");
    });
  });

  describe("Scenario B — Established Restaurant 2nd Menu & Draft Isolation", () => {
    it("keeps existing published menu undisturbed while editing second draft menu", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const state = usePewa.getState();
      const venue = state.venues[0]!;
      const existingMenu = state.menus[0]!;
      expect(existingMenu.status).toBe("published");
      const existingItemCount = existingMenu.sections[0]!.offerings.length;

      // Create a 2nd menu (Evening Tasting)
      const eveningMenuId = usePewa.getState().addMenu({
        name: "Evening Tasting Menu",
        venueId: venue.id,
        venueIds: [venue.id],
        description: "5-course seasonal tasting experience",
        initialSections: ["Amuse-Bouche", "First Course", "Mains", "Dessert"],
      });

      const eveningMenu = usePewa.getState().menus.find((m) => m.id === eveningMenuId)!;
      expect(eveningMenu.status).toBe("draft");

      // Modify eveningMenu by adding an item
      const dessertSec = eveningMenu.sections.find((s) => s.name === "Dessert")!;
      usePewa.getState().upsertOffering(eveningMenu.id, dessertSec.id, {
        id: "item_tart",
        name: "Citrus Tart",
        description: "Fresh lemon curd tart",
        price: 1200,
        available: true,
        tags: [],
        modifiers: [],
        emoji: "🍋",
      });

      // Verify existingMenu was NOT modified
      const currentExisting = usePewa.getState().menus.find((m) => m.id === existingMenu.id)!;
      expect(currentExisting.status).toBe("published");
      expect(currentExisting.sections[0]!.offerings.length).toBe(existingItemCount);

      // Evening menu is still draft
      const currentEvening = usePewa.getState().menus.find((m) => m.id === eveningMenu.id)!;
      expect(currentEvening.status).toBe("draft");
    });
  });

  describe("Scenario C — Multi-Venue Business Assignment & Isolation", () => {
    it("ensures a menu assigned to Venue A is NOT published at Venue B", () => {
      usePewa.getState().loadScenario("multi-brand");
      const state = usePewa.getState();
      expect(state.venues.length).toBeGreaterThanOrEqual(3);

      const venueA = state.venues[0]!;
      const venueB = state.venues[1]!;

      // Create menu explicitly assigned ONLY to venueA
      const venueAMenuId = usePewa.getState().addMenu({
        name: "Downtown Exclusive Special",
        venueId: venueA.id,
        venueIds: [venueA.id],
        initialSections: ["Downtown Specials"],
      });

      const venueAMenu = usePewa.getState().menus.find((m) => m.id === venueAMenuId)!;
      usePewa.getState().upsertOffering(venueAMenu.id, venueAMenu.sections[0]!.id, {
        id: "item_dt_special",
        name: "Downtown Martini",
        description: "Signature classic martini",
        price: 1600,
        available: true,
        tags: [],
        modifiers: [],
        emoji: "🍸",
      });

      usePewa.getState().setMenuStatus(venueAMenu.id, "published");

      // Inspect menus eligible for venueA vs venueB
      const allMenus = usePewa.getState().menus;
      const venueAMenus = allMenus.filter(
        (m) =>
          m.status === "published" && (m.venueIds?.includes(venueA.id) || m.venueId === venueA.id),
      );
      const venueBMenus = allMenus.filter(
        (m) =>
          m.status === "published" && (m.venueIds?.includes(venueB.id) || m.venueId === venueB.id),
      );

      expect(venueAMenus.map((m) => m.id)).toContain(venueAMenu.id);
      expect(venueBMenus.map((m) => m.id)).not.toContain(venueAMenu.id);
    });

    it("supports intentional multi-venue sharing when merchant selects both venues", () => {
      usePewa.getState().loadScenario("multi-brand");
      const state = usePewa.getState();
      const venueA = state.venues[0]!;
      const venueB = state.venues[1]!;
      const venueC = state.venues[2]!;

      // Create menu shared across Venue A and Venue B, but NOT Venue C
      const sharedMenuId = usePewa.getState().addMenu({
        name: "Standard Beverage List",
        venueId: venueA.id,
        venueIds: [venueA.id, venueB.id],
        initialSections: ["Soft Drinks", "Local Beers"],
      });

      const sharedMenu = usePewa.getState().menus.find((m) => m.id === sharedMenuId)!;
      usePewa.getState().upsertOffering(sharedMenu.id, sharedMenu.sections[0]!.id, {
        id: "item_soda",
        name: "Sparkling Water",
        description: "Chilled sparkling mineral water",
        price: 400,
        available: true,
        tags: [],
        modifiers: [],
        emoji: "🫧",
      });

      usePewa.getState().setMenuStatus(sharedMenu.id, "published");

      const allMenus = usePewa.getState().menus;
      const isEligible = (vId: string) =>
        allMenus.some(
          (m) =>
            m.id === sharedMenu.id &&
            m.status === "published" &&
            (m.venueIds?.includes(vId) || m.venueId === vId),
        );

      expect(isEligible(venueA.id)).toBe(true);
      expect(isEligible(venueB.id)).toBe(true);
      expect(isEligible(venueC.id)).toBe(false);
    });
  });

  describe("Scenario D — Hotel Public vs Protected In-Room Dining Isolation", () => {
    it("distinguishes public dining and protected in-room menus correctly", () => {
      usePewa.getState().loadScenario("hotel");
      const state = usePewa.getState();
      const hotelVenue = state.venues[0]!;

      // Find existing public vs protected menus
      const publicMenu = state.menus.find((m) => !m.isProtected);
      const roomMenu = state.menus.find((m) => m.isProtected);

      expect(publicMenu).toBeDefined();
      expect(roomMenu).toBeDefined();

      // Create an additional protected late-night menu
      const lateNightMenuId = usePewa.getState().addMenu({
        name: "Late Night In-Room Snacks",
        venueId: hotelVenue.id,
        venueIds: [hotelVenue.id],
        description: "Available midnight to 6am for resident guests",
        isProtected: true,
        initialSections: ["Midnight Bites"],
      });

      const lateNightMenu = usePewa.getState().menus.find((m) => m.id === lateNightMenuId)!;
      expect(lateNightMenu.isProtected).toBe(true);

      // Verify public listing check
      const publishedPublicMenus = usePewa
        .getState()
        .menus.filter((m) => m.status === "published" && !m.isProtected);

      expect(publishedPublicMenus.map((m) => m.id)).not.toContain(lateNightMenu.id);
    });
  });

  describe("Scenario E — Interrupted Setup & Draft Persistence", () => {
    it("preserves draft menus and uncommitted section edits across simulated state navigation", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const venue = usePewa.getState().venues[0]!;

      // 1. Create a draft with sections
      const draftId = usePewa.getState().addMenu({
        name: "Weekend Brunch Experiment",
        venueId: venue.id,
        venueIds: [venue.id],
        description: "Draft brunch dishes under recipe testing",
        initialSections: ["Pancake Bar", "Egg Dishes"],
      });

      const draft = usePewa.getState().menus.find((m) => m.id === draftId)!;

      // Add item to draft
      usePewa.getState().upsertOffering(draft.id, draft.sections[0]!.id, {
        id: "item_pancake",
        name: "Blueberry Ricotta Stack",
        description: "Ricotta pancakes with wild blueberries",
        price: 1400,
        available: true,
        tags: ["Vegetarian"],
        modifiers: [],
        emoji: "🥞",
      });

      // 2. Simulate leaving the editor (switch role, load other views, etc.)
      usePewa.getState().setRole("staff");
      usePewa.getState().setRole("owner");

      // 3. Re-read draft from state
      const resumed = usePewa.getState().menus.find((m) => m.id === draft.id);
      expect(resumed).toBeDefined();
      expect(resumed!.status).toBe("draft");
      expect(resumed!.name).toBe("Weekend Brunch Experiment");
      expect(resumed!.description).toBe("Draft brunch dishes under recipe testing");
      expect(resumed!.sections).toHaveLength(2);
      expect(resumed!.sections[0]!.offerings[0]!.name).toBe("Blueberry Ricotta Stack");
    });
  });

  describe("Scenario F — Publication Correction & Lifecycle Reversal", () => {
    it("transitions draft -> published -> draft -> deleted cleanly", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const venue = usePewa.getState().venues[0]!;

      const menuId = usePewa.getState().addMenu({
        name: "Flash Promotion Menu",
        venueId: venue.id,
        venueIds: [venue.id],
        initialSections: ["Flash Deals"],
      });

      const menu = usePewa.getState().menus.find((m) => m.id === menuId)!;

      usePewa.getState().upsertOffering(menu.id, menu.sections[0]!.id, {
        id: "item_deal",
        name: "2-for-1 Latte",
        description: "Morning promotion latte",
        price: 500,
        available: true,
        tags: [],
        modifiers: [],
        emoji: "☕",
      });

      // Draft initially
      expect(usePewa.getState().menus.find((m) => m.id === menu.id)!.status).toBe("draft");

      // 1. Publish
      usePewa.getState().setMenuStatus(menu.id, "published");
      expect(usePewa.getState().menus.find((m) => m.id === menu.id)!.status).toBe("published");

      // 2. Take down / hide back to draft
      usePewa.getState().setMenuStatus(menu.id, "draft");
      expect(usePewa.getState().menus.find((m) => m.id === menu.id)!.status).toBe("draft");

      // 3. Delete
      usePewa.getState().deleteMenu(menu.id);
      expect(usePewa.getState().menus.find((m) => m.id === menu.id)).toBeUndefined();
    });
  });
});
