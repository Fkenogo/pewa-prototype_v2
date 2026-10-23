import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import React from "react";
import { usePewa } from "@/lib/pewa/store";
import type { Organisation } from "@/lib/pewa/types";
import { Route as PromotionsRoute } from "@/routes/admin.promotions";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: Record<string, unknown>) => opts,
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

const PromotionsPage = (PromotionsRoute as unknown as { component: React.ComponentType }).component;

const baseInput = {
  businessType: "Café",
  address: "Kilimani, Nairobi",
  deliveryOnly: false,
  currency: "KES",
  services: ["Dine-in"],
  phone: "+254711000111",
  whatsapp: "+254711000111",
  email: "a@example.ke",
  menuName: "Menu",
};

function onboard(orgName: string, venueName: string, extra: Record<string, unknown> = {}) {
  return usePewa.getState().completeOnboarding({
    ...baseInput,
    orgName,
    venueName,
    ...extra,
  });
}

const orgCount = (id: string) =>
  (usePewa.getState().organisations || []).filter((o: Organisation) => o.id === id).length;

describe("R3-E CORR-001 — organisation record integrity", () => {
  beforeEach(() => {
    usePewa.getState().reset();
    usePewa.getState().loadScenario("new-cafe");
  });

  it("A: updating an org after legacy-state rehydration does not duplicate organisation IDs", () => {
    onboard("Alpha Café", "Alpha Kilimani");
    const alphaId = usePewa.getState().organisation!.id;

    // Legacy persisted state: active organisation exists, but no `organisations` array.
    usePewa.setState({ organisations: undefined as unknown as Organisation[] });

    onboard("Alpha Café", "Alpha Kilimani", { email: "new@example.ke" });
    onboard("Alpha Café", "Alpha Kilimani", { email: "new@example.ke" });

    const state = usePewa.getState();
    const ids = (state.organisations ?? []).map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(orgCount(alphaId)).toBe(1);
    expect(state.organisation!.id).toBe(alphaId);
    expect(state.venues.filter((v) => v.orgId === alphaId)).toHaveLength(1);
    expect(
      (state.memberships ?? []).filter((m) => m.orgId === alphaId && m.role === "owner"),
    ).toHaveLength(1);
  });

  it("B: switching away and returning restores updated metadata of an org held outside the list", () => {
    onboard("Alpha Café", "Alpha Kilimani");
    const alphaId = usePewa.getState().organisation!.id;
    onboard("Bravo Bistro", "Bravo Westlands");
    const bravoId = usePewa.getState().organisation!.id;

    // Alpha becomes the active org held outside the explicit list, with a stale list entry.
    expect(usePewa.getState().switchOrganisation(alphaId).success).toBe(true);
    const staleList = (usePewa.getState().organisations ?? []).filter((o) => o.id !== alphaId);
    const stale = (usePewa.getState().organisations ?? []).find((o) => o.id === alphaId)!;
    usePewa.setState({
      organisations: [...staleList, stale],
      organisation: { ...stale, name: "Alpha Renamed", primaryContact: "0700 000 111" },
    });

    expect(usePewa.getState().switchOrganisation(bravoId).success).toBe(true);
    expect(orgCount(alphaId)).toBe(1);
    expect(usePewa.getState().organisation!.id).toBe(bravoId);

    expect(usePewa.getState().switchOrganisation(alphaId).success).toBe(true);
    const restored = usePewa.getState().organisation!;
    expect(restored.name).toBe("Alpha Renamed");
    expect(restored.primaryContact).toBe("0700 000 111");
    const ids = (usePewa.getState().organisations ?? []).map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("B2: legacy state with the active org absent from an undefined list is preserved on switch", () => {
    onboard("Alpha Café", "Alpha Kilimani");
    const alphaId = usePewa.getState().organisation!.id;
    onboard("Bravo Bistro", "Bravo Westlands");
    const bravoId = usePewa.getState().organisation!.id;

    usePewa.setState({ organisations: undefined as unknown as Organisation[] });
    usePewa.setState({ organisation: { ...usePewa.getState().organisation!, name: "Bravo 2" } });

    expect(usePewa.getState().switchOrganisation(alphaId).success).toBe(true);
    expect((usePewa.getState().organisations ?? []).find((o) => o.id === bravoId)?.name).toBe(
      "Bravo 2",
    );
    expect(orgCount(bravoId)).toBe(1);
  });

  it("C: additional organisations retain separate venues, menus and memberships", () => {
    onboard("Alpha Café", "Alpha Kilimani");
    const alphaId = usePewa.getState().organisation!.id;
    onboard("Bravo Bistro", "Bravo Westlands");
    const bravoId = usePewa.getState().organisation!.id;

    const state = usePewa.getState();
    expect((state.organisations ?? []).map((o) => o.id).sort()).toEqual([alphaId, bravoId].sort());
    for (const id of [alphaId, bravoId]) {
      expect(state.venues.filter((v) => v.orgId === id)).toHaveLength(1);
      expect(state.menus.filter((m) => m.orgId === id).length).toBeGreaterThan(0);
      expect(
        (state.memberships ?? []).filter((m) => m.orgId === id && m.status === "active"),
      ).toHaveLength(1);
    }
    expect(state.venues.find((v) => v.orgId === alphaId)!.name).toBe("Alpha Kilimani");
    expect(state.venues.find((v) => v.orgId === bravoId)!.name).toBe("Bravo Westlands");
  });
});

describe("R3-E CORR-001 — promotions scoped to the active organisation", () => {
  let alphaId: string;
  let bravoId: string;
  const originalCreateCampaign = usePewa.getState().createCampaign;

  afterEach(() => {
    usePewa.setState({ createCampaign: originalCreateCampaign });
  });

  const openForm = () => {
    render(<PromotionsPage />);
    fireEvent.click(screen.getByRole("button", { name: /new featured offer/i }));
    return screen.getByRole("dialog");
  };
  const venueOptions = (dialog: HTMLElement) =>
    within(within(dialog).getByRole("combobox"))
      .getAllByRole("option")
      .map((o) => o.textContent);
  const fillAndSubmit = (dialog: HTMLElement) => {
    fireEvent.change(within(dialog).getByPlaceholderText(/20% off/i), {
      target: { value: "Weekend Special" },
    });
    fireEvent.change(within(dialog).getByPlaceholderText(/steeped/i), {
      target: { value: "Fresh all week" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /launch sponsored campaign/i }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    usePewa.getState().reset();
    usePewa.getState().loadScenario("new-cafe");
    onboard("Alpha Café", "Alpha Kilimani");
    alphaId = usePewa.getState().organisation!.id;
    onboard("Bravo Bistro", "Bravo Westlands");
    bravoId = usePewa.getState().organisation!.id;
    usePewa.getState().switchOrganisation(alphaId);
  });

  it("D: organisation A cannot select organisation B's venue", () => {
    const dialog = openForm();
    expect(venueOptions(dialog)).toEqual(["Alpha Kilimani"]);
    expect(within(dialog).queryByText("Bravo Westlands")).toBeNull();
  });

  it("E: switching organisation updates the available venue choices", () => {
    const { rerender } = render(<PromotionsPage />);
    fireEvent.click(screen.getByRole("button", { name: /new featured offer/i }));
    expect(venueOptions(screen.getByRole("dialog"))).toEqual(["Alpha Kilimani"]);

    React.act(() => {
      usePewa.getState().switchOrganisation(bravoId);
    });
    rerender(<PromotionsPage />);
    const dialog = screen.getByRole("dialog");
    expect(venueOptions(dialog)).toEqual(["Bravo Westlands"]);
    expect((within(dialog).getByRole("combobox") as HTMLSelectElement).value).toBe(
      usePewa.getState().venues.find((v) => v.orgId === bravoId)!.id,
    );
  });

  it("shows an empty state and blocks launch when the active org has no venue", () => {
    usePewa.setState({ venues: usePewa.getState().venues.filter((v) => v.orgId !== alphaId) });
    const dialog = openForm();
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/no venue is available/i);
    expect(
      within(dialog).getByRole("button", { name: /launch sponsored campaign/i }),
    ).toBeDisabled();
  });

  it("F: rejected campaign creation never produces a success notification", () => {
    usePewa.setState({ createCampaign: () => "" });
    const dialog = openForm();
    fillAndSubmit(dialog);

    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith(expect.stringMatching(/could not be created/i));
    expect(usePewa.getState().campaigns.filter((c) => c.title === "Weekend Special")).toHaveLength(
      0,
    );
  });

  it("G: an authorised campaign is created for an eligible venue in the active organisation", () => {
    const dialog = openForm();
    fillAndSubmit(dialog);

    expect(toastMock.error).not.toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledTimes(1);
    const created = usePewa.getState().campaigns.filter((c) => c.title === "Weekend Special");
    expect(created).toHaveLength(1);
    expect(created[0]?.orgId).toBe(alphaId);
    expect(created[0]?.venueId).toBe(
      usePewa.getState().venues.find((v) => v.orgId === alphaId)!.id,
    );
  });
});
