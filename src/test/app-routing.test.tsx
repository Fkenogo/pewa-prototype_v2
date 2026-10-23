import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches the public landing page at /", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).toBe("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches customer Discovery at /discover with search parameters", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes("/discover");

    expect(matches.at(-1)?.routeId).toBe("/discover");
  });
});
