import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  usePewa,
  getActiveOrganisationMembership,
  getEffectiveBusinessRole,
  hasActiveBusinessMembership,
} from "@/lib/pewa/store";
import { Route as OnboardingRoute } from "@/routes/onboarding";
import { Route as AdminLayoutRoute } from "@/routes/admin";
import { Route as AdminIndexRoute } from "@/routes/admin.index";

interface RouteWithComponent {
  component: React.ComponentType;
}

const getRouteComponent = (route: unknown) => (route as RouteWithComponent).component;

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: Record<string, unknown>) => opts,
  useNavigate: () => mockNavigate,
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

describe("R3-A: Business Registration, Personal Identity and Organisation Onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePewa.getState().reset();
  });

  describe("Scenario A & B — First-time individual begins without an existing business & creates reusable personal identity", () => {
    it("starts cleanly in new-cafe without an existing organisation or personal identity and creates a verified prototype identity", () => {
      usePewa.getState().loadScenario("new-cafe");
      const initialState = usePewa.getState();

      expect(initialState.organisation).toBeNull();
      expect(initialState.personalIdentity).toBeNull();
      expect(initialState.memberships).toHaveLength(0);

      const OnboardingComponent = getRouteComponent(OnboardingRoute);
      render(<OnboardingComponent />);

      // Step A is active
      expect(screen.getByTestId("onboarding-step-personal")).toBeInTheDocument();
      expect(screen.getByText(/Simulated Identity Verification/i)).toBeInTheDocument();

      // Fill Step A personal identity details
      fireEvent.change(screen.getByLabelText(/Full name/i), {
        target: { value: "Amina Odhiambo" },
      });
      fireEvent.change(screen.getByLabelText(/Email address/i), {
        target: { value: "amina@savannahroast.co.ke" },
      });
      fireEvent.change(screen.getByLabelText(/Mobile number/i), {
        target: { value: "+254711223344" },
      });

      // Simulate identity verification
      fireEvent.click(screen.getByTestId("simulate-verify-identity-btn"));

      // Click Continue to step 2
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      // Personal identity is created and persisted in the store
      const afterStepA = usePewa.getState();
      expect(afterStepA.personalIdentity).not.toBeNull();
      expect(afterStepA.personalIdentity?.fullName).toBe("Amina Odhiambo");
      expect(afterStepA.personalIdentity?.email).toBe("amina@savannahroast.co.ke");
      expect(afterStepA.personalIdentity?.mobile).toBe("+254711223344");
      expect(afterStepA.personalIdentity?.verifiedSimulation).toBe(true);
      expect(
        (afterStepA.identities || []).some((i) => i.email === "amina@savannahroast.co.ke"),
      ).toBe(true);

      // Step B is now displayed
      expect(screen.getByTestId("onboarding-step-organisation")).toBeInTheDocument();
    });
  });

  describe("Scenario C, F, H, J — Single-location café registration, private admin contact isolation, idempotency, and workspace handoff", () => {
    it("completes the 5-step onboarding for a single-location café, keeps private admin contact off guest menus, prevents duplicate submission, and appears in Business Workspace", () => {
      usePewa.getState().loadScenario("new-cafe");
      const OnboardingComponent = getRouteComponent(OnboardingRoute);
      const { unmount } = render(<OnboardingComponent />);

      // Step A: Personal details
      fireEvent.change(screen.getByLabelText(/Full name/i), {
        target: { value: "Kamau Njoroge" },
      });
      fireEvent.change(screen.getByLabelText(/Email address/i), {
        target: { value: "kamau@kilimanjarocafe.co.ke" },
      });
      fireEvent.click(screen.getByTestId("simulate-verify-identity-btn"));
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      // Step B: Organisation details
      expect(screen.getByTestId("onboarding-step-organisation")).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/Organisation name/i), {
        target: { value: "Kilimanjaro Hospitality Ltd" },
      });
      fireEvent.change(screen.getByLabelText(/Trading \/ business name/i), {
        target: { value: "Kilimanjaro Café" },
      });
      fireEvent.change(screen.getByLabelText(/Primary organisation contact/i), {
        target: { value: "legal-private@kilimanjarocafe.co.ke" },
      });
      // Default visibility is "private", proceed to Step C
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      // Step C: Business presence
      expect(screen.getByTestId("onboarding-step-presence")).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/Customer-facing business name/i), {
        target: { value: "Kilimanjaro Café Westlands" },
      });
      fireEvent.change(screen.getByLabelText(/Short description \/ tagline/i), {
        target: { value: "Single-origin espresso and artisan pastries." },
      });
      // Clear auto-filled public email so we verify private primary contact is never leaked
      fireEvent.change(screen.getByLabelText(/Public inquiry email/i), {
        target: { value: "" },
      });
      fireEvent.change(screen.getByLabelText(/Customer WhatsApp number/i), {
        target: { value: "+254799887766" },
      });
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      // Step D: Location & service configuration
      expect(screen.getByTestId("onboarding-step-location")).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/Street address & neighbourhood/i), {
        target: { value: "14 Muthithi Road, Westlands, Nairobi" },
      });
      fireEvent.change(screen.getByLabelText(/Initial service point or menu context/i), {
        target: { value: "Main Dining & Espresso Bar" },
      });
      fireEvent.change(screen.getByLabelText(/First menu name/i), {
        target: { value: "All-Day Café Menu" },
      });
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      // Step E: Review and creation
      expect(screen.getByTestId("onboarding-step-review")).toBeInTheDocument();
      expect(screen.getByText(/Kilimanjaro Hospitality Ltd/)).toBeInTheDocument();
      expect(screen.getByText(/Private — hidden from public menus/i)).toBeInTheDocument();

      // Create organisation & menu
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      // Completion handoff view appears with Invite Team preview
      expect(screen.getByTestId("onboarding-completion-handoff")).toBeInTheDocument();
      const inviteBtn = screen.getByRole("button", {
        name: /Invite your team \(Preview roles\)/i,
      });
      expect(inviteBtn).toBeInTheDocument();

      // Open the Invite Team preview modal and verify staged R3-B disclosure
      fireEvent.click(inviteBtn);
      expect(screen.getByText(/Invite your team \(Preview\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Live invitation dispatch, acceptance tokens/i)).toBeInTheDocument();

      const stateAfterComplete = usePewa.getState();
      expect(stateAfterComplete.organisation?.name).toBe("Kilimanjaro Hospitality Ltd");
      expect(stateAfterComplete.organisation?.tradingName).toBe("Kilimanjaro Café");
      expect(stateAfterComplete.organisation?.primaryContact).toBe(
        "legal-private@kilimanjarocafe.co.ke",
      );
      expect(stateAfterComplete.organisation?.primaryContactVisibility).toBe("private");

      // Scenario J: Private organisation contact is NOT exposed on public venue contact
      const createdVenue = stateAfterComplete.venues.find(
        (v) => v.orgId === stateAfterComplete.organisation?.id,
      );
      expect(createdVenue).toBeDefined();
      expect(createdVenue?.name).toBe("Kilimanjaro Café Westlands");
      expect(createdVenue?.contact.email).toBe("");
      expect(createdVenue?.contact.whatsapp).toBe("+254799887766");

      // Scenario H: Idempotency — calling completeOnboarding again with the same org & venue name does not duplicate records
      const orgVenuesCountBefore = stateAfterComplete.venues.filter(
        (v) => v.orgId === stateAfterComplete.organisation?.id,
      ).length;
      const orgMenusCountBefore = stateAfterComplete.menus.filter(
        (m) => m.orgId === stateAfterComplete.organisation?.id,
      ).length;
      const firstMenu = stateAfterComplete.menus.find(
        (m) => m.orgId === stateAfterComplete.organisation?.id,
      );

      const duplicateMenuId = usePewa.getState().completeOnboarding({
        orgName: "Kilimanjaro Hospitality Ltd",
        venueName: "Kilimanjaro Café Westlands",
        businessType: "cafe_bakery",
        category: "Cafe & Bakery",
        address: "14 Muthithi Road, Westlands, Nairobi",
        currency: "KES",
        tagline: "Single-origin espresso and artisan pastries.",
        phone: "",
        whatsapp: "+254799887766",
        email: "",
        deliveryOnly: false,
        services: ["Dine-in", "Takeaway"],
        menuName: "All-Day Café Menu",
      });

      const stateAfterDuplicate = usePewa.getState();
      expect(duplicateMenuId).toBe(firstMenu?.id);
      expect(
        stateAfterDuplicate.venues.filter((v) => v.orgId === stateAfterComplete.organisation?.id),
      ).toHaveLength(orgVenuesCountBefore);
      expect(
        stateAfterDuplicate.menus.filter((m) => m.orgId === stateAfterComplete.organisation?.id),
      ).toHaveLength(orgMenusCountBefore);

      unmount();

      // Scenario F: Completed business appears in Business Workspace (/admin)
      const AdminIndexComponent = getRouteComponent(AdminIndexRoute);
      render(<AdminIndexComponent />);
      expect(screen.getByTestId("workspace-organisation-summary")).toBeInTheDocument();
      expect(screen.getByText("Kilimanjaro Hospitality Ltd")).toBeInTheDocument();
      expect(screen.getByText(/Trading as Kilimanjaro Café/i)).toBeInTheDocument();
      expect(screen.getByText(/All-Day Café Menu/i)).toBeInTheDocument();
    });
  });

  describe("Scenario D — Delivery-only business onboarding without walk-in storefront requirement", () => {
    it("allows registering a delivery-only kitchen with a declared delivery coverage area and no physical walk-in address", () => {
      usePewa.getState().loadScenario("new-cafe");
      const OnboardingComponent = getRouteComponent(OnboardingRoute);
      render(<OnboardingComponent />);

      // Step A
      fireEvent.change(screen.getByLabelText(/Full name/i), {
        target: { value: "Tariq Hassan" },
      });
      fireEvent.change(screen.getByLabelText(/Mobile number/i), {
        target: { value: "+254722111999" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Mobile sign-in/i }));
      fireEvent.click(screen.getByTestId("simulate-verify-identity-btn"));
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      // Step B: Select Delivery & Cloud Kitchen
      fireEvent.change(screen.getByLabelText(/Organisation name/i), {
        target: { value: "Nairobi Cloud Kitchens Ltd" },
      });
      fireEvent.click(screen.getByText("Delivery & Cloud Kitchen"));
      fireEvent.change(screen.getByLabelText(/Primary organisation contact/i), {
        target: { value: "+254722111999" },
      });
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      // Step C: Delivery-only is selected
      fireEvent.change(screen.getByLabelText(/Customer-facing business name/i), {
        target: { value: "SmashBox Express" },
      });
      fireEvent.change(screen.getByLabelText(/Customer WhatsApp number/i), {
        target: { value: "+254722111999" },
      });
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      // Step D: Shows Declared delivery service area instead of physical address
      expect(screen.getByLabelText(/Declared delivery service area/i)).toBeInTheDocument();
      expect(screen.getByText(/No walk-in storefront address is required/i)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/Declared delivery service area/i), {
        target: { value: "Kilimani, Kileleshwa & Lavington (6 km radius)" },
      });
      fireEvent.change(screen.getByLabelText(/First menu name/i), {
        target: { value: "Late Night Smash Menu" },
      });
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      // Step E: Complete
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      const st = usePewa.getState();
      const venue = st.venues.find((v) => v.orgId === st.organisation?.id);
      expect(venue).toBeDefined();
      expect(venue?.deliveryOnly).toBe(true);
      expect(venue?.serviceArea).toBe("Kilimani, Kileleshwa & Lavington (6 km radius)");
      expect(venue?.services).toEqual(["Delivery"]);
    });
  });

  describe("Scenario E — Hotel configuration supports multiple service contexts", () => {
    it("scaffolds draft menus for both the primary service point and additional hotel service contexts", () => {
      usePewa.getState().loadScenario("new-cafe");
      const OnboardingComponent = getRouteComponent(OnboardingRoute);
      render(<OnboardingComponent />);

      // Step A
      fireEvent.change(screen.getByLabelText(/Full name/i), {
        target: { value: "Grace Mutua" },
      });
      fireEvent.change(screen.getByLabelText(/Email address/i), {
        target: { value: "grace@serenahorizon.co.ke" },
      });
      fireEvent.click(screen.getByTestId("simulate-verify-identity-btn"));
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      // Step B: Select Hotel & Hospitality
      fireEvent.change(screen.getByLabelText(/Organisation name/i), {
        target: { value: "Horizon Hotels Group" },
      });
      fireEvent.click(screen.getByText("Hotel & Hospitality"));
      fireEvent.change(screen.getByLabelText(/Primary organisation contact/i), {
        target: { value: "gm@serenahorizon.co.ke" },
      });
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      // Step C
      fireEvent.change(screen.getByLabelText(/Customer-facing business name/i), {
        target: { value: "The Palms Resort & Spa" },
      });
      fireEvent.change(screen.getByLabelText(/Customer phone line/i), {
        target: { value: "+254700123456" },
      });
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      // Step D: Hotel automatically pre-populates "Lobby Lounge & Bar" + additional contexts ("In-Room Dining (Guests Only)", "Pool Terrace")
      fireEvent.change(screen.getByLabelText(/Street address & neighbourhood/i), {
        target: { value: "Diani Beach Road, Kwale" },
      });
      fireEvent.change(screen.getByLabelText(/First menu name/i), {
        target: { value: "Lobby Lounge All-Day Dining" },
      });

      // Also add a custom context "Rooftop Sundowner Bar"
      fireEvent.change(screen.getByPlaceholderText(/Add context/i), {
        target: { value: "Rooftop Sundowner Bar" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Add/i }));

      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      // Step E: Complete
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      const st = usePewa.getState();
      const hotelVenue = st.venues.find((v) => v.orgId === st.organisation?.id);
      expect(hotelVenue?.serviceContexts).toEqual([
        "Lobby Lounge & Bar",
        "In-Room Dining (Guests Only)",
        "Pool Terrace",
        "Rooftop Sundowner Bar",
      ]);

      const hotelMenus = st.menus.filter((m) => m.orgId === st.organisation?.id);
      expect(hotelMenus).toHaveLength(4);
      expect(hotelMenus.map((m) => m.name)).toEqual(
        expect.arrayContaining([
          "Lobby Lounge All-Day Dining",
          "In-Room Dining (Guests Only) Menu",
          "Pool Terrace Menu",
          "Rooftop Sundowner Bar Menu",
        ]),
      );
      // Guest-only / In-Room Dining context menu is automatically marked isProtected
      const roomMenu = hotelMenus.find((m) => m.name === "In-Room Dining (Guests Only) Menu");
      expect(roomMenu?.isProtected).toBe(true);
    });
  });

  describe("Scenario G — Reusable identity across multiple organisations and strict membership enforcement", () => {
    it("associates initial owner membership with the created organisation, supports multiple organisations per identity with distinct roles, and blocks unassociated identities from workspace access", () => {
      usePewa.getState().loadScenario("new-cafe");

      // Register Org 1 as founding Owner
      usePewa.getState().completeOnboarding({
        identity: {
          fullName: "Wanjiku Mwangi",
          email: "wanjiku@pewa.africa",
          mobile: "+254712000111",
          preferredSignIn: "email",
        },
        orgName: "Wanjiku Roasters Ltd",
        venueName: "Wanjiku Coffee Bar",
        businessType: "cafe_bakery",
        category: "Cafe & Bakery",
        address: "Westlands, Nairobi",
        currency: "KES",
        tagline: "Specialty coffee.",
        phone: "",
        whatsapp: "+254712000111",
        email: "",
        deliveryOnly: false,
        services: ["Dine-in", "Takeaway"],
        menuName: "Espresso & Filter Menu",
      });

      const stAfterOrg1 = usePewa.getState();
      const identityId = stAfterOrg1.personalIdentity!.id;
      const org1Id = stAfterOrg1.organisation!.id;
      expect(getActiveOrganisationMembership(stAfterOrg1)?.role).toBe("owner");
      expect(hasActiveBusinessMembership(stAfterOrg1)).toBe(true);

      // Same personal identity joins a second organisation (org_green_garden) as "manager"
      usePewa.getState().upsertMembership({
        identityId,
        orgId: "org_green_garden",
        role: "manager",
      });

      const allIdentityMemberships = (usePewa.getState().memberships || []).filter(
        (m) => m.identityId === identityId,
      );
      expect(allIdentityMemberships).toHaveLength(2);
      expect(allIdentityMemberships.find((m) => m.orgId === org1Id)?.role).toBe("owner");
      expect(allIdentityMemberships.find((m) => m.orgId === "org_green_garden")?.role).toBe(
        "manager",
      );

      // Now simulate an unassociated personal identity trying to access Wanjiku Roasters Ltd merely by setting visual role to "owner"
      const outsider = usePewa.getState().upsertPersonalIdentity({
        fullName: "Unassociated Visitor",
        email: "outsider@example.com",
        preferredSignIn: "email",
      });
      expect(outsider.id).not.toBe(identityId);

      // Even if visual role is "owner", outsider has NO membership in org1Id
      usePewa.setState({ role: "owner" });
      expect(hasActiveBusinessMembership(usePewa.getState())).toBe(false);
      expect(getEffectiveBusinessRole(usePewa.getState())).toBe("customer");

      const AdminLayoutComponent = getRouteComponent(AdminLayoutRoute);
      render(<AdminLayoutComponent />);
      expect(screen.getByText(/Organisation membership required/i)).toBeInTheDocument();
      expect(
        screen.getByText(
          /Switching a visual role selector alone does not grant organisation permissions/i,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Scenario I — Existing business user visiting /onboarding sees returning-owner resume options", () => {
    it("displays the returning-owner entry view with workspace resume and menu links instead of forcing duplicate registration", () => {
      usePewa.getState().loadScenario("established-restaurant");
      const OnboardingComponent = getRouteComponent(OnboardingRoute);
      render(<OnboardingComponent />);

      expect(screen.getByTestId("returning-owner-entry")).toBeInTheDocument();
      expect(screen.getByText(/Existing Business Workspace/i)).toBeInTheDocument();

      const resumeBtn = screen.getByRole("button", { name: /Resume Business Workspace/i });
      expect(resumeBtn).toBeInTheDocument();
      fireEvent.click(resumeBtn);
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/admin" });

      // Clicking "Register a separate new organisation under your identity" allows deliberate multi-org creation
      fireEvent.click(
        screen.getByRole("button", {
          name: /Register a separate new organisation under your identity/i,
        }),
      );
      expect(screen.getByTestId("onboarding-step-personal")).toBeInTheDocument();
    });
  });

  describe("Scenario K — Progressive draft persistence across steps and page reload", () => {
    it("persists onboardingDraft in store state across step navigation and remounts", () => {
      usePewa.getState().loadScenario("new-cafe");
      const OnboardingComponent = getRouteComponent(OnboardingRoute);
      const { unmount } = render(<OnboardingComponent />);

      // Enter details in Step A and advance to Step B
      fireEvent.change(screen.getByLabelText(/Full name/i), {
        target: { value: "Zuri Kimani" },
      });
      fireEvent.change(screen.getByLabelText(/Email address/i), {
        target: { value: "zuri@coastalbites.co.ke" },
      });
      fireEvent.click(screen.getByTestId("simulate-verify-identity-btn"));
      fireEvent.click(screen.getByTestId("onboarding-continue-btn"));

      // Enter details in Step B
      expect(screen.getByTestId("onboarding-step-organisation")).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/Organisation name/i), {
        target: { value: "Coastal Bites Mombasa" },
      });
      fireEvent.change(screen.getByLabelText(/Primary organisation contact/i), {
        target: { value: "+254733445566" },
      });

      // Verify onboardingDraft is saved in store at step 1 (Step B)
      expect(usePewa.getState().onboardingDraft?.step).toBe(1);
      expect(usePewa.getState().onboardingDraft?.orgName).toBe("Coastal Bites Mombasa");

      // Simulate reload by unmounting and remounting OnboardingComponent
      unmount();
      render(<OnboardingComponent />);

      // Resumes directly on Step B with saved values intact
      expect(screen.getByTestId("onboarding-step-organisation")).toBeInTheDocument();
      expect(screen.getByLabelText(/Organisation name/i)).toHaveValue("Coastal Bites Mombasa");
    });
  });
});
