import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActivityEvent,
  Menu,
  MenuStatus,
  Offering,
  PewaState,
  Role,
  ScenarioId,
  Section,
  CartLine,
  OrderRequest,
  PromotionCampaign,
  GuestSession,
  OrgStatus,
  UsageDisputeCase,
  ModerationCase,
} from "./types";
import { buildScenario } from "./fixtures";
import { canAdmitOrder, cartTotal, validateCart } from "./ordering";

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
  renameSection: (menuId: string, sectionId: string, name: string) => void;
  removeSection: (menuId: string, sectionId: string) => void;
  moveSection: (menuId: string, sectionId: string, dir: -1 | 1) => void;
  upsertOffering: (
    menuId: string,
    sectionId: string,
    o: Omit<Offering, "id"> & { id?: string },
  ) => void;
  removeOffering: (menuId: string, sectionId: string, offeringId: string) => void;
  toggleAvailability: (menuId: string, sectionId: string, offeringId: string) => void;
  setMenuStatus: (menuId: string, status: MenuStatus) => void;
  addMenu: (name: string) => string;
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

export const usePewa = create<PewaState & Actions>()(
  persist(
    (set, get) => {
      const mutateMenu = (menuId: string, fn: (sections: Section[]) => Section[]) =>
        set((s) => ({
          menus: s.menus.map((m) =>
            m.id === menuId ? { ...m, sections: fn(m.sections), updatedAt: now() } : m,
          ),
        }));
      return {
        ...buildScenario("new-cafe"),
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
          if (!canAdmitOrder(s.orderPolicy))
            return "Structured requests are paused. Please contact the business directly.";
          if (s.cart?.lines.length && s.cart.venueId !== venueId)
            return "Your cart belongs to another business. Clear it before starting a new cart.";
          const cart = { venueId, lines: [...(s.cart?.lines ?? []), { ...line, id: uid("line") }] };
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
            lines: structuredClone(s.cart.lines),
            total: cartTotal(s.cart.lines),
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
        loadScenario: (id) => set({ ...buildScenario(id), role: get().role }),
        reset: () => set({ ...buildScenario(get().scenario), role: get().role }),
        log: (e) =>
          set((s) => ({
            activity: [{ ...e, id: uid("evt"), at: now(), role: s.role }, ...s.activity].slice(
              0,
              200,
            ),
          })),
        completeOnboarding: (i) => {
          const orgId = uid("org");
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
                id: uid("venue"),
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
        addMenu: (name) => {
          const org = get().organisation;
          const id = uid("menu");
          if (!org) return id;
          set((s) => ({
            menus: [
              ...s.menus,
              { id, orgId: org.id, name, status: "draft", sections: [], updatedAt: now() },
            ],
          }));
          get().log({ kind: "menu.created", message: `Draft menu “${name}” created` });
          return id;
        },
        addSection: (menuId, name, categoryTag) => {
          mutateMenu(menuId, (ss) => [...ss, { id: uid("sec"), name, categoryTag, offerings: [] }]);
          get().log({ kind: "section.created", message: `Section “${name}” added` });
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
        upsertOffering: (menuId, sectionId, o) => {
          const isNew = !o.id;
          mutateMenu(menuId, (ss) =>
            ss.map((x) => {
              if (x.id !== sectionId) return x;
              if (isNew)
                return { ...x, offerings: [...x.offerings, { ...o, id: uid("off") } as Offering] };
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
            ss.map((x) =>
              x.id === sectionId
                ? {
                    ...x,
                    offerings: x.offerings.map((y) => {
                      if (y.id !== offeringId) return y;
                      name = y.name;
                      avail = !y.available;
                      return { ...y, available: !y.available };
                    }),
                  }
                : x,
            ),
          );
          get().log({
            kind: "offering.availability",
            message: `“${name}” marked ${avail ? "available" : "sold out"}`,
          });
        },
        setMenuStatus: (menuId, status) => {
          const m = get().menus.find((x) => x.id === menuId);
          set((s) => ({
            menus: s.menus.map((x) =>
              x.id === menuId
                ? ({
                    ...x,
                    status,
                    updatedAt: now(),
                    publishedAt: status === "published" ? now() : x.publishedAt,
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
          menus: (p.menus || current.menus).map((m) => ({
            ...m,
            sections: (m.sections || []).map((sec) => ({
              ...sec,
              offerings: (sec.offerings || []).map((off) => ({
                ...off,
                tags: Array.isArray(off.tags) ? off.tags : [],
              })),
            })),
          })),
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
