import React from "react";
import { renderToString } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePewa } from "@/lib/pewa/store";

const discoverSearch = vi.hoisted(() => ({
  filter: undefined as string | undefined,
  q: undefined as string | undefined,
  area: undefined as string | undefined,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (_path: string) => (options: Record<string, unknown>) => ({
    ...options,
    useSearch: () => discoverSearch,
  }),
  useNavigate: () => vi.fn(),
  Link: ({
    children,
    to,
    params,
    search,
    className,
    onClick,
    activeProps: _activeProps,
    activeOptions: _activeOptions,
    ...rest
  }: React.PropsWithChildren<{
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
    className?: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
    activeProps?: unknown;
    activeOptions?: unknown;
  }>) => {
    let href = params
      ? Object.entries(params).reduce(
          (current, [key, value]) => current.replace("$" + key, value),
          to,
        )
      : to;
    if (search) {
      const query = new URLSearchParams(search).toString();
      if (query) href += "?" + query;
    }
    return (
      <a href={href} className={className} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  },
}));

import { Route as LandingRoute } from "@/routes/index";
import { Route as DiscoverRoute } from "@/routes/discover";

interface RouteWithComponent {
  component: React.ComponentType;
  validateSearch?: (search: Record<string, unknown>) => Record<string, unknown>;
}
const routeOptions = (route: unknown) => route as RouteWithComponent;
const hasLinkTo = (name: string | RegExp, href: string) =>
  screen.getAllByRole("link", { name }).some((link) => link.getAttribute("href") === href);

describe("R3-LP-001 public landing and discovery entry", () => {
  beforeEach(() => {
    cleanup();
    discoverSearch.filter = undefined;
    discoverSearch.q = undefined;
    discoverSearch.area = undefined;
    usePewa.getState().reset();
    usePewa.getState().setRole("customer");
  });

  afterEach(cleanup);

  it("renders the requested business-first landing copy and route destinations", () => {
    const LandingPage = routeOptions(LandingRoute).component;
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Your menu deserves to be seen." }),
    ).toBeInTheDocument();
    expect(screen.getByText(/FOR RESTAURANTS, CAFÉS, HOTELS, BAKERIES/)).toBeInTheDocument();
    expect(hasLinkTo(/Get Your Business Started/, "/onboarding")).toBe(true);
    expect(hasLinkTo("Explore Menus", "/discover")).toBe(true);
    expect(hasLinkTo("Explore the Directory", "/directory")).toBe(true);
    expect(hasLinkTo("Business Workspace", "/admin")).toBe(true);
    expect(screen.getAllByRole("img", { name: "PEWA" })[0]).toHaveAttribute(
      "src",
      "/pewa-horizontal-cropped.png",
    );
    expect(screen.getAllByText(/DEMONSTRATION/).length).toBeGreaterThan(1);
    expect(screen.getAllByText(/DEMONSTRATION · MENU PREVIEW/)).toHaveLength(4);
    expect(screen.getByAltText(/Flat White from a demonstration menu/)).toBeInTheDocument();
    expect(screen.queryByText("Published menu")).not.toBeInTheDocument();
    expect(
      screen.queryAllByRole("link").some((link) => link.getAttribute("href")?.startsWith("/m/")),
    ).toBe(false);
  });

  it("server-renders public landing copy without store hydration", () => {
    const LandingPage = routeOptions(LandingRoute).component;
    const html = renderToString(<LandingPage />);

    expect(html).toContain("Your menu deserves to be seen.");
    expect(html).toContain("Get Your Business Started");
    expect(html).toContain("Explore Menus");
    expect(html).not.toContain("Loading");
  });

  it("keeps static menu artwork clearly illustrative when stored publication changes", () => {
    usePewa.setState((state) => ({
      menus: state.menus.map((candidate) =>
        candidate.id === "menu_ggc_allday" ? { ...candidate, status: "archived" } : candidate,
      ),
    }));
    const LandingPage = routeOptions(LandingRoute).component;
    render(<LandingPage />);

    expect(screen.getAllByText(/DEMONSTRATION · MENU PREVIEW/)).toHaveLength(4);
    expect(screen.queryByText("Published menu")).not.toBeInTheDocument();
    expect(
      screen.queryAllByRole("link").some((link) => link.getAttribute("href")?.startsWith("/m/")),
    ).toBe(false);
    expect(screen.getByRole("link", { name: "Explore the Directory" })).toHaveAttribute(
      "href",
      "/directory",
    );
  });

  it("provides compact mobile navigation to business and customer journeys", () => {
    const LandingPage = routeOptions(LandingRoute).component;
    render(<LandingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));

    expect(screen.getByRole("navigation", { name: "Mobile navigation" })).toBeInTheDocument();
    expect(hasLinkTo("Explore Menus", "/discover")).toBe(true);
    expect(hasLinkTo("Business Workspace", "/admin")).toBe(true);
    expect(hasLinkTo("Get Your Business Started", "/onboarding")).toBe(true);
  });

  it("reuses customer Discovery at /discover and keeps its search parameters", () => {
    const Discover = routeOptions(DiscoverRoute).component;
    render(<Discover />);
    expect(screen.getByLabelText("Search menus")).toBeInTheDocument();
    expect(screen.getByText("What’s on the menu?")).toBeInTheDocument();

    const validateSearch = routeOptions(DiscoverRoute).validateSearch;
    expect(validateSearch?.({ filter: "saved", q: "coffee", area: "Westlands" })).toEqual({
      filter: "saved",
      q: "coffee",
      area: "Westlands",
    });
    expect(validateSearch?.({ filter: 4, q: false, area: null })).toEqual({
      filter: undefined,
      q: undefined,
      area: undefined,
    });
  });
});
