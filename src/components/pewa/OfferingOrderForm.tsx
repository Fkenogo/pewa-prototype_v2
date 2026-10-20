import { useState } from "react";
import { MessageCircle, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Offering, Venue } from "@/lib/pewa/types";
import { formatPrice, usePewa } from "@/lib/pewa/store";
import { canAdmitOrder } from "@/lib/pewa/ordering";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function OfferingOrderForm({
  offering,
  venue,
  menuId,
  onAdded,
  onOpenContact,
}: {
  offering: Offering;
  venue: Venue;
  menuId: string;
  onAdded: () => void;
  onOpenContact?: () => void;
}) {
  const { addCartLine, orderPolicy } = usePewa();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const options = offering.modifiers.flatMap((group) => {
    const option = group.options.find((o) => o.id === selected[group.id]);
    return option
      ? [
          {
            groupId: group.id,
            optionId: option.id,
            name: option.name,
            priceDelta: option.priceDelta,
          },
        ]
      : [];
  });
  const total = (offering.price + options.reduce((sum, o) => sum + o.priceDelta, 0)) * quantity;
  return (
    <div className="space-y-4">
      {offering.modifiers.map((g) => (
        <fieldset key={g.id}>
          <legend className="mb-2 text-sm font-semibold">{g.name}</legend>
          <div className="divide-y rounded-lg border">
            <label className="flex min-h-11 items-center gap-2 px-3 text-sm">
              <input
                type="radio"
                name={g.id}
                checked={!selected[g.id]}
                onChange={() => setSelected({ ...selected, [g.id]: "" })}
              />
              No extra selection
            </label>
            {g.options.map((o) => (
              <label key={o.id} className="flex min-h-11 items-center gap-2 px-3 text-sm">
                <input
                  type="radio"
                  name={g.id}
                  checked={selected[g.id] === o.id}
                  onChange={() => setSelected({ ...selected, [g.id]: o.id })}
                />
                <span className="flex-1">{o.name}</span>
                <span className="text-muted-foreground">
                  {o.priceDelta ? `+${formatPrice(o.priceDelta, venue.currency)}` : "Included"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Quantity</span>
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="outline"
            aria-label="Decrease quantity"
            disabled={quantity === 1}
            onClick={() => setQuantity(quantity - 1)}
          >
            <Minus />
          </Button>
          <span className="w-6 text-center">{quantity}</span>
          <Button
            size="icon"
            variant="outline"
            aria-label="Increase quantity"
            disabled={quantity === 99}
            onClick={() => setQuantity(quantity + 1)}
          >
            <Plus />
          </Button>
        </div>
      </div>
      <label className="block space-y-1 text-sm">
        Item notes
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      </label>
      {!canAdmitOrder(orderPolicy) ? (
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
          className="h-12 w-full"
          disabled={!offering.available}
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
          Add to cart · {formatPrice(total, venue.currency)}
        </Button>
      )}
    </div>
  );
}
