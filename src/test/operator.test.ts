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

describe("Slice P6 — PEWA Operator Console & Guardrails", () => {
  beforeEach(() => {
    usePewa.getState().loadScenario("units-available");
  });

  describe("Operator Role Guardrails (Technical Prohibitions)", () => {
    it("prohibits operator from authoring menus and modifying prices", () => {
      expect(canAuthorMenus("operator")).toBe(false);
      expect(canToggleAvailability("operator")).toBe(false);
    });

    it("prohibits operator from managing orders or marking orders ready", () => {
      expect(canManageOrders("operator")).toBe(false);
    });

    it("prohibits operator from merchant billing management", () => {
      expect(canManageBilling("operator")).toBe(false);
    });

    it("prohibits operator from managing merchant in-menu promotions", () => {
      expect(canManagePromotions("operator")).toBe(false);
    });

    it("excludes operator from isBusinessRole check", () => {
      expect(isBusinessRole("operator")).toBe(false);
      expect(isBusinessRole("owner")).toBe(true);
      expect(isBusinessRole("staff")).toBe(true);
      expect(isBusinessRole("customer")).toBe(false);
    });

    it("rejects order acceptance when acting as operator", () => {
      const s = usePewa.getState();
      s.setRole("operator");

      // Attempt to submit an order then accept as operator
      s.visitVenue("venue_ggc");
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
        guestName: "Alice",
        guestContact: "0711000000",
        service: "Dine-in",
        note: "Table 4",
      });

      expect(id).toBeDefined();

      const accepted = usePewa.getState().acceptOrder(id!);
      expect(accepted).toBe(false);

      const order = usePewa.getState().orders.find((o) => o.id === id);
      expect(order?.status).toBe("pending");
      expect(order?.unitConsumed).toBe(false);
    });
  });

  describe("Bounded Tenant Management", () => {
    it("suspends tenant with reason note and logs audit event", () => {
      const s = usePewa.getState();
      const orgId = s.organisation!.id;

      s.setOrganisationStatus(orgId, "suspended", "Policy review regarding allergy reports");

      const updated = usePewa.getState().organisation;
      expect(updated?.status).toBe("suspended");
      expect(updated?.statusNote).toBe("Policy review regarding allergy reports");

      const auditEvent = usePewa.getState().activity.find((a) => a.kind === "operator.org_status");
      expect(auditEvent).toBeDefined();
      expect(auditEvent?.message).toContain("suspended");
    });

    it("reactivates tenant access", () => {
      const s = usePewa.getState();
      const orgId = s.organisation!.id;

      s.setOrganisationStatus(orgId, "suspended", "Audit pending");
      expect(usePewa.getState().organisation?.status).toBe("suspended");

      s.setOrganisationStatus(orgId, "active");
      expect(usePewa.getState().organisation?.status).toBe("active");
    });
  });

  describe("Commercial Dispute Resolution & Credit Adjustments", () => {
    it("resolves dispute with credit adjustment and updates unit balance", () => {
      const s = usePewa.getState();
      const initialUnits = s.orderPolicy.included;

      expect(s.disputes.length).toBeGreaterThan(0);
      const disputeCase = s.disputes[0]!;

      s.resolveDisputeCase(
        disputeCase.id,
        "resolved",
        2,
        "Double-tap verified; 2 units reimbursed.",
      );

      const updatedCase = usePewa.getState().disputes.find((d) => d.id === disputeCase.id);
      expect(updatedCase?.status).toBe("resolved");
      expect(updatedCase?.adjustmentUnits).toBe(2);
      expect(updatedCase?.resolutionNote).toBe("Double-tap verified; 2 units reimbursed.");

      expect(usePewa.getState().orderPolicy.included).toBe(initialUnits + 2);

      const auditEvent = usePewa
        .getState()
        .activity.find((a) => a.kind === "operator.dispute_resolved");
      expect(auditEvent).toBeDefined();
      expect(auditEvent?.message).toContain("+2 units");
    });

    it("dismisses dispute without adding credit units", () => {
      const s = usePewa.getState();
      const initialUnits = s.orderPolicy.included;
      const disputeCase = s.disputes[0]!;

      s.resolveDisputeCase(disputeCase.id, "dismissed", 0, "No duplicate deduction detected.");

      const updatedCase = usePewa.getState().disputes.find((d) => d.id === disputeCase.id);
      expect(updatedCase?.status).toBe("dismissed");
      expect(usePewa.getState().orderPolicy.included).toBe(initialUnits);
    });
  });

  describe("Content Moderation Oversight", () => {
    it("resolves moderation case and logs action taken", () => {
      const s = usePewa.getState();
      expect(s.moderationCases.length).toBeGreaterThan(0);
      const modCase = s.moderationCases[0]!;

      s.resolveModerationCase(
        modCase.id,
        "Allergen warning added to description and menu re-published.",
      );

      const updatedCase = usePewa.getState().moderationCases.find((m) => m.id === modCase.id);
      expect(updatedCase?.status).toBe("resolved");
      expect(updatedCase?.actionTaken).toContain("Allergen warning added");

      const auditEvent = usePewa
        .getState()
        .activity.find((a) => a.kind === "operator.moderation_resolved");
      expect(auditEvent).toBeDefined();
    });
  });
});
