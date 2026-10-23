import { createFileRoute } from "@tanstack/react-router";
import { Discovery } from "@/components/pewa/Discovery";
import { pageHead } from "@/lib/pewa/metadata";

export const Route = createFileRoute("/discover")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { filter?: string | undefined; q?: string | undefined; area?: string | undefined } => ({
    filter: typeof search["filter"] === "string" ? search["filter"] : undefined,
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    area: typeof search["area"] === "string" ? search["area"] : undefined,
  }),
  head: () =>
    pageHead(
      "Discover local menus",
      "Search local menus, revisit recent venues and save favourites without an account.",
    ),
  component: Discover,
});

function Discover() {
  const search = Route.useSearch();
  return (
    <Discovery initialFilter={search.filter} initialQuery={search.q} initialArea={search.area} />
  );
}
