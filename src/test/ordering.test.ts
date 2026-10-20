import { beforeEach, describe, expect, it } from "vitest";
import { usePewa, canManageBilling, canManagePromotions, canViewActivity } from "@/lib/pewa/store";
import { validateCart } from "@/lib/pewa/ordering";

const customer = {
  guestName: "Guest",
  guestContact: "0700000000",
  service: "Takeaway",
  note: "Counter pickup",
};
function addItem() {
  return usePewa.getState().addCartLine("venue_ggc", {
    menuId: "menu_ggc_allday",
    offeringId: "off_flat",
    name: "Flat White",
    emoji: "☕",
    basePrice: 280,
    options: [{ groupId: "mod_milk", optionId: "o2", name: "Oat", priceDelta: 50 }],
    quantity: 2,
    note: "Warm",
  });
}
function submit() {
  addItem();
  const result = usePewa.getState().submitOrder(customer);
  if (!result.id) throw new Error(result.error);
  return result.id;
}
describe("Guest ordering rules", () => {
  beforeEach(() => {
    usePewa.getState().loadScenario("units-available");
    usePewa.getState().setRole("owner");
  });
  it("submission is pending and consumes zero units", () => {
    const id = submit();
    expect(usePewa.getState().orders.find((o) => o.id === id)?.status).toBe("pending");
    expect(usePewa.getState().orderPolicy.included).toBe(142);
  });
  it("accept consumes exactly one unit even when repeated", () => {
    const id = submit();
    expect(usePewa.getState().acceptOrder(id)).toBe(true);
    expect(usePewa.getState().acceptOrder(id)).toBe(false);
    expect(usePewa.getState().orderPolicy.included).toBe(141);
  });
  it("ready consumes no extra unit and cannot precede acceptance", () => {
    const id = submit();
    expect(usePewa.getState().markOrderReady(id)).toBe(false);
    usePewa.getState().acceptOrder(id);
    expect(usePewa.getState().markOrderReady(id)).toBe(true);
    expect(usePewa.getState().orderPolicy.included).toBe(141);
  });
  it("withdrawal before acceptance wins and consumes zero units", () => {
    const id = submit();
    expect(usePewa.getState().withdrawOrder(id)).toBe(true);
    expect(usePewa.getState().acceptOrder(id)).toBe(false);
    expect(usePewa.getState().orderPolicy.included).toBe(142);
  });
  it("withdrawal is forbidden after acceptance", () => {
    const id = submit();
    usePewa.getState().acceptOrder(id);
    expect(usePewa.getState().withdrawOrder(id)).toBe(false);
    expect(usePewa.getState().orders[0]?.status).toBe("accepted");
  });
  it("decline consumes zero units", () => {
    const id = submit();
    expect(usePewa.getState().declineOrder(id, "Kitchen at capacity")).toBe(true);
    expect(usePewa.getState().orderPolicy.included).toBe(142);
  });
  it("zero units pause new requests without hiding published menus or contact", () => {
    usePewa.getState().loadScenario("zero-units");
    expect(addItem()).toContain("paused");
    expect(usePewa.getState().menus[0]?.status).toBe("published");
    expect(usePewa.getState().venues[0]?.contact.phone).toBe("+254700123456");
  });
  it("expired beyond grace pauses new requests", () => {
    usePewa.getState().loadScenario("expired-beyond-grace");
    expect(addItem()).toContain("paused");
  });
  it("an admitted pending request can use one of at most ten overdraft units", () => {
    usePewa.getState().loadScenario("admitted-pending");
    expect(usePewa.getState().acceptOrder("order_seed")).toBe(true);
    expect(usePewa.getState().orderPolicy.overdraftUsed).toBe(1);
    usePewa.getState().loadScenario("admitted-pending");
    usePewa.setState({ orderPolicy: { included: 0, topUp: 0, overdraftUsed: 10, expired: false } });
    expect(usePewa.getState().acceptOrder("order_seed")).toBe(false);
    expect(usePewa.getState().orderPolicy.overdraftUsed).toBe(10);
  });
  it("operators cannot accept, decline or set kitchen status", () => {
    const id = submit();
    usePewa.getState().setRole("operator");
    expect(usePewa.getState().acceptOrder(id)).toBe(false);
    expect(usePewa.getState().declineOrder(id, "No")).toBe(false);
    usePewa.setState({
      orders: usePewa.getState().orders.map((o) => ({ ...o, status: "accepted" })),
    });
    expect(usePewa.getState().markOrderReady(id)).toBe(false);
  });
  it("staff can accept and mark ready", () => {
    const id = submit();
    usePewa.getState().setRole("staff");
    expect(usePewa.getState().acceptOrder(id)).toBe(true);
    expect(usePewa.getState().markOrderReady(id)).toBe(true);
  });
  it("order snapshot retains submitted prices, modifiers, quantities and total", () => {
    const id = submit();
    usePewa.setState({ menus: [] });
    const order = usePewa.getState().orders.find((o) => o.id === id);
    expect(order?.total).toBe(660);
    expect(order?.lines[0]?.options[0]?.priceDelta).toBe(50);
    expect(order?.lines[0]?.quantity).toBe(2);
    expect(order?.lines[0]?.basePrice).toBe(280);
  });
  it("changed prices block submission until customer reviews a fresh selection", () => {
    usePewa.getState().loadScenario("outdated-price");
    expect(usePewa.getState().submitOrder(customer).error).toContain("price has changed");
    expect(usePewa.getState().orders).toHaveLength(0);
  });
  it("sold out items in a cart block submission", () => {
    addItem();
    usePewa.getState().toggleAvailability("menu_ggc_allday", "sec_coffee", "off_flat");
    expect(validateCart(usePewa.getState(), usePewa.getState().cart)).toContain(
      "no longer available",
    );
    expect(usePewa.getState().submitOrder(customer).id).toBeUndefined();
  });
  it("requests do not require WhatsApp or a customer account", () => {
    usePewa.getState().loadScenario("channel-unavailable");
    usePewa.getState().setRole("customer");
    expect(submit()).toMatch(/^order_/);
  });
  it("favourites toggle and recents are deduplicated", () => {
    usePewa.getState().toggleFavourite("venue_ggc");
    expect(usePewa.getState().favourites).toEqual(["venue_ggc"]);
    usePewa.getState().toggleFavourite("venue_ggc");
    expect(usePewa.getState().favourites).toEqual([]);
    usePewa.getState().visitVenue("venue_ggc");
    usePewa.getState().visitVenue("venue_ggc");
    expect(usePewa.getState().recents).toEqual(["venue_ggc"]);
  });
});

describe("Slice P4: Subscription entitlements and consumption mechanics", () => {
  beforeEach(() => {
    usePewa.getState().loadScenario("units-available");
    usePewa.getState().setRole("owner");
  });

  it("priority deduction: consumes included units first", () => {
    usePewa.setState({
      orderPolicy: {
        included: 5,
        includedMax: 200,
        topUp: 10,
        overdraftUsed: 0,
        overdraftMax: 10,
        expired: false,
        cycleRenewsAt: "2026-11-19T00:00:00.000Z",
        tier: "Base Monthly Tier",
      },
    });
    const id = submit();
    expect(usePewa.getState().acceptOrder(id)).toBe(true);
    expect(usePewa.getState().orderPolicy.included).toBe(4);
    expect(usePewa.getState().orderPolicy.topUp).toBe(10);
    expect(usePewa.getState().orderPolicy.overdraftUsed).toBe(0);
  });

  it("priority deduction: consumes top-up units when included units are zero", () => {
    usePewa.setState({
      orderPolicy: {
        included: 0,
        includedMax: 200,
        topUp: 10,
        overdraftUsed: 0,
        overdraftMax: 10,
        expired: false,
        cycleRenewsAt: "2026-11-19T00:00:00.000Z",
        tier: "Base Monthly Tier",
      },
    });
    const id = submit();
    expect(usePewa.getState().acceptOrder(id)).toBe(true);
    expect(usePewa.getState().orderPolicy.included).toBe(0);
    expect(usePewa.getState().orderPolicy.topUp).toBe(9);
    expect(usePewa.getState().orderPolicy.overdraftUsed).toBe(0);
  });

  it("purchasing top-up units replenishes zero-unit capacity and unpauses orders", () => {
    usePewa.getState().loadScenario("zero-units");
    expect(addItem()).toContain("paused");
    usePewa.getState().addTopUpUnits(50);
    expect(usePewa.getState().orderPolicy.topUp).toBe(50);
    expect(addItem()).toBeNull();
    const id = submit();
    expect(usePewa.getState().acceptOrder(id)).toBe(true);
    expect(usePewa.getState().orderPolicy.topUp).toBe(49);
  });

  it("billing cycle renewal restores 200 included units while carrying forward top-ups", () => {
    usePewa.setState({
      orderPolicy: {
        included: 15,
        includedMax: 200,
        topUp: 75,
        overdraftUsed: 2,
        overdraftMax: 10,
        expired: true,
        cycleRenewsAt: "2026-10-19T00:00:00.000Z",
        tier: "Base Monthly Tier",
      },
    });
    usePewa.getState().renewBillingCycle();
    const policy = usePewa.getState().orderPolicy;
    expect(policy.included).toBe(200);
    expect(policy.topUp).toBe(75);
    expect(policy.overdraftUsed).toBe(0);
    expect(policy.expired).toBe(false);
  });

  it("role-based security: staff and operators cannot manage billing", () => {
    expect(canManageBilling("owner")).toBe(true);
    expect(canManageBilling("admin")).toBe(true);
    expect(canManageBilling("manager")).toBe(false);
    expect(canManageBilling("staff")).toBe(false);
    expect(canManageBilling("customer")).toBe(false);
    expect(canManageBilling("operator")).toBe(false);
  });
});

describe("Slice P5: Advanced experiences (Hotel, Sponsored offers & RBAC)", () => {
  it("hotel guest protection: unverified guest has null guestSession and access denied scenario", () => {
    usePewa.getState().loadScenario("protected-denied");
    const state = usePewa.getState();
    expect(state.guestSession).toBeNull();
    const protectedMenu = state.menus.find((m) => m.isProtected);
    expect(protectedMenu).toBeDefined();
    expect(protectedMenu?.name).toContain("In-Room Dining");
  });

  it("hotel guest verification: valid credentials verify room session", () => {
    usePewa.getState().loadScenario("protected-denied");
    expect(usePewa.getState().verifyGuestSession("venue_horizon", "402", "Smith")).toBe(true);
    const session = usePewa.getState().guestSession;
    expect(session?.verified).toBe(true);
    expect(session?.roomNumber).toBe("402");
    expect(session?.lastName).toBe("Smith");

    usePewa.getState().clearGuestSession();
    expect(usePewa.getState().guestSession).toBeNull();
  });

  it("hotel guest verification: invalid credentials fail and leave session null", () => {
    usePewa.getState().loadScenario("protected-denied");
    expect(usePewa.getState().verifyGuestSession("venue_horizon", "999", "x")).toBe(false);
    expect(usePewa.getState().guestSession).toBeNull();
  });

  it("sponsored offers: campaign tracking increments impressions and clicks", () => {
    usePewa.getState().loadScenario("sponsored-campaign");
    const camp = usePewa.getState().campaigns[0];
    expect(camp?.active).toBe(true);
    const initialImpressions = camp?.impressions ?? 0;
    const initialClicks = camp?.clicks ?? 0;

    usePewa.getState().recordPromotionImpression(camp!.id);
    expect(usePewa.getState().campaigns[0]?.impressions).toBe(initialImpressions + 1);

    usePewa.getState().recordPromotionClick(camp!.id);
    expect(usePewa.getState().campaigns[0]?.clicks).toBe(initialClicks + 1);
  });

  it("multi-brand scenario loads multiple venues under one organisation", () => {
    usePewa.getState().loadScenario("multi-brand");
    const state = usePewa.getState();
    expect(state.venues.length).toBe(3);
    expect(state.venues.map((v) => v.name)).toEqual(
      expect.arrayContaining(["Green Garden Café", "Sol Artisan Bakery", "Gelato Craft Lab"]),
    );
  });

  it("role-based security: promotions and activity controls", () => {
    expect(canManagePromotions("owner")).toBe(true);
    expect(canManagePromotions("admin")).toBe(true);
    expect(canManagePromotions("manager")).toBe(true);
    expect(canManagePromotions("staff")).toBe(false);
    expect(canManagePromotions("customer")).toBe(false);

    expect(canViewActivity("owner")).toBe(true);
    expect(canViewActivity("staff")).toBe(true);
    expect(canViewActivity("customer")).toBe(false);
    expect(canViewActivity("operator")).toBe(false);
  });
});
