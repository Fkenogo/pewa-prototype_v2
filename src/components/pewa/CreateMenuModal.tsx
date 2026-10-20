import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  Lock,
  Plus,
  Rocket,
  Sparkles,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { usePewa } from "@/lib/pewa/store";
import type { Venue } from "@/lib/pewa/types";
import {
  getRecommendedSectionsForCategory,
  getSuggestedMenuNamesForCategory,
  getVenueBrandContext,
} from "@/lib/pewa/taxonomy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface CreateMenuModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultVenueId?: string | undefined;
}

export function CreateMenuModal({ open, onOpenChange, defaultVenueId }: CreateMenuModalProps) {
  const navigate = useNavigate();
  const { organisation, venues, addMenu } = usePewa();
  const orgVenues = venues.filter((v) => v.orgId === organisation?.id);
  const isMultiVenue = orgVenues.length > 1;

  // Step state: 0 = Context & Venue, 1 = Details, 2 = Sections
  const [step, setStep] = useState<number>(0);

  // Form state
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>(() => {
    if (defaultVenueId && orgVenues.some((v) => v.id === defaultVenueId)) {
      return [defaultVenueId];
    }
    return orgVenues.length === 1 && orgVenues[0] ? [orgVenues[0].id] : [];
  });

  const [menuName, setMenuName] = useState("");
  const [description, setDescription] = useState("");
  const [isProtected, setIsProtected] = useState(false);

  // Suggested & selected sections
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [customSectionInput, setCustomSectionInput] = useState("");

  // Derive relevant venue context
  const primaryVenue = orgVenues.find((v) => selectedVenueIds.includes(v.id)) || orgVenues[0];
  const brandContext = primaryVenue
    ? getVenueBrandContext(primaryVenue, organisation)
    : { brandName: organisation?.name || "Business", category: "Café", services: [] };

  const suggestedNames = getSuggestedMenuNamesForCategory(brandContext.category);
  const recommendedSections = getRecommendedSectionsForCategory(brandContext.category);

  // Validation
  const canContinueStep0 = !isMultiVenue || selectedVenueIds.length > 0;
  const canContinueStep1 = menuName.trim().length > 0;

  const toggleVenue = (venueId: string) => {
    setSelectedVenueIds((prev) =>
      prev.includes(venueId) ? prev.filter((id) => id !== venueId) : [...prev, venueId],
    );
  };

  const selectAllVenues = () => {
    setSelectedVenueIds(orgVenues.map((v) => v.id));
  };

  const toggleSuggestedSection = (secName: string) => {
    setSelectedSections((prev) =>
      prev.includes(secName) ? prev.filter((s) => s !== secName) : [...prev, secName],
    );
  };

  const addCustomSection = () => {
    const clean = customSectionInput.trim();
    if (!clean) return;
    if (!selectedSections.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setSelectedSections((prev) => [...prev, clean]);
    }
    setCustomSectionInput("");
  };

  const moveSection = (index: number, delta: number) => {
    const newIdx = index + delta;
    if (newIdx < 0 || newIdx >= selectedSections.length) return;
    const copy = [...selectedSections];
    const item = copy[index];
    const target = copy[newIdx];
    if (item && target) {
      copy[index] = target;
      copy[newIdx] = item;
      setSelectedSections(copy);
    }
  };

  const removeSection = (secName: string) => {
    setSelectedSections((prev) => prev.filter((s) => s !== secName));
  };

  const handleCreate = () => {
    if (!menuName.trim()) {
      toast.error("Please enter a menu name");
      return;
    }

    if (isMultiVenue && selectedVenueIds.length === 0) {
      toast.error("Please select at least one venue for this menu");
      return;
    }

    const menuId = addMenu({
      name: menuName.trim(),
      description: description.trim() || undefined,
      venueIds: selectedVenueIds.length > 0 ? selectedVenueIds : undefined,
      venueId: selectedVenueIds.length === 1 ? selectedVenueIds[0] : undefined,
      isProtected,
      initialSections: selectedSections,
    });

    toast.success(`Draft menu “${menuName.trim()}” created`);
    onOpenChange(false);
    navigate({ to: "/admin/menus/$menuId", params: { menuId } });
  };

  const resetState = () => {
    setStep(0);
    setMenuName("");
    setDescription("");
    setIsProtected(false);
    setSelectedSections([]);
    setCustomSectionInput("");
    if (defaultVenueId && orgVenues.some((v) => v.id === defaultVenueId)) {
      setSelectedVenueIds([defaultVenueId]);
    } else if (orgVenues.length === 1 && orgVenues[0]) {
      setSelectedVenueIds([orgVenues[0].id]);
    } else {
      setSelectedVenueIds([]);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <SheetContent
        side="bottom"
        className="mx-auto h-[92vh] max-w-lg rounded-t-3xl border-t bg-background px-4 pb-8 pt-3 shadow-2xl overflow-y-auto no-scrollbar focus:outline-none"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />

        <SheetHeader className="text-left pb-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <span>Create new menu</span>
            </SheetTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SheetDescription className="text-xs">
            Step {step + 1} of 3 ·{" "}
            {step === 0
              ? "Business context & venue eligibility"
              : step === 1
                ? "Menu details & visibility"
                : "Suggested categories & sections"}
          </SheetDescription>

          {/* Stepper progress indicator */}
          <div className="mt-2 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all",
                  i === step ? "bg-primary" : i < step ? "bg-primary/50" : "bg-muted",
                )}
              />
            ))}
          </div>
        </SheetHeader>

        {/* STEP 0: Business Context & Venue Eligibility */}
        {step === 0 && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border bg-muted/30 p-3 text-xs">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider block text-[10px]">
                Organisation
              </span>
              <p className="mt-0.5 font-bold text-sm text-foreground">
                {organisation?.name || "Your Organisation"}
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {organisation?.businessType || "Hospitality"} · Currency:{" "}
                {organisation?.currency || "KES"}
              </p>
            </div>

            {isMultiVenue ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">Where will this menu be available?</h3>
                    <p className="text-xs text-muted-foreground">
                      Assign to specific venues. Menus never publish automatically across all
                      brands.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAllVenues}
                    className="h-7 text-xs text-primary"
                  >
                    Select all
                  </Button>
                </div>

                <div className="space-y-2">
                  {orgVenues.map((v) => {
                    const checked = selectedVenueIds.includes(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => toggleVenue(v.id)}
                        className={cn(
                          "flex w-full items-start justify-between rounded-xl border p-3.5 text-left transition-all",
                          checked
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border bg-card hover:bg-muted/40",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{v.name}</span>
                            {v.category && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                {v.category}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                            {v.services.join(" · ")}
                            {v.address ? ` · ${v.address}` : ""}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30",
                          )}
                        >
                          {checked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Single-venue context automatically selected</span>
                </div>
                <p className="text-foreground font-medium">
                  Assigned to: {orgVenues[0]?.name || "Primary Venue"}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  No unnecessary configuration required. When you add more venues later, you can
                  manage explicit multi-venue assignment.
                </p>
              </div>
            )}

            <div className="pt-4">
              <Button
                type="button"
                className="w-full h-12 font-semibold text-base gap-2"
                disabled={!canContinueStep0}
                onClick={() => setStep(1)}
              >
                <span>Continue to menu details</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 1: Menu Details & Visibility */}
        {step === 1 && (
          <div className="mt-5 space-y-5">
            <div>
              <Label className="block text-sm font-semibold mb-1.5">
                Menu name <span className="text-primary">*</span>
              </Label>
              <Input
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                placeholder="e.g. Breakfast & Morning Bakes"
                className="h-12 text-base"
                autoFocus
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Merchants can name menus in any natural language.
              </p>

              {/* 1-Tap Suggested Menu Names */}
              <div className="mt-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Suggested names for your {brandContext.category}:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setMenuName(name)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        menuName === name
                          ? "border-primary bg-primary text-primary-foreground font-semibold"
                          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label className="block text-sm font-semibold mb-1.5">
                Description{" "}
                <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Served daily from 7:00 AM to 11:30 AM. Freshly baked breads and single-origin coffee."
                rows={2}
                className="text-sm"
              />
            </div>

            <div>
              <Label className="block text-sm font-semibold mb-2">
                Menu visibility & customer access
              </Label>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setIsProtected(false)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                    !isProtected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card hover:bg-muted/40",
                  )}
                >
                  <Eye className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-sm text-foreground block">
                      Public menu (Standard)
                    </span>
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      Visible on your public link, discoverable in customer search and directory.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsProtected(true)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                    isProtected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card hover:bg-muted/40",
                  )}
                >
                  <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-sm text-foreground block">
                      Protected menu (Private dining / In-Room)
                    </span>
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      Restricted to in-room guests or direct access. Strictly excluded from organic
                      public directory search.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1"
                onClick={() => setStep(0)}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
              <Button
                type="button"
                className="h-12 flex-1 font-semibold text-base gap-1.5"
                disabled={!canContinueStep1}
                onClick={() => setStep(2)}
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Categories and Sections */}
        {step === 2 && (
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">
                  Suggested sections for your {brandContext.category}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select one or several sections in one tap, or add custom ones below.
              </p>

              {/* Multi-select suggested chips */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {recommendedSections.map((secName) => {
                  const selected = selectedSections.includes(secName);
                  return (
                    <button
                      key={secName}
                      type="button"
                      onClick={() => toggleSuggestedSection(secName)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
                        selected
                          ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "border-border bg-card text-foreground hover:bg-muted",
                      )}
                    >
                      {selected ? (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span>{secName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom section creation */}
            <div>
              <Label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Or add custom section name (any language):
              </Label>
              <div className="flex gap-2">
                <Input
                  value={customSectionInput}
                  onChange={(e) => setCustomSectionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomSection();
                    }
                  }}
                  placeholder="e.g. Vyakula Vya Asili, Chef's Corner"
                  className="h-10 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomSection}
                  disabled={!customSectionInput.trim()}
                  className="h-10 shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>

            {/* Configured sections preview & reorder */}
            {selectedSections.length > 0 && (
              <div className="rounded-xl border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Sections to create ({selectedSections.length})</span>
                  <span className="text-[10px] text-muted-foreground">Tap arrows to reorder</span>
                </div>
                <div className="space-y-1.5">
                  {selectedSections.map((sec, idx) => (
                    <div
                      key={sec}
                      className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground w-4">
                          {idx + 1}.
                        </span>
                        <span className="font-semibold text-foreground">{sec}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveSection(idx, -1)}
                          className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-20"
                          aria-label="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={idx === selectedSections.length - 1}
                          onClick={() => moveSection(idx, 1)}
                          className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-20"
                          aria-label="Move down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSection(sec)}
                          className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-3">
              <Button
                type="button"
                onClick={handleCreate}
                className="w-full h-12 text-base font-semibold gap-2 shadow-sm"
              >
                <Rocket className="h-4 w-4" />
                <span>
                  Create Draft Menu{" "}
                  {selectedSections.length > 0 ? `(${selectedSections.length} sections)` : ""}
                </span>
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 text-xs"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 flex-1 text-xs text-muted-foreground"
                  onClick={() => {
                    setSelectedSections([]);
                    handleCreate();
                  }}
                >
                  Create blank draft
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
