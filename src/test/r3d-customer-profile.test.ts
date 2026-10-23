import { beforeEach, describe, expect, it } from "vitest";
import { usePewa, resolveMenuAccess } from "@/lib/pewa/store";

describe("R3-D customer context and local continuity", () => {
  beforeEach(() => usePewa.getState().loadScenario("new-cafe"));

  it("starts as a guest and creates a fresh, unverified identity without matching contact strings", () => {
    const store = usePewa.getState();
    expect(store.customerContext).toEqual({ kind: "guest" });
    const first = store.createCustomerProfile({ fullName: "Amina", email: "same@example.test" });
    expect(first.ok).toBe(true);
    const firstContext = usePewa.getState().customerContext;
    const firstId = firstContext.kind === "identified" ? firstContext.identityId : "";
    store.continueAsGuest();
    const second = usePewa
      .getState()
      .createCustomerProfile({ fullName: "Bina", email: "same@example.test" });
    expect(second.ok).toBe(true);
    const identities = usePewa.getState().identities || [];
    expect(identities.filter((identity) => identity.email === "same@example.test")).toHaveLength(2);
    expect(identities.find((identity) => identity.id === firstId)?.verifiedSimulation).toBe(false);
  });

  it("keeps local favorites, recents, cart draft, and business memberships through customer mode", () => {
    usePewa.getState().loadScenario("established-restaurant");
    const before = usePewa.getState();
    const identityId = before.personalIdentity?.id;
    const memberships = structuredClone(before.memberships);
    const venueId = before.venues[0]?.id;
    if (venueId) {
      before.toggleFavourite(venueId);
      before.visitVenue(venueId);
    }
    before.updateOrderDraft({ guestName: "Guest draft", note: "Keep this" });
    expect(before.continueAsExistingCustomer()).toBe(true);
    expect(usePewa.getState().customerContext).toEqual({ kind: "identified", identityId });
    usePewa.getState().continueAsGuest();
    expect(usePewa.getState().favourites).toContain(venueId);
    expect(usePewa.getState().recents).toContain(venueId);
    expect(usePewa.getState().orderDraft?.guestName).toBe("Guest draft");
    expect(usePewa.getState().memberships).toEqual(memberships);
  });

  it("edits only the active customer identity and resumes it explicitly", () => {
    const store = usePewa.getState();
    expect(store.createCustomerProfile({ fullName: "Amina", mobile: "+12345678901" }).ok).toBe(
      true,
    );
    const context = usePewa.getState().customerContext;
    const identityId = context.kind === "identified" ? context.identityId : "";
    expect(usePewa.getState().updateCustomerProfile({ fullName: "Amina M." })).toBe(true);
    expect(
      usePewa.getState().identities?.find((identity) => identity.id === identityId)?.fullName,
    ).toBe("Amina M.");
    usePewa.getState().continueAsGuest();
    expect(usePewa.getState().resumePreviousCustomerProfile()).toBe(true);
    expect(usePewa.getState().customerContext).toEqual({ kind: "identified", identityId });
  });

  it("preserves verified business identity metadata when only the name changes as a customer", () => {
    usePewa.getState().loadScenario("established-restaurant");
    const before = usePewa.getState();
    const businessIdentity = before.personalIdentity!;
    const verified = before.upsertPersonalIdentity({
      id: businessIdentity.id,
      fullName: businessIdentity.fullName,
      email: businessIdentity.email,
      mobile: businessIdentity.mobile,
      verifiedSimulation: true,
    });
    const memberships = structuredClone(usePewa.getState().memberships);
    expect(usePewa.getState().continueAsExistingCustomer()).toBe(true);
    expect(usePewa.getState().updateCustomerProfile({})).toBe(true);
    expect(
      usePewa.getState().identities?.find((identity) => identity.id === verified.id)
        ?.verifiedSimulation,
    ).toBe(true);
    expect(usePewa.getState().updateCustomerProfile({ fullName: "Updated name" })).toBe(true);
    const saved = usePewa.getState().identities?.find((identity) => identity.id === verified.id);
    expect(saved?.verifiedSimulation).toBe(true);
    expect(saved?.verifiedAt).toBe(verified.verifiedAt);
    expect(usePewa.getState().updateCustomerProfile({ email: "changed@example.test" })).toBe(true);
    expect(
      usePewa.getState().identities?.find((identity) => identity.id === verified.id)
        ?.verifiedSimulation,
    ).toBe(false);
    expect(
      usePewa.getState().identities?.find((identity) => identity.id === verified.id)?.verifiedAt,
    ).toBeUndefined();
    expect(usePewa.getState().memberships).toEqual(memberships);
  });

  it("retains multiple explicitly selected customer profiles through repeated guest transitions", () => {
    const store = usePewa.getState();
    expect(store.createCustomerProfile({ fullName: "Amina", email: "a@example.test" }).ok).toBe(
      true,
    );
    const a = usePewa.getState().customerContext;
    const aId = a.kind === "identified" ? a.identityId : "";
    usePewa.getState().continueAsGuest();
    expect(
      usePewa.getState().createCustomerProfile({ fullName: "Bina", email: "b@example.test" }).ok,
    ).toBe(true);
    const b = usePewa.getState().customerContext;
    const bId = b.kind === "identified" ? b.identityId : "";
    usePewa.getState().continueAsGuest();
    expect(usePewa.getState().selectCustomerProfile(aId)).toBe(true);
    expect(usePewa.getState().customerContext).toEqual({ kind: "identified", identityId: aId });
    usePewa.getState().continueAsGuest();
    expect(usePewa.getState().selectCustomerProfile(bId)).toBe(true);
    usePewa.getState().continueAsGuest();
    expect(usePewa.getState().selectCustomerProfile(aId)).toBe(true);
    expect(usePewa.getState().customerIdentityIds).toEqual([bId, aId]);
  });

  it("rejects punctuation-only mobile values during profile creation and editing", () => {
    const store = usePewa.getState();
    expect(store.createCustomerProfile({ fullName: "Guest", mobile: "-------" }).ok).toBe(false);
    expect(store.createCustomerProfile({ fullName: "Guest", mobile: "       " }).ok).toBe(false);
    expect(
      store.createCustomerProfile({ fullName: "Guest", mobile: "+254 (711) 223-344" }).ok,
    ).toBe(true);
    const context = usePewa.getState().customerContext;
    expect(context.kind).toBe("identified");
    expect(
      usePewa
        .getState()
        .identities?.find(
          (identity) => identity.id === (context.kind === "identified" ? context.identityId : ""),
        )?.mobile,
    ).toBe("+254711223344");
    expect(usePewa.getState().updateCustomerProfile({ mobile: "--- ---" })).toBe(false);
  });

  it("autofills untouched order contact fields but respects deliberate clearing and replacement", () => {
    const store = usePewa.getState();
    expect(store.createCustomerProfile({ fullName: "Amina", mobile: "+254 711 223 344" }).ok).toBe(
      true,
    );
    const first = usePewa.getState().customerContext;
    if (first.kind !== "identified") throw new Error("Profile was not identified");
    const identityA = usePewa
      .getState()
      .identities?.find((identity) => identity.id === first.identityId);
    if (!identityA) throw new Error("Customer A identity was not found");
    usePewa.getState().autofillCustomerOrderDraft(first.identityId, identityA);
    expect(usePewa.getState().orderDraft.guestContact).toBe("+254711223344");

    usePewa.getState().updateOrderDraft({ guestContact: "" });
    usePewa.getState().autofillCustomerOrderDraft(first.identityId, identityA);
    expect(usePewa.getState().orderDraft.guestContact).toBe("");
    usePewa.getState().updateOrderDraft({ guestContact: "manual@example.test" });

    usePewa.getState().continueAsGuest();
    expect(
      usePewa.getState().createCustomerProfile({ fullName: "Bina", email: "b@example.test" }).ok,
    ).toBe(true);
    const second = usePewa.getState().customerContext;
    if (second.kind !== "identified") throw new Error("Second profile was not identified");
    const identityB = usePewa
      .getState()
      .identities?.find((identity) => identity.id === second.identityId);
    if (!identityB) throw new Error("Customer B identity was not found");
    usePewa.getState().autofillCustomerOrderDraft(second.identityId, identityB);
    expect(usePewa.getState().orderDraft.guestContact).toBe("manual@example.test");
  });

  it("binds a submitted order to the active profile and keeps hotel verification separate", () => {
    usePewa.getState().loadScenario("units-available");
    expect(
      usePewa
        .getState()
        .createCustomerProfile({ fullName: "Customer", email: "customer@pewa.test" }).ok,
    ).toBe(true);
    const addResult = usePewa.getState().addCartLine("venue_ggc", {
      menuId: "menu_ggc_allday",
      offeringId: "off_flat",
      name: "Flat White",
      emoji: "☕",
      basePrice: 280,
      options: [],
      quantity: 1,
      note: "",
    });
    expect(addResult).toBeNull();
    const result = usePewa.getState().submitOrder({
      guestName: "Customer",
      guestContact: "customer@pewa.test",
      service: "Takeaway",
      note: "",
    });
    expect(result.id).toBeDefined();
    const context = usePewa.getState().customerContext;
    expect(
      usePewa.getState().orders.find((order) => order.id === result.id)?.customerIdentityId,
    ).toBe(context.kind === "identified" ? context.identityId : undefined);

    usePewa.getState().loadScenario("hotel");
    usePewa.getState().clearGuestSession();
    usePewa
      .getState()
      .createCustomerProfile({ fullName: "Hotel customer", email: "hotel@pewa.test" });
    const protectedMenu = resolveMenuAccess({ code: "HRZ-ROOM" }, usePewa.getState());
    expect(protectedMenu.success).toBe(true);
    expect(protectedMenu.isProtected).toBe(true);
    expect(usePewa.getState().guestSession?.verified).toBeFalsy();
  });
});
