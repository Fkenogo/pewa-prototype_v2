import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Filter,
  MessageCircle,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  canAuthorMenus,
  getActiveOrganisationMembership,
  getEffectiveBusinessRole,
  usePewa,
} from "@/lib/pewa/store";
import type { AccessChannel, MenuAccessReference } from "@/lib/pewa/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/access")({
  head: () => ({
    meta: [
      { title: "QR Codes & Menu Access — Business Workspace" },
      {
        name: "description",
        content:
          "Generate and manage table QR codes, short access codes, direct web links, and WhatsApp entry points.",
      },
    ],
  }),
  component: AdminAccessPage,
});

export function AdminAccessPage() {
  const navigate = useNavigate();
  const state = usePewa();
  const {
    organisation,
    venues,
    menus,
    accessReferences = [],
    createAccessReference,
    updateAccessReferenceStatus,
    regenerateAccessCode,
    deleteAccessReference,
  } = state;

  const effectiveRole = getEffectiveBusinessRole(state);
  const activeMembership = getActiveOrganisationMembership(state);
  const isAuthorised = canAuthorMenus(effectiveRole);

  // Filter venues scoped to manager if restricted
  const orgVenues = useMemo(() => {
    const list = venues.filter((v) => v.orgId === organisation?.id);
    if (effectiveRole === "manager" && activeMembership?.scopeType === "restricted") {
      const allowed =
        activeMembership.venueIds && activeMembership.venueIds.length > 0
          ? activeMembership.venueIds
          : activeMembership.venueId
            ? [activeMembership.venueId]
            : [];
      return list.filter((v) => allowed.includes(v.id));
    }
    return list;
  }, [venues, organisation?.id, effectiveRole, activeMembership]);

  // Published menus in this organisation
  const orgPublishedMenus = useMemo(() => {
    return menus.filter((m) => m.orgId === organisation?.id && m.status === "published");
  }, [menus, organisation?.id]);

  // Scoped access references
  const scopedReferences = useMemo(() => {
    const list = accessReferences.filter((r) => r.orgId === organisation?.id);
    if (effectiveRole === "manager" && activeMembership?.scopeType === "restricted") {
      const allowedVenues =
        activeMembership.venueIds && activeMembership.venueIds.length > 0
          ? activeMembership.venueIds
          : activeMembership.venueId
            ? [activeMembership.venueId]
            : [];
      return list.filter((r) => {
        if (!allowedVenues.includes(r.venueId)) return false;
        if (
          activeMembership.servicePoints &&
          activeMembership.servicePoints.length > 0 &&
          r.servicePoint
        ) {
          const mgrStations = activeMembership.servicePoints.map((sp) => sp.toLowerCase().trim());
          return mgrStations.includes(r.servicePoint.toLowerCase().trim());
        }
        return true;
      });
    }
    return list;
  }, [accessReferences, organisation?.id, effectiveRole, activeMembership]);

  // UI Filters
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>("all");
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReferences = useMemo(() => {
    return scopedReferences.filter((r) => {
      if (selectedVenueFilter !== "all" && r.venueId !== selectedVenueFilter) return false;
      if (selectedChannelFilter !== "all" && r.channel !== selectedChannelFilter) return false;
      if (selectedStatusFilter !== "all" && r.status !== selectedStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesLabel = r.label.toLowerCase().includes(q);
        const matchesCode = r.shortCode.toLowerCase().includes(q);
        const matchesSp = (r.servicePoint || "").toLowerCase().includes(q);
        return matchesLabel || matchesCode || matchesSp;
      }
      return true;
    });
  }, [
    scopedReferences,
    selectedVenueFilter,
    selectedChannelFilter,
    selectedStatusFilter,
    searchQuery,
  ]);

  // Modal / Drawer state for Creation
  const [createOpen, setCreateOpen] = useState(false);
  const [formVenueId, setFormVenueId] = useState(orgVenues[0]?.id || "");
  const [formMenuId, setFormMenuId] = useState(orgPublishedMenus[0]?.id || "");
  const [formServicePoint, setFormServicePoint] = useState("");
  const [formChannel, setFormChannel] = useState<AccessChannel>("qr");
  const [formLabel, setFormLabel] = useState("");
  const [formCustomCode, setFormCustomCode] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Selected reference for QR Print / High-Res View Dialog
  const [qrModalRef, setQrModalRef] = useState<MenuAccessReference | null>(null);

  // Manager service point options for selected form venue
  const availableServicePoints = useMemo(() => {
    const venue = orgVenues.find((v) => v.id === formVenueId);
    let contexts = venue?.serviceContexts || [];
    if (
      effectiveRole === "manager" &&
      activeMembership?.servicePoints &&
      activeMembership.servicePoints.length > 0
    ) {
      const allowed = activeMembership.servicePoints.map((s) => s.toLowerCase().trim());
      contexts = contexts.filter((c) => allowed.includes(c.toLowerCase().trim()));
    }
    return contexts;
  }, [formVenueId, orgVenues, effectiveRole, activeMembership]);

  const handleOpenCreate = () => {
    setFormError(null);
    const defaultVenue = orgVenues[0];
    const defaultMenu = orgPublishedMenus[0];
    setFormVenueId(defaultVenue?.id || "");
    setFormMenuId(defaultMenu?.id || "");
    setFormServicePoint(defaultVenue?.serviceContexts?.[0] || "");
    setFormChannel("qr");
    setFormLabel("");
    setFormCustomCode("");
    setFormPrompt("");
    setCreateOpen(true);
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formVenueId) {
      setFormError("Please select a location.");
      return;
    }
    if (!formMenuId) {
      setFormError("Please select a published menu.");
      return;
    }

    const res = createAccessReference({
      venueId: formVenueId,
      menuId: formMenuId,
      servicePoint: formServicePoint.trim() || undefined,
      channel: formChannel,
      label: formLabel.trim() || undefined,
      shortCode: formCustomCode.trim() || undefined,
      customPrompt: formPrompt.trim() || undefined,
    });

    if (!res.success) {
      setFormError(res.error || "Failed to create access reference.");
      return;
    }

    toast.success(`Access reference created: ${res.reference?.shortCode}`);
    setCreateOpen(false);
    if (res.reference) {
      setQrModalRef(res.reference);
    }
  };

  const getDirectUrl = (ref: MenuAccessReference) => {
    const venue = venues.find((v) => v.id === ref.venueId);
    if (!venue) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://pewa.ke";
    return `${origin}/m/${venue.slug}?menu=${ref.menuId}&access=${ref.id}&code=${ref.shortCode}${ref.servicePoint ? `&sp=${encodeURIComponent(ref.servicePoint)}` : ""}&channel=${ref.channel}`;
  };

  const getShortUrl = (ref: MenuAccessReference) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://pewa.ke";
    return `${origin}/c/${ref.shortCode}`;
  };

  const getWhatsAppUrl = (ref: MenuAccessReference) => {
    const venue = venues.find((v) => v.id === ref.venueId);
    const rawNumber = (venue?.contact?.whatsapp || venue?.contact?.phone || "").replace(
      /[^0-9]/g,
      "",
    );
    const directUrl = getShortUrl(ref);
    const defaultMsg =
      ref.customPrompt ||
      `Hi, I'd like to view the menu for ${venue?.name || "your business"}${ref.servicePoint ? ` (${ref.servicePoint})` : ""} on PEWA: ${directUrl}`;
    return `https://wa.me/${rawNumber}?text=${encodeURIComponent(defaultMsg)}`;
  };

  const downloadQrSvg = (ref: MenuAccessReference) => {
    const svgEl =
      document.getElementById(`qr-svg-${ref.id}`) || document.getElementById("qr-modal-svg");
    if (!svgEl) {
      toast.error("Unable to generate QR image for download.");
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PEWA-${ref.shortCode}-${ref.label.replace(/\s+/g, "_")}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded QR for ${ref.shortCode}`);
  };

  if (!isAuthorised) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mb-3" />
        <h1 className="font-display text-xl font-bold">Access Restricted</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You do not have permission to manage QR codes or access points. Only Owners, Admins, and
          authorised Managers can configure customer access.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/admin">Back to Overview</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight">QR Codes & Access</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              R3-C
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground max-w-xl">
            Create and manage table QR cards, short access codes, and direct customer links. All
            channels resolve directly through your published menus.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} className="h-10 gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" /> New Access Point
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-3 shadow-xs">
          <p className="text-xs text-muted-foreground">Total Access Points</p>
          <p className="font-display text-2xl font-bold mt-1">{scopedReferences.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-xs">
          <p className="text-xs text-muted-foreground">Active QR Codes</p>
          <p className="font-display text-2xl font-bold mt-1 text-primary">
            {scopedReferences.filter((r) => r.channel === "qr" && r.status === "active").length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-xs">
          <p className="text-xs text-muted-foreground">WhatsApp Links</p>
          <p className="font-display text-2xl font-bold mt-1 text-emerald-600">
            {
              scopedReferences.filter((r) => r.channel === "whatsapp" && r.status === "active")
                .length
            }
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-xs">
          <p className="text-xs text-muted-foreground">Published Menus</p>
          <p className="font-display text-2xl font-bold mt-1">{orgPublishedMenus.length}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by label, code (e.g. GGC-BAR), or service point..."
            className="h-9 pl-9 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {orgVenues.length > 1 && (
            <select
              aria-label="Filter by venue"
              value={selectedVenueFilter}
              onChange={(e) => setSelectedVenueFilter(e.target.value)}
              className="h-9 rounded-md border bg-background px-2.5 text-xs text-foreground"
            >
              <option value="all">All Locations</option>
              {orgVenues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="Filter by channel"
            value={selectedChannelFilter}
            onChange={(e) => setSelectedChannelFilter(e.target.value)}
            className="h-9 rounded-md border bg-background px-2.5 text-xs text-foreground"
          >
            <option value="all">All Channels</option>
            <option value="qr">QR Code</option>
            <option value="code">Short Code</option>
            <option value="direct">Direct Link</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <select
            aria-label="Filter by status"
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="h-9 rounded-md border bg-background px-2.5 text-xs text-foreground"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
        </div>
      </div>

      {/* Access References Grid */}
      {filteredReferences.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
            <QrCode className="h-7 w-7" />
          </div>
          <h2 className="font-display text-base font-semibold">No menu access points found</h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {scopedReferences.length === 0
              ? "You haven't generated any table QR codes or short codes yet. Create your first access point to let guests browse and order."
              : "No access points match the selected filters."}
          </p>
          {scopedReferences.length === 0 && (
            <Button onClick={handleOpenCreate} className="mt-4 h-9 text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Table QR Code
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReferences.map((ref) => {
            const venue = venues.find((v) => v.id === ref.venueId);
            const menu = menus.find((m) => m.id === ref.menuId);
            const shortUrl = getShortUrl(ref);
            const isMenuPublished = menu?.status === "published";

            return (
              <div
                key={ref.id}
                data-testid={`access-card-${ref.shortCode}`}
                className={cn(
                  "flex flex-col justify-between rounded-xl border bg-card p-4 shadow-2xs transition-all",
                  ref.status === "disabled" && "opacity-75 bg-muted/20 border-dashed",
                )}
              >
                <div>
                  {/* Top line badges */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        ref.channel === "qr" && "bg-primary/10 text-primary",
                        ref.channel === "whatsapp" && "bg-emerald-500/10 text-emerald-600",
                        ref.channel === "code" && "bg-blue-500/10 text-blue-600",
                        ref.channel === "direct" && "bg-purple-500/10 text-purple-600",
                      )}
                    >
                      {ref.channel.toUpperCase()}
                    </span>

                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        ref.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-muted text-muted-foreground border",
                      )}
                    >
                      {ref.status === "active" ? "Active" : "Disabled"}
                    </span>
                  </div>

                  {/* Title & Service Context */}
                  <h3 className="font-semibold text-sm text-foreground">{ref.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {venue?.name || "Unknown Venue"}
                    {ref.servicePoint ? ` · ${ref.servicePoint}` : ""}
                  </p>

                  {/* Target Menu warning if unpublished */}
                  <div className="mt-2 text-xs flex items-center gap-1.5">
                    <span className="text-muted-foreground font-medium">Menu:</span>
                    <span className="font-semibold text-foreground truncate">
                      {menu?.name || "Deleted"}
                    </span>
                    {!isMenuPublished && (
                      <span className="rounded bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.2">
                        {menu?.status.toUpperCase() || "UNAVAILABLE"}
                      </span>
                    )}
                    {ref.type === "protected" && (
                      <span className="rounded bg-indigo-100 text-indigo-900 text-[10px] font-bold px-1.5 py-0.2">
                        PROTECTED
                      </span>
                    )}
                  </div>

                  {/* QR & Code visual */}
                  <div className="mt-3.5 flex items-center gap-3.5 rounded-lg border bg-muted/40 p-2.5">
                    <div className="shrink-0 rounded-md bg-white p-1 shadow-2xs">
                      <QRCodeSVG id={`qr-svg-${ref.id}`} value={shortUrl} size={64} level="M" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">
                        Short Code
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <code className="font-mono text-base font-bold text-primary tracking-wider truncate">
                          {ref.shortCode}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(ref.shortCode);
                            toast.success(`Copied code ${ref.shortCode}`);
                          }}
                          aria-label={`Copy code ${ref.shortCode}`}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{shortUrl}</p>
                    </div>
                  </div>

                  {/* WhatsApp Prompt Preview if WhatsApp */}
                  {ref.channel === "whatsapp" && (
                    <div className="mt-2.5 rounded-md border border-emerald-200 bg-emerald-50/50 p-2 text-xs text-emerald-950">
                      <p className="font-semibold text-[10px] uppercase text-emerald-800 flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> WhatsApp Entry Link
                      </p>
                      <p className="text-[11px] mt-0.5 italic line-clamp-2">
                        "
                        {ref.customPrompt ||
                          `Hi, I'd like to view the menu for ${venue?.name} on PEWA.`}
                        "
                      </p>
                      <a
                        href={getWhatsAppUrl(ref)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Test WhatsApp link
                      </a>
                    </div>
                  )}
                </div>

                {/* Actions Row */}
                <div className="mt-4 pt-3 border-t flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-medium px-2.5"
                      onClick={() => setQrModalRef(ref)}
                    >
                      <QrCode className="h-3.5 w-3.5 mr-1" /> View & Print
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs font-medium px-2"
                      onClick={() => {
                        const directUrl = getDirectUrl(ref);
                        navigator.clipboard.writeText(directUrl);
                        toast.success("Direct menu link copied to clipboard");
                      }}
                      title="Copy direct customer link"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const newStatus = ref.status === "active" ? "disabled" : "active";
                        updateAccessReferenceStatus(ref.id, newStatus);
                      }}
                      title={
                        ref.status === "active" ? "Disable access point" : "Re-enable access point"
                      }
                    >
                      {ref.status === "active" ? (
                        <ToggleRight className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete access point "${ref.label}"?`)) {
                          deleteAccessReference(ref.id);
                        }
                      }}
                      title="Delete access point"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Drawer */}
      <Drawer open={createOpen} onOpenChange={setCreateOpen}>
        <DrawerContent className="mx-auto max-w-lg">
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-display text-xl">Create Menu Access Point</DrawerTitle>
            <DrawerDescription>
              Connect a published menu to a table QR, counter sign, short code, or WhatsApp link.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSubmitCreate} className="space-y-3.5 px-4 pb-safe">
            {formError && (
              <div
                role="alert"
                className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive"
              >
                {formError}
              </div>
            )}

            {/* Venue selection */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Location</label>
              <select
                aria-label="Location"
                value={formVenueId}
                onChange={(e) => setFormVenueId(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-xs"
              >
                {orgVenues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.deliveryOnly ? "(Delivery Only)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Menu selection */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Published Menu</label>
              {orgPublishedMenus.length === 0 ? (
                <p className="mt-1 rounded-md bg-amber-50 p-2 text-xs text-amber-900 border border-amber-200">
                  No published menus available. Please publish a menu first from the Menus
                  workspace.
                </p>
              ) : (
                <select
                  aria-label="Published menu"
                  value={formMenuId}
                  onChange={(e) => setFormMenuId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-xs"
                >
                  {orgPublishedMenus.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.isProtected ? "(Protected)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Service point context */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Service Station / Point (Optional)
              </label>
              {availableServicePoints.length > 0 ? (
                <select
                  aria-label="Service point"
                  value={formServicePoint}
                  onChange={(e) => setFormServicePoint(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-xs"
                >
                  <option value="">General Venue Menu</option>
                  {availableServicePoints.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={formServicePoint}
                  onChange={(e) => setFormServicePoint(e.target.value)}
                  placeholder="e.g. Table 4, Bar Counter, Poolside, Room 302"
                  className="mt-1 h-10 text-xs"
                />
              )}
            </div>

            {/* Channel selection */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Access Channel</label>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {[
                  { id: "qr", label: "QR Code" },
                  { id: "code", label: "Short Code" },
                  { id: "direct", label: "Direct Link" },
                  { id: "whatsapp", label: "WhatsApp" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFormChannel(c.id as AccessChannel)}
                    className={cn(
                      "rounded-lg border py-2 text-center text-xs font-medium transition-colors",
                      formChannel === c.id
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Label */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Display Label (Optional)
              </label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="e.g. Lobby Bar Counter Stand, Table 12, Delivery Flyer"
                className="mt-1 h-10 text-xs"
              />
            </div>

            {/* Custom Code */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Custom Short Code (Optional, leave blank to auto-generate)
              </label>
              <Input
                value={formCustomCode}
                onChange={(e) => setFormCustomCode(e.target.value.toUpperCase())}
                placeholder="e.g. GGC-BAR or T-04"
                className="mt-1 h-10 font-mono text-xs uppercase"
                maxLength={14}
              />
            </div>

            {/* WhatsApp Prompt */}
            {formChannel === "whatsapp" && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Pre-filled WhatsApp Message
                </label>
                <Input
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="e.g. Hi, I'd like to see the menu on PEWA!"
                  className="mt-1 h-10 text-xs"
                />
              </div>
            )}

            <DrawerFooter className="px-0 pt-2">
              <Button
                type="submit"
                className="h-11 w-full"
                disabled={orgPublishedMenus.length === 0}
              >
                Generate Access Point
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* High-Res QR View & Print Dialog */}
      <Dialog open={!!qrModalRef} onOpenChange={(open) => !open && setQrModalRef(null)}>
        <DialogContent className="max-w-sm text-center">
          {qrModalRef && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">{qrModalRef.label}</DialogTitle>
                <DialogDescription>Customer table stand & QR display preview</DialogDescription>
              </DialogHeader>

              <div className="my-2 flex flex-col items-center justify-center rounded-2xl border bg-card p-6 shadow-xs">
                <div className="rounded-xl bg-white p-3 shadow-md">
                  <QRCodeSVG
                    id="qr-modal-svg"
                    value={getShortUrl(qrModalRef)}
                    size={192}
                    level="H"
                  />
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Scan or enter code
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black text-primary tracking-widest">
                    {qrModalRef.shortCode}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{getShortUrl(qrModalRef)}</p>
                  {qrModalRef.servicePoint && (
                    <p className="mt-2 text-xs font-semibold text-foreground">
                      Station: {qrModalRef.servicePoint}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="flex flex-col gap-2 sm:flex-col">
                <Button onClick={() => downloadQrSvg(qrModalRef)} className="w-full gap-2 h-10">
                  <Download className="h-4 w-4" /> Download SVG Image
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const directUrl = getDirectUrl(qrModalRef);
                    window.open(directUrl, "_blank");
                  }}
                  className="w-full gap-2 h-10"
                >
                  <ExternalLink className="h-4 w-4" /> Preview Customer Destination
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
