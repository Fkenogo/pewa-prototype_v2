import { createFileRoute } from "@tanstack/react-router";
import { Discovery } from "@/components/pewa/Discovery";
import { pageHead } from "@/lib/pewa/metadata";

export const Route = createFileRoute("/directory")({
  head: () =>
    pageHead("Menu directory", "Find published menus by dish, category, service and area."),
  component: Directory,
});
function Directory() {
  return <Discovery directory />;
}
