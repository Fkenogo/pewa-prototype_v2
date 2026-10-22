import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActivityEvent,
  ContactVisibility,
  Menu,
  MenuPublishedSnapshot,
  MenuStatus,
  MembershipRole,
  OnboardingDraft,
  Offering,
  OfferingSchedule,
  Organisation,
  OrganisationMembership,
  PersonalIdentity,
  PewaState,
  PreferredSignInIdentifier,
  Role,
  ScenarioId,
  ScopeType,
  Section,
  CartLine,
  OrderRequest,
  PromotionCampaign,
  GuestSession,
  OrgStatus,
  SharedOffering,
  TeamInvitation,
  UsageDisputeCase,
  ModerationCase,
  VenueOfferingOverride,
  AccessChannel,
  AccessStatus,
  MenuAccessReference,
  Venue,
} from "./types";
import {
  buildScenario,
  KNOWN_ORGANISATIONS,
  PROTOTYPE_DIRECTORY_VENUES,
  PROTOTYPE_DIRECTORY_MENUS,
  SAMPLE_FOUNDER_IDENTITY,
  SAMPLE_ADMIN_IDENTITY,
  SAMPLE_MANAGER_IDENTITY,
  SAMPLE_STAFF_IDENTITY,
  SCENARIO_DEMO_IDENTITIES,
} from "./fixtures";
import { getVenuePublishedMenus } from "./taxonomy";
import {
  canAdmitOrder,
  cartTotal,
  validateCart,
  validateModifierGroupConfig,
  validateOfferingModifiersConfig,
  validateModifierSelection,
  validateAndRecalculateLineModifiers,
  getAuthoritativeVenues,
  getAuthoritativeMenus,
} from "./ordering";
import {
  getEffectiveOffering,
  getEffectiveOfferingAvailability,
  isOfferingHiddenAtVenue,
  getMenuEffectiveSharedOfferings,
  isOfferingInSchedule,
  formatSchedule,
  getSharedOfferingUsage,
  parseScheduleReferenceTime,
  getVenueLocalTime,
  PROTOTYPE_DEMO_DATE_ISO,
  resolveScenarioReferenceTimeMs,
} from "./availability";

export {
  canAdmitOrder,
  cartTotal,
  validateCart,
  validateModifierGroupConfig,
  validateOfferingModifiersConfig,
  validateModifierSelection,
  validateAndRecalculateLineModifiers,
  getAuthoritativeVenues,
  getAuthoritativeMenus,
  SAMPLE_FOUNDER_IDENTITY,
  SAMPLE_ADMIN_IDENTITY,
  SAMPLE_MANAGER_IDENTITY,
  SAMPLE_STAFF_IDENTITY,
  SCENARIO_DEMO_IDENTITIES,
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

export interface CompleteOnboardingInput {
  // Optional Personal Identity fields (Step A)
  identity?:
    | {
        fullName: string;
        email?: string | undefined;
        mobile?: string | undefined;
        preferredSignIn?: PreferredSignInIdentifier | undefined;
        verifiedSimulation?: boolean | undefined;
      }
    | undefined;
  // Step B — Organisation details
  orgName: string;
  tradingName?: string | undefined;
  businessType: string;
  category?: string | undefined;
  country?: string | undefined;
  currency: string;
  primaryBusinessContact?: string | undefined;
  primaryContactVisibility?: ContactVisibility | undefined;
  // Step C — Business presence
  venueName: string;
  tagline?: string | undefined;
  brandBadge?: string | undefined;
  phone: string;
  whatsapp: string;
  email: string;
  deliveryOnly: boolean;
  // Step D — Location and service configuration
  address: string;
  serviceArea?: string | undefined;
  services: string[];
  servicePointName?: string | undefined;
  additionalServiceContexts?: string[] | undefined;
  menuName: string;
}

type Actions = {
  setRole: (r: Role) => void;
  loadScenario: (id: ScenarioId) => void;
  reset: () => void;
  upsertPersonalIdentity: (input: {
    id?: string | undefined;
    fullName: string;
    email?: string | undefined;
    mobile?: string | undefined;
    preferredSignIn?: PreferredSignInIdentifier | undefined;
    verifiedSimulation?: boolean | undefined;
  }) => PersonalIdentity;
  upsertMembership: (input: {
    identityId: string;
    orgId: string;
    role: MembershipRole;
    status?: OrganisationMembership["status"] | undefined;
    venueId?: string | undefined;
    _isInternalFixtureSetup?: boolean | undefined;
  }) => OrganisationMembership | null;
  seedScenarioMembership: (input: {
    identityId: string;
    orgId: string;
    role: MembershipRole;
    status?: OrganisationMembership["status"] | undefined;
    venueId?: string | undefined;
  }) => OrganisationMembership | null;
  saveOnboardingDraft: (draft: Partial<OnboardingDraft>) => void;
  clearOnboardingDraft: () => void;
  completeOnboarding: (input: CompleteOnboardingInput) => string;
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
  clearRecents: () => void;
  removeRecent: (id: string) => void;
  toggleFavourite: (id: string) => void;
  addCartLine: (venueId: string, line: Omit<CartLine, "id">) => string | null;
  updateCartQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  submitOrder: (
    input: Pick<OrderRequest, "guestName" | "guestContact" | "service" | "note"> & {
      servicePoint?: string | undefined;
    },
  ) => {
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
  createInvitation: (input: {
    recipientContact: string;
    recipientName?: string | undefined;
    role: MembershipRole;
    scopeType?: ScopeType | undefined;
    venueIds?: string[] | undefined;
    servicePoints?: string[] | undefined;
  }) => {
    success: boolean;
    error?: string | undefined;
    invitation?: TeamInvitation | undefined;
  };
  cancelInvitation: (invitationId: string) => {
    success: boolean;
    error?: string | undefined;
  };
  acceptInvitation: (
    tokenOrId: string,
    acceptingIdentityInput?:
      | {
          fullName: string;
          email?: string | undefined;
          mobile?: string | undefined;
          preferredSignIn?: PreferredSignInIdentifier | undefined;
        }
      | undefined,
  ) => {
    success: boolean;
    error?: string | undefined;
    membership?: OrganisationMembership | undefined;
  };
  declineInvitation: (tokenOrId: string) => {
    success: boolean;
    error?: string | undefined;
  };
  updateMembershipScope: (input: {
    membershipId: string;
    scopeType: ScopeType;
    venueIds?: string[] | undefined;
    servicePoints?: string[] | undefined;
    role?: MembershipRole | undefined;
  }) => {
    success: boolean;
    error?: string | undefined;
  };
  revokeMembership: (membershipId: string) => {
    success: boolean;
    error?: string | undefined;
  };
  switchOrganisation: (orgId: string) => {
    success: boolean;
    error?: string | undefined;
  };
  createAccessReference: (input: {
    venueId: string;
    menuId: string;
    servicePoint?: string | undefined;
    channel?: AccessChannel | undefined;
    label?: string | undefined;
    customPrompt?: string | undefined;
    shortCode?: string | undefined;
  }) => {
    success: boolean;
    error?: string | undefined;
    reference?: MenuAccessReference | undefined;
  };
  updateAccessReferenceStatus: (
    referenceId: string,
    status: AccessStatus,
  ) => {
    success: boolean;
    error?: string | undefined;
  };
  regenerateAccessCode: (referenceId: string) => {
    success: boolean;
    error?: string | undefined;
    newCode?: string | undefined;
  };
  deleteAccessReference: (referenceId: string) => {
    success: boolean;
    error?: string | undefined;
  };
};

const now = () => new Date().toISOString();

export {
  getLiveMenu,
  getVenuePublishedMenus,
  IMAGE_LIBRARY_CATEGORIES,
  searchImageLibrary,
  cropAndCompressImage,
} from "./taxonomy";
export {
  getMenuEffectiveSharedOfferings,
  getEffectiveOffering,
  getEffectiveOfferingAvailability,
  isOfferingHiddenAtVenue,
  isOfferingInSchedule,
  formatSchedule,
  getSharedOfferingUsage,
  parseScheduleReferenceTime,
  getVenueLocalTime,
  PROTOTYPE_DEMO_DATE_ISO,
  resolveScenarioReferenceTimeMs,
} from "./availability";

/**
 * Sanitizes venue overrides to reject negative or non-finite prices while preserving explicit zero.
 */
export function sanitizeVenueOverrides(
  overrides?: Record<string, VenueOfferingOverride>,
): Record<string, VenueOfferingOverride> | undefined {
  if (!overrides) return undefined;
  const sanitized: Record<string, VenueOfferingOverride> = {};
  for (const [vid, ov] of Object.entries(overrides)) {
    const validPrice =
      ov.price !== undefined &&
      typeof ov.price === "number" &&
      Number.isFinite(ov.price) &&
      ov.price >= 0
        ? ov.price
        : undefined;
    sanitized[vid] = {
      ...ov,
      price: validPrice,
    };
  }
  return sanitized;
}

/**
 * Checks whether a published menu has pending draft changes that differ from its live snapshot.
 * Availability changes (sold out) take effect immediately and do not count as draft changes.
 * Also checks if any shared offerings linked in this menu have pending catalogue changes.
 */
export function hasUnpublishedDraftChanges(
  menu: Menu,
  sharedOfferings?: SharedOffering[],
): boolean {
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

  if (JSON.stringify(normSec(menu.sections)) !== JSON.stringify(normSec(snap.sections))) {
    return true;
  }

  // Check if any shared offering linked in this menu has been updated in the catalogue
  if (sharedOfferings && snap.sharedOfferingsSnapshot) {
    const usedSharedIds = new Set<string>();
    for (const sec of menu.sections) {
      for (const off of sec.offerings) {
        if (off.sharedOfferingId) {
          usedSharedIds.add(off.sharedOfferingId);
        }
      }
    }
    for (const sharedId of usedSharedIds) {
      const currentShared = sharedOfferings.find((s) => s.id === sharedId);
      const snapShared = snap.sharedOfferingsSnapshot.find((s) => s.id === sharedId);
      if (!currentShared && !snapShared) continue;
      if (!currentShared || !snapShared) return true;
      if (JSON.stringify(currentShared) !== JSON.stringify(snapShared)) {
        return true;
      }
    }
  }

  return false;
}

const ensurePublishedSnapshots = (menus: Menu[], sharedOfferings?: SharedOffering[]): Menu[] =>
  menus.map((m) => {
    if (m.status === "published") {
      if (!m.publishedSnapshot) {
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
            sharedOfferingsSnapshot: sharedOfferings
              ? JSON.parse(JSON.stringify(sharedOfferings))
              : undefined,
          },
        };
      }
      if (!m.publishedSnapshot.sharedOfferingsSnapshot && sharedOfferings) {
        return {
          ...m,
          publishedSnapshot: {
            ...m.publishedSnapshot,
            sharedOfferingsSnapshot: JSON.parse(JSON.stringify(sharedOfferings)),
          },
        };
      }
    }
    return m;
  });

export const SIMULATED_IMPRESSION_COST = 0.1;

export type CampaignDeliveryState =
  "eligible" | "paused" | "expired" | "scheduled" | "exhausted" | "suspended" | "unpublished_venue";

export interface CampaignDeliveryEvaluation {
  eligible: boolean;
  state: CampaignDeliveryState;
  label: string;
  remainingBudget: number;
  remainingImpressionsEntitlement: number;
  reason?: string | undefined;
}

/**
 * Evaluates whether a featured campaign is eligible for customer delivery and impression charging.
 * Enforces:
 * - Campaign is active
 * - Budget is not exhausted (remaining budget >= SIMULATED_IMPRESSION_COST)
 * - Campaign is within its start/end window (using `resolveScenarioReferenceTimeMs` so time-only
 *   or day+time demonstration values resolve deterministically against the October 2026 fixture date
 *   rather than falling back to the viewer's real-world wall clock)
 * - Organisation is not suspended (suspension halts delivery while preserving remaining exposure entitlement)
 * - Target venue exists and has at least one eligible public published menu
 */
export function evaluateCampaignDelivery(
  campaign: PromotionCampaign,
  context: {
    organisation?: PewaState["organisation"];
    venues: PewaState["venues"];
    menus: PewaState["menus"];
    referenceTimeIso?: string | undefined;
  },
): CampaignDeliveryEvaluation {
  const remainingBudget = Math.max(0, +(campaign.budget - campaign.spent).toFixed(2));
  const remainingImpressionsEntitlement = Math.floor(
    +(remainingBudget / SIMULATED_IMPRESSION_COST).toFixed(4),
  );

  // Check organisation suspension first so preserved entitlement is clearly surfaced
  if (
    context.organisation &&
    context.organisation.id === campaign.orgId &&
    context.organisation.status === "suspended"
  ) {
    return {
      eligible: false,
      state: "suspended",
      label: "Suspended (Entitlement Preserved)",
      remainingBudget,
      remainingImpressionsEntitlement,
      reason: `Organisation is suspended. Delivery is halted and $${remainingBudget.toFixed(2)} (${remainingImpressionsEntitlement} impressions) of remaining exposure entitlement is preserved.`,
    };
  }

  const allVenues = getAuthoritativeVenues({ venues: context.venues });
  const allMenus = getAuthoritativeMenus({ menus: context.menus });
  const venue = allVenues.find((v) => v.id === campaign.venueId);
  const publicMenus = venue
    ? getVenuePublishedMenus(venue, allMenus, allVenues, { includeProtected: false })
    : [];

  if (!venue || publicMenus.length === 0) {
    return {
      eligible: false,
      state: "unpublished_venue",
      label: "Awaiting Published Menu",
      remainingBudget,
      remainingImpressionsEntitlement,
      reason:
        "Target business does not currently have an eligible public published menu. Campaign is withheld from customer placement without charging impressions.",
    };
  }

  if (remainingBudget <= 0 || campaign.spent >= campaign.budget) {
    return {
      eligible: false,
      state: "exhausted",
      label: "Budget Exhausted",
      remainingBudget: 0,
      remainingImpressionsEntitlement: 0,
      reason:
        "Campaign budget has been fully utilised. No further billable impressions will be generated.",
    };
  }

  // Resolve reference time deterministically: time-only ("10:00"), day+time ("mon 09:00"),
  // or full ISO timestamps resolve via the canonical scenario reference resolver instead of Date.now().
  const refNow = resolveScenarioReferenceTimeMs(context.referenceTimeIso);

  if (campaign.endDate) {
    const endMs = Date.parse(campaign.endDate);
    if (!Number.isNaN(endMs) && refNow > endMs) {
      return {
        eligible: false,
        state: "expired",
        label: "Expired",
        remainingBudget,
        remainingImpressionsEntitlement,
        reason:
          "Campaign end date has passed. Expired campaigns do not appear in discovery or incur charges.",
      };
    }
  }

  if (campaign.startDate) {
    const startMs = Date.parse(campaign.startDate);
    if (!Number.isNaN(startMs) && refNow < startMs) {
      return {
        eligible: false,
        state: "scheduled",
        label: "Scheduled",
        remainingBudget,
        remainingImpressionsEntitlement,
        reason: "Campaign start date is in the future.",
      };
    }
  }

  if (!campaign.active) {
    return {
      eligible: false,
      state: "paused",
      label: "Paused",
      remainingBudget,
      remainingImpressionsEntitlement,
      reason: `Campaign is paused by the business. $${remainingBudget.toFixed(2)} (${remainingImpressionsEntitlement} impressions) remaining.`,
    };
  }

  return {
    eligible: true,
    state: "eligible",
    label: "Active · Delivering",
    remainingBudget,
    remainingImpressionsEntitlement,
  };
}

export const usePewa = create<PewaState & Actions>()(
  persist(
    (set, get) => {
      const mutateMenu = (
        menuId: string,
        fn: (sections: Section[]) => Section[],
        options?: { allowAvailabilityOnly?: boolean; venueId?: string },
      ): boolean => {
        const s = get();
        const effectiveRole = getEffectiveBusinessRole(s);
        const permitted = options?.allowAvailabilityOnly
          ? canToggleAvailability(effectiveRole)
          : canAuthorMenus(effectiveRole);
        if (!permitted) return false;
        const target = s.menus.find((m) => m.id === menuId);
        if (!target || !s.organisation || target.orgId !== s.organisation.id) return false;
        const checkVenueId = options?.venueId || target.venueId;
        if (
          !canActorOperateScope(s, {
            venueId: checkVenueId,
            servicePoint: target.servicePointName,
          })
        ) {
          return false;
        }
        set((state) => ({
          menus: state.menus.map((m) =>
            m.id === menuId ? { ...m, sections: fn(m.sections), updatedAt: now() } : m,
          ),
        }));
        return true;
      };
      const initialSeed = buildScenario("new-cafe");
      return {
        ...initialSeed,
        menus: ensurePublishedSnapshots(initialSeed.menus, initialSeed.sharedOfferings),
        visitVenue: (id) =>
          set((s) => {
            if (!id) return s;
            return { recents: [id, ...s.recents.filter((v) => v !== id)] };
          }),
        clearRecents: () => set({ recents: [] }),
        removeRecent: (id) => set((s) => ({ recents: s.recents.filter((v) => v !== id) })),
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

          const allVenues = getAuthoritativeVenues(s);
          const allMenus = getAuthoritativeMenus(s);
          const venue = allVenues.find((v) => v.id === venueId);
          if (!venue) return "This venue is no longer available.";

          const venuePublishedMenus = getVenuePublishedMenus(venue, allMenus, allVenues, {
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
          const effectiveShared =
            publishedMenu.publishedSnapshot?.sharedOfferingsSnapshot || s.sharedOfferings;
          if (isOfferingHiddenAtVenue(rawOffering, venueId, effectiveShared)) {
            return `${rawOffering.name} is not available at this service location.`;
          }
          const availability = getEffectiveOfferingAvailability(rawOffering, venueId, {
            simulatedTime: s.simulatedTime,
            sharedOfferings: effectiveShared,
            venue,
          });
          if (!availability.available) {
            return availability.reason === "sold_out_manual"
              ? `${rawOffering.name} is currently sold out.`
              : `${rawOffering.name} is currently outside scheduled hours (${availability.scheduleDetails || "Scheduled hours"}).`;
          }

          const effectiveOffering = getEffectiveOffering(rawOffering, venueId, effectiveShared);
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
          const allVenues = getAuthoritativeVenues(s);
          const allMenus = getAuthoritativeMenus(s);
          const venue = allVenues.find((v) => v.id === s.cart?.venueId);
          if (!venue || !s.cart) return { error: "This venue is no longer available." };
          if (!venue.services.includes(input.service))
            return { error: "Choose a service offered by this business." };

          const venuePublishedMenus = getVenuePublishedMenus(venue, allMenus, allVenues, {
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
            const effectiveShared =
              menu?.publishedSnapshot?.sharedOfferingsSnapshot || s.sharedOfferings;
            const offering = getEffectiveOffering(rawOffering, venue.id, effectiveShared);
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
            servicePoint: input.servicePoint?.trim() || undefined,
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
          const effectiveRole = getEffectiveBusinessRole(s);
          const order = s.orders.find((o) => o.id === id);
          if (
            !order ||
            order.status !== "pending" ||
            !canManageOrders(effectiveRole) ||
            order.orgId !== s.organisation?.id ||
            !canActorOperateScope(s, { venueId: order.venueId, servicePoint: order.servicePoint })
          )
            return false;
          const policy = { ...s.orderPolicy };
          const maxRecoverable = policy.overdraftMax ?? 10;
          if (policy.included > 0 && !policy.expired) policy.included -= 1;
          else if (policy.topUp > 0) policy.topUp -= 1;
          else if (policy.overdraftUsed < maxRecoverable) policy.overdraftUsed += 1;
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
          const effectiveRole = getEffectiveBusinessRole(s);
          const order = s.orders.find((o) => o.id === id);
          if (
            !order ||
            order.status !== "pending" ||
            !canManageOrders(effectiveRole) ||
            order.orgId !== s.organisation?.id ||
            !reason.trim() ||
            !canActorOperateScope(s, { venueId: order.venueId, servicePoint: order.servicePoint })
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
          const effectiveRole = getEffectiveBusinessRole(s);
          const order = s.orders.find((o) => o.id === id);
          if (
            !order ||
            order.status !== "accepted" ||
            !canManageOrders(effectiveRole) ||
            order.orgId !== s.organisation?.id ||
            !canActorOperateScope(s, { venueId: order.venueId, servicePoint: order.servicePoint })
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
          if (!canManageBilling(getEffectiveBusinessRole(s)) || !s.organisation) return;
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
          if (!canManageBilling(getEffectiveBusinessRole(s)) || !s.organisation) return;
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
          if (!canManageBilling(getEffectiveBusinessRole(s)) || !s.organisation) return;
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
          const s = get();
          if (
            !canManagePromotions(getEffectiveBusinessRole(s)) ||
            !s.organisation ||
            (input.orgId && input.orgId !== s.organisation.id)
          ) {
            return "";
          }
          const id = uid("camp");
          const campaign = {
            ...input,
            orgId: s.organisation.id,
            id,
            spent: 0,
            impressions: 0,
            clicks: 0,
          };
          set((state) => ({ campaigns: [campaign, ...state.campaigns] }));
          get().log({
            kind: "promo.created",
            message: `Campaign “${input.title}” launched with budget $${input.budget}`,
          });
          return id;
        },
        toggleCampaign: (id) => {
          const s = get();
          if (!canManagePromotions(getEffectiveBusinessRole(s)) || !s.organisation) return;
          const target = s.campaigns.find((c) => c.id === id);
          if (!target || target.orgId !== s.organisation.id) return;
          let title = "";
          let active = false;
          set((state) => ({
            campaigns: state.campaigns.map((c) => {
              if (c.id !== id) return c;
              title = c.title;
              active = !c.active;
              return { ...c, active };
            }),
          }));
          if (title) {
            get().log({
              kind: "promo.toggled",
              message: `Campaign “${title}” ${active ? "activated" : "paused"}`,
            });
          }
        },
        recordPromotionImpression: (campaignId) => {
          // Simulated non-authoritative exposure accounting per CORR-B & R2-D:
          // Prototype simulates an exposure fee ($0.10) per delivered impression, capped at available budget.
          // Expired, inactive, exhausted, suspended-org, or unpublished-venue campaigns must NOT generate billable impressions.
          set((s) => {
            const target = s.campaigns.find((c) => c.id === campaignId);
            if (!target) return s;
            const evaluation = evaluateCampaignDelivery(target, {
              organisation: s.organisation,
              venues: s.venues,
              menus: s.menus,
              referenceTimeIso: s.simulatedTime,
            });
            if (!evaluation.eligible) return s;
            return {
              campaigns: s.campaigns.map((c) =>
                c.id === campaignId
                  ? {
                      ...c,
                      impressions: c.impressions + 1,
                      spent: Math.min(c.budget, +(c.spent + SIMULATED_IMPRESSION_COST).toFixed(2)),
                    }
                  : c,
              ),
            };
          });
        },
        recordPromotionClick: (campaignId) => {
          // Engagement tracking per CORR-B & R2-D:
          // Clicks are tracked separately as engagement metrics and MUST NOT draw down promotional budget.
          // Allow engagement clicks on eligible campaigns as well as placements whose final qualifying impression just exhausted the budget.
          const s = get();
          const target = s.campaigns.find((c) => c.id === campaignId);
          if (!target) return;
          const evaluation = evaluateCampaignDelivery(target, {
            organisation: s.organisation,
            venues: s.venues,
            menus: s.menus,
            referenceTimeIso: s.simulatedTime,
          });
          if (!evaluation.eligible && evaluation.state !== "exhausted") return;
          set((state) => ({
            campaigns: state.campaigns.map((c) =>
              c.id === campaignId
                ? {
                    ...c,
                    clicks: c.clicks + 1,
                  }
                : c,
            ),
          }));
          get().log({
            kind: "promo.clicked",
            message: `Sponsored offer clicked (campaign: ${campaignId}) — engagement tracked; zero budget charged`,
          });
        },
        setRole: (role) => {
          let swappedIdentityName: string | undefined;
          set((s) => {
            if (!isBusinessRole(role) || !s.organisation) {
              return { role };
            }

            // Check if current user is explicitly modeling an inactive / revoked / invited / pending member
            const currentMem = (s.memberships || []).find(
              (m) => m.identityId === s.personalIdentity?.id && m.orgId === s.organisation?.id,
            );

            if (currentMem && currentMem.status !== "active") {
              // Fail-closed rule (Requirement 3.4 & 3.5):
              // Revoked, invited or pending memberships must never be reactivated or elevated
              // by changing the Scenario Control role selector. Keep current identity and memberships untouched.
              return { role };
            }

            // Check if current identity is one of the pre-seeded scenario demonstration identities
            const isDemonstrationIdentity =
              s.personalIdentity &&
              SCENARIO_DEMO_IDENTITIES.some((idItem) => idItem.id === s.personalIdentity?.id);

            if (!isDemonstrationIdentity) {
              // Non-demonstration identity: do NOT swap identity away to another persona.
              // Authenticated identities remain themselves; visual role selector alone cannot self-elevate.
              return { role };
            }

            // If the current identity is already an active member of this role:
            if (currentMem && currentMem.role === role && currentMem.status === "active") {
              return { role };
            }

            // In demonstration mode, switch the active persona to the pre-seeded member for this role if one exists
            const targetMembership = (s.memberships || []).find(
              (m) => m.orgId === s.organisation?.id && m.role === role && m.status === "active",
            );
            if (targetMembership) {
              const targetIdentity = (s.identities || []).find(
                (idItem) => idItem.id === targetMembership.identityId,
              );
              if (targetIdentity) {
                swappedIdentityName = targetIdentity.fullName;
                return {
                  role,
                  personalIdentity: targetIdentity,
                };
              }
            }

            // If no matching membership exists for this role in the organisation,
            // update role without synthesizing or mutating any memberships (fails closed via getEffectiveBusinessRole)
            return { role };
          });
          get().log({
            kind: "role.switched",
            message: `Simulated role switched to ${role} (demonstration persona: ${swappedIdentityName || get().personalIdentity?.fullName || "Fail-closed guest"}; memberships preserved)`,
          });
        },
        loadScenario: (id) => {
          const sc = buildScenario(id);
          const currentRole = get().role;
          const nextRole = id === "new-cafe" ? "owner" : sc.role || currentRole;
          let persona = sc.personalIdentity;
          if (isBusinessRole(nextRole) && sc.organisation && sc.memberships) {
            const memForRole = sc.memberships.find(
              (m) =>
                m.orgId === sc.organisation?.id && m.role === nextRole && m.status === "active",
            );
            if (memForRole) {
              const idForRole = (sc.identities || []).find((i) => i.id === memForRole.identityId);
              if (idForRole) {
                persona = idForRole;
              }
            }
          }
          set({
            ...sc,
            personalIdentity: persona,
            menus: ensurePublishedSnapshots(sc.menus, sc.sharedOfferings),
            role: nextRole,
            organisations: sc.organisations || (sc.organisation ? [sc.organisation] : []),
            memberships: sc.memberships,
            invitations: sc.invitations || [],
            accessReferences: sc.accessReferences || [],
          });
        },
        reset: () => {
          const sc = buildScenario(get().scenario);
          const nextRole = get().role;
          let persona = sc.personalIdentity;
          if (isBusinessRole(nextRole) && sc.organisation && sc.memberships) {
            const memForRole = sc.memberships.find(
              (m) =>
                m.orgId === sc.organisation?.id && m.role === nextRole && m.status === "active",
            );
            if (memForRole) {
              const idForRole = (sc.identities || []).find((i) => i.id === memForRole.identityId);
              if (idForRole) {
                persona = idForRole;
              }
            }
          }
          set({
            ...sc,
            personalIdentity: persona,
            menus: ensurePublishedSnapshots(sc.menus, sc.sharedOfferings),
            role: nextRole,
            organisations: sc.organisations || (sc.organisation ? [sc.organisation] : []),
            memberships: sc.memberships,
            invitations: sc.invitations || [],
            accessReferences: sc.accessReferences || [],
          });
        },
        log: (e) =>
          set((s) => ({
            activity: [{ ...e, id: uid("evt"), at: now(), role: s.role }, ...s.activity].slice(
              0,
              200,
            ),
          })),
        upsertPersonalIdentity: (input) => {
          const s = get();
          const cleanEmail = (input.email || "").trim();
          const cleanMobile = (input.mobile || "").trim();
          const existingList = s.identities || [];
          const existing = existingList.find(
            (idItem) =>
              (input.id && idItem.id === input.id) ||
              (cleanEmail &&
                idItem.email &&
                idItem.email.toLowerCase() === cleanEmail.toLowerCase()) ||
              (cleanMobile && idItem.mobile && idItem.mobile === cleanMobile) ||
              (!cleanEmail &&
                !cleanMobile &&
                s.personalIdentity &&
                idItem.id === s.personalIdentity.id),
          );

          const identity: PersonalIdentity = {
            id: existing?.id || input.id || uid("id"),
            fullName: input.fullName.trim() || existing?.fullName || "Business Owner",
            email: cleanEmail || existing?.email || "",
            mobile: cleanMobile || existing?.mobile || "",
            preferredSignIn:
              input.preferredSignIn ||
              existing?.preferredSignIn ||
              (cleanEmail ? "email" : "mobile"),
            verifiedSimulation:
              input.verifiedSimulation !== undefined
                ? input.verifiedSimulation
                : (existing?.verifiedSimulation ?? true),
            verifiedAt:
              input.verifiedSimulation || existing?.verifiedSimulation
                ? existing?.verifiedAt || now()
                : undefined,
            createdAt: existing?.createdAt || now(),
          };

          const nextIdentities = existingList.some((x) => x.id === identity.id)
            ? existingList.map((x) => (x.id === identity.id ? identity : x))
            : [identity, ...existingList];

          set({
            personalIdentity: identity,
            identities: nextIdentities,
          });
          get().log({
            kind: "identity.upserted",
            message: `Personal identity “${identity.fullName}” (${identity.preferredSignIn}: ${identity.preferredSignIn === "email" ? identity.email || identity.mobile : identity.mobile || identity.email}) simulated & verified`,
          });
          return identity;
        },
        upsertMembership: (input) => {
          const s = get();
          const existingMemberships = s.memberships || [];
          const existing = existingMemberships.find(
            (m) => m.identityId === input.identityId && m.orgId === input.orgId,
          );

          // If not an internal fixture setup, enforce strict membership mutation boundaries
          if (!input._isInternalFixtureSetup) {
            // Check 1: Target organisation must match active organisation context
            if (!s.organisation || s.organisation.id !== input.orgId) {
              get().log({
                kind: "membership.rejected",
                message: `Membership mutation rejected: target organisation (${input.orgId}) does not match active context (${s.organisation?.id || "none"})`,
              });
              return null;
            }

            // Check 2: Caller must have an active identity
            if (!s.personalIdentity) {
              get().log({
                kind: "membership.rejected",
                message: `Membership mutation rejected: unauthenticated caller cannot modify memberships`,
              });
              return null;
            }

            // Check 3: Caller must hold an active Owner or Admin membership in the organisation
            const callerMembership = existingMemberships.find(
              (m) =>
                m.identityId === s.personalIdentity?.id &&
                m.orgId === input.orgId &&
                m.status === "active",
            );
            if (
              !callerMembership ||
              (callerMembership.role !== "owner" && callerMembership.role !== "admin")
            ) {
              get().log({
                kind: "membership.rejected",
                message: `Membership mutation rejected: caller role (${callerMembership?.role || "none"}) lacks organisation membership management authority (R3-A boundary; team delegation deferred to R3-B)`,
              });
              return null;
            }

            // Check 4: Self-elevation guard (Requirement 2.1 & Test C)
            // Users cannot elevate their own role
            if (
              input.identityId === s.personalIdentity.id &&
              input.role !== callerMembership.role
            ) {
              get().log({
                kind: "membership.rejected",
                message: `Membership mutation rejected: self-elevation is strictly prohibited (${callerMembership.role} -> ${input.role})`,
              });
              return null;
            }

            // Check 5: Admin cannot assign Owner role (only Owner can)
            if (callerMembership.role === "admin" && input.role === "owner") {
              get().log({
                kind: "membership.rejected",
                message: `Membership mutation rejected: administrators cannot assign the Owner role`,
              });
              return null;
            }

            // Check 6: Deferred invitation activation (Requirement 2.6 & Test D)
            // Membership activation through invitation acceptance is deferred to R3-B
            if (existing?.status === "invited" && input.status === "active") {
              get().log({
                kind: "membership.rejected",
                message: `Membership mutation rejected: invitation activation requires token verification (deferred to R3-B)`,
              });
              return null;
            }
          }

          const membership: OrganisationMembership = {
            id: existing?.id || uid("mem"),
            identityId: input.identityId,
            orgId: input.orgId,
            role: input.role,
            status: input.status || "active",
            venueId: input.venueId ?? existing?.venueId,
            joinedAt: existing?.joinedAt || now(),
          };
          const nextMemberships = existing
            ? existingMemberships.map((m) => (m.id === membership.id ? membership : m))
            : [...existingMemberships, membership];
          set({ memberships: nextMemberships });
          get().log({
            kind: "membership.upserted",
            message: `Membership updated: identity ${input.identityId} as ${input.role} (${membership.status}) in ${input.orgId}`,
          });
          return membership;
        },
        seedScenarioMembership: (input) => {
          return get().upsertMembership({ ...input, _isInternalFixtureSetup: true });
        },
        createInvitation: (input) => {
          const s = get();
          const effectiveRole = getEffectiveBusinessRole(s);
          if (!s.organisation) {
            return { success: false, error: "No active organisation context." };
          }
          if (!canManageTeam(effectiveRole)) {
            return { success: false, error: "Unauthorized to invite team members." };
          }
          if (!canInviteRole(effectiveRole, input.role)) {
            return {
              success: false,
              error: `Role “${effectiveRole}” is not authorised to invite “${input.role}”.`,
            };
          }
          const cleanContact = input.recipientContact.trim().toLowerCase();
          if (!cleanContact) {
            return { success: false, error: "Recipient contact identifier is required." };
          }

          const callerMembership = getActiveOrganisationMembership(s);
          const requestedScopeType: ScopeType =
            input.scopeType ||
            (input.role === "owner" ||
            input.role === "admin" ||
            (!input.venueIds?.length && (effectiveRole === "owner" || effectiveRole === "admin"))
              ? "all"
              : "restricted");

          const managerVenues =
            effectiveRole === "manager"
              ? callerMembership?.venueIds && callerMembership.venueIds.length > 0
                ? callerMembership.venueIds
                : callerMembership?.venueId
                  ? [callerMembership.venueId]
                  : []
              : [];

          const assignedVenues =
            input.venueIds && input.venueIds.length > 0
              ? input.venueIds
              : effectiveRole === "manager" && managerVenues.length > 0 && !input.scopeType
                ? managerVenues
                : undefined;

          const managerStations =
            effectiveRole === "manager" &&
            callerMembership?.servicePoints &&
            callerMembership.servicePoints.length > 0
              ? callerMembership.servicePoints
              : undefined;

          let assignedServicePoints = input.servicePoints;

          // For restricted Manager: omitted servicePoints defaults to manager's authorised stations.
          // Explicitly empty servicePoints [] is rejected because it would confer venue-wide station access.
          if (effectiveRole === "manager" && managerStations) {
            if (assignedServicePoints === undefined) {
              assignedServicePoints = [...managerStations];
            } else if (assignedServicePoints.length === 0) {
              return {
                success: false,
                error:
                  "Managers restricted to specific stations cannot grant venue-wide station access.",
              };
            }
          }

          // Rule 2 & 1: Restricted Managers must not issue organisation-wide invitations
          if (effectiveRole === "manager") {
            if (callerMembership?.scopeType === "restricted" && requestedScopeType === "all") {
              return {
                success: false,
                error: "Restricted managers cannot issue organisation-wide invitations.",
              };
            }

            // Rule 1 & Rule 5: Manager scope containment
            if (assignedVenues && assignedVenues.length > 0) {
              const outOfScopeVenues = assignedVenues.filter((vid) => !managerVenues.includes(vid));
              if (outOfScopeVenues.length > 0) {
                return {
                  success: false,
                  error:
                    "Managers can only assign team members within their own assigned locations.",
                };
              }
            }

            if (managerStations && assignedServicePoints && assignedServicePoints.length > 0) {
              const managerStationsLower = managerStations.map((sp) => sp.toLowerCase().trim());
              const unpermittedStations = assignedServicePoints.filter(
                (sp) => !managerStationsLower.includes(sp.toLowerCase().trim()),
              );
              if (unpermittedStations.length > 0) {
                return {
                  success: false,
                  error: `Managers cannot delegate service points (${unpermittedStations.join(", ")}) beyond their own assigned stations.`,
                };
              }
            }
          }

          // Rule 3: Target organisation venue check (for all roles)
          const orgVenues = s.venues.filter((v) => v.orgId === s.organisation?.id);
          const orgVenueIds = orgVenues.map((v) => v.id);

          if (assignedVenues && assignedVenues.length > 0) {
            const foreignVenues = assignedVenues.filter((vid) => !orgVenueIds.includes(vid));
            if (foreignVenues.length > 0) {
              return {
                success: false,
                error: "Assigned locations must belong to the target organisation.",
              };
            }
          }

          // Validate selected service points against the selected venues' actual configured contexts
          if (
            assignedVenues &&
            assignedVenues.length > 0 &&
            assignedServicePoints &&
            assignedServicePoints.length > 0
          ) {
            const targetVenues = s.venues.filter((v) => assignedVenues.includes(v.id));
            const configuredContexts = targetVenues.flatMap((v) => v.serviceContexts || []);
            if (configuredContexts.length > 0) {
              const configuredLower = configuredContexts.map((c) => c.toLowerCase().trim());
              const unconfigured = assignedServicePoints.filter(
                (sp) => !configuredLower.includes(sp.toLowerCase().trim()),
              );
              if (unconfigured.length > 0) {
                return {
                  success: false,
                  error: `Selected service points (${unconfigured.join(", ")}) must be configured in the assigned venue(s).`,
                };
              }
            }
          }

          // Rule 6: Empty restricted assignments must not silently mean organisation-wide access
          if (requestedScopeType === "restricted") {
            if (!assignedVenues || assignedVenues.length === 0) {
              return {
                success: false,
                error: "Restricted invitations require at least one assigned location.",
              };
            }
          }

          const invitation: TeamInvitation = {
            id: uid("inv"),
            token: uid("tok"),
            orgId: s.organisation.id,
            orgName: s.organisation.name,
            recipientContact: cleanContact,
            recipientName: input.recipientName?.trim() || undefined,
            role: input.role,
            scopeType: requestedScopeType,
            venueIds: assignedVenues && assignedVenues.length > 0 ? assignedVenues : undefined,
            servicePoints:
              assignedServicePoints && assignedServicePoints.length > 0
                ? assignedServicePoints
                : undefined,
            invitedById: s.personalIdentity?.id || "unknown",
            invitedByName: s.personalIdentity?.fullName || "Team Member",
            createdAt: now(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: "pending",
          };

          set((state) => ({
            invitations: [invitation, ...(state.invitations || [])],
          }));

          get().log({
            kind: "team.invited",
            message: `Invited ${invitation.recipientContact} as ${invitation.role} to ${invitation.orgName} (${invitation.scopeType === "all" ? "Organisation-wide" : "Restricted scope"})`,
          });

          return { success: true, invitation };
        },
        cancelInvitation: (invitationId) => {
          const s = get();
          const effectiveRole = getEffectiveBusinessRole(s);
          if (!canManageTeam(effectiveRole) || !s.organisation) {
            return { success: false, error: "Unauthorized to cancel invitations." };
          }
          const invitation = (s.invitations || []).find((i) => i.id === invitationId);
          if (!invitation) {
            return { success: false, error: "Invitation not found." };
          }
          if (invitation.orgId !== s.organisation.id) {
            return { success: false, error: "Invitation belongs to another organisation." };
          }
          if (invitation.status !== "pending") {
            return {
              success: false,
              error: `Cannot cancel an invitation with status “${invitation.status}”.`,
            };
          }
          if (effectiveRole === "manager" && invitation.role !== "staff") {
            return { success: false, error: "Managers can only cancel staff invitations." };
          }

          set((state) => ({
            invitations: (state.invitations || []).map((i) =>
              i.id === invitationId ? { ...i, status: "cancelled", cancelledAt: now() } : i,
            ),
          }));

          get().log({
            kind: "team.invitation_cancelled",
            message: `Invitation for ${invitation.recipientContact} (${invitation.role}) was cancelled`,
          });

          return { success: true };
        },
        acceptInvitation: (tokenOrId, acceptingIdentityInput) => {
          const s = get();
          const invitation = (s.invitations || []).find(
            (i) => i.id === tokenOrId || i.token === tokenOrId,
          );
          if (!invitation) {
            return {
              success: false,
              error: "Invitation not found. Please check your invitation link.",
            };
          }

          if (invitation.status === "accepted") {
            return {
              success: false,
              error: `This invitation was already accepted on ${invitation.acceptedAt ? new Date(invitation.acceptedAt).toLocaleDateString() : "earlier"}. Invitations cannot be reused.`,
            };
          }
          if (invitation.status === "cancelled") {
            return {
              success: false,
              error:
                "This invitation was cancelled by the organisation. Please contact the inviter for a new invite.",
            };
          }
          if (
            invitation.status === "expired" ||
            new Date(invitation.expiresAt).getTime() < Date.now()
          ) {
            return {
              success: false,
              error:
                "This invitation has expired. Please request a new invitation from the business.",
            };
          }

          let targetIdentity = s.personalIdentity;
          if (acceptingIdentityInput) {
            targetIdentity = get().upsertPersonalIdentity(acceptingIdentityInput);
          }

          if (!targetIdentity) {
            return {
              success: false,
              error:
                "Personal identity required. Please register or verify your personal details to accept.",
            };
          }

          const recipientClean = invitation.recipientContact.trim().toLowerCase();
          const emailClean = (targetIdentity.email || "").trim().toLowerCase();
          const mobileClean = (targetIdentity.mobile || "").trim();

          const matches =
            (emailClean && emailClean === recipientClean) ||
            (mobileClean && mobileClean === recipientClean);

          if (!matches) {
            return {
              success: false,
              error: `Identity mismatch: You are currently signed in as “${targetIdentity.fullName}” (${emailClean || mobileClean || "no contact"}), but this invitation was issued to “${recipientClean}”. Please switch identity to accept.`,
            };
          }

          // Rule 5: Do not silently overwrite an existing active membership's role or scope through invitation acceptance
          const existingActiveMem = (s.memberships || []).find(
            (m) =>
              m.identityId === targetIdentity.id &&
              m.orgId === invitation.orgId &&
              m.status === "active",
          );
          if (existingActiveMem) {
            return {
              success: false,
              error: `You already hold an active “${ROLE_LABELS[existingActiveMem.role]}” membership in ${invitation.orgName}. An invitation cannot overwrite an existing active membership.`,
            };
          }

          const newMembership: OrganisationMembership = {
            id: uid("mem"),
            identityId: targetIdentity.id,
            orgId: invitation.orgId,
            role: invitation.role,
            status: "active",
            venueId: invitation.venueIds?.[0],
            venueIds: invitation.venueIds ? [...invitation.venueIds] : undefined,
            servicePoints: invitation.servicePoints ? [...invitation.servicePoints] : undefined,
            scopeType: invitation.scopeType,
            joinedAt: now(),
            invitedAt: invitation.createdAt,
            invitedBy: invitation.invitedById,
          };

          // Rule 2: Where a person already belongs to another organisation, acceptance must preserve that existing membership
          const nextMemberships = [
            ...(s.memberships || []).filter(
              (m) => !(m.identityId === targetIdentity.id && m.orgId === invitation.orgId),
            ),
            newMembership,
          ];

          const nextInvitations = (s.invitations || []).map((i) =>
            i.id === invitation.id
              ? {
                  ...i,
                  status: "accepted" as const,
                  acceptedAt: now(),
                  acceptedByIdentityId: targetIdentity.id,
                }
              : i,
          );

          // Rule 3 & 4: Provide a deterministic way to enter the newly joined organisation's workspace.
          // Immediately align active organisation context to the target organisation.
          const targetOrg: Organisation = (s.organisations || []).find(
            (o) => o.id === invitation.orgId,
          ) ||
            (s.organisation?.id === invitation.orgId ? s.organisation : null) ||
            KNOWN_ORGANISATIONS[invitation.orgId] || {
              id: invitation.orgId,
              name: invitation.orgName,
              businessType: "Food & Beverage",
              currency: "KES",
              status: "active" as const,
            };

          const nextOrganisations = (s.organisations || []).some((o) => o.id === targetOrg.id)
            ? (s.organisations || []).map((o) => (o.id === targetOrg.id ? targetOrg : o))
            : [...(s.organisations || []), targetOrg];

          set({
            memberships: nextMemberships,
            invitations: nextInvitations,
            organisations: nextOrganisations,
            organisation: targetOrg,
            role: invitation.role,
            personalIdentity: targetIdentity,
          });

          get().log({
            kind: "team.invitation_accepted",
            message: `${targetIdentity.fullName} accepted invitation as ${invitation.role} to ${invitation.orgName}`,
          });

          return { success: true, membership: newMembership };
        },
        declineInvitation: (tokenOrId) => {
          const s = get();
          const invitation = (s.invitations || []).find(
            (i) => i.id === tokenOrId || i.token === tokenOrId,
          );
          if (!invitation) return { success: false, error: "Invitation not found." };
          if (invitation.status !== "pending") {
            return {
              success: false,
              error: `Cannot decline invitation with status “${invitation.status}”.`,
            };
          }
          set((state) => ({
            invitations: (state.invitations || []).map((i) =>
              i.id === invitation.id ? { ...i, status: "cancelled", cancelledAt: now() } : i,
            ),
          }));
          get().log({
            kind: "team.invitation_declined",
            message: `Invitation for ${invitation.recipientContact} was declined`,
          });
          return { success: true };
        },
        updateMembershipScope: (input) => {
          const s = get();
          const effectiveRole = getEffectiveBusinessRole(s);
          if (!s.organisation || !canManageTeam(effectiveRole)) {
            return { success: false, error: "Unauthorized to update team membership." };
          }
          const targetMem = (s.memberships || []).find((m) => m.id === input.membershipId);
          if (!targetMem) {
            return { success: false, error: "Membership record not found." };
          }
          if (targetMem.orgId !== s.organisation.id) {
            return { success: false, error: "Membership belongs to another organisation." };
          }
          if (!canModifyMember(effectiveRole, targetMem)) {
            return {
              success: false,
              error: `Role “${effectiveRole}” is not authorised to modify a “${targetMem.role}” member.`,
            };
          }
          if (input.role && !canInviteRole(effectiveRole, input.role)) {
            return {
              success: false,
              error: `Role “${effectiveRole}” is not authorised to assign “${input.role}”.`,
            };
          }
          if (targetMem.role === "owner" && input.role && input.role !== "owner") {
            return {
              success: false,
              error: "Cannot alter or downgrade the organisation owner role.",
            };
          }

          const orgVenues = s.venues.filter((v) => v.orgId === s.organisation?.id);
          const orgVenueIds = orgVenues.map((v) => v.id);

          let nextServicePoints =
            input.servicePoints !== undefined ? input.servicePoints : targetMem.servicePoints;

          // Rule 1 & Rule 2: Manager containment checks
          if (effectiveRole === "manager") {
            const callerMem = getActiveOrganisationMembership(s);
            if (!callerMem) {
              return { success: false, error: "Caller membership not found or inactive." };
            }
            if (callerMem.scopeType === "restricted" && input.scopeType === "all") {
              return {
                success: false,
                error: "Restricted managers cannot grant organisation-wide access.",
              };
            }
            const managerVenues =
              callerMem.venueIds && callerMem.venueIds.length > 0
                ? callerMem.venueIds
                : callerMem.venueId
                  ? [callerMem.venueId]
                  : [];
            if (input.venueIds && input.venueIds.length > 0) {
              const unpermittedVenues = input.venueIds.filter(
                (vid) => !managerVenues.includes(vid),
              );
              if (unpermittedVenues.length > 0) {
                return {
                  success: false,
                  error:
                    "Managers can only assign team members within their own assigned locations.",
                };
              }
            }

            if (callerMem.servicePoints && callerMem.servicePoints.length > 0) {
              // Submitting an empty station list would confer venue-wide access; reject for restricted managers
              if (input.servicePoints && input.servicePoints.length === 0) {
                return {
                  success: false,
                  error:
                    "Managers restricted to specific stations cannot grant venue-wide station access.",
                };
              }
              if (nextServicePoints === undefined) {
                nextServicePoints = [...callerMem.servicePoints];
              }
              const managerStationsLower = callerMem.servicePoints.map((sp) =>
                sp.toLowerCase().trim(),
              );
              if (nextServicePoints && nextServicePoints.length > 0) {
                const unpermittedStations = nextServicePoints.filter(
                  (sp) => !managerStationsLower.includes(sp.toLowerCase().trim()),
                );
                if (unpermittedStations.length > 0) {
                  return {
                    success: false,
                    error: `Managers cannot delegate service points (${unpermittedStations.join(", ")}) beyond their own assigned stations.`,
                  };
                }
              }
            }
          }

          // Rule 3: Cross-organisation venue check
          if (input.venueIds && input.venueIds.length > 0) {
            const invalidVenues = input.venueIds.filter((vid) => !orgVenueIds.includes(vid));
            if (invalidVenues.length > 0) {
              return {
                success: false,
                error: "Assigned locations must belong to the current organisation.",
              };
            }
          }

          // Validate selected service points against the selected venues' actual configured contexts
          const targetVenueIds =
            input.venueIds || targetMem.venueIds || (targetMem.venueId ? [targetMem.venueId] : []);
          if (targetVenueIds.length > 0 && nextServicePoints && nextServicePoints.length > 0) {
            const targetVenues = s.venues.filter((v) => targetVenueIds.includes(v.id));
            const configuredContexts = targetVenues.flatMap((v) => v.serviceContexts || []);
            if (configuredContexts.length > 0) {
              const configuredLower = configuredContexts.map((c) => c.toLowerCase().trim());
              const unconfigured = nextServicePoints.filter(
                (sp) => !configuredLower.includes(sp.toLowerCase().trim()),
              );
              if (unconfigured.length > 0) {
                return {
                  success: false,
                  error: `Selected service points (${unconfigured.join(", ")}) must be configured in the assigned venue(s).`,
                };
              }
            }
          }

          // Rule 6: Empty restricted assignments check
          if (input.scopeType === "restricted") {
            if (targetVenueIds.length === 0) {
              return {
                success: false,
                error: "Restricted scope requires at least one assigned location.",
              };
            }
          }

          set((state) => ({
            memberships: (state.memberships || []).map((m) =>
              m.id === input.membershipId
                ? {
                    ...m,
                    role: input.role || m.role,
                    scopeType: input.scopeType !== undefined ? input.scopeType : m.scopeType,
                    venueIds: input.venueIds !== undefined ? input.venueIds : m.venueIds,
                    venueId: input.venueIds?.[0] ?? m.venueId,
                    servicePoints:
                      nextServicePoints && nextServicePoints.length > 0
                        ? nextServicePoints
                        : undefined,
                  }
                : m,
            ),
          }));

          get().log({
            kind: "team.scope_updated",
            message: `Updated operational scope for membership ${targetMem.id} (${input.role || targetMem.role}, ${input.scopeType})`,
          });

          return { success: true };
        },
        revokeMembership: (membershipId) => {
          const s = get();
          const effectiveRole = getEffectiveBusinessRole(s);
          if (!s.organisation || !canManageTeam(effectiveRole)) {
            return { success: false, error: "Unauthorized to revoke team memberships." };
          }
          const targetMem = (s.memberships || []).find((m) => m.id === membershipId);
          if (!targetMem) {
            return { success: false, error: "Membership record not found." };
          }
          if (targetMem.orgId !== s.organisation.id) {
            return { success: false, error: "Membership belongs to another organisation." };
          }

          const check = canRevokeMember(
            effectiveRole,
            s.personalIdentity?.id,
            targetMem,
            s.memberships || [],
          );
          if (!check.allowed) {
            return { success: false, error: check.reason };
          }

          set((state) => ({
            memberships: (state.memberships || []).map((m) =>
              m.id === membershipId ? { ...m, status: "revoked" as const, revokedAt: now() } : m,
            ),
          }));

          get().log({
            kind: "team.member_revoked",
            message: `Membership revoked for identity ${targetMem.identityId} (${targetMem.role}) in ${s.organisation.name}`,
          });

          return { success: true };
        },
        switchOrganisation: (orgId) => {
          const s = get();
          const identityId = s.personalIdentity?.id;
          if (!identityId) {
            return { success: false, error: "Personal identity required to switch organisation." };
          }
          const targetMembership = (s.memberships || []).find(
            (m) => m.identityId === identityId && m.orgId === orgId && m.status === "active",
          );
          if (!targetMembership) {
            return { success: false, error: "No active membership found in target organisation." };
          }
          const targetOrg: Organisation = (s.organisations || []).find((o) => o.id === orgId) ||
            (s.organisation?.id === orgId ? s.organisation : null) ||
            KNOWN_ORGANISATIONS[orgId] || {
              id: orgId,
              name: targetMembership.orgId,
              businessType: "Food & Beverage",
              currency: "KES",
              status: "active" as const,
            };

          set({
            organisation: targetOrg,
            role: targetMembership.role,
          });

          get().log({
            kind: "organisation.switched",
            message: `Active organisation switched to “${targetOrg.name}” (${ROLE_LABELS[targetMembership.role]})`,
          });

          return { success: true };
        },
        createAccessReference: (input) => {
          const s = get();
          const effectiveRole = getEffectiveBusinessRole(s);
          if (!canAuthorMenus(effectiveRole)) {
            return {
              success: false,
              error:
                "Unauthorized: only owners, administrators, and authorized managers can create menu access references.",
            };
          }

          const callerMembership = getActiveOrganisationMembership(s);
          if (!callerMembership || callerMembership.status !== "active") {
            return { success: false, error: "Active business membership required." };
          }

          // Operational scope containment for restricted managers (R3-B integration):
          if (effectiveRole === "manager" && callerMembership.scopeType === "restricted") {
            const allowedVenues =
              callerMembership.venueIds && callerMembership.venueIds.length > 0
                ? callerMembership.venueIds
                : callerMembership.venueId
                  ? [callerMembership.venueId]
                  : [];
            if (!allowedVenues.includes(input.venueId)) {
              return {
                success: false,
                error:
                  "Managers cannot create access references for venues outside their assigned scope.",
              };
            }
            if (callerMembership.servicePoints && callerMembership.servicePoints.length > 0) {
              if (!input.servicePoint) {
                return {
                  success: false,
                  error:
                    "Managers restricted to specific stations must assign an authorized service point.",
                };
              }
              const managerStationsLower = callerMembership.servicePoints.map((sp) =>
                sp.toLowerCase().trim(),
              );
              if (!managerStationsLower.includes(input.servicePoint.toLowerCase().trim())) {
                return {
                  success: false,
                  error: `Managers cannot create access references for service points (${input.servicePoint}) outside their assigned stations.`,
                };
              }
            }
          }

          // Validate venue belongs to current organization
          const orgVenues = s.venues.filter((v) => v.orgId === s.organisation?.id);
          const targetVenue = orgVenues.find((v) => v.id === input.venueId);
          if (!targetVenue) {
            return {
              success: false,
              error: "Selected venue does not belong to the current organisation.",
            };
          }

          // Validate target menu belongs to organization and is published
          const targetMenu = s.menus.find(
            (m) => m.id === input.menuId && m.orgId === s.organisation?.id,
          );
          if (!targetMenu) {
            return {
              success: false,
              error: "Selected menu does not belong to the current organisation.",
            };
          }
          if (targetMenu.status !== "published") {
            return {
              success: false,
              error: `Cannot generate access for a ${targetMenu.status} menu. Only published menus can receive access references.`,
            };
          }

          // Validate service point against venue configured contexts if available
          if (
            input.servicePoint &&
            targetVenue.serviceContexts &&
            targetVenue.serviceContexts.length > 0
          ) {
            const configuredLower = targetVenue.serviceContexts.map((c) => c.toLowerCase().trim());
            if (!configuredLower.includes(input.servicePoint.toLowerCase().trim())) {
              return {
                success: false,
                error: `Service point "${input.servicePoint}" is not configured on ${targetVenue.name}.`,
              };
            }
          }

          const existingRefs = s.accessReferences || [];
          const existingCodes = existingRefs.map((r) => r.shortCode);

          let finalCode = input.shortCode?.trim().toUpperCase();
          if (finalCode) {
            if (existingCodes.some((c) => c.toUpperCase() === finalCode)) {
              return {
                success: false,
                error: `Menu code "${finalCode}" is already in use. Please choose a unique code.`,
              };
            }
          } else {
            const prefixHint = targetVenue.slug.slice(0, 3).toUpperCase();
            finalCode = generateUniqueShortCode(existingCodes, prefixHint);
          }

          const channel = input.channel || "qr";
          const newRef: MenuAccessReference = {
            id: uid("acc"),
            orgId: s.organisation!.id,
            venueId: input.venueId,
            menuId: input.menuId,
            servicePoint: input.servicePoint?.trim() || undefined,
            shortCode: finalCode,
            channel,
            status: "active",
            type: targetMenu.isProtected ? "protected" : "public",
            label:
              input.label?.trim() ||
              `${targetMenu.name} · ${input.servicePoint || targetVenue.name} (${channel.toUpperCase()})`,
            customPrompt: input.customPrompt?.trim() || undefined,
            createdAt: now(),
            updatedAt: now(),
            createdById: s.personalIdentity?.id,
          };

          set((state) => ({
            accessReferences: [newRef, ...(state.accessReferences || [])],
          }));

          get().log({
            kind: "access.created",
            message: `Created ${newRef.channel.toUpperCase()} access reference "${newRef.label}" (${newRef.shortCode}) for ${targetMenu.name}`,
          });

          return { success: true, reference: newRef };
        },
        updateAccessReferenceStatus: (referenceId, status) => {
          const s = get();
          const effectiveRole = getEffectiveBusinessRole(s);
          if (!canAuthorMenus(effectiveRole)) {
            return { success: false, error: "Unauthorized to update access references." };
          }
          const existing = (s.accessReferences || []).find((r) => r.id === referenceId);
          if (!existing) {
            return { success: false, error: "Access reference not found." };
          }
          if (existing.orgId !== s.organisation?.id) {
            return {
              success: false,
              error: "Access reference belongs to a different organisation.",
            };
          }

          if (effectiveRole === "manager" && !canManageAccessReference(s, existing)) {
            return {
              success: false,
              error:
                "Unauthorized: access reference is outside your assigned venue or station scope.",
            };
          }

          set((state) => ({
            accessReferences: (state.accessReferences || []).map((r) =>
              r.id === referenceId
                ? {
                    ...r,
                    status,
                    updatedAt: now(),
                    disabledAt: status === "disabled" ? now() : undefined,
                  }
                : r,
            ),
          }));

          get().log({
            kind: "access.status_changed",
            message: `${status === "disabled" ? "Disabled" : "Re-enabled"} access reference "${existing.label}" (${existing.shortCode})`,
          });

          return { success: true };
        },
        regenerateAccessCode: (referenceId) => {
          const s = get();
          const effectiveRole = getEffectiveBusinessRole(s);
          if (!canAuthorMenus(effectiveRole)) {
            return { success: false, error: "Unauthorized to regenerate access codes." };
          }
          const existing = (s.accessReferences || []).find((r) => r.id === referenceId);
          if (!existing) {
            return { success: false, error: "Access reference not found." };
          }
          if (existing.orgId !== s.organisation?.id) {
            return {
              success: false,
              error: "Access reference belongs to a different organisation.",
            };
          }

          if (effectiveRole === "manager" && !canManageAccessReference(s, existing)) {
            return {
              success: false,
              error:
                "Unauthorized: access reference is outside your assigned venue or station scope.",
            };
          }

          const otherCodes = (s.accessReferences || [])
            .filter((r) => r.id !== referenceId)
            .map((r) => r.shortCode);
          const prefix = existing.shortCode.split("-")[0] || "PEWA";
          const newCode = generateUniqueShortCode(otherCodes, prefix);

          set((state) => ({
            accessReferences: (state.accessReferences || []).map((r) =>
              r.id === referenceId
                ? {
                    ...r,
                    shortCode: newCode,
                    updatedAt: now(),
                  }
                : r,
            ),
          }));

          get().log({
            kind: "access.code_regenerated",
            message: `Regenerated code for "${existing.label}": new code is ${newCode}`,
          });

          return { success: true, newCode };
        },
        deleteAccessReference: (referenceId) => {
          const s = get();
          const effectiveRole = getEffectiveBusinessRole(s);
          if (!canAuthorMenus(effectiveRole)) {
            return { success: false, error: "Unauthorized to delete access references." };
          }
          const existing = (s.accessReferences || []).find((r) => r.id === referenceId);
          if (!existing) {
            return { success: false, error: "Access reference not found." };
          }
          if (existing.orgId !== s.organisation?.id) {
            return {
              success: false,
              error: "Access reference belongs to a different organisation.",
            };
          }

          if (effectiveRole === "manager" && !canManageAccessReference(s, existing)) {
            return {
              success: false,
              error:
                "Unauthorized: access reference is outside your assigned venue or station scope.",
            };
          }

          set((state) => ({
            accessReferences: (state.accessReferences || []).filter((r) => r.id !== referenceId),
          }));

          get().log({
            kind: "access.deleted",
            message: `Deleted access reference "${existing.label}" (${existing.shortCode})`,
          });

          return { success: true };
        },
        saveOnboardingDraft: (draft) => {
          set((s) => {
            const defaultDraft: OnboardingDraft = {
              step: 0,
              fullName: s.personalIdentity?.fullName || "",
              personalEmail: s.personalIdentity?.email || "",
              personalMobile: s.personalIdentity?.mobile || "",
              preferredSignIn: s.personalIdentity?.preferredSignIn || "email",
              verificationSimulated: Boolean(s.personalIdentity?.verifiedSimulation),
              orgName: "",
              tradingName: "",
              category: "Café",
              businessType: "Café",
              isCustomCategory: false,
              customCategoryInput: "",
              country: "Kenya",
              currency: "KES",
              primaryBusinessContact: "",
              primaryContactVisibility: "private",
              venueName: "",
              tagline: "",
              brandBadge: "",
              phone: "",
              whatsapp: "",
              email: "",
              deliveryOnly: false,
              address: "",
              serviceArea: "",
              services: ["Dine-in", "Takeaway"],
              servicePointName: "Main Dining",
              additionalServiceContexts: [],
              menuName: "All-Day Menu",
            };
            return {
              onboardingDraft: {
                ...(s.onboardingDraft || defaultDraft),
                ...draft,
              },
            };
          });
        },
        clearOnboardingDraft: () => set({ onboardingDraft: null }),
        completeOnboarding: (i) => {
          const stateBefore = get();

          // Ensure personal identity is established or reused
          const identityInput = i.identity || {
            fullName: stateBefore.personalIdentity?.fullName || `${i.orgName.trim()} Founder`,
            email: stateBefore.personalIdentity?.email || i.email || "",
            mobile: stateBefore.personalIdentity?.mobile || i.phone || i.whatsapp || "",
            preferredSignIn: stateBefore.personalIdentity?.preferredSignIn || "email",
            verifiedSimulation: true,
          };
          const ownerIdentity = get().upsertPersonalIdentity(identityInput);

          const s = get();
          const cleanOrgName = i.orgName.trim();
          const cleanVenueName = (i.venueName || i.orgName).trim();

          // Idempotency guard (Requirement 3E & Scenario H):
          // If the active organisation already matches this onboarding submission, update in-place
          // rather than creating duplicate organisation, venue, or menu records.
          const isUpdatingExistingOrg =
            Boolean(s.organisation) &&
            s.organisation?.name.toLowerCase() === cleanOrgName.toLowerCase() &&
            s.organisation?.ownerIdentityId === ownerIdentity.id;

          const orgId = isUpdatingExistingOrg ? s.organisation!.id : uid("org");
          const existingOrgVenue = isUpdatingExistingOrg
            ? s.venues.find((v) => v.orgId === orgId)
            : undefined;
          const venueId = existingOrgVenue ? existingOrgVenue.id : uid("venue");

          const existingOrgMenus = isUpdatingExistingOrg
            ? s.menus.filter((m) => m.orgId === orgId)
            : [];
          const primaryExistingMenu = existingOrgMenus[0];
          const menuId = primaryExistingMenu ? primaryExistingMenu.id : uid("menu");

          let slug = existingOrgVenue?.slug || slugify(cleanVenueName || cleanOrgName);
          if (!existingOrgVenue && s.venues.some((v) => v.slug === slug)) {
            slug = `${slug}-${s.venues.length + 1}`;
          }

          // Contact privacy safeguard (Requirement 3B & Scenario J):
          // Only customer-facing contact channels (`i.phone`, `i.whatsapp`, `i.email`) are placed on the public Venue.
          // If `primaryContactVisibility === "public"` and a customer channel is blank, primaryBusinessContact may populate
          // the matching public channel; if `"private"`, `primaryBusinessContact` is stored strictly on `Organisation`
          // and never copied into public `venue.contact`.
          const visibility: ContactVisibility =
            i.primaryContactVisibility ||
            (isUpdatingExistingOrg ? s.organisation?.primaryContactVisibility : undefined) ||
            "private";
          const publicPhone = i.phone.trim();
          const publicWhatsapp = i.whatsapp.trim();
          const publicEmail = i.email.trim();

          const primaryContexts = [
            ...(i.servicePointName?.trim() ? [i.servicePointName.trim()] : []),
            ...(i.additionalServiceContexts || []).map((c) => c.trim()).filter(Boolean),
          ];
          const uniqueContexts = Array.from(new Set(primaryContexts));

          const effectiveAddress = i.deliveryOnly ? "" : i.address.trim();
          const effectiveServiceArea = i.deliveryOnly
            ? (i.serviceArea || i.address).trim()
            : (i.serviceArea || "").trim();

          const newMenus: Menu[] = isUpdatingExistingOrg
            ? s.menus.map((m) =>
                m.id === menuId ? { ...m, name: i.menuName.trim() || m.name, updatedAt: now() } : m,
              )
            : [
                {
                  id: menuId,
                  orgId,
                  venueId,
                  name: i.menuName.trim() || "All-Day Menu",
                  description: i.servicePointName?.trim()
                    ? `Service context: ${i.servicePointName.trim()}`
                    : undefined,
                  status: "draft",
                  sections: [],
                  updatedAt: now(),
                },
                // If hotel or multi-context setup specifies additional contexts (e.g., "In-Room Dining (Guests Only)"),
                // scaffold draft menus for those additional contexts without duplicating the primary menu.
                ...uniqueContexts
                  .filter((ctx) => ctx !== i.servicePointName?.trim())
                  .map((ctx) => ({
                    id: uid("menu"),
                    orgId,
                    venueId,
                    name: `${ctx} Menu`,
                    description: `Service context: ${ctx}`,
                    isProtected:
                      ctx.toLowerCase().includes("room") || ctx.toLowerCase().includes("guest"),
                    status: "draft" as MenuStatus,
                    sections: [],
                    updatedAt: now(),
                  })),
                ...s.menus.filter((m) => m.orgId !== s.organisation?.id),
              ];

          const foundingMembership: OrganisationMembership = {
            id: `mem_${orgId}_owner`,
            identityId: ownerIdentity.id,
            orgId,
            role: "owner",
            status: "active",
            venueId,
            joinedAt: now(),
          };

          set((prev) => {
            const otherMemberships = (prev.memberships || []).filter(
              (m) => !(m.identityId === ownerIdentity.id && m.orgId === orgId),
            );
            return {
              organisation: {
                id: orgId,
                name: cleanOrgName,
                tradingName:
                  i.tradingName?.trim() ||
                  (isUpdatingExistingOrg ? prev.organisation?.tradingName : undefined),
                businessType: i.businessType,
                category: i.category || i.businessType,
                country:
                  i.country?.trim() ||
                  (isUpdatingExistingOrg ? prev.organisation?.country : undefined) ||
                  "Kenya",
                currency: i.currency,
                primaryContact:
                  i.primaryBusinessContact?.trim() ||
                  (isUpdatingExistingOrg ? prev.organisation?.primaryContact : undefined),
                primaryContactVisibility: visibility,
                ownerIdentityId: ownerIdentity.id,
                status: "active",
              },
              venues: [
                {
                  id: venueId,
                  orgId,
                  name: cleanVenueName,
                  slug,
                  category: i.category || i.businessType,
                  address: effectiveAddress,
                  deliveryOnly: i.deliveryOnly,
                  serviceArea: effectiveServiceArea,
                  services: i.deliveryOnly
                    ? ["Delivery"]
                    : i.services.length > 0
                      ? i.services
                      : ["Dine-in"],
                  contact: {
                    phone: publicPhone,
                    whatsapp: publicWhatsapp,
                    email: publicEmail,
                  },
                  tagline: i.tagline?.trim() || "",
                  brandBadge:
                    i.brandBadge?.trim() ||
                    (existingOrgVenue ? existingOrgVenue.brandBadge : undefined),
                  serviceContexts:
                    uniqueContexts.length > 0 ? uniqueContexts : existingOrgVenue?.serviceContexts,
                  currency: i.currency,
                },
                ...prev.venues.filter(
                  (v) => v.orgId !== prev.organisation?.id && v.orgId !== orgId,
                ),
              ],
              menus: newMenus,
              memberships: [...otherMemberships, foundingMembership],
              onboardingDraft: null,
              role: "owner",
            };
          });

          get().log({
            kind: "org.created",
            message: `Organisation “${cleanOrgName}” registered with Owner membership for ${ownerIdentity.fullName}`,
          });
          get().log({
            kind: "menu.created",
            message: `Draft menu “${i.menuName}” created`,
          });
          return menuId;
        },
        addMenu: (nameOrInput, venueId) => {
          const s = get();
          if (!canAuthorMenus(getEffectiveBusinessRole(s)) || !s.organisation) {
            return "";
          }
          const org = s.organisation;
          const id = uid("menu");
          const orgId = org.id;

          if (typeof nameOrInput === "string") {
            const targetVenueId =
              venueId || (org ? s.venues.find((v) => v.orgId === org.id)?.id : s.venues[0]?.id);
            if (targetVenueId && !canActorOperateScope(s, { venueId: targetVenueId })) {
              return "";
            }
            set((state) => ({
              menus: [
                ...state.menus,
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

          if (targetVenueId && !canActorOperateScope(s, { venueId: targetVenueId })) {
            return "";
          }
          if (
            targetVenueIds &&
            targetVenueIds.some((vId) => !canActorOperateScope(s, { venueId: vId }))
          ) {
            return "";
          }

          const sections: Section[] = initialSections.map((secName) => ({
            id: uid("sec"),
            name: secName,
            offerings: [],
          }));

          set((state) => ({
            menus: [
              ...state.menus,
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
          const s = get();
          if (!canAuthorMenus(getEffectiveBusinessRole(s)) || !s.organisation) return;
          const m = s.menus.find((x) => x.id === menuId && x.orgId === s.organisation?.id);
          if (!m) return;
          if (
            !canActorOperateScope(s, {
              venueId: m.venueId,
              servicePoint: m.servicePointName,
            })
          ) {
            return;
          }
          if (updates.venueId && !canActorOperateScope(s, { venueId: updates.venueId })) {
            return;
          }
          set((state) => ({
            menus: state.menus.map((x) => {
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
          if (!canAuthorMenus(getEffectiveBusinessRole(s)) || !s.organisation) {
            return {
              success: false,
              action: "deleted",
              message: "Not authorised to delete or archive menus",
            };
          }
          const m = s.menus.find((x) => x.id === menuId && x.orgId === s.organisation?.id);
          if (!m) return { success: false, action: "deleted", message: "Menu not found" };
          if (
            !canActorOperateScope(s, {
              venueId: m.venueId,
              servicePoint: m.servicePointName,
            })
          ) {
            return {
              success: false,
              action: "deleted",
              message: "Not authorised for this location",
            };
          }

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
          const s = get();
          if (!canAuthorMenus(getEffectiveBusinessRole(s)) || !s.organisation) return "";
          const source = s.menus.find((x) => x.id === menuId && x.orgId === s.organisation?.id);
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
          set((state) => ({
            menus: [...state.menus, duplicated],
          }));
          get().log({ kind: "menu.duplicated", message: `Duplicated “${source.name}” as draft` });
          return newId;
        },
        addSection: (menuId, name, categoryTag) => {
          const ok = mutateMenu(menuId, (ss) => [
            ...ss,
            { id: uid("sec"), name, categoryTag, offerings: [] },
          ]);
          if (ok) {
            get().log({ kind: "section.created", message: `Section “${name}” added` });
          }
        },
        addSectionsBatch: (menuId, names) => {
          const cleanNames = names.map((n) => n.trim()).filter(Boolean);
          if (cleanNames.length === 0) return;
          const ok = mutateMenu(menuId, (ss) => {
            const existing = new Set(ss.map((s) => s.name.trim().toLowerCase()));
            const toAdd = cleanNames
              .filter((n) => !existing.has(n.toLowerCase()))
              .map((name) => ({ id: uid("sec"), name, offerings: [] }));
            return [...ss, ...toAdd];
          });
          if (ok) {
            get().log({
              kind: "section.created",
              message: `Added ${cleanNames.length} sections to menu`,
            });
          }
        },
        renameSection: (menuId, sectionId, name) => {
          mutateMenu(menuId, (ss) => ss.map((x) => (x.id === sectionId ? { ...x, name } : x)));
        },
        removeSection: (menuId, sectionId) => {
          mutateMenu(menuId, (ss) => ss.filter((x) => x.id !== sectionId));
        },
        moveSection: (menuId, sectionId, dir) => {
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
          });
        },
        reorderSections: (menuId, sectionIds) => {
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
          });
        },
        moveOfferingBetweenSections: (menuId, fromSectionId, toSectionId, offeringId) => {
          if (fromSectionId === toSectionId) return;
          let movedName = "";
          const ok = mutateMenu(menuId, (ss) => {
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
          if (ok && movedName) {
            get().log({
              kind: "offering.moved",
              message: `Moved “${movedName}” to another section`,
            });
          }
        },
        upsertOffering: (menuId, sectionId, o) => {
          let isNew = false;
          const sanitizedOffering: Partial<Offering> = {
            ...o,
            venueOverrides: sanitizeVenueOverrides(o.venueOverrides),
          };
          const ok = mutateMenu(menuId, (ss) =>
            ss.map((x) => {
              if (x.id !== sectionId) return x;
              const exists = o.id ? x.offerings.some((y) => y.id === o.id) : false;
              if (!exists) {
                isNew = true;
                const newItem: Offering = {
                  ...sanitizedOffering,
                  id: o.id || uid("off"),
                } as Offering;
                return { ...x, offerings: [...x.offerings, newItem] };
              }
              return {
                ...x,
                offerings: x.offerings.map((y) =>
                  y.id === o.id ? ({ ...y, ...sanitizedOffering } as Offering) : y,
                ),
              };
            }),
          );
          if (ok) {
            get().log({
              kind: isNew ? "offering.created" : "offering.updated",
              message: `${isNew ? "Added" : "Updated"} “${o.name}”`,
            });
          }
        },
        duplicateOffering: (menuId, sectionId, offeringId) => {
          let newId = "";
          let clonedName = "";
          const ok = mutateMenu(menuId, (ss) =>
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
          if (ok && clonedName) {
            get().log({
              kind: "offering.created",
              message: `Duplicated offering “${clonedName}”`,
            });
          }
          return ok ? newId : "";
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
        removeOffering: (menuId, sectionId, offeringId) => {
          mutateMenu(menuId, (ss) =>
            ss.map((x) =>
              x.id === sectionId
                ? { ...x, offerings: x.offerings.filter((y) => y.id !== offeringId) }
                : x,
            ),
          );
        },
        toggleAvailability: (menuId, sectionId, offeringId) => {
          let name = "";
          let avail = true;
          const ok = mutateMenu(
            menuId,
            (ss) =>
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
            { allowAvailabilityOnly: true },
          );
          if (!ok || !name) return;
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
          const ok = mutateMenu(menuId, (ss) =>
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
          if (ok && offName) {
            get().log({
              kind: "offering.updated",
              message: `Updated schedule for “${offName}”`,
            });
          }
        },
        setOfferingVenueOverride: (menuId, sectionId, offeringId, venueId, override) => {
          let offName = "";
          const ok = mutateMenu(
            menuId,
            (ss) =>
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
            { venueId },
          );
          if (ok && offName) {
            get().log({
              kind: "offering.updated",
              message: `Updated venue override for “${offName}”`,
            });
          }
        },
        removeOfferingVenueOverride: (menuId, sectionId, offeringId, venueId) => {
          mutateMenu(
            menuId,
            (ss) =>
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
            { venueId },
          );
        },
        toggleOfferingVenueAvailability: (menuId, sectionId, offeringId, venueId) => {
          let offName = "";
          let newAvail = false;
          const ok = mutateMenu(
            menuId,
            (ss) =>
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
            { allowAvailabilityOnly: true, venueId },
          );
          if (!ok || !offName) return;
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
          const s = get();
          if (!canAuthorMenus(getEffectiveBusinessRole(s)) || !s.organisation) return;
          const currentOrgId = s.organisation.id;
          const list = s.sharedOfferings || [];
          const existing = list.find((x) => x.id === sharedOffering.id);

          // Enforce organisation isolation: cannot create or modify shared offerings for another organisation
          if (existing && existing.orgId && existing.orgId !== currentOrgId) {
            return;
          }
          if (sharedOffering.orgId && sharedOffering.orgId !== currentOrgId) {
            return;
          }

          const sanitized: SharedOffering = {
            ...sharedOffering,
            orgId: sharedOffering.orgId || currentOrgId,
            venueOverrides: sanitizeVenueOverrides(sharedOffering.venueOverrides),
          };

          set((state) => {
            const curList = state.sharedOfferings || [];
            const idx = curList.findIndex((x) => x.id === sanitized.id);
            const nextList =
              idx >= 0
                ? curList.map((x) => (x.id === sanitized.id ? sanitized : x))
                : [...curList, sanitized];
            return { sharedOfferings: nextList };
          });
          get().log({
            kind: "shared_offering.updated",
            message: `Shared offering “${sanitized.name}” saved to catalogue`,
          });
        },
        deleteSharedOffering: (sharedOfferingId) => {
          const s = get();
          if (!canAuthorMenus(getEffectiveBusinessRole(s)) || !s.organisation) return;
          const currentOrgId = s.organisation.id;
          const existing = (s.sharedOfferings || []).find((x) => x.id === sharedOfferingId);
          if (!existing) return;
          // Enforce organisation isolation: cannot delete another organisation's shared offering
          if (existing.orgId && existing.orgId !== currentOrgId) {
            return;
          }

          set((state) => ({
            sharedOfferings: (state.sharedOfferings || []).filter((x) => x.id !== sharedOfferingId),
          }));
          get().log({
            kind: "shared_offering.deleted",
            message: `Deleted shared offering ${sharedOfferingId}`,
          });
        },
        addSharedOfferingToMenu: (menuId, sectionId, sharedOfferingId) => {
          const s = get();
          if (!canAuthorMenus(getEffectiveBusinessRole(s)) || !s.organisation) return "";
          const menu = s.menus.find((m) => m.id === menuId && m.orgId === s.organisation?.id);
          if (!menu) return "";
          const shared = (s.sharedOfferings || []).find((x) => x.id === sharedOfferingId);
          if (!shared) return "";

          // Enforce organisation isolation: shared offering must belong to the active menu's organisation
          if (shared.orgId && menu.orgId && shared.orgId !== menu.orgId) {
            return "";
          }

          const newId = uid("off");
          const newOffering: Offering = {
            id: newId,
            sharedOfferingId: shared.id,
            name: shared.name,
            description: shared.description || "",
            price: shared.price,
            tags: [...(shared.tags || [])],
            emoji: shared.emoji || "🍽️",
            image: shared.image,
            imageSource: shared.imageSource,
            modifiers: JSON.parse(JSON.stringify(shared.modifiers || [])),
            specialBadge: shared.specialBadge,
            schedule: shared.schedule ? structuredClone(shared.schedule) : undefined,
            venueOverrides: sanitizeVenueOverrides(shared.venueOverrides),
            available: true,
          };
          const ok = mutateMenu(menuId, (ss) =>
            ss.map((sec) =>
              sec.id === sectionId ? { ...sec, offerings: [...sec.offerings, newOffering] } : sec,
            ),
          );
          if (!ok) return "";
          get().log({
            kind: "offering.created",
            message: `Added shared offering “${shared.name}” to menu`,
          });
          return newId;
        },
        publishMenu: (menuId) => {
          const s = get();
          if (!canAuthorMenus(getEffectiveBusinessRole(s)) || !s.organisation) return false;
          const m = s.menus.find((x) => x.id === menuId && x.orgId === s.organisation?.id);
          if (!m) return false;
          if (
            !canActorOperateScope(s, {
              venueId: m.venueId,
              servicePoint: m.servicePointName,
            })
          ) {
            return false;
          }
          if (m.sections.length === 0 || !m.sections.some((sec) => sec.offerings.length > 0)) {
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
            sharedOfferingsSnapshot: JSON.parse(
              JSON.stringify(
                (s.sharedOfferings || []).filter((so) => !so.orgId || so.orgId === m.orgId),
              ),
            ),
          };
          set((state) => ({
            menus: state.menus.map((x) =>
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
          const s = get();
          if (!canAuthorMenus(getEffectiveBusinessRole(s)) || !s.organisation) return;
          const m = s.menus.find((x) => x.id === menuId && x.orgId === s.organisation?.id);
          if (!m) return;
          if (
            !canActorOperateScope(s, {
              venueId: m.venueId,
              servicePoint: m.servicePointName,
            })
          ) {
            return;
          }
          set((state) => ({
            menus: state.menus.map((x) =>
              x.id === menuId ? { ...x, status: "hidden" as MenuStatus, updatedAt: now() } : x,
            ),
          }));
          get().log({ kind: "menu.hidden", message: `Menu “${m.name}” hidden from public view` });
        },
        hideMenu: (menuId) => {
          get().unpublishMenu(menuId);
        },
        archiveMenu: (menuId) => {
          const s = get();
          if (!canAuthorMenus(getEffectiveBusinessRole(s)) || !s.organisation) return;
          const m = s.menus.find((x) => x.id === menuId && x.orgId === s.organisation?.id);
          if (!m) return;
          if (
            !canActorOperateScope(s, {
              venueId: m.venueId,
              servicePoint: m.servicePointName,
            })
          ) {
            return;
          }
          set((state) => ({
            menus: state.menus.map((x) =>
              x.id === menuId ? { ...x, status: "archived" as MenuStatus, updatedAt: now() } : x,
            ),
          }));
          get().log({ kind: "menu.archived", message: `Menu “${m.name}” archived` });
        },
        discardDraftChanges: (menuId) => {
          const s = get();
          if (!canAuthorMenus(getEffectiveBusinessRole(s)) || !s.organisation) return;
          const m = s.menus.find((x) => x.id === menuId && x.orgId === s.organisation?.id);
          if (!m || !m.publishedSnapshot) return;
          if (
            !canActorOperateScope(s, {
              venueId: m.venueId,
              servicePoint: m.servicePointName,
            })
          ) {
            return;
          }
          const snap = m.publishedSnapshot;
          set((state) => ({
            menus: state.menus.map((x) =>
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
          const s = get();
          if (!canAuthorMenus(getEffectiveBusinessRole(s)) || !s.organisation) return;
          const m = s.menus.find((x) => x.id === menuId && x.orgId === s.organisation?.id);
          if (!m) return;
          set((state) => ({
            menus: state.menus.map((x) =>
              x.id === menuId
                ? ({
                    ...x,
                    status,
                    updatedAt: now(),
                  } as Menu)
                : x,
            ),
          }));
          get().log({ kind: `menu.${status}`, message: `Menu “${m.name}” is now ${status}` });
        },
        setOrganisationStatus: (orgId, status, note) => {
          const s = get();
          if (!canAccessOperatorConsole(s.role)) return;
          set((state) => ({
            organisation:
              state.organisation?.id === orgId
                ? { ...state.organisation, status, statusNote: note }
                : state.organisation,
          }));
          get().log({
            kind: "operator.org_status",
            message: `Organisation status set to ${status}${note ? ` (${note})` : ""}`,
          });
        },
        resolveDisputeCase: (caseId, resolution, adjustmentUnits, note) => {
          const s = get();
          if (!canAccessOperatorConsole(s.role)) return;
          set((state) => {
            const nextDisputes = state.disputes.map((d) =>
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
                    ...state.orderPolicy,
                    included: state.orderPolicy.included + adjustmentUnits,
                  }
                : state.orderPolicy;
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
          const s = get();
          if (!canAccessOperatorConsole(s.role)) return;
          set((state) => ({
            moderationCases: state.moderationCases.map((m) =>
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

/**
 * Returns the active organisation membership for a given personal identity and organisation.
 * Conceptually separates reusable personal identity from per-organisation membership & role (R3-A).
 */
export function getActiveOrganisationMembership(state: {
  personalIdentity?: PersonalIdentity | null | undefined;
  organisation?: PewaState["organisation"] | undefined;
  memberships?: OrganisationMembership[] | undefined;
}): OrganisationMembership | undefined {
  const identityId = state.personalIdentity?.id;
  const orgId = state.organisation?.id;
  if (!identityId || !orgId) return undefined;
  return (state.memberships || []).find(
    (m) => m.identityId === identityId && m.orgId === orgId && m.status === "active",
  );
}

/**
 * Resolves the effective business role from the active identity's organisation membership,
 * failing closed (`"customer"`) when an organisation exists without a matching active membership,
 * or when personalIdentity / memberships are missing (R3-A CORR-001).
 *
 * NOTE: This is a deterministic client-side prototype model and NOT production security enforcement.
 */
export function getEffectiveBusinessRole(state: {
  role: Role;
  personalIdentity?: PersonalIdentity | null | undefined;
  organisation?: PewaState["organisation"] | undefined;
  memberships?: OrganisationMembership[] | undefined;
}): Role {
  // Preserve customer guest flow and separate PEWA platform-operator demonstration flow
  if (!isBusinessRole(state.role)) return state.role;

  // Fail closed when no organisation, no personal identity, or no active matching membership exists
  if (!state.organisation || !state.personalIdentity) {
    return "customer";
  }

  const activeMembership = getActiveOrganisationMembership(state);
  if (!activeMembership) {
    return "customer";
  }

  return activeMembership.role;
}

export function hasActiveBusinessMembership(state: {
  role: Role;
  personalIdentity?: PersonalIdentity | null | undefined;
  organisation?: PewaState["organisation"] | undefined;
  memberships?: OrganisationMembership[] | undefined;
}): boolean {
  const effectiveRole = getEffectiveBusinessRole(state);
  return isBusinessRole(effectiveRole);
}

export const canAuthorMenus = (r: Role) => r === "owner" || r === "admin" || r === "manager";
export const canToggleAvailability = (r: Role) => canAuthorMenus(r) || r === "staff";
export const canManageOrders = (r: Role) => canAuthorMenus(r) || r === "staff";
export const canManageBilling = (r: Role) => r === "owner" || r === "admin";
export const canManagePromotions = (r: Role) => r === "owner" || r === "admin" || r === "manager";
export const canManageTeam = (r: Role) => r === "owner" || r === "admin" || r === "manager";
export const canViewActivity = (r: Role) => isBusinessRole(r);
export const isBusinessRole = (r: Role) => r !== "customer" && r !== "operator";
export const canAccessOperatorConsole = (r: Role) => r === "operator";

export function canInviteRole(actorRole: Role, targetRole: MembershipRole): boolean {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") return targetRole !== "owner";
  if (actorRole === "manager") return targetRole === "staff";
  return false;
}

export function canModifyMember(
  actorRole: Role,
  targetMembership: OrganisationMembership,
): boolean {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") return targetMembership.role !== "owner";
  if (actorRole === "manager") return targetMembership.role === "staff";
  return false;
}

export function canRevokeMember(
  actorRole: Role,
  actorIdentityId: string | undefined,
  targetMembership: OrganisationMembership,
  allMemberships: OrganisationMembership[],
): { allowed: boolean; reason?: string } {
  if (actorIdentityId && targetMembership.identityId === actorIdentityId) {
    return { allowed: false, reason: "Self-revocation is prohibited to protect access." };
  }
  if (targetMembership.role === "owner") {
    const activeOwners = allMemberships.filter(
      (m) => m.orgId === targetMembership.orgId && m.role === "owner" && m.status === "active",
    );
    if (activeOwners.length <= 1) {
      return { allowed: false, reason: "Cannot revoke the sole active organisation Owner." };
    }
  }
  if (actorRole === "owner") {
    return { allowed: true };
  }
  if (actorRole === "admin") {
    if (targetMembership.role === "owner") {
      return { allowed: false, reason: "Administrators cannot revoke an Owner." };
    }
    return { allowed: true };
  }
  if (actorRole === "manager") {
    if (targetMembership.role !== "staff") {
      return { allowed: false, reason: "Managers can only revoke Staff members." };
    }
    return { allowed: true };
  }
  return { allowed: false, reason: "Insufficient permissions to revoke team members." };
}

/**
 * Validates operational scope for an actor against a target venue and/or service point.
 * Owners and Administrators have organisation-wide access.
 * Managers and Staff must be explicitly assigned to the venue and service point.
 */
export function canActorOperateScope(
  state: {
    role: Role;
    personalIdentity?: PersonalIdentity | null | undefined;
    organisation?: PewaState["organisation"] | undefined;
    memberships?: OrganisationMembership[] | undefined;
  },
  target: {
    venueId?: string | undefined;
    servicePoint?: string | undefined;
  },
): boolean {
  const role = getEffectiveBusinessRole(state);
  if (!isBusinessRole(role)) return false;
  if (role === "owner" || role === "admin") return true;

  const activeMembership = getActiveOrganisationMembership(state);
  if (!activeMembership || activeMembership.status !== "active") return false;

  if (activeMembership.scopeType === "all") return true;

  const assignedVenues =
    activeMembership.venueIds && activeMembership.venueIds.length > 0
      ? activeMembership.venueIds
      : activeMembership.venueId
        ? [activeMembership.venueId]
        : [];

  if (assignedVenues.length === 0) {
    return false;
  }

  if (target.venueId && !assignedVenues.includes(target.venueId)) {
    return false;
  }

  if (target.servicePoint) {
    if (activeMembership.servicePoints !== undefined) {
      if (activeMembership.servicePoints.length === 0) {
        return false;
      }
      const actorPoints = activeMembership.servicePoints.map((p) => p.toLowerCase().trim());
      if (!actorPoints.includes(target.servicePoint.toLowerCase().trim())) {
        return false;
      }
    }
  }

  return true;
}

function canManageAccessReference(
  state: Parameters<typeof canActorOperateScope>[0],
  reference: MenuAccessReference,
): boolean {
  const membership = getActiveOrganisationMembership(state as PewaState);
  if (!membership || membership.scopeType !== "restricted") return true;
  const venueAllowed = canActorOperateScope(state, { venueId: reference.venueId });
  if (!venueAllowed) return false;
  if (membership.servicePoints === undefined) return true;
  if (!reference.servicePoint || membership.servicePoints.length === 0) return false;
  const assigned = membership.servicePoints.map((point) => point.toLowerCase().trim());
  return assigned.includes(reference.servicePoint.toLowerCase().trim());
}

export const formatPrice = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

export interface MenuAccessResolutionResult {
  success: boolean;
  error?: string | undefined;
  reference?: MenuAccessReference | undefined;
  venue?: Venue | undefined;
  menu?: Menu | undefined;
  isProtected?: boolean | undefined;
  targetUrl?: string | undefined;
}

export function generateUniqueShortCode(existingCodes: string[], prefixHint?: string): string {
  const sanitize = (str: string) => str.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const basePrefix =
    prefixHint && prefixHint.trim().length > 0 ? sanitize(prefixHint).slice(0, 4) : "PEWA";
  const existingUpper = new Set(existingCodes.map((c) => c.toUpperCase()));

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 200; attempt++) {
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const candidate = `${basePrefix}-${suffix}`;
    if (!existingUpper.has(candidate)) {
      return candidate;
    }
  }
  return `${basePrefix}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

/**
 * Validates and extracts PEWA access parameters (shortCode or accessId) from raw QR payloads.
 * Recognizes PEWA short codes, direct short-code URLs (/c/:code), menu URLs (/m/:slug?code=...),
 * and WhatsApp concierge prompts. Rejects unsupported, invalid, and non-PEWA QR payloads.
 */
export function parsePewaQrPayload(
  raw: string,
  currentOrigin?: string,
): { code?: string | undefined; accessId?: string | undefined } | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. Direct short-code format: e.g. "GGC-DINE", "HRZ-ROOM", "CB-DEL", "GC-8K2A"
  const shortCodeRegex = /^[A-Za-z0-9]{2,8}-[A-Za-z0-9]{2,8}$/;
  if (shortCodeRegex.test(trimmed)) {
    return { code: trimmed.toUpperCase() };
  }

  // 2. URL payloads (absolute or relative)
  try {
    let url: URL;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      url = new URL(trimmed);
    } else if (trimmed.startsWith("/")) {
      url = new URL(trimmed, "https://pewa.local");
    } else {
      return null;
    }

    const host = url.hostname.toLowerCase();
    const isPewaHost =
      host === "pewa.app" ||
      host.endsWith(".pewa.app") ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "wa.me" ||
      (currentOrigin !== undefined && url.origin === currentOrigin);
    if (!isPewaHost && trimmed.startsWith("http")) return null;

    // A. Direct short code route: /c/:code
    const codePathMatch = url.pathname.match(/^\/c\/([A-Za-z0-9_-]+)\/?$/i);
    if (codePathMatch && codePathMatch[1]) {
      return { code: codePathMatch[1].toUpperCase() };
    }

    // B. Menu route with query parameters: /m/:slug?code=... or ?access=...
    if (/^\/m\/[^/]+\/?$/i.test(url.pathname)) {
      const codeParam = url.searchParams.get("code")?.trim().toUpperCase();
      const accessParam = url.searchParams.get("access")?.trim();
      if (codeParam || accessParam) {
        return {
          code: codeParam || undefined,
          accessId: accessParam || undefined,
        };
      }
    }

    // C. WhatsApp concierge link containing a menu code in query text
    if (url.hostname.includes("wa.me") || url.pathname.includes("whatsapp")) {
      const textParam = url.searchParams.get("text") || "";
      const extractedCode = textParam.match(/\b([A-Za-z0-9]{2,8}-[A-Za-z0-9]{2,8})\b/);
      if (extractedCode && extractedCode[1]) {
        return { code: extractedCode[1].toUpperCase() };
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveMenuAccess(
  input: {
    code?: string | undefined;
    accessId?: string | undefined;
    venueId?: string | undefined;
  },
  state: PewaState,
): MenuAccessResolutionResult {
  const codeParam = input.code?.trim().toUpperCase();
  const idParam = input.accessId?.trim();

  if (!codeParam && !idParam) {
    return { success: false, error: "No menu code or access identifier provided." };
  }

  const accessRefs = state.accessReferences || [];
  const byId = idParam ? accessRefs.find((r) => r.id === idParam) : undefined;
  const byCode = codeParam
    ? accessRefs.find((r) => r.shortCode.toUpperCase() === codeParam)
    : undefined;
  if (idParam && codeParam && (!byId || !byCode || byId.id !== byCode.id)) {
    return {
      success: false,
      error: "The menu code and access identifier do not refer to the same access reference.",
    };
  }
  const ref = byId || byCode;

  if (!ref) {
    return {
      success: false,
      error: "Invalid or unknown menu code. Please verify the code or scan again.",
    };
  }

  if (ref.status === "disabled") {
    return {
      success: false,
      error: "This menu access reference has been disabled by the business.",
      reference: ref,
    };
  }

  const allVenues = getAuthoritativeVenues(state);
  const venue = allVenues.find((v) => v.id === ref.venueId);
  if (!venue) {
    return {
      success: false,
      error: "The venue associated with this menu is no longer available.",
      reference: ref,
    };
  }

  // Cross-venue reference integrity (CORR-C):
  // When resolving in the context of a specific venue page, the reference must belong to that venue.
  if (input.venueId && ref.venueId !== input.venueId) {
    return {
      success: false,
      error: "Cross-venue access error: access reference does not match this location.",
      reference: ref,
      venue,
    };
  }

  // Cross-organisation reference integrity (Scenario L):
  // The venue's organization must match the access reference organization.
  if (venue.orgId !== ref.orgId) {
    return {
      success: false,
      error: "Security validation error: access reference does not match venue organisation.",
      reference: ref,
      venue,
    };
  }

  const allMenus = getAuthoritativeMenus(state);
  const menu = allMenus.find((m) => m.id === ref.menuId);
  if (!menu) {
    return {
      success: false,
      error: "The referenced menu could not be found.",
      reference: ref,
      venue,
    };
  }

  // Check publication state (Scenario G & K):
  // Draft, archived or unpublished menus cannot be accessed via customer access links.
  if (menu.status !== "published") {
    return {
      success: false,
      error: `This menu is currently ${menu.status}. Only published menus can be accessed by customers.`,
      reference: ref,
      venue,
      menu,
    };
  }

  // Protected menu check
  const isProtected = Boolean(menu.isProtected || ref.type === "protected");

  const queryParams = new URLSearchParams();
  queryParams.set("menu", menu.id);
  queryParams.set("access", ref.id);
  queryParams.set("code", ref.shortCode);
  if (ref.servicePoint) {
    queryParams.set("sp", ref.servicePoint);
  }
  if (ref.channel) {
    queryParams.set("channel", ref.channel);
  }

  const targetUrl = `/m/${venue.slug}?${queryParams.toString()}`;

  return {
    success: true,
    reference: ref,
    venue,
    menu,
    isProtected,
    targetUrl,
  };
}
