import { describe, it, expect, beforeEach } from "vitest";
import { usePewa, formatPrice, hasUnpublishedDraftChanges } from "@/lib/pewa/store";
import {
  isOfferingHiddenAtVenue,
  getEffectiveOffering,
  isOfferingInSchedule,
  getEffectiveOfferingAvailability,
  formatSchedule,
  getSharedOfferingUsage,
} from "@/lib/pewa/availability";
import { lineTotal, cartTotal } from "@/lib/pewa/ordering";
import type { Offering, Menu, SharedOffering } from "@/lib/pewa/types";

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

      const section = menu.sections[0];
      const offering = section.offerings[0];
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
      expect(hasUnpublishedDraftChanges(updatedMenu)).toBe(true);

      // Now publish changes
      usePewa.getState().publishMenu(menu.id);
      const publishedMenu = usePewa.getState().menus.find((m) => m.id === menu.id)!;
      expect(hasUnpublishedDraftChanges(publishedMenu)).toBe(false);

      // 1-tap Fast 86-ing (sold out toggle)
      usePewa.getState().toggleAvailability(menu.id, section.id, offering.id);

      const after86Menu = usePewa.getState().menus.find((m) => m.id === menu.id)!;
      expect(after86Menu.publishedSnapshot).toBeDefined();
      const liveOffering = after86Menu.publishedSnapshot!.sections[0].offerings.find(
        (o) => o.id === offering.id,
      )!;
      expect(liveOffering.available).toBe(false);

      // Crucial R1-D Product Truth: fast sold-out toggle updates live menu without dirtying draft state
      expect(hasUnpublishedDraftChanges(after86Menu)).toBe(false);

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
      expect(usePewa.getState().cart.lines[0].basePrice).toBe(280);

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
      expect(usePewa.getState().cart.lines[0].basePrice).toBe(350);
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

      // Sol Bakery (which had no local description override) receives updated description
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

  describe("Scenario D: Local Venue Exclusion", () => {
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
      expect(trayMod?.options[0].priceDelta).toBe(150);

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
      expect(cart.lines.length).toBe(1);
      expect(lineTotal(cart.lines[0])).toBe(2950); // 2800 base + 150 tray
    });
  });

  describe("Scenario F: Time-of-Day and Day-of-Week Scheduling", () => {
    it("evaluates breakfast schedule during morning vs afternoon service hours", () => {
      const schedule = {
        enabled: true,
        name: "Breakfast Service",
        startTime: "07:00",
        endTime: "11:30",
        days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const,
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
      const menu = state.menus[0];
      const avoToast = menu.sections.flatMap((s) => s.offerings).find((o) => o.id === "off_avo")!;
      expect(avoToast).toBeDefined();

      // At 09:00: within breakfast hours
      usePewa.getState().setSimulatedTime("09:00");
      const morningAvail = getEffectiveOfferingAvailability(avoToast, state.venues[0].id, {
        simulatedTime: "09:00",
      });
      expect(morningAvail.available).toBe(true);

      usePewa.getState().clearCart();
      const morningRes = usePewa.getState().addCartLine(state.venues[0].id, {
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
      expect(usePewa.getState().cart.lines.length).toBe(1);

      // Set clock to 14:00: outside breakfast hours
      usePewa.getState().setSimulatedTime("14:00");
      const afternoonAvail = getEffectiveOfferingAvailability(avoToast, state.venues[0].id, {
        simulatedTime: "14:00",
      });
      expect(afternoonAvail.available).toBe(false);
      expect(afternoonAvail.reason).toBe("outside_schedule");
      expect(afternoonAvail.badgeText).toContain("07:00 – 11:30");

      const afternoonRes = usePewa.getState().addCartLine(state.venues[0].id, {
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
  });

  describe("Scenario G: Manual Sold-Out vs Schedule Precedence", () => {
    it("gives manual sold-out precedence over active schedule, and prevents enabling outside hours", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const state = usePewa.getState();
      const menu = state.menus[0];
      const avoToast = menu.sections.flatMap((s) => s.offerings).find((o) => o.id === "off_avo")!;

      // During active schedule (09:00), item is 86'd manually
      const manualSoldOutOffering: Offering = {
        ...avoToast,
        available: false,
      };

      const morning86 = getEffectiveOfferingAvailability(
        manualSoldOutOffering,
        state.venues[0].id,
        {
          simulatedTime: "09:00",
        },
      );
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
        state.venues[0].id,
        {
          simulatedTime: "14:00",
        },
      );
      expect(afternoonCheck.available).toBe(false);
      expect(afternoonCheck.reason).toBe("outside_schedule");
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
      expect(submittedOrder.lines[0].basePrice).toBe(350);

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
      expect(storedOrder.lines[0].basePrice).toBe(350);
      expect(storedOrder.lines[0].name).toBe("Artisan Cappuccino");
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
