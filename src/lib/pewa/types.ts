export type Role = "customer" | "owner" | "admin" | "manager" | "staff" | "operator";
export type MenuStatus = "draft" | "published" | "hidden" | "archived";

export type ScenarioId =
  | "new-cafe"
  | "established-restaurant"
  | "multi-brand"
  | "hotel"
  | "delivery-only"
  | "units-available"
  | "zero-units"
  | "expired-beyond-grace"
  | "admitted-pending"
  | "duplicate-accept"
  | "withdraw-vs-accept"
  | "unavailable-item"
  | "outdated-price"
  | "channel-unavailable"
  | "protected-denied"
  | "sponsored-campaign";

export type OrgStatus = "active" | "suspended" | "pending_review";

export interface Organisation {
  id: string;
  name: string;
  businessType: string;
  category?: string | undefined;
  currency: string;
  status?: OrgStatus | undefined;
  statusNote?: string | undefined;
}

export interface Venue {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  address: string;
  deliveryOnly: boolean;
  serviceArea: string;
  services: string[];
  contact: { phone: string; whatsapp: string; email: string };
  tagline: string;
  currency: string;
  category?: string | undefined;
  businessCategory?: string | undefined;
}

export interface ModifierGroup {
  id: string;
  name: string;
  options: { id: string; name: string; priceDelta: number }[];
}

export interface Offering {
  id: string;
  name: string;
  description: string;
  price: number;
  tags: string[];
  available: boolean;
  modifiers: ModifierGroup[];
  emoji: string;
  specialBadge?: string | undefined;
  image?: string | undefined;
  imageSource?: "library" | "upload" | undefined;
}

export interface Section {
  id: string;
  name: string;
  description?: string | undefined;
  categoryTag?: string | undefined;
  offerings: Offering[];
}

export interface MenuPublishedSnapshot {
  name: string;
  description?: string | undefined;
  coverImage?: string | undefined;
  venueId?: string | undefined;
  venueIds?: string[] | undefined;
  isProtected?: boolean | undefined;
  sections: Section[];
  publishedAt: string;
}

export interface Menu {
  id: string;
  orgId: string;
  venueId?: string | undefined;
  venueIds?: string[] | undefined;
  name: string;
  description?: string | undefined;
  coverImage?: string | undefined;
  status: MenuStatus;
  sections: Section[];
  updatedAt: string;
  publishedAt?: string | undefined;
  isProtected?: boolean | undefined;
  publishedSnapshot?: MenuPublishedSnapshot | undefined;
}

export interface ActivityEvent {
  id: string;
  at: string;
  role: Role;
  kind: string;
  message: string;
}

export interface GuestSession {
  venueId: string;
  roomNumber: string;
  lastName: string;
  verified: boolean;
}

export interface PromotionCampaign {
  id: string;
  orgId: string;
  venueId: string;
  title: string;
  tagline: string;
  badgeText: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  active: boolean;
  startDate: string;
  endDate: string;
}

export interface UsageDisputeCase {
  id: string;
  orgId: string;
  orderReference: string;
  merchantName: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  openedAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  adjustmentUnits?: number;
}

export interface ModerationCase {
  id: string;
  orgId: string;
  targetType: "offering" | "menu" | "venue";
  targetName: string;
  reportReason: string;
  status: "pending" | "resolved" | "dismissed";
  flaggedAt: string;
  actionTaken?: string;
}

export interface PewaState {
  scenario: ScenarioId;
  role: Role;
  organisation: Organisation | null;
  venues: Venue[];
  menus: Menu[];
  activity: ActivityEvent[];
  favourites: string[];
  recents: string[];
  cart: GuestCart | null;
  orders: OrderRequest[];
  orderSequence: number;
  orderPolicy: OrderPolicy;
  campaigns: PromotionCampaign[];
  guestSession: GuestSession | null;
  disputes: UsageDisputeCase[];
  moderationCases: ModerationCase[];
  simulatedOffline: boolean;
}

export interface CartLine {
  id: string;
  menuId: string;
  offeringId: string;
  name: string;
  emoji: string;
  basePrice: number;
  options: { groupId: string; optionId: string; name: string; priceDelta: number }[];
  quantity: number;
  note: string;
}

export interface GuestCart {
  venueId: string;
  lines: CartLine[];
}

export type OrderStatus = "pending" | "accepted" | "declined" | "ready" | "withdrawn";

export interface OrderRequest {
  id: string;
  reference: string;
  venueId: string;
  orgId: string;
  venueName: string;
  currency: string;
  lines: CartLine[];
  total: number;
  guestName: string;
  guestContact: string;
  service: string;
  note: string;
  status: OrderStatus;
  submittedAt: string;
  acceptedAt?: string;
  resolvedAt?: string;
  declineReason?: string;
  unitConsumed: boolean;
}

export interface OrderPolicy {
  included: number;
  includedMax: number;
  topUp: number;
  overdraftUsed: number;
  overdraftMax: number;
  expired: boolean;
  cycleRenewsAt: string;
  tier: string;
}
