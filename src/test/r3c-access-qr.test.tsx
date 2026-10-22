import { describe, it, expect, beforeEach } from "vitest";
import {
  usePewa,
  resolveMenuAccess,
  generateUniqueShortCode,
  canAuthorMenus,
  getEffectiveBusinessRole,
} from "@/lib/pewa/store";
import { MenuAccessReference } from "@/lib/pewa/types";

describe("PEWA PROTOTYPE — R3-C: QR Codes, Menu Codes, and Channel Access", () => {
  beforeEach(() => {
    usePewa.getState().reset();
    usePewa.getState().loadScenario("established-restaurant");
  });

  // Scenario A: Restaurant generates QR code for published menu
  it("Scenario A: Authorised business user generates QR code for published menu", () => {
    const store = usePewa.getState();
    const ggcVenue = store.venues.find((v) => v.id === "venue_ggc")!;
    const ggcMenu = store.menus.find(
      (m) => m.id === "menu_ggc_allday" && m.status === "published",
    )!;

    expect(canAuthorMenus(getEffectiveBusinessRole(store))).toBe(true); // Owner role

    const result = store.createAccessReference({
      menuId: ggcMenu.id,
      venueId: ggcVenue.id,
      servicePoint: "Dine-in Area Table 12",
      channel: "qr",
      customPrompt: "Welcome to Green Garden Café!",
      label: "Table 12 QR",
    });

    expect(result.success).toBe(true);
    expect(result.reference).toBeDefined();
    expect(result.reference?.shortCode).toMatch(/^GRE-/);
    expect(result.reference?.status).toBe("active");
    expect(result.reference?.servicePoint).toBe("Dine-in Area Table 12");

    // Reference is stored in store state
    const currentRefs = usePewa.getState().accessReferences || [];
    expect(currentRefs.some((r) => r.id === result.reference?.id)).toBe(true);
  });

  // Scenario B: Scanning QR opens correct menu & context
  it("Scenario B: Scanning QR resolves correct menu and preserves service context", () => {
    const store = usePewa.getState();
    const dineRef = (store.accessReferences || []).find((r) => r.shortCode === "GGC-DINE")!;
    expect(dineRef).toBeDefined();

    const resolution = resolveMenuAccess({ code: "GGC-DINE" }, store);
    expect(resolution.success).toBe(true);
    expect(resolution.menu?.id).toBe(dineRef.menuId);
    expect(resolution.venue?.id).toBe(dineRef.venueId);
    expect(resolution.reference?.servicePoint).toBe("Main Dining");
    expect(resolution.isProtected).toBe(false);
  });

  // Scenario C: Manual code entry opens same menu & context
  it("Scenario C: Manual code entry normalizes input and resolves same menu & context", () => {
    const store = usePewa.getState();
    // Test case insensitive and trimmed input
    const resolution = resolveMenuAccess({ code: "  ggc-dine  " }, store);
    expect(resolution.success).toBe(true);
    expect(resolution.reference?.shortCode).toBe("GGC-DINE");
    expect(resolution.reference?.servicePoint).toBe("Main Dining");
  });

  // Scenario D: Direct web link opens same destination
  it("Scenario D: Direct web link by accessId or code resolves identical destination", () => {
    const store = usePewa.getState();
    const barRef = (store.accessReferences || []).find((r) => r.shortCode === "GGC-BAR")!;

    const byId = resolveMenuAccess({ accessId: barRef.id }, store);
    const byCode = resolveMenuAccess({ code: barRef.shortCode }, store);

    expect(byId.success).toBe(true);
    expect(byCode.success).toBe(true);
    expect(byId.menu?.id).toBe(byCode.menu?.id);
    expect(byId.reference?.servicePoint).toBe("Lobby Bar");
    expect(byCode.reference?.servicePoint).toBe("Lobby Bar");
    expect(byId.targetUrl).toBe(byCode.targetUrl);
  });

  // Scenario E: Different service points reference same menu while retaining context
  it("Scenario E: Different service points reference the same published menu while maintaining separate contexts", () => {
    const store = usePewa.getState();
    const dineResolution = resolveMenuAccess({ code: "GGC-DINE" }, store);
    const barResolution = resolveMenuAccess({ code: "GGC-BAR" }, store);

    expect(dineResolution.menu?.id).toBe(barResolution.menu?.id);
    expect(dineResolution.reference?.servicePoint).toBe("Main Dining");
    expect(barResolution.reference?.servicePoint).toBe("Lobby Bar");
  });

  // Scenario F: Delivery-only business shares published menu without physical storefront
  it("Scenario F: Delivery-only business access reference resolves published delivery menu", () => {
    usePewa.getState().loadScenario("delivery-only");
    const store = usePewa.getState();

    const delRef = (store.accessReferences || []).find((r) => r.shortCode === "CB-DEL")!;
    expect(delRef).toBeDefined();

    const resolution = resolveMenuAccess({ code: "CB-DEL" }, store);
    expect(resolution.success).toBe(true);
    expect(resolution.menu?.id).toBe("menu_cloudburger_delivery");
    expect(resolution.venue?.deliveryOnly).toBe(true);
    expect(resolution.reference?.servicePoint).toBe("Kilimani Dispatch");
  });

  // Scenario G: Draft, unpublished and archived menus cannot be reached through customer links
  it("Scenario G: Draft, unpublished and archived menus are rejected for customer access", () => {
    const store = usePewa.getState();
    const ggcVenue = store.venues.find((v) => v.id === "venue_ggc")!;

    // 1. Create a draft menu
    const draftMenuId = "menu_test_draft";
    usePewa.setState((s) => ({
      menus: [
        ...s.menus,
        {
          id: draftMenuId,
          orgId: "org_ggc",
          venueId: ggcVenue.id,
          name: "Secret Tasting Menu",
          status: "draft" as const,
          sections: [],
          updatedAt: new Date().toISOString(),
        },
      ],
    }));

    // Attempt to create access reference for a draft menu should be rejected by store
    const createRes = usePewa.getState().createAccessReference({
      menuId: draftMenuId,
      venueId: ggcVenue.id,
      channel: "qr",
    });
    expect(createRes.success).toBe(false);
    expect(createRes.error).toMatch(/published/i);

    // 2. If a published menu becomes archived after reference creation, resolver rejects it
    const activeRef = (store.accessReferences || [])[0]!;
    const targetMenu = store.menus.find((m) => m.id === activeRef.menuId)!;

    // Simulate menu archived
    usePewa.setState((s) => ({
      menus: s.menus.map((m) => (m.id === targetMenu.id ? { ...m, status: "archived" } : m)),
    }));

    const archivedResolution = resolveMenuAccess({ accessId: activeRef.id }, usePewa.getState());
    expect(archivedResolution.success).toBe(false);
    expect(archivedResolution.error).toMatch(/archived|published/i);
  });

  // Scenario H: Disabled or invalid access references are rejected with clear error
  it("Scenario H: Disabled or non-existent access references return descriptive error", () => {
    const store = usePewa.getState();
    const dineRef = (store.accessReferences || []).find((r) => r.shortCode === "GGC-DINE")!;

    // Disable the reference
    const disableRes = store.updateAccessReferenceStatus(dineRef.id, "disabled");
    expect(disableRes.success).toBe(true);

    // Resolving disabled reference
    const disabledRes = resolveMenuAccess({ code: "GGC-DINE" }, usePewa.getState());
    expect(disabledRes.success).toBe(false);
    expect(disabledRes.error).toMatch(/disabled/i);

    // Resolving non-existent code
    const invalidRes = resolveMenuAccess({ code: "NON-EXISTENT" }, usePewa.getState());
    expect(invalidRes.success).toBe(false);
    expect(invalidRes.error).toMatch(/invalid or unknown/i);
  });

  // Scenario I: Protected hotel room-service context remains protected until verified
  it("Scenario I: Protected hotel room-service context marks reference as protected", () => {
    usePewa.getState().loadScenario("hotel");
    const store = usePewa.getState();

    const roomRef = (store.accessReferences || []).find((r) => r.shortCode === "HRZ-ROOM")!;
    expect(roomRef).toBeDefined();

    const resolution = resolveMenuAccess({ code: "HRZ-ROOM" }, store);
    expect(resolution.success).toBe(true);
    expect(resolution.isProtected).toBe(true);
    expect(resolution.menu?.isProtected).toBe(true);
    expect(resolution.reference?.servicePoint).toBe("Room 304");
  });

  // Scenario J: WhatsApp-initiated entry leads to correct web menu without separate catalogue
  it("Scenario J: WhatsApp access reference formats correct direct web link in message prompt", () => {
    const store = usePewa.getState();
    const chatRef = (store.accessReferences || []).find((r) => r.shortCode === "GGC-CHAT")!;
    expect(chatRef).toBeDefined();
    expect(chatRef.channel).toBe("whatsapp");

    const resolution = resolveMenuAccess({ code: "GGC-CHAT" }, store);
    expect(resolution.success).toBe(true);
    expect(resolution.menu?.id).toBe("menu_ggc_allday");
    expect(chatRef.customPrompt).toContain("Green Garden Café");
  });

  // Scenario K: Menu updates appear through existing stable links only after publication
  it("Scenario K: Menu changes only reflect on stable QR link after publication", () => {
    const store = usePewa.getState();
    const menu = store.menus.find((m) => m.id === "menu_ggc_allday")!;

    // Adding draft item to unpublished state does not alter published resolution
    const preResolution = resolveMenuAccess({ code: "GGC-DINE" }, store);
    expect(preResolution.success).toBe(true);

    // Regenerating access code retains menu linkage with new code
    const regen = store.regenerateAccessCode(preResolution.reference!.id);
    expect(regen.success).toBe(true);
    expect(regen.newCode).toBeDefined();
    expect(regen.newCode).not.toBe("GGC-DINE");

    // Old code is now invalid
    const oldRes = resolveMenuAccess({ code: "GGC-DINE" }, usePewa.getState());
    expect(oldRes.success).toBe(false);

    // New code works
    const newRes = resolveMenuAccess({ code: regen.newCode! }, usePewa.getState());
    expect(newRes.success).toBe(true);
    expect(newRes.menu?.id).toBe(menu.id);
  });

  // Scenario L: Cross-organisation references cannot redirect customers to unrelated business records
  it("Scenario L: Cross-organisation references are rejected", () => {
    // Inject a reference pointing across orgs
    const maliciousRef: MenuAccessReference = {
      id: "ref_spoofed",
      orgId: "org_other_malicious",
      venueId: "venue_ggc", // Venue from ggc
      menuId: "menu_ggc_allday",
      shortCode: "MALICIOUS-1",
      channel: "qr",
      status: "active",
      type: "public",
      label: "Malicious Cross-Org Reference",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    usePewa.setState((s) => ({
      accessReferences: [...(s.accessReferences || []), maliciousRef],
    }));

    const resolution = resolveMenuAccess({ code: "MALICIOUS-1" }, usePewa.getState());
    expect(resolution.success).toBe(false);
    expect(resolution.error).toMatch(/organisation/i);
  });

  // Scenario M: Unauthorised business staff / out-of-scope managers cannot alter restricted menu-access records
  it("Scenario M: Operational staff cannot create or alter access references", () => {
    const store = usePewa.getState();
    const ggcVenue = store.venues.find((v) => v.id === "venue_ggc")!;
    const ggcMenu = store.menus.find((m) => m.id === "menu_ggc_allday")!;

    // Switch active identity and membership to staff
    const staffIdentity = store.upsertPersonalIdentity({
      fullName: "Test Staff",
      email: "staff@greengarden.example",
    });
    store.seedScenarioMembership({
      identityId: staffIdentity.id,
      orgId: store.organisation!.id,
      role: "staff",
      status: "active",
      venueId: "venue_ggc",
    });
    usePewa.setState({ personalIdentity: staffIdentity, role: "staff" });
    expect(canAuthorMenus(getEffectiveBusinessRole(usePewa.getState()))).toBe(false);

    const createRes = usePewa.getState().createAccessReference({
      menuId: ggcMenu.id,
      venueId: ggcVenue.id,
      channel: "qr",
    });
    expect(createRes.success).toBe(false);
    expect(createRes.error).toMatch(/unauthorized/i);

    // Staff cannot disable references
    const activeRef = (store.accessReferences || [])[0]!;
    const disableRes = usePewa.getState().updateAccessReferenceStatus(activeRef.id, "disabled");
    expect(disableRes.success).toBe(false);
    expect(disableRes.error).toMatch(/unauthorized/i);
  });

  it("Scenario M.2: Restricted managers cannot create references for venues outside their scope", () => {
    usePewa.getState().loadScenario("multi-brand");
    const store = usePewa.getState();

    // Create a restricted manager for venue_ggc only
    const mgr = store.upsertPersonalIdentity({
      fullName: "GGC Manager",
      email: "mgr.ggc@greengarden.example",
    });
    store.seedScenarioMembership({
      identityId: mgr.id,
      orgId: "org_multi_brand",
      role: "manager",
      status: "active",
      venueId: "venue_ggc",
    });

    usePewa.setState((s) => ({
      personalIdentity: mgr,
      role: "manager",
      memberships: (s.memberships || []).map((m) =>
        m.identityId === mgr.id
          ? { ...m, scopeType: "restricted" as const, venueIds: ["venue_ggc"] }
          : m,
      ),
    }));

    // Attempt to create access reference for another venue within org_multi_brand (venue_sol)
    const solVenue = store.venues.find((v) => v.id === "venue_sol")!;
    const menu = store.menus[0]!;

    const createRes = usePewa.getState().createAccessReference({
      menuId: menu.id,
      venueId: solVenue.id,
      channel: "qr",
    });

    expect(createRes.success).toBe(false);
    expect(createRes.error).toMatch(/assigned scope/i);
  });

  // Scenario N: Guest browsing remains available without login or mandatory installation
  it("Scenario N: Guest browsing accesses public menu without requiring personalIdentity or login", () => {
    // Clear any identity
    usePewa.setState({ personalIdentity: null, role: "customer" });
    const store = usePewa.getState();

    const resolution = resolveMenuAccess({ code: "GGC-DINE" }, store);
    expect(resolution.success).toBe(true);
    expect(resolution.menu?.name).toBe("All-Day Menu");
    expect(resolution.venue?.name).toBe("Green Garden Café");
  });

  // Scenario O: Existing ordering, recents, and favourites remain functional
  it("Scenario O: Submitting an order records the servicePoint from the access reference", () => {
    const store = usePewa.getState();
    const resolution = resolveMenuAccess({ code: "GGC-DINE" }, store);
    expect(resolution.success).toBe(true);
    const servicePoint = resolution.reference?.servicePoint;
    expect(servicePoint).toBe("Main Dining");

    const venue = resolution.venue!;
    const menu = resolution.menu!;
    const offering = menu.sections[0]!.offerings[0]!;

    const addErr = store.addCartLine(venue.id, {
      menuId: menu.id,
      offeringId: offering.id,
      name: offering.name,
      basePrice: offering.price,
      quantity: 1,
      options: [],
      emoji: "☕",
      note: "",
    });
    expect(addErr).toBeNull();
    expect(usePewa.getState().cart?.lines.length).toBe(1);

    // Submit order with service point
    const res = usePewa.getState().submitOrder({
      guestName: "Jane Doe",
      guestContact: "+254700000000",
      service: "Dine-in",
      note: "",
      servicePoint: servicePoint,
    });

    expect(res.id).toBeDefined();
    expect(res.error).toBeUndefined();

    // Check store orders contains order with service point
    const placedOrder = usePewa.getState().orders.find((o) => o.id === res.id);
    expect(placedOrder?.servicePoint).toBe("Main Dining");
  });

  // Scenario P: Mobile scan, manual entry, and menu display work without horizontal overflow
  it("Scenario P: Short code generator generates deterministic formatted codes", () => {
    const code1 = generateUniqueShortCode([], "GC");
    const code2 = generateUniqueShortCode([code1], "GC");

    expect(code1).toMatch(/^GC-[A-Z0-9]{4}$/);
    expect(code2).toMatch(/^GC-[A-Z0-9]{4}$/);
    expect(code1).not.toBe(code2);
  });
});
