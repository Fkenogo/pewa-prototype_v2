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
import { canAuthorMenus, canToggleAvailability, formatPrice, usePewa } from "@/lib/pewa/store";
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
  getExistingMenuTags,
  getRecommendedSectionsForCategory,
  getRecommendedTagsForCategory,
  getGroupedTagSuggestionsForCategory,
  getSuggestedMenuNamesForCategory,
  isDietaryClaimTag,
  isMenuEligibleForVenue,
  processImageUpload,
  PEWA_TAG_DISCLAIMER,
  PROTOTYPE_IMAGE_LIBRARY,
} from "@/lib/pewa/taxonomy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/menus/$menuId")({
  head: () =>
    pageHead(
      "Edit business menu",
      "Create sections, edit offerings and publish your menu on PEWA.",
    ),
  component: MenuEditor,
});

type Draft = Omit<Offering, "id" | "modifiers" | "image" | "imageSource"> & {
  id?: string;
  modifiersText: string;
  image?: string | undefined;
  imageSource?: "library" | "upload" | undefined;
};

const emptyDraft: Draft = {
  name: "",
  description: "",
  price: 0,
  tags: [],
  available: true,
  emoji: "🍽️",
  modifiersText: "",
};

const modsToText = (m: ModifierGroup[]) =>
  m
    .map(
      (g) =>
        `${g.name}: ${g.options.map((o) => (o.priceDelta ? `${o.name} +${o.priceDelta}` : o.name)).join(", ")}`,
    )
    .join("\n");

const textToMods = (t: string): ModifierGroup[] =>
  t
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.includes(":"))
    .map((l, gi) => {
      const [name, rest] = [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1)];
      return {
        id: `g${gi}_${name}`,
        name,
        options: rest
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean)
          .map((o, oi) => {
            const m = o.match(/^(.*?)\s*\+\s*(\d+(?:\.\d+)?)$/);
            return {
              id: `o${gi}_${oi}`,
              name: m ? (m[1] ?? o) : o,
              priceDelta: m ? Number(m[2]) : 0,
            };
          }),
      };
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

  // Local State
  const [customSectionInput, setCustomSectionInput] = useState("");
  const [selectedBatchSections, setSelectedBatchSections] = useState<string[]>([]);
  const [editing, setEditing] = useState<{
    sectionId: string;
    originalSectionId: string;
    draft: Draft;
  } | null>(null);
  const [customTagInput, setCustomTagInput] = useState("");
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reorganizeOpen, setReorganizeOpen] = useState(false);
  const [moveItemPicker, setMoveItemPicker] = useState<{
    offeringId: string;
    fromSectionId: string;
    offeringName: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const recommendedTags = getRecommendedTagsForCategory(categoryContext);
  const groupedTagSuggestions = getGroupedTagSuggestionsForCategory(categoryContext);
  const existingMenuTags = getExistingMenuTags(menu);

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

  // Offering Save & Move
  const saveOffering = () => {
    if (!editing) return;
    const { modifiersText, ...d } = editing.draft;
    if (!d.name.trim() || !(d.price >= 0)) {
      toast.error("Add a name and price");
      return;
    }

    const { sectionId, originalSectionId } = editing;

    if (d.id) {
      // Existing item: update
      s.upsertOffering(menu.id, originalSectionId, {
        ...d,
        modifiers: textToMods(modifiersText),
      });

      // If section was changed, move it
      if (sectionId !== originalSectionId) {
        s.moveOfferingBetweenSections(menu.id, originalSectionId, sectionId, d.id);
      }
    } else {
      // New item: insert into target section
      s.upsertOffering(menu.id, sectionId, {
        ...d,
        modifiers: textToMods(modifiersText),
      });
    }

    setEditing(null);
  };

  const addTagToDraft = (tag: string) => {
    const clean = tag.trim();
    if (!clean || !editing) return;
    if (editing.draft.tags.some((t) => t.toLowerCase() === clean.toLowerCase())) return;
    setEditing({
      ...editing,
      draft: { ...editing.draft, tags: [...editing.draft.tags, clean] },
    });
  };

  const removeTagFromDraft = (tag: string) => {
    if (!editing) return;
    setEditing({
      ...editing,
      draft: { ...editing.draft, tags: editing.draft.tags.filter((t) => t !== tag) },
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    try {
      const { dataUrl, source } = await processImageUpload(file);
      setEditing({
        ...editing,
        draft: { ...editing.draft, image: dataUrl, imageSource: source },
      });
      toast.success("Merchant photo attached to item");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process photo.";
      toast.error(message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
        <div className="flex items-center gap-2">
          <Link
            to="/admin"
            aria-label="Back to menus"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={menu.status} />
            {menu.isProtected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                <Lock className="h-3 w-3" />
                <span>Protected (In-Room)</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Customer Preview Button */}
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
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{menu.name}</h1>
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
              <Button
                variant="outline"
                className="h-12 text-xs font-semibold"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="h-4 w-4 mr-1 text-primary" /> Preview
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
                className="h-12 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  s.setMenuStatus(menu.id, "draft");
                  toast.success("Menu status reverted to draft");
                }}
              >
                Revert to draft
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
                sec.offerings.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 p-3">
                    {o.image ? (
                      <img
                        src={o.image}
                        alt={o.name}
                        className="h-14 w-14 shrink-0 rounded-xl object-cover border"
                      />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
                        {o.emoji}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate font-medium text-sm",
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

                      {o.tags && o.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {o.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Move Offering Button */}
                    {author && menu.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setMoveItemPicker({
                            offeringId: o.id,
                            fromSectionId: sec.id,
                            offeringName: o.name,
                          })
                        }
                        className="h-9 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-1"
                        title="Move to another section"
                      >
                        <MoveRight className="h-3 w-3" />
                        <span className="hidden sm:inline">Move</span>
                      </button>
                    )}

                    {canToggleAvailability(s.role) && (
                      <label className="flex flex-col items-center text-[10px] text-muted-foreground shrink-0">
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
                          setEditing({
                            sectionId: sec.id,
                            originalSectionId: sec.id,
                            draft: { ...o, modifiersText: modsToText(o.modifiers) },
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </IconBtn>
                    )}
                  </li>
                ))
              )}
            </ul>

            {author && (
              <button
                type="button"
                onClick={() =>
                  setEditing({
                    sectionId: sec.id,
                    originalSectionId: sec.id,
                    draft: { ...emptyDraft },
                  })
                }
                className="flex min-h-12 w-full items-center justify-center gap-2 border-t text-sm font-semibold text-primary hover:bg-muted/40 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add item to {sec.name}
              </button>
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

      {/* MODAL 1: Item Editor Sheet */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent
          side="bottom"
          className="max-h-[92vh] overflow-y-auto rounded-t-3xl sm:mx-auto sm:max-w-lg focus:outline-none"
        >
          <SheetHeader className="px-0 text-left pb-2">
            <SheetTitle className="font-display text-2xl">
              {editing?.draft.id ? "Edit item" : "New item"}
            </SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 pb-safe pt-2">
              {/* Section Selector: Allows moving item to another section */}
              {menu.sections.length > 1 && (
                <div>
                  <Label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Menu section
                  </Label>
                  <select
                    value={editing.sectionId}
                    onChange={(e) => setEditing({ ...editing, sectionId: e.target.value })}
                    className="h-11 w-full rounded-xl border bg-card px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {menu.sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name} {sec.id === editing.originalSectionId ? "(Current)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Media Selection: Image Library & User Upload */}
              <div className="rounded-2xl border bg-muted/30 p-3">
                <Label className="mb-2 block font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Photo & Icon
                </Label>
                <div className="flex items-center gap-3">
                  {editing.draft.image ? (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border">
                      <img
                        src={editing.draft.image}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            draft: { ...editing.draft, image: undefined, imageSource: undefined },
                          })
                        }
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16">
                      <Input
                        value={editing.draft.emoji}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            draft: { ...editing.draft, emoji: e.target.value },
                          })
                        }
                        className="h-14 text-center text-2xl"
                        title="Emoji Icon"
                      />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowImageLibrary(!showImageLibrary)}
                        className="h-9 flex-1 text-xs"
                      >
                        <ImageIcon className="mr-1.5 h-3.5 w-3.5 text-primary" />
                        Library
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-9 flex-1 text-xs"
                      >
                        <Upload className="mr-1.5 h-3.5 w-3.5 text-primary" />
                        Upload
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {editing.draft.image
                        ? "Photo attached. Tap × to revert to emoji."
                        : "Pick from curated library or upload your own image."}
                    </p>
                  </div>
                </div>

                {/* Inline Curated Prototype Image Library Grid */}
                {showImageLibrary && (
                  <div className="mt-3 rounded-xl border bg-card p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold">Curated Prototype Library</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setShowImageLibrary(false)}
                      >
                        Close
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                      {PROTOTYPE_IMAGE_LIBRARY.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setEditing({
                              ...editing,
                              draft: {
                                ...editing.draft,
                                image: item.url,
                                imageSource: "library",
                              },
                            });
                            setShowImageLibrary(false);
                            toast.success(`Attached "${item.title}"`);
                          }}
                          className="group relative flex flex-col items-start rounded-lg border p-1 text-left hover:border-primary transition-all"
                        >
                          <img
                            src={item.url}
                            alt={item.title}
                            className="h-16 w-full rounded-md object-cover"
                          />
                          <span className="mt-1 line-clamp-1 text-[11px] font-medium group-hover:text-primary">
                            {item.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label className="mb-1.5 block">Name</Label>
                <Input
                  autoFocus
                  value={editing.draft.name}
                  onChange={(e) =>
                    setEditing({ ...editing, draft: { ...editing.draft, name: e.target.value } })
                  }
                  className="h-12 text-base"
                  placeholder="e.g. Cappuccino or Sourdough Loaf"
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Price ({currency})</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={editing.draft.price || ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, price: Number(e.target.value) },
                    })
                  }
                  className="h-12 text-base"
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Description</Label>
                <Textarea
                  value={editing.draft.description}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, description: e.target.value },
                    })
                  }
                  rows={2}
                  placeholder="Describe ingredients, preparation, origin..."
                />
              </div>

              {/* Descriptive Tags Engine */}
              <div className="space-y-2 rounded-2xl border p-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <TagIcon className="h-3.5 w-3.5 text-primary" />
                    Descriptive Tags & Dietaries
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {editing.draft.tags.length} assigned
                  </span>
                </div>

                {/* Assigned Tag Chips with Dismiss */}
                {editing.draft.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {editing.draft.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2.5 py-1 text-xs font-medium"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => removeTagFromDraft(t)}
                          aria-label={`Remove tag ${t}`}
                          className="hover:text-primary-foreground hover:bg-primary rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No tags yet. Select suggested tags or create custom ones below.
                  </p>
                )}

                {/* Custom Tag Input */}
                <div className="flex gap-1.5 pt-1">
                  <Input
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (customTagInput.trim()) {
                          addTagToDraft(customTagInput);
                          setCustomTagInput("");
                        }
                      }
                    }}
                    placeholder="Create custom tag (e.g. Sourdough, Keto, Halal)"
                    className="h-10 text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 shrink-0 text-xs"
                    onClick={() => {
                      if (customTagInput.trim()) {
                        addTagToDraft(customTagInput);
                        setCustomTagInput("");
                      }
                    }}
                  >
                    + Tag
                  </Button>
                </div>

                {/* Menu Tag Reuse */}
                {existingMenuTags.filter((t) => !editing.draft.tags.includes(t)).length > 0 && (
                  <div className="pt-2 border-t mt-2">
                    <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Reuse tags from this menu:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {existingMenuTags
                        .filter((t) => !editing.draft.tags.includes(t))
                        .map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => addTagToDraft(t)}
                            className="rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            + {t}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Grouped Suggested Tags */}
                <div className="pt-2 border-t mt-2 space-y-2.5">
                  {groupedTagSuggestions.map((group) => {
                    const availableTags = group.tags.filter(
                      (t) => !editing.draft.tags.some((dt) => dt.toLowerCase() === t.toLowerCase()),
                    );
                    if (availableTags.length === 0) return null;
                    return (
                      <div key={group.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {group.label}
                          </span>
                          {group.id === "dietary_claims" && (
                            <span className="text-[10px] text-muted-foreground/80 italic">
                              Merchant-asserted · Not certified by PEWA
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {availableTags.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => addTagToDraft(t)}
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                                group.id === "dietary_claims"
                                  ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                                  : "border-border bg-card text-foreground hover:bg-muted",
                              )}
                            >
                              + {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block">Options & Modifiers</Label>
                <Textarea
                  value={editing.draft.modifiersText}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, modifiersText: e.target.value },
                    })
                  }
                  rows={3}
                  placeholder={"Milk: Whole, Oat +50, Almond +60\nExtras: Extra shot +70"}
                  className="font-mono text-xs"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  One group per line. “+50” adds to the price.
                </p>
              </div>

              <label className="flex min-h-11 items-center justify-between rounded-xl border px-3">
                <span className="text-sm font-medium">Available now</span>
                <Switch
                  checked={editing.draft.available}
                  onCheckedChange={(v) =>
                    setEditing({ ...editing, draft: { ...editing.draft, available: v } })
                  }
                />
              </label>

              <div className="flex gap-2 pt-2">
                {editing.draft.id && (
                  <Button
                    variant="outline"
                    className="h-12"
                    onClick={() => {
                      s.removeOffering(menu.id, editing.originalSectionId, editing.draft.id!);
                      setEditing(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button className="h-12 flex-1 text-base font-semibold" onClick={saveOffering}>
                  Save item
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

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
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-20 transition-colors"
      {...rest}
    >
      {children}
    </button>
  );
}
