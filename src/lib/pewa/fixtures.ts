import type { Menu, PewaState, ScenarioId, Venue } from "./types";

export const SCENARIOS: { id: ScenarioId; label: string; ready: boolean; hint: string }[] = [
  { id: "new-cafe", label: "New café", ready: true, hint: "Empty workspace — start onboarding" },
  { id: "established-restaurant", label: "Established café", ready: true, hint: "Green Garden Café, published menu" },
  { id: "unavailable-item", label: "Unavailable item", ready: true, hint: "A sold-out offering shown honestly" },
  { id: "multi-brand", label: "Multi-brand business", ready: false, hint: "Slice P5" },
  { id: "hotel", label: "Hotel", ready: false, hint: "Slice P5" },
  { id: "delivery-only", label: "Delivery-only business", ready: false, hint: "Slice P2+" },
  { id: "units-available", label: "Units available", ready: false, hint: "Slice P4" },
  { id: "zero-units", label: "Zero units", ready: false, hint: "Slice P4" },
  { id: "expired-beyond-grace", label: "Expired beyond grace", ready: false, hint: "Slice P4" },
  { id: "admitted-pending", label: "Admitted pending order", ready: false, hint: "Slice P4" },
  { id: "duplicate-accept", label: "Duplicate Accept", ready: false, hint: "Slice P3" },
  { id: "withdraw-vs-accept", label: "Withdrawal vs acceptance", ready: false, hint: "Slice P3" },
  { id: "outdated-price", label: "Outdated submitted price", ready: false, hint: "Slice P3" },
  { id: "channel-unavailable", label: "Optional channel unavailable", ready: false, hint: "Slice P3" },
  { id: "protected-denied", label: "Protected access denied", ready: false, hint: "Slice P5" },
  { id: "sponsored-campaign", label: "Sponsored campaign", ready: false, hint: "Slice P5" },
];

const greenGardenVenue: Venue = {
  id: "venue_ggc",
  orgId: "org_ggc",
  name: "Green Garden Café",
  slug: "green-garden-cafe",
  address: "14 Moi Avenue, Nairobi",
  deliveryOnly: false,
  serviceArea: "",
  services: ["Dine-in", "Takeaway"],
  contact: { phone: "+254700123456", whatsapp: "+254700123456", email: "hello@greengarden.example" },
  tagline: "Garden-fresh breakfasts & slow coffee",
  currency: "KES",
};

const greenGardenMenu = (soldOut: boolean): Menu => ({
  id: "menu_ggc_allday",
  orgId: "org_ggc",
  name: "All-Day Menu",
  status: "published",
  updatedAt: "2026-10-19T08:00:00.000Z",
  publishedAt: "2026-10-19T08:00:00.000Z",
  sections: [
    {
      id: "sec_coffee",
      name: "Coffee",
      offerings: [
        {
          id: "off_flat",
          name: "Flat White",
          description: "Double ristretto, silky steamed milk.",
          price: 280,
          tags: ["Hot"],
          available: true,
          emoji: "☕",
          modifiers: [
            {
              id: "mod_milk",
              name: "Milk",
              options: [
                { id: "o1", name: "Whole", priceDelta: 0 },
                { id: "o2", name: "Oat", priceDelta: 50 },
                { id: "o3", name: "Almond", priceDelta: 60 },
              ],
            },
            { id: "mod_shot", name: "Extras", options: [{ id: "o4", name: "Extra shot", priceDelta: 70 }] },
          ],
        },
        {
          id: "off_cold",
          name: "Cold Brew",
          description: "Steeped 18 hours, served over ice.",
          price: 320,
          tags: ["Iced", "Vegan"],
          available: !soldOut,
          emoji: "🧊",
          modifiers: [],
        },
      ],
    },
    {
      id: "sec_breakfast",
      name: "Breakfast",
      offerings: [
        {
          id: "off_avo",
          name: "Avocado Toast",
          description: "Sourdough, smashed avocado, chilli, lime, seeds.",
          price: 650,
          tags: ["Vegetarian"],
          available: true,
          emoji: "🥑",
          modifiers: [{ id: "mod_egg", name: "Add", options: [{ id: "o5", name: "Poached egg", priceDelta: 100 }] }],
        },
        {
          id: "off_mandazi",
          name: "Cardamom Mandazi",
          description: "Three warm mandazi with honey butter.",
          price: 250,
          tags: ["Vegetarian"],
          available: true,
          emoji: "🍩",
          modifiers: [],
        },
      ],
    },
  ],
});

export function buildScenario(id: ScenarioId): Omit<PewaState, "role"> & { role: PewaState["role"] } {
  if (id === "new-cafe") {
    return { scenario: id, role: "owner", organisation: null, venues: [greenGardenVenue], menus: [greenGardenMenu(false)].map((m) => ({ ...m, orgId: "org_ggc" })), activity: [] };
  }
  const soldOut = id === "unavailable-item";
  return {
    scenario: id,
    role: "owner",
    organisation: { id: "org_ggc", name: "Green Garden Café Ltd", businessType: "Single-venue café", currency: "KES" },
    venues: [greenGardenVenue],
    menus: [greenGardenMenu(soldOut)],
    activity: [
      { id: "seed1", at: "2026-10-19T08:00:00.000Z", role: "owner", kind: "menu.published", message: "Menu “All-Day Menu” is now published" },
    ],
  };
}

export const ORG_CURRENCY: Record<string, string> = { org_ggc: "KES" };
