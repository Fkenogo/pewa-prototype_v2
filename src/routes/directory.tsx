import { createFileRoute } from "@tanstack/react-router";
import { Discovery } from "@/components/pewa/Discovery";
import { pageHead } from "@/lib/pewa/metadata";

export const Route = createFileRoute("/directory")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { filter?: string | undefined; q?: string | undefined; area?: string | undefined } => ({
    filter: typeof search["filter"] === "string" ? search["filter"] : undefined,
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    area: typeof search["area"] === "string" ? search["area"] : undefined,
  }),
  head: () =>
    pageHead("Menu directory", "Find published menus by dish, category, service and area."),
  component: Directory,
});
function Directory() {
  const search = Route.useSearch();
  return (
    <Discovery
      directory
      initialFilter={search.filter}
      initialQuery={search.q}
      initialArea={search.area}
    />
  );
}
