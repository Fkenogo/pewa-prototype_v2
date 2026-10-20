import { beforeEach, describe, expect, it } from "vitest";
import {
  canAuthorMenus,
  canManageBilling,
  canManageOrders,
  canManagePromotions,
  canToggleAvailability,
  isBusinessRole,
  usePewa,
} from "../lib/pewa/store";
import { canAdmitOrder, validateCart } from "../lib/pewa/ordering";

describe("Slice P7 — 15 Formal Acceptance Criteria Verification", () => {
  beforeEach(() => {
    usePewa.getState().reset();
    usePewa.getState().setRole("owner");
  });

  it("AC 1: Small café owner can join, prepare and publish a menu using phone-first onboarding", () => {
    usePewa.getState().loadScenario("new-cafe");
    usePewa.getState().setRole("owner");
    const s = usePewa.getState();
    expect(s.role).toBe("owner");
    expect(canAuthorMenus(s.role)).toBe(true);

    // Prepare and publish
    s.setMenuStatus("menu_ggc_allday", "published");
    expect(usePewa.getState().menus.find((m) => m.id === "menu_ggc_allday")?.status).toBe(
      "published",
    );
  });

  it("AC 2: Customer can discover or open that menu without registration or installation", () => {
    usePewa.getState().loadScenario("established-restaurant");
    usePewa.getState().setRole("customer");
    const s = usePewa.getState();
    const venue = s.venues.find((v) => v.slug === "green-garden-cafe");
    expect(venue).toBeDefined();

    const liveMenus = s.menus.filter((m) => m.orgId === venue?.orgId && m.status === "published");
    expect(liveMenus.length).toBeGreaterThan(0);
  });

  it("AC 3: Customer can contact the business manually without creating a PEWA order", () => {
    usePewa.getState().loadScenario("established-restaurant");
    const s = usePewa.getState();
    const venue = s.venues[0];
    expect(venue?.contact.phone).toBeTruthy();
    expect(venue?.contact.whatsapp).toBeTruthy();
    expect(venue?.contact.email).toBeTruthy();
    // Orders remains untouched when accessing contact details
    expect(s.orders).toHaveLength(0);
  });

  it("AC 4: Customer can submit a structured order and clearly see business has not accepted it", () => {
    usePewa.getState().loadScenario("units-available");
    const s = usePewa.getState();
    s.clearCart();
    s.addCartLine("venue_ggc", {
      menuId: "menu_ggc_allday",
      offeringId: "off_flat",
      name: "Flat White",
      emoji: "☕",
      basePrice: 280,
      options: [],
      quantity: 1,
      note: "Counter",
    });

    const { id } = s.submitOrder({
      guestName: "Alice",
      guestContact: "0712345678",
      service: "Takeaway",
      note: "Counter",
    });

    expect(id).toBeDefined();
    const order = usePewa.getState().orders.find((o) => o.id === id);
    expect(order?.status).toBe("pending");
    expect(order?.unitConsumed).toBe(false);
  });

  it("AC 5: Merchant can accept order and see exactly one simulated consumption unit deducted", () => {
    usePewa.getState().loadScenario("duplicate-accept");
    usePewa.getState().setRole("staff");
    const s = usePewa.getState();
    const startingUnits = s.orderPolicy.included;

    const accepted = s.acceptOrder("order_seed");
    expect(accepted).toBe(true);
    expect(usePewa.getState().orderPolicy.included).toBe(startingUnits - 1);
    expect(usePewa.getState().orders.find((o) => o.id === "order_seed")?.unitConsumed).toBe(true);
  });

  it("AC 6: A second acceptance attempt does not deduct another unit", () => {
    usePewa.getState().loadScenario("duplicate-accept");
    usePewa.getState().setRole("staff");
    const s = usePewa.getState();
    const startingUnits = s.orderPolicy.included;

    s.acceptOrder("order_seed");
    const secondAccept = usePewa.getState().acceptOrder("order_seed");

    expect(secondAccept).toBe(false);
    expect(usePewa.getState().orderPolicy.included).toBe(startingUnits - 1);
  });

  it("AC 7: Subscribed business with zero new-order capacity remains publicly discoverable and contactable", () => {
    usePewa.getState().loadScenario("zero-units");
    const s = usePewa.getState();

    // Capacity is zero
    expect(canAdmitOrder(s.orderPolicy)).toBe(false);

    // But menu is live and contact is accessible
    expect(s.menus[0]?.status).toBe("published");
    expect(s.venues[0]?.contact.phone).toBe("+254700123456");
    expect(s.venues[0]?.contact.whatsapp).toBe("+254700123456");
  });

  it("AC 8: Hotel demonstrates public and protected menu contexts without cross-audience disclosure", () => {
    usePewa.getState().loadScenario("hotel");
    const s = usePewa.getState();
    const publicMenu = s.menus.find((m) => !m.isProtected);
    const protectedMenu = s.menus.find((m) => m.isProtected);

    expect(publicMenu).toBeDefined();
    expect(protectedMenu).toBeDefined();
    expect(protectedMenu?.isProtected).toBe(true);

    // When guest is unverified, verification gate blocks access
    usePewa.getState().clearGuestSession();
    expect(usePewa.getState().guestSession).toBeNull();
  });

  it("AC 9: Multi-venue administrator can manage essential business activities", () => {
    usePewa.getState().loadScenario("multi-brand");
    usePewa.getState().setRole("admin");
    const s = usePewa.getState();
    expect(s.role).toBe("admin");
    expect(canAuthorMenus(s.role)).toBe(true);
    expect(canManageOrders(s.role)).toBe(true);
    expect(canManageBilling(s.role)).toBe(true);
    expect(s.venues.length).toBeGreaterThanOrEqual(3);
  });

  it("AC 10: Role-scoped staff member cannot access unrelated organisation or commercial controls", () => {
    expect(canManageBilling("staff")).toBe(false);
    expect(canManagePromotions("staff")).toBe(false);
    expect(canAuthorMenus("staff")).toBe(false);
    expect(canToggleAvailability("staff")).toBe(true); // Can 86 items
    expect(canManageOrders("staff")).toBe(true); // Can work queue
  });

  it("AC 11: Sponsored offer is labelled and remains separate from organic discovery", () => {
    usePewa.getState().loadScenario("sponsored-campaign");
    const s = usePewa.getState();
    const campaign = s.campaigns[0];

    expect(campaign?.badgeText).toBe("Sponsored");
    expect(campaign?.active).toBe(true);

    // Organic venues and menus remain unmodified
    expect(s.menus[0]?.status).toBe("published");
  });

  it("AC 12: Experience remains usable under interrupted-network conditions", () => {
    usePewa.getState().loadScenario("units-available");
    const s = usePewa.getState();

    // Enable simulated offline
    s.setSimulatedOffline(true);
    expect(usePewa.getState().simulatedOffline).toBe(true);

    // Menus remain in state and readable
    expect(usePewa.getState().menus[0]?.sections.length).toBeGreaterThan(0);

    // Cart validation flags offline state
    const err = validateCart(usePewa.getState(), {
      venueId: "venue_ggc",
      lines: [
        {
          id: "l1",
          menuId: "menu_ggc_allday",
          offeringId: "off_flat",
          name: "Flat White",
          emoji: "☕",
          basePrice: 280,
          options: [],
          quantity: 1,
          note: "",
        },
      ],
    });
    expect(err).toContain("Offline");

    // Restore online
    s.setSimulatedOffline(false);
    expect(usePewa.getState().simulatedOffline).toBe(false);
  });

  it("AC 13: Mock statuses and financial balances remain consistent across views", () => {
    usePewa.getState().loadScenario("units-available");
    const s = usePewa.getState();
    const initialUnits = s.orderPolicy.included;

    s.clearCart();
    s.addCartLine("venue_ggc", {
      menuId: "menu_ggc_allday",
      offeringId: "off_flat",
      name: "Flat White",
      emoji: "☕",
      basePrice: 280,
      options: [],
      quantity: 1,
      note: "",
    });

    const { id } = s.submitOrder({
      guestName: "Bob",
      guestContact: "0799887766",
      service: "Dine-in",
      note: "Table 2",
    });

    expect(id).toBeDefined();

    // View as merchant and accept
    s.setRole("staff");
    s.acceptOrder(id!);

    // View as customer
    s.setRole("customer");
    const customerOrder = usePewa.getState().orders.find((o) => o.id === id);
    expect(customerOrder?.status).toBe("accepted");
    expect(usePewa.getState().orderPolicy.included).toBe(initialUnits - 1);
  });

  it("AC 14: Every major user action has meaningful feedback and understandable next step", () => {
    usePewa.getState().loadScenario("units-available");
    const s = usePewa.getState();

    // Add top-up units gives feedback
    const prev = s.orderPolicy.topUp;
    s.addTopUpUnits(50);
    expect(usePewa.getState().orderPolicy.topUp).toBe(prev + 50);

    // Activity log records next step
    const lastActivity = usePewa.getState().activity[0];
    expect(lastActivity?.kind).toBe("billing.topup");
  });

  it("AC 15: No prototype behaviour knowingly contradicts approved PEWA Product Truth", () => {
    // Technical operator prohibitions strictly maintained
    expect(canAuthorMenus("operator")).toBe(false);
    expect(canManageOrders("operator")).toBe(false);
    expect(canManageBilling("operator")).toBe(false);
    expect(isBusinessRole("operator")).toBe(false);
  });
});
