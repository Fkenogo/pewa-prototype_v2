import { useState } from "react";
import { MessageCircle, Minus, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import type { Offering, Venue } from "@/lib/pewa/types";
import { formatPrice, usePewa } from "@/lib/pewa/store";
import { canAdmitOrder } from "@/lib/pewa/ordering";
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
  const { menus, addCartLine, orderPolicy } = usePewa();
  const parentMenu = menus.find((m) => m.id === menuId);
  const isUnpublishedOrPreview =
    isPreview || (parentMenu ? parentMenu.status !== "published" : false);

  // Single choice state: groupId -> optionId
  const [selectedSingle, setSelectedSingle] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of offering.modifiers) {
      if ((g.selectionType ?? "single") === "single" && g.required && g.options.length > 0) {
        const firstOpt = g.options[0];
        if (firstOpt) {
          init[g.id] = firstOpt.id;
        }
      }
    }
    return init;
  });

  // Multiple choice state: groupId -> optionId[]
  const [selectedMulti, setSelectedMulti] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  const toggleMultiOption = (groupId: string, optionId: string) => {
    setSelectedMulti((prev) => {
      const current = prev[groupId] || [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [groupId]: next };
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

  const missingRequired = offering.modifiers.some((group) => {
    if (!group.required) return false;
    const isSingle = (group.selectionType ?? "single") === "single";
    if (isSingle) {
      return !selectedSingle[group.id];
    } else {
      return (selectedMulti[group.id] || []).length === 0;
    }
  });

  const total = (offering.price + options.reduce((sum, o) => sum + o.priceDelta, 0)) * quantity;

  return (
    <div className="space-y-4">
      {offering.modifiers.map((group) => {
        const isSingle = (group.selectionType ?? "single") === "single";
        return (
          <fieldset key={group.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <legend className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <span>{group.name}</span>
                {group.required && (
                  <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-bold">
                    Required
                  </span>
                )}
              </legend>
              <span className="text-[11px] text-muted-foreground">
                {isSingle ? "Choose 1" : "Choose any"}
              </span>
            </div>

            <div className="divide-y rounded-xl border bg-card overflow-hidden">
              {/* Optional single-choice: allow 'No selection' */}
              {isSingle && !group.required && (
                <label className="flex min-h-11 items-center gap-2.5 px-3.5 text-sm cursor-pointer hover:bg-muted/30">
                  <input
                    type="radio"
                    name={group.id}
                    checked={!selectedSingle[group.id]}
                    onChange={() => setSelectedSingle({ ...selectedSingle, [group.id]: "" })}
                    className="accent-primary"
                  />
                  <span className="flex-1 text-muted-foreground">Standard / No extra selection</span>
                </label>
              )}

              {group.options.map((opt) => {
                const checked = isSingle
                  ? selectedSingle[group.id] === opt.id
                  : (selectedMulti[group.id] || []).includes(opt.id);

                return (
                  <label
                    key={opt.id}
                    className={cn(
                      "flex min-h-11 items-center gap-2.5 px-3.5 text-sm cursor-pointer transition-colors",
                      checked ? "bg-primary/5 font-medium" : "hover:bg-muted/30",
                    )}
                  >
                    <input
                      type={isSingle ? "radio" : "checkbox"}
                      name={group.id}
                      checked={checked}
                      onChange={() => {
                        if (isSingle) {
                          setSelectedSingle({ ...selectedSingle, [group.id]: opt.id });
                        } else {
                          toggleMultiOption(group.id, opt.id);
                        }
                      }}
                      className="accent-primary"
                    />
                    <span className="flex-1 text-foreground">{opt.name}</span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {opt.priceDelta
                        ? `+${formatPrice(opt.priceDelta, venue.currency)}`
                        : "Included"}
                    </span>
                  </label>
                );
              })}
            </div>
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
      ) : !offering.available ? (
        <div className="space-y-2">
          <p className="rounded-lg bg-status-soldout/15 p-2.5 text-center text-xs font-semibold text-status-soldout">
            This item is currently sold out. You can contact the business directly.
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
          disabled={missingRequired}
          onClick={() => {
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
          {missingRequired
            ? "Please make required selections"
            : `Add to cart · ${formatPrice(total, venue.currency)}`}
        </Button>
      )}
    </div>
  );
}
