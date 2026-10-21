import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActivityEvent,
  Menu,
  MenuPublishedSnapshot,
  MenuStatus,
  Offering,
  OfferingSchedule,
  PewaState,
  Role,
  ScenarioId,
  Section,
  CartLine,
  OrderRequest,
  PromotionCampaign,
  GuestSession,
  OrgStatus,
  SharedOffering,
  UsageDisputeCase,
  ModerationCase,
  VenueOfferingOverride,
} from "./types";
import { buildScenario } from "./fixtures";
import { getVenuePublishedMenus } from "./taxonomy";
import {
  canAdmitOrder,
  cartTotal,
  validateCart,
  validateModifierGroupConfig,
  validateOfferingModifiersConfig,
  validateModifierSelection,
  validateAndRecalculateLineModifiers,
} from "./ordering";
import {
  getEffectiveOffering,
  getEffectiveOfferingAvailability,
  isOfferingHiddenAtVenue,
} from "./availability";

export {
  canAdmitOrder,
  cartTotal,
  validateCart,
  validateModifierGroupConfig,
  validateOfferingModifiersConfig,
  validateModifierSelection,
  validateAndRecalculateLineModifiers,
  getEffectiveOffering,
  getEffectiveOfferingAvailability,
  isOfferingHiddenAtVenue,
};

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "business";

type Actions = {
  setRole: (r: Role) => void;
  loadScenario: (id: ScenarioId) => void;
  reset: () => void;
  completeOnboarding: (input: {
    orgName: string;
    businessType: string;
    category?: string;
    venueName: string;
    address: string;
    deliveryOnly: boolean;
    currency: string;
    services: string[];
    phone: string;
    whatsapp: string;
    email: string;
    menuName: string;
  }) => string;
  addSection: (menuId: string, name: string, categoryTag?: string) => void;
  addSectionsBatch: (menuId: string, names: string[]) => void;
  renameSection: (menuId: string, sectionId: string, name: string) => void;
  removeSection: (menuId: string, sectionId: string) => void;
  moveSection: (menuId: string, sectionId: string, dir: -1 | 1) => void;
  reorderSections: (menuId: string, sectionIds: string[]) => void;
  moveOfferingBetweenSections: (
    menuId: string,
    fromSectionId: string,
    toSectionId: string,
    offeringId: string,
  ) => void;
  upsertOffering: (
    menuId: string,
    sectionId: string,
    o: Omit<Offering, "id"> & { id?: string },
  ) => void;
  duplicateOffering: (menuId: string, sectionId: string, offeringId: string) => string;
  moveOfferingWithinSection: (
    menuId: string,
    sectionId: string,
    offeringId: string,
    dir: -1 | 1,
  ) => void;
  removeOffering: (menuId: string, sectionId: string, offeringId: string) => void;
  toggleAvailability: (menuId: string, sectionId: string, offeringId: string) => void;
  setOfferingSchedule: (
    menuId: string,
    sectionId: string,
    offeringId: string,
    schedule?: OfferingSchedule,
  ) => void;
  setOfferingVenueOverride: (
    menuId: string,
    sectionId: string,
    offeringId: string,
    venueId: string,
    override: Partial<VenueOfferingOverride>,
  ) => void;
  removeOfferingVenueOverride: (
    menuId: string,
    sectionId: string,
    offeringId: string,
    venueId: string,
  ) => void;
  toggleOfferingVenueAvailability: (
    menuId: string,
    sectionId: string,
    offeringId: string,
    venueId: string,
  ) => void;
  setSimulatedTime: (time?: string) => void;
  upsertSharedOffering: (sharedOffering: SharedOffering) => void;
  deleteSharedOffering: (sharedOfferingId: string) => void;
  addSharedOfferingToMenu: (menuId: string, sectionId: string, sharedOfferingId: string) => string;
  setMenuStatus: (menuId: string, status: MenuStatus) => void;
  publishMenu: (menuId: string) => boolean;
  unpublishMenu: (menuId: string) => void;
  hideMenu: (menuId: string) => void;
  archiveMenu: (menuId: string) => void;
  discardDraftChanges: (menuId: string) => void;
  addMenu: (
    nameOrInput:
      | string
      | {
          name: string;
          venueId?: string | undefined;
          venueIds?: string[] | undefined;
          description?: string | undefined;
          isProtected?: boolean | undefined;
          coverImage?: string | undefined;
          initialSections?: string[] | undefined;
        },
    venueId?: string | undefined,
  ) => string;
  updateMenuMeta: (
    menuId: string,
    updates: {
      name?: string | undefined;
      description?: string | null | undefined;
      venueId?: string | null | undefined;
      venueIds?: string[] | undefined;
      isProtected?: boolean | undefined;
      coverImage?: string | null | undefined;
    },
  ) => void;
  deleteMenu: (menuId: string) => {
    success: boolean;
    action: "deleted" | "archived";
    message: string;
  };
  duplicateMenu: (menuId: string) => string;
  log: (e: Omit<ActivityEvent, "id" | "at" | "role">) => void;
  visitVenue: (id: string) => void;
  toggleFavourite: (id: string) => void;
  addCartLine: (venueId: string, line: Omit<CartLine, "id">) => string | null;
  updateCartQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  submitOrder: (input: Pick<OrderRequest, "guestName" | "guestContact" | "service" | "note">) => {
    id?: string;
    error?: string;
  };
  acceptOrder: (id: string) => boolean;
  declineOrder: (id: string, reason: string) => boolean;
  markOrderReady: (id: string) => boolean;
  withdrawOrder: (id: string) => boolean;
  addTopUpUnits: (count: number) => void;
  renewBillingCycle: () => void;
  setSubscriptionExpired: (expired: boolean) => void;
  verifyGuestSession: (venueId: string, roomNumber: string, lastName: string) => boolean;
  clearGuestSession: () => void;
  createCampaign: (
    campaign: Omit<PromotionCampaign, "id" | "spent" | "impressions" | "clicks">,
  ) => string;
  toggleCampaign: (id: string) => void;
  recordPromotionImpression: (campaignId: string) => void;
  recordPromotionClick: (campaignId: string) => void;
  setOrganisationStatus: (orgId: string, status: OrgStatus, note?: string) => void;
  resolveDisputeCase: (
    caseId: string,
    resolution: "resolved" | "dismissed",
    adjustmentUnits: number,
    note: string,
  ) => void;
  resolveModerationCase: (caseId: string, actionTaken: string) => void;
  setSimulatedOffline: (offline: boolean) => void;
};

const now = () => new Date().toISOString();

export {
  getLiveMenu,
  getVenuePublishedMenus,
  IMAGE_LIBRARY_CATEGORIES,
  searchImageLibrary,
  cropAndCompressImage,
} from "./taxonomy";

/**
 * Checks whether a published menu has pending draft changes that differ from its live snapshot.
 * Availability changes (sold out) take effect immediately and do not count as draft changes.
 */
export function hasUnpublishedDraftChanges(menu: Menu): boolean {
  if (menu.status !== "published" || !menu.publishedSnapshot) return false;
  const snap = menu.publishedSnapshot;

  if (menu.name !== snap.name) return true;
  if ((menu.description || "") !== (snap.description || "")) return true;
  if ((menu.coverImage || "") !== (snap.coverImage || "")) return true;
  if (Boolean(menu.isProtected) !== Boolean(snap.isProtected)) return true;
  if ((menu.venueId || "") !== (snap.venueId || "")) return true;

  const draftVenues = (menu.venueIds || []).slice().sort().join(",");
  const snapVenues = (snap.venueIds || []).slice().sort().join(",");
  if (draftVenues !== snapVenues) return true;

  const normSec = (sections: Section[]) =>
    sections.map((s) => ({
      name: s.name,
      offerings: s.offerings.map((o) => ({
        name: o.name,
        description: o.description,
        price: o.price,
        emoji: o.emoji,
        image: o.image,
        tags: (o.tags || []).slice().sort(),
        modifiers: o.modifiers,
        specialBadge: o.specialBadge,
        schedule: o.schedule,
        venueOverrides: o.venueOverrides,
        sharedOfferingId: o.sharedOfferingId,
      })),
    }));

  return JSON.stringify(normSec(menu.sections)) !== JSON.stringify(normSec(snap.sections));
}

const ensurePublishedSnapshots = (menus: Menu[]): Menu[] =>
  menus.map((m) => {
    if (m.status === "published" && !m.publishedSnapshot) {
      return {
        ...m,
        publishedSnapshot: {
          name: m.name,
          description: m.description,
          coverImage: m.coverImage,
          venueId: m.venueId,
          venueIds: m.venueIds ? [...m.venueIds] : undefined,
          isProtected: m.isProtected,
          sections: JSON.parse(JSON.stringify(m.sections)),
          publishedAt: m.publishedAt || now(),
        },
      };
    }
    return m;
  });

export const usePewa = create<PewaState & Actions>()(
  persist(
    (set, get) => {
      const mutateMenu = (menuId: string, fn: (sections: Section[]) => Section[]) =>
        set((s) => ({
          menus: s.menus.map((m) =>
            m.id === menuId ? { ...m, sections: fn(m.sections), updatedAt: now() } : m,
          ),
        }));
      const initialSeed = buildScenario("new-cafe");
      return {
        ...initialSeed,
        menus: ensurePublishedSnapshots(initialSeed.menus),
        visitVenue: (id) =>
          set((s) => ({ recents: [id, ...s.recents.filter((v) => v !== id)].slice(0, 12) })),
        toggleFavourite: (id) =>
          set((s) => ({
            favourites: s.favourites.includes(id)
              ? s.favourites.filter((v) => v !== id)
              : [...s.favourites, id],
          })),
        clearCart: () => set({ cart: null }),
        addCartLine: (venueId, line) => {
          const s = get();
          const targetMenu = s.menus.find((m) => m.id === line.menuId);
          if (targetMenu && targetMenu.status !== "published") {
            return "Cannot add items from an unpublished draft or archived menu.";
          }
          if (!canAdmitOrder(s.orderPolicy))
            return "Structured requests are paused. Please contact the business directly.";
          if (s.cart?.lines.length && s.cart.venueId !== venueId)
            return "Your cart belongs to another business. Clear it before starting a new cart.";

          const venue = s.venues.find((v) => v.id === venueId);
          if (!venue) return "This venue is no longer available.";

          const venuePublishedMenus = getVenuePublishedMenus(venue, s.menus, s.venues, {
            includeProtected: true,
          });
          const publishedMenu = venuePublishedMenus.find((m) => m.id === line.menuId);
          if (!publishedMenu) {
            return "Cannot add items from an unpublished draft or archived menu.";
          }
          const rawOffering = publishedMenu.sections
            .flatMap((sec) => sec.offerings)
            .find((o) => o.id === line.offeringId);
          if (!rawOffering) {
            return "This offering is not found on the published menu.";
          }
          if (isOfferingHiddenAtVenue(rawOffering, venueId)) {
            return `${rawOffering.name} is not available at this service location.`;
          }
          const availability = getEffectiveOfferingAvailability(rawOffering, venueId, {
            simulatedTime: s.simulatedTime,
            sharedOfferings: s.sharedOfferings,
          });
          if (!availability.available) {
            return availability.reason === "sold_out_manual"
              ? `${rawOffering.name} is currently sold out.`
              : `${rawOffering.name} is currently outside scheduled hours (${availability.scheduleDetails || "Scheduled hours"}).`;
          }

          const effectiveOffering = getEffectiveOffering(rawOffering, venueId, s.sharedOfferings);
          const optionsList = line.options || [];
          const modCheck = validateAndRecalculateLineModifiers(effectiveOffering, optionsList);
          if (!modCheck.valid) {
            return modCheck.error || "Invalid option selection.";
          }

          const authoritativeLine: CartLine = {
            ...line,
            id: uid("line"),
            name: line.name || rawOffering.name,
            emoji: line.emoji || rawOffering.emoji || "🍽️",
            basePrice: effectiveOffering.price,
            options: modCheck.authoritativeOptions || optionsList,
            note: line.note || "",
          };

          const cart = { venueId, lines: [...(s.cart?.lines ?? []), authoritativeLine] };
          const error = validateCart(s, cart);
          if (error) return error;
          set({ cart });
          return null;
        },
        updateCartQuantity: (id, quantity) =>
          set((s) => ({
            cart: s.cart
              ? {
                  ...s.cart,
                  lines: s.cart.lines.flatMap((l) =>
                    l.id !== id
                      ? [l]
                      : quantity <= 0
                        ? []
                        : [{ ...l, quantity: Math.min(99, Math.floor(quantity)) }],
                  ),
                }
              : null,
          })),
        submitOrder: (input) => {
          const s = get();
          const error = validateCart(s, s.cart);
          if (error) return { error };
          if (!canAdmitOrder(s.orderPolicy))
            return { error: "Structured requests are paused. Contact the business directly." };
          if (!input.guestName.trim() || !input.guestContact.trim())
            return { error: "Add your name and phone number." };
          const venue = s.venues.find((v) => v.id === s.cart?.venueId);
          if (!venue || !s.cart) return { error: "This venue is no longer available." };
          if (!venue.services.includes(input.service))
            return { error: "Choose a service offered by this business." };

          const venuePublishedMenus = getVenuePublishedMenus(venue, s.menus, s.venues, {
            includeProtected: true,
          });

          // Authoritatively recalculate lines and prices from the effective published snapshot
          const authoritativeLines: CartLine[] = s.cart.lines.map((line) => {
            const menu = venuePublishedMenus.find((m) => m.id === line.menuId);
            const rawOffering = menu?.sections
              .flatMap((sec) => sec.offerings)
              .find((o) => o.id === line.offeringId);
            if (!rawOffering) {
              return structuredClone(line);
            }
            const offering = getEffectiveOffering(rawOffering, venue.id, s.sharedOfferings);
            const modCheck = validateAndRecalculateLineModifiers(offering, line.options);
            return {
              ...line,
              basePrice: offering.price,
              options: modCheck.authoritativeOptions || line.options,
            };
          });

          const id = uid("order");
          const sequence = s.orderSequence + 1;
          const order: OrderRequest = {
            ...input,
            guestName: input.guestName.trim(),
            guestContact: input.guestContact.trim(),
            id,
            reference: `PEWA-${String(sequence).padStart(4, "0")}`,
            venueId: venue.id,
            orgId: venue.orgId,
            venueName: venue.name,
            currency: venue.currency,
            lines: authoritativeLines,
            total: cartTotal(authoritativeLines),
            status: "pending",
            submittedAt: now(),
            unitConsumed: false,
          };
          set({ orders: [order, ...s.orders], cart: null, orderSequence: sequence });
          get().log({
            kind: "order.submitted",
            message: `${order.reference} submitted — awaiting business acceptance; no unit consumed`,
          });
          return { id };
        },
        acceptOrder: (id) => {
          const s = get();
          const order = s.orders.find((o) => o.id === id);
          if (
            !order ||
            order.status !== "pending" ||
            !canManageOrders(s.role) ||
            order.orgId !== s.organisation?.id
          )
            return false;
          const policy = { ...s.orderPolicy };
          if (policy.included > 0 && !policy.expired) policy.included -= 1;
          else if (policy.topUp > 0) policy.topUp -= 1;
          else if (policy.overdraftUsed < 10) policy.overdraftUsed += 1;
          else return false;
          set({
            orderPolicy: policy,
            orders: s.orders.map((o) =>
              o.id === id ? { ...o, status: "accepted", acceptedAt: now(), unitConsumed: true } : o,
            ),
          });
          get().log({
            kind: "order.accepted",
            message: `${order.reference} accepted — exactly 1 unit consumed`,
          });
          return true;
        },
        declineOrder: (id, reason) => {
          const s = get();
          const order = s.orders.find((o) => o.id === id);
          if (
            !order ||
            order.status !== "pending" ||
            !canManageOrders(s.role) ||
            order.orgId !== s.organisation?.id ||
            !reason.trim()
          )
            return false;
          set({
            orders: s.orders.map((o) =>
              o.id === id
                ? { ...o, status: "declined", declineReason: reason, resolvedAt: now() }
                : o,
            ),
          });
          get().log({
            kind: "order.declined",
            message: `${order.reference} declined — no unit consumed`,
          });
          return true;
        },
        markOrderReady: (id) => {
          const s = get();
          const order = s.orders.find((o) => o.id === id);
          if (
            !order ||
            order.status !== "accepted" ||
            !canManageOrders(s.role) ||
            order.orgId !== s.organisation?.id
          )
            return false;
          set({
            orders: s.orders.map((o) =>
              o.id === id ? { ...o, status: "ready", resolvedAt: now() } : o,
            ),
          });
          get().log({
            kind: "order.ready",
            message: `${order.reference} marked ready — no additional unit consumed`,
          });
          return true;
        },
        withdrawOrder: (id) => {
          const s = get();
          const order = s.orders.find((o) => o.id === id);
          if (!order || order.status !== "pending") return false;
          set({
            orders: s.orders.map((o) =>
              o.id === id ? { ...o, status: "withdrawn", resolvedAt: now() } : o,
            ),
          });
          get().log({
            kind: "order.withdrawn",
            message: `${order.reference} withdrawn before acceptance — no unit consumed`,
          });
          return true;
        },
        addTopUpUnits: (count) => {
          const s = get();
          const policy = {
            ...s.orderPolicy,
            topUp: Math.max(0, s.orderPolicy.topUp + count),
          };
          set({ orderPolicy: policy });
          get().log({
            kind: "billing.topup",
            message: `Purchased +${count} order acceptance units (top-up balance: ${policy.topUp})`,
          });
        },
        renewBillingCycle: () => {
          const s = get();
          const renewDate = new Date();
          renewDate.setDate(renewDate.getDate() + 30);
          const policy = {
            ...s.orderPolicy,
            included: 200,
            overdraftUsed: 0,
            expired: false,
            cycleRenewsAt: renewDate.toISOString(),
          };
          set({ orderPolicy: policy });
          get().log({
            kind: "billing.renewed",
            message:
              "Subscription period renewed — 200 included acceptance units refreshed; top-up units carried forward",
          });
        },
        setSubscriptionExpired: (expired) => {
          const s = get();
          set({
            orderPolicy: { ...s.orderPolicy, expired },
          });
          get().log({
            kind: "billing.status",
            message: expired
              ? "Subscription marked expired beyond grace — new structured orders paused"
              : "Subscription reactivated",
          });
        },
        verifyGuestSession: (venueId, roomNumber, lastName) => {
          const cleanRoom = roomNumber.trim();
          const cleanName = lastName.trim().toLowerCase();
          // Demo valid credentials: Room 402 + Smith or PIN 1234, or any 2+ chars
          const isValid =
            (cleanRoom === "402" && (cleanName === "smith" || cleanName === "1234")) ||
            (cleanRoom.length >= 2 && cleanName.length >= 2);
          if (!isValid) return false;
          set({
            guestSession: {
              venueId,
              roomNumber: cleanRoom,
              lastName: lastName.trim(),
              verified: true,
            },
          });
          get().log({
            kind: "guest.verified",
            message: `Guest verified for Room ${cleanRoom} (${lastName.trim()})`,
          });
          return true;
        },
        clearGuestSession: () => {
          set({ guestSession: null });
        },
        createCampaign: (input) => {
          const id = uid("camp");
          const campaign = {
            ...input,
            id,
            spent: 0,
            impressions: 0,
            clicks: 0,
          };
          set((s) => ({ campaigns: [campaign, ...s.campaigns] }));
          get().log({
            kind: "promo.created",
            message: `Campaign “${input.title}” launched with budget $${input.budget}`,
          });
          return id;
        },
        toggleCampaign: (id) => {
          let title = "";
          let active = false;
          set((s) => ({
            campaigns: s.campaigns.map((c) => {
              if (c.id !== id) return c;
              title = c.title;
              active = !c.active;
              return { ...c, active };
            }),
          }));
          get().log({
            kind: "promo.toggled",
            message: `Campaign “${title}” ${active ? "activated" : "paused"}`,
          });
        },
        recordPromotionImpression: (campaignId) => {
          set((s) => ({
            campaigns: s.campaigns.map((c) =>
              c.id === campaignId
                ? {
                    ...c,
                    impressions: c.impressions + 1,
                    spent: Math.min(c.budget, +(c.spent + 0.1).toFixed(2)),
                  }
                : c,
            ),
          }));
        },
        recordPromotionClick: (campaignId) => {
          set((s) => ({
            campaigns: s.campaigns.map((c) =>
              c.id === campaignId
                ? {
                    ...c,
                    clicks: c.clicks + 1,
                    spent: Math.min(c.budget, +(c.spent + 0.25).toFixed(2)),
                  }
                : c,
            ),
          }));
          get().log({
            kind: "promo.clicked",
            message: `Sponsored offer clicked (campaign: ${campaignId})`,
          });
        },
        setRole: (role) => {
          set({ role });
          get().log({ kind: "role.switched", message: `Role switched to ${role}` });
        },
        loadScenario: (id) => {
          const sc = buildScenario(id);
          set({ ...sc, menus: ensurePublishedSnapshots(sc.menus), role: get().role });
        },
        reset: () => {
          const sc = buildScenario(get().scenario);
          set({ ...sc, menus: ensurePublishedSnapshots(sc.menus), role: get().role });
        },
        log: (e) =>
          set((s) => ({
            activity: [{ ...e, id: uid("evt"), at: now(), role: s.role }, ...s.activity].slice(
              0,
              200,
            ),
          })),
        completeOnboarding: (i) => {
          const orgId = uid("org");
          const venueId = uid("venue");
          const menuId = uid("menu");
          let slug = slugify(i.venueName || i.orgName);
          if (get().venues.some((v) => v.slug === slug))
            slug = `${slug}-${get().venues.length + 1}`;
          set((s) => ({
            organisation: {
              id: orgId,
              name: i.orgName,
              businessType: i.businessType,
              category: i.category || i.businessType,
              currency: i.currency,
            },
            venues: [
              {
                id: venueId,
                orgId,
                name: i.venueName,
                slug,
                category: i.category || i.businessType,
                address: i.deliveryOnly ? "" : i.address,
                deliveryOnly: i.deliveryOnly,
                serviceArea: i.deliveryOnly ? i.address : "",
                services: i.services,
                contact: { phone: i.phone, whatsapp: i.whatsapp, email: i.email },
                tagline: "",
                currency: i.currency,
              },
              ...s.venues.filter((v) => v.orgId !== s.organisation?.id),
            ],
            menus: [
              {
                id: menuId,
                orgId,
                venueId,
                name: i.menuName,
                status: "draft",
                sections: [],
                updatedAt: now(),
              },
              ...s.menus.filter((m) => m.orgId !== s.organisation?.id),
            ],
            role: "owner",
          }));
          get().log({ kind: "org.created", message: `Organisation “${i.orgName}” created` });
          get().log({ kind: "menu.created", message: `Draft menu “${i.menuName}” created` });
          return menuId;
        },
        addMenu: (nameOrInput, venueId) => {
          const org = get().organisation;
          const id = uid("menu");
          const orgId = org?.id ?? get().venues[0]?.orgId ?? "org_default";

          if (typeof nameOrInput === "string") {
            const targetVenueId =
              venueId ||
              (org ? get().venues.find((v) => v.orgId === org.id)?.id : get().venues[0]?.id);
            set((s) => ({
              menus: [
                ...s.menus,
                {
                  id,
                  orgId,
                  venueId: targetVenueId,
                  name: nameOrInput,
                  status: "draft",
                  sections: [],
                  updatedAt: now(),
                },
              ],
            }));
            get().log({ kind: "menu.created", message: `Draft menu “${nameOrInput}” created` });
            return id;
          }

          const {
            name,
            venueId: inputVenueId,
            venueIds,
            description,
            isProtected = false,
            coverImage,
            initialSections = [],
          } = nameOrInput;

          const targetVenueId = inputVenueId || (venueIds?.length === 1 ? venueIds[0] : undefined);
          const targetVenueIds = venueIds && venueIds.length > 0 ? venueIds : undefined;

          const sections: Section[] = initialSections.map((secName) => ({
            id: uid("sec"),
            name: secName,
            offerings: [],
          }));

          set((s) => ({
            menus: [
              ...s.menus,
              {
                id,
                orgId,
                venueId: targetVenueId,
                venueIds: targetVenueIds,
                name,
                description,
                coverImage,
                isProtected,
                status: "draft",
                sections,
                updatedAt: now(),
              },
            ],
          }));
          get().log({ kind: "menu.created", message: `Draft menu “${name}” created` });
          return id;
        },
        updateMenuMeta: (menuId, updates) => {
          const m = get().menus.find((x) => x.id === menuId);
          if (!m) return;
          set((s) => ({
            menus: s.menus.map((x) => {
              if (x.id !== menuId) return x;
              const next: Menu = {
                ...x,
                ...(updates.name !== undefined && { name: updates.name }),
                ...(updates.description !== undefined && {
                  description: updates.description || undefined,
                }),
                ...(updates.isProtected !== undefined && { isProtected: updates.isProtected }),
                ...(updates.coverImage !== undefined && {
                  coverImage: updates.coverImage || undefined,
                }),
                ...(updates.venueIds !== undefined && {
                  venueIds:
                    updates.venueIds && updates.venueIds.length > 0 ? updates.venueIds : undefined,
                }),
                ...(updates.venueId !== undefined && {
                  venueId: updates.venueId || undefined,
                }),
                updatedAt: now(),
              };
              return next;
            }),
          }));
          get().log({
            kind: "menu.updated",
            message: `Updated menu settings for “${updates.name || m.name}”`,
          });
        },
        deleteMenu: (menuId) => {
          const s = get();
          const m = s.menus.find((x) => x.id === menuId);
          if (!m) return { success: false, action: "deleted", message: "Menu not found" };

          const wasPublished = m.status === "published" || !!m.publishedAt || !!m.publishedSnapshot;
          const menuOfferingIds = new Set(
            m.sections.flatMap((sec) => sec.offerings.map((o) => o.id)),
          );
          const hasOrders = s.orders.some((o) =>
            o.lines.some((l) => menuOfferingIds.has(l.offeringId)),
          );

          if (wasPublished || hasOrders) {
            // Cannot hard-delete historically meaningful menu content; archive it safely
            set((state) => ({
              menus: state.menus.map((x) =>
                x.id === menuId ? { ...x, status: "archived" as MenuStatus, updatedAt: now() } : x,
              ),
            }));
            const message = `Menu “${m.name}” has publication or order records. Archived safely to preserve historical audit trail.`;
            get().log({ kind: "menu.archived", message });
            return { success: true, action: "archived", message };
          }

          // Safe to hard-delete uncommitted / unused draft
          set((state) => ({
            menus: state.menus.filter((x) => x.id !== menuId),
          }));
          const message = `Draft menu “${m.name}” discarded`;
          get().log({ kind: "menu.deleted", message });
          return { success: true, action: "deleted", message };
        },
        duplicateMenu: (menuId) => {
          const source = get().menus.find((x) => x.id === menuId);
          if (!source) return "";
          const newId = uid("menu");
          const duplicated: Menu = {
            ...source,
            id: newId,
            name: `${source.name} (Copy)`,
            status: "draft",
            updatedAt: now(),
            publishedAt: undefined,
            publishedSnapshot: undefined,
            sections: source.sections.map((sec) => ({
              ...sec,
              id: uid("sec"),
              offerings: sec.offerings.map((off) => ({
                ...off,
                id: uid("off"),
              })),
            })),
          };
          set((s) => ({
            menus: [...s.menus, duplicated],
          }));
          get().log({ kind: "menu.duplicated", message: `Duplicated “${source.name}” as draft` });
          return newId;
        },
        addSection: (menuId, name, categoryTag) => {
          mutateMenu(menuId, (ss) => [...ss, { id: uid("sec"), name, categoryTag, offerings: [] }]);
          get().log({ kind: "section.created", message: `Section “${name}” added` });
        },
        addSectionsBatch: (menuId, names) => {
          const cleanNames = names.map((n) => n.trim()).filter(Boolean);
          if (cleanNames.length === 0) return;
          mutateMenu(menuId, (ss) => {
            const existing = new Set(ss.map((s) => s.name.trim().toLowerCase()));
            const toAdd = cleanNames
              .filter((n) => !existing.has(n.toLowerCase()))
              .map((name) => ({ id: uid("sec"), name, offerings: [] }));
            return [...ss, ...toAdd];
          });
          get().log({
            kind: "section.created",
            message: `Added ${cleanNames.length} sections to menu`,
          });
        },
        renameSection: (menuId, sectionId, name) =>
          mutateMenu(menuId, (ss) => ss.map((x) => (x.id === sectionId ? { ...x, name } : x))),
        removeSection: (menuId, sectionId) =>
          mutateMenu(menuId, (ss) => ss.filter((x) => x.id !== sectionId)),
        moveSection: (menuId, sectionId, dir) =>
          mutateMenu(menuId, (ss) => {
            const i = ss.findIndex((x) => x.id === sectionId);
            const j = i + dir;
            if (i < 0 || j < 0 || j >= ss.length) return ss;
            const c = [...ss];
            const from = c[i];
            const to = c[j];
            if (!from || !to) return ss;
            [c[i], c[j]] = [to, from];
            return c;
          }),
        reorderSections: (menuId, sectionIds) =>
          mutateMenu(menuId, (ss) => {
            const map = new Map(ss.map((s) => [s.id, s]));
            const reordered: Section[] = [];
            for (const id of sectionIds) {
              const sec = map.get(id);
              if (sec) {
                reordered.push(sec);
                map.delete(id);
              }
            }
            for (const sec of map.values()) {
              reordered.push(sec);
            }
            return reordered;
          }),
        moveOfferingBetweenSections: (menuId, fromSectionId, toSectionId, offeringId) => {
          if (fromSectionId === toSectionId) return;
          let movedName = "";
          mutateMenu(menuId, (ss) => {
            const fromSec = ss.find((s) => s.id === fromSectionId);
            const offering = fromSec?.offerings.find((o) => o.id === offeringId);
            if (!offering) return ss;
            movedName = offering.name;
            return ss.map((s) => {
              if (s.id === fromSectionId) {
                return { ...s, offerings: s.offerings.filter((o) => o.id !== offeringId) };
              }
              if (s.id === toSectionId) {
                return { ...s, offerings: [...s.offerings, offering] };
              }
              return s;
            });
          });
          if (movedName) {
            get().log({
              kind: "offering.moved",
              message: `Moved “${movedName}” to another section`,
            });
          }
        },
        upsertOffering: (menuId, sectionId, o) => {
          let isNew = false;
          mutateMenu(menuId, (ss) =>
            ss.map((x) => {
              if (x.id !== sectionId) return x;
              const exists = o.id ? x.offerings.some((y) => y.id === o.id) : false;
              if (!exists) {
                isNew = true;
                const newItem: Offering = { ...o, id: o.id || uid("off") } as Offering;
                return { ...x, offerings: [...x.offerings, newItem] };
              }
              return {
                ...x,
                offerings: x.offerings.map((y) =>
                  y.id === o.id ? ({ ...y, ...o } as Offering) : y,
                ),
              };
            }),
          );
          get().log({
            kind: isNew ? "offering.created" : "offering.updated",
            message: `${isNew ? "Added" : "Updated"} “${o.name}”`,
          });
        },
        duplicateOffering: (menuId, sectionId, offeringId) => {
          let newId = "";
          let clonedName = "";
          mutateMenu(menuId, (ss) =>
            ss.map((x) => {
              if (x.id !== sectionId) return x;
              const targetIndex = x.offerings.findIndex((o) => o.id === offeringId);
              if (targetIndex === -1) return x;
              const target = x.offerings[targetIndex];
              if (!target) return x;
              newId = uid("off");
              clonedName = `${target.name} (Copy)`;
              const clone: Offering = {
                ...target,
                id: newId,
                name: clonedName,
                description: target.description ?? "",
                modifiers: target.modifiers.map((g, gi) => ({
                  ...g,
                  id: `g${gi}_${uid("mod")}`,
                  options: g.options.map((opt, oi) => ({
                    ...opt,
                    id: `o${gi}_${oi}_${uid("opt")}`,
                  })),
                })),
              };
              const updated = [...x.offerings];
              updated.splice(targetIndex + 1, 0, clone);
              return { ...x, offerings: updated };
            }),
          );
          if (clonedName) {
            get().log({
              kind: "offering.created",
              message: `Duplicated offering “${clonedName}”`,
            });
          }
          return newId;
        },
        moveOfferingWithinSection: (menuId, sectionId, offeringId, dir) => {
          mutateMenu(menuId, (ss) =>
            ss.map((x) => {
              if (x.id !== sectionId) return x;
              const idx = x.offerings.findIndex((o) => o.id === offeringId);
              if (idx === -1) return x;
              const newIdx = idx + dir;
              if (newIdx < 0 || newIdx >= x.offerings.length) return x;
              const copy = [...x.offerings];
              const item = copy[idx];
              if (!item) return x;
              copy.splice(idx, 1);
              copy.splice(newIdx, 0, item);
              return { ...x, offerings: copy };
            }),
          );
        },
        removeOffering: (menuId, sectionId, offeringId) =>
          mutateMenu(menuId, (ss) =>
            ss.map((x) =>
              x.id === sectionId
                ? { ...x, offerings: x.offerings.filter((y) => y.id !== offeringId) }
                : x,
            ),
          ),
        toggleAvailability: (menuId, sectionId, offeringId) => {
          let name = "";
          let avail = true;
          mutateMenu(menuId, (ss) =>
            ss.map((x) => {
              if (sectionId && x.id !== sectionId) return x;
              const hasOffering = x.offerings.some((y) => y.id === offeringId);
              if (!hasOffering) return x;
              return {
                ...x,
                offerings: x.offerings.map((y) => {
                  if (y.id !== offeringId) return y;
                  name = y.name;
                  avail = !y.available;
                  return { ...y, available: !y.available };
                }),
              };
            }),
          );
          // Immediate availability changes apply to publishedSnapshot as well
          set((s) => ({
            menus: s.menus.map((m) => {
              if (m.id !== menuId || !m.publishedSnapshot) return m;
              return {
                ...m,
                publishedSnapshot: {
                  ...m.publishedSnapshot,
                  sections: m.publishedSnapshot.sections.map((sec) => {
                    const hasOff = sec.offerings.some((o) => o.id === offeringId);
                    if (!hasOff) return sec;
                    return {
                      ...sec,
                      offerings: sec.offerings.map((off) =>
                        off.id === offeringId ? { ...off, available: avail } : off,
                      ),
                    };
                  }),
                },
              };
            }),
          }));
          get().log({
            kind: "offering.availability",
            message: `“${name}” marked ${avail ? "available" : "sold out"}`,
          });
        },
        setOfferingSchedule: (menuId, sectionId, offeringId, schedule) => {
          let offName = "";
          mutateMenu(menuId, (ss) =>
            ss.map((sec) => {
              if (sectionId && sec.id !== sectionId) return sec;
              return {
                ...sec,
                offerings: sec.offerings.map((o) => {
                  if (o.id !== offeringId) return o;
                  offName = o.name;
                  return { ...o, schedule };
                }),
              };
            }),
          );
          get().log({
            kind: "offering.updated",
            message: `Updated schedule for “${offName || "offering"}”`,
          });
        },
        setOfferingVenueOverride: (menuId, sectionId, offeringId, venueId, override) => {
          let offName = "";
          mutateMenu(menuId, (ss) =>
            ss.map((sec) => {
              if (sectionId && sec.id !== sectionId) return sec;
              return {
                ...sec,
                offerings: sec.offerings.map((o) => {
                  if (o.id !== offeringId) return o;
                  offName = o.name;
                  const currentOverrides = o.venueOverrides || {};
                  const existing = currentOverrides[venueId] || { venueId };
                  return {
                    ...o,
                    venueOverrides: {
                      ...currentOverrides,
                      [venueId]: { ...existing, ...override, venueId },
                    },
                  };
                }),
              };
            }),
          );
          get().log({
            kind: "offering.updated",
            message: `Updated venue override for “${offName || "offering"}”`,
          });
        },
        removeOfferingVenueOverride: (menuId, sectionId, offeringId, venueId) => {
          mutateMenu(menuId, (ss) =>
            ss.map((sec) => {
              if (sectionId && sec.id !== sectionId) return sec;
              return {
                ...sec,
                offerings: sec.offerings.map((o) => {
                  if (o.id !== offeringId || !o.venueOverrides) return o;
                  const nextOverrides = { ...o.venueOverrides };
                  delete nextOverrides[venueId];
                  return {
                    ...o,
                    venueOverrides:
                      Object.keys(nextOverrides).length > 0 ? nextOverrides : undefined,
                  };
                }),
              };
            }),
          );
        },
        toggleOfferingVenueAvailability: (menuId, sectionId, offeringId, venueId) => {
          let offName = "";
          let newAvail = false;
          mutateMenu(menuId, (ss) =>
            ss.map((sec) => {
              if (sectionId && sec.id !== sectionId) return sec;
              return {
                ...sec,
                offerings: sec.offerings.map((o) => {
                  if (o.id !== offeringId) return o;
                  offName = o.name;
                  const currentOverrides = o.venueOverrides || {};
                  const existing = currentOverrides[venueId] || { venueId };
                  const currentAvail =
                    existing.available !== undefined ? existing.available : o.available;
                  newAvail = !currentAvail;
                  return {
                    ...o,
                    venueOverrides: {
                      ...currentOverrides,
                      [venueId]: { ...existing, available: newAvail, venueId },
                    },
                  };
                }),
              };
            }),
          );
          // Immediate venue availability changes apply to publishedSnapshot as well
          set((s) => ({
            menus: s.menus.map((m) => {
              if (m.id !== menuId || !m.publishedSnapshot) return m;
              return {
                ...m,
                publishedSnapshot: {
                  ...m.publishedSnapshot,
                  sections: m.publishedSnapshot.sections.map((sec) => {
                    const hasOff = sec.offerings.some((o) => o.id === offeringId);
                    if (!hasOff) return sec;
                    return {
                      ...sec,
                      offerings: sec.offerings.map((off) => {
                        if (off.id !== offeringId) return off;
                        const curOv = off.venueOverrides || {};
                        const existOv = curOv[venueId] || { venueId };
                        return {
                          ...off,
                          venueOverrides: {
                            ...curOv,
                            [venueId]: { ...existOv, available: newAvail, venueId },
                          },
                        };
                      }),
                    };
                  }),
                },
              };
            }),
          }));
          get().log({
            kind: "offering.availability",
            message: `“${offName}” marked ${newAvail ? "available" : "sold out"} at venue`,
          });
        },
        setSimulatedTime: (time) => {
          set({ simulatedTime: time });
          get().log({
            kind: "scenario.loaded",
            message: time
              ? `Simulated time set to ${time}`
              : "Simulated time cleared (using system time)",
          });
        },
        upsertSharedOffering: (sharedOffering) => {
          set((s) => {
            const list = s.sharedOfferings || [];
            const idx = list.findIndex((x) => x.id === sharedOffering.id);
            const nextList =
              idx >= 0
                ? list.map((x) => (x.id === sharedOffering.id ? sharedOffering : x))
                : [...list, sharedOffering];
            return { sharedOfferings: nextList };
          });
          get().log({
            kind: "shared_offering.updated",
            message: `Shared offering “${sharedOffering.name}” saved to catalogue`,
          });
        },
        deleteSharedOffering: (sharedOfferingId) => {
          set((s) => ({
            sharedOfferings: (s.sharedOfferings || []).filter((x) => x.id !== sharedOfferingId),
          }));
          get().log({
            kind: "shared_offering.deleted",
            message: `Deleted shared offering ${sharedOfferingId}`,
          });
        },
        addSharedOfferingToMenu: (menuId, sectionId, sharedOfferingId) => {
          const s = get();
          const shared = (s.sharedOfferings || []).find((x) => x.id === sharedOfferingId);
          if (!shared) return "";
          const newId = uid("off");
          const newOffering: Offering = {
            id: newId,
            sharedOfferingId: shared.id,
            name: shared.name,
            description: shared.description,
            price: shared.price,
            tags: [...shared.tags],
            emoji: shared.emoji,
            image: shared.image,
            imageSource: shared.imageSource,
            modifiers: JSON.parse(JSON.stringify(shared.modifiers || [])),
            specialBadge: shared.specialBadge,
            schedule: shared.schedule ? structuredClone(shared.schedule) : undefined,
            venueOverrides: shared.venueOverrides
              ? structuredClone(shared.venueOverrides)
              : undefined,
            available: true,
          };
          mutateMenu(menuId, (ss) =>
            ss.map((sec) =>
              sec.id === sectionId ? { ...sec, offerings: [...sec.offerings, newOffering] } : sec,
            ),
          );
          get().log({
            kind: "offering.created",
            message: `Added shared offering “${shared.name}” to menu`,
          });
          return newId;
        },
        publishMenu: (menuId) => {
          const m = get().menus.find((x) => x.id === menuId);
          if (!m) return false;
          if (m.sections.length === 0 || !m.sections.some((s) => s.offerings.length > 0)) {
            return false;
          }
          const snapshot: MenuPublishedSnapshot = {
            name: m.name,
            description: m.description,
            coverImage: m.coverImage,
            venueId: m.venueId,
            venueIds: m.venueIds ? [...m.venueIds] : undefined,
            isProtected: m.isProtected,
            sections: JSON.parse(JSON.stringify(m.sections)),
            publishedAt: now(),
          };
          set((s) => ({
            menus: s.menus.map((x) =>
              x.id === menuId
                ? {
                    ...x,
                    status: "published" as MenuStatus,
                    publishedAt: x.publishedAt || now(),
                    updatedAt: now(),
                    publishedSnapshot: snapshot,
                  }
                : x,
            ),
          }));
          get().log({ kind: "menu.published", message: `Published “${m.name}”` });
          return true;
        },
        unpublishMenu: (menuId) => {
          const m = get().menus.find((x) => x.id === menuId);
          set((s) => ({
            menus: s.menus.map((x) =>
              x.id === menuId ? { ...x, status: "hidden" as MenuStatus, updatedAt: now() } : x,
            ),
          }));
          get().log({ kind: "menu.hidden", message: `Menu “${m?.name}” hidden from public view` });
        },
        hideMenu: (menuId) => {
          get().unpublishMenu(menuId);
        },
        archiveMenu: (menuId) => {
          const m = get().menus.find((x) => x.id === menuId);
          set((s) => ({
            menus: s.menus.map((x) =>
              x.id === menuId ? { ...x, status: "archived" as MenuStatus, updatedAt: now() } : x,
            ),
          }));
          get().log({ kind: "menu.archived", message: `Menu “${m?.name}” archived` });
        },
        discardDraftChanges: (menuId) => {
          const m = get().menus.find((x) => x.id === menuId);
          if (!m || !m.publishedSnapshot) return;
          const snap = m.publishedSnapshot;
          set((s) => ({
            menus: s.menus.map((x) =>
              x.id === menuId
                ? {
                    ...x,
                    name: snap.name,
                    description: snap.description,
                    coverImage: snap.coverImage,
                    venueId: snap.venueId,
                    venueIds: snap.venueIds ? [...snap.venueIds] : undefined,
                    isProtected: snap.isProtected,
                    sections: JSON.parse(JSON.stringify(snap.sections)),
                    updatedAt: now(),
                  }
                : x,
            ),
          }));
          get().log({
            kind: "menu.reverted",
            message: `Discarded unpublished draft changes for “${m.name}”`,
          });
        },
        setMenuStatus: (menuId, status) => {
          if (status === "published") {
            get().publishMenu(menuId);
            return;
          }
          if (status === "hidden") {
            get().hideMenu(menuId);
            return;
          }
          if (status === "archived") {
            get().archiveMenu(menuId);
            return;
          }
          const m = get().menus.find((x) => x.id === menuId);
          set((s) => ({
            menus: s.menus.map((x) =>
              x.id === menuId
                ? ({
                    ...x,
                    status,
                    updatedAt: now(),
                  } as Menu)
                : x,
            ),
          }));
          get().log({ kind: `menu.${status}`, message: `Menu “${m?.name}” is now ${status}` });
        },
        setOrganisationStatus: (orgId, status, note) => {
          set((s) => ({
            organisation:
              s.organisation?.id === orgId
                ? { ...s.organisation, status, statusNote: note }
                : s.organisation,
          }));
          get().log({
            kind: "operator.org_status",
            message: `Organisation status set to ${status}${note ? ` (${note})` : ""}`,
          });
        },
        resolveDisputeCase: (caseId, resolution, adjustmentUnits, note) => {
          set((s) => {
            const nextDisputes = s.disputes.map((d) =>
              d.id === caseId
                ? {
                    ...d,
                    status: resolution,
                    resolvedAt: now(),
                    resolutionNote: note,
                    adjustmentUnits,
                  }
                : d,
            );
            const nextPolicy =
              adjustmentUnits > 0
                ? {
                    ...s.orderPolicy,
                    included: s.orderPolicy.included + adjustmentUnits,
                  }
                : s.orderPolicy;
            return {
              disputes: nextDisputes,
              orderPolicy: nextPolicy,
            };
          });
          get().log({
            kind: "operator.dispute_resolved",
            message: `Dispute case ${caseId} ${resolution} (+${adjustmentUnits} units): ${note}`,
          });
        },
        resolveModerationCase: (caseId, actionTaken) => {
          set((s) => ({
            moderationCases: s.moderationCases.map((m) =>
              m.id === caseId
                ? {
                    ...m,
                    status: "resolved",
                    actionTaken,
                  }
                : m,
            ),
          }));
          get().log({
            kind: "operator.moderation_resolved",
            message: `Moderation report ${caseId} resolved: ${actionTaken}`,
          });
        },
        setSimulatedOffline: (offline: boolean) => {
          set({ simulatedOffline: offline });
          get().log({
            kind: offline ? "network.offline_simulated" : "network.online_restored",
            message: offline
              ? "Simulated offline network mode enabled: read-only cache active"
              : "Network connection restored: full ordering capability active",
          });
        },
      };
    },
    {
      name: "pewa-prototype-v1",
      skipHydration: true,
      merge: (persisted, current) => {
        const p = persisted as Partial<PewaState> | undefined;
        if (!p) return current;
        return {
          ...current,
          ...p,
          venues: (p.venues || current.venues).map((v) => ({
            ...v,
            category: v.category || current.venues.find((cv) => cv.id === v.id)?.category || "Café",
          })),
          menus: (p.menus || current.menus).map((m) => {
            const currentMenu = current.menus.find((cm) => cm.id === m.id);
            return {
              ...m,
              venueId: m.venueId ?? currentMenu?.venueId,
              venueIds: m.venueIds ?? currentMenu?.venueIds,
              description: m.description ?? currentMenu?.description,
              coverImage: m.coverImage ?? currentMenu?.coverImage,
              isProtected: m.isProtected ?? currentMenu?.isProtected,
              publishedSnapshot: m.publishedSnapshot ?? currentMenu?.publishedSnapshot,
              sections: (m.sections || []).map((sec) => ({
                ...sec,
                offerings: (sec.offerings || []).map((off) => ({
                  ...off,
                  tags: Array.isArray(off.tags) ? off.tags : [],
                  imageSource: off.imageSource || (off.image ? "library" : undefined),
                })),
              })),
            };
          }),
        };
      },
    },
  ),
);

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  owner: "Organisation Owner",
  admin: "Organisation Administrator",
  manager: "Business Manager",
  staff: "Operational Staff",
  operator: "PEWA Operator",
};

export const canAuthorMenus = (r: Role) => r === "owner" || r === "admin" || r === "manager";
export const canToggleAvailability = (r: Role) => canAuthorMenus(r) || r === "staff";
export const canManageOrders = (r: Role) => canAuthorMenus(r) || r === "staff";
export const canManageBilling = (r: Role) => r === "owner" || r === "admin";
export const canManagePromotions = (r: Role) => r === "owner" || r === "admin" || r === "manager";
export const canViewActivity = (r: Role) => isBusinessRole(r);
export const isBusinessRole = (r: Role) => r !== "customer" && r !== "operator";
export const canAccessOperatorConsole = (r: Role) =>
  r === "operator" || r === "admin" || r === "owner";

export const formatPrice = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};
