import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertTriangle,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Fuel,
  Layers,
  Lock,
  Plus,
  Rocket,
  Sparkles,
  Store,
  Trash2,
  CopyPlus,
  Edit2,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import {
  canAuthorMenus,
  canManageBilling,
  formatPrice,
  hasUnpublishedDraftChanges,
  usePewa,
} from "@/lib/pewa/store";
import { StatusBadge } from "@/components/pewa/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { pageHead } from "@/lib/pewa/metadata";
import { getVenuePublishedMenus, isMenuEligibleForVenue } from "@/lib/pewa/taxonomy";
import { getSharedOfferingUsage, parseScheduleReferenceTime } from "@/lib/pewa/availability";
import { CreateMenuModal } from "@/components/pewa/CreateMenuModal";
import type { SharedOffering } from "@/lib/pewa/types";
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
    simulatedTime,
    setSimulatedTime,
    sharedOfferings,
    upsertSharedOffering,
    deleteSharedOffering,
    setMenuStatus,
    publishMenu,
    duplicateMenu,
    deleteMenu,
  } = usePewa();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"menus" | "shared">("menus");
  const [editingSharedOffering, setEditingSharedOffering] = useState<SharedOffering | null>(null);
  const [isCreatingShared, setIsCreatingShared] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState(simulatedTime || "");

  useEffect(() => {
    setCustomTimeInput(simulatedTime || "");
  }, [simulatedTime]);

  const parsedTime = customTimeInput.trim() ? parseScheduleReferenceTime(customTimeInput) : null;
  const hasTimeError = parsedTime !== null && !parsedTime.valid;

  const orgVenues = venues.filter((v) => v.orgId === organisation?.id);
  const isMultiVenue = orgVenues.length > 1;
  const currency = orgVenues[0]?.currency || "KES";

  // Selected venue for QR code / link / filter. Empty string means "All venues"
  const [filterVenueId, setFilterVenueId] = useState<string>("");
  const activeQrVenue = orgVenues.find((v) => v.id === filterVenueId) || orgVenues[0];

  const orgMenus = menus.filter((m) => m.orgId === organisation?.id);
  const orgSharedOfferings = (sharedOfferings || []).filter((so) => so.orgId === organisation?.id);

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

      {/* R1-D Clock & Schedule Simulation Toolbar for Prototype Testing */}
      <div className="mt-4 rounded-xl border bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold">Simulated Service Time:</span>
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                  {simulatedTime ? `${simulatedTime}` : "System Clock (Live, Africa/Nairobi)"}
                </span>
                {simulatedTime && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    Active simulation
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Simulate day-of-week and time to evaluate breakfast, afternoon, and overnight
                service intervals deterministically.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={simulatedTime === "mon 09:00" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => {
                setSimulatedTime("mon 09:00");
                toast.info("Clock set to Monday 09:00 (Breakfast hours)");
              }}
            >
              Mon 09:00 (Breakfast)
            </Button>
            <Button
              variant={simulatedTime === "tue 14:00" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => {
                setSimulatedTime("tue 14:00");
                toast.info("Clock set to Tuesday 14:00 (Lunch hours)");
              }}
            >
              Tue 14:00 (Lunch)
            </Button>
            <Button
              variant={simulatedTime === "mon 23:30" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => {
                setSimulatedTime("mon 23:30");
                toast.info("Clock set to Monday 23:30 (Late night interval)");
              }}
            >
              Mon 23:30 (Late night)
            </Button>
            <Button
              variant={simulatedTime === "tue 02:00" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => {
                setSimulatedTime("tue 02:00");
                toast.info("Clock set to Tuesday 02:00 (Overnight continuation)");
              }}
            >
              Tue 02:00 (Overnight)
            </Button>
            <Button
              variant={simulatedTime === "sun 11:00" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => {
                setSimulatedTime("sun 11:00");
                toast.info("Clock set to Sunday 11:00 (Weekend brunch)");
              }}
            >
              Sun 11:00 (Weekend)
            </Button>
            {simulatedTime && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSimulatedTime(undefined);
                  toast.info("Clock reset to system time");
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Custom time input row */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t pt-2 text-xs">
          <Label
            htmlFor="custom-sim-time"
            className="text-[11px] text-muted-foreground font-medium"
          >
            Custom schedule time:
          </Label>
          <div className="flex items-center gap-1.5">
            <Input
              id="custom-sim-time"
              placeholder="e.g. mon 09:00 or 14:30"
              value={customTimeInput}
              onChange={(e) => setCustomTimeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const check = parseScheduleReferenceTime(customTimeInput);
                  if (check.valid) {
                    setSimulatedTime(customTimeInput.trim());
                    toast.success(`Simulated time set to "${customTimeInput.trim()}"`);
                  } else {
                    toast.error(check.error || "Invalid time format");
                  }
                }
              }}
              className={cn("h-7 w-44 text-xs font-mono", hasTimeError && "border-destructive")}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2 font-semibold"
              onClick={() => {
                if (!customTimeInput.trim()) {
                  setSimulatedTime(undefined);
                  toast.info("Clock reset to system time");
                  return;
                }
                const check = parseScheduleReferenceTime(customTimeInput);
                if (check.valid) {
                  setSimulatedTime(customTimeInput.trim());
                  toast.success(`Simulated time set to "${customTimeInput.trim()}"`);
                } else {
                  toast.error(check.error || "Invalid time format");
                }
              }}
            >
              Apply
            </Button>
          </div>
          {hasTimeError && (
            <span className="text-[11px] font-medium text-destructive">⚠ {parsedTime.error}</span>
          )}
        </div>
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

      {/* Workspace Tabs: Menus vs Shared Catalogue */}
      <div className="mt-7 flex items-center border-b pb-2 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("menus")}
          className={cn(
            "flex items-center gap-2 pb-2 font-semibold text-sm transition-colors border-b-2 -mb-2.5",
            activeTab === "menus"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <UtensilsCrossed className="h-4 w-4" />
          <span>Menus ({displayedMenus.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("shared")}
          className={cn(
            "flex items-center gap-2 pb-2 font-semibold text-sm transition-colors border-b-2 -mb-2.5",
            activeTab === "shared"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Layers className="h-4 w-4" />
          <span>Shared Catalogue ({orgSharedOfferings.length})</span>
        </button>
      </div>

      {activeTab === "menus" ? (
        <>
          {/* Action Header: Create New Menu */}
          <div className="mt-6 flex items-center justify-between">
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
                <p className="font-medium text-sm text-foreground">
                  No menus found in this context
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Create your first menu for this venue to start organising categories, sections,
                  and offerings.
                </p>
                {author && (
                  <Button
                    onClick={() => setCreateModalOpen(true)}
                    size="sm"
                    className="font-semibold"
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Create new menu
                  </Button>
                )}
              </div>
            ) : (
              displayedMenus.map((m) => {
                const itemCount = m.sections.reduce((n, s) => n + s.offerings.length, 0);

                const assignedVenues = orgVenues.filter((v) =>
                  isMenuEligibleForVenue(m, v, venues),
                );
                const primaryAssignedVenue = assignedVenues[0] || activeQrVenue;
                const hasPendingChanges =
                  m.status === "published" && hasUnpublishedDraftChanges(m, sharedOfferings);

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
                          {hasPendingChanges && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400">
                              <Sparkles className="h-3 w-3" />
                              <span>Pending changes</span>
                            </span>
                          )}
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
        </>
      ) : (
        /* Shared Offerings Catalogue Tab */
        <section className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Shared Reusable Offerings</h2>
              <p className="text-xs text-muted-foreground">
                Base catalogue items reusable across menus and venues with centralized updates.
              </p>
            </div>
            {author && (
              <Button
                onClick={() => {
                  setEditingSharedOffering({
                    id: `sh_${Date.now()}`,
                    orgId: organisation?.id || "",
                    name: "",
                    category: "beverages",
                    price: 300,
                    description: "",
                    emoji: "☕",
                    tags: [],
                    modifiers: [],
                  });
                  setIsCreatingShared(true);
                }}
                size="sm"
                className="h-9 gap-1.5 font-semibold text-xs"
              >
                <Plus className="h-4 w-4" />
                <span>New master item</span>
              </Button>
            )}
          </div>

          {orgSharedOfferings.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center space-y-3 bg-muted/20">
              <Layers className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-sm text-foreground">No shared offerings created yet</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Create master items (e.g. signature coffee, house burger) that can be linked across
                multiple location menus.
              </p>
              {author && (
                <Button
                  onClick={() => {
                    setEditingSharedOffering({
                      id: `sh_${Date.now()}`,
                      orgId: organisation?.id || "",
                      name: "",
                      category: "beverages",
                      price: 300,
                      description: "",
                      emoji: "☕",
                      tags: [],
                      modifiers: [],
                    });
                    setIsCreatingShared(true);
                  }}
                  size="sm"
                  className="font-semibold"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Create first master item
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {orgSharedOfferings.map((so) => {
                const usages = getSharedOfferingUsage(so.id, orgMenus, orgVenues, {
                  orgId: organisation?.id,
                });
                return (
                  <article
                    key={so.id}
                    className="rounded-2xl border bg-card p-4 shadow-xs transition-all hover:border-primary/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {so.image ? (
                          <img
                            src={so.image}
                            alt={so.name}
                            className="h-14 w-14 rounded-xl object-cover shrink-0 border"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl border">
                            {so.emoji || "🍽️"}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-foreground">{so.name}</span>
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              {so.category}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs font-semibold text-foreground">
                            Base: {formatPrice(so.price, currency)}
                          </p>
                          {so.description && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {so.description}
                            </p>
                          )}

                          {/* Usage Breakdown with Pending Publication Detection */}
                          <div className="mt-2 text-[11px] text-muted-foreground">
                            {usages.length > 0 ? (
                              <div className="space-y-1.5">
                                <span className="font-semibold text-foreground">
                                  Linked menu locations:
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {usages.map((u, i) => {
                                    const linkedMenu = menus.find((m) => m.id === u.menuId);
                                    const hasPending =
                                      linkedMenu &&
                                      linkedMenu.status === "published" &&
                                      hasUnpublishedDraftChanges(linkedMenu, sharedOfferings);
                                    return (
                                      <span
                                        key={i}
                                        className={cn(
                                          "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px]",
                                          hasPending
                                            ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-300 font-medium"
                                            : "border-border bg-muted/60 text-foreground font-normal",
                                        )}
                                      >
                                        <span>
                                          {u.menuName} ({u.sectionName})
                                        </span>
                                        {hasPending && (
                                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                            Unpublished catalogue update
                                          </span>
                                        )}
                                        {hasPending && author && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-5 px-1.5 text-[10px] font-semibold border-amber-500/40 hover:bg-amber-500/20"
                                            onClick={() => {
                                              publishMenu(u.menuId);
                                              toast.success(
                                                `Published latest catalogue updates to “${u.menuName}”`,
                                              );
                                            }}
                                          >
                                            Publish now
                                          </Button>
                                        )}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <span className="italic text-muted-foreground">
                                Not currently linked in any active menu
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {author && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-xs font-semibold"
                            onClick={() => {
                              setEditingSharedOffering(so);
                              setIsCreatingShared(false);
                            }}
                          >
                            <Edit2 className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              const confirmMsg =
                                usages.length > 0
                                  ? `“${so.name}” is used in ${usages.length} menu section(s). Deleting it will unlink existing menu items, keeping their local content. Proceed?`
                                  : `Delete shared item “${so.name}”?`;
                              if (confirm(confirmMsg)) {
                                deleteSharedOffering(so.id);
                                toast.success(`Removed “${so.name}” from shared catalogue`);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Guided Menu Creation Modal */}
      <CreateMenuModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        defaultVenueId={filterVenueId || undefined}
      />

      {/* Edit / Create Shared Offering Modal */}
      {editingSharedOffering && (
        <SharedOfferingEditorDialog
          open={Boolean(editingSharedOffering)}
          isNew={isCreatingShared}
          offering={editingSharedOffering}
          currency={currency}
          onClose={() => setEditingSharedOffering(null)}
          onSave={(saved) => {
            upsertSharedOffering(saved);
            toast.success(
              isCreatingShared
                ? `Created master item “${saved.name}”`
                : `Updated master item “${saved.name}”`,
            );
            setEditingSharedOffering(null);
          }}
        />
      )}
    </main>
  );
}

interface SharedOfferingEditorDialogProps {
  open: boolean;
  isNew: boolean;
  offering: SharedOffering;
  currency: string;
  onClose: () => void;
  onSave: (offering: SharedOffering) => void;
}

function SharedOfferingEditorDialog({
  open,
  isNew,
  offering,
  currency,
  onClose,
  onSave,
}: SharedOfferingEditorDialogProps) {
  const [draft, setDraft] = useState<SharedOffering>(offering);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "New Master Offering" : "Edit Master Offering"}</DialogTitle>
          <DialogDescription className="text-xs">
            Changes to name and description propagate to menus linked to this master item, while
            preserving local venue price overrides.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2 text-xs">
          <div className="space-y-1">
            <Label className="text-xs">Offering Name</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Signature Cappuccino"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Input
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="e.g. beverages"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Base Price ({currency})</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={draft.price}
                onChange={(e) =>
                  setDraft({ ...draft, price: Math.max(0, parseInt(e.target.value, 10) || 0) })
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Detailed description or tasting notes..."
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Emoji Icon</Label>
            <Input
              className="w-20 text-center text-lg"
              value={draft.emoji || ""}
              onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
              maxLength={4}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!draft.name.trim()}
            onClick={() => onSave(draft)}
            className="font-semibold"
          >
            {isNew ? "Create Master Offering" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
