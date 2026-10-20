import type { CartLine, GuestCart, OrderPolicy, PewaState } from "./types";

export const lineTotal = (line: CartLine) =>
  (line.basePrice + line.options.reduce((sum, option) => sum + option.priceDelta, 0)) *
  line.quantity;
export const cartTotal = (lines: CartLine[]) =>
  lines.reduce((sum, line) => sum + lineTotal(line), 0);
export const canAdmitOrder = (policy: OrderPolicy) =>
  !policy.expired && policy.included + policy.topUp > 0;

export function validateCart(state: PewaState, cart: GuestCart | null): string | null {
  if (state.simulatedOffline) {
    return "Offline network connection: Menus and cart remain cached, but order submission requires connection.";
  }
  if (!cart?.lines.length) return "Your cart is empty.";
  const venue = state.venues.find((v) => v.id === cart.venueId);
  if (!venue) return "This venue is no longer available.";
  for (const line of cart.lines) {
    const menu = state.menus.find(
      (m) => m.id === line.menuId && m.orgId === venue.orgId && m.status === "published",
    );
    const offering = menu?.sections
      .flatMap((s) => s.offerings)
      .find((o) => o.id === line.offeringId);
    if (!offering?.available)
      return `${line.name} is no longer available. Remove it before submitting.`;
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99)
      return "Choose a quantity between 1 and 99.";
    if (offering.price !== line.basePrice)
      return `${line.name}'s price has changed. Remove it and add it again to review the new price.`;
    for (const option of line.options) {
      const current = offering.modifiers
        .find((g) => g.id === option.groupId)
        ?.options.find((o) => o.id === option.optionId);
      if (!current || current.priceDelta !== option.priceDelta)
        return `${line.name}'s options have changed. Remove it and add it again.`;
    }
  }
  return null;
}
