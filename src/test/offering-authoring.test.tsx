import { useState } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  usePewa,
  formatPrice,
  validateModifierGroupConfig,
  validateOfferingModifiersConfig,
  validateModifierSelection,
  validateAndRecalculateLineModifiers,
} from "@/lib/pewa/store";
import { ModifierEditor } from "@/components/pewa/ModifierEditor";
import { OfferingOrderForm } from "@/components/pewa/OfferingOrderForm";

function TestModifierEditorHarness({
  initialModifiers = [],
  onChange,
}: {
  initialModifiers?: ModifierGroup[];
  onChange: (mods: ModifierGroup[]) => void;
}) {
  const [mods, setMods] = useState<ModifierGroup[]>(initialModifiers);
  return (
    <ModifierEditor
      modifiers={mods}
      onChange={(updated) => {
        setMods(updated);
        onChange(updated);
      }}
      currency="KES"
    />
  );
}

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
import { lineTotal, validateCart, cartTotal } from "@/lib/pewa/ordering";
import type { Offering, Menu, Section, ModifierGroup, Venue } from "@/lib/pewa/types";

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
      const snapshotSec = publishedMenu?.publishedSnapshot?.sections.find(
        (s) => s.id === section.id,
      );
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
        name: "Flat White",
        price: 350,
        description: "Ristretto espresso shots topped with silky micro-foam.",
        available: true,
        emoji: "☕",
        tags: ["Hot"],
        modifiers: [sizeGroup, milkGroup],
        ...(existingFlat ? { id: existingFlat.id } : {}),
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
        note: "",
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
        note: "",
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
        note: "",
        options: [
          {
            groupId: extrasGroup.id,
            optionId: "opt_cheese",
            name: "Extra Cheddar",
            priceDelta: 60,
          },
          { groupId: extrasGroup.id, optionId: "opt_bacon", name: "Crispy Bacon", priceDelta: 100 },
          {
            groupId: extrasGroup.id,
            optionId: "opt_sauce",
            name: "House Truffle Mayo",
            priceDelta: 40,
          },
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
      const menu = state.menus.find(
        (m) => m.orgId === state.organisation?.id && m.status === "published",
      );
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
      const liveMenus = getVenuePublishedMenus(
        venue,
        usePewa.getState().menus,
        usePewa.getState().venues,
      );
      const liveOff = liveMenus
        .flatMap((m) => m.sections)
        .flatMap((s) => s.offerings)
        .find((o) => o.id === off.id);

      // Live menu should NOT contain the draft tag
      expect(liveOff?.tags.includes(draftTag)).toBe(false);

      // Now publish menu
      usePewa.getState().publishMenu(menu.id);

      // Now query live customer published menus again
      const republishedLiveMenus = getVenuePublishedMenus(
        venue,
        usePewa.getState().menus,
        usePewa.getState().venues,
      );
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
      const menu = state.menus.find(
        (m) => m.orgId === state.organisation?.id && m.status === "published",
      );
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
      const liveMenus = getVenuePublishedMenus(
        venue,
        usePewa.getState().menus,
        usePewa.getState().venues,
      );
      const liveOff = liveMenus
        .flatMap((m) => m.sections)
        .flatMap((s) => s.offerings)
        .find((o) => o.id === off.id);
      expect(liveOff?.price).toBe(originalPrice);

      // Publishing updates live price
      usePewa.getState().publishMenu(menu.id);
      const updatedLiveMenus = getVenuePublishedMenus(
        venue,
        usePewa.getState().menus,
        usePewa.getState().venues,
      );
      const updatedLiveOff = updatedLiveMenus
        .flatMap((m) => m.sections)
        .flatMap((s) => s.offerings)
        .find((o) => o.id === off.id);
      expect(updatedLiveOff?.price).toBe(revisedPrice);
    });
  });

  describe("Scenario G: Availability override", () => {
    it("marking an item sold out immediately updates published customer menu without full republishing", () => {
      const state = usePewa.getState();
      const menu = state.menus.find(
        (m) => m.orgId === state.organisation?.id && m.status === "published",
      );
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
      const liveMenus = getVenuePublishedMenus(
        venue,
        usePewa.getState().menus,
        usePewa.getState().venues,
      );
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
            note: "",
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

  describe("CORR-001: Modifier configuration, customer selection, and order validation alignment", () => {
    describe("CORR-A & CORR-C: Merchant modifier configuration validation", () => {
      it("rejects invalid merchant configurations (impossible min/max, empty names, duplicates)", () => {
        // Empty group name
        expect(
          validateModifierGroupConfig({
            id: "grp_1",
            name: "   ",
            options: [{ id: "opt_1", name: "Small", priceDelta: 0 }],
          }),
        ).toContain("name is required");

        // Group with 0 options
        expect(
          validateModifierGroupConfig({
            id: "grp_1",
            name: "Size",
            options: [],
          }),
        ).toContain("must have at least one option");

        // Empty option name
        expect(
          validateModifierGroupConfig({
            id: "grp_1",
            name: "Size",
            options: [{ id: "opt_1", name: "", priceDelta: 0 }],
          }),
        ).toContain("cannot have an empty name");

        // Duplicate option ID
        expect(
          validateModifierGroupConfig({
            id: "grp_1",
            name: "Size",
            options: [
              { id: "opt_dup", name: "Option 1", priceDelta: 0 },
              { id: "opt_dup", name: "Option 2", priceDelta: 10 },
            ],
          }),
        ).toContain("Duplicate option ID");

        // Negative price delta
        expect(
          validateModifierGroupConfig({
            id: "grp_1",
            name: "Size",
            options: [{ id: "opt_1", name: "Small", priceDelta: -20 }],
          }),
        ).toContain("invalid price delta");

        // Single choice with invalid min/max
        expect(
          validateModifierGroupConfig({
            id: "grp_1",
            name: "Size",
            selectionType: "single",
            required: true,
            minSelections: 2,
            options: [{ id: "opt_1", name: "Regular", priceDelta: 0 }],
          }),
        ).toContain("minimum selections other than 1");

        expect(
          validateModifierGroupConfig({
            id: "grp_1",
            name: "Size",
            selectionType: "single",
            maxSelections: 2,
            options: [{ id: "opt_1", name: "Regular", priceDelta: 0 }],
          }),
        ).toContain("maximum selections must be 1");

        // Multiple choice: minSelections > options.length
        expect(
          validateModifierGroupConfig({
            id: "grp_1",
            name: "Toppings",
            selectionType: "multiple",
            required: true,
            minSelections: 4,
            options: [
              { id: "opt_1", name: "Cheese", priceDelta: 50 },
              { id: "opt_2", name: "Bacon", priceDelta: 80 },
            ],
          }),
        ).toContain("exceeds total available options");

        // Multiple choice: maxSelections > options.length
        expect(
          validateModifierGroupConfig({
            id: "grp_1",
            name: "Toppings",
            selectionType: "multiple",
            maxSelections: 5,
            options: [
              { id: "opt_1", name: "Cheese", priceDelta: 50 },
              { id: "opt_2", name: "Bacon", priceDelta: 80 },
            ],
          }),
        ).toContain("exceeds total available options");

        // Multiple choice: maxSelections < minSelections
        expect(
          validateModifierGroupConfig({
            id: "grp_1",
            name: "Toppings",
            selectionType: "multiple",
            required: true,
            minSelections: 3,
            maxSelections: 2,
            options: [
              { id: "opt_1", name: "Cheese", priceDelta: 50 },
              { id: "opt_2", name: "Bacon", priceDelta: 80 },
              { id: "opt_3", name: "Sauce", priceDelta: 30 },
            ],
          }),
        ).toContain("cannot be less than minimum selections");

        // Offering level duplicate group IDs
        expect(
          validateOfferingModifiersConfig([
            {
              id: "grp_dup",
              name: "Size",
              options: [{ id: "opt_1", name: "Small", priceDelta: 0 }],
            },
            {
              id: "grp_dup",
              name: "Another Size",
              options: [{ id: "opt_2", name: "Regular", priceDelta: 0 }],
            },
          ]),
        ).toContain("Duplicate modifier group ID");
      });

      it("accepts valid single-choice and multiple-choice configurations", () => {
        expect(
          validateModifierGroupConfig({
            id: "grp_size",
            name: "Coffee Size",
            selectionType: "single",
            required: true,
            options: [
              { id: "opt_reg", name: "Regular", priceDelta: 0 },
              { id: "opt_lrg", name: "Large", priceDelta: 50 },
            ],
          }),
        ).toBeNull();

        expect(
          validateModifierGroupConfig({
            id: "grp_extras",
            name: "Extras",
            selectionType: "multiple",
            required: false,
            maxSelections: 2,
            options: [
              { id: "opt_1", name: "Cheese", priceDelta: 50 },
              { id: "opt_2", name: "Bacon", priceDelta: 80 },
              { id: "opt_3", name: "Jalapenos", priceDelta: 40 },
            ],
          }),
        ).toBeNull();
      });
    });

    describe("CORR-B & CORR-C: Customer selection validation rules", () => {
      const singleRequiredGroup: ModifierGroup = {
        id: "grp_size",
        name: "Size",
        selectionType: "single",
        required: true,
        options: [
          { id: "opt_sm", name: "Small", priceDelta: 0 },
          { id: "opt_lg", name: "Large", priceDelta: 50 },
        ],
      };

      const singleOptionalGroup: ModifierGroup = {
        id: "grp_milk",
        name: "Milk",
        selectionType: "single",
        required: false,
        options: [
          { id: "opt_oat", name: "Oat Milk", priceDelta: 50 },
          { id: "opt_alm", name: "Almond Milk", priceDelta: 60 },
        ],
      };

      const multiOptionalMax2Group: ModifierGroup = {
        id: "grp_toppings",
        name: "Toppings",
        selectionType: "multiple",
        required: false,
        maxSelections: 2,
        options: [
          { id: "opt_top1", name: "Cheddar", priceDelta: 40 },
          { id: "opt_top2", name: "Bacon", priceDelta: 80 },
          { id: "opt_top3", name: "Pickles", priceDelta: 30 },
        ],
      };

      const multiRequiredMin2Group: ModifierGroup = {
        id: "grp_tacos",
        name: "Taco Fillings",
        selectionType: "multiple",
        required: true,
        minSelections: 2,
        maxSelections: 3,
        options: [
          { id: "opt_f1", name: "Beef", priceDelta: 0 },
          { id: "opt_f2", name: "Chicken", priceDelta: 0 },
          { id: "opt_f3", name: "Pork", priceDelta: 0 },
        ],
      };

      it("enforces required single-choice group: exactly one valid option", () => {
        // Zero chosen -> reject
        expect(validateModifierSelection(singleRequiredGroup, [])).toContain(
          "Please select an option",
        );

        // Exactly one chosen -> valid
        expect(validateModifierSelection(singleRequiredGroup, ["opt_sm"])).toBeNull();

        // More than one chosen -> reject
        expect(validateModifierSelection(singleRequiredGroup, ["opt_sm", "opt_lg"])).toContain(
          "Only one option may be selected",
        );
      });

      it("enforces optional single-choice group: zero or one valid option", () => {
        // Zero chosen -> valid
        expect(validateModifierSelection(singleOptionalGroup, [])).toBeNull();

        // One chosen -> valid
        expect(validateModifierSelection(singleOptionalGroup, ["opt_oat"])).toBeNull();

        // More than one chosen -> reject
        expect(validateModifierSelection(singleOptionalGroup, ["opt_oat", "opt_alm"])).toContain(
          "Only one option may be selected",
        );
      });

      it("enforces optional multi-choice group with max 2: zero, one, or two choices", () => {
        // 0 selections -> valid
        expect(validateModifierSelection(multiOptionalMax2Group, [])).toBeNull();

        // 1 selection -> valid
        expect(validateModifierSelection(multiOptionalMax2Group, ["opt_top1"])).toBeNull();

        // 2 selections -> valid
        expect(
          validateModifierSelection(multiOptionalMax2Group, ["opt_top1", "opt_top2"]),
        ).toBeNull();

        // 3 selections (exceeds max 2) -> reject
        expect(
          validateModifierSelection(multiOptionalMax2Group, ["opt_top1", "opt_top2", "opt_top3"]),
        ).toContain("You may select at most 2");
      });

      it("enforces required multi-choice group with min 2: cannot proceed with fewer than two", () => {
        // 0 selections -> reject
        expect(validateModifierSelection(multiRequiredMin2Group, [])).toContain(
          "Please select at least 2",
        );

        // 1 selection -> reject
        expect(validateModifierSelection(multiRequiredMin2Group, ["opt_f1"])).toContain(
          "Please select at least 2",
        );

        // 2 selections -> valid
        expect(validateModifierSelection(multiRequiredMin2Group, ["opt_f1", "opt_f2"])).toBeNull();

        // 3 selections -> valid
        expect(
          validateModifierSelection(multiRequiredMin2Group, ["opt_f1", "opt_f2", "opt_f3"]),
        ).toBeNull();
      });

      it("rejects duplicate and unknown option IDs", () => {
        // Duplicate selection of same option ID
        expect(
          validateModifierSelection(multiOptionalMax2Group, ["opt_top1", "opt_top1"]),
        ).toContain("Duplicate option selection");

        // Unknown option ID
        expect(validateModifierSelection(singleRequiredGroup, ["opt_unknown"])).toContain(
          "Invalid or unknown option ID",
        );
      });
    });

    describe("CORR-C: Store-level admission, cart validation, and authoritative recalculation", () => {
      it("rejects cart lines that violate published modifier rules at addCartLine and validateCart", () => {
        const state = usePewa.getState();
        const venue = state.venues.find((v) => v.id === "venue_ggc")!;
        const publishedMenu = getVenuePublishedMenus(venue, state.menus, state.venues)[0]!;
        const section = publishedMenu.sections[0]!;

        // Add an offering with strict rules to the menu and publish
        const testOffering: Offering = {
          id: "off_combo",
          name: "Burger Combo",
          description: "Burger with required sides and max 2 drinks",
          price: 800,
          emoji: "🍔",
          tags: ["Special"],
          available: true,
          modifiers: [
            {
              id: "grp_side",
              name: "Side Choice",
              selectionType: "single",
              required: true,
              options: [
                { id: "opt_fries", name: "French Fries", priceDelta: 0 },
                { id: "opt_salad", name: "Garden Salad", priceDelta: 50 },
              ],
            },
            {
              id: "grp_sauces",
              name: "Extra Sauces",
              selectionType: "multiple",
              required: false,
              maxSelections: 2,
              options: [
                { id: "opt_bbq", name: "BBQ Sauce", priceDelta: 30 },
                { id: "opt_garlic", name: "Garlic Mayo", priceDelta: 30 },
                { id: "opt_chili", name: "Chili Dip", priceDelta: 30 },
              ],
            },
          ],
        };

        usePewa.getState().upsertOffering(publishedMenu.id, section.id, testOffering);
        usePewa.getState().publishMenu(publishedMenu.id);

        // 1. Missing required choice -> rejected by addCartLine
        const errMissing = usePewa.getState().addCartLine(venue.id, {
          menuId: publishedMenu.id,
          offeringId: testOffering.id,
          name: testOffering.name,
          emoji: testOffering.emoji,
          basePrice: testOffering.price,
          quantity: 1,
          note: "",
          options: [], // omitted required Side Choice
        });
        expect(errMissing).toContain("Side Choice");

        // 2. Excessive choices (3 sauces when max is 2) -> rejected
        const errExcess = usePewa.getState().addCartLine(venue.id, {
          menuId: publishedMenu.id,
          offeringId: testOffering.id,
          name: testOffering.name,
          emoji: testOffering.emoji,
          basePrice: testOffering.price,
          quantity: 1,
          note: "",
          options: [
            { groupId: "grp_side", optionId: "opt_fries", name: "French Fries", priceDelta: 0 },
            { groupId: "grp_sauces", optionId: "opt_bbq", name: "BBQ Sauce", priceDelta: 30 },
            { groupId: "grp_sauces", optionId: "opt_garlic", name: "Garlic Mayo", priceDelta: 30 },
            { groupId: "grp_sauces", optionId: "opt_chili", name: "Chili Dip", priceDelta: 30 },
          ],
        });
        expect(errExcess).toContain("You may select at most 2");

        // 3. Unknown foreign groupId -> rejected
        const errForeign = usePewa.getState().addCartLine(venue.id, {
          menuId: publishedMenu.id,
          offeringId: testOffering.id,
          name: testOffering.name,
          emoji: testOffering.emoji,
          basePrice: testOffering.price,
          quantity: 1,
          note: "",
          options: [
            { groupId: "grp_side", optionId: "opt_fries", name: "French Fries", priceDelta: 0 },
            { groupId: "grp_hacked", optionId: "opt_fake", name: "Fake", priceDelta: 0 },
          ],
        });
        expect(errForeign).toContain("unknown modifier group");

        // 4. Unknown optionId -> rejected
        const errUnknownOpt = usePewa.getState().addCartLine(venue.id, {
          menuId: publishedMenu.id,
          offeringId: testOffering.id,
          name: testOffering.name,
          emoji: testOffering.emoji,
          basePrice: testOffering.price,
          quantity: 1,
          note: "",
          options: [
            {
              groupId: "grp_side",
              optionId: "opt_nonexistent",
              name: "Ghost Fries",
              priceDelta: 0,
            },
          ],
        });
        expect(errUnknownOpt).toContain("unknown or removed option");
      });

      it("recalculates price adjustments authoritatively from published offering and rejects tampered values", () => {
        const state = usePewa.getState();
        const venue = state.venues.find((v) => v.id === "venue_ggc")!;
        const publishedMenu = getVenuePublishedMenus(venue, state.menus, state.venues)[0]!;
        const section = publishedMenu.sections[0]!;

        const pricedOffering: Offering = {
          id: "off_latte_special",
          name: "Special Latte",
          description: "Authoritative price test",
          price: 400,
          emoji: "☕",
          tags: [],
          available: true,
          modifiers: [
            {
              id: "grp_syrup",
              name: "Syrup",
              selectionType: "single",
              required: true,
              options: [{ id: "opt_vanilla", name: "Vanilla Syrup", priceDelta: 60 }],
            },
          ],
        };

        usePewa.getState().upsertOffering(publishedMenu.id, section.id, pricedOffering);
        usePewa.getState().publishMenu(publishedMenu.id);

        usePewa.getState().clearCart();

        // Valid cart addition with accurate published values
        const addErr = usePewa.getState().addCartLine(venue.id, {
          menuId: publishedMenu.id,
          offeringId: pricedOffering.id,
          name: pricedOffering.name,
          emoji: pricedOffering.emoji,
          basePrice: pricedOffering.price,
          quantity: 2,
          note: "Hot",
          options: [
            {
              groupId: "grp_syrup",
              optionId: "opt_vanilla",
              name: "Vanilla Syrup",
              priceDelta: 60,
            },
          ],
        });
        expect(addErr).toBeNull();

        // Verify cart line total: (400 + 60) * 2 = 920
        const currentCart = usePewa.getState().cart;
        expect(currentCart).not.toBeNull();
        expect(cartTotal(currentCart!.lines)).toBe(920);

        // Submit order
        const orderResult = usePewa.getState().submitOrder({
          guestName: "Alice Mwangi",
          guestContact: "+254712345678",
          service: "Dine-in",
          note: "Table 4",
        });
        expect(orderResult.id).toBeDefined();

        const submittedOrder = usePewa.getState().orders.find((o) => o.id === orderResult.id)!;
        expect(submittedOrder.total).toBe(920);
        expect(submittedOrder.lines[0]?.options[0]?.priceDelta).toBe(60);
      });

      it("preserves draft-isolation: unpublished modifier edits do not affect live customer order admission", () => {
        const state = usePewa.getState();
        const venue = state.venues.find((v) => v.id === "venue_ggc")!;
        const publishedMenu = getVenuePublishedMenus(venue, state.menus, state.venues)[0]!;
        const section = publishedMenu.sections[0]!;

        const draftIsolationOffering: Offering = {
          id: "off_matcha",
          name: "Matcha Latte",
          description: "Live snapshot test",
          price: 500,
          emoji: "🍵",
          tags: [],
          available: true,
          modifiers: [
            {
              id: "grp_sweetness",
              name: "Sweetness",
              selectionType: "single",
              required: true,
              options: [
                { id: "opt_standard", name: "Standard Sweet", priceDelta: 0 },
                { id: "opt_honey", name: "Honey Infusion", priceDelta: 40 },
              ],
            },
          ],
        };

        usePewa.getState().upsertOffering(publishedMenu.id, section.id, draftIsolationOffering);
        usePewa.getState().publishMenu(publishedMenu.id);

        // Now merchant alters the draft without publishing: changes priceDelta from 40 to 120
        const draftModifiedOffering: Offering = {
          ...draftIsolationOffering,
          modifiers: [
            {
              id: "grp_sweetness",
              name: "Sweetness",
              selectionType: "single",
              required: true,
              options: [
                { id: "opt_standard", name: "Standard Sweet", priceDelta: 0 },
                { id: "opt_honey", name: "Honey Infusion", priceDelta: 120 }, // Unpublished draft change!
              ],
            },
          ],
        };
        usePewa.getState().upsertOffering(publishedMenu.id, section.id, draftModifiedOffering);

        // The effective published menu snapshot MUST still have Honey Infusion at +40!
        const liveVenueMenus = getVenuePublishedMenus(
          venue,
          usePewa.getState().menus,
          usePewa.getState().venues,
        );
        const liveMenu = liveVenueMenus.find((m) => m.id === publishedMenu.id)!;
        const liveOffering = liveMenu.sections[0]!.offerings.find(
          (o) => o.id === draftIsolationOffering.id,
        )!;
        expect(liveOffering.modifiers[0]?.options[1]?.priceDelta).toBe(40);

        // Customer orders against the live published version (+40)
        usePewa.getState().clearCart();
        const addResult = usePewa.getState().addCartLine(venue.id, {
          menuId: publishedMenu.id,
          offeringId: draftIsolationOffering.id,
          name: draftIsolationOffering.name,
          emoji: draftIsolationOffering.emoji,
          basePrice: 500,
          quantity: 1,
          note: "",
          options: [
            {
              groupId: "grp_sweetness",
              optionId: "opt_honey",
              name: "Honey Infusion",
              priceDelta: 40,
            },
          ],
        });
        expect(addResult).toBeNull();

        const submitResult = usePewa.getState().submitOrder({
          guestName: "Brian Ochieng",
          guestContact: "+254722112233",
          service: "Dine-in",
          note: "",
        });
        expect(submitResult.id).toBeDefined();

        const order = usePewa.getState().orders.find((o) => o.id === submitResult.id)!;
        expect(order.total).toBe(540); // 500 + 40
      });

      it("ensures existing submitted orders retain their submitted snapshots even after menu changes and republication", () => {
        const state = usePewa.getState();
        const venue = state.venues.find((v) => v.id === "venue_ggc")!;
        const publishedMenu = getVenuePublishedMenus(venue, state.menus, state.venues)[0]!;
        const section = publishedMenu.sections[0]!;

        const orderSnapOffering: Offering = {
          id: "off_smoothie",
          name: "Berry Smoothie",
          description: "Snapshot retention test",
          price: 450,
          emoji: "🥤",
          tags: [],
          available: true,
          modifiers: [
            {
              id: "grp_protein",
              name: "Protein Boost",
              selectionType: "single",
              required: false,
              options: [{ id: "opt_whey", name: "Whey Protein", priceDelta: 100 }],
            },
          ],
        };

        usePewa.getState().upsertOffering(publishedMenu.id, section.id, orderSnapOffering);
        usePewa.getState().publishMenu(publishedMenu.id);

        usePewa.getState().clearCart();
        usePewa.getState().addCartLine(venue.id, {
          menuId: publishedMenu.id,
          offeringId: orderSnapOffering.id,
          name: orderSnapOffering.name,
          emoji: orderSnapOffering.emoji,
          basePrice: 450,
          quantity: 1,
          note: "",
          options: [
            { groupId: "grp_protein", optionId: "opt_whey", name: "Whey Protein", priceDelta: 100 },
          ],
        });

        const submitRes = usePewa.getState().submitOrder({
          guestName: "David Kimani",
          guestContact: "+254733445566",
          service: "Dine-in",
          note: "",
        });
        const orderId = submitRes.id!;
        const originalTotal = usePewa.getState().orders.find((o) => o.id === orderId)!.total;
        expect(originalTotal).toBe(550);

        // Merchant later changes base price to 600, protein to 150, and republishes
        const updatedOffering: Offering = {
          ...orderSnapOffering,
          price: 600,
          modifiers: [
            {
              id: "grp_protein",
              name: "Protein Boost",
              selectionType: "single",
              required: false,
              options: [{ id: "opt_whey", name: "Whey Protein", priceDelta: 150 }],
            },
          ],
        };
        usePewa.getState().upsertOffering(publishedMenu.id, section.id, updatedOffering);
        usePewa.getState().publishMenu(publishedMenu.id);

        // Previous submitted order MUST retain its exact original 550 total and 100 protein delta
        const preservedOrder = usePewa.getState().orders.find((o) => o.id === orderId)!;
        expect(preservedOrder.total).toBe(550);
        expect(preservedOrder.lines[0]?.basePrice).toBe(450);
        expect(preservedOrder.lines[0]?.options[0]?.priceDelta).toBe(100);
      });
    });

    describe("CORR-D: Interactive DOM walkthrough of merchant-to-customer modifier journey", () => {
      it("renders merchant ModifierEditor, configures single & multiple choice groups with min/max, then renders OfferingOrderForm and exercises customer choices", () => {
        // 1. Merchant authoring step via ModifierEditor using stateful harness
        let latestAuthored: ModifierGroup[] = [];
        const handleAuthoredChange = (mods: ModifierGroup[]) => {
          latestAuthored = mods;
        };

        const { unmount: unmountEditor } = render(
          <TestModifierEditorHarness onChange={handleAuthoredChange} />,
        );

        // Tap preset button "Coffee Size"
        const sizePresetBtn = screen.getByRole("button", { name: /coffee size/i });
        fireEvent.click(sizePresetBtn);

        expect(latestAuthored.length).toBe(1);
        expect(latestAuthored[0]?.name).toBe("Size");
        expect(latestAuthored[0]?.selectionType).toBe("single");
        expect(latestAuthored[0]?.required).toBe(true);

        // Tap preset button "Extras & Add-ons"
        const extrasPresetBtn = screen.getByRole("button", { name: /extras & add-ons/i });
        fireEvent.click(extrasPresetBtn);

        expect(latestAuthored.length).toBe(2);
        expect(latestAuthored[1]?.name).toBe("Extras");
        expect(latestAuthored[1]?.selectionType).toBe("multiple");

        // Set max limit on Extras to 2
        const configuredModifiers = latestAuthored.map((g) =>
          g.id === latestAuthored[1]?.id ? { ...g, maxSelections: 2 } : g,
        );

        // Verify that authored modifiers pass configuration validation
        expect(validateOfferingModifiersConfig(configuredModifiers)).toBeNull();
        unmountEditor();

        // 2. Customer ordering experience step via OfferingOrderForm
        const venue = usePewa.getState().venues.find((v) => v.id === "venue_ggc")!;
        const menu = getVenuePublishedMenus(
          venue,
          usePewa.getState().menus,
          usePewa.getState().venues,
        )[0]!;

        const customerOffering: Offering = {
          id: "off_dom_coffee",
          name: "Artisan Pour-Over",
          description: "Freshly brewed single origin",
          price: 300,
          emoji: "☕",
          tags: ["Hot"],
          available: true,
          modifiers: configuredModifiers,
        };

        // Publish offering to live menu so addCartLine can admit it
        usePewa.getState().upsertOffering(menu.id, menu.sections[0]!.id, customerOffering);
        usePewa.getState().publishMenu(menu.id);
        usePewa.getState().clearCart();

        let addedCalled = false;
        const handleAdded = () => {
          addedCalled = true;
        };

        const { unmount: unmountForm } = render(
          <OfferingOrderForm
            offering={customerOffering}
            venue={venue}
            menuId={menu.id}
            onAdded={handleAdded}
          />,
        );

        // Initially: Size is required single-choice and not yet selected.
        // The Add to Cart button should be disabled with a prompt to select an option for Size
        const submitBtn = screen.getByRole("button", { name: /size/i });
        expect(submitBtn).toBeDisabled();

        // Select "Regular / Small" size (radio button)
        const regularRadio = screen.getByLabelText(/regular \/ small/i);
        fireEvent.click(regularRadio);

        // Now Size is selected! The button should now be enabled: "Add to cart · KES 300"
        expect(screen.getByRole("button", { name: /add to cart/i })).not.toBeDisabled();

        // Extras has maxSelections = 2.
        // Check first extra: "Cheddar Cheese Slice"
        const cheddarCheckbox = screen.getByLabelText(/cheddar cheese slice/i);
        fireEvent.click(cheddarCheckbox);

        // Check second extra: "Crispy Beef Bacon"
        const baconCheckbox = screen.getByLabelText(/crispy beef bacon/i);
        fireEvent.click(baconCheckbox);

        // With 2 extras selected (at max), the remaining unchecked extras should be disabled
        const jalapenoCheckbox = screen.getByLabelText(/jalapeño peppers/i);
        expect(jalapenoCheckbox).toBeDisabled();

        // Click "Add to cart"
        const addToCartBtn = screen.getByRole("button", { name: /add to cart/i });
        fireEvent.click(addToCartBtn);

        expect(addedCalled).toBe(true);

        // Verify cart state
        const cart = usePewa.getState().cart;
        expect(cart).not.toBeNull();
        expect(cart?.lines.length).toBe(1);
        expect(cart?.lines[0]?.options.length).toBe(3); // 1 size + 2 extras

        unmountForm();
      });
    });
  });
});
