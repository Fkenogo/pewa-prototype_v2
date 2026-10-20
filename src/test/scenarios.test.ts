import { beforeEach, describe, expect, it } from "vitest";
import { usePewa } from "../lib/pewa/store";
import { SCENARIOS } from "../lib/pewa/fixtures";
import { canAdmitOrder, validateCart } from "../lib/pewa/ordering";

describe("Slice P7 — 16 Master Scenarios Audit", () => {
  beforeEach(() => {
    usePewa.getState().reset();
    usePewa.getState().setRole("owner");
  });

  it("verifies all 16 scenarios are registered and marked ready", () => {
    expect(SCENARIOS).toHaveLength(16);
    SCENARIOS.forEach((s) => {
      expect(s.ready).toBe(true);
      expect(s.id).toBeTruthy();
      expect(s.label).toBeTruthy();
    });
  });

  it("SC-01 (new-cafe): empty workspace for new café onboarding", () => {
    usePewa.getState().loadScenario("new-cafe");
    const s = usePewa.getState();
    expect(s.scenario).toBe("new-cafe");
    expect(s.organisation).toBeNull();
  });

  it("SC-02 (established-restaurant): Green Garden Café with active published menu", () => {
    usePewa.getState().loadScenario("established-restaurant");
    const s = usePewa.getState();
    expect(s.organisation?.id).toBe("org_ggc");
    expect(s.venues[0]?.slug).toBe("green-garden-cafe");
    expect(s.menus[0]?.status).toBe("published");
    expect(s.menus[0]?.sections[0]?.offerings[0]?.available).toBe(true);
  });

  it("SC-03 (multi-brand): Horizon Hospitality Group with 3 distinct brands", () => {
    usePewa.getState().loadScenario("multi-brand");
    const s = usePewa.getState();
    expect(s.organisation?.name).toBe("Horizon Hospitality Group");
    expect(s.venues.length).toBeGreaterThanOrEqual(3);
    expect(s.menus.length).toBeGreaterThanOrEqual(3);
  });

  it("SC-04 (hotel): Grand Horizon Hotel with public bar & protected room dining", () => {
    usePewa.getState().loadScenario("hotel");
    const s = usePewa.getState();
    expect(s.organisation?.name).toBe("The Grand Horizon Hotel Ltd");
    expect(s.menus).toHaveLength(2);
    const pub = s.menus.find((m) => !m.isProtected);
    const priv = s.menus.find((m) => m.isProtected);
    expect(pub).toBeDefined();
    expect(priv).toBeDefined();
    expect(s.guestSession?.verified).toBe(true);
    expect(s.guestSession?.roomNumber).toBe("402");
  });

  it("SC-05 (delivery-only): CloudBurger Kitchen cloud delivery operation", () => {
    usePewa.getState().loadScenario("delivery-only");
    const s = usePewa.getState();
    const v = s.venues[0];
    expect(v?.deliveryOnly).toBe(true);
    expect(v?.address).toBe("");
    expect(v?.serviceArea).toContain("Kilimani");
  });

  it("SC-06 (units-available): standard 142 units capacity", () => {
    usePewa.getState().loadScenario("units-available");
    const s = usePewa.getState();
    expect(s.orderPolicy.included).toBe(142);
    expect(canAdmitOrder(s.orderPolicy)).toBe(true);
  });

  it("SC-07 (zero-units): 0 units graceful exhaustion with live menus & contact", () => {
    usePewa.getState().loadScenario("zero-units");
    const s = usePewa.getState();
    expect(s.orderPolicy.included).toBe(0);
    expect(s.orderPolicy.topUp).toBe(0);
    expect(canAdmitOrder(s.orderPolicy)).toBe(false);
    expect(s.menus[0]?.status).toBe("published");
    expect(s.venues[0]?.contact.phone).toBeTruthy();
  });

  it("SC-08 (expired-beyond-grace): subscription expired disables new admissions", () => {
    usePewa.getState().loadScenario("expired-beyond-grace");
    const s = usePewa.getState();
    expect(s.orderPolicy.expired).toBe(true);
    expect(canAdmitOrder(s.orderPolicy)).toBe(false);
  });

  it("SC-09 (admitted-pending): pending order continuity accepts under overdraft allowance", () => {
    usePewa.getState().loadScenario("admitted-pending");
    const s = usePewa.getState();
    expect(s.orders).toHaveLength(1);
    expect(s.orders[0]?.status).toBe("pending");
    expect(s.orderPolicy.included).toBe(0);

    const ok = s.acceptOrder("order_seed");
    expect(ok).toBe(true);
    expect(usePewa.getState().orderPolicy.overdraftUsed).toBe(1);
    expect(usePewa.getState().orders[0]?.status).toBe("accepted");
  });

  it("SC-10 (duplicate-accept): idempotent order acceptance", () => {
    usePewa.getState().loadScenario("duplicate-accept");
    const s = usePewa.getState();
    const initialUnits = s.orderPolicy.included;

    expect(s.acceptOrder("order_seed")).toBe(true);
    expect(usePewa.getState().orderPolicy.included).toBe(initialUnits - 1);

    expect(usePewa.getState().acceptOrder("order_seed")).toBe(false);
    expect(usePewa.getState().orderPolicy.included).toBe(initialUnits - 1);
  });

  it("SC-11 (withdraw-vs-accept): customer withdrawal prevents subsequent acceptance", () => {
    usePewa.getState().loadScenario("withdraw-vs-accept");
    const s = usePewa.getState();
    const initialUnits = s.orderPolicy.included;

    const withdrawn = s.withdrawOrder("order_seed");
    expect(withdrawn).toBe(true);
    expect(usePewa.getState().orders[0]?.status).toBe("withdrawn");

    const accepted = s.acceptOrder("order_seed");
    expect(accepted).toBe(false);
    expect(usePewa.getState().orderPolicy.included).toBe(initialUnits);
  });

  it("SC-12 (unavailable-item): sold-out dish flagged by cart validation", () => {
    usePewa.getState().loadScenario("unavailable-item");
    const s = usePewa.getState();
    const off = s.menus[0]?.sections[0]?.offerings.find((o) => o.id === "off_cold");
    expect(off?.available).toBe(false);

    const cart = {
      venueId: s.venues[0]!.id,
      lines: [
        {
          id: "l1",
          menuId: s.menus[0]!.id,
          offeringId: off!.id,
          name: off!.name,
          emoji: "🧊",
          basePrice: off!.price,
          options: [],
          quantity: 1,
          note: "",
        },
      ],
    };
    const error = validateCart(s, cart);
    expect(error).toContain("no longer available");
  });

  it("SC-13 (outdated-price): price amendment detected on stale cart", () => {
    usePewa.getState().loadScenario("outdated-price");
    const s = usePewa.getState();
    expect(s.cart).toBeDefined();

    const err = validateCart(s, s.cart);
    expect(err).toContain("price has changed");
  });

  it("SC-14 (channel-unavailable): phone contact remains functional without WhatsApp", () => {
    usePewa.getState().loadScenario("channel-unavailable");
    const s = usePewa.getState();
    const v = s.venues[0];
    expect(v?.contact.whatsapp).toBe("");
    expect(v?.contact.phone).toBeTruthy();
  });

  it("SC-15 (protected-denied): unverified customer session on luxury hotel", () => {
    usePewa.getState().loadScenario("protected-denied");
    const s = usePewa.getState();
    expect(s.guestSession).toBeNull();
  });

  it("SC-16 (sponsored-campaign): active featured offer campaign", () => {
    usePewa.getState().loadScenario("sponsored-campaign");
    const s = usePewa.getState();
    expect(s.campaigns).toHaveLength(1);
    expect(s.campaigns[0]?.active).toBe(true);
    expect(s.campaigns[0]?.badgeText).toBe("Sponsored");
  });
});
