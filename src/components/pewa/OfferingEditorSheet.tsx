import { useState, useEffect } from "react";
import {
  Tag as TagIcon,
  Plus,
  Trash2,
  X,
  Sparkles,
  Image as ImageIcon,
  Check,
  Eye,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import type { Menu, ModifierGroup, Offering, Section } from "@/lib/pewa/types";
import { formatPrice } from "@/lib/pewa/store";
import {
  getExistingMenuTags,
  getGroupedTagSuggestionsForCategory,
  isDietaryClaimTag,
  PEWA_TAG_DISCLAIMER,
  getImageSource,
} from "@/lib/pewa/taxonomy";
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
import { ImageSelectionModal } from "./ImageSelectionModal";
import { ModifierEditor } from "./ModifierEditor";
import { cn } from "@/lib/utils";

export interface OfferingDraft {
  id?: string;
  name: string;
  price: number;
  description: string;
  available: boolean;
  emoji: string;
  image?: string | undefined;
  imageSource?: "library" | "upload" | undefined;
  tags: string[];
  modifiers: ModifierGroup[];
  specialBadge?: string | undefined;
}

export const defaultOfferingDraft: OfferingDraft = {
  name: "",
  price: 0,
  description: "",
  available: true,
  emoji: "🍽️",
  tags: [],
  modifiers: [],
};

export function OfferingEditorSheet({
  open,
  onOpenChange,
  menu,
  sectionId,
  initialOffering,
  currency = "KES",
  categoryContext = "",
  onSave,
  onDelete,
  onDuplicate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu: Menu;
  sectionId: string;
  initialOffering?: Offering | null;
  currency?: string;
  categoryContext?: string;
  onSave: (targetSectionId: string, offering: OfferingDraft, continueAdding?: boolean) => void;
  onDelete?: (sectionId: string, offeringId: string) => void;
  onDuplicate?: (sectionId: string, offeringId: string) => void;
}) {
  const [draft, setDraft] = useState<OfferingDraft>({ ...defaultOfferingDraft });
  const [targetSectionId, setTargetSectionId] = useState<string>(sectionId);
  const [customTagInput, setCustomTagInput] = useState("");
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "tags" | "modifiers">("details");

  useEffect(() => {
    if (open) {
      if (initialOffering) {
        setDraft({
          id: initialOffering.id,
          name: initialOffering.name,
          price: initialOffering.price,
          description: initialOffering.description || "",
          available: initialOffering.available ?? true,
          emoji: initialOffering.emoji || "🍽️",
          image: initialOffering.image,
          imageSource: initialOffering.imageSource,
          tags: Array.isArray(initialOffering.tags) ? [...initialOffering.tags] : [],
          modifiers: initialOffering.modifiers ? JSON.parse(JSON.stringify(initialOffering.modifiers)) : [],
          specialBadge: initialOffering.specialBadge,
        });
      } else {
        setDraft({ ...defaultOfferingDraft, emoji: "🍽️" });
      }
      setTargetSectionId(sectionId);
      setActiveTab("details");
      setCustomTagInput("");
    }
  }, [open, initialOffering, sectionId]);

  const existingMenuTags = getExistingMenuTags(menu);
  const groupedTagSuggestions = getGroupedTagSuggestionsForCategory(categoryContext);

  const addTag = (tag: string) => {
    const clean = tag.trim();
    if (!clean) return;
    if (draft.tags.some((t) => t.toLowerCase() === clean.toLowerCase())) return;
    setDraft((prev) => ({ ...prev, tags: [...prev.tags, clean] }));
  };

  const removeTag = (tag: string) => {
    setDraft((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleSave = (continueAdding: boolean = false) => {
    if (!draft.name.trim()) {
      toast.error("Please enter an offering name.");
      setActiveTab("details");
      return;
    }
    if (isNaN(draft.price) || draft.price < 0) {
      toast.error("Please enter a valid price (>= 0).");
      setActiveTab("details");
      return;
    }

    onSave(targetSectionId, draft, continueAdding);
    if (continueAdding) {
      setDraft({ ...defaultOfferingDraft, emoji: "🍽️" });
      setActiveTab("details");
      toast.success("Offering saved. Ready for next item!");
    } else {
      onOpenChange(false);
    }
  };

  const isEditing = Boolean(draft.id);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92vh] overflow-y-auto rounded-t-3xl sm:mx-auto sm:max-w-lg focus:outline-none"
        >
          <SheetHeader className="text-left pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-display text-2xl">
                {isEditing ? "Edit Offering" : "Add Offering"}
              </SheetTitle>
              {isEditing && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  ID: {draft.id?.slice(-6)}
                </span>
              )}
            </div>
            <SheetDescription className="text-xs">
              Configure name, price, photography, tags, and customisation choices.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pt-2 pb-safe">
            {/* Top Navigation Tabs for Faster Authoring */}
            <div className="flex rounded-xl border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all",
                  activeTab === "details"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                1. Basic Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tags")}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all flex items-center justify-center gap-1",
                  activeTab === "tags"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                2. Tags {draft.tags.length > 0 && `(${draft.tags.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("modifiers")}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all flex items-center justify-center gap-1",
                  activeTab === "modifiers"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                3. Options {draft.modifiers.length > 0 && `(${draft.modifiers.length})`}
              </button>
            </div>

            {/* TAB 1: BASIC INFORMATION (ESSENTIAL FIRST WORKFLOW) */}
            {activeTab === "details" && (
              <div className="space-y-4">
                {/* 1. Offering Name */}
                <div>
                  <Label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Item Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    autoFocus
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. Cappuccino, Almond Croissant, Wagyu Burger"
                    className="h-12 text-base font-medium"
                  />
                </div>

                {/* 2. Base Price and Currency Context */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Base Price ({currency}) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={draft.price || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, price: Math.max(0, Number(e.target.value)) })
                      }
                      placeholder="0"
                      className="h-12 text-base font-medium"
                    />
                  </div>

                  {/* Section Assignment */}
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Menu Section
                    </Label>
                    <select
                      value={targetSectionId}
                      onChange={(e) => setTargetSectionId(e.target.value)}
                      className="h-12 w-full rounded-xl border bg-card px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {menu.sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Operational Availability Switch */}
                <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-3 py-2.5">
                  <div>
                    <p className="text-xs font-semibold">Available for order today</p>
                    <p className="text-[11px] text-muted-foreground">
                      Mark as sold out to pause orders while keeping item visible on menu.
                    </p>
                  </div>
                  <Switch
                    checked={draft.available}
                    onCheckedChange={(val) => setDraft({ ...draft, available: val })}
                    aria-label="Available for order"
                  />
                </div>

                {/* 4. Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Description <span className="text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <span className="text-[10px] text-muted-foreground">
                      {draft.description.length}/300
                    </span>
                  </div>
                  <Textarea
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value.slice(0, 300) })}
                    placeholder="Describe ingredients, preparation style, origin, or flavor profile..."
                    rows={2}
                    className="text-xs"
                  />
                </div>

                {/* 5. Photography & Media Section */}
                <div className="rounded-2xl border bg-muted/20 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-primary" />
                      Item Photography
                    </Label>
                    {draft.image && (
                      <span className="text-[10px] rounded-md bg-primary/10 text-primary px-2 py-0.5 font-semibold">
                        {draft.imageSource === "upload" ? "Merchant Photo" : "Representative Library"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {draft.image ? (
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-card">
                        <img
                          src={draft.image}
                          alt="Offering preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDraft({ ...draft, image: undefined, imageSource: undefined })
                          }
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-white hover:bg-black"
                          aria-label="Remove image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed bg-card/60">
                        <Input
                          value={draft.emoji}
                          onChange={(e) => setDraft({ ...draft, emoji: e.target.value || "🍽️" })}
                          className="h-10 w-12 text-center text-2xl border-none shadow-none bg-transparent p-0"
                          title="Fallback emoji"
                        />
                        <span className="text-[10px] text-muted-foreground">Fallback icon</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-muted-foreground leading-snug">
                        {draft.image
                          ? "Image attached. Tap Replace to choose another photo or adjust crop."
                          : "High quality food photography increases guest engagement and ordering confidence."}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setImageModalOpen(true)}
                        className="h-9 w-full text-xs font-semibold gap-1.5 shadow-2xs"
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-primary" />
                        {draft.image ? "Replace / Adjust Photo" : "Select Photo from Library or Upload"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Quick Live Preview Card */}
                <div className="rounded-2xl border bg-card/40 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5 text-primary" />
                      Customer Card Preview
                    </span>
                    <span>{formatPrice(draft.price, currency)}</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border bg-card p-2.5 shadow-2xs">
                    {draft.image ? (
                      <img
                        src={draft.image}
                        alt="Preview"
                        className="h-14 w-14 shrink-0 rounded-lg object-cover border"
                      />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
                        {draft.emoji}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm truncate">
                        {draft.name || "Offering Title"}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {draft.description || "No description provided."}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {!draft.available && (
                          <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                            Sold Out
                          </span>
                        )}
                        {draft.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-medium"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TAGS & DISCOVERY ATTRIBUTES */}
            {activeTab === "tags" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <TagIcon className="h-3.5 w-3.5 text-primary" />
                    Descriptive Tags & Dietaries
                  </Label>
                  <span className="text-xs text-primary font-semibold">
                    {draft.tags.length} assigned
                  </span>
                </div>

                {/* Assigned Tag Chips */}
                {draft.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 rounded-xl border bg-muted/20 p-2.5">
                    {draft.tags.map((t) => (
                      <span
                        key={t}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all shadow-2xs",
                          isDietaryClaimTag(t)
                            ? "bg-primary/15 text-primary border border-primary/20"
                            : "bg-secondary text-secondary-foreground border border-border",
                        )}
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          aria-label={`Remove tag ${t}`}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground italic">
                    No tags assigned yet. Select suggested tags or create custom ones below.
                  </p>
                )}

                {/* Custom Tag Input */}
                <div className="flex gap-2">
                  <Input
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (customTagInput.trim()) {
                          addTag(customTagInput);
                          setCustomTagInput("");
                        }
                      }
                    }}
                    placeholder="Create custom tag in any language (e.g. Nyama Choma, Keto, Organic)..."
                    className="h-10 text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 shrink-0 text-xs font-semibold"
                    onClick={() => {
                      if (customTagInput.trim()) {
                        addTag(customTagInput);
                        setCustomTagInput("");
                      }
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>

                {/* Reusable Menu Tags */}
                {existingMenuTags.filter((t) => !draft.tags.includes(t)).length > 0 && (
                  <div className="rounded-xl border bg-card p-3 space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground block">
                      Reuse tags already on this menu:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {existingMenuTags
                        .filter((t) => !draft.tags.includes(t))
                        .map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => addTag(t)}
                            className="rounded-full border bg-muted/60 px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            + {t}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Contextual Suggestions Grouped */}
                <div className="space-y-3 rounded-2xl border bg-card p-3">
                  <span className="text-xs font-bold text-foreground block">
                    Suggested for your {categoryContext || "business"}:
                  </span>
                  {groupedTagSuggestions.map((group) => {
                    const unassigned = group.tags.filter(
                      (t) => !draft.tags.some((dt) => dt.toLowerCase() === t.toLowerCase()),
                    );
                    if (unassigned.length === 0) return null;
                    return (
                      <div key={group.id} className="space-y-1 pt-1 border-t first:border-t-0 first:pt-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {group.label}
                          </span>
                          {group.id === "dietary_claims" && (
                            <span className="text-[10px] text-muted-foreground/80 italic">
                              Merchant-asserted
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {unassigned.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => addTag(t)}
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-xs transition-colors active:scale-95",
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

                {/* Disclaimer */}
                <p className="rounded-lg bg-muted/60 p-2.5 text-[11px] text-muted-foreground italic leading-snug">
                  ℹ {PEWA_TAG_DISCLAIMER}
                </p>
              </div>
            )}

            {/* TAB 3: STRUCTURED MODIFIERS AND OPTIONS */}
            {activeTab === "modifiers" && (
              <ModifierEditor
                modifiers={draft.modifiers}
                onChange={(mods) => setDraft({ ...draft, modifiers: mods })}
                currency={currency}
              />
            )}

            {/* Sticky Action Footer */}
            <div className="flex flex-col gap-2 pt-3 border-t">
              <div className="flex gap-2">
                {isEditing && onDelete && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 px-3 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (draft.id) {
                        onDelete(sectionId, draft.id);
                        onOpenChange(false);
                      }
                    }}
                    title="Delete offering"
                    aria-label="Delete offering"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {isEditing && onDuplicate && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 px-3 text-foreground hover:bg-muted"
                    onClick={() => {
                      if (draft.id) {
                        onDuplicate(sectionId, draft.id);
                        onOpenChange(false);
                      }
                    }}
                    title="Duplicate offering"
                    aria-label="Duplicate offering"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  className="h-12 flex-1 text-base font-bold shadow-sm"
                  onClick={() => handleSave(false)}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  {isEditing ? "Save Changes" : "Save Offering"}
                </Button>
              </div>

              {!isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 text-xs font-semibold"
                  onClick={() => handleSave(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1 text-primary" />
                  Save and add another item
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ImageSelectionModal
        open={imageModalOpen}
        onOpenChange={setImageModalOpen}
        currentImage={draft.image}
        currentSource={draft.imageSource}
        onSelectImage={(dataUrl, source) => {
          setDraft((prev) => ({ ...prev, image: dataUrl, imageSource: source }));
        }}
        onRemoveImage={() => {
          setDraft((prev) => ({ ...prev, image: undefined, imageSource: undefined }));
        }}
      />
    </>
  );
}
