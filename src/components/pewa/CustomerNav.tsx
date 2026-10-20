import { Link } from "@tanstack/react-router";
import { Compass, Home, ClipboardList } from "lucide-react";

export function CustomerNav() {
  return (
    <nav
      aria-label="Customer navigation"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto grid max-w-lg grid-cols-3 border-t bg-card pb-safe"
    >
      <Link
        to="/"
        className="flex min-h-14 flex-col items-center justify-center gap-1 text-xs"
        activeProps={{ className: "text-primary font-bold" }}
        activeOptions={{ exact: true }}
      >
        <Home className="h-5 w-5" />
        Home
      </Link>
      <Link
        to="/directory"
        className="flex min-h-14 flex-col items-center justify-center gap-1 text-xs"
        activeProps={{ className: "text-primary font-bold" }}
      >
        <Compass className="h-5 w-5" />
        Directory
      </Link>
      <Link
        to="/orders"
        className="flex min-h-14 flex-col items-center justify-center gap-1 text-xs"
        activeProps={{ className: "text-primary font-bold" }}
      >
        <ClipboardList className="h-5 w-5" />
        My requests
      </Link>
    </nav>
  );
}
