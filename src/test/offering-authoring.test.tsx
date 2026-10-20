import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePewa, formatPrice } from "@/lib/pewa/store";
import {
  PROTOTYPE_IMAGE_LIBRARY,
  IMAGE_LIBRARY_CATEGORIES,
  searchImageLibrary,
  getImageSource,
  isDietaryClaimTag,
  PEWA_TAG_DISCLAIMER,
  cropAndCompressImage,
  processImageUpload,
  getVenuePublishedMenus,
} from "@/lib/pewa/taxonomy";
import { lineTotal, validateCart } from "@/lib/pewa/ordering";
import type { Offering, Menu, Section, ModifierGroup } from "@/lib/pewa/types";

describe("R1-C — Offering Authoring and Management", () => {
  beforeEach(() => {
    usePewa.getState().loadScenario("units-available");
    usePewa.getState().setRole("owner");
  });

  describe("Scenario A: Simple café offering", () => {
    it("creates a Cappuccino with name, price, description and library image, then saves and publishes", () => {
      const state = usePewa.getState();
      const menu = state.menus.find((m) => m.orgId === state.organisation?.id);
      expect(menu).toBeDefined();
      if (!menu) return;

      const section = menu.sections[0];
      expect(section).toBeDefined();
      if (!section) return;

      const libraryItem = PROTOTYPE_IMAGE_LIBRARY.find((img) => img.category === "coffee");
      expect(libraryItem).toBeDefined();

      const newOffering: Omit<Offering, "id"> = {
        name: "Cappuccino",
        price: 320,
        description: "Double shot espresso with velvety micro-foam and cocoa dusting.",
        available: true,
        emoji: "☕",
        image: libraryItem?.url,
        imageSource: "library",
        tags: ["Hot", "Single Origin"],
        modifiers: [],
      };

      // 1. Add item to section
      usePewa.getState().upsertOffering(menu.id, section.id, newOffering);

      // Verify item exists in draft
      const updatedMenu = usePewa.getState().menus.find((m) => m.id === menu.id);
      const targetSec = updatedMenu?.sections.find((s) => s.id === section.id);
      const savedItem = targetSec?.offerings.find((o) => o.name === "Cappuccino");

      expect(savedItem).toBeDefined();
      expect(savedItem?.price).toBe(320);
      expect(savedItem?.description).toContain("velvety micro-foam");
      expect(savedItem?.imageSource).toBe("library");
      expect(getImageSource(savedItem!)).toBe("library");

      // 2. Publish menu
      const publishSuccess = usePewa.getState().publishMenu(menu.id);
      expect(publishSuccess).toBe(true);

      // 3. Verify live menu snapshot contains the new item
      const publishedMenu = usePewa.getState().menus.find((m) => m.id === menu.id);
      const snapshotSec = publishedMenu?.publishedSnapshot?.sections.find((s) => s.id === section.id);
      const publishedItem = snapshotSec?.offerings.find((o) => o.name === "Cappuccino");

      expect(publishedItem).toBeDefined();
      expect(publishedItem?.price).toBe(320);
    });
  });

  describe("Scenario B: Coffee with structured single-choice modifiers", () => {
    it("configures Flat White with size and milk choices and calculates totals correctly", () => {
      const state = usePewa.getState();
      const menu = state.menus.find((m) => m.orgId === state.organisation?.id);
      const section = menu?.sections[0];
      expect(menu && section).toBeTruthy();
      if (!menu || !section) return;

      const sizeGroup: ModifierGroup = {
        id: "mod_size",
        name: "Size",
        selectionType: "single",
        required: true,
        options: [
          { id: "opt_regular", name: "Regular / Small", priceDelta: 0 },
          { id: "opt_medium", name: "Medium", priceDelta: 40 },
          { id: "opt_large", name: "Large", priceDelta: 80 },
        ],
      };

      const milkGroup: ModifierGroup = {
        id: "mod_milk",
        name: "Milk Choice",
        selectionType: "single",
        required: false,
        options: [
          { id: "opt_whole", name: "Whole Dairy Milk", priceDelta: 0 },
          { id: "opt_oat", name: "Oat Milk", priceDelta: 50 },
          { id: "opt_almond", name: "Almond Milk", priceDelta: 60 },
        ],
      };

      const existingFlat = section.offerings.find((o) => o.name === "Flat White");
      const flatWhite: Omit<Offering, "id"> & { id?: string } = {
        id: existingFlat?.id,
        name: "Flat White",
        price: 350,
        description: "Ristretto espresso shots topped with silky micro-foam.",
        available: true,
        emoji: "☕",
        tags: ["Hot"],
        modifiers: [sizeGroup, milkGroup],
      };

      usePewa.getState().upsertOffering(menu.id, section.id, flatWhite);
      usePewa.getState().publishMenu(menu.id);

      const targetSec = usePewa
        .getState()
        .menus.find((m) => m.id === menu.id)
        ?.sections.find((s) => s.id === section.id);
      const item = targetSec?.offerings.find((o) => o.id === existingFlat?.id);
      expect(item).toBeDefined();

      // Calculation tests:
      // Regular + Whole milk: base 350 + 0 + 0 = 350
      const line1 = {
        id: "line_1",
        menuId: menu.id,
        offeringId: item!.id,
        name: item!.name,
        emoji: item!.emoji,
        basePrice: item!.price,
        quantity: 1,
        options: [
          { groupId: sizeGroup.id, optionId: "opt_regular", name: "Regular", priceDelta: 0 },
          { groupId: milkGroup.id, optionId: "opt_whole", name: "Whole", priceDelta: 0 },
        ],
      };
      expect(lineTotal(line1)).toBe(350);

      // Large (+80) + Oat milk (+50) * 2 qty = (350 + 80 + 50) * 2 = 960
      const line2 = {
        id: "line_2",
        menuId: menu.id,
        offeringId: item!.id,
        name: item!.name,
        emoji: item!.emoji,
        basePrice: item!.price,
        quantity: 2,
        options: [
          { groupId: sizeGroup.id, optionId: "opt_large", name: "Large", priceDelta: 80 },
          { groupId: milkGroup.id, optionId: "opt_oat", name: "Oat Milk", priceDelta: 50 },
        ],
      };
      expect(lineTotal(line2)).toBe(480 * 2);
    });
  });

  describe("Scenario C: Bakery photo upload, crop, replace, and fail-closed handling", () => {
    it("distinguishes uploaded merchant photos from curated library photos", () => {
      const uploadOffering: Offering = {
        id: "off_croissant",
        name: "Almond Croissant",
        price: 250,
        description: "Freshly baked frangipane croissant.",
        available: true,
        emoji: "🥐",
        image: "data:image/jpeg;base64,mockuploadstring",
        imageSource: "upload",
        tags: ["Freshly Baked"],
        modifiers: [],
      };
      expect(getImageSource(uploadOffering)).toBe("upload");

      const libraryOffering: Offering = {
        ...uploadOffering,
        image: PROTOTYPE_IMAGE_LIBRARY[0]?.url,
        imageSource: "library",
      };
      expect(getImageSource(libraryOffering)).toBe("library");

      const noImageOffering: Offering = {
        ...uploadOffering,
        image: undefined,
        imageSource: undefined,
      };
      expect(getImageSource(noImageOffering)).toBeUndefined();
    });

    it("fails closed on non-image file uploads with an understandable error", async () => {
      const textFile = new File(["dummy text"], "test.txt", { type: "text/plain" });
      await expect(processImageUpload(textFile)).rejects.toThrow("Unsupported file format");
    });

    it("fails closed on oversized files > 5MB", async () => {
      const largeFile = new File([new Uint8Array(6 * 1024 * 1024)], "huge.jpg", {
        type: "image/jpeg",
      });
      await expect(processImageUpload(largeFile)).rejects.toThrow("Image file is too large");
    });

    it("fails closed on invalid data Url provided for cropping", async () => {
      await expect(cropAndCompressImage("invalid-not-data-url")).rejects.toThrow(
        "Invalid image data provided for cropping",
      );
    });
  });

  describe("Scenario D: Restaurant meal with multi-choice extras", () => {
    it("supports multiple selections within a group (e.g. Cheese + Bacon + Sauce)", () => {
      const extrasGroup: ModifierGroup = {
        id: "mod_extras",
        name: "Burger Extras",
        selectionType: "multiple",
        required: false,
        options: [
          { id: "opt_cheese", name: "Extra Cheddar", priceDelta: 60 },
          { id: "opt_bacon", name: "Crispy Bacon", priceDelta: 100 },
          { id: "opt_sauce", name: "House Truffle Mayo", priceDelta: 40 },
        ],
      };

      const burger: Offering = {
        id: "off_burger",
        name: "Double Smash Burger",
        price: 850,
        description: "Two smashed beef patties, pickles, and melted cheese.",
        available: true,
        emoji: "🍔",
        tags: ["Popular"],
        modifiers: [extrasGroup],
      };

      // Customer picks all 3 extras: 850 + 60 + 100 + 40 = 1050
      const line = {
        id: "line_burger",
        menuId: "menu_1",
        offeringId: burger.id,
        name: burger.name,
        emoji: burger.emoji,
        basePrice: burger.price,
        quantity: 1,
        options: [
          { groupId: extrasGroup.id, optionId: "opt_cheese", name: "Extra Cheddar", priceDelta: 60 },
          { groupId: extrasGroup.id, optionId: "opt_bacon", name: "Crispy Bacon", priceDelta: 100 },
          { groupId: extrasGroup.id, optionId: "opt_sauce", name: "House Truffle Mayo", priceDelta: 40 },
        ],
      };

      expect(lineTotal(line)).toBe(1050);
    });
  });

  describe("Scenario E: Dietary and descriptive tags", () => {
    it("identifies dietary claim tags and preserves merchant disclaimer", () => {
      expect(isDietaryClaimTag("Vegan")).toBe(true);
      expect(isDietaryClaimTag("Gluten-Free")).toBe(true);
      expect(isDietaryClaimTag("Halal")).toBe(true);
      expect(isDietaryClaimTag("Hot Coffee")).toBe(false);
      expect(isDietaryClaimTag("Chef's Special")).toBe(false);

      expect(PEWA_TAG_DISCLAIMER).toContain("merchant-provided");
      expect(PEWA_TAG_DISCLAIMER).toContain("not been independently verified by PEWA");
    });

    it("keeps draft tag changes isolated from customer discovery until publication", () => {
      const state = usePewa.getState();
      const menu = state.menus.find((m) => m.orgId === state.organisation?.id && m.status === "published");
      expect(menu).toBeDefined();
      if (!menu) return;

      const venue = state.venues.find((v) => v.orgId === state.organisation?.id);
      expect(venue).toBeDefined();
      if (!venue) return;

      const sec = menu.sections[0];
      const off = sec?.offerings[0];
      expect(off).toBeDefined();
      if (!sec || !off) return;

      // Update offering tags in working draft with a unique draft tag
      const draftTag = "SuperUniqueSecretDietaryTag";
      usePewa.getState().upsertOffering(menu.id, sec.id, {
        ...off,
        tags: [...off.tags, draftTag],
      });

      // Query live customer published menus
      const liveMenus = getVenuePublishedMenus(venue, usePewa.getState().menus, usePewa.getState().venues);
      const liveOff = liveMenus
        .flatMap((m) => m.sections)
        .flatMap((s) => s.offerings)
        .find((o) => o.id === off.id);

      // Live menu should NOT contain the draft tag
      expect(liveOff?.tags.includes(draftTag)).toBe(false);

      // Now publish menu
      usePewa.getState().publishMenu(menu.id);

      // Now query live customer published menus again
      const republishedLiveMenus = getVenuePublishedMenus(venue, usePewa.getState().menus, usePewa.getState().venues);
      const republishedOff = republishedLiveMenus
        .flatMap((m) => m.sections)
        .flatMap((s) => s.offerings)
        .find((o) => o.id === off.id);

      expect(republishedOff?.tags.includes(draftTag)).toBe(true);
    });
  });

  describe("Scenario F: Published offering revision", () => {
    it("keeps edited price and modifiers isolated until explicitly republished", () => {
      const state = usePewa.getState();
      const menu = state.menus.find((m) => m.orgId === state.organisation?.id && m.status === "published");
      expect(menu).toBeDefined();
      if (!menu) return;

      const venue = state.venues.find((v) => v.orgId === state.organisation?.id);
      expect(venue).toBeDefined();
      if (!venue) return;

      const sec = menu.sections[0];
      const off = sec?.offerings[0];
      expect(sec && off).toBeTruthy();
      if (!sec || !off) return;

      const originalPrice = off.price;
      const revisedPrice = originalPrice + 150;

      // Edit working draft price
      usePewa.getState().upsertOffering(menu.id, sec.id, {
        ...off,
        price: revisedPrice,
      });

      // Customer live view should still see originalPrice
      const liveMenus = getVenuePublishedMenus(venue, usePewa.getState().menus, usePewa.getState().venues);
      const liveOff = liveMenus.flatMap((m) => m.sections).flatMap((s) => s.offerings).find((o) => o.id === off.id);
      expect(liveOff?.price).toBe(originalPrice);

      // Publishing updates live price
      usePewa.getState().publishMenu(menu.id);
      const updatedLiveMenus = getVenuePublishedMenus(venue, usePewa.getState().menus, usePewa.getState().venues);
      const updatedLiveOff = updatedLiveMenus.flatMap((m) => m.sections).flatMap((s) => s.offerings).find((o) => o.id === off.id);
      expect(updatedLiveOff?.price).toBe(revisedPrice);
    });
  });

  describe("Scenario G: Availability override", () => {
    it("marking an item sold out immediately updates published customer menu without full republishing", () => {
      const state = usePewa.getState();
      const menu = state.menus.find((m) => m.orgId === state.organisation?.id && m.status === "published");
      expect(menu).toBeDefined();
      if (!menu) return;

      const venue = state.venues.find((v) => v.orgId === state.organisation?.id);
      expect(venue).toBeDefined();
      if (!venue) return;

      const sec = menu.sections[0];
      const off = sec?.offerings[0];
      expect(sec && off).toBeTruthy();
      if (!sec || !off) return;

      expect(off.available).toBe(true);

      // Toggle availability to sold out
      usePewa.getState().toggleAvailability(menu.id, sec.id, off.id);

      // Check draft
      const draftOff = usePewa
        .getState()
        .menus.find((m) => m.id === menu.id)
        ?.sections.find((s) => s.id === sec.id)
        ?.offerings.find((o) => o.id === off.id);
      expect(draftOff?.available).toBe(false);

      // Check live published snapshot immediately
      const liveMenus = getVenuePublishedMenus(venue, usePewa.getState().menus, usePewa.getState().venues);
      const liveOff = liveMenus
        .flatMap((m) => m.sections)
        .flatMap((s) => s.offerings)
        .find((o) => o.id === off.id);
      expect(liveOff?.available).toBe(false);

      // Validate cart rejects sold out item immediately
      const cart = {
        venueId: venue.id,
        lines: [
          {
            id: "line_soldout",
            menuId: menu.id,
            offeringId: off.id,
            name: off.name,
            emoji: off.emoji,
            basePrice: off.price,
            quantity: 1,
            options: [],
          },
        ],
      };
      const error = validateCart(usePewa.getState(), cart);
      expect(error).toContain("no longer available");
    });
  });

  describe("Scenario H: Mobile management conveniences", () => {
    it("duplicates an offering with new ID and appends (Copy)", () => {
      const state = usePewa.getState();
      const menu = state.menus.find((m) => m.orgId === state.organisation?.id);
      const sec = menu?.sections[0];
      const off = sec?.offerings[0];
      expect(menu && sec && off).toBeTruthy();
      if (!menu || !sec || !off) return;

      const originalCount = sec.offerings.length;
      const newId = usePewa.getState().duplicateOffering(menu.id, sec.id, off.id);

      expect(newId).toBeTruthy();
      expect(newId).not.toBe(off.id);

      const updatedSec = usePewa
        .getState()
        .menus.find((m) => m.id === menu.id)
        ?.sections.find((s) => s.id === sec.id);

      expect(updatedSec?.offerings.length).toBe(originalCount + 1);
      const cloned = updatedSec?.offerings.find((o) => o.id === newId);
      expect(cloned).toBeDefined();
      expect(cloned?.name).toBe(`${off.name} (Copy)`);
      expect(cloned?.price).toBe(off.price);
    });

    it("reorders offerings within a section with bounds protection", () => {
      const state = usePewa.getState();
      const menu = state.menus.find((m) => m.orgId === state.organisation?.id);
      const sec = menu?.sections[0];
      expect(menu && sec && sec.offerings.length >= 2).toBeTruthy();
      if (!menu || !sec || sec.offerings.length < 2) return;

      const firstId = sec.offerings[0]!.id;
      const secondId = sec.offerings[1]!.id;

      // Move first item down
      usePewa.getState().moveOfferingWithinSection(menu.id, sec.id, firstId, 1);

      let currentSec = usePewa
        .getState()
        .menus.find((m) => m.id === menu.id)
        ?.sections.find((s) => s.id === sec.id);

      expect(currentSec?.offerings[0]?.id).toBe(secondId);
      expect(currentSec?.offerings[1]?.id).toBe(firstId);

      // Move it back up
      usePewa.getState().moveOfferingWithinSection(menu.id, sec.id, firstId, -1);

      currentSec = usePewa
        .getState()
        .menus.find((m) => m.id === menu.id)
        ?.sections.find((s) => s.id === sec.id);

      expect(currentSec?.offerings[0]?.id).toBe(firstId);
      expect(currentSec?.offerings[1]?.id).toBe(secondId);

      // Bounds protection: moving top item up does nothing
      usePewa.getState().moveOfferingWithinSection(menu.id, sec.id, firstId, -1);
      currentSec = usePewa
        .getState()
        .menus.find((m) => m.id === menu.id)
        ?.sections.find((s) => s.id === sec.id);
      expect(currentSec?.offerings[0]?.id).toBe(firstId);
    });

    it("moves an offering cleanly between sections", () => {
      const state = usePewa.getState();
      const menu = state.menus.find((m) => m.orgId === state.organisation?.id);
      expect(menu && menu.sections.length >= 2).toBeTruthy();
      if (!menu || menu.sections.length < 2) return;

      const sec1 = menu.sections[0]!;
      const sec2 = menu.sections[1]!;
      const targetOffering = sec1.offerings[0]!;

      usePewa.getState().moveOfferingBetweenSections(menu.id, sec1.id, sec2.id, targetOffering.id);

      const updatedMenu = usePewa.getState().menus.find((m) => m.id === menu.id);
      const updatedSec1 = updatedMenu?.sections.find((s) => s.id === sec1.id);
      const updatedSec2 = updatedMenu?.sections.find((s) => s.id === sec2.id);

      expect(updatedSec1?.offerings.some((o) => o.id === targetOffering.id)).toBe(false);
      expect(updatedSec2?.offerings.some((o) => o.id === targetOffering.id)).toBe(true);
    });
  });

  describe("Curated library search and filters", () => {
    it("filters library images by category", () => {
      const coffeeImages = searchImageLibrary("", "coffee");
      expect(coffeeImages.length).toBeGreaterThan(0);
      expect(coffeeImages.every((img) => img.category === "coffee")).toBe(true);

      const bakeryImages = searchImageLibrary("", "bakery");
      expect(bakeryImages.length).toBeGreaterThan(0);
      expect(bakeryImages.every((img) => img.category === "bakery")).toBe(true);
    });

    it("searches library images by keyword", () => {
      const results = searchImageLibrary("croissant");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((img) => img.title.toLowerCase().includes("croissant"))).toBe(true);
    });
  });
});
