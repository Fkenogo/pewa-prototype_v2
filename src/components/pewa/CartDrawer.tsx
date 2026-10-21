import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { usePewa, formatPrice } from "@/lib/pewa/store";
import {
  canAdmitOrder,
  cartTotal,
  getAuthoritativeVenues,
  lineTotal,
  validateCart,
} from "@/lib/pewa/ordering";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

export function CartDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const state = usePewa();
  const navigate = useNavigate();
  const [review, setReview] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [guestName, setName] = useState("");
  const [guestContact, setContact] = useState("");
  const [service, setService] = useState("");
  const [note, setNote] = useState("");
  const venue = getAuthoritativeVenues(state).find((v) => v.id === state.cart?.venueId);
  const lines = state.cart?.lines ?? [];
  const error = lines.length ? validateCart(state, state.cart) : null;
  const chosenService = venue?.services.includes(service) ? service : (venue?.services[0] ?? "");
  return (
    <Drawer
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) {
          setReview(false);
          setConfirmed(false);
        }
      }}
    >
      <DrawerContent className="mx-auto max-w-lg">
        <div className="overflow-y-auto px-4 pb-safe">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="font-display text-2xl">
              {review ? "Review your request" : "Your cart"}
            </DrawerTitle>
            <DrawerDescription>{venue?.name ?? "No items yet"}</DrawerDescription>
          </DrawerHeader>
          {!lines.length ? (
            <p className="py-6 text-muted-foreground">Your cart is empty.</p>
          ) : (
            <>
              <ul className="divide-y">
                {lines.map((line) => (
                  <li key={line.id} className="py-3">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold">{line.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {line.options.map((o) => o.name).join(" · ")}
                        </p>
                        {line.note && <p className="break-words text-sm">{line.note}</p>}
                      </div>
                      <span className="shrink-0 text-sm">
                        {formatPrice(lineTotal(line), venue?.currency ?? "KES")}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={`Decrease ${line.name}`}
                        onClick={() => {
                          state.updateCartQuantity(line.id, line.quantity - 1);
                          setConfirmed(false);
                        }}
                      >
                        <Minus />
                      </Button>
                      <span className="w-6 text-center">{line.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={`Increase ${line.name}`}
                        disabled={line.quantity >= 99}
                        onClick={() => {
                          state.updateCartQuantity(line.id, line.quantity + 1);
                          setConfirmed(false);
                        }}
                      >
                        <Plus />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove ${line.name}`}
                        onClick={() => state.updateCartQuantity(line.id, 0)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t py-4 font-semibold">
                <span>Total</span>
                <span>{formatPrice(cartTotal(lines), venue?.currency ?? "KES")}</span>
              </div>
              {error && (
                <p role="alert" className="mb-3 text-sm text-destructive">
                  {error}
                </p>
              )}
              {!canAdmitOrder(state.orderPolicy) && (
                <p role="alert" className="mb-3 text-sm text-destructive">
                  Structured requests are paused. You can still contact the business.
                </p>
              )}
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!review) {
                    setReview(true);
                    return;
                  }
                  if (!confirmed) return;
                  const result = state.submitOrder({
                    guestName,
                    guestContact,
                    service: chosenService,
                    note,
                  });
                  if (result.error) {
                    toast.error(result.error);
                    return;
                  }
                  if (result.id) {
                    onOpenChange(false);
                    setReview(false);
                    setConfirmed(false);
                    navigate({ to: "/orders/$orderId", params: { orderId: result.id } });
                  }
                }}
              >
                {review ? (
                  <div className="space-y-2 text-sm">
                    <p>
                      {guestName} · {guestContact}
                    </p>
                    <p>{chosenService}</p>
                    {note && <p className="break-words">{note}</p>}
                    <p className="font-semibold">This is a request, not a confirmed sale.</p>
                    <p className="text-muted-foreground">
                      PEWA transmits your order request directly to the venue. Payment and
                      fulfilment are handled directly with the business.
                    </p>
                    <label className="flex items-start gap-2 py-2">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="mt-1 h-4 w-4"
                      />
                      I understand my request needs business acceptance.
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setReview(false);
                        setConfirmed(false);
                      }}
                    >
                      <ArrowLeft />
                      Edit details
                    </Button>
                  </div>
                ) : (
                  <>
                    <label className="block space-y-1 text-sm">
                      Your name
                      <Input
                        required
                        value={guestName}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      Phone number
                      <Input
                        required
                        type="tel"
                        value={guestContact}
                        onChange={(e) => setContact(e.target.value)}
                        autoComplete="tel"
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      Service
                      <select
                        aria-label="Service"
                        className="h-11 w-full rounded-md border bg-background px-3"
                        value={chosenService}
                        onChange={(e) => setService(e.target.value)}
                      >
                        {venue?.services.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1 text-sm">
                      Table, pickup or delivery notes
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={500}
                      />
                    </label>
                  </>
                )}
                <Button
                  className="h-12 w-full"
                  type="submit"
                  disabled={!!error || !canAdmitOrder(state.orderPolicy) || (review && !confirmed)}
                >
                  {review ? "Submit order request" : "Review request"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    state.clearCart();
                    setReview(false);
                  }}
                >
                  Clear cart
                </Button>
              </form>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
