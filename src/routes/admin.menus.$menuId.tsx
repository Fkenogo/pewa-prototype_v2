import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  MoveRight,
  Pencil,
  Plus,
  Rocket,
  Settings,
  Sparkles,
  Tag as TagIcon,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  canAuthorMenus,
  canToggleAvailability,
  formatPrice,
  hasUnpublishedDraftChanges,
  usePewa,
} from "@/lib/pewa/store";
import type { ModifierGroup, Offering } from "@/lib/pewa/types";
import { StatusBadge } from "@/components/pewa/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { pageHead } from "@/lib/pewa/metadata";
import {
  getRecommendedSectionsForCategory,
  getSuggestedMenuNamesForCategory,
  isDietaryClaimTag,
  isMenuEligibleForVenue,
  getImageSource,
} from "@/lib/pewa/taxonomy";
import { OfferingEditorSheet, type OfferingDraft } from "@/components/pewa/OfferingEditorSheet";
import { formatSchedule } from "@/lib/pewa/availability";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/menus/$menuId")({
  head: () =>
    pageHead(
      "Edit business menu",
      "Create sections, edit offerings and publish your menu on PEWA.",
    ),
  component: MenuEditor,
});

function MenuEditor() {
  const { menuId } = Route.useParams();
  const s = usePewa();
  const menu = s.menus.find((m) => m.id === menuId && m.orgId === s.organisation?.id);
  const orgVenues = s.venues.filter((v) => v.orgId === s.organisation?.id);

  // Determine assigned venue(s)
  const assignedVenues = orgVenues.filter((v) =>
    menu ? isMenuEligibleForVenue(menu, v, s.venues) : false,
  );
  const primaryVenue = assignedVenues[0] || orgVenues[0];

  const currency = primaryVenue?.currency || s.organisation?.currency || "KES";
  const author = canAuthorMenus(s.role);
  const hasDraftChanges = menu ? hasUnpublishedDraftChanges(menu, s.sharedOfferings) : false;

  // Local State
  const [customSectionInput, setCustomSectionInput] = useState("");
  const [selectedBatchSections, setSelectedBatchSections] = useState<string[]>([]);
  const [editingOffering, setEditingOffering] = useState<{
    sectionId: string;
    offering: Offering | null;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reorganizeOpen, setReorganizeOpen] = useState(false);
  const [moveItemPicker, setMoveItemPicker] = useState<{
    offeringId: string;
    fromSectionId: string;
    offeringName: string;
  } | null>(null);
  const [pickSharedSectionId, setPickSharedSectionId] = useState<string | null>(null);

  // Settings Draft State
  const [settingsDraft, setSettingsDraft] = useState({
    name: "",
    description: "",
    isProtected: false,
    selectedVenueIds: [] as string[],
  });

  if (!menu) {
    return (
      <main className="mx-auto max-w-lg p-8 text-center space-y-3">
        <h1 className="text-2xl font-bold">Menu not found</h1>
        <p className="text-sm text-muted-foreground">
          The requested menu does not exist or has been removed.
        </p>
        <Button asChild variant="outline">
          <Link to="/admin">Back to menus</Link>
        </Button>
      </main>
    );
  }

  const itemCount = menu.sections.reduce((n, x) => n + x.offerings.length, 0);
  const categoryContext =
    primaryVenue?.category || s.organisation?.category || s.organisation?.businessType || "";

  const recommendedSections = getRecommendedSectionsForCategory(categoryContext);
  const suggestedNames = getSuggestedMenuNamesForCategory(categoryContext);

  // Open Settings Modal
  const openSettings = () => {
    setSettingsDraft({
      name: menu.name,
      description: menu.description || "",
      isProtected: Boolean(menu.isProtected),
      selectedVenueIds: assignedVenues.map((v) => v.id),
    });
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    if (!settingsDraft.name.trim()) {
      toast.error("Menu name cannot be empty");
      return;
    }
    if (orgVenues.length > 1 && settingsDraft.selectedVenueIds.length === 0) {
      toast.error("Please assign the menu to at least one venue");
      return;
    }

    s.updateMenuMeta(menu.id, {
      name: settingsDraft.name.trim(),
      description: settingsDraft.description.trim() || undefined,
      isProtected: settingsDraft.isProtected,
      venueIds:
        settingsDraft.selectedVenueIds.length > 0 ? settingsDraft.selectedVenueIds : undefined,
      venueId:
        settingsDraft.selectedVenueIds.length === 1 ? settingsDraft.selectedVenueIds[0] : undefined,
    });

    toast.success("Menu details updated");
    setSettingsOpen(false);
  };

  // Offering Actions
  const handleSaveOffering = (
    targetSectionId: string,
    draft: OfferingDraft,
    continueAdding?: boolean,
  ) => {
    if (!editingOffering) return;
    const { sectionId: origSectionId } = editingOffering;

    if (draft.id) {
      // Update item
      s.upsertOffering(menu.id, origSectionId, {
        id: draft.id,
        sharedOfferingId: draft.sharedOfferingId,
        name: draft.name.trim(),
        price: draft.price,
        description: draft.description.trim(),
        available: draft.available,
        emoji: draft.emoji,
        image: draft.image,
        imageSource: draft.imageSource,
        tags: draft.tags,
        modifiers: draft.modifiers,
        specialBadge: draft.specialBadge,
        schedule: draft.schedule,
        venueOverrides: draft.venueOverrides,
      });

      if (targetSectionId !== origSectionId) {
        s.moveOfferingBetweenSections(menu.id, origSectionId, targetSectionId, draft.id);
      }
      toast.success(`Updated “${draft.name}”`);
    } else {
      // Create new item in target section
      s.upsertOffering(menu.id, targetSectionId, {
        sharedOfferingId: draft.sharedOfferingId,
        name: draft.name.trim(),
        price: draft.price,
        description: draft.description.trim(),
        available: draft.available,
        emoji: draft.emoji,
        image: draft.image,
        imageSource: draft.imageSource,
        tags: draft.tags,
        modifiers: draft.modifiers,
        specialBadge: draft.specialBadge,
        schedule: draft.schedule,
        venueOverrides: draft.venueOverrides,
      });
      toast.success(`Added “${draft.name}”`);
    }

    if (!continueAdding) {
      setEditingOffering(null);
    }
  };

  const handleDeleteOffering = (secId: string, offId: string) => {
    s.removeOffering(menu.id, secId, offId);
    toast.success("Offering removed");
    setEditingOffering(null);
  };

  const handleDuplicateOffering = (secId: string, offId: string) => {
    s.duplicateOffering(menu.id, secId, offId);
    toast.success("Offering duplicated");
  };

  // Section batch add
  const toggleBatchSection = (secName: string) => {
    setSelectedBatchSections((prev) =>
      prev.includes(secName) ? prev.filter((s) => s !== secName) : [...prev, secName],
    );
  };

  const submitBatchSections = () => {
    if (selectedBatchSections.length === 0) return;
    s.addSectionsBatch(menu.id, selectedBatchSections);
    toast.success(`Added ${selectedBatchSections.length} sections`);
    setSelectedBatchSections([]);
  };

  const addSingleCustomSection = () => {
    const clean = customSectionInput.trim();
    if (!clean) return;
    s.addSection(menu.id, clean);
    setCustomSectionInput("");
    toast.success(`Section “${clean}” added`);
  };

  // Publication handler with validation
  const handlePublish = () => {
    if (menu.sections.length === 0) {
      toast.error("Add at least one section before publishing.");
      return;
    }
    if (itemCount === 0) {
      toast.error("Add at least one menu item before publishing.");
      return;
    }
    if (orgVenues.length > 1 && assignedVenues.length === 0) {
      toast.error("Please assign this menu to a venue in Menu Settings before publishing.");
      return;
    }

    s.setMenuStatus(menu.id, "published");
    toast.success(`“${menu.name}” is now published and live!`, {
      action: primaryVenue
        ? {
            label: "View live",
            onClick: () => window.open(`/m/${primaryVenue.slug}`, "_self"),
          }
        : undefined,
    });
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pt-4 pb-28">
      {/* Top Navigation & Status Bar */}
      <div className="flex items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to="/admin"
            aria-label="Back to menus"
            className="flex h-11 items-center gap-1.5 px-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-semibold text-xs shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Menus</span>
          </Link>
          <div className="flex items-center gap-1.5 min-w-0">
            <StatusBadge status={menu.status} />
            {menu.isProtected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 shrink-0">
                <Lock className="h-3 w-3" />
                <span>Protected</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Customer Preview Button */}
          {primaryVenue ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 text-xs font-semibold gap-1.5"
            >
              <Link
                to="/m/$slug"
                params={{ slug: primaryVenue.slug }}
                search={{ preview: menu.id }}
              >
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Customer</span> Preview
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="h-9 text-xs font-semibold gap-1.5"
            >
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Customer</span> Preview
            </Button>
          )}

          {/* Menu Settings Button */}
          {author && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={openSettings}
              className="h-9 text-xs font-semibold gap-1.5"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Settings</span>
            </Button>
          )}
        </div>
      </div>

      {/* Menu Header Details */}
      <div className="mt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight break-words">{menu.name}</h1>
            {menu.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{menu.description}</p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground italic">
                No description set. Tap settings to add serving hours or notes.
              </p>
            )}
          </div>
        </div>

        {/* Assigned Venue Context Badges */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
            Context:
          </span>
          {assignedVenues.length === 0 ? (
            <span className="rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 font-semibold text-[11px]">
              Unassigned venue
            </span>
          ) : assignedVenues.length === 1 ? (
            <span className="rounded-md bg-primary/10 text-primary px-2 py-0.5 font-semibold text-[11px]">
              {assignedVenues[0]?.name} ({assignedVenues[0]?.category || "Venue"})
            </span>
          ) : assignedVenues.length === orgVenues.length ? (
            <span className="rounded-md bg-primary/10 text-primary px-2 py-0.5 font-semibold text-[11px]">
              Shared across all {assignedVenues.length} venues
            </span>
          ) : (
            <span className="rounded-md bg-primary/10 text-primary px-2 py-0.5 font-semibold text-[11px]">
              Assigned to {assignedVenues.length} venues:{" "}
              {assignedVenues.map((v) => v.name).join(", ")}
            </span>
          )}

          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {menu.sections.length} {menu.sections.length === 1 ? "section" : "sections"} ·{" "}
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      {/* Draft Changes Alert Banner */}
      {menu.status === "published" && hasDraftChanges && author && (
        <aside
          role="status"
          aria-label="Pending draft changes alert"
          className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5 text-sm">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Unpublished Draft Changes Pending</span>
              </p>
              <p className="text-amber-800 dark:text-amber-300">
                You have edited this published menu. Customers continue seeing the last published
                snapshot until you publish these changes.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="h-8 text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700"
                onClick={() => {
                  s.publishMenu(menu.id);
                  toast.success("Draft changes published to live menu!");
                }}
              >
                <Rocket className="h-3.5 w-3.5 mr-1" /> Publish now
              </Button>
              {primaryVenue && (
                <Button asChild size="sm" variant="outline" className="h-8 text-xs font-semibold">
                  <Link
                    to="/m/$slug"
                    params={{ slug: primaryVenue.slug }}
                    search={{ preview: menu.id }}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> Preview draft
                  </Link>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => {
                  s.discardDraftChanges(menu.id);
                  toast.info("Unpublished draft changes discarded");
                }}
              >
                Discard
              </Button>
            </div>
          </div>
        </aside>
      )}

      {/* Sticky Mobile Publication Bar */}
      {author && (
        <div className="sticky top-0 z-30 -mx-4 mt-4 flex items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur shadow-xs">
          {menu.status !== "published" ? (
            <>
              <Button
                className="h-12 flex-1 text-base font-semibold shadow-sm gap-2"
                disabled={menu.sections.length === 0 || itemCount === 0}
                onClick={handlePublish}
              >
                <Rocket className="h-5 w-5" />
                <span>
                  {itemCount === 0
                    ? "Add an item to publish"
                    : menu.sections.length === 0
                      ? "Add a section to publish"
                      : "Publish menu now"}
                </span>
              </Button>
              {primaryVenue ? (
                <Button asChild variant="outline" className="h-12 text-xs font-semibold">
                  <Link
                    to="/m/$slug"
                    params={{ slug: primaryVenue.slug }}
                    search={{ preview: menu.id }}
                  >
                    <Eye className="h-4 w-4 mr-1 text-primary" /> Preview
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-12 text-xs font-semibold"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="h-4 w-4 mr-1 text-primary" /> Preview
                </Button>
              )}
            </>
          ) : hasDraftChanges ? (
            <>
              <Button
                className="h-12 flex-1 font-semibold gap-2 shadow-sm bg-primary text-primary-foreground"
                onClick={() => {
                  s.publishMenu(menu.id);
                  toast.success("Draft changes published to live menu!");
                }}
              >
                <Rocket className="h-5 w-5" />
                <span>Publish draft changes</span>
              </Button>
              {primaryVenue ? (
                <Button asChild variant="outline" className="h-12 text-xs font-semibold">
                  <Link
                    to="/m/$slug"
                    params={{ slug: primaryVenue.slug }}
                    search={{ preview: menu.id }}
                  >
                    <Eye className="h-4 w-4 mr-1 text-primary" /> Preview draft
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-12 text-xs font-semibold"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="h-4 w-4 mr-1 text-primary" /> Preview draft
                </Button>
              )}
              <Button
                variant="ghost"
                className="h-12 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => {
                  s.discardDraftChanges(menu.id);
                  toast.info("Unpublished draft changes discarded");
                }}
              >
                Discard
              </Button>
            </>
          ) : (
            <>
              {primaryVenue && (
                <Button asChild className="h-12 flex-1 font-semibold gap-1.5">
                  <Link to="/m/$slug" params={{ slug: primaryVenue.slug }}>
                    <ExternalLink className="h-4 w-4" /> View live menu
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                className="h-12 font-medium"
                onClick={() => {
                  s.setMenuStatus(menu.id, "hidden");
                  toast.success("Menu hidden from public view");
                }}
              >
                <EyeOff className="h-4 w-4 mr-1" /> Hide
              </Button>
              <Button
                variant="ghost"
                className="h-12 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => {
                  s.setMenuStatus(menu.id, "archived");
                  toast.success("Menu archived safely");
                }}
              >
                Archive
              </Button>
            </>
          )}
        </div>
      )}

      {/* Sections and Items List */}
      <div className="mt-6 space-y-6">
        {menu.sections.length === 0 && (
          <div className="rounded-2xl border border-dashed p-8 text-center bg-card/40 space-y-3">
            <Sparkles className="mx-auto h-8 w-8 text-primary" />
            <h3 className="font-bold text-base">Your menu needs sections</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Start by selecting recommended categories below for your{" "}
              {categoryContext || "business"}, or add your own custom section in any language.
            </p>
          </div>
        )}

        {menu.sections.map((sec, i) => (
          <section key={sec.id} className="rounded-2xl border bg-card shadow-xs overflow-hidden">
            <header className="flex items-center gap-1 border-b bg-muted/20 px-3 py-2.5">
              {author ? (
                <Input
                  defaultValue={sec.name}
                  onBlur={(e) => s.renameSection(menu.id, sec.id, e.target.value || sec.name)}
                  className="h-9 flex-1 border-transparent bg-transparent font-display text-base font-bold shadow-none focus-visible:bg-background focus-visible:border-input"
                />
              ) : (
                <h2 className="flex-1 px-2 text-base font-bold">{sec.name}</h2>
              )}

              <span className="text-[11px] font-semibold text-muted-foreground px-2">
                {sec.offerings.length} {sec.offerings.length === 1 ? "item" : "items"}
              </span>

              {author && (
                <div className="flex items-center gap-0.5">
                  <IconBtn
                    label="Move section up"
                    disabled={i === 0}
                    onClick={() => s.moveSection(menu.id, sec.id, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    label="Move section down"
                    disabled={i === menu.sections.length - 1}
                    onClick={() => s.moveSection(menu.id, sec.id, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    label="Delete section"
                    onClick={() => {
                      if (sec.offerings.length === 0) {
                        s.removeSection(menu.id, sec.id);
                        toast.success(`Deleted “${sec.name}”`);
                      } else if (
                        confirm(
                          `Delete section “${sec.name}” and its ${sec.offerings.length} items?`,
                        )
                      ) {
                        s.removeSection(menu.id, sec.id);
                        toast.success(`Deleted “${sec.name}”`);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </div>
              )}
            </header>

            {/* Offerings in this section */}
            <ul className="divide-y">
              {sec.offerings.length === 0 ? (
                <li className="p-4 text-center text-xs text-muted-foreground italic">
                  No items in this section yet. Tap “Add item” below to populate.
                </li>
              ) : (
                sec.offerings.map((o, oIdx) => (
                  <li key={o.id} className="p-3 space-y-2 border-b last:border-b-0">
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        {o.image ? (
                          <img
                            src={o.image}
                            alt={o.name}
                            className="h-14 w-14 rounded-xl object-cover border"
                          />
                        ) : (
                          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-2xl">
                            {o.emoji}
                          </span>
                        )}
                        {o.image && (
                          <span className="absolute -bottom-1 -right-1 rounded bg-black/75 px-1 py-0.2 text-[8px] font-medium text-white backdrop-blur">
                            {getImageSource(o) === "library" ? "Lib" : "Photo"}
                          </span>
                        )}
                      </div>

                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() =>
                          author && setEditingOffering({ sectionId: sec.id, offering: o })
                        }
                      >
                        <p
                          className={cn(
                            "truncate font-medium text-sm text-foreground",
                            !o.available && "text-muted-foreground line-through",
                          )}
                        >
                          {o.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {formatPrice(o.price, currency)}
                          {o.modifiers.length > 0 &&
                            ` · ${o.modifiers.length} option group${o.modifiers.length > 1 ? "s" : ""}`}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {o.sharedOfferingId && (
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400">
                              Shared
                            </span>
                          )}
                          {o.schedule?.enabled && (
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                              🕒 {formatSchedule(o.schedule)}
                            </span>
                          )}
                          {o.venueOverrides && Object.keys(o.venueOverrides).length > 0 && (
                            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-400">
                              {Object.keys(o.venueOverrides).length} Branch Override
                              {Object.keys(o.venueOverrides).length > 1 ? "s" : ""}
                            </span>
                          )}
                          {o.tags &&
                            o.tags.map((t) => (
                              <span
                                key={t}
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                  isDietaryClaimTag(t)
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "bg-secondary text-secondary-foreground",
                                )}
                              >
                                {t}
                              </span>
                            ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {canToggleAvailability(s.role) && (
                          <label className="flex flex-col items-center text-[10px] text-muted-foreground shrink-0 cursor-pointer">
                            <Switch
                              checked={o.available}
                              onCheckedChange={() => s.toggleAvailability(menu.id, sec.id, o.id)}
                              aria-label="Available"
                            />
                            <span className="mt-0.5">{o.available ? "Active" : "Sold out"}</span>
                          </label>
                        )}

                        {author && (
                          <IconBtn
                            label="Edit item"
                            onClick={() =>
                              setEditingOffering({
                                sectionId: sec.id,
                                offering: o,
                              })
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </IconBtn>
                        )}
                      </div>
                    </div>

                    {/* Reorder, Duplicate and Move Controls */}
                    {author && (
                      <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/40 text-xs">
                        {menu.sections.length > 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setMoveItemPicker({
                                offeringId: o.id,
                                fromSectionId: sec.id,
                                offeringName: o.name,
                              })
                            }
                            className="h-8 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-1"
                            title="Move to another section"
                            aria-label="Move to another section"
                          >
                            <MoveRight className="h-3.5 w-3.5" />
                            <span>Move section</span>
                          </button>
                        ) : (
                          <div />
                        )}

                        <div className="flex items-center gap-0.5">
                          <IconBtn
                            label="Move item up"
                            disabled={oIdx === 0}
                            onClick={() => s.moveOfferingWithinSection(menu.id, sec.id, o.id, -1)}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn
                            label="Move item down"
                            disabled={oIdx === sec.offerings.length - 1}
                            onClick={() => s.moveOfferingWithinSection(menu.id, sec.id, o.id, 1)}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn
                            label="Duplicate item"
                            onClick={() => handleDuplicateOffering(sec.id, o.id)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>

            {author && (
              <div className="flex border-t divide-x">
                <button
                  type="button"
                  onClick={() =>
                    setEditingOffering({
                      sectionId: sec.id,
                      offering: null,
                    })
                  }
                  className="flex-1 flex min-h-12 items-center justify-center gap-2 text-sm font-semibold text-primary hover:bg-muted/40 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add item
                </button>
                {s.sharedOfferings && s.sharedOfferings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPickSharedSectionId(sec.id)}
                    className="px-4 flex min-h-12 items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shrink-0"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>From Library</span>
                  </button>
                )}
              </div>
            )}
          </section>
        ))}

        {/* Section Creation & Reorganisation Panel */}
        {author && (
          <div className="space-y-4 rounded-2xl border bg-card/60 p-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>Suggested sections for your {categoryContext || "menu"}</span>
                </div>
                {menu.sections.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReorganizeOpen(true)}
                    className="h-7 text-xs text-primary"
                  >
                    Reorganise sections
                  </Button>
                )}
              </div>

              {/* Multi-select suggested section chips */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {recommendedSections
                  .filter(
                    (rec) =>
                      !menu.sections.some(
                        (sec) => sec.name.trim().toLowerCase() === rec.trim().toLowerCase(),
                      ),
                  )
                  .map((rec) => {
                    const isSelected = selectedBatchSections.includes(rec);
                    return (
                      <button
                        key={rec}
                        type="button"
                        onClick={() => toggleBatchSection(rec)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "border-border bg-card text-foreground hover:bg-muted",
                        )}
                      >
                        {isSelected ? (
                          <Check className="h-3 w-3 stroke-[3]" />
                        ) : (
                          <Plus className="h-3 w-3 text-primary" />
                        )}
                        <span>{rec}</span>
                      </button>
                    );
                  })}
              </div>

              {/* Batch Add Button */}
              {selectedBatchSections.length > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/10 p-2.5 text-xs">
                  <span className="font-semibold text-primary">
                    {selectedBatchSections.length} sections selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBatchSections([])}
                      className="h-7 text-xs"
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={submitBatchSections}
                      className="h-7 text-xs font-bold"
                    >
                      Add {selectedBatchSections.length} sections
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Custom section input */}
            <form
              className="flex gap-2 pt-2 border-t"
              onSubmit={(e) => {
                e.preventDefault();
                addSingleCustomSection();
              }}
            >
              <Input
                value={customSectionInput}
                onChange={(e) => setCustomSectionInput(e.target.value)}
                placeholder="Custom section name in any language (e.g. Chef's Tasting, Nyama Choma)"
                className="h-11 text-sm"
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={!customSectionInput.trim()}
                className="h-11 shrink-0 font-semibold"
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* MODAL 1: Offering Editor Sheet */}
      {editingOffering && (
        <OfferingEditorSheet
          open={!!editingOffering}
          onOpenChange={(open) => !open && setEditingOffering(null)}
          menu={menu}
          sectionId={editingOffering.sectionId}
          initialOffering={editingOffering.offering}
          currency={currency}
          categoryContext={categoryContext}
          venues={orgVenues}
          onSave={handleSaveOffering}
          onDelete={handleDeleteOffering}
          onDuplicate={handleDuplicateOffering}
        />
      )}

      {/* Pick Shared Offering Sheet */}
      {pickSharedSectionId && (
        <Sheet
          open={!!pickSharedSectionId}
          onOpenChange={(open) => !open && setPickSharedSectionId(null)}
        >
          <SheetContent
            side="bottom"
            className="max-h-[85vh] overflow-y-auto rounded-t-3xl sm:mx-auto sm:max-w-lg focus:outline-none"
          >
            <SheetHeader className="text-left pb-2">
              <SheetTitle className="font-display text-2xl">Shared Catalogue</SheetTitle>
              <SheetDescription className="text-xs">
                Pick an existing shared offering to add to this menu section.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-2 pt-3 pb-safe">
              {(() => {
                const eligibleShared = (s.sharedOfferings || []).filter(
                  (shared) => shared.orgId === menu.orgId,
                );
                if (eligibleShared.length === 0) {
                  return (
                    <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                      No shared offerings found for this organisation. Create master offerings in
                      the Shared Catalogue first.
                    </p>
                  );
                }
                return eligibleShared.map((shared) => (
                  <div
                    key={shared.id}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 hover:border-primary/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm truncate">{shared.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {shared.description}
                      </p>
                      <p className="text-xs font-semibold text-primary mt-0.5">
                        {formatPrice(shared.price, currency)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 text-xs font-semibold shrink-0"
                      onClick={() => {
                        const addedId = s.addSharedOfferingToMenu(
                          menu.id,
                          pickSharedSectionId,
                          shared.id,
                        );
                        if (addedId) {
                          toast.success(`Added “${shared.name}” from shared catalogue`);
                        } else {
                          toast.error("Could not add shared offering to menu.");
                        }
                        setPickSharedSectionId(null);
                      }}
                    >
                      Add
                    </Button>
                  </div>
                ));
              })()}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* MODAL 2: Menu Settings Drawer */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[92vh] overflow-y-auto rounded-t-3xl sm:mx-auto sm:max-w-lg focus:outline-none"
        >
          <SheetHeader className="text-left pb-2">
            <SheetTitle className="font-display text-2xl">Menu Settings</SheetTitle>
            <SheetDescription className="text-xs">
              Configure menu identity, description, visibility, and venue assignment.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pt-3 pb-safe">
            <div>
              <Label className="block text-xs font-semibold mb-1">Menu name</Label>
              <Input
                value={settingsDraft.name}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, name: e.target.value })}
                className="h-11 text-base"
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {suggestedNames.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSettingsDraft({ ...settingsDraft, name: n })}
                    className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="block text-xs font-semibold mb-1">Description</Label>
              <Textarea
                value={settingsDraft.description}
                onChange={(e) =>
                  setSettingsDraft({ ...settingsDraft, description: e.target.value })
                }
                rows={2}
                className="text-sm"
              />
            </div>

            {/* Venue Eligibility Selection */}
            {orgVenues.length > 1 && (
              <div>
                <Label className="block text-xs font-semibold mb-1.5">
                  Assigned Venues (Explicit publication boundary)
                </Label>
                <div className="space-y-1.5">
                  {orgVenues.map((v) => {
                    const isChecked = settingsDraft.selectedVenueIds.includes(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          const next = isChecked
                            ? settingsDraft.selectedVenueIds.filter((id) => id !== v.id)
                            : [...settingsDraft.selectedVenueIds, v.id];
                          setSettingsDraft({ ...settingsDraft, selectedVenueIds: next });
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl border p-2.5 text-left text-xs transition-colors",
                          isChecked
                            ? "border-primary bg-primary/5 font-semibold text-primary"
                            : "border-border bg-card text-foreground hover:bg-muted",
                        )}
                      >
                        <span>
                          {v.name} ({v.category || "Venue"})
                        </span>
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-full border",
                            isChecked
                              ? "bg-primary border-primary text-white"
                              : "border-muted-foreground",
                          )}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Visibility Mode */}
            <div>
              <Label className="block text-xs font-semibold mb-1.5">Visibility mode</Label>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsDraft({ ...settingsDraft, isProtected: false })}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl border p-2.5 text-left text-xs transition-all",
                    !settingsDraft.isProtected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card",
                  )}
                >
                  <Eye className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Public menu (Standard)</span>
                    <span className="text-[11px] text-muted-foreground block">
                      Discoverable by all customers and indexed in directory search.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsDraft({ ...settingsDraft, isProtected: true })}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl border p-2.5 text-left text-xs transition-all",
                    settingsDraft.isProtected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card",
                  )}
                >
                  <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">
                      Protected menu (Room Service / Private)
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Restricted access. Strictly excluded from organic public directory.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <Button
              type="button"
              onClick={saveSettings}
              className="w-full h-11 text-base font-semibold"
            >
              Save settings
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* MODAL 3: Reorganise Sections Sheet */}
      <Sheet open={reorganizeOpen} onOpenChange={setReorganizeOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-3xl sm:mx-auto sm:max-w-lg focus:outline-none"
        >
          <SheetHeader className="text-left pb-2">
            <SheetTitle className="font-display text-xl">Reorganise Menu Sections</SheetTitle>
            <SheetDescription className="text-xs">
              Tap the arrows to adjust section order. Changes save automatically.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-2 pt-3 pb-safe">
            {menu.sections.map((sec, idx) => (
              <div
                key={sec.id}
                className="flex items-center justify-between rounded-xl border bg-card p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground w-4">{idx + 1}.</span>
                  <span className="font-semibold">{sec.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({sec.offerings.length} items)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={idx === 0}
                    onClick={() => s.moveSection(menu.id, sec.id, -1)}
                    className="h-8 w-8 p-0"
                    aria-label="Move up"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={idx === menu.sections.length - 1}
                    onClick={() => s.moveSection(menu.id, sec.id, 1)}
                    className="h-8 w-8 p-0"
                    aria-label="Move down"
                  >
                    ↓
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              onClick={() => setReorganizeOpen(false)}
              className="w-full h-11 font-semibold mt-4"
            >
              Done reorganising
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* MODAL 4: Quick Move Item to Another Section */}
      <Sheet open={!!moveItemPicker} onOpenChange={(o) => !o && setMoveItemPicker(null)}>
        <SheetContent
          side="bottom"
          className="max-h-[70vh] overflow-y-auto rounded-t-3xl sm:mx-auto sm:max-w-lg focus:outline-none"
        >
          <SheetHeader className="text-left pb-2">
            <SheetTitle className="font-display text-xl">Move Offering</SheetTitle>
            <SheetDescription className="text-xs">
              Move “{moveItemPicker?.offeringName}” to another section:
            </SheetDescription>
          </SheetHeader>

          {moveItemPicker && (
            <div className="space-y-2 pt-3 pb-safe">
              {menu.sections.map((sec) => {
                const isCurrent = sec.id === moveItemPicker.fromSectionId;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => {
                      s.moveOfferingBetweenSections(
                        menu.id,
                        moveItemPicker.fromSectionId,
                        sec.id,
                        moveItemPicker.offeringId,
                      );
                      toast.success(`Moved “${moveItemPicker.offeringName}” to ${sec.name}`);
                      setMoveItemPicker(null);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm transition-colors",
                      isCurrent
                        ? "border-muted bg-muted/30 opacity-40 cursor-not-allowed"
                        : "border-border bg-card hover:border-primary hover:bg-primary/5",
                    )}
                  >
                    <span className="font-semibold">{sec.name}</span>
                    {isCurrent ? (
                      <span className="text-xs text-muted-foreground">Current section</span>
                    ) : (
                      <span className="text-xs text-primary font-semibold">Move here →</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* MODAL 5: In-Editor Customer Preview */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent
          side="bottom"
          className="h-[94vh] overflow-y-auto rounded-t-3xl sm:mx-auto sm:max-w-lg p-0 focus:outline-none"
        >
          {/* Preview Mode Notification Banner */}
          <div className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-amber-500 px-4 py-2.5 text-xs font-semibold text-amber-950 shadow-md">
            <div className="flex items-center gap-1.5 min-w-0">
              <Eye className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Customer View Preview ({menu.status.toUpperCase()}): “{menu.name}”
              </span>
            </div>
            <button
              onClick={() => setPreviewOpen(false)}
              className="shrink-0 rounded bg-amber-950 px-2.5 py-1 text-[11px] font-bold text-amber-50 hover:bg-black transition-colors"
            >
              Exit preview
            </button>
          </div>

          {/* Customer View Body */}
          <div className="p-4 pb-20 space-y-6">
            {/* Business Header */}
            {primaryVenue && (
              <header className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground font-display text-2xl text-primary font-bold">
                  {primaryVenue.name[0]}
                </div>
                <h2 className="mt-3 text-2xl font-bold">{primaryVenue.name}</h2>
                {primaryVenue.tagline && (
                  <p className="mt-0.5 text-xs opacity-85">{primaryVenue.tagline}</p>
                )}
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {primaryVenue.services.map((svc) => (
                    <span
                      key={svc}
                      className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-medium"
                    >
                      {svc}
                    </span>
                  ))}
                </div>
              </header>
            )}

            {/* Menu Title & Description */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">{menu.name}</h3>
                <StatusBadge status={menu.status} />
              </div>
              {menu.description && (
                <p className="mt-1 text-xs text-muted-foreground">{menu.description}</p>
              )}
            </div>

            {/* Preview Sections and Offerings */}
            {menu.sections.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground italic py-8 border rounded-xl">
                This menu has no sections or items to preview.
              </p>
            ) : (
              menu.sections.map((sec) => (
                <div key={sec.id} className="space-y-3">
                  <h4 className="font-bold text-base border-b pb-1 text-foreground">{sec.name}</h4>
                  <div className="space-y-2.5">
                    {sec.offerings.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic pl-2">
                        No items in this section.
                      </p>
                    ) : (
                      sec.offerings.map((off) => (
                        <div
                          key={off.id}
                          className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {off.image ? (
                              <img
                                src={off.image}
                                alt={off.name}
                                className="h-12 w-12 rounded-lg object-cover border shrink-0"
                              />
                            ) : (
                              <span className="flex h-12 w-12 rounded-lg bg-muted items-center justify-center text-xl shrink-0">
                                {off.emoji}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  "font-semibold text-sm truncate",
                                  !off.available && "text-muted-foreground line-through",
                                )}
                              >
                                {off.name}
                              </p>
                              {off.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {off.description}
                                </p>
                              )}
                              {off.tags && off.tags.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {off.tags.map((t) => (
                                    <span
                                      key={t}
                                      className="rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] font-semibold"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-sm">
                              {formatPrice(off.price, currency)}
                            </span>
                            {!off.available && (
                              <span className="block text-[10px] text-destructive font-semibold">
                                Sold out
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Direct Action in Preview */}
            <div className="pt-4 border-t space-y-2">
              {menu.status !== "published" && author && (
                <Button
                  onClick={() => {
                    handlePublish();
                    setPreviewOpen(false);
                  }}
                  disabled={menu.sections.length === 0 || itemCount === 0}
                  className="w-full h-12 font-bold text-base gap-2"
                >
                  <Rocket className="h-4 w-4" />
                  <span>Publish this menu now</span>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(false)}
                className="w-full h-11 font-semibold"
              >
                Back to editor
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}

function IconBtn({
  label,
  children,
  ...rest
}: { label: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-20 transition-colors"
      {...rest}
    >
      {children}
    </button>
  );
}
