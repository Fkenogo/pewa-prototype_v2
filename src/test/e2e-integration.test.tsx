import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  usePewa,
  formatPrice,
  hasUnpublishedDraftChanges,
  validateModifierSelection,
  validateOfferingModifiersConfig,
} from "@/lib/pewa/store";
import {
  getVenuePublishedMenus,
  isMenuEligibleForVenue,
  PROTOTYPE_IMAGE_LIBRARY,
  isDietaryClaimTag,
  PEWA_TAG_DISCLAIMER,
} from "@/lib/pewa/taxonomy";
import {
  getEffectiveOffering,
  getEffectiveOfferingAvailability,
  isOfferingHiddenAtVenue,
  getMenuEffectiveSharedOfferings,
} from "@/lib/pewa/availability";
import { canAdmitOrder, validateCart, lineTotal, cartTotal } from "@/lib/pewa/ordering";
import { OfferingOrderForm } from "@/components/pewa/OfferingOrderForm";
import type {
  Offering,
  Menu,
  ModifierGroup,
  Venue,
  SharedOffering,
  CartLine,
} from "@/lib/pewa/types";

describe("R1-E — End-to-End Menu, Publication and Discovery Coherence", () => {
  beforeEach(() => {
    usePewa.getState().reset();
    usePewa.getState().setRole("owner");
    usePewa.getState().setSimulatedTime(undefined);
  });

  // =========================================================================
  // Scenario A — New café: Business creates menu, adds offerings, previews & publishes
  // =========================================================================
  describe("Scenario A — New café", () => {
    it("walks through new cafe setup, offering authoring, preview gating, and first publication", () => {
      // 1. Start from blank new cafe onboarding
      usePewa.getState().loadScenario("new-cafe");
      expect(usePewa.getState().organisation).toBeNull();

      // 2. Onboard new business & venue
      const menuId = usePewa.getState().completeOnboarding({
        orgName: "Artisan Bean Café",
        businessType: "Café",
        venueName: "Kilimani Flagship",
        address: "Argwings Kodhek Rd, Kilimani, Nairobi",
        deliveryOnly: false,
        currency: "KES",
        services: ["Dine-in", "Takeaway"],
        phone: "+254711000111",
        whatsapp: "+254711000111",
        email: "hello@artisanbeancafe.ke",
        menuName: "Daytime Café Menu",
      });

      const state = usePewa.getState();
      const org = state.organisation!;
      expect(org).toBeDefined();
      expect(org.name).toBe("Artisan Bean Café");
      const venue = state.venues.find((v) => v.orgId === org.id)!;
      expect(venue).toBeDefined();
      expect(venue.name).toBe("Kilimani Flagship");
      expect(menuId).toBeTruthy();

      // Add sections
      usePewa.getState().addSection(menuId, "Specialty Coffee");
      usePewa.getState().addSection(menuId, "Bakery & Bakes");
      const menuAfterSec = usePewa.getState().menus.find((m) => m.id === menuId)!;
      expect(menuAfterSec.sections).toHaveLength(2);
      const coffeeSecId = menuAfterSec.sections[0]!.id;

      // Select representative library image
      const coffeeImage = PROTOTYPE_IMAGE_LIBRARY.find((img) => img.id === "img_flat_white");
      expect(coffeeImage).toBeDefined();

      // Configure offering with modifiers
      const coffeeModifiers: ModifierGroup[] = [
        {
          id: "mod_milk",
          name: "Milk Choice",
          required: true,
          selectionType: "single",
          minSelections: 1,
          maxSelections: 1,
          options: [
            { id: "opt_whole", name: "Whole Milk", priceDelta: 0 },
            { id: "opt_oat", name: "Oat Milk", priceDelta: 80 },
            { id: "opt_almond", name: "Almond Milk", priceDelta: 80 },
          ],
        },
      ];

      usePewa.getState().upsertOffering(menuId, coffeeSecId, {
        name: "Single Origin Flat White",
        price: 350,
        description: "Double shot espresso with silky microfoam",
        available: true,
        emoji: "☕",
        image: coffeeImage?.url,
        imageSource: "library",
        tags: ["Vegetarian", "Popular"],
        modifiers: coffeeModifiers,
      });

      const draftMenu = usePewa.getState().menus.find((m) => m.id === menuId)!;
      expect(draftMenu.status).toBe("draft");
      expect(draftMenu.sections[0]!.offerings).toHaveLength(1);

      // 4. Before publication, customer-facing query returns 0 public menus
      const customerPublicMenus = getVenuePublishedMenus(
        venue,
        usePewa.getState().menus,
        usePewa.getState().venues,
        { includeProtected: false },
      );
      expect(customerPublicMenus).toHaveLength(0);

      // 5. Merchant preview is strictly isolated: authorised merchant can see it
      const isEligible = isMenuEligibleForVenue(draftMenu, venue, usePewa.getState().venues);
      expect(isEligible).toBe(true);

      // 6. Merchant publishes menu
      usePewa.getState().publishMenu(menuId);
      const publishedMenu = usePewa.getState().menus.find((m) => m.id === menuId)!;
      expect(publishedMenu.status).toBe("published");
      expect(publishedMenu.publishedSnapshot).toBeDefined();

      // 7. Customer now finds and opens the published menu
      const liveMenus = getVenuePublishedMenus(
        venue,
        usePewa.getState().menus,
        usePewa.getState().venues,
        { includeProtected: false },
      );
      expect(liveMenus).toHaveLength(1);
      expect(liveMenus[0]!.name).toBe("Daytime Café Menu");
      const liveOffering = liveMenus[0]!.sections[0]!.offerings[0]!;
      expect(liveOffering.name).toBe("Single Origin Flat White");
      expect(liveOffering.price).toBe(350);
      expect(liveOffering.image).toBe(coffeeImage?.url);
    });
  });

  // =========================================================================
  // Scenario B — Existing restaurant: Draft editing does not alter customer view until republication
  // =========================================================================
  describe("Scenario B — Existing restaurant draft-live isolation", () => {
    it("preserves live customer view while merchant edits working draft, updating only upon republication", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const state = usePewa.getState();
      const venue = state.venues.find((v) => v.id === "venue_ggc")!;
      expect(venue).toBeDefined();

      const liveMenu = getVenuePublishedMenus(
        venue,
        usePewa.getState().menus,
        usePewa.getState().venues,
        { includeProtected: false },
      )[0]!;
      expect(liveMenu).toBeDefined();

      const originalItem = liveMenu.sections[0]!.offerings[0]!;
      const originalPrice = originalItem.price;
      const originalDesc = originalItem.description;

      // Merchant modifies the offering in the working menu
      usePewa.getState().upsertOffering(liveMenu.id, liveMenu.sections[0]!.id, {
        ...originalItem,
        price: originalPrice + 150,
        description: "Updated chef description with organic ingredients",
      });

      // The working menu has unpublished draft changes
      const workingMenu = usePewa.getState().menus.find((m) => m.id === liveMenu.id)!;
      expect(hasUnpublishedDraftChanges(workingMenu, usePewa.getState().sharedOfferings)).toBe(
        true,
      );

      // Public customer query MUST still see the published snapshot with original price & description
      const customerMenu = getVenuePublishedMenus(
        venue,
        usePewa.getState().menus,
        usePewa.getState().venues,
        { includeProtected: false },
      )[0]!;
      const customerItem = customerMenu.sections[0]!.offerings.find(
        (o) => o.id === originalItem.id,
      )!;
      expect(customerItem.price).toBe(originalPrice);
      expect(customerItem.description).toBe(originalDesc);

      // Cart validation against live venue also validates against published price
      const customerCart = {
        venueId: venue.id,
        lines: [
          {
            id: "line_test_1",
            menuId: liveMenu.id,
            offeringId: originalItem.id,
            name: originalItem.name,
            emoji: originalItem.emoji,
            basePrice: originalPrice,
            options: [],
            quantity: 1,
            note: "",
          },
        ],
      };
      expect(validateCart(usePewa.getState(), customerCart)).toBeNull();

      // Now merchant publishes the draft changes
      usePewa.getState().publishMenu(liveMenu.id);
      const republishedMenu = usePewa.getState().menus.find((m) => m.id === liveMenu.id)!;
      expect(hasUnpublishedDraftChanges(republishedMenu, usePewa.getState().sharedOfferings)).toBe(
        false,
      );

      // Customer now sees the updated price and description
      const updatedCustomerMenu = getVenuePublishedMenus(
        venue,
        usePewa.getState().menus,
        usePewa.getState().venues,
        { includeProtected: false },
      )[0]!;
      const updatedCustomerItem = updatedCustomerMenu.sections[0]!.offerings.find(
        (o) => o.id === originalItem.id,
      )!;
      expect(updatedCustomerItem.price).toBe(originalPrice + 150);
      expect(updatedCustomerItem.description).toBe(
        "Updated chef description with organic ingredients",
      );
    });
  });

  // =========================================================================
  // Scenario C — Two-branch business: Shared catalogue offering with branch price overrides
  // =========================================================================
  describe("Scenario C — Two-branch business", () => {
    it("resolves shared catalogue offerings at venue-specific prices across branches", () => {
      usePewa.getState().loadScenario("multi-brand");
      const state = usePewa.getState();
      const org = state.organisation!;
      const orgVenues = state.venues.filter((v) => v.orgId === org.id);
      expect(orgVenues.length).toBeGreaterThanOrEqual(2);

      const branchA = orgVenues[0]!;
      const branchB = orgVenues[1]!;

      // 1. Create a shared master offering in the organization catalogue
      const sharedOffering: SharedOffering = {
        id: "so_angus_burger",
        orgId: org.id,
        name: "Prime Angus Beef Burger",
        price: 1200,
        description: "200g prime patty, brioche bun, aged cheddar",
        emoji: "🍔",
        tags: ["Chef's Special"],
        modifiers: [],
      };
      usePewa.getState().upsertSharedOffering(sharedOffering);

      // 2. Add shared offering to menus in both branches
      const menuA = state.menus.find((m) => isMenuEligibleForVenue(m, branchA, state.venues))!;
      const menuB = state.menus.find((m) => isMenuEligibleForVenue(m, branchB, state.venues))!;
      expect(menuA).toBeDefined();
      expect(menuB).toBeDefined();

      const offAId = usePewa
        .getState()
        .addSharedOfferingToMenu(menuA.id, menuA.sections[0]!.id, sharedOffering.id);
      const offBId = usePewa
        .getState()
        .addSharedOfferingToMenu(menuB.id, menuB.sections[0]!.id, sharedOffering.id);
      expect(offAId).toBeTruthy();
      expect(offBId).toBeTruthy();

      // 3. Configure a local price override for Branch B (premium branch at KES 1450)
      usePewa
        .getState()
        .setOfferingVenueOverride(menuB.id, menuB.sections[0]!.id, offBId, branchB.id, {
          price: 1450,
        });

      // Publish both menus to propagate to customer-facing snapshots
      usePewa.getState().publishMenu(menuA.id);
      usePewa.getState().publishMenu(menuB.id);

      const publishedMenuA = usePewa.getState().menus.find((m) => m.id === menuA.id)!;
      const publishedMenuB = usePewa.getState().menus.find((m) => m.id === menuB.id)!;

      const effectiveSharedA = getMenuEffectiveSharedOfferings(
        publishedMenuA,
        usePewa.getState().sharedOfferings,
      );
      const effectiveSharedB = getMenuEffectiveSharedOfferings(
        publishedMenuB,
        usePewa.getState().sharedOfferings,
      );

      const offA = publishedMenuA.sections[0]!.offerings.find((o) => o.id === offAId)!;
      const offB = publishedMenuB.sections[0]!.offerings.find((o) => o.id === offBId)!;

      const effA = getEffectiveOffering(offA, branchA.id, effectiveSharedA);
      const effB = getEffectiveOffering(offB, branchB.id, effectiveSharedB);

      // Branch A uses base catalogue price 1200
      expect(effA.price).toBe(1200);
      // Branch B uses local venue override 1450
      expect(effB.price).toBe(1450);

      // Verify cart calculation isolation
      const cartLineA: CartLine = {
        id: "l_a",
        menuId: menuA.id,
        offeringId: offA.id,
        name: effA.name,
        emoji: effA.emoji,
        basePrice: effA.price,
        options: [],
        quantity: 2,
        note: "",
      };
      expect(cartTotal([cartLineA])).toBe(2400);

      const cartLineB: CartLine = {
        id: "l_b",
        menuId: menuB.id,
        offeringId: offB.id,
        name: effB.name,
        emoji: effB.emoji,
        basePrice: effB.price,
        options: [],
        quantity: 2,
        note: "",
      };
      expect(cartTotal([cartLineB])).toBe(2900);
    });
  });

  // =========================================================================
  // Scenario D — Hotel: Public restaurant vs room-service scoping & guest session
  // =========================================================================
  describe("Scenario D — Hotel restaurant and in-room dining", () => {
    it("correctly scopes public menus vs protected room-service and verifies guest credentials", () => {
      usePewa.getState().loadScenario("hotel");
      const state = usePewa.getState();
      const hotelVenue = state.venues[0]!;
      expect(hotelVenue).toBeDefined();

      // Clear any pre-verified session to test unauthenticated customer entry
      usePewa.getState().clearGuestSession();

      // Unauthenticated public customer queries published menus
      const publicOnly = getVenuePublishedMenus(
        hotelVenue,
        usePewa.getState().menus,
        usePewa.getState().venues,
        { includeProtected: false },
      );
      expect(publicOnly.every((m) => !m.isProtected)).toBe(true);

      // Query with includeProtected retrieves all published hotel menus
      const allHotelMenus = getVenuePublishedMenus(
        hotelVenue,
        usePewa.getState().menus,
        usePewa.getState().venues,
        { includeProtected: true },
      );
      const protectedMenu = allHotelMenus.find((m) => m.isProtected);
      expect(protectedMenu).toBeDefined();
      expect(protectedMenu?.name).toContain("Room");

      // Verify invalid credentials reject session
      const invalidOk = usePewa.getState().verifyGuestSession(hotelVenue.id, "", "");
      expect(invalidOk).toBe(false);
      expect(usePewa.getState().guestSession?.verified).toBeFalsy();

      // Verify in-room credentials (Room 402, Smith)
      const validOk = usePewa.getState().verifyGuestSession(hotelVenue.id, "402", "Smith");
      expect(validOk).toBe(true);
      expect(usePewa.getState().guestSession?.verified).toBe(true);
      expect(usePewa.getState().guestSession?.roomNumber).toBe("402");

      // Once session is ended/cleared, protected menu is re-locked
      usePewa.getState().clearGuestSession();
      expect(usePewa.getState().guestSession).toBeNull();
    });
  });

  // =========================================================================
  // Scenario E — Bakery: Images, categorisation, dietary tags and customer search
  // =========================================================================
  describe("Scenario E — Bakery tags, imagery, and search", () => {
    it("combines product images, dietary classification, and tag filtering in customer search", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const state = usePewa.getState();
      const venue = state.venues[0]!;
      const menu = state.menus[0]!;

      // Create a dedicated Bakery section with dietary tags
      usePewa.getState().addSection(menu.id, "Artisan Bakery");
      const updatedMenu = usePewa.getState().menus.find((m) => m.id === menu.id)!;
      const bakerySec = updatedMenu.sections.find((s) => s.name === "Artisan Bakery")!;

      const pastryImage = PROTOTYPE_IMAGE_LIBRARY.find((img) => img.id === "img_croissant");
      expect(pastryImage).toBeDefined();

      usePewa.getState().upsertOffering(menu.id, bakerySec.id, {
        name: "Gluten-Free Almond Brioche",
        price: 450,
        description: "Freshly baked with almond flour and vanilla glaze",
        emoji: "🥐",
        image: pastryImage?.url,
        imageSource: "library",
        tags: ["Gluten-Free", "Vegetarian"],
        available: true,
        modifiers: [],
      });

      // Publish the bakery additions
      usePewa.getState().publishMenu(menu.id);

      // Verify dietary tag classification
      expect(isDietaryClaimTag("Gluten-Free")).toBe(true);
      expect(isDietaryClaimTag("Vegetarian")).toBe(true);
      expect(isDietaryClaimTag("Chef's Special")).toBe(false);

      // Query published offerings for Gluten-Free tag
      const liveMenu = getVenuePublishedMenus(
        venue,
        usePewa.getState().menus,
        usePewa.getState().venues,
        { includeProtected: false },
      )[0]!;
      const bakeryItem = liveMenu.sections
        .flatMap((s) => s.offerings)
        .find((o) => o.name === "Gluten-Free Almond Brioche")!;

      expect(bakeryItem).toBeDefined();
      expect(bakeryItem.tags).toContain("Gluten-Free");
      expect(bakeryItem.tags).toContain("Vegetarian");
      expect(bakeryItem.image).toBe(pastryImage?.url);
    });
  });

  // =========================================================================
  // Scenario F — Scheduled service: Breakfast hours vs afternoon, and manual sold-out precedence
  // =========================================================================
  describe("Scenario F — Scheduled service & fast sold-out precedence", () => {
    it("respects schedule time windows and gives immediate precedence to manual sold-out", () => {
      usePewa.getState().loadScenario("units-available");
      const state = usePewa.getState();
      const venue = state.venues[0]!;
      const menu = state.menus[0]!;
      const section = menu.sections[0]!;
      const offering = section.offerings[0]!;

      // 1. Configure breakfast schedule 07:00 - 11:00 every day
      usePewa.getState().setOfferingSchedule(menu.id, section.id, offering.id, {
        enabled: true,
        name: "Breakfast Hours",
        startTime: "07:00",
        endTime: "11:00",
        days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      });
      usePewa.getState().publishMenu(menu.id);

      const pubMenu = usePewa.getState().menus.find((m) => m.id === menu.id)!;
      const pubOffering = pubMenu.sections[0]!.offerings[0]!;

      // 2. Simulate morning time: 09:30 (Monday) -> In schedule
      const morningAvail = getEffectiveOfferingAvailability(pubOffering, venue.id, {
        simulatedTime: "mon 09:30",
        sharedOfferings: usePewa.getState().sharedOfferings,
        venue,
      });
      expect(morningAvail.available).toBe(true);
      expect(morningAvail.reason).toBe("available");

      // 3. Simulate afternoon time: 14:00 (Monday) -> Outside schedule
      const afternoonAvail = getEffectiveOfferingAvailability(pubOffering, venue.id, {
        simulatedTime: "mon 14:00",
        sharedOfferings: usePewa.getState().sharedOfferings,
        venue,
      });
      expect(afternoonAvail.available).toBe(false);
      expect(afternoonAvail.reason).toBe("outside_schedule");

      // 4. Fast 86-ing: Merchant marks offering sold-out (available = false)
      usePewa.getState().toggleAvailability(menu.id, section.id, offering.id);
      usePewa.getState().publishMenu(menu.id);

      const soldOutMenu = usePewa.getState().menus.find((m) => m.id === menu.id)!;
      const soldOutOffering = soldOutMenu.sections[0]!.offerings[0]!;

      // Even during breakfast hours ("mon 09:30"), manual sold-out takes precedence
      const soldOutDuringMorning = getEffectiveOfferingAvailability(soldOutOffering, venue.id, {
        simulatedTime: "mon 09:30",
        sharedOfferings: usePewa.getState().sharedOfferings,
        venue,
      });
      expect(soldOutDuringMorning.available).toBe(false);
      expect(soldOutDuringMorning.reason).toBe("sold_out_manual");
      expect(soldOutDuringMorning.badgeText).toContain("Sold out");
    });
  });

  // =========================================================================
  // Scenario G — Menu-only business: Browse & direct contact without ordering requirement
  // =========================================================================
  describe("Scenario G — Menu-only business", () => {
    it("permits full menu discovery and merchant contact when ordering capacity is 0", () => {
      usePewa.getState().loadScenario("zero-units");
      const state = usePewa.getState();
      const venue = state.venues[0]!;
      expect(venue).toBeDefined();

      // Zero units available: order admission is paused
      expect(canAdmitOrder(state.orderPolicy)).toBe(false);

      // Public menu remains published and visible
      const liveMenus = getVenuePublishedMenus(
        venue,
        usePewa.getState().menus,
        usePewa.getState().venues,
        { includeProtected: false },
      );
      expect(liveMenus.length).toBeGreaterThan(0);
      expect(liveMenus[0]!.status).toBe("published");

      // Venue contact details are complete and usable
      expect(venue.contact.phone).toBeTruthy();
      expect(venue.contact.whatsapp).toBeTruthy();

      // Attempting to add an item to cart is gracefully blocked when admission is paused
      const realOffering = liveMenus[0]!.sections[0]!.offerings[0]!;
      const addError = usePewa.getState().addCartLine(venue.id, {
        menuId: liveMenus[0]!.id,
        offeringId: realOffering.id,
        name: realOffering.name,
        emoji: realOffering.emoji,
        basePrice: realOffering.price,
        options: [],
        quantity: 1,
        note: "",
      });
      expect(addError).toContain("paused");
    });
  });

  // =========================================================================
  // Scenario H — Optional ordering: Modifiers, authoritative price & merchant acceptance
  // =========================================================================
  describe("Scenario H — Optional ordering & merchant decision cycle", () => {
    it("collects required modifiers, validates authoritative line price, submits request, and merchant accepts", () => {
      usePewa.getState().loadScenario("units-available");
      const state = usePewa.getState();
      const venue = state.venues[0]!;
      const menu = state.menus[0]!;
      const section = menu.sections[0]!;

      // Add structured offering with required modifier
      const coffeeItem: Offering = {
        id: "off_ordered_latte",
        name: "Vanilla Caffè Latte",
        description: "Espresso with steamed milk and Madagascar vanilla",
        tags: ["Hot", "Vegetarian"],
        price: 350,
        emoji: "☕",
        available: true,
        modifiers: [
          {
            id: "grp_size",
            name: "Cup Size",
            required: true,
            selectionType: "single",
            minSelections: 1,
            maxSelections: 1,
            options: [
              { id: "opt_reg", name: "Regular 250ml", priceDelta: 0 },
              { id: "opt_lg", name: "Large 350ml", priceDelta: 100 },
            ],
          },
          {
            id: "grp_syrup",
            name: "Syrup Add-on",
            required: false,
            selectionType: "multiple",
            minSelections: 0,
            maxSelections: 2,
            options: [
              { id: "opt_vanilla", name: "Sugar-Free Vanilla", priceDelta: 50 },
              { id: "opt_caramel", name: "Salted Caramel", priceDelta: 50 },
            ],
          },
        ],
      };

      usePewa.getState().upsertOffering(menu.id, section.id, coffeeItem);
      usePewa.getState().publishMenu(menu.id);

      // Customer adds item to cart: Large (+100) + Vanilla (+50) = 500 each * 2 = 1000
      const initialUnits = usePewa.getState().orderPolicy.included;
      usePewa.getState().clearCart();

      const addError = usePewa.getState().addCartLine(venue.id, {
        menuId: menu.id,
        offeringId: coffeeItem.id,
        name: coffeeItem.name,
        emoji: coffeeItem.emoji,
        basePrice: coffeeItem.price,
        options: [
          { groupId: "grp_size", optionId: "opt_lg", name: "Large 350ml", priceDelta: 100 },
          {
            groupId: "grp_syrup",
            optionId: "opt_vanilla",
            name: "Sugar-Free Vanilla",
            priceDelta: 50,
          },
        ],
        quantity: 2,
        note: "Extra hot please",
      });
      expect(addError).toBeNull();

      const cart = usePewa.getState().cart!;
      expect(cart.lines).toHaveLength(1);
      expect(lineTotal(cart.lines[0]!)).toBe(1000);
      expect(cartTotal(cart.lines)).toBe(1000);

      // Customer submits order request
      const orderSubmission = usePewa.getState().submitOrder({
        guestName: "Alice Wanjiru",
        guestContact: "+254700123456",
        service: "Dine-in",
        note: "Table 4",
      });

      expect(orderSubmission.error).toBeUndefined();
      expect(orderSubmission.id).toBeTruthy();
      const orderId = orderSubmission.id!;

      // Verify order is pending and units NOT yet deducted (request phase)
      const pendingOrder = usePewa.getState().orders.find((o) => o.id === orderId)!;
      expect(pendingOrder.status).toBe("pending");
      expect(usePewa.getState().orderPolicy.included).toBe(initialUnits);

      // Merchant accepts the order request
      const acceptResult = usePewa.getState().acceptOrder(orderId);
      expect(acceptResult).toBe(true);

      const acceptedOrder = usePewa.getState().orders.find((o) => o.id === orderId)!;
      expect(acceptedOrder.status).toBe("accepted");
      // Exactly 1 unit deducted on acceptance
      expect(usePewa.getState().orderPolicy.included).toBe(initialUnits - 1);

      // Idempotent acceptance check: repeated accept does not deduct extra units
      const repeatAccept = usePewa.getState().acceptOrder(orderId);
      expect(repeatAccept).toBe(false);
      expect(usePewa.getState().orderPolicy.included).toBe(initialUnits - 1);
    });
  });

  // =========================================================================
  // Scenario I — Protected and archived menus: Historical continuity and access control
  // =========================================================================
  describe("Scenario I — Protected and archived menus", () => {
    it("maintains historical order snapshot continuity for archived menus and protects in-room access", () => {
      usePewa.getState().loadScenario("multi-brand");
      const state = usePewa.getState();
      const menu = state.menus[0]!;
      const venue = state.venues[0]!;

      // 1. Add item to cart first, then submit order
      const offering = menu.sections[0]!.offerings[0]!;
      usePewa.getState().addCartLine(venue.id, {
        menuId: menu.id,
        offeringId: offering.id,
        name: offering.name,
        emoji: offering.emoji,
        basePrice: offering.price,
        options: [],
        quantity: 1,
        note: "",
      });

      const orderResult = usePewa.getState().submitOrder({
        guestName: "Historical Guest",
        guestContact: "+254722000000",
        service: "Dine-in",
        note: "",
      });
      expect(orderResult.id).toBeTruthy();
      const order = usePewa.getState().orders.find((o) => o.id === orderResult.id)!;
      expect(order).toBeDefined();

      // 2. Archive the menu
      usePewa.getState().setMenuStatus(menu.id, "archived");
      const archivedMenu = usePewa.getState().menus.find((m) => m.id === menu.id)!;
      expect(archivedMenu.status).toBe("archived");

      // Public customer query no longer exposes archived menu
      const publicLive = getVenuePublishedMenus(
        venue,
        usePewa.getState().menus,
        usePewa.getState().venues,
        { includeProtected: false },
      );
      expect(publicLive.some((m) => m.id === menu.id)).toBe(false);

      // Historical order snapshot remains intact and accessible
      const persistentOrder = usePewa.getState().orders.find((o) => o.id === order.id)!;
      expect(persistentOrder.lines).toEqual(order.lines);
      expect(persistentOrder.venueName).toBe(order.venueName);
    });
  });

  // =========================================================================
  // Scenario J — Mobile usability & DOM simulation: Form validation & touch interaction
  // =========================================================================
  describe("Scenario J — Mobile usability & interactive component verification", () => {
    it("renders OfferingOrderForm, verifies interactive modifier selection, min/max enforcement, and validation alerts", () => {
      const venue = usePewa.getState().venues[0]!;
      const menu = usePewa.getState().menus[0]!;

      const testOffering: Offering = {
        id: "off_mobile_test",
        name: "Signature Gourmet Meal",
        description: "Chef's gourmet special with fresh vegetables",
        tags: ["Chef's Special"],
        price: 800,
        emoji: "🍲",
        available: true,
        modifiers: [
          {
            id: "grp_temp",
            name: "Spice Level",
            required: true,
            selectionType: "single",
            minSelections: 1,
            maxSelections: 1,
            options: [
              { id: "opt_mild", name: "Mild", priceDelta: 0 },
              { id: "opt_spicy", name: "Extra Spicy", priceDelta: 50 },
            ],
          },
          {
            id: "grp_sides",
            name: "Choice of Side",
            required: false,
            selectionType: "multiple",
            minSelections: 0,
            maxSelections: 2,
            options: [
              { id: "opt_fries", name: "Potato Wedges", priceDelta: 150 },
              { id: "opt_salad", name: "Green Salad", priceDelta: 100 },
              { id: "opt_ugali", name: "Brown Ugali", priceDelta: 80 },
            ],
          },
        ],
      };

      // Add and publish
      usePewa.getState().upsertOffering(menu.id, menu.sections[0]!.id, testOffering);
      usePewa.getState().publishMenu(menu.id);

      let addedFired = false;
      const { unmount } = render(
        <OfferingOrderForm
          offering={testOffering}
          venue={venue}
          menuId={menu.id}
          onAdded={() => {
            addedFired = true;
          }}
        />,
      );

      // 1. Initial State: Required group "Spice Level" is not yet chosen.
      // Button displays disabled state with validation instruction
      const submitBtn = screen.getByRole("button", { name: /spice level/i });
      expect(submitBtn).toBeDisabled();

      // 2. Tap radio button "Extra Spicy"
      const spicyRadio = screen.getByLabelText(/extra spicy/i);
      fireEvent.click(spicyRadio);

      // Now requirement is met! Submit button is enabled
      const enabledBtn = screen.getByRole("button", { name: /add to cart/i });
      expect(enabledBtn).not.toBeDisabled();

      // 3. Select 2 sides (max allowed)
      const wedgesCheck = screen.getByLabelText(/potato wedges/i);
      const saladCheck = screen.getByLabelText(/green salad/i);
      fireEvent.click(wedgesCheck);
      fireEvent.click(saladCheck);

      // Verify button is still enabled
      expect(screen.getByRole("button", { name: /add to cart/i })).not.toBeDisabled();

      // 4. Try selecting a third side: should be disabled or capped by maxSelections
      const thirdSide = screen.getByLabelText(/brown ugali/i);
      expect(thirdSide).toBeDisabled();

      // 5. Submit to cart
      fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
      expect(addedFired).toBe(true);

      const cart = usePewa.getState().cart;
      expect(cart?.lines).toHaveLength(1);
      // 800 + 50 + 150 + 100 = 1100
      expect(lineTotal(cart!.lines[0]!)).toBe(1100);

      unmount();
    });
  });
});
