import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Eye,
  Heart,
  KeyRound,
  Lock,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { canAuthorMenus, formatPrice, getLiveMenu, usePewa } from "@/lib/pewa/store";
import type { Menu, Offering } from "@/lib/pewa/types";
import { ContactDrawer } from "@/components/pewa/ContactDrawer";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartDrawer } from "@/components/pewa/CartDrawer";
import { OfferingOrderForm } from "@/components/pewa/OfferingOrderForm";
import { canAdmitOrder, cartTotal } from "@/lib/pewa/ordering";
import {
  isMenuEligibleForVenue,
  getImageSource,
  isDietaryClaimTag,
  PEWA_TAG_DISCLAIMER,
} from "@/lib/pewa/taxonomy";

export const Route = createFileRoute("/m/$slug")({
  validateSearch: (search: Record<string, unknown>): { preview?: string | undefined } => ({
    preview: typeof search["preview"] === "string" ? search["preview"] : undefined,
  }),
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${name} — Menu on PEWA` },
        { name: "description", content: `Browse the ${name} menu. No app or account needed.` },
        { property: "og:title", content: `${name} — Menu` },
        { property: "og:description", content: `Browse the ${name} menu instantly.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: PublicMenu,
});

function PublicMenu() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const previewMenuId = search.preview;
  const {
    role,
    organisation,
    venues,
    menus,
    visitVenue,
    favourites,
    toggleFavourite,
    cart,
    orderPolicy,
    guestSession,
    verifyGuestSession,
    clearGuestSession,
  } = usePewa();
  const venue = venues.find((v) => v.slug === slug);

  // CORR-A: Controlled draft preview
  // Preview access requires an explicitly authorised simulated merchant role with appropriate organisation/venue scope.
  // The preview URL alone (?preview=...) must not grant access to private or unpublished content for unauthorised users.
  const isAuthorisedMerchant =
    canAuthorMenus(role) && !!organisation && !!venue && organisation.id === venue.orgId;

  // Find preview menu ONLY if authorised and strictly eligible for this venue (no organisation-only cross-venue fallback)
  const previewMenu =
    previewMenuId && isAuthorisedMerchant && venue
      ? menus.find(
          (m) =>
            m.id === previewMenuId &&
            m.orgId === organisation.id &&
            isMenuEligibleForVenue(m, venue, venues),
        )
      : undefined;

  const isPreviewRequested = Boolean(previewMenuId);
  const isPreviewMode = Boolean(previewMenu);
  const isPreviewDenied = isPreviewRequested && !isPreviewMode;

  const live: Menu[] = venue
    ? previewMenu
      ? [previewMenu]
      : menus
          .filter((m) => isMenuEligibleForVenue(m, venue, venues) && m.status === "published")
          .map(getLiveMenu)
    : [];
  const [menuIdx, setMenuIdx] = useState(0);
  const [contact, setContact] = useState(false);
  const [detail, setDetail] = useState<Offering | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [roomInput, setRoomInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const venueId = venue?.id;
  useEffect(() => {
    if (venueId) visitVenue(venueId);
  }, [venueId, visitVenue]);

  if (!venue) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-2xl">We couldn't find this menu</h1>
        <p className="text-muted-foreground">The link may be mistyped.</p>
        <Link to="/" className="font-semibold text-primary underline">
          Browse menus
        </Link>
      </main>
    );
  }
  const menu = live[Math.min(menuIdx, live.length - 1)];
  const currency = venue.currency;

  return (
    <main className="mx-auto min-h-screen max-w-lg pb-44">
      {isPreviewMode && previewMenu && (
        <aside
          role="status"
          aria-label="Menu preview mode"
          className="sticky top-0 z-50 flex items-center justify-between gap-2 bg-amber-500 px-4 py-2.5 text-xs font-semibold text-amber-950 shadow-md"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Eye className="h-4 w-4 shrink-0" />
            <span className="truncate">
              Merchant Preview ({previewMenu.status.toUpperCase()}): “{previewMenu.name}” ·{" "}
              {venue.name} ({role.toUpperCase()})
            </span>
          </div>
          <Link
            to="/admin/menus/$menuId"
            params={{ menuId: previewMenu.id }}
            className="shrink-0 rounded bg-amber-950 px-2.5 py-1 text-[11px] font-bold text-amber-50 hover:bg-black transition-colors"
          >
            Back to editor
          </Link>
        </aside>
      )}
      {isPreviewDenied && (
        <aside
          role="status"
          aria-label="Preview access denied"
          className="bg-muted border-b px-4 py-2 text-xs text-muted-foreground flex items-center justify-between"
        >
          <span>
            Preview link unavailable: requires merchant authorisation and venue assignment for{" "}
            {venue.name}.
          </span>
          <span className="font-medium text-foreground">Showing public menu</span>
        </aside>
      )}
      <header className="bg-primary px-4 pb-6 pt-16 text-primary-foreground">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground font-display text-3xl text-primary">
          {venue.name[0]}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="flex-1 text-3xl">{venue.name}</h1>
          <Button
            variant="secondary"
            size="icon"
            aria-label={`${favourites.includes(venue.id) ? "Unsave" : "Save"} ${venue.name}`}
            aria-pressed={favourites.includes(venue.id)}
            onClick={() => toggleFavourite(venue.id)}
          >
            <Heart className={favourites.includes(venue.id) ? "fill-current" : ""} />
          </Button>
        </div>
        {venue.tagline && <p className="opacity-80">{venue.tagline}</p>}
        <p className="mt-2 flex items-center gap-1 text-sm opacity-80">
          <MapPin className="h-4 w-4" />{" "}
          {venue.deliveryOnly ? `Delivers to ${venue.serviceArea}` : venue.address}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {venue.services.map((s) => (
            <span
              key={s}
              className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium"
            >
              {s}
            </span>
          ))}
        </div>
      </header>
      <div className="flex items-center justify-between gap-2 px-4 py-3 text-xs">
        <Link to="/" className="text-primary underline">
          ← Discover menus
        </Link>
        <Link to="/orders" className="text-primary underline">
          My requests
        </Link>
      </div>
      {!canAdmitOrder(orderPolicy) && (
        <p className="border-y px-4 py-3 text-sm text-muted-foreground">
          Manual contact only · Structured requests are paused. This menu remains available.
        </p>
      )}

      {!menu ? (
        <p className="p-6 text-center text-muted-foreground">
          This business hasn't published a menu yet. You can still contact them directly.
        </p>
      ) : (
        <>
          {live.length > 1 && (
            <div className="flex gap-2 px-4 pt-4">
              {live.map((m, i) => (
                <Button
                  variant="outline"
                  key={m.id}
                  onClick={() => setMenuIdx(i)}
                  className={cn(
                    "min-h-10 rounded-full border px-4 text-sm font-medium",
                    i === menuIdx && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {m.isProtected && <Lock className="mr-1 h-3.5 w-3.5" />}
                  {m.name}
                </Button>
              ))}
            </div>
          )}

          {menu.isProtected && !(guestSession?.verified && guestSession.venueId === venue.id) ? (
            <div className="mx-4 my-6 rounded-2xl border-2 border-primary/20 bg-card p-6 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Lock className="h-7 w-7" />
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold">In-Room Dining Access</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This menu is reserved for registered guests of <b>{venue.name}</b>. Enter your room
                number and last name to unlock in-room service.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!roomInput.trim() || !nameInput.trim()) {
                    toast.error("Enter your room number and last name.");
                    return;
                  }
                  const ok = verifyGuestSession(venue.id, roomInput, nameInput);
                  if (ok) {
                    toast.success(`Welcome, Room ${roomInput.trim()}! In-room dining unlocked.`);
                    setRoomInput("");
                    setNameInput("");
                  } else {
                    toast.error("Guest verification failed. Please check your room details.");
                  }
                }}
                className="mt-5 space-y-3 text-left"
              >
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Room Number</label>
                  <Input
                    placeholder="e.g. 402"
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    className="mt-1 h-11"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Guest Last Name / PIN
                  </label>
                  <Input
                    placeholder="e.g. Smith (or PIN 1234)"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="mt-1 h-11"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Demo credentials: Room <b>402</b>, Last name <b>Smith</b>
                </p>
                <Button type="submit" className="h-11 w-full font-semibold">
                  <KeyRound className="mr-2 h-4 w-4" /> Unlock Room Service Menu
                </Button>
              </form>
              <div className="mt-4 border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setContact(true)}
                  className="text-xs text-muted-foreground"
                >
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Need assistance? Contact Front
                  Desk
                </Button>
              </div>
            </div>
          ) : (
            <>
              {menu.isProtected && guestSession?.verified && guestSession.venueId === venue.id && (
                <div className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      ✓
                    </span>
                    <div>
                      <p className="font-semibold text-primary">
                        In-House Guest: Room {guestSession.roomNumber} ({guestSession.lastName})
                      </p>
                      <p className="text-muted-foreground">In-room dining enabled</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      clearGuestSession();
                      toast.info("Room session ended.");
                    }}
                    className="h-7 text-xs"
                  >
                    Leave room
                  </Button>
                </div>
              )}

              <nav className="no-scrollbar sticky top-0 z-30 flex gap-2 overflow-x-auto border-b bg-background/95 px-4 py-3 backdrop-blur">
                {menu.sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="flex min-h-10 shrink-0 items-center rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground"
                  >
                    {s.name}
                  </a>
                ))}
              </nav>
              {menu.sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-16 px-4 pt-6">
                  <h2 className="mb-3 text-2xl">{s.name}</h2>
                  <ul className="space-y-2">
                    {s.offerings.map((o) => (
                      <li key={o.id}>
                        <Button
                          variant="outline"
                          onClick={() => setDetail(o)}
                          className={cn(
                            "h-auto w-full justify-start whitespace-normal rounded-lg bg-card p-3 text-left",
                            !o.available && "opacity-60",
                          )}
                        >
                          {o.image ? (
                            <img
                              src={o.image}
                              alt={o.name}
                              className="h-16 w-16 shrink-0 rounded-xl object-cover border"
                            />
                          ) : (
                            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-3xl">
                              {o.emoji}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="font-semibold">{o.name}</span>
                              <span className="shrink-0 font-semibold">
                                {formatPrice(o.price, currency)}
                              </span>
                            </span>
                            <span className="line-clamp-2 text-sm text-muted-foreground">
                              {o.description}
                            </span>
                            <span className="mt-1 flex flex-wrap gap-1">
                              {o.specialBadge && (
                                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-bold text-accent">
                                  ★ {o.specialBadge}
                                </span>
                              )}
                              {!o.available && (
                                <span className="rounded-full bg-status-soldout/15 px-2 py-0.5 text-[11px] font-semibold text-status-soldout">
                                  Sold out today
                                </span>
                              )}
                              {o.tags.map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
                                >
                                  {t}
                                </span>
                              ))}
                            </span>
                          </span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
        </>
      )}

      <div className="space-y-2 px-4 pt-10 text-center text-xs text-muted-foreground">
        <p className="italic">{PEWA_TAG_DISCLAIMER}</p>
        <p>
          Prices and dishes are set by {venue.name}. Menu powered by{" "}
          <Link to="/" className="underline">
            PEWA
          </Link>
          .
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-4 pb-safe">
        {cart?.lines.length ? (
          <Button className="mb-2 h-12 w-full" onClick={() => setCartOpen(true)}>
            <ShoppingBag />
            View cart · {cart.lines.reduce((sum, l) => sum + l.quantity, 0)} items ·{" "}
            {formatPrice(
              cartTotal(cart.lines),
              venues.find((v) => v.id === cart.venueId)?.currency ?? currency,
            )}
          </Button>
        ) : null}
        <Button
          onClick={() => setContact(true)}
          className="h-12 w-full rounded-full bg-accent text-base font-semibold text-accent-foreground"
        >
          <MessageCircle className="h-5 w-5" /> Contact business
        </Button>
      </div>

      <ContactDrawer venue={venue} open={contact} onOpenChange={setContact} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

      <Drawer open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DrawerContent className="mx-auto max-w-lg">
          {detail && (
            <>
              <DrawerHeader className="text-left">
                {detail.image ? (
                  <div className="relative mb-3 overflow-hidden rounded-2xl border">
                    <img
                      src={detail.image}
                      alt={detail.name}
                      className="h-44 w-full object-cover"
                    />
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                      {getImageSource(detail) === "library"
                        ? "Representative photo"
                        : "Merchant photo"}
                    </span>
                  </div>
                ) : (
                  <div className="mb-2 text-5xl">{detail.emoji}</div>
                )}
                <DrawerTitle className="font-display text-2xl">{detail.name}</DrawerTitle>
                <DrawerDescription>{detail.description}</DrawerDescription>
                {detail.tags && detail.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {detail.tags.map((t) => (
                      <span
                        key={t}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          isDietaryClaimTag(t)
                            ? "border border-primary/30 bg-primary/10 text-primary"
                            : "bg-secondary text-secondary-foreground",
                        )}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {detail.tags && detail.tags.some(isDietaryClaimTag) && (
                  <p className="mt-2 rounded-md bg-muted/60 p-2 text-[11px] text-muted-foreground leading-snug">
                    ℹ {PEWA_TAG_DISCLAIMER}
                  </p>
                )}
                <p className="pt-1 text-lg font-semibold">{formatPrice(detail.price, currency)}</p>
                {!detail.available && (
                  <p className="text-sm font-semibold text-status-soldout">
                    Not available right now
                  </p>
                )}
              </DrawerHeader>
              <div className="space-y-4 overflow-y-auto px-4 pb-safe">
                {menu && (
                  <OfferingOrderForm
                    key={detail.id}
                    offering={detail}
                    venue={venue}
                    menuId={menu.id}
                    isPreview={isPreviewMode || menu.status !== "published"}
                    onAdded={() => setDetail(null)}
                    onOpenContact={() => setContact(true)}
                  />
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDetail(null);
                    setContact(true);
                  }}
                  className="h-12 w-full"
                >
                  <MessageCircle className="h-4 w-4" /> Ask about this item
                </Button>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </main>
  );
}
