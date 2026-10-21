import { describe, it, expect, beforeEach } from "vitest";
import { usePewa, formatPrice, hasUnpublishedDraftChanges } from "@/lib/pewa/store";
import {
  isOfferingHiddenAtVenue,
  getEffectiveOffering,
  isOfferingInSchedule,
  getEffectiveOfferingAvailability,
  formatSchedule,
  getSharedOfferingUsage,
  parseScheduleReferenceTime,
  getMenuEffectiveSharedOfferings,
} from "@/lib/pewa/availability";
import { lineTotal, validateCart } from "@/lib/pewa/ordering";
import type { Offering, Menu, SharedOffering, OfferingSchedule } from "@/lib/pewa/types";

describe("R1-D — Menu Management, Shared Offerings, Venue Variations and Availability", () => {
  beforeEach(() => {
    usePewa.getState().loadScenario("multi-brand");
    usePewa.getState().setRole("owner");
    usePewa.getState().setSimulatedTime(undefined);
  });

  describe("Scenario A: Single Café Workflow & Fast Sold-Out", () => {
    it("configures offering with breakfast schedule and verifies operational fast 86-ing", () => {
      usePewa.getState().loadScenario("units-available");
      const state = usePewa.getState();
      const venue = state.venues[0];
      expect(venue).toBeDefined();

      const menu = state.menus.find(
        (m) => m.orgId === state.organisation?.id && m.status === "published",
      );
      expect(menu).toBeDefined();
      if (!menu || !venue) return;

      const section = menu.sections[0]!;
      const offering = section.offerings[0]!;
      expect(offering).toBeDefined();

      // Configure breakfast schedule 07:00 - 11:30
      usePewa.getState().setOfferingSchedule(menu.id, section.id, offering.id, {
        enabled: true,
        name: "Breakfast Hours",
        startTime: "07:00",
        endTime: "11:30",
        days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      });

      // Schedule change is draft-isolated (requires publishing)
      const updatedMenu = usePewa.getState().menus.find((m) => m.id === menu.id)!;
      expect(hasUnpublishedDraftChanges(updatedMenu, usePewa.getState().sharedOfferings)).toBe(
        true,
      );

      // Now publish changes
      usePewa.getState().publishMenu(menu.id);
      const publishedMenu = usePewa.getState().menus.find((m) => m.id === menu.id)!;
      expect(hasUnpublishedDraftChanges(publishedMenu, usePewa.getState().sharedOfferings)).toBe(
        false,
      );

      // 1-tap Fast 86-ing (sold out toggle)
      usePewa.getState().toggleAvailability(menu.id, section.id, offering.id);

      const after86Menu = usePewa.getState().menus.find((m) => m.id === menu.id)!;
      expect(after86Menu.publishedSnapshot).toBeDefined();
      const liveOffering = after86Menu.publishedSnapshot!.sections[0]!.offerings.find(
        (o) => o.id === offering.id,
      )!;
      expect(liveOffering.available).toBe(false);

      // Crucial R1-D Product Truth: fast sold-out toggle updates live menu without dirtying draft state
      expect(hasUnpublishedDraftChanges(after86Menu, usePewa.getState().sharedOfferings)).toBe(
        false,
      );

      // Availability evaluation reports sold_out_manual
      const avail = getEffectiveOfferingAvailability(liveOffering, venue.id, {
        simulatedTime: "09:00",
      });
      expect(avail.available).toBe(false);
      expect(avail.reason).toBe("sold_out_manual");
      expect(avail.badgeText).toBe("Sold out today");
    });
  });

  describe("Scenario B: Two-Branch Multi-Location Variations", () => {
    it("resolves shared cappuccino base price at Sol Bakery and overridden price at Gelato Lab", () => {
      const state = usePewa.getState();
      const solVenue = state.venues.find((v) => v.id === "venue_sol")!;
      const gelatoVenue = state.venues.find((v) => v.id === "venue_gelato")!;
      expect(solVenue).toBeDefined();
      expect(gelatoVenue).toBeDefined();

      const bakeryMenu = state.menus.find((m) => m.id === "menu_sol_bakery")!;
      const gelatoMenu = state.menus.find((m) => m.id === "menu_gelato_lab")!;
      expect(bakeryMenu).toBeDefined();
      expect(gelatoMenu).toBeDefined();

      const bakeryCappuccino = bakeryMenu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.sharedOfferingId === "sh_artisan_cappuccino")!;
      const gelatoCappuccino = gelatoMenu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.sharedOfferingId === "sh_artisan_cappuccino")!;

      expect(bakeryCappuccino).toBeDefined();
      expect(gelatoCappuccino).toBeDefined();

      // Sol Bakery uses master base price (280 KES)
      const effectiveSol = getEffectiveOffering(
        bakeryCappuccino,
        solVenue.id,
        state.sharedOfferings,
      );
      expect(effectiveSol.price).toBe(280);

      // Gelato Lab has venue override price (350 KES) and branch-specific description
      const effectiveGelato = getEffectiveOffering(
        gelatoCappuccino,
        gelatoVenue.id,
        state.sharedOfferings,
      );
      expect(effectiveGelato.price).toBe(350);
      expect(effectiveGelato.description).toBe("Quick grab-and-go roast with steamed microfoam");

      // Both retain same shared image and milk choice modifiers
      expect(effectiveSol.image).toBe(effectiveGelato.image);
      expect(effectiveSol.modifiers.length).toBeGreaterThan(0);
      expect(effectiveGelato.modifiers.length).toBeGreaterThan(0);

      // Cart line additions verify authoritative pricing at respective venues
      usePewa.getState().addCartLine(solVenue.id, {
        menuId: bakeryMenu.id,
        offeringId: bakeryCappuccino.id,
        name: bakeryCappuccino.name,
        emoji: bakeryCappuccino.emoji,
        basePrice: bakeryCappuccino.price,
        options: [
          { groupId: "mod_milk_choice", optionId: "opt_whole", name: "Whole Milk", priceDelta: 0 },
        ],
        quantity: 1,
        note: "",
      });
      expect(usePewa.getState().cart?.lines[0]?.basePrice).toBe(280);

      usePewa.getState().clearCart();

      usePewa.getState().addCartLine(gelatoVenue.id, {
        menuId: gelatoMenu.id,
        offeringId: gelatoCappuccino.id,
        name: gelatoCappuccino.name,
        emoji: gelatoCappuccino.emoji,
        basePrice: gelatoCappuccino.price,
        options: [
          { groupId: "mod_milk_choice", optionId: "opt_whole", name: "Whole Milk", priceDelta: 0 },
        ],
        quantity: 1,
        note: "",
      });
      expect(usePewa.getState().cart?.lines[0]?.basePrice).toBe(350);
    });
  });

  describe("Scenario C: Shared Master Update and Propagation", () => {
    it("updates shared master in catalogue and propagates to menus while preserving local venue overrides", () => {
      const state = usePewa.getState();
      expect(state.sharedOfferings).toBeDefined();
      const sharedMaster = state.sharedOfferings!.find((s) => s.id === "sh_artisan_cappuccino")!;
      expect(sharedMaster).toBeDefined();

      // Update shared master description and tags
      usePewa.getState().upsertSharedOffering({
        ...sharedMaster,
        description: "Updated master recipe with ethically sourced organic beans.",
        tags: ["Organic", "Fair-Trade", "Coffee"],
      });

      const updatedOfferings = usePewa.getState().sharedOfferings;
      expect(updatedOfferings).toBeDefined();
      const updatedMaster = updatedOfferings!.find((s) => s.id === "sh_artisan_cappuccino")!;
      expect(updatedMaster.description).toBe(
        "Updated master recipe with ethically sourced organic beans.",
      );

      // Sol Bakery (which had no local description override) receives updated description in draft
      const bakeryMenu = usePewa.getState().menus.find((m) => m.id === "menu_sol_bakery")!;
      const bakeryCappuccino = bakeryMenu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.sharedOfferingId === "sh_artisan_cappuccino")!;

      const effectiveSol = getEffectiveOffering(
        bakeryCappuccino,
        "venue_sol",
        usePewa.getState().sharedOfferings,
      );
      expect(effectiveSol.description).toBe(
        "Updated master recipe with ethically sourced organic beans.",
      );
      expect(effectiveSol.tags).toContain("Organic");

      // Gelato Lab (which has explicit venue description override) preserves its branch description and branch price
      const gelatoMenu = usePewa.getState().menus.find((m) => m.id === "menu_gelato_lab")!;
      const gelatoCappuccino = gelatoMenu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.sharedOfferingId === "sh_artisan_cappuccino")!;

      const effectiveGelato = getEffectiveOffering(
        gelatoCappuccino,
        "venue_gelato",
        usePewa.getState().sharedOfferings,
      );
      expect(effectiveGelato.price).toBe(350);
      expect(effectiveGelato.description).toBe("Quick grab-and-go roast with steamed microfoam");
    });
  });

  describe("CORR-A: Shared Master Publication Isolation & Cart Validation", () => {
    it("editing shared master does NOT affect published live customer menu until explicit publication", () => {
      const state = usePewa.getState();
      const bakeryMenu = state.menus.find((m) => m.id === "menu_sol_bakery")!;
      expect(bakeryMenu.status).toBe("published");
      expect(bakeryMenu.publishedSnapshot).toBeDefined();

      // Prior to catalogue edit, pending changes is false
      expect(hasUnpublishedDraftChanges(bakeryMenu, state.sharedOfferings)).toBe(false);

      const sharedMaster = state.sharedOfferings!.find((s) => s.id === "sh_artisan_cappuccino")!;
      const initialPrice = sharedMaster.price; // 280

      // Customer sees published price (280 KES)
      const customerSharedBefore = getMenuEffectiveSharedOfferings(
        bakeryMenu,
        state.sharedOfferings,
        {
          isPreview: false,
        },
      );
      const bakeryCappuccino = bakeryMenu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.sharedOfferingId === "sh_artisan_cappuccino")!;
      const effectiveCustomerBefore = getEffectiveOffering(
        bakeryCappuccino,
        "venue_sol",
        customerSharedBefore,
      );
      expect(effectiveCustomerBefore.price).toBe(initialPrice);

      // Merchant updates catalogue master price from 280 to 320 KES
      usePewa.getState().upsertSharedOffering({
        ...sharedMaster,
        price: 320,
      });

      const updatedMenu = usePewa.getState().menus.find((m) => m.id === "menu_sol_bakery")!;

      // 1. Pending changes badge activates on menu
      expect(hasUnpublishedDraftChanges(updatedMenu, usePewa.getState().sharedOfferings)).toBe(
        true,
      );

      // 2. Draft/Preview view sees new proposed price (320 KES)
      const previewShared = getMenuEffectiveSharedOfferings(
        updatedMenu,
        usePewa.getState().sharedOfferings,
        { isPreview: true },
      );
      const effectivePreview = getEffectiveOffering(bakeryCappuccino, "venue_sol", previewShared);
      expect(effectivePreview.price).toBe(320);

      // 3. Customer live menu STILL sees 280 KES until republished!
      const customerSharedAfterEdit = getMenuEffectiveSharedOfferings(
        updatedMenu,
        usePewa.getState().sharedOfferings,
        { isPreview: false },
      );
      const effectiveCustomerAfterEdit = getEffectiveOffering(
        bakeryCappuccino,
        "venue_sol",
        customerSharedAfterEdit,
      );
      expect(effectiveCustomerAfterEdit.price).toBe(initialPrice); // Stays 280!

      // 4. Cart placed on live menu adds with live published price (280 KES)
      usePewa.getState().clearCart();
      const addRes = usePewa.getState().addCartLine("venue_sol", {
        menuId: bakeryMenu.id,
        offeringId: bakeryCappuccino.id,
        name: bakeryCappuccino.name,
        emoji: bakeryCappuccino.emoji,
        basePrice: 280,
        options: [
          { groupId: "mod_milk_choice", optionId: "opt_whole", name: "Whole Milk", priceDelta: 0 },
        ],
        quantity: 1,
        note: "",
      });
      expect(addRes).toBeNull();
      expect(usePewa.getState().cart?.lines[0]?.basePrice).toBe(280);

      // Validating cart at this stage succeeds because live published menu is still 280
      expect(validateCart(usePewa.getState(), usePewa.getState().cart)).toBeNull();

      // 5. Merchant explicitly publishes the menu
      usePewa.getState().publishMenu(bakeryMenu.id);
      const republishedMenu = usePewa.getState().menus.find((m) => m.id === "menu_sol_bakery")!;
      expect(hasUnpublishedDraftChanges(republishedMenu, usePewa.getState().sharedOfferings)).toBe(
        false,
      );

      // Now live customer sees 320 KES
      const customerSharedAfterPublish = getMenuEffectiveSharedOfferings(
        republishedMenu,
        usePewa.getState().sharedOfferings,
        { isPreview: false },
      );
      const effectiveCustomerPublished = getEffectiveOffering(
        bakeryCappuccino,
        "venue_sol",
        customerSharedAfterPublish,
      );
      expect(effectiveCustomerPublished.price).toBe(320);

      // 6. Cart revalidation now detects price change!
      const cartError = validateCart(usePewa.getState(), usePewa.getState().cart);
      expect(cartError).toContain("price has changed");
    });

    it("isolates shared-image and modifier changes until menu is published", () => {
      const state = usePewa.getState();
      const bakeryMenu = state.menus.find((m) => m.id === "menu_sol_bakery")!;
      const sharedMaster = state.sharedOfferings!.find((s) => s.id === "sh_artisan_cappuccino")!;
      const oldImage = sharedMaster.image;

      // Update shared master image in catalogue
      usePewa.getState().upsertSharedOffering({
        ...sharedMaster,
        image: "https://images.unsplash.com/new-cappuccino-photo",
      });

      // Customer sees frozen snapshot image
      const customerShared = getMenuEffectiveSharedOfferings(
        bakeryMenu,
        usePewa.getState().sharedOfferings,
        {
          isPreview: false,
        },
      );
      const off = bakeryMenu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.sharedOfferingId === "sh_artisan_cappuccino")!;
      const customerEff = getEffectiveOffering(off, "venue_sol", customerShared);
      expect(customerEff.image).toBe(oldImage);

      // Preview sees new image
      const previewShared = getMenuEffectiveSharedOfferings(
        bakeryMenu,
        usePewa.getState().sharedOfferings,
        {
          isPreview: true,
        },
      );
      const previewEff = getEffectiveOffering(off, "venue_sol", previewShared);
      expect(previewEff.image).toBe("https://images.unsplash.com/new-cappuccino-photo");
    });
  });

  describe("CORR-B: Precedence Hierarchy & Inherited Exclusions", () => {
    it("inherits venue exclusions configured on shared master unless overridden locally", () => {
      const state = usePewa.getState();
      const sharedMaster = state.sharedOfferings!.find((s) => s.id === "sh_artisan_cappuccino")!;

      // Master excludes venue_sol
      usePewa.getState().upsertSharedOffering({
        ...sharedMaster,
        venueOverrides: {
          venue_sol: {
            venueId: "venue_sol",
            hidden: true,
          },
        },
      });

      const bakeryMenu = state.menus.find((m) => m.id === "menu_sol_bakery")!;
      const cappuccino = bakeryMenu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.sharedOfferingId === "sh_artisan_cappuccino")!;
      expect(cappuccino).toBeDefined();

      // Offering itself has no local override for venue_sol
      expect(cappuccino.venueOverrides?.["venue_sol"]).toBeUndefined();

      // Inherited exclusion: isOfferingHiddenAtVenue evaluates to true
      expect(
        isOfferingHiddenAtVenue(cappuccino, "venue_sol", usePewa.getState().sharedOfferings),
      ).toBe(true);

      // Effective availability returns venue_excluded
      const avail = getEffectiveOfferingAvailability(cappuccino, "venue_sol", {
        sharedOfferings: usePewa.getState().sharedOfferings,
      });
      expect(avail.available).toBe(false);
      expect(avail.reason).toBe("venue_excluded");

      const targetSection = bakeryMenu.sections.find((s) =>
        s.offerings.some((o) => o.id === cappuccino.id),
      )!;

      // Now explicit local override overrides master exclusion: set hidden: false on offering
      usePewa
        .getState()
        .setOfferingVenueOverride(bakeryMenu.id, targetSection.id, cappuccino.id, "venue_sol", {
          hidden: false,
        });

      const overriddenMenu = usePewa.getState().menus.find((m) => m.id === "menu_sol_bakery")!;
      const overriddenCappuccino = overriddenMenu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.sharedOfferingId === "sh_artisan_cappuccino")!;

      expect(
        isOfferingHiddenAtVenue(
          overriddenCappuccino,
          "venue_sol",
          usePewa.getState().sharedOfferings,
        ),
      ).toBe(false);

      // Removing the local venue override cleanly restores the master's inherited exclusion
      usePewa
        .getState()
        .removeOfferingVenueOverride(bakeryMenu.id, targetSection.id, cappuccino.id, "venue_sol");

      const restoredMenu = usePewa.getState().menus.find((m) => m.id === "menu_sol_bakery")!;
      const restoredCappuccino = restoredMenu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.sharedOfferingId === "sh_artisan_cappuccino")!;

      expect(
        isOfferingHiddenAtVenue(
          restoredCappuccino,
          "venue_sol",
          usePewa.getState().sharedOfferings,
        ),
      ).toBe(true);
    });

    it("ensures working draft venue overrides cannot leak into customer-facing published views", () => {
      const state = usePewa.getState();
      const gelatoMenu = state.menus.find((m) => m.id === "menu_gelato_lab")!;
      expect(gelatoMenu.status).toBe("published");

      const cappuccino = gelatoMenu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.sharedOfferingId === "sh_artisan_cappuccino")!;

      // Change venue override price in draft from 350 to 450 KES
      usePewa
        .getState()
        .setOfferingVenueOverride(
          gelatoMenu.id,
          "sec_gelato_coffee",
          cappuccino.id,
          "venue_gelato",
          { price: 450 },
        );

      const draftMenu = usePewa.getState().menus.find((m) => m.id === "menu_gelato_lab")!;
      expect(hasUnpublishedDraftChanges(draftMenu, usePewa.getState().sharedOfferings)).toBe(true);

      // Live customer menu reads publishedSnapshot and remains 350 KES
      const liveOffering = draftMenu
        .publishedSnapshot!.sections.flatMap((s) => s.offerings)
        .find((o) => o.id === cappuccino.id)!;
      const liveEff = getEffectiveOffering(
        liveOffering,
        "venue_gelato",
        draftMenu.publishedSnapshot!.sharedOfferingsSnapshot,
      );
      expect(liveEff.price).toBe(350);

      // Draft view sees 450 KES
      const draftOffering = draftMenu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.id === cappuccino.id)!;
      const draftEff = getEffectiveOffering(
        draftOffering,
        "venue_gelato",
        usePewa.getState().sharedOfferings,
      );
      expect(draftEff.price).toBe(450);
    });

    it("excludes Strawberry Brioche at Gelato Lab while keeping it visible at Sol Bakery", () => {
      const state = usePewa.getState();
      const gelatoMenu = state.menus.find((m) => m.id === "menu_gelato_lab")!;
      const brioche = gelatoMenu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.id === "off_strawberry_brioche_exclusion")!;
      expect(brioche).toBeDefined();

      // At Sol Bakery context, item is not hidden
      expect(isOfferingHiddenAtVenue(brioche, "venue_sol")).toBe(false);
      const solAvail = getEffectiveOfferingAvailability(brioche, "venue_sol");
      expect(solAvail.available).toBe(true);

      // At Gelato Lab, item is explicitly hidden
      expect(isOfferingHiddenAtVenue(brioche, "venue_gelato")).toBe(true);
      const gelatoAvail = getEffectiveOfferingAvailability(brioche, "venue_gelato");
      expect(gelatoAvail.available).toBe(false);
      expect(gelatoAvail.reason).toBe("venue_excluded");

      // Attempting to add excluded item at Gelato Lab fails
      usePewa.getState().clearCart();
      const addRes = usePewa.getState().addCartLine("venue_gelato", {
        menuId: gelatoMenu.id,
        offeringId: brioche.id,
        name: brioche.name,
        emoji: brioche.emoji,
        basePrice: brioche.price,
        options: [],
        quantity: 1,
        note: "",
      });
      expect(addRes).toContain("is not available at this service location");
      expect(usePewa.getState().cart).toBeNull();
    });
  });

  describe("CORR-C: Deterministic Schedules, Overnight Math & Fail-Closed Validation", () => {
    it("correctly evaluates Monday overnight schedule (22:00 to 04:00) on both sides of calendar midnight", () => {
      const overnightSchedule: OfferingSchedule = {
        enabled: true,
        name: "Late Night Service",
        startTime: "22:00",
        endTime: "04:00",
        days: ["mon"],
      };

      // Monday 21:59 -> outside schedule
      expect(isOfferingInSchedule(overnightSchedule, "mon 21:59")).toBe(false);

      // Monday 22:00 -> start of overnight schedule
      expect(isOfferingInSchedule(overnightSchedule, "mon 22:00")).toBe(true);

      // Monday 23:59 -> active overnight
      expect(isOfferingInSchedule(overnightSchedule, "mon 23:59")).toBe(true);

      // Tuesday 00:00 -> midnight crossover, overnight continues
      expect(isOfferingInSchedule(overnightSchedule, "tue 00:00")).toBe(true);

      // Tuesday 02:30 -> middle of overnight continuation
      expect(isOfferingInSchedule(overnightSchedule, "tue 02:30")).toBe(true);

      // Tuesday 03:59 -> last minute of overnight continuation
      expect(isOfferingInSchedule(overnightSchedule, "tue 03:59")).toBe(true);

      // Tuesday 04:00 -> overnight window ends
      expect(isOfferingInSchedule(overnightSchedule, "tue 04:00")).toBe(false);

      // Tuesday 10:00 -> day hours, inactive
      expect(isOfferingInSchedule(overnightSchedule, "tue 10:00")).toBe(false);

      // Sunday 23:00 -> inactive
      expect(isOfferingInSchedule(overnightSchedule, "sun 23:00")).toBe(false);
    });

    it("evaluates deterministic weekday vs weekend simulated schedule checks", () => {
      const weekendBrunchSchedule: OfferingSchedule = {
        enabled: true,
        name: "Weekend Brunch",
        startTime: "10:00",
        endTime: "15:00",
        days: ["sat", "sun"],
      };

      // Monday 11:00 -> weekday, outside schedule
      expect(isOfferingInSchedule(weekendBrunchSchedule, "mon 11:00")).toBe(false);

      // Wednesday 12:00 -> outside schedule
      expect(isOfferingInSchedule(weekendBrunchSchedule, "wed 12:00")).toBe(false);

      // Saturday 09:59 -> right before brunch
      expect(isOfferingInSchedule(weekendBrunchSchedule, "sat 09:59")).toBe(false);

      // Saturday 11:00 -> active weekend brunch
      expect(isOfferingInSchedule(weekendBrunchSchedule, "sat 11:00")).toBe(true);

      // Sunday 14:30 -> active Sunday brunch
      expect(isOfferingInSchedule(weekendBrunchSchedule, "sun 14:30")).toBe(true);

      // Sunday 15:00 -> end of brunch
      expect(isOfferingInSchedule(weekendBrunchSchedule, "sun 15:00")).toBe(false);
    });

    it("fails closed when schedule reference time or configuration is malformed", () => {
      const schedule: OfferingSchedule = {
        enabled: true,
        startTime: "09:00",
        endTime: "17:00",
        days: ["mon", "tue", "wed"],
      };

      // Invalid reference times fail validation and fail closed (return false)
      expect(isOfferingInSchedule(schedule, "25:00")).toBe(false);
      expect(isOfferingInSchedule(schedule, "invalid")).toBe(false);
      expect(isOfferingInSchedule(schedule, "mon 25:99")).toBe(false);
      expect(isOfferingInSchedule(schedule, "xyz 12:00")).toBe(false);

      // parseScheduleReferenceTime diagnostics
      const err1 = parseScheduleReferenceTime("25:00");
      expect(err1.valid).toBe(false);
      expect(err1.error).toContain("Invalid time format");

      const err2 = parseScheduleReferenceTime("xyz 12:00");
      expect(err2.valid).toBe(false);
      expect(err2.error).toContain("Unrecognized day of week");

      // Malformed schedule configuration itself fails closed
      const malformedSchedule: OfferingSchedule = {
        enabled: true,
        startTime: "invalid_time",
        endTime: "17:00",
      };
      expect(isOfferingInSchedule(malformedSchedule, "mon 10:00")).toBe(false);
    });

    it("evaluates breakfast schedule during morning vs afternoon service hours", () => {
      const schedule: OfferingSchedule = {
        enabled: true,
        name: "Breakfast Service",
        startTime: "07:00",
        endTime: "11:30",
        days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      };

      // Inside breakfast hours (09:15)
      expect(isOfferingInSchedule(schedule, "09:15")).toBe(true);

      // Right before breakfast hours (06:59)
      expect(isOfferingInSchedule(schedule, "06:59")).toBe(false);

      // Right after breakfast hours (11:30)
      expect(isOfferingInSchedule(schedule, "11:30")).toBe(false);

      // Afternoon (14:30)
      expect(isOfferingInSchedule(schedule, "14:30")).toBe(false);

      // Schedule label formatting
      const label = formatSchedule(schedule);
      expect(label).toContain("Breakfast Service");
      expect(label).toContain("07:00 – 11:30");
    });

    it("prevents ordering outside scheduled service hours via simulated time", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const state = usePewa.getState();
      const menu = state.menus[0]!;
      const venue = state.venues[0]!;
      const avoToast = menu.sections.flatMap((s) => s.offerings).find((o) => o.id === "off_avo")!;
      expect(avoToast).toBeDefined();

      // At 09:00: within breakfast hours
      usePewa.getState().setSimulatedTime("09:00");
      const morningAvail = getEffectiveOfferingAvailability(avoToast, venue.id, {
        simulatedTime: "09:00",
        venue,
      });
      expect(morningAvail.available).toBe(true);

      usePewa.getState().clearCart();
      const morningRes = usePewa.getState().addCartLine(venue.id, {
        menuId: menu.id,
        offeringId: avoToast.id,
        name: avoToast.name,
        emoji: avoToast.emoji,
        basePrice: avoToast.price,
        options: [],
        quantity: 1,
        note: "",
      });
      expect(morningRes).toBeNull();
      expect(usePewa.getState().cart?.lines.length).toBe(1);

      // Set clock to 14:00: outside breakfast hours
      usePewa.getState().setSimulatedTime("14:00");
      const afternoonAvail = getEffectiveOfferingAvailability(avoToast, venue.id, {
        simulatedTime: "14:00",
        venue,
      });
      expect(afternoonAvail.available).toBe(false);
      expect(afternoonAvail.reason).toBe("outside_schedule");
      expect(afternoonAvail.badgeText).toContain("07:00 – 11:30");

      const afternoonRes = usePewa.getState().addCartLine(venue.id, {
        menuId: menu.id,
        offeringId: avoToast.id,
        name: avoToast.name,
        emoji: avoToast.emoji,
        basePrice: avoToast.price,
        options: [],
        quantity: 1,
        note: "",
      });
      expect(afternoonRes).toContain("outside scheduled hours");
    });

    it("gives manual sold-out precedence over active schedule, and prevents enabling outside hours", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const state = usePewa.getState();
      const menu = state.menus[0]!;
      const venue = state.venues[0]!;
      const avoToast = menu.sections.flatMap((s) => s.offerings).find((o) => o.id === "off_avo")!;

      // During active schedule (09:00), item is 86'd manually
      const manualSoldOutOffering: Offering = {
        ...avoToast,
        available: false,
      };

      const morning86 = getEffectiveOfferingAvailability(manualSoldOutOffering, venue.id, {
        simulatedTime: "09:00",
        venue,
      });
      expect(morning86.available).toBe(false);
      expect(morning86.reason).toBe("sold_out_manual");
      expect(morning86.badgeText).toBe("Sold out today");

      // In afternoon (14:00), even if available is true, schedule takes precedence to prevent outside-hours ordering
      const afternoonAvailableOffering: Offering = {
        ...avoToast,
        available: true,
      };
      const afternoonCheck = getEffectiveOfferingAvailability(
        afternoonAvailableOffering,
        venue.id,
        {
          simulatedTime: "14:00",
          venue,
        },
      );
      expect(afternoonCheck.available).toBe(false);
      expect(afternoonCheck.reason).toBe("outside_schedule");
    });
  });

  describe("Scenario E: Hotel Restaurant vs Room-Service Variations", () => {
    it("correctly models restaurant steak vs room-service steak with higher price and tray charge", () => {
      usePewa.getState().loadScenario("hotel");
      const state = usePewa.getState();
      const hotelMenu = state.menus.find((m) => m.id === "menu_horizon_lounge")!;
      const roomMenu = state.menus.find((m) => m.id === "menu_horizon_room")!;
      expect(hotelMenu).toBeDefined();
      expect(roomMenu).toBeDefined();

      const restSteak = hotelMenu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.id === "off_steak")!;
      const roomSteak = roomMenu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.id === "off_steak_room")!;

      expect(restSteak).toBeDefined();
      expect(roomSteak).toBeDefined();

      // Restaurant steak: 2400 KES
      expect(restSteak.price).toBe(2400);

      // Room-service steak: 2800 KES with tray service modifier
      expect(roomSteak.price).toBe(2800);
      const trayMod = roomSteak.modifiers.find((m) => m.id === "mod_tray_service");
      expect(trayMod).toBeDefined();
      expect(trayMod?.options[0]?.priceDelta).toBe(150);

      // Add to cart with tray service modifier
      usePewa.getState().clearCart();
      const addRes = usePewa.getState().addCartLine("venue_horizon", {
        menuId: roomMenu.id,
        offeringId: roomSteak.id,
        name: roomSteak.name,
        emoji: roomSteak.emoji,
        basePrice: roomSteak.price,
        options: [
          {
            groupId: "mod_tray_service",
            optionId: "opt_standard_tray",
            name: "Standard Room Tray Setup",
            priceDelta: 150,
          },
        ],
        quantity: 1,
        note: "",
      });
      expect(addRes).toBeNull();

      const cart = usePewa.getState().cart;
      expect(cart?.lines.length).toBe(1);
      expect(lineTotal(cart!.lines[0]!)).toBe(2950); // 2800 base + 150 tray
    });
  });

  describe("Scenario H: Historical Order Continuity", () => {
    it("preserves historical order line items, prices and snapshots when catalog changes subsequently", () => {
      const state = usePewa.getState();
      const venue = state.venues.find((v) => v.id === "venue_gelato")!;
      const menu = state.menus.find((m) => m.id === "menu_gelato_lab")!;
      const gelatoCappuccino = menu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.sharedOfferingId === "sh_artisan_cappuccino")!;

      usePewa.getState().clearCart();
      usePewa.getState().addCartLine(venue.id, {
        menuId: menu.id,
        offeringId: gelatoCappuccino.id,
        name: gelatoCappuccino.name,
        emoji: gelatoCappuccino.emoji,
        basePrice: 350,
        options: [
          { groupId: "mod_milk_choice", optionId: "opt_whole", name: "Whole Milk", priceDelta: 0 },
        ],
        quantity: 2,
        note: "",
      });

      // Submit order at current effective price (350 * 2 = 700 KES)
      const res = usePewa.getState().submitOrder({
        guestName: "Alice M.",
        guestContact: "+254700000001",
        service: "Takeaway",
        note: "Counter pickup",
      });

      expect(res.id).toBeDefined();
      const submittedOrderId = res.id!;
      const submittedOrder = usePewa.getState().orders.find((o) => o.id === submittedOrderId)!;
      expect(submittedOrder).toBeDefined();
      expect(submittedOrder.total).toBe(700);
      expect(submittedOrder.lines[0]?.basePrice).toBe(350);

      // Now drastically change the shared master base price and the venue override
      usePewa.getState().upsertSharedOffering({
        ...state.sharedOfferings!.find((s) => s.id === "sh_artisan_cappuccino")!,
        price: 500,
      });

      usePewa
        .getState()
        .setOfferingVenueOverride(menu.id, "sec_gelato_coffee", gelatoCappuccino.id, venue.id, {
          price: 600,
        });

      // Verify the historical order remains completely immutable
      const storedOrder = usePewa.getState().orders.find((o) => o.id === submittedOrderId)!;
      expect(storedOrder.total).toBe(700);
      expect(storedOrder.lines[0]?.basePrice).toBe(350);
      expect(storedOrder.lines[0]?.name).toBe("Artisan Cappuccino");
    });
  });

  describe("Scenario I: Shared Catalogue Usage Tracking", () => {
    it("accurately reports menu and venue usages of shared offerings", () => {
      const state = usePewa.getState();
      const usages = getSharedOfferingUsage("sh_artisan_cappuccino", state.menus, state.venues);

      expect(usages.length).toBeGreaterThanOrEqual(2);
      expect(usages.some((u) => u.menuId === "menu_sol_bakery")).toBe(true);
      expect(usages.some((u) => u.menuId === "menu_gelato_lab")).toBe(true);

      const solUsage = usages.find((u) => u.menuId === "menu_sol_bakery")!;
      expect(solUsage.venueNames).toContain("Sol Artisan Bakery");

      const gelatoUsage = usages.find((u) => u.menuId === "menu_gelato_lab")!;
      expect(gelatoUsage.venueNames).toContain("Gelato Craft Lab");
    });
  });
});
