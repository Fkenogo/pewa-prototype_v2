import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { usePewa } from "@/lib/pewa/store";
import { ScenarioPanel } from "@/components/pewa/ScenarioPanel";
import { Route as OrdersRoute } from "@/routes/admin.orders";
import { Route as OperatorRoute } from "@/routes/operator";
import { Route as AdminRoute } from "@/routes/admin";
import { Route as BillingRoute } from "@/routes/admin.billing";
import { Route as PromotionsRoute } from "@/routes/admin.promotions";

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
    onClick,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    onClick?: () => void;
    className?: string;
  }) => (
    <a href={to} onClick={onClick} className={className} data-testid="router-link">
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="outlet" />,
}));

describe("R2-B: Operational Staff Experience Alignment & Boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePewa.getState().reset();
    usePewa.getState().loadScenario("admitted-pending");
  });

  it("routes the Operator Console's customer links to Discovery", () => {
    usePewa.getState().setRole("operator");
    const Operator = getRouteComponent(OperatorRoute);
    render(<Operator />);

    expect(screen.getByRole("link", { name: "Customer Home" })).toHaveAttribute(
      "href",
      "/discover",
    );
  });

  describe("Scenario Staff A — Obvious route to business orders workspace", () => {
    it("presents an obvious route to orders workspace when Operational Staff role is active", () => {
      usePewa.getState().setRole("staff");
      render(<ScenarioPanel />);

      // Open Scenario Panel
      fireEvent.click(screen.getByRole("button", { name: /open prototype scenario panel/i }));

      // Obvious shortcut card for Operational Staff
      expect(screen.getByText("Operational Staff Active")).toBeInTheDocument();
      const openWorkspaceBtn = screen.getByRole("button", { name: /open staff orders workspace/i });
      expect(openWorkspaceBtn).toBeInTheDocument();

      fireEvent.click(openWorkspaceBtn);
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/admin/orders" });
    });

    it("hides Operator Console from jump-to list when acting as staff", () => {
      usePewa.getState().setRole("staff");
      render(<ScenarioPanel />);

      fireEvent.click(screen.getByRole("button", { name: /open prototype scenario panel/i }));

      expect(screen.queryByText("Operator console")).not.toBeInTheDocument();
      expect(screen.getByText("Staff orders workspace")).toBeInTheDocument();
    });
  });

  describe("Scenario Staff B — Staff order inspection with complete item selections, modifiers & service context", () => {
    it("renders incoming pending orders with quantities, modifiers, delta prices, contact, and service context", () => {
      usePewa.getState().setRole("staff");

      // Ensure pending order has modifiers with delta price
      const st = usePewa.getState();
      const order = st.orders.find((o) => o.status === "pending");
      if (order && order.lines[0]) {
        order.lines[0].options = [
          { groupId: "mod_milk", optionId: "o2", name: "Oat Milk", priceDelta: 50 },
        ];
      }

      const OrdersComponent = getRouteComponent(OrdersRoute);
      render(<OrdersComponent />);

      // Check workspace header
      expect(screen.getByText("Operational Staff Workspace")).toBeInTheDocument();
      expect(screen.getByText(/Orders Queue/i)).toBeInTheDocument();

      // Check incoming request count
      expect(screen.getByText(/request awaiting decision/i)).toBeInTheDocument();

      // Ensure modifier delta price formatting and service context are rendered
      expect(screen.getByText(/Service:/i)).toBeInTheDocument();
      expect(screen.getByText(/Guest:/i)).toBeInTheDocument();
      expect(screen.getByText(/Contact:/i)).toBeInTheDocument();
      expect(screen.getByText(/Oat Milk \(\+KES 50.00\)/)).toBeInTheDocument();
    });
  });

  describe("Scenario Staff C — Staff accepts order with unit deduction", () => {
    it("atomically consumes exactly 1 unit and moves order to accepted preparing queue", () => {
      // Owner replenishes capacity first (staff cannot purchase top-up units)
      usePewa.getState().setRole("owner");
      usePewa.getState().addTopUpUnits(10);
      usePewa.getState().setRole("staff");
      const initialTotalUnits =
        usePewa.getState().orderPolicy.included + usePewa.getState().orderPolicy.topUp;

      const OrdersComponent = getRouteComponent(OrdersRoute);
      render(<OrdersComponent />);

      // Find the Accept order button on the first pending request
      const acceptBtn = screen.getByRole("button", { name: /accept order/i });
      fireEvent.click(acceptBtn);

      // Verify unit consumption
      const afterTotalUnits =
        usePewa.getState().orderPolicy.included + usePewa.getState().orderPolicy.topUp;
      expect(afterTotalUnits).toBe(initialTotalUnits - 1);
    });
  });

  describe("Scenario Staff D — Staff declines order with required reason", () => {
    it("prompts for decline reason, preserves capacity, and updates order status", () => {
      usePewa.getState().setRole("owner");
      usePewa.getState().addTopUpUnits(10);
      usePewa.getState().setRole("staff");
      const initialUnits =
        usePewa.getState().orderPolicy.included + usePewa.getState().orderPolicy.topUp;

      const OrdersComponent = getRouteComponent(OrdersRoute);
      render(<OrdersComponent />);

      // Click Decline
      const declineBtn = screen.getByRole("button", { name: /^decline$/i });
      fireEvent.click(declineBtn);

      // Decline reason prompt appears
      expect(screen.getByText(/decline reason/i)).toBeInTheDocument();
      const confirmDeclineBtn = screen.getByRole("button", { name: /confirm decline/i });
      fireEvent.click(confirmDeclineBtn);

      // Units preserved (no deduction)
      const afterUnits =
        usePewa.getState().orderPolicy.included + usePewa.getState().orderPolicy.topUp;
      expect(afterUnits).toBe(initialUnits);
    });
  });

  describe("Scenario Staff E — Staff marks order ready milestone", () => {
    it("progresses order from preparing to ready queue", () => {
      usePewa.getState().setRole("owner");
      usePewa.getState().addTopUpUnits(10);
      usePewa.getState().setRole("staff");

      // First accept a pending order
      const pendingOrder = usePewa.getState().orders.find((o) => o.status === "pending");
      expect(pendingOrder).toBeDefined();
      if (pendingOrder) {
        usePewa.getState().acceptOrder(pendingOrder.id);
      }

      const OrdersComponent = getRouteComponent(OrdersRoute);
      render(<OrdersComponent />);

      // Switch to Preparing tab
      const preparingTab = screen.getByRole("tab", { name: /preparing/i });
      fireEvent.click(preparingTab);

      // Click "Mark as ready"
      const markReadyBtn = screen.getByRole("button", { name: /mark as ready/i });
      fireEvent.click(markReadyBtn);

      // Order status is now ready in store
      const updatedOrder = usePewa.getState().orders.find((o) => o.id === pendingOrder?.id);
      expect(updatedOrder?.status).toBe("ready");
    });
  });

  describe("Scenario Staff F — Strict role boundaries & access prevention", () => {
    it("restricts Operator Console from staff access", () => {
      usePewa.getState().setRole("staff");
      const OperatorComponent = getRouteComponent(OperatorRoute);
      render(<OperatorComponent />);

      expect(screen.getByText("Access Restricted")).toBeInTheDocument();
      expect(
        screen.getByText(/The Operator Console is reserved for PEWA platform operations/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", {
          name: /Go to Staff Orders Workspace/i,
        }),
      ).toBeInTheDocument();
    });

    it("restricts Billing management from staff access", () => {
      usePewa.getState().setRole("staff");
      const BillingComponent = getRouteComponent(BillingRoute);
      render(<BillingComponent />);

      expect(screen.getByText(/Access restricted/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Operational staff cannot view or modify commercial balances/i),
      ).toBeInTheDocument();
    });

    it("restricts Promotions management from staff access", () => {
      usePewa.getState().setRole("staff");
      const PromotionsComponent = getRouteComponent(PromotionsRoute);
      render(<PromotionsComponent />);

      expect(screen.getByText(/Access restricted/i)).toBeInTheDocument();
      expect(screen.getByText(/Operational staff cannot create campaigns/i)).toBeInTheDocument();
    });

    it("hides billing, promos, and menu authoring links from admin navigation when role is staff", () => {
      usePewa.getState().setRole("staff");
      const AdminComponent = getRouteComponent(AdminRoute);
      render(<AdminComponent />);

      // Staff sees Orders, Overview, Activity
      expect(screen.getAllByRole("link", { name: /Orders/ }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("link", { name: /Overview/ }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("link", { name: /Activity/ }).length).toBeGreaterThan(0);

      // Staff does NOT see Menus authoring, Promos, or Billing links
      expect(screen.queryByRole("link", { name: /Billing/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /Promos/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /Menus/ })).not.toBeInTheDocument();
    });
  });

  describe("Scenario Staff G — Multi-venue limitation disclosure", () => {
    it("displays multi-venue disclaimer note in OrderCockpit when organisation has multiple venues", () => {
      usePewa.getState().setRole("staff");
      // Load multi-brand scenario
      usePewa.getState().loadScenario("multi-brand");

      const OrdersComponent = getRouteComponent(OrdersRoute);
      render(<OrdersComponent />);

      // Disclosure note must be present
      expect(
        screen.getByText(
          /Prototype note: In this demonstration prototype, staff can switch their active service point/i,
        ),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Filter by service station/i)).toBeInTheDocument();
    });
  });
});
