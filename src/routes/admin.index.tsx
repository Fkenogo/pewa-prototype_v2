import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { canAuthorMenus, usePewa } from "@/lib/pewa/store";
import { StatusBadge } from "@/components/pewa/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/")({
  component: Overview,
});

function Overview() {
  const { organisation, venues, menus, role, addMenu } = usePewa();
  const [newName, setNewName] = useState("");
  const venue = venues.find((v) => v.orgId === organisation?.id);
  const mine = menus.filter((m) => m.orgId === organisation?.id);
  const live = mine.some((m) => m.status === "published");
  const url = typeof window !== "undefined" && venue ? `${window.location.origin}/m/${venue.slug}` : "";

  return (
    <main className="mx-auto max-w-3xl px-4 pt-5">
      <p className="pr-28 text-sm text-muted-foreground md:hidden">{organisation?.name}</p>
      <h1 className="mt-1 text-3xl">Your menus</h1>

      {venue && (
        <section className="mt-5 rounded-2xl border bg-card p-4">
          <div className="flex gap-4">
            <div className={`rounded-xl bg-background p-2 ${live ? "" : "opacity-30"}`}>
              <QRCodeSVG value={url || venue.slug} size={96} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{live ? "Your menu is live" : "Not live yet"}</p>
              <p className="text-sm text-muted-foreground">
                {live ? "Print this QR or share the link. It opens your menu directly." : "Publish a menu to activate your QR code and link."}
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
            <Link key={m.id} to="/admin/menus/$menuId" params={{ menuId: m.id }} className="flex min-h-16 items-center justify-between rounded-2xl border bg-card p-4 hover:border-primary">
              <div>
                <p className="font-semibold">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.sections.length} sections · {items} items</p>
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
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New menu, e.g. Drinks" className="h-11" />
          <Button type="submit" className="h-11" variant="outline">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>
      )}
    </main>
  );
}
