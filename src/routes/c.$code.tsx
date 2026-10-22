import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AlertCircle, ArrowLeft, KeyRound, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerNav } from "@/components/pewa/CustomerNav";
import { resolveMenuAccess, usePewa } from "@/lib/pewa/store";

export const Route = createFileRoute("/c/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Access Menu ${params.code} — PEWA` },
      { name: "description", content: "Opening menu directly from access code." },
    ],
  }),
  component: DirectCodeRoute,
});

export function DirectCodeRoute() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const state = usePewa();

  const resolution = resolveMenuAccess({ code }, state);

  useEffect(() => {
    if (resolution.success && resolution.venue && resolution.menu && resolution.reference) {
      navigate({
        to: "/m/$slug",
        params: { slug: resolution.venue.slug },
        search: {
          menu: resolution.menu.id,
          access: resolution.reference.id,
          code: resolution.reference.shortCode,
          sp: resolution.reference.servicePoint,
          channel: resolution.reference.channel,
        },
        replace: true,
      });
    }
  }, [resolution, navigate]);

  if (resolution.success) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center p-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-foreground">
          Opening {resolution.venue?.name} menu...
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center p-6 text-center pb-24">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="h-8 w-8" />
      </div>

      <h1 className="font-display text-2xl font-bold">Unable to Open Menu</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {resolution.error || `The code "${code}" could not be resolved.`}
      </p>

      <div className="mt-6 flex w-full flex-col gap-2.5">
        <Button asChild className="h-11 w-full">
          <Link to="/scan">
            <KeyRound className="mr-2 h-4 w-4" /> Enter another code or scan
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 w-full">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Browse all menus
          </Link>
        </Button>
      </div>

      <CustomerNav />
    </main>
  );
}
