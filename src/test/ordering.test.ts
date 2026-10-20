import { beforeEach, describe, expect, it } from "vitest";
import { usePewa } from "@/lib/pewa/store";
import { validateCart } from "@/lib/pewa/ordering";

const customer = { guestName: "Guest", guestContact: "0700000000", service: "Takeaway", note: "Counter pickup" };
function addItem() {
  return usePewa.getState().addCartLine("venue_ggc", { menuId: "menu_ggc_allday", offeringId: "off_flat", name: "Flat White", emoji: "☕", basePrice: 280, options: [{ groupId: "mod_milk", optionId: "o2", name: "Oat", priceDelta: 50 }], quantity: 2, note: "Warm" });
}
function submit() {
  addItem();
  const result = usePewa.getState().submitOrder(customer);
  if (!result.id) throw new Error(result.error);
  return result.id;
}
describe("Guest ordering rules", () => {
  beforeEach(() => { usePewa.getState().loadScenario("units-available"); usePewa.getState().setRole("owner"); });
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
    const id = submit(); usePewa.getState().acceptOrder(id);
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
    const id = submit(); usePewa.getState().setRole("operator");
    expect(usePewa.getState().acceptOrder(id)).toBe(false);
    expect(usePewa.getState().declineOrder(id, "No")).toBe(false);
    usePewa.setState({ orders: usePewa.getState().orders.map((o) => ({ ...o, status: "accepted" })) });
    expect(usePewa.getState().markOrderReady(id)).toBe(false);
  });
  it("staff can accept and mark ready", () => {
    const id = submit(); usePewa.getState().setRole("staff");
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
    addItem(); usePewa.getState().toggleAvailability("menu_ggc_allday", "sec_coffee", "off_flat");
    expect(validateCart(usePewa.getState(), usePewa.getState().cart)).toContain("no longer available");
    expect(usePewa.getState().submitOrder(customer).id).toBeUndefined();
  });
  it("requests do not require WhatsApp or a customer account", () => {
    usePewa.getState().loadScenario("channel-unavailable"); usePewa.getState().setRole("customer");
    expect(submit()).toMatch(/^order_/);
  });
  it("favourites toggle and recents are deduplicated", () => {
    usePewa.getState().toggleFavourite("venue_ggc");
    expect(usePewa.getState().favourites).toEqual(["venue_ggc"]);
    usePewa.getState().toggleFavourite("venue_ggc");
    expect(usePewa.getState().favourites).toEqual([]);
    usePewa.getState().visitVenue("venue_ggc"); usePewa.getState().visitVenue("venue_ggc");
    expect(usePewa.getState().recents).toEqual(["venue_ggc"]);
  });
});