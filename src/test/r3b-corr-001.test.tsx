import { describe, it, expect, beforeEach } from "vitest";
import {
  usePewa,
  getEffectiveBusinessRole,
  getActiveOrganisationMembership,
  SAMPLE_FOUNDER_IDENTITY,
  SAMPLE_ADMIN_IDENTITY,
} from "@/lib/pewa/store";
import type { TeamInvitation } from "@/lib/pewa/types";

describe("PEWA PROTOTYPE — R3-B CORR-001: Scope Delegation and Invitation Acceptance Integrity", () => {
  beforeEach(() => {
    usePewa.getState().loadScenario("established-restaurant");
  });

  // Criterion A: Restricted Manager cannot invite organisation-wide Staff
  it("Criterion A: Restricted Manager cannot invite organisation-wide Staff", () => {
    const store = usePewa.getState();
    const orgId = store.organisation!.id;

    // Seed a restricted manager identity & membership
    const mgrIdentity = store.upsertPersonalIdentity({
      fullName: "Restricted Manager",
      email: "res.mgr@greengarden.example",
    });
    store.seedScenarioMembership({
      identityId: mgrIdentity.id,
      orgId,
      role: "manager",
      status: "active",
      venueId: "venue_ggc",
    });

    usePewa.setState({ personalIdentity: mgrIdentity, role: "manager" });
    // Update membership to explicitly be restricted
    usePewa.setState((s) => ({
      memberships: (s.memberships || []).map((m) =>
        m.identityId === mgrIdentity.id
          ? { ...m, scopeType: "restricted", venueIds: ["venue_ggc"] }
          : m,
      ),
    }));

    expect(getEffectiveBusinessRole(usePewa.getState())).toBe("manager");

    // Attempt to invite staff with organisation-wide access
    const inviteRes = usePewa.getState().createInvitation({
      recipientContact: "staff.orgwide@greengarden.example",
      role: "staff",
      scopeType: "all",
    });

    expect(inviteRes.success).toBe(false);
    expect(inviteRes.error).toContain(
      "Restricted managers cannot issue organisation-wide invitations",
    );
  });

  // Criterion B: Manager cannot delegate venues they do not control
  it("Criterion B: Manager cannot delegate venues they do not control", () => {
    const store = usePewa.getState();
    const orgId = store.organisation!.id;

    const mgrIdentity = store.upsertPersonalIdentity({
      fullName: "Single Venue Manager",
      email: "single.mgr@greengarden.example",
    });
    store.seedScenarioMembership({
      identityId: mgrIdentity.id,
      orgId,
      role: "manager",
      status: "active",
      venueId: "venue_ggc",
    });

    usePewa.setState({ personalIdentity: mgrIdentity, role: "manager" });
    usePewa.setState((s) => ({
      memberships: (s.memberships || []).map((m) =>
        m.identityId === mgrIdentity.id
          ? { ...m, scopeType: "restricted", venueIds: ["venue_ggc"] }
          : m,
      ),
    }));

    // Manager attempts to delegate a venue not in their assigned venues
    const outOfScopeRes = usePewa.getState().createInvitation({
      recipientContact: "staff.other@greengarden.example",
      role: "staff",
      scopeType: "restricted",
      venueIds: ["venue_ggc_hub"],
    });

    expect(outOfScopeRes.success).toBe(false);
    expect(outOfScopeRes.error).toContain("within their own assigned locations");
  });

  // Criterion C: Manager cannot delegate unauthorised service points
  it("Criterion C: Manager cannot delegate unauthorised service points", () => {
    const store = usePewa.getState();
    const orgId = store.organisation!.id;

    const mgrIdentity = store.upsertPersonalIdentity({
      fullName: "Counter Manager",
      email: "counter.mgr@greengarden.example",
    });
    store.seedScenarioMembership({
      identityId: mgrIdentity.id,
      orgId,
      role: "manager",
      status: "active",
      venueId: "venue_ggc",
    });

    usePewa.setState({ personalIdentity: mgrIdentity, role: "manager" });
    usePewa.setState((s) => ({
      memberships: (s.memberships || []).map((m) =>
        m.identityId === mgrIdentity.id
          ? {
              ...m,
              scopeType: "restricted",
              venueIds: ["venue_ggc"],
              servicePoints: ["Barista Station"],
            }
          : m,
      ),
    }));

    // Manager attempts to delegate unpermitted service point
    const inviteRes = usePewa.getState().createInvitation({
      recipientContact: "kitchen.staff@greengarden.example",
      role: "staff",
      scopeType: "restricted",
      venueIds: ["venue_ggc"],
      servicePoints: ["Main Kitchen", "Barista Station"],
    });

    expect(inviteRes.success).toBe(false);
    expect(inviteRes.error).toContain("beyond their own assigned stations");
  });

  // Criterion D: Manager cannot expand existing Staff permissions beyond their own scope
  it("Criterion D: Manager cannot expand existing Staff permissions beyond their own scope", () => {
    const store = usePewa.getState();
    const orgId = store.organisation!.id;

    // Create manager with venue_ggc and Barista Station
    const mgrIdentity = store.upsertPersonalIdentity({
      fullName: "Barista Manager",
      email: "barista.mgr@greengarden.example",
    });
    store.seedScenarioMembership({
      identityId: mgrIdentity.id,
      orgId,
      role: "manager",
      status: "active",
      venueId: "venue_ggc",
    });

    // Create staff member
    const staffIdentity = store.upsertPersonalIdentity({
      fullName: "Junior Barista",
      email: "junior@greengarden.example",
    });
    const staffMem = store.seedScenarioMembership({
      identityId: staffIdentity.id,
      orgId,
      role: "staff",
      status: "active",
      venueId: "venue_ggc",
    })!;

    usePewa.setState({ personalIdentity: mgrIdentity, role: "manager" });
    usePewa.setState((s) => ({
      memberships: (s.memberships || []).map((m) =>
        m.identityId === mgrIdentity.id
          ? {
              ...m,
              scopeType: "restricted",
              venueIds: ["venue_ggc"],
              servicePoints: ["Barista Station"],
            }
          : m,
      ),
    }));

    // 1. Manager attempts to grant organisation-wide access
    const expandOrgWide = usePewa.getState().updateMembershipScope({
      membershipId: staffMem.id,
      scopeType: "all",
    });
    expect(expandOrgWide.success).toBe(false);
    expect(expandOrgWide.error).toContain(
      "Restricted managers cannot grant organisation-wide access",
    );

    // 2. Manager attempts to assign out-of-scope venue
    const expandVenue = usePewa.getState().updateMembershipScope({
      membershipId: staffMem.id,
      scopeType: "restricted",
      venueIds: ["venue_ggc", "venue_horizon"],
    });
    expect(expandVenue.success).toBe(false);
    expect(expandVenue.error).toContain("within their own assigned locations");

    // 3. Manager attempts to assign out-of-scope station
    const expandStation = usePewa.getState().updateMembershipScope({
      membershipId: staffMem.id,
      scopeType: "restricted",
      venueIds: ["venue_ggc"],
      servicePoints: ["Main Kitchen"],
    });
    expect(expandStation.success).toBe(false);
    expect(expandStation.error).toContain("beyond their own assigned stations");

    // 4. Valid assignment within manager's scope succeeds
    const validUpdate = usePewa.getState().updateMembershipScope({
      membershipId: staffMem.id,
      scopeType: "restricted",
      venueIds: ["venue_ggc"],
      servicePoints: ["Barista Station"],
    });
    expect(validUpdate.success).toBe(true);
  });

  // Criterion E: Owner and Administrator invitations with valid multi-location assignments succeed
  it("Criterion E: Owner and Administrator invitations with valid multi-location assignments succeed", () => {
    // Load multi-location organisation scenario (Horizon Hospitality Group with Sol Bakery & Gelato Lab)
    usePewa.getState().loadScenario("multi-brand");
    const store = usePewa.getState();
    store.setRole("owner");

    // Owner creates multi-location manager invitation
    const ownerInvRes = store.createInvitation({
      recipientContact: "multimgr@multibrand.example",
      role: "manager",
      scopeType: "restricted",
      venueIds: ["venue_sol", "venue_gelato"],
      servicePoints: ["Main Counter"],
    });
    expect(ownerInvRes.success).toBe(true);
    expect(ownerInvRes.invitation?.venueIds).toEqual(["venue_sol", "venue_gelato"]);

    // Admin creates multi-location staff invitation
    store.setRole("admin");
    const adminInvRes = store.createInvitation({
      recipientContact: "multistaff@multibrand.example",
      role: "staff",
      scopeType: "restricted",
      venueIds: ["venue_sol", "venue_gelato"],
      servicePoints: ["Counter"],
    });
    expect(adminInvRes.success).toBe(true);
    expect(adminInvRes.invitation?.venueIds).toEqual(["venue_sol", "venue_gelato"]);
  });

  // Criterion F: Invalid cross-organisation venue assignments are rejected
  it("Criterion F: Invalid cross-organisation venue assignments are rejected", () => {
    const store = usePewa.getState();
    store.setRole("owner");

    // 1. Cross-org venue in createInvitation
    const foreignInviteRes = store.createInvitation({
      recipientContact: "staff@foreign.example",
      role: "staff",
      scopeType: "restricted",
      venueIds: ["venue_horizon_main"], // Foreign venue belonging to org_horizon
    });
    expect(foreignInviteRes.success).toBe(false);
    expect(foreignInviteRes.error).toContain(
      "Assigned locations must belong to the target organisation",
    );

    // 2. Cross-org venue in updateMembershipScope
    const currentMem = getActiveOrganisationMembership(usePewa.getState())!;
    const foreignUpdateRes = store.updateMembershipScope({
      membershipId: currentMem.id,
      scopeType: "restricted",
      venueIds: ["venue_horizon_main"],
    });
    expect(foreignUpdateRes.success).toBe(false);
    expect(foreignUpdateRes.error).toContain(
      "Assigned locations must belong to the current organisation",
    );
  });

  // Criterion G: Invitation acceptance into Organisation B preserves existing membership in Organisation A
  it("Criterion G: Invitation acceptance into Organisation B preserves existing membership in Organisation A", () => {
    const store = usePewa.getState();

    // Establish personal identity with active Owner membership in org_ggc
    const user = store.upsertPersonalIdentity({
      fullName: "Multi-Org User",
      email: "multiorg@example.com",
    });
    store.seedScenarioMembership({
      identityId: user.id,
      orgId: "org_ggc",
      role: "owner",
      status: "active",
    });
    usePewa.setState({ personalIdentity: user, role: "owner" });

    // Verify initial membership in org_ggc
    const initialMems = (usePewa.getState().memberships || []).filter(
      (m) => m.identityId === user.id && m.status === "active",
    );
    expect(initialMems.length).toBe(1);
    expect(initialMems[0].orgId).toBe("org_ggc");

    // Create an invitation to org_horizon
    const horizonInvite: TeamInvitation = {
      id: "inv_horizon_test",
      token: "tok_horizon_test",
      orgId: "org_horizon",
      orgName: "The Grand Horizon Hotel Ltd",
      recipientContact: "multiorg@example.com",
      recipientName: "Multi-Org User",
      role: "manager",
      scopeType: "all",
      invitedById: "id_admin_kevin",
      invitedByName: "Kevin Omondi",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      status: "pending",
    };
    usePewa.setState((s) => ({
      invitations: [horizonInvite, ...(s.invitations || [])],
    }));

    // Accept invitation to org_horizon
    const acceptRes = usePewa.getState().acceptInvitation("tok_horizon_test");
    expect(acceptRes.success).toBe(true);

    // Verify memberships: BOTH org_ggc and org_horizon memberships are preserved and active
    const activeMems = (usePewa.getState().memberships || []).filter(
      (m) => m.identityId === user.id && m.status === "active",
    );
    expect(activeMems.length).toBe(2);
    expect(activeMems.some((m) => m.orgId === "org_ggc" && m.role === "owner")).toBe(true);
    expect(activeMems.some((m) => m.orgId === "org_horizon" && m.role === "manager")).toBe(true);
  });

  // Criterion H: Newly accepted member enters the correct organisation context in the store
  it("Criterion H: Newly accepted member enters the correct organisation context in the store", () => {
    const store = usePewa.getState();

    const invitee = store.upsertPersonalIdentity({
      fullName: "Context Check Invitee",
      email: "context@example.com",
    });
    usePewa.setState({ personalIdentity: invitee, role: "customer" });

    const invite: TeamInvitation = {
      id: "inv_ctx_test",
      token: "tok_ctx_test",
      orgId: "org_horizon",
      orgName: "The Grand Horizon Hotel Ltd",
      recipientContact: "context@example.com",
      role: "staff",
      scopeType: "all",
      invitedById: "id_founder_njeri",
      invitedByName: "Njeri Mwangi",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      status: "pending",
    };
    usePewa.setState((s) => ({
      invitations: [invite, ...(s.invitations || [])],
    }));

    // Accept invitation
    const acceptRes = usePewa.getState().acceptInvitation("tok_ctx_test");
    expect(acceptRes.success).toBe(true);

    // Verify active context in store
    const state = usePewa.getState();
    expect(state.organisation?.id).toBe("org_horizon");
    expect(state.organisation?.name).toBe("The Grand Horizon Hotel Ltd");
    expect(state.role).toBe("staff");
    expect(getEffectiveBusinessRole(state)).toBe("staff");
  });

  // Criterion I: Existing active membership is not overwritten unexpectedly
  it("Criterion I: Existing active membership is not overwritten unexpectedly", () => {
    const store = usePewa.getState();
    const orgId = store.organisation!.id;

    // Existing active manager
    const manager = store.upsertPersonalIdentity({
      fullName: "Existing Manager",
      email: "existing.mgr@greengarden.example",
    });
    store.seedScenarioMembership({
      identityId: manager.id,
      orgId,
      role: "manager",
      status: "active",
      venueId: "venue_ggc",
    });
    usePewa.setState({ personalIdentity: manager, role: "manager" });

    // Seed invitation with staff role for the same user in same org
    const staffInvite: TeamInvitation = {
      id: "inv_overwrite_test",
      token: "tok_overwrite_test",
      orgId,
      orgName: store.organisation!.name,
      recipientContact: "existing.mgr@greengarden.example",
      role: "staff",
      scopeType: "restricted",
      venueIds: ["venue_ggc"],
      invitedById: "id_founder_njeri",
      invitedByName: "Njeri Mwangi",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      status: "pending",
    };
    usePewa.setState((s) => ({
      invitations: [staffInvite, ...(s.invitations || [])],
    }));

    // Attempt to accept
    const acceptRes = usePewa.getState().acceptInvitation("tok_overwrite_test");
    expect(acceptRes.success).toBe(false);
    expect(acceptRes.error).toContain("already hold an active “Business Manager” membership");

    // Existing membership remains untouched as manager
    const mem = (usePewa.getState().memberships || []).find(
      (m) => m.identityId === manager.id && m.orgId === orgId,
    );
    expect(mem?.role).toBe("manager");
    expect(mem?.status).toBe("active");
  });

  // Criterion J: Cancelled, expired and redeemed invitations remain unusable
  it("Criterion J: Cancelled, expired and redeemed invitations remain unusable", () => {
    const store = usePewa.getState();
    store.setRole("owner");

    // 1. Redeemed invitation cannot be reused
    const redeemedInvite: TeamInvitation = {
      id: "inv_redeemed_test",
      token: "tok_redeemed_test",
      orgId: "org_ggc",
      orgName: "Green Garden Café Ltd",
      recipientContact: "redeemed@example.com",
      role: "staff",
      scopeType: "all",
      invitedById: "id_founder_njeri",
      invitedByName: "Njeri Mwangi",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      status: "accepted",
      acceptedAt: new Date().toISOString(),
    };

    // 2. Cancelled invitation cannot be accepted
    const cancelledInvite: TeamInvitation = {
      id: "inv_cancelled_test",
      token: "tok_cancelled_test",
      orgId: "org_ggc",
      orgName: "Green Garden Café Ltd",
      recipientContact: "cancelled@example.com",
      role: "staff",
      scopeType: "all",
      invitedById: "id_founder_njeri",
      invitedByName: "Njeri Mwangi",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
    };

    // 3. Expired invitation cannot be accepted
    const expiredInvite: TeamInvitation = {
      id: "inv_expired_test",
      token: "tok_expired_test",
      orgId: "org_ggc",
      orgName: "Green Garden Café Ltd",
      recipientContact: "expired@example.com",
      role: "staff",
      scopeType: "all",
      invitedById: "id_founder_njeri",
      invitedByName: "Njeri Mwangi",
      createdAt: new Date(Date.now() - 100000000).toISOString(),
      expiresAt: new Date(Date.now() - 10000).toISOString(), // expired
      status: "pending",
    };

    usePewa.setState((s) => ({
      invitations: [redeemedInvite, cancelledInvite, expiredInvite, ...(s.invitations || [])],
    }));

    const redeemRes = store.acceptInvitation("tok_redeemed_test", {
      fullName: "Redeemed User",
      email: "redeemed@example.com",
    });
    expect(redeemRes.success).toBe(false);
    expect(redeemRes.error).toContain("already accepted");

    const cancelRes = store.acceptInvitation("tok_cancelled_test", {
      fullName: "Cancelled User",
      email: "cancelled@example.com",
    });
    expect(cancelRes.success).toBe(false);
    expect(cancelRes.error).toContain("cancelled");

    const expireRes = store.acceptInvitation("tok_expired_test", {
      fullName: "Expired User",
      email: "expired@example.com",
    });
    expect(expireRes.success).toBe(false);
    expect(expireRes.error).toContain("expired");
  });

  // Criterion K: Multi-organisation switching allows seamless workspace transition
  it("Criterion K: Multi-organisation switching allows seamless workspace transition", () => {
    const store = usePewa.getState();

    // User belongs to both org_ggc and org_horizon
    const multiUser = store.upsertPersonalIdentity({
      fullName: "Dual Org User",
      email: "dual@example.com",
    });
    store.seedScenarioMembership({
      identityId: multiUser.id,
      orgId: "org_ggc",
      role: "manager",
      status: "active",
      venueId: "venue_ggc",
    });
    store.seedScenarioMembership({
      identityId: multiUser.id,
      orgId: "org_horizon",
      role: "admin",
      status: "active",
    });

    usePewa.setState({ personalIdentity: multiUser });

    // Switch to org_ggc
    const switchGgc = store.switchOrganisation("org_ggc");
    expect(switchGgc.success).toBe(true);
    expect(usePewa.getState().organisation?.id).toBe("org_ggc");
    expect(getEffectiveBusinessRole(usePewa.getState())).toBe("manager");

    // Switch to org_horizon
    const switchHorizon = store.switchOrganisation("org_horizon");
    expect(switchHorizon.success).toBe(true);
    expect(usePewa.getState().organisation?.id).toBe("org_horizon");
    expect(getEffectiveBusinessRole(usePewa.getState())).toBe("admin");

    // Attempt switch to an org where user has no active membership
    const switchUnknown = store.switchOrganisation("org_nonexistent");
    expect(switchUnknown.success).toBe(false);
    expect(switchUnknown.error).toContain("No active membership found");
  });
});
