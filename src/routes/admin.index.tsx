import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, Copy, CreditCard, ExternalLink, Fuel, Plus } from "lucide-react";
import { toast } from "sonner";
import { canAuthorMenus, canManageBilling, usePewa } from "@/lib/pewa/store";
import { StatusBadge } from "@/components/pewa/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pageHead } from "@/lib/pewa/metadata";

export const Route = createFileRoute("/admin/")({
  head: () =>
    pageHead(
      "Your business menus",
      "Publish and share your business menus with QR codes and direct links.",
    ),
  component: Overview,
});

function Overview() {
  const { organisation, venues, menus, role, orderPolicy, addMenu } = usePewa();
  const [newName, setNewName] = useState("");
  const orgVenues = venues.filter((v) => v.orgId === organisation?.id);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const venue = orgVenues.find((v) => v.id === selectedVenueId) || orgVenues[0];
  const mine = menus.filter((m) => m.orgId === organisation?.id);
  const live = mine.some((m) => m.status === "published");
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const url = venue ? `${origin}/m/${venue.slug}` : "";

  const totalUnits = orderPolicy.included + orderPolicy.topUp;
  const isZeroUnits = totalUnits === 0 && !orderPolicy.expired;

  return (
    <main className="mx-auto max-w-3xl px-4 pt-5">
      <p className="pr-28 text-sm text-muted-foreground md:hidden">{organisation?.name}</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">Your menus</h1>
        {canManageBilling(role) && (
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link to="/admin/billing">
              <Fuel className="mr-1.5 h-3.5 w-3.5 text-primary" />
              {orderPolicy.expired ? "Subscription expired" : `${totalUnits} units available`}
            </Link>
          </Button>
        )}
      </div>

      {orgVenues.length > 1 && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs font-semibold text-muted-foreground shrink-0">Venue:</span>
          {orgVenues.map((v) => (
            <Button
              key={v.id}
              variant={v.id === venue?.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedVenueId(v.id)}
              className="h-8 rounded-full text-xs shrink-0"
            >
              {v.name}
            </Button>
          ))}
        </div>
      )}

      {isZeroUnits && canManageBilling(role) && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-50/60 p-3 text-xs text-amber-950 dark:bg-amber-950/20 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <b>0 acceptance units available.</b> Structured orders paused; menus and manual
              contact stay active.
            </span>
          </div>
          <Button
            asChild
            size="sm"
            className="h-7 shrink-0 bg-amber-600 text-white hover:bg-amber-700"
          >
            <Link to="/admin/billing">Top up</Link>
          </Button>
        </div>
      )}

      {venue && (
        <section className="mt-5 rounded-2xl border bg-card p-4">
          <div className="flex gap-4">
            <div className={`rounded-xl bg-background p-2 ${live ? "" : "opacity-30"}`}>
              <QRCodeSVG value={url || venue.slug} size={96} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{live ? "Your menu is live" : "Not live yet"}</p>
              <p className="text-sm text-muted-foreground">
                {live
                  ? "Print this QR or share the link. It opens your menu directly."
                  : "Publish a menu to activate your QR code and link."}
              </p>
              <p className="mt-2 truncate font-mono text-xs">/m/{venue.slug}</p>
            </div>
          </div>
          {live && (
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                className="h-11 flex-1"
                onClick={() => {
                  navigator.clipboard?.writeText(url);
                  toast.success("Link copied");
                }}
              >
                <Copy className="h-4 w-4" /> Copy link
              </Button>
              <Button asChild className="h-11 flex-1">
                <Link to="/m/$slug" params={{ slug: venue.slug }}>
                  <ExternalLink className="h-4 w-4" /> View as customer
                </Link>
              </Button>
            </div>
          )}
        </section>
      )}

      <section className="mt-5 space-y-2">
        {mine.map((m) => {
          const items = m.sections.reduce((n, s) => n + s.offerings.length, 0);
          return (
            <Link
              key={m.id}
              to="/admin/menus/$menuId"
              params={{ menuId: m.id }}
              className="flex min-h-16 items-center justify-between rounded-2xl border bg-card p-4 hover:border-primary"
            >
              <div>
                <p className="font-semibold">{m.name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.sections.length} sections · {items} items
                </p>
              </div>
              <StatusBadge status={m.status} />
            </Link>
          );
        })}
      </section>

      {canAuthorMenus(role) && (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            addMenu(newName.trim());
            setNewName("");
          }}
        >
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New menu, e.g. Drinks"
            className="h-11"
          />
          <Button type="submit" className="h-11" variant="outline">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>
      )}
    </main>
  );
}
