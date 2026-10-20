import { beforeEach, describe, expect, it } from "vitest";
import {
  getExistingMenuTags,
  getRecommendedSectionsForCategory,
  getRecommendedTagsForCategory,
  PROTOTYPE_IMAGE_LIBRARY,
  SUGGESTED_BUSINESS_CATEGORIES,
} from "../lib/pewa/taxonomy";
import { usePewa } from "../lib/pewa/store";
import type { Menu, Section, Offering } from "../lib/pewa/types";

describe("Slice R1-A — Menu Taxonomy and Structure Engine", () => {
  beforeEach(() => {
    usePewa.getState().reset();
    usePewa.getState().setRole("owner");
  });

  describe("1. Business Categories vs Menu Sections", () => {
    it("suggested business categories are defined with tailored section recommendations", () => {
      expect(SUGGESTED_BUSINESS_CATEGORIES.length).toBeGreaterThanOrEqual(4);
      const cafe = SUGGESTED_BUSINESS_CATEGORIES.find((c) => c.id === "cafe");
      expect(cafe).toBeDefined();
      expect(cafe?.recommendedSections).toContain("Hot Coffee & Espresso");
      expect(cafe?.recommendedSections).toContain("Breakfast & Brunch");

      const bakery = SUGGESTED_BUSINESS_CATEGORIES.find((c) => c.id === "bakery");
      expect(bakery).toBeDefined();
      expect(bakery?.recommendedSections).toContain("Sourdough & Artisanal Loaves");
      expect(bakery?.recommendedSections).toContain("Viennoiserie & Croissants");

      const restaurant = SUGGESTED_BUSINESS_CATEGORIES.find((c) => c.id === "restaurant");
      expect(restaurant).toBeDefined();
      expect(restaurant?.recommendedSections).toContain("Starters & Small Plates");
      expect(restaurant?.recommendedSections).toContain("Chef's Mains");

      const hotel = SUGGESTED_BUSINESS_CATEGORIES.find((c) => c.id === "hotel");
      expect(hotel).toBeDefined();
      expect(hotel?.recommendedSections).toContain("Terrace Bistro Plates");
    });

    it("returns category-specific recommended sections for standard categories", () => {
      const cafeSections = getRecommendedSectionsForCategory("Café");
      expect(cafeSections).toContain("Hot Coffee & Espresso");
      expect(cafeSections).toContain("Breakfast & Brunch");

      const bakerySections = getRecommendedSectionsForCategory("Artisan Bakery");
      expect(bakerySections).toContain("Sourdough & Artisanal Loaves");

      const restaurantSections = getRecommendedSectionsForCategory("Restaurant & Bistro");
      expect(restaurantSections).toContain("Chef's Mains");
    });

    it("falls back to sensible universal defaults when custom category is provided", () => {
      const customSections = getRecommendedSectionsForCategory("Swahili Coastal Dining");
      expect(customSections).toContain("Specialties & Signatures");
      expect(customSections).toContain("Mains & Plates");
      expect(customSections).toContain("Drinks & Beverages");
    });
  });

  describe("2. Recommended Sections & Custom Section Creation", () => {
    it("merchants can add suggested sections or arbitrary custom sections in any language", () => {
      usePewa.getState().loadScenario("new-cafe");
      const s = usePewa.getState();
      const menuId = s.menus[0]?.id;
      expect(menuId).toBeDefined();

      // Add a recommended section
      s.addSection(menuId!, "Hot Coffee & Espresso");
      let updatedMenu = usePewa.getState().menus.find((m) => m.id === menuId);
      expect(updatedMenu?.sections.some((sec) => sec.name === "Hot Coffee & Espresso")).toBe(true);

      // Add an arbitrary custom section in Swahili / natural language
      s.addSection(menuId!, "Vyakula Vya Asili (Swahili Specialties)");
      updatedMenu = usePewa.getState().menus.find((m) => m.id === menuId);
      expect(
        updatedMenu?.sections.some((sec) => sec.name === "Vyakula Vya Asili (Swahili Specialties)"),
      ).toBe(true);
    });
  });

  describe("3. Tag Creation, Reuse and Suggestions", () => {
    it("provides contextual tag suggestions based on category", () => {
      const cafeTags = getRecommendedTagsForCategory("Café");
      expect(cafeTags).toContain("Hot");
      expect(cafeTags).toContain("Iced");
      expect(cafeTags).toContain("House Blend");
      expect(cafeTags).toContain("Vegetarian");
      expect(cafeTags).toContain("Vegan");

      const restaurantTags = getRecommendedTagsForCategory("Restaurant & Bistro");
      expect(restaurantTags).toContain("Chef's Special");
      expect(restaurantTags).toContain("Gluten-Free");
      expect(restaurantTags).toContain("Halal");
    });

    it("aggregates existing menu tags for instant 1-tap reuse", () => {
      const mockMenu: Menu = {
        id: "m_test",
        orgId: "org_1",
        name: "Test Menu",
        status: "published",
        updatedAt: "2026-10-20T00:00:00Z",
        sections: [
          {
            id: "s1",
            name: "Coffee",
            offerings: [
              {
                id: "o1",
                name: "Espresso",
                description: "",
                price: 200,
                tags: ["Hot", "Single Origin Nyeri"],
                available: true,
                modifiers: [],
                emoji: "☕",
              },
            ],
          },
          {
            id: "s2",
            name: "Bakes",
            offerings: [
              {
                id: "o2",
                name: "Brioche",
                description: "",
                price: 300,
                tags: ["Freshly Baked", "Vegetarian"],
                available: true,
                modifiers: [],
                emoji: "🥐",
              },
            ],
          },
        ],
      };

      const reusedTags = getExistingMenuTags(mockMenu);
      expect(reusedTags).toContain("Hot");
      expect(reusedTags).toContain("Single Origin Nyeri");
      expect(reusedTags).toContain("Freshly Baked");
      expect(reusedTags).toContain("Vegetarian");
    });

    it("assigns offering classifications independently of menu sections", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const s = usePewa.getState();
      const menu = s.menus[0]!;
      const breakfastSection = menu.sections.find((sec) => sec.name === "Breakfast");
      expect(breakfastSection).toBeDefined();

      // Add a dish in Breakfast with independent dietary and feature tags
      s.upsertOffering(menu.id, breakfastSection!.id, {
        name: "Quinoa Power Bowl",
        description: "Organic quinoa, avocado, poached egg, pumpkin seeds.",
        price: 750,
        tags: ["Vegetarian", "Gluten-Free", "Chef's Special", "Organic"],
        available: true,
        emoji: "🥗",
        modifiers: [],
      });

      const updated = usePewa.getState().menus[0]!;
      const bowl = updated.sections
        .find((sec) => sec.id === breakfastSection!.id)
        ?.offerings.find((o) => o.name === "Quinoa Power Bowl");

      expect(bowl).toBeDefined();
      expect(bowl?.tags).toEqual(["Vegetarian", "Gluten-Free", "Chef's Special", "Organic"]);
    });
  });

  describe("4. Discovery & Publication-Eligible Metadata Filtering", () => {
    it("public discovery excludes protected and draft menus", () => {
      usePewa.getState().loadScenario("hotel");
      const s = usePewa.getState();

      // In Hotel scenario: Grand Horizon has public Terrace Bistro and protected Room Dining
      const published = s.menus.filter((m) => m.status === "published" && !m.isProtected);
      expect(published).toHaveLength(1);
      expect(published[0]?.name).toBe("Terrace Bistro & Lounge");

      // Verify protected menu is not publication-eligible
      const protectedMenu = s.menus.find((m) => m.isProtected);
      expect(protectedMenu).toBeDefined();
      expect(protectedMenu?.name).toBe("In-Room Dining (Guests Only)");

      // Offerings inside protected menu (e.g. 'Horizon Continental In-Bed') must not appear in public published list
      const publicOfferingNames = published.flatMap((m) =>
        m.sections.flatMap((sec) => sec.offerings.map((o) => o.name)),
      );
      expect(publicOfferingNames).toContain("Prime Aged Ribeye");
      expect(publicOfferingNames).not.toContain("Horizon Continental In-Bed");
    });
  });

  describe("5. Prototype Image Library & Media Path Support", () => {
    it("curated image library contains valid prototype assets with categories", () => {
      expect(PROTOTYPE_IMAGE_LIBRARY.length).toBeGreaterThanOrEqual(8);
      PROTOTYPE_IMAGE_LIBRARY.forEach((img) => {
        expect(img.id).toBeTruthy();
        expect(img.title).toBeTruthy();
        expect(img.category).toBeTruthy();
        expect(img.url).toMatch(/^https:\/\//);
      });
    });

    it("offerings can store image URLs alongside emojis", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const s = usePewa.getState();
      const menu = s.menus[0]!;
      const flatWhite = menu.sections[0]?.offerings[0];
      expect(flatWhite).toBeDefined();
      expect(flatWhite?.image).toBeDefined();
      expect(flatWhite?.emoji).toBe("☕");
    });
  });

  describe("6. Real-World Menu Archetypes Verification", () => {
    it("verifies Café archetype (Green Garden Café)", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const s = usePewa.getState();
      const venue = s.venues[0];
      expect(venue?.category).toBe("Café");
      expect(s.menus[0]?.sections.some((sec) => sec.name === "Coffee")).toBe(true);
      expect(s.menus[0]?.sections.some((sec) => sec.name === "Breakfast")).toBe(true);
    });

    it("verifies Restaurant archetype (Terrace Bistro)", () => {
      usePewa.getState().loadScenario("hotel");
      const s = usePewa.getState();
      const bistro = s.menus.find((m) => !m.isProtected);
      expect(bistro?.name).toBe("Terrace Bistro & Lounge");
      expect(bistro?.sections.some((sec) => sec.name === "Bistro Plates")).toBe(true);
      const steak = bistro?.sections[0]?.offerings.find((o) => o.name === "Prime Aged Ribeye");
      expect(steak?.tags).toContain("Chef's Special");
      expect(steak?.tags).toContain("Gluten-Free");
    });

    it("verifies Bakery archetype (Sol Artisan Bakery)", () => {
      usePewa.getState().loadScenario("multi-brand");
      const s = usePewa.getState();
      const bakeryVenue = s.venues.find((v) => v.id === "venue_sol");
      expect(bakeryVenue?.category).toBe("Artisan Bakery");
      const bakeryMenu = s.menus.find((m) => m.id === "menu_sol_bakery");
      expect(bakeryMenu?.sections.some((sec) => sec.name === "Sourdough Loaves")).toBe(true);
      expect(bakeryMenu?.sections.some((sec) => sec.name === "Viennoiserie & Pastries")).toBe(true);
    });

    it("verifies Hotel archetype with public and protected dining separation", () => {
      usePewa.getState().loadScenario("hotel");
      const s = usePewa.getState();
      const hotel = s.venues.find((v) => v.id === "venue_horizon");
      expect(hotel?.category).toBe("Hotel & Hospitality");
      expect(s.menus).toHaveLength(2);
      expect(s.menus.filter((m) => m.isProtected)).toHaveLength(1);
    });
  });
});
