import { beforeEach, describe, expect, it } from "vitest";
import { usePewa } from "@/lib/pewa/store";

const separateBusiness = (orgName: string, venueName: string) =>
  usePewa.getState().completeOnboarding({
    orgName,
    businessType: "Café",
    category: "Café",
    country: "Kenya",
    currency: "KES",
    venueName,
    phone: "",
    whatsapp: "",
    email: "",
    deliveryOnly: true,
    address: "",
    serviceArea: "Nairobi",
    services: ["Delivery"],
    servicePointName: "Delivery",
    menuName: `${orgName} Menu`,
  });

describe("R3-E integration: multi-organisation onboarding continuity", () => {
  beforeEach(() => {
    usePewa.getState().loadScenario("established-restaurant");
  });

  it("preserves existing business records and memberships when registering separate organisations", () => {
    const initial = usePewa.getState();
    const firstOrgId = initial.organisation!.id;
    const firstVenueIds = initial.venues
      .filter((venue) => venue.orgId === firstOrgId)
      .map((v) => v.id);
    const firstMenuIds = initial.menus.filter((menu) => menu.orgId === firstOrgId).map((m) => m.id);
    const identityId = initial.personalIdentity!.id;
    const firstMembership = initial.memberships?.find(
      (membership) => membership.orgId === firstOrgId && membership.identityId === identityId,
    );

    separateBusiness("Zuri Delivery Kitchen", "Zuri Delivery");
    const second = usePewa.getState();
    const secondOrgId = second.organisation!.id;
    separateBusiness("Zuri Bakery", "Zuri Bakery Delivery");
    const third = usePewa.getState();
    const thirdOrgId = third.organisation!.id;

    expect(new Set([firstOrgId, secondOrgId, thirdOrgId]).size).toBe(3);
    expect(third.organisations?.map((organisation) => organisation.id)).toEqual(
      expect.arrayContaining([firstOrgId, secondOrgId, thirdOrgId]),
    );
    expect(third.venues.filter((venue) => venue.orgId === firstOrgId).map((v) => v.id)).toEqual(
      firstVenueIds,
    );
    expect(third.menus.filter((menu) => menu.orgId === firstOrgId).map((m) => m.id)).toEqual(
      firstMenuIds,
    );
    expect(firstMembership).toBeDefined();
    expect(third.memberships).toContainEqual(firstMembership);
    expect(third.venues.find((venue) => venue.orgId === secondOrgId)?.deliveryOnly).toBe(true);
    expect(third.venues.find((venue) => venue.orgId === thirdOrgId)?.deliveryOnly).toBe(true);

    expect(usePewa.getState().switchOrganisation(firstOrgId).success).toBe(true);
    expect(usePewa.getState().organisation?.id).toBe(firstOrgId);
    expect(usePewa.getState().venues.some((venue) => venue.orgId === firstOrgId)).toBe(true);
    expect(usePewa.getState().switchOrganisation(secondOrgId).success).toBe(true);
    expect(usePewa.getState().organisation?.id).toBe(secondOrgId);
    expect(usePewa.getState().switchOrganisation(thirdOrgId).success).toBe(true);
    expect(usePewa.getState().organisation?.id).toBe(thirdOrgId);
    expect(usePewa.getState().personalIdentity?.id).toBe(identityId);
  });
});
