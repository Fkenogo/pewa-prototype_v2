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

export interface Organisation {
  id: string;
  name: string;
  businessType: string;
  currency: string;
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
}

export interface Section {
  id: string;
  name: string;
  offerings: Offering[];
}

export interface Menu {
  id: string;
  orgId: string;
  name: string;
  status: MenuStatus;
  sections: Section[];
  updatedAt: string;
  publishedAt?: string;
}

export interface ActivityEvent {
  id: string;
  at: string;
  role: Role;
  kind: string;
  message: string;
}

export interface PewaState {
  scenario: ScenarioId;
  role: Role;
  organisation: Organisation | null;
  venues: Venue[];
  menus: Menu[];
  activity: ActivityEvent[];
}
