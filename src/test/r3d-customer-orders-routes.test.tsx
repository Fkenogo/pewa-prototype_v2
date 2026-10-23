import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { usePewa } from "@/lib/pewa/store";

const routeParams = vi.hoisted(() => ({ orderId: "", navigate: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: () => routeParams,
  }),
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => {
    const href = params
      ? Object.entries(params).reduce(
          (current, [key, value]) => current.replace(`$${key}`, value),
          to,
        )
      : to;
    return <a href={href}>{children}</a>;
  },
  useNavigate: () => routeParams.navigate,
}));

import { Route as OrdersRoute } from "@/routes/orders.index";
import { Route as OrderDetailRoute } from "@/routes/orders.$orderId";
import { Route as ProfileRoute } from "@/routes/profile";

interface RouteWithComponent {
  component: React.ComponentType;
}
const routeComponent = (route: unknown) => (route as RouteWithComponent).component;

describe("R3-D customer order route isolation", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    usePewa.getState().loadScenario("units-available");
  });

  it("keeps Business Workspace visible for its active business identity after creating a customer profile", () => {
    usePewa.getState().loadScenario("established-restaurant");
    expect(usePewa.getState().continueAsExistingCustomer()).toBe(true);
    usePewa.getState().continueAsGuest();
    expect(
      usePewa
        .getState()
        .createCustomerProfile({ fullName: "Separate customer", email: "customer@example.test" })
        .ok,
    ).toBe(true);
    const Profile = routeComponent(ProfileRoute);
    render(<Profile />);
    expect(screen.getByRole("link", { name: "Open Business Workspace" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(
      usePewa
        .getState()
        .memberships?.some(
          (membership) =>
            membership.identityId === usePewa.getState().personalIdentity?.id &&
            membership.status === "active",
        ),
    ).toBe(true);
  });

  it("navigates to browsing when a guest chooses to continue", () => {
    const Profile = routeComponent(ProfileRoute);
    render(<Profile />);
    fireEvent.click(screen.getByRole("button", { name: "Continue browsing as a guest" }));
    expect(routeParams.navigate).toHaveBeenCalledWith({ to: "/discover" });
  });

  it("returns order-list and profile headers to customer Discovery", () => {
    const Orders = routeComponent(OrdersRoute);
    const Profile = routeComponent(ProfileRoute);

    const orders = render(<Orders />);
    expect(screen.getByRole("link", { name: "pewa" })).toHaveAttribute("href", "/discover");
    orders.unmount();

    render(<Profile />);
    expect(screen.getByRole("link", { name: "pewa" })).toHaveAttribute("href", "/discover");
  });

  it("hides Customer A's order from Customer B and guest, then restores it for A", () => {
    expect(
      usePewa.getState().createCustomerProfile({ fullName: "Customer A", email: "a@example.test" })
        .ok,
    ).toBe(true);
    const aContext = usePewa.getState().customerContext;
    if (aContext.kind !== "identified") throw new Error("Customer A was not identified");

    const addError = usePewa.getState().addCartLine("venue_ggc", {
      menuId: "menu_ggc_allday",
      offeringId: "off_flat",
      name: "Flat White",
      emoji: "☕",
      basePrice: 280,
      options: [],
      quantity: 1,
      note: "",
    });
    expect(addError).toBeNull();
    const submitted = usePewa.getState().submitOrder({
      guestName: "Customer A",
      guestContact: "a@example.test",
      service: "Takeaway",
      note: "",
    });
    expect(submitted.id).toBeDefined();
    routeParams.orderId = submitted.id!;

    usePewa.getState().continueAsGuest();
    expect(
      usePewa.getState().createCustomerProfile({ fullName: "Customer B", email: "b@example.test" })
        .ok,
    ).toBe(true);
    const Orders = routeComponent(OrdersRoute);
    const OrderDetail = routeComponent(OrderDetailRoute);

    const listForB = render(<Orders />);
    expect(screen.queryByText("Green Garden Café")).not.toBeInTheDocument();
    listForB.unmount();
    render(<OrderDetail />);
    expect(screen.getByText("Request not found in this browser")).toBeInTheDocument();

    cleanup();
    usePewa.getState().continueAsGuest();
    render(<Orders />);
    expect(screen.queryByText("Green Garden Café")).not.toBeInTheDocument();

    cleanup();
    render(<OrderDetail />);
    expect(screen.getByText("Request not found in this browser")).toBeInTheDocument();

    cleanup();
    expect(usePewa.getState().selectCustomerProfile(aContext.identityId)).toBe(true);
    render(<Orders />);
    expect(screen.getByText("Green Garden Café")).toBeInTheDocument();

    cleanup();
    render(<OrderDetail />);
    expect(screen.getByText("PEWA-0001")).toBeInTheDocument();
  });
});
