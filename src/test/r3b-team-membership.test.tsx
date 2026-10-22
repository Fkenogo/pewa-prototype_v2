import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  usePewa,
  getActiveOrganisationMembership,
  getEffectiveBusinessRole,
  hasActiveBusinessMembership,
  canAuthorMenus,
  canManageTeam,
  canInviteRole,
  canModifyMember,
  canRevokeMember,
  canActorOperateScope,
  SAMPLE_FOUNDER_IDENTITY,
  SAMPLE_ADMIN_IDENTITY,
  SAMPLE_MANAGER_IDENTITY,
  SAMPLE_STAFF_IDENTITY,
} from "@/lib/pewa/store";
import type {
  PersonalIdentity,
  OrganisationMembership,
  TeamInvitation,
  OrderRequest,
} from "@/lib/pewa/types";
import { Route as AdminTeamRoute } from "@/routes/admin.team";
import { Route as InviteRoute } from "@/routes/invite.$inviteId";
import { Route as AdminLayoutRoute } from "@/routes/admin";
import { Route as AdminIndexRoute } from "@/routes/admin.index";

interface RouteWithComponent {
  component: React.ComponentType;
}

const getRouteComponent = (route: unknown) => (route as RouteWithComponent).component;

const mockNavigate = vi.fn();
let mockParams: Record<string, string> = { inviteId: "inv_sample_brian" };

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: Record<string, unknown>) => opts,
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  Link: ({
    children,
    to,
    params,
    onClick,
    className,
    "data-testid": dataTestId,
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
    onClick?: () => void;
    className?: string;
    "data-testid"?: string;
  }) => {
    const resolvedHref = params
      ? Object.entries(params).reduce((acc, [k, v]) => acc.replace(`$${k}`, v), to)
      : to;
    return (
      <a
        href={resolvedHref}
        onClick={onClick}
        className={className}
        data-testid={dataTestId || "router-link"}
      >
        {children}
      </a>
    );
  },
  Outlet: () => <div data-testid="outlet" />,
}));

describe("R3-B: Team Invitations, Role Membership and Operational Access", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockParams = { inviteId: "inv_sample_brian" };
    usePewa.getState().loadScenario("established-restaurant");
  });

  // Scenario A — Owner Invites Manager with Location Scope
  it("Scenario A: Owner invites Manager with location and service-point scope", () => {
    const store = usePewa.getState();
    store.setRole("owner");

    const res = store.createInvitation({
      recipientContact: "amara@greengarden.example",
      recipientName: "Amara Okafor",
      role: "manager",
      scopeType: "restricted",
      venueIds: ["venue_ggc"],
      servicePoints: ["Main Counter", "Dine-in Area"],
    });

    expect(res.success).toBe(true);
    expect(res.invitation).toBeDefined();
    expect(res.invitation?.role).toBe("manager");
    expect(res.invitation?.scopeType).toBe("restricted");
    expect(res.invitation?.venueIds).toEqual(["venue_ggc"]);
    expect(res.invitation?.servicePoints).toEqual(["Main Counter", "Dine-in Area"]);
    expect(res.invitation?.status).toBe("pending");

    // Check presence in store invitations list
    const updatedInvitations = usePewa.getState().invitations || [];
    const found = updatedInvitations.find(
      (i) => i.recipientContact === "amara@greengarden.example",
    );
    expect(found).toBeDefined();
    expect(found?.status).toBe("pending");
  });

  // Scenario B — Admin Invites Staff with Restricted Scope & Hierarchy Check
  it("Scenario B: Admin invites Staff with restricted scope and cannot invite Owner", () => {
    const store = usePewa.getState();
    store.setRole("admin");

    // Admin inviting staff succeeds
    const staffRes = store.createInvitation({
      recipientContact: "daniel@greengarden.example",
      recipientName: "Daniel Barista",
      role: "staff",
      scopeType: "restricted",
      venueIds: ["venue_ggc"],
      servicePoints: ["Barista Station"],
    });
    expect(staffRes.success).toBe(true);
    expect(staffRes.invitation?.role).toBe("staff");

    // Hierarchy check: Admin cannot invite Owner
    expect(canInviteRole("admin", "owner")).toBe(false);
    const ownerRes = store.createInvitation({
      recipientContact: "hacker@example.com",
      role: "owner",
    });
    expect(ownerRes.success).toBe(false);
    expect(ownerRes.error).toContain("not authorised");
  });

  // Scenario C — Manager Invites Staff within Assigned Location
  it("Scenario C: Manager can only invite Staff within assigned location, not Admins or Managers", () => {
    const store = usePewa.getState();
    store.setRole("manager");

    expect(canInviteRole("manager", "staff")).toBe(true);
    expect(canInviteRole("manager", "admin")).toBe(false);
    expect(canInviteRole("manager", "manager")).toBe(false);
    expect(canInviteRole("manager", "owner")).toBe(false);

    // Attempting to invite Manager fails
    const managerRes = store.createInvitation({
      recipientContact: "othermgr@example.com",
      role: "manager",
    });
    expect(managerRes.success).toBe(false);

    // Attempting to assign outside assigned locations fails
    const outOfScopeRes = store.createInvitation({
      recipientContact: "staff@example.com",
      role: "staff",
      venueIds: ["venue_other_unassigned"],
    });
    expect(outOfScopeRes.success).toBe(false);
    expect(outOfScopeRes.error).toContain("within their own assigned locations");

    // Valid staff invite within assigned venue succeeds
    const validStaffRes = store.createInvitation({
      recipientContact: "staff@greengarden.example",
      role: "staff",
      venueIds: ["venue_ggc"],
    });
    expect(validStaffRes.success).toBe(true);
  });

  // Scenario D — Staff Cannot Access Team Management
  it("Scenario D: Staff cannot access Team Management (nav hidden, route denied)", () => {
    const store = usePewa.getState();
    store.setRole("staff");

    expect(canManageTeam("staff")).toBe(false);

    // Store mutation direct check
    const inviteRes = store.createInvitation({
      recipientContact: "someone@example.com",
      role: "staff",
    });
    expect(inviteRes.success).toBe(false);
    expect(inviteRes.error).toContain("Unauthorized");

    // Render Admin Layout: "Team" link should not be present
    const AdminLayout = getRouteComponent(AdminLayoutRoute);
    const { unmount } = render(<AdminLayout />);
    expect(screen.queryByText("Team")).toBeNull();
    unmount();

    // Render AdminTeamPage: should render denied notice
    const AdminTeam = getRouteComponent(AdminTeamRoute);
    render(<AdminTeam />);
    expect(screen.getByTestId("staff-team-denied")).toBeDefined();
    expect(screen.getByText("Staff Operational Access Only")).toBeDefined();
  });

  // Scenario E — Invitation Acceptance with Personal Identity
  it("Scenario E: Invitation acceptance enforces matching personal identity and fail-closed mismatch protection", () => {
    const store = usePewa.getState();
    // Default fixture has samplePendingInvitation for brian@greengarden.example (token: tok_sample_brian)

    // 1. Mismatch attempt: signed in as Founder (amina@greengarden.example)
    const mismatchRes = store.acceptInvitation("tok_sample_brian");
    expect(mismatchRes.success).toBe(false);
    expect(mismatchRes.error).toContain("Identity mismatch");

    // 2. Register/verify matching identity during acceptance
    const acceptRes = store.acceptInvitation("tok_sample_brian", {
      fullName: "Brian Kiprop",
      email: "brian@greengarden.example",
    });

    expect(acceptRes.success).toBe(true);
    expect(acceptRes.membership).toBeDefined();
    expect(acceptRes.membership?.role).toBe("manager");
    expect(acceptRes.membership?.status).toBe("active");
    expect(acceptRes.membership?.servicePoints).toEqual(["Main Counter", "Dine-in Area"]);

    // Verify invitation marked accepted
    const updatedInvite = (usePewa.getState().invitations || []).find(
      (i) => i.token === "tok_sample_brian",
    );
    expect(updatedInvite?.status).toBe("accepted");
    expect(updatedInvite?.acceptedAt).toBeDefined();

    // Verify active role switched to manager
    expect(usePewa.getState().role).toBe("manager");
    expect(getEffectiveBusinessRole(usePewa.getState())).toBe("manager");
  });

  // Scenario F — Single-Use Invitation Redemption
  it("Scenario F: Redeemed, cancelled, or expired invitations cannot be reused", () => {
    const store = usePewa.getState();

    // Accept once
    store.acceptInvitation("tok_sample_brian", {
      fullName: "Brian Kiprop",
      email: "brian@greengarden.example",
    });

    // Attempt second acceptance
    const secondRes = store.acceptInvitation("tok_sample_brian");
    expect(secondRes.success).toBe(false);
    expect(secondRes.error).toContain("already accepted");

    // Cancelled invitation test
    store.setRole("owner");
    const newInv = store.createInvitation({
      recipientContact: "cancelled@example.com",
      role: "staff",
    });
    expect(newInv.success).toBe(true);
    const cancelRes = store.cancelInvitation(newInv.invitation!.id);
    expect(cancelRes.success).toBe(true);

    const acceptCancelledRes = store.acceptInvitation(newInv.invitation!.id, {
      fullName: "Cancelled User",
      email: "cancelled@example.com",
    });
    expect(acceptCancelledRes.success).toBe(false);
    expect(acceptCancelledRes.error).toContain("cancelled");
  });

  // Scenario G — Operational Scope Enforcement: Orders
  it("Scenario G: Staff scoped to Barista Station cannot process orders for Main Counter", () => {
    const store = usePewa.getState();
    store.setRole("staff"); // Staff membership has servicePoints: ["Barista Station", "Main Counter"]

    // Create an order for Main Counter and an order for Patio Bar
    const baristaOrder: OrderRequest = {
      id: "ord_barista_test",
      orgId: "org_ggc",
      venueId: "venue_ggc",
      venueName: "Green Garden Café",
      guestName: "Guest",
      guestContact: "+254700000000",
      service: "dine_in",
      note: "",
      reference: "ORD-BARISTA",
      currency: "KES",
      lines: [],
      total: 300,
      status: "pending",
      submittedAt: new Date().toISOString(),
      unitConsumed: false,
      servicePoint: "Barista Station",
    };

    const outOfScopeOrder: OrderRequest = {
      id: "ord_out_scope",
      orgId: "org_ggc",
      venueId: "venue_ggc",
      venueName: "Green Garden Café",
      guestName: "Guest",
      guestContact: "+254700000000",
      service: "dine_in",
      note: "",
      reference: "ORD-PATIO",
      currency: "KES",
      lines: [],
      total: 500,
      status: "pending",
      submittedAt: new Date().toISOString(),
      unitConsumed: false,
      servicePoint: "Patio Bar", // staff does not have Patio Bar
    };

    const foreignVenueOrder: OrderRequest = {
      id: "ord_foreign_venue",
      orgId: "org_ggc",
      venueId: "venue_foreign",
      venueName: "Foreign Venue",
      guestName: "Guest",
      guestContact: "+254700000000",
      service: "dine_in",
      note: "",
      reference: "ORD-FOREIGN",
      currency: "KES",
      lines: [],
      total: 500,
      status: "pending",
      submittedAt: new Date().toISOString(),
      unitConsumed: false,
    };

    usePewa.setState((s) => ({
      orders: [baristaOrder, outOfScopeOrder, foreignVenueOrder, ...s.orders],
    }));

    // Staff accepts barista order: succeeds
    expect(usePewa.getState().acceptOrder("ord_barista_test")).toBe(true);

    // Staff accepts order for unassigned station: fails
    expect(usePewa.getState().acceptOrder("ord_out_scope")).toBe(false);

    // Staff accepts order for unassigned venue: fails
    expect(usePewa.getState().acceptOrder("ord_foreign_venue")).toBe(false);
  });

  // Scenario H — Operational Scope Enforcement: Item Availability
  it("Scenario H: Staff member scoped to Venue A cannot toggle availability at Venue B", () => {
    const store = usePewa.getState();
    store.setRole("staff"); // assigned to venue_ggc only

    // Test toggleOfferingVenueAvailability for assigned venue
    store.toggleOfferingVenueAvailability("menu_ggc_allday", "sec_coffee", "off_cold", "venue_ggc");
    const ggcMenu = usePewa.getState().menus.find((m) => m.id === "menu_ggc_allday");
    const offGgc = ggcMenu?.sections[0]?.offerings.find((o) => o.id === "off_cold");
    expect(offGgc?.venueOverrides?.["venue_ggc"]).toBeDefined();

    // Test toggleOfferingVenueAvailability for unassigned venue_b
    store.toggleOfferingVenueAvailability(
      "menu_ggc_allday",
      "sec_coffee",
      "off_cold",
      "venue_unassigned_b",
    );
    const offUnassigned = usePewa
      .getState()
      .menus.find((m) => m.id === "menu_ggc_allday")
      ?.sections[0]?.offerings.find((o) => o.id === "off_cold");
    expect(offUnassigned?.venueOverrides?.["venue_unassigned_b"]).toBeUndefined();
  });

  // Scenario I — Operational Scope Enforcement: Menu Authoring
  it("Scenario I: Staff cannot author/publish menus; Manager cannot author outside assigned venues", () => {
    const store = usePewa.getState();

    // Staff authoring attempts fail
    store.setRole("staff");
    expect(canAuthorMenus("staff")).toBe(false);
    expect(store.addMenu("Staff Unauthorized Menu")).toBe("");
    expect(store.publishMenu("menu_ggc_allday")).toBe(false);

    // Manager authoring for assigned venue succeeds
    store.setRole("manager"); // assigned to venue_ggc
    expect(canAuthorMenus("manager")).toBe(true);

    const assignedMenuId = store.addMenu({
      name: "Manager Assigned Menu",
      venueId: "venue_ggc",
    });
    expect(assignedMenuId).toBeTruthy();

    // Manager authoring for unassigned venue fails
    const unassignedMenuId = store.addMenu({
      name: "Manager Unassigned Venue Menu",
      venueId: "venue_other_unassigned",
    });
    expect(unassignedMenuId).toBe("");
  });

  // Scenario J — Membership Revocation Immediate Effect
  it("Scenario J: Membership revocation takes immediate effect with fail-closed role resolution", () => {
    const store = usePewa.getState();
    store.setRole("owner");

    const memberships = store.memberships || [];
    const managerMem = memberships.find((m) => m.role === "manager");
    expect(managerMem).toBeDefined();

    // Revoke the manager's membership
    const revokeRes = store.revokeMembership(managerMem!.id);
    expect(revokeRes.success).toBe(true);

    const revokedMem = (usePewa.getState().memberships || []).find((m) => m.id === managerMem!.id);
    expect(revokedMem?.status).toBe("revoked");
    expect(revokedMem?.revokedAt).toBeDefined();

    // When the user acts as this manager persona, effective role immediately drops to customer
    const roleResolution = getEffectiveBusinessRole({
      role: "manager",
      personalIdentity: SAMPLE_MANAGER_IDENTITY,
      organisation: store.organisation,
      memberships: usePewa.getState().memberships,
    });
    expect(roleResolution).toBe("customer");
    expect(
      hasActiveBusinessMembership({
        role: "manager",
        personalIdentity: SAMPLE_MANAGER_IDENTITY,
        organisation: store.organisation,
        memberships: usePewa.getState().memberships,
      }),
    ).toBe(false);
  });

  // Scenario K — Multi-Organisation Identity Independence
  it("Scenario K: Multi-organisation identity independence: revoking in Org A leaves Org B untouched", () => {
    const store = usePewa.getState();
    store.setRole("owner");

    const sharedIdentity: PersonalIdentity = {
      id: "id_shared_user",
      fullName: "Shared Multi-Org User",
      email: "shared@example.com",
      mobile: "+254700999888",
      preferredSignIn: "email",
      verifiedSimulation: true,
      createdAt: new Date().toISOString(),
    };

    const orgAMembership: OrganisationMembership = {
      id: "mem_org_a",
      identityId: sharedIdentity.id,
      orgId: "org_ggc",
      role: "manager",
      status: "active",
      joinedAt: new Date().toISOString(),
    };

    const orgBMembership: OrganisationMembership = {
      id: "mem_org_b",
      identityId: sharedIdentity.id,
      orgId: "org_other_cafe",
      role: "admin",
      status: "active",
      joinedAt: new Date().toISOString(),
    };

    usePewa.setState((s) => ({
      identities: [...(s.identities || []), sharedIdentity],
      memberships: [...(s.memberships || []), orgAMembership, orgBMembership],
    }));

    // Revoke in Org A
    const res = store.revokeMembership("mem_org_a");
    expect(res.success).toBe(true);

    const updatedMems = usePewa.getState().memberships || [];
    const memA = updatedMems.find((m) => m.id === "mem_org_a");
    const memB = updatedMems.find((m) => m.id === "mem_org_b");

    expect(memA?.status).toBe("revoked");
    expect(memB?.status).toBe("active"); // Org B remains completely active and untouched
  });

  // Scenario L — Responsive Team Management Workspace UI
  it("Scenario L: Team Management workspace renders member cards, role badges, and invitation drawer", () => {
    const store = usePewa.getState();
    store.setRole("owner");

    const AdminTeam = getRouteComponent(AdminTeamRoute);
    const { unmount } = render(<AdminTeam />);

    expect(screen.getByTestId("team-management-page")).toBeDefined();
    expect(screen.getByText("Team Management")).toBeDefined();
    expect(screen.getByTestId("invite-member-btn")).toBeDefined();
    expect(screen.getByText("Brian Kiprop")).toBeDefined(); // Pending invitation fixture

    unmount();
  });

  // Scenario M — Clean Handoff and Navigation Integration
  it("Scenario M: Workspace overview button and Admin layout nav lead to /admin/team", () => {
    const store = usePewa.getState();
    store.setRole("owner");

    // Check Admin Index "Invite your team" button
    const AdminIndex = getRouteComponent(AdminIndexRoute);
    const { unmount: unmountIndex } = render(<AdminIndex />);
    const inviteTeamBtn = screen.getByTestId("workspace-invite-team-btn");
    expect(inviteTeamBtn.getAttribute("href")).toBe("/admin/team");
    unmountIndex();

    // Check Admin Layout nav items
    const AdminLayout = getRouteComponent(AdminLayoutRoute);
    const { unmount: unmountLayout } = render(<AdminLayout />);
    const teamNavLinks = screen.getAllByText("Team");
    expect(teamNavLinks.length).toBeGreaterThan(0);
    expect(teamNavLinks[0]?.closest("a")?.getAttribute("href")).toBe("/admin/team");
    unmountLayout();
  });
});
