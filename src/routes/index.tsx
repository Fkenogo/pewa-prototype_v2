import { createFileRoute } from "@tanstack/react-router";
import { Discovery } from "@/components/pewa/Discovery";
import { pageHead } from "@/lib/pewa/metadata";

export const Route = createFileRoute("/")({
  head: () => pageHead("Discover local menus", "Search local menus, revisit recent venues and save favourites without an account."),
  component: Discovery,
});
