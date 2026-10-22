import { describe, it, expect, beforeEach } from "vitest";
import { usePewa, getEffectiveBusinessRole, canActorOperateScope } from "@/lib/pewa/store";
import type { OrderRequest, Menu, TeamInvitation } from "@/lib/pewa/types";

describe("PEWA PROTOTYPE — R3-B CORR-002: Empty Service-Point Scope and Delivery Reference", () => {
  beforeEach(() => {
    usePewa.getState().loadScenario("established-restaurant");
  });

  // Test A: Lobby-Bar-only Manager cannot invite venue-wide Staff by omitting servicePoints
  it("Test A: Lobby-Bar-only Manager cannot invite venue-wide Staff by omitting servicePoints", () => {
    const store = usePewa.getState();
    const orgId = store.organisation!.id;

    // Seed restricted Lobby-Bar-only manager
    const mgr = store.upsertPersonalIdentity({
      fullName: "Lobby Bar Manager",
      email: "lobby.mgr@greengarden.example",
    });
    store.seedScenarioMembership({
      identityId: mgr.id,
      orgId,
      role: "manager",
      status: "active",
      venueId: "venue_ggc",
    });

    usePewa.setState({ personalIdentity: mgr, role: "manager" });
    usePewa.setState((s) => ({
      memberships: (s.memberships || []).map((m) =>
        m.identityId === mgr.id
          ? {
              ...m,
              scopeType: "restricted",
              venueIds: ["venue_ggc"],
              servicePoints: ["Lobby Bar"],
            }
          : m,
      ),
    }));

    // 1. Omitting servicePoints: must default to manager's authorised stations, NEVER venue-wide (undefined)
    const omittedRes = usePewa.getState().createInvitation({
      recipientContact: "staff.omit@greengarden.example",
      role: "staff",
      scopeType: "restricted",
      venueIds: ["venue_ggc"],
    });
    expect(omittedRes.success).toBe(true);
    expect(omittedRes.invitation?.servicePoints).toEqual(["Lobby Bar"]);

    // 2. Explicitly submitting empty station list []: must be rejected to prevent venue-wide access
    const emptyRes = usePewa.getState().createInvitation({
      recipientContact: "staff.empty@greengarden.example",
      role: "staff",
      scopeType: "restricted",
      venueIds: ["venue_ggc"],
      servicePoints: [],
    });
    expect(emptyRes.success).toBe(false);
    expect(emptyRes.error).toContain("cannot grant venue-wide station access");
  });

  // Test B: The same Manager cannot expand Staff permissions by submitting an empty station list during editing
  it("Test B: The same Manager cannot expand Staff permissions by submitting an empty station list during editing", () => {
    const store = usePewa.getState();
    const orgId = store.organisation!.id;

    const mgr = store.upsertPersonalIdentity({
      fullName: "Lobby Bar Manager",
      email: "lobby.mgr@greengarden.example",
    });
    store.seedScenarioMembership({
      identityId: mgr.id,
      orgId,
      role: "manager",
      status: "active",
      venueId: "venue_ggc",
    });

    const staff = store.upsertPersonalIdentity({
      fullName: "Bar Staff Member",
      email: "bar.staff@greengarden.example",
    });
    const staffMem = store.seedScenarioMembership({
      identityId: staff.id,
      orgId,
      role: "staff",
      status: "active",
      venueId: "venue_ggc",
    })!;

    usePewa.setState({ personalIdentity: mgr, role: "manager" });
    usePewa.setState((s) => ({
      memberships: (s.memberships || []).map((m) => {
        if (m.identityId === mgr.id) {
          return {
            ...m,
            scopeType: "restricted",
            venueIds: ["venue_ggc"],
            servicePoints: ["Lobby Bar"],
          };
        }
        if (m.identityId === staff.id) {
          return {
            ...m,
            scopeType: "restricted",
            venueIds: ["venue_ggc"],
            servicePoints: ["Lobby Bar"],
          };
        }
        return m;
      }),
    }));

    // Manager attempts to expand Staff permissions by submitting an empty station list []
    const editRes = usePewa.getState().updateMembershipScope({
      membershipId: staffMem.id,
      scopeType: "restricted",
      servicePoints: [],
    });
    expect(editRes.success).toBe(false);
    expect(editRes.error).toContain("cannot grant venue-wide station access");

    // Staff membership remains restricted to Lobby Bar
    const preservedMem = (usePewa.getState().memberships || []).find((m) => m.id === staffMem.id);
    expect(preservedMem?.servicePoints).toEqual(["Lobby Bar"]);
  });

  // Test C: Explicitly authorised venue-wide Managers can assign venue-wide Staff where their membership permits it
  it("Test C: Explicitly authorised venue-wide Managers can assign venue-wide Staff where their membership permits it", () => {
    const store = usePewa.getState();
    const orgId = store.organisation!.id;

    // Seed venue-wide manager (servicePoints: undefined)
    const vwMgr = store.upsertPersonalIdentity({
      fullName: "Venue Wide Manager",
      email: "vw.mgr@greengarden.example",
    });
    store.seedScenarioMembership({
      identityId: vwMgr.id,
      orgId,
      role: "manager",
      status: "active",
      venueId: "venue_ggc",
    });

    usePewa.setState({ personalIdentity: vwMgr, role: "manager" });
    usePewa.setState((s) => ({
      memberships: (s.memberships || []).map((m) =>
        m.identityId === vwMgr.id
          ? {
              ...m,
              scopeType: "restricted",
              venueIds: ["venue_ggc"],
              servicePoints: undefined, // Venue-wide within venue_ggc
            }
          : m,
      ),
    }));

    // 1. Inviting staff with omitted servicePoints preserves venue-wide scope
    const inviteRes = usePewa.getState().createInvitation({
      recipientContact: "staff.vw@greengarden.example",
      role: "staff",
      scopeType: "restricted",
      venueIds: ["venue_ggc"],
    });
    expect(inviteRes.success).toBe(true);
    expect(inviteRes.invitation?.servicePoints).toBeUndefined();

    // 2. Editing staff to have venue-wide scope (omitted / undefined) succeeds
    const staff = store.upsertPersonalIdentity({
      fullName: "Existing Staff",
      email: "existing.staff@greengarden.example",
    });
    const staffMem = store.seedScenarioMembership({
      identityId: staff.id,
      orgId,
      role: "staff",
      status: "active",
      venueId: "venue_ggc",
    })!;

    // Ensure active identity is the venue-wide manager
    usePewa.setState({ personalIdentity: vwMgr, role: "manager" });

    const editRes = usePewa.getState().updateMembershipScope({
      membershipId: staffMem.id,
      scopeType: "restricted",
      servicePoints: undefined,
    });
    expect(editRes.success).toBe(true);
  });

  // Test D: Invitation acceptance preserves the correct restrictions
  it("Test D: Invitation acceptance preserves the correct restrictions", () => {
    const store = usePewa.getState();

    const invite: TeamInvitation = {
      id: "inv_lobby_test",
      token: "tok_lobby_test",
      orgId: "org_ggc",
      orgName: "Green Garden Café Ltd",
      recipientContact: "lobby.staff@greengarden.example",
      role: "staff",
      scopeType: "restricted",
      venueIds: ["venue_ggc"],
      servicePoints: ["Lobby Bar"],
      invitedById: "id_founder_njeri",
      invitedByName: "Njeri Mwangi",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      status: "pending",
    };
    usePewa.setState((s) => ({
      invitations: [invite, ...(s.invitations || [])],
    }));

    const acceptRes = usePewa.getState().acceptInvitation("tok_lobby_test", {
      fullName: "Lobby Staff",
      email: "lobby.staff@greengarden.example",
    });
    expect(acceptRes.success).toBe(true);
    expect(acceptRes.membership?.servicePoints).toEqual(["Lobby Bar"]);

    // Verify stored membership
    const state = usePewa.getState();
    const mem = (state.memberships || []).find((m) => m.id === acceptRes.membership?.id);
    expect(mem?.servicePoints).toEqual(["Lobby Bar"]);
  });

  // Test E: Order processing and availability changes reject unauthorised stations
  it("Test E: Order processing and availability changes reject unauthorised stations", () => {
    const store = usePewa.getState();
    const orgId = store.organisation!.id;

    // Seed staff member restricted to "Lobby Bar" only
    const staff = store.upsertPersonalIdentity({
      fullName: "Lobby Bar Staff",
      email: "lobby.only@greengarden.example",
    });
    store.seedScenarioMembership({
      identityId: staff.id,
      orgId,
      role: "staff",
      status: "active",
      venueId: "venue_ggc",
    });

    usePewa.setState({ personalIdentity: staff, role: "staff" });
    usePewa.setState((s) => ({
      memberships: (s.memberships || []).map((m) =>
        m.identityId === staff.id
          ? {
              ...m,
              scopeType: "restricted",
              venueIds: ["venue_ggc"],
              servicePoints: ["Lobby Bar"],
            }
          : m,
      ),
    }));

    expect(getEffectiveBusinessRole(usePewa.getState())).toBe("staff");

    // 1. Order processing:
    const outOfScopeOrder: OrderRequest = {
      id: "ord_main_counter",
      orgId,
      venueId: "venue_ggc",
      venueName: "Green Garden Café",
      guestName: "Guest A",
      guestContact: "+254700000001",
      service: "dine_in",
      note: "",
      reference: "ORD-MAIN",
      currency: "KES",
      lines: [],
      total: 350,
      status: "pending",
      submittedAt: new Date().toISOString(),
      unitConsumed: false,
      servicePoint: "Main Counter", // Unauthorised
    };

    const inScopeOrder: OrderRequest = {
      id: "ord_lobby_bar",
      orgId,
      venueId: "venue_ggc",
      venueName: "Green Garden Café",
      guestName: "Guest B",
      guestContact: "+254700000002",
      service: "dine_in",
      note: "",
      reference: "ORD-LOBBY",
      currency: "KES",
      lines: [],
      total: 550,
      status: "pending",
      submittedAt: new Date().toISOString(),
      unitConsumed: false,
      servicePoint: "Lobby Bar", // Authorised
    };

    usePewa.setState((s) => ({
      orders: [outOfScopeOrder, inScopeOrder, ...s.orders],
    }));

    // Order for unauthorised station is rejected
    expect(usePewa.getState().acceptOrder("ord_main_counter")).toBe(false);

    // Order for authorised station is accepted
    expect(usePewa.getState().acceptOrder("ord_lobby_bar")).toBe(true);

    // 2. Availability changes:
    const mainCounterMenu: Menu = {
      id: "menu_main_counter",
      orgId,
      venueId: "venue_ggc",
      name: "Counter Menu",
      servicePointName: "Main Counter", // Unauthorised
      status: "published",
      updatedAt: new Date().toISOString(),
      sections: [
        {
          id: "sec_mc",
          name: "Items",
          offerings: [
            {
              id: "off_mc_1",
              name: "Muffin",
              price: 150,
              available: true,
              description: "Fresh muffin",
              tags: [],
              modifiers: [],
              emoji: "🧁",
            },
          ],
        },
      ],
    };

    const lobbyBarMenu: Menu = {
      id: "menu_lobby_bar",
      orgId,
      venueId: "venue_ggc",
      name: "Bar Menu",
      servicePointName: "Lobby Bar", // Authorised
      status: "published",
      updatedAt: new Date().toISOString(),
      sections: [
        {
          id: "sec_lb",
          name: "Drinks",
          offerings: [
            {
              id: "off_lb_1",
              name: "Cocktail",
              price: 800,
              available: true,
              description: "Cold cocktail",
              tags: [],
              modifiers: [],
              emoji: "🍸",
            },
          ],
        },
      ],
    };

    usePewa.setState((s) => ({
      menus: [mainCounterMenu, lobbyBarMenu, ...s.menus],
    }));

    // Availability toggle for unauthorised station fails
    usePewa
      .getState()
      .toggleOfferingVenueAvailability("menu_main_counter", "sec_mc", "off_mc_1", "venue_ggc");
    const mcMenuAfter = usePewa.getState().menus.find((m) => m.id === "menu_main_counter");
    expect(mcMenuAfter?.sections[0]?.offerings[0]?.venueOverrides?.["venue_ggc"]).toBeUndefined();

    // Availability toggle for authorised station succeeds
    usePewa
      .getState()
      .toggleOfferingVenueAvailability("menu_lobby_bar", "sec_lb", "off_lb_1", "venue_ggc");
    const lbMenuAfter = usePewa.getState().menus.find((m) => m.id === "menu_lobby_bar");
    expect(lbMenuAfter?.sections[0]?.offerings[0]?.venueOverrides?.["venue_ggc"]).toBeDefined();
  });

  // Test G: Selected service points must exist in the venue's configured contexts
  it("Test G: Selected service points must exist in the venue's configured contexts", () => {
    const store = usePewa.getState();
    store.setRole("owner");

    // Configure venue_ggc with explicit service contexts
    usePewa.setState((s) => ({
      venues: s.venues.map((v) =>
        v.id === "venue_ggc" ? { ...v, serviceContexts: ["Lobby Bar", "Dining Room"] } : v,
      ),
    }));

    // 1. Attempt to invite with unconfigured service point fails
    const invalidInvite = store.createInvitation({
      recipientContact: "unconf@greengarden.example",
      role: "staff",
      scopeType: "restricted",
      venueIds: ["venue_ggc"],
      servicePoints: ["Drive-thru Window"], // Not configured on venue_ggc
    });
    expect(invalidInvite.success).toBe(false);
    expect(invalidInvite.error).toContain("must be configured in the assigned venue(s)");

    // 2. Invite with configured service point succeeds
    const validInvite = store.createInvitation({
      recipientContact: "conf@greengarden.example",
      role: "staff",
      scopeType: "restricted",
      venueIds: ["venue_ggc"],
      servicePoints: ["Lobby Bar"],
    });
    expect(validInvite.success).toBe(true);

    const ownerIdentity = store.personalIdentity;

    // 3. Edit membership with unconfigured service point fails
    const staff = store.upsertPersonalIdentity({
      fullName: "Context Staff",
      email: "ctx.staff@greengarden.example",
    });
    const staffMem = store.seedScenarioMembership({
      identityId: staff.id,
      orgId: "org_ggc",
      role: "staff",
      status: "active",
      venueId: "venue_ggc",
    })!;

    usePewa.setState({ personalIdentity: ownerIdentity, role: "owner" });

    const invalidEdit = usePewa.getState().updateMembershipScope({
      membershipId: staffMem.id,
      scopeType: "restricted",
      servicePoints: ["Drive-thru Window"],
    });
    expect(invalidEdit.success).toBe(false);
    expect(invalidEdit.error).toContain("must be configured in the assigned venue(s)");
  });
});
