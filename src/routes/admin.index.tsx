import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertTriangle,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Fuel,
  Lock,
  MoreVertical,
  Plus,
  Rocket,
  Store,
  Trash2,
  CopyPlus,
} from "lucide-react";
import { toast } from "sonner";
import { canAuthorMenus, canManageBilling, usePewa } from "@/lib/pewa/store";
import { StatusBadge } from "@/components/pewa/StatusBadge";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/pewa/metadata";
import { getVenuePublishedMenus, isMenuEligibleForVenue } from "@/lib/pewa/taxonomy";
import { CreateMenuModal } from "@/components/pewa/CreateMenuModal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () =>
    pageHead(
      "Your business menus",
      "Publish and share your business menus with QR codes and direct links.",
    ),
  component: Overview,
});

function Overview() {
  const {
    organisation,
    venues,
    menus,
    role,
    orderPolicy,
    setMenuStatus,
    duplicateMenu,
    deleteMenu,
  } = usePewa();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const orgVenues = venues.filter((v) => v.orgId === organisation?.id);
  const isMultiVenue = orgVenues.length > 1;

  // Selected venue for QR code / link / filter. Empty string means "All venues"
  const [filterVenueId, setFilterVenueId] = useState<string>("");
  const activeQrVenue = orgVenues.find((v) => v.id === filterVenueId) || orgVenues[0];

  const orgMenus = menus.filter((m) => m.orgId === organisation?.id);

  // Filtered menus based on venue selection
  const displayedMenus = filterVenueId
    ? orgMenus.filter((m) => {
        const v = orgVenues.find((x) => x.id === filterVenueId);
        return v ? isMenuEligibleForVenue(m, v, venues) : true;
      })
    : orgMenus;

  const live = activeQrVenue
    ? getVenuePublishedMenus(activeQrVenue, orgMenus, venues, { includeProtected: false }).length >
      0
    : false;

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const qrUrl = activeQrVenue ? `${origin}/m/${activeQrVenue.slug}` : "";
  const totalUnits = orderPolicy.included + orderPolicy.topUp;
  const isZeroUnits = totalUnits === 0 && !orderPolicy.expired;
  const author = canAuthorMenus(role);

  return (
    <main className="mx-auto max-w-3xl px-4 pt-5 pb-24">
      {/* Organisation and Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {organisation?.name} · Workspace
          </p>
          <h1 className="mt-0.5 text-3xl font-bold tracking-tight">Your menus</h1>
        </div>

        {canManageBilling(role) && (
          <Button asChild variant="outline" size="sm" className="h-9 shrink-0">
            <Link to="/admin/billing">
              <Fuel className="mr-1.5 h-3.5 w-3.5 text-primary" />
              {orderPolicy.expired ? "Subscription expired" : `${totalUnits} units`}
            </Link>
          </Button>
        )}
      </div>

      {/* Multi-Venue Context Switcher & Filter */}
      {isMultiVenue && (
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <Button
            variant={filterVenueId === "" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterVenueId("")}
            className="h-8 rounded-full text-xs shrink-0"
          >
            All venues ({orgMenus.length})
          </Button>
          {orgVenues.map((v) => {
            const count = orgMenus.filter((m) => isMenuEligibleForVenue(m, v, venues)).length;
            return (
              <Button
                key={v.id}
                variant={filterVenueId === v.id ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterVenueId(v.id)}
                className="h-8 rounded-full text-xs shrink-0"
              >
                {v.name} ({count})
              </Button>
            );
          })}
        </div>
      )}

      {/* Zero Units Alert */}
      {isZeroUnits && canManageBilling(role) && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-50/60 p-3 text-xs text-amber-950 dark:bg-amber-950/20 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <b>0 acceptance units available.</b> Structured requests paused; menus and direct
              contact stay live.
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

      {/* QR Code and Live Sharing Card */}
      {activeQrVenue && (
        <section className="mt-5 rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex gap-4 items-start">
            <div
              className={cn(
                "rounded-xl bg-background p-2.5 border shrink-0",
                !live && "opacity-40",
              )}
            >
              <QRCodeSVG value={qrUrl || activeQrVenue.slug} size={88} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">{activeQrVenue.name}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    live
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {live ? "Live to customers" : "No live menu yet"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {live
                  ? "Print this QR code for tables or counter, or share the direct link."
                  : "Publish a menu assigned to this venue to activate your QR code and link."}
              </p>
              <p className="mt-1.5 truncate font-mono text-xs text-primary">
                /m/{activeQrVenue.slug}
              </p>
            </div>
          </div>
          {live && (
            <div className="mt-3.5 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="h-10 flex-1 text-xs font-semibold"
                onClick={() => {
                  navigator.clipboard?.writeText(qrUrl);
                  toast.success("Live menu link copied to clipboard");
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy link
              </Button>
              <Button asChild size="sm" className="h-10 flex-1 text-xs font-semibold">
                <Link to="/m/$slug" params={{ slug: activeQrVenue.slug }}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> View live menu
                </Link>
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Action Header: Create New Menu */}
      <div className="mt-7 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">
            {filterVenueId && activeQrVenue
              ? `${activeQrVenue.name} Menus`
              : "Menus in organisation"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {displayedMenus.length} {displayedMenus.length === 1 ? "menu" : "menus"} configured
          </p>
        </div>

        {author && (
          <Button
            onClick={() => setCreateModalOpen(true)}
            size="sm"
            className="h-10 font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Create menu</span>
          </Button>
        )}
      </div>

      {/* Menu Cards List */}
      <section className="mt-3 space-y-3">
        {displayedMenus.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center space-y-3 bg-muted/20">
            <Store className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-medium text-sm text-foreground">No menus found in this context</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Create your first menu for this venue to start organising categories, sections, and
              offerings.
            </p>
            {author && (
              <Button onClick={() => setCreateModalOpen(true)} size="sm" className="font-semibold">
                <Plus className="h-4 w-4 mr-1.5" /> Create new menu
              </Button>
            )}
          </div>
        ) : (
          displayedMenus.map((m) => {
            const itemCount = m.sections.reduce((n, s) => n + s.offerings.length, 0);

            // Determine assigned venues
            const assignedVenues = orgVenues.filter((v) => isMenuEligibleForVenue(m, v, venues));
            const primaryAssignedVenue = assignedVenues[0] || activeQrVenue;

            return (
              <article
                key={m.id}
                className="rounded-2xl border bg-card p-4 shadow-xs transition-all hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        to="/admin/menus/$menuId"
                        params={{ menuId: m.id }}
                        className="font-bold text-base hover:text-primary transition-colors line-clamp-1"
                      >
                        {m.name}
                      </Link>
                      <StatusBadge status={m.status} />
                      {m.isProtected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                          <Lock className="h-3 w-3" />
                          <span>Protected</span>
                        </span>
                      )}
                    </div>

                    {m.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        {m.description}
                      </p>
                    )}

                    {/* Venue Eligibility Badge */}
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                      <span className="font-semibold">Context:</span>
                      {assignedVenues.length === 0 ? (
                        <span className="text-amber-600 font-medium">Unassigned</span>
                      ) : assignedVenues.length === 1 ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-foreground font-medium">
                          {assignedVenues[0]?.name}
                        </span>
                      ) : assignedVenues.length === orgVenues.length ? (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary font-medium">
                          Shared across all {assignedVenues.length} venues
                        </span>
                      ) : (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary font-medium">
                          Shared: {assignedVenues.map((v) => v.name).join(", ")}
                        </span>
                      )}
                      <span>·</span>
                      <span>
                        {m.sections.length} {m.sections.length === 1 ? "section" : "sections"} ·{" "}
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
                  <Button asChild size="sm" className="h-9 flex-1 font-semibold text-xs">
                    <Link to="/admin/menus/$menuId" params={{ menuId: m.id }}>
                      {m.status === "draft" ? "Resume draft" : "Edit menu"}
                    </Link>
                  </Button>

                  {/* Customer preview action */}
                  {primaryAssignedVenue && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs font-semibold"
                    >
                      <Link
                        to="/m/$slug"
                        params={{ slug: primaryAssignedVenue.slug }}
                        search={{ preview: m.id }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1 text-muted-foreground" /> Preview
                      </Link>
                    </Button>
                  )}

                  {author && (
                    <>
                      {m.status === "published" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 text-xs"
                          onClick={() => {
                            setMenuStatus(m.id, "hidden");
                            toast.success(`“${m.name}” is now hidden from public view`);
                          }}
                        >
                          <EyeOff className="h-3.5 w-3.5 mr-1" /> Hide
                        </Button>
                      ) : m.status === "archived" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 text-xs text-muted-foreground"
                          onClick={() => {
                            setMenuStatus(m.id, "draft");
                            toast.success(`Restored “${m.name}” as draft`);
                          }}
                        >
                          Restore as draft
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-9 text-xs font-semibold"
                          disabled={itemCount === 0}
                          onClick={() => {
                            setMenuStatus(m.id, "published");
                            toast.success(`“${m.name}” is now published and live`);
                          }}
                        >
                          <Rocket className="h-3.5 w-3.5 mr-1 text-primary" /> Publish
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 px-2 text-muted-foreground hover:text-foreground"
                        title="Duplicate menu as draft"
                        onClick={() => {
                          duplicateMenu(m.id);
                          toast.success(`Duplicated “${m.name}” as draft`);
                        }}
                      >
                        <CopyPlus className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 px-2 text-muted-foreground hover:text-destructive"
                        title={
                          m.status === "draft" ? "Discard draft menu" : "Remove or archive menu"
                        }
                        onClick={() => {
                          const isDraft = m.status === "draft";
                          const confirmMsg = isDraft
                            ? `Discard draft menu “${m.name}”?`
                            : `Remove menu “${m.name}”? If this menu was previously published or has historical orders, it will be safely archived to preserve records.`;
                          if (confirm(confirmMsg)) {
                            const res = deleteMenu(m.id);
                            if (res.action === "archived") {
                              toast.info(res.message);
                            } else {
                              toast.success(res.message);
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* Guided Menu Creation Modal */}
      <CreateMenuModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        defaultVenueId={filterVenueId || undefined}
      />
    </main>
  );
}
