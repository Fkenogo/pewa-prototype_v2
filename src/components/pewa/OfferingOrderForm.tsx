import { useState } from "react";
import { MessageCircle, Minus, Plus, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Offering, Venue } from "@/lib/pewa/types";
import { formatPrice, usePewa, validateModifierSelection } from "@/lib/pewa/store";
import { canAdmitOrder } from "@/lib/pewa/ordering";
import {
  getEffectiveOfferingAvailability,
  getMenuEffectiveSharedOfferings,
} from "@/lib/pewa/availability";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function OfferingOrderForm({
  offering,
  venue,
  menuId,
  isPreview = false,
  onAdded,
  onOpenContact,
}: {
  offering: Offering;
  venue: Venue;
  menuId: string;
  isPreview?: boolean;
  onAdded: () => void;
  onOpenContact?: () => void;
}) {
  const { menus, addCartLine, orderPolicy, simulatedTime, sharedOfferings } = usePewa();
  const parentMenu = menus.find((m) => m.id === menuId);
  const isUnpublishedOrPreview =
    isPreview || (parentMenu ? parentMenu.status !== "published" : false);

  const effectiveShared = getMenuEffectiveSharedOfferings(parentMenu, sharedOfferings, {
    isPreview,
  });

  const availability = getEffectiveOfferingAvailability(offering, venue.id, {
    simulatedTime,
    sharedOfferings: effectiveShared,
    venue,
  });

  // Single choice state: groupId -> optionId (never silently pre-selected)
  const [selectedSingle, setSelectedSingle] = useState<Record<string, string>>({});

  // Multiple choice state: groupId -> optionId[]
  const [selectedMulti, setSelectedMulti] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  const toggleMultiOption = (groupId: string, optionId: string, maxSelections?: number) => {
    setSelectedMulti((prev) => {
      const current = prev[groupId] || [];
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
      if (maxSelections !== undefined && current.length >= maxSelections) {
        toast.error(`You may select at most ${maxSelections} options for this group.`);
        return prev;
      }
      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  // Resolve selected options with full metadata
  const options = offering.modifiers.flatMap((group) => {
    const isSingle = (group.selectionType ?? "single") === "single";
    if (isSingle) {
      const optId = selectedSingle[group.id];
      const opt = group.options.find((o) => o.id === optId);
      return opt
        ? [
            {
              groupId: group.id,
              optionId: opt.id,
              name: opt.name,
              priceDelta: opt.priceDelta,
            },
          ]
        : [];
    } else {
      const optIds = selectedMulti[group.id] || [];
      return optIds.flatMap((id) => {
        const opt = group.options.find((o) => o.id === id);
        return opt
          ? [
              {
                groupId: group.id,
                optionId: opt.id,
                name: opt.name,
                priceDelta: opt.priceDelta,
              },
            ]
          : [];
      });
    }
  });

  // Reusable validation checks across all groups
  const groupValidations = offering.modifiers.map((group) => {
    const isSingle = (group.selectionType ?? "single") === "single";
    const singleVal = selectedSingle[group.id];
    const selectedIds: string[] = isSingle
      ? singleVal
        ? [singleVal]
        : []
      : selectedMulti[group.id] || [];
    const error = validateModifierSelection(group, selectedIds);
    return {
      group,
      selectedIds,
      count: selectedIds.length,
      error,
    };
  });

  const firstValidationError = groupValidations.find((v) => v.error !== null)?.error || null;
  const isSelectionValid = !firstValidationError;

  const total = (offering.price + options.reduce((sum, o) => sum + o.priceDelta, 0)) * quantity;

  return (
    <div className="space-y-4">
      {offering.modifiers.map((group) => {
        const isSingle = (group.selectionType ?? "single") === "single";
        const validation = groupValidations.find((v) => v.group.id === group.id);
        const selectedCount = validation ? validation.count : 0;
        const groupError = validation?.error;
        const isRequired = Boolean(group.required);
        const minSelections = group.minSelections ?? (isRequired ? 1 : 0);
        const maxSelections = group.maxSelections;

        return (
          <fieldset key={group.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <legend className="text-sm font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                <span>{group.name}</span>
                {isRequired ? (
                  <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-bold">
                    {isSingle
                      ? "Required · Choose 1"
                      : maxSelections
                        ? `Required · Choose ${minSelections}–${maxSelections}`
                        : `Required · Choose at least ${minSelections}`}
                  </span>
                ) : (
                  <span className="rounded bg-muted text-muted-foreground px-1.5 py-0.5 text-[10px] font-medium">
                    {isSingle
                      ? "Optional · Up to 1"
                      : maxSelections
                        ? `Optional · Up to ${maxSelections}`
                        : "Optional · Choose any"}
                  </span>
                )}
              </legend>
              <span
                className={cn(
                  "text-[11px] font-medium shrink-0",
                  groupError ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                )}
              >
                {isSingle
                  ? selectedCount === 1
                    ? "✓ Selected"
                    : isRequired
                      ? "0/1 selected"
                      : "None"
                  : maxSelections
                    ? `${selectedCount}/${maxSelections} selected`
                    : `${selectedCount} selected`}
              </span>
            </div>

            <div className="divide-y rounded-xl border bg-card overflow-hidden">
              {/* Optional single-choice: allow explicit 'No selection / Standard' */}
              {isSingle && !group.required && (
                <label className="flex min-h-11 items-center gap-2.5 px-3.5 text-sm cursor-pointer hover:bg-muted/30">
                  <input
                    type="radio"
                    name={group.id}
                    checked={!selectedSingle[group.id]}
                    onChange={() => setSelectedSingle({ ...selectedSingle, [group.id]: "" })}
                    className="accent-primary"
                  />
                  <span className="flex-1 text-muted-foreground">
                    Standard / No extra selection
                  </span>
                </label>
              )}

              {group.options.map((opt) => {
                const checked = isSingle
                  ? selectedSingle[group.id] === opt.id
                  : (selectedMulti[group.id] || []).includes(opt.id);

                const reachedMax =
                  !isSingle &&
                  !checked &&
                  maxSelections !== undefined &&
                  selectedCount >= maxSelections;

                return (
                  <label
                    key={opt.id}
                    className={cn(
                      "flex min-h-11 items-center gap-2.5 px-3.5 text-sm transition-colors",
                      reachedMax ? "opacity-50 cursor-not-allowed bg-muted/20" : "cursor-pointer",
                      checked ? "bg-primary/5 font-medium" : "hover:bg-muted/30",
                    )}
                  >
                    <input
                      type={isSingle ? "radio" : "checkbox"}
                      name={group.id}
                      checked={checked}
                      disabled={reachedMax}
                      onChange={() => {
                        if (isSingle) {
                          setSelectedSingle({ ...selectedSingle, [group.id]: opt.id });
                        } else {
                          toggleMultiOption(group.id, opt.id, maxSelections);
                        }
                      }}
                      className="accent-primary"
                    />
                    <span className="flex-1 text-foreground">
                      {opt.name}
                      {reachedMax && (
                        <span className="text-[10px] text-muted-foreground ml-1.5 italic">
                          (Max reached)
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {opt.priceDelta
                        ? `+${formatPrice(opt.priceDelta, venue.currency)}`
                        : "Included"}
                    </span>
                  </label>
                );
              })}
            </div>

            {groupError && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium px-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{groupError}</span>
              </p>
            )}
          </fieldset>
        );
      })}

      {/* Quantity Selector */}
      <div className="flex items-center justify-between rounded-xl border bg-card p-3">
        <span className="text-sm font-semibold">Quantity</span>
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="outline"
            aria-label="Decrease quantity"
            disabled={quantity === 1}
            onClick={() => setQuantity(quantity - 1)}
            className="h-9 w-9"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center font-bold text-base">{quantity}</span>
          <Button
            size="icon"
            variant="outline"
            aria-label="Increase quantity"
            disabled={quantity === 99}
            onClick={() => setQuantity(quantity + 1)}
            className="h-9 w-9"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Item Notes */}
      <label className="block space-y-1 text-xs font-semibold text-muted-foreground">
        Preparation Notes (Optional)
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="e.g. Extra hot, sauce on the side, allergies..."
          className="text-xs"
          rows={2}
        />
      </label>

      {/* Order Button or Disabled State */}
      {isUnpublishedOrPreview ? (
        <div className="space-y-2">
          <p className="rounded-lg bg-amber-500/15 p-2.5 text-center text-xs font-semibold text-amber-900 dark:text-amber-200">
            Preview Mode: Structured ordering is disabled for unpublished drafts.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled
            className="h-12 w-full opacity-60 cursor-not-allowed font-semibold"
          >
            Ordering disabled in draft preview
          </Button>
        </div>
      ) : !availability.available ? (
        <div className="space-y-2">
          <p
            className={cn(
              "rounded-lg p-2.5 text-center text-xs font-semibold",
              availability.reason === "sold_out_manual"
                ? "bg-status-soldout/15 text-status-soldout"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
            )}
          >
            {availability.reason === "sold_out_manual"
              ? "This item is currently sold out. You can contact the business directly."
              : `Currently outside scheduled service hours (${availability.scheduleDetails || "Scheduled hours"}). You can contact the business directly.`}
          </p>
          <Button
            type="button"
            className="h-12 w-full rounded-full bg-accent font-semibold text-accent-foreground"
            onClick={() => {
              onAdded();
              onOpenContact?.();
            }}
          >
            <MessageCircle className="mr-2 h-4 w-4" /> Contact venue to inquire
          </Button>
        </div>
      ) : !canAdmitOrder(orderPolicy) ? (
        <div className="space-y-2">
          <p className="rounded-lg bg-muted p-2.5 text-center text-xs text-muted-foreground">
            Structured requests are paused for this business. You can contact them directly to
            order.
          </p>
          <Button
            type="button"
            className="h-12 w-full rounded-full bg-accent font-semibold text-accent-foreground"
            onClick={() => {
              onAdded();
              onOpenContact?.();
            }}
          >
            <MessageCircle className="mr-2 h-4 w-4" /> Contact venue to order
          </Button>
        </div>
      ) : (
        <Button
          className="h-12 w-full font-bold text-base shadow-sm"
          disabled={!isSelectionValid}
          onClick={() => {
            if (!isSelectionValid) {
              toast.error(firstValidationError || "Please make required selections");
              return;
            }
            const error = addCartLine(venue.id, {
              menuId,
              offeringId: offering.id,
              name: offering.name,
              emoji: offering.emoji,
              basePrice: offering.price,
              options,
              quantity,
              note,
            });
            if (error) {
              toast.error(error);
              return;
            }
            toast.success("Added to cart");
            onAdded();
          }}
        >
          {!isSelectionValid
            ? firstValidationError || "Please make required selections"
            : `Add to cart · ${formatPrice(total, venue.currency)}`}
        </Button>
      )}
    </div>
  );
}
