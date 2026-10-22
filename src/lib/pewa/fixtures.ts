import type {
  GuestSession,
  Menu,
  MenuAccessReference,
  MembershipRole,
  ModerationCase,
  OnboardingDraft,
  Organisation,
  OrganisationMembership,
  OrderRequest,
  PersonalIdentity,
  PewaState,
  PromotionCampaign,
  ScenarioId,
  SharedOffering,
  TeamInvitation,
  UsageDisputeCase,
  Venue,
} from "./types";
import { getCuratedLibraryImageUrl } from "./taxonomy";
import breakfast from "@/assets/cafe-breakfast.jpg";

export const sampleSharedOfferings: SharedOffering[] = [
  {
    id: "sh_artisan_cappuccino",
    orgId: "org_multi_brand",
    name: "Artisan Cappuccino",
    description: "Double-shot espresso with silky steamed microfoam",
    price: 280,
    emoji: "☕",
    tags: ["Coffee", "Artisan"],
    modifiers: [
      {
        id: "mod_milk_choice",
        name: "Milk Choice",
        selectionType: "single",
        required: true,
        options: [
          { id: "opt_whole", name: "Whole Milk", priceDelta: 0 },
          { id: "opt_oat", name: "Oat Milk", priceDelta: 50 },
          { id: "opt_almond", name: "Almond Milk", priceDelta: 50 },
        ],
      },
    ],
    image: getCuratedLibraryImageUrl("img_cappuccino"),
    imageSource: "library",
  },
  {
    id: "sh_signature_burger",
    orgId: "org_multi_brand",
    name: "Signature Gourmet Burger",
    description: "Grilled beef patty, cheddar, house pickles, garlic aioli on brioche.",
    price: 950,
    emoji: "🍔",
    tags: ["Chef's Special"],
    modifiers: [],
    image: getCuratedLibraryImageUrl("img_burger_combo"),
    imageSource: "library",
  },
];

export const SCENARIOS: { id: ScenarioId; label: string; ready: boolean; hint: string }[] = [
  { id: "new-cafe", label: "New café", ready: true, hint: "Empty workspace — start onboarding" },
  {
    id: "established-restaurant",
    label: "Established café",
    ready: true,
    hint: "Green Garden Café, published menu",
  },
  {
    id: "unavailable-item",
    label: "Unavailable item",
    ready: true,
    hint: "A sold-out offering shown honestly",
  },
  {
    id: "multi-brand",
    label: "Multi-brand business",
    ready: true,
    hint: "3 venues under 1 organisation",
  },
  { id: "hotel", label: "Hotel", ready: true, hint: "Public bar + protected in-room dining" },
  {
    id: "delivery-only",
    label: "Delivery-only business",
    ready: true,
    hint: "Service area without storefront",
  },
  { id: "units-available", label: "Units available", ready: true, hint: "142 units · new request" },
  { id: "zero-units", label: "Zero units", ready: true, hint: "Menus & contact stay live" },
  {
    id: "expired-beyond-grace",
    label: "Expired beyond grace",
    ready: true,
    hint: "Manual contact only",
  },
  {
    id: "admitted-pending",
    label: "Admitted pending order",
    ready: true,
    hint: "Accept using continuity",
  },
  { id: "duplicate-accept", label: "Duplicate Accept", ready: true, hint: "Only one deduction" },
  {
    id: "withdraw-vs-accept",
    label: "Withdrawal vs acceptance",
    ready: true,
    hint: "First decision is final",
  },
  {
    id: "outdated-price",
    label: "Outdated submitted price",
    ready: true,
    hint: "Review changed cart price",
  },
  {
    id: "channel-unavailable",
    label: "Optional channel unavailable",
    ready: true,
    hint: "Order without WhatsApp",
  },
  {
    id: "protected-denied",
    label: "Protected access denied",
    ready: true,
    hint: "Room service locked until guest verification",
  },
  {
    id: "sponsored-campaign",
    label: "Sponsored campaign",
    ready: true,
    hint: "Active Featured Offer on Home",
  },
];

const greenGardenVenue: Venue = {
  id: "venue_ggc",
  orgId: "org_ggc",
  name: "Green Garden Café",
  slug: "green-garden-cafe",
  category: "Café",
  address: "14 Moi Avenue, Nairobi",
  deliveryOnly: false,
  serviceArea: "",
  services: ["Dine-in", "Takeaway"],
  contact: {
    phone: "+254700123456",
    whatsapp: "+254700123456",
    email: "hello@greengarden.example",
  },
  tagline: "Garden-fresh breakfasts & slow coffee",
  currency: "KES",
  coordinates: {
    latitude: -1.2841,
    longitude: 36.8236,
    verificationStatus: "demonstration",
  },
};

const greenGardenMenu = (soldOut: boolean): Menu => ({
  id: "menu_ggc_allday",
  orgId: "org_ggc",
  venueId: "venue_ggc",
  name: "All-Day Menu",
  coverImage: breakfast,
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
          tags: ["Hot", "House Blend"],
          available: true,
          emoji: "☕",
          image: getCuratedLibraryImageUrl("img_flat_white"),
          imageSource: "library",
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
            {
              id: "mod_shot",
              name: "Extras",
              options: [{ id: "o4", name: "Extra shot", priceDelta: 70 }],
            },
          ],
        },
        {
          id: "off_cold",
          name: "Cold Brew",
          description: "Steeped 18 hours, served over ice.",
          price: 320,
          tags: ["Iced", "Vegan", "Single Origin"],
          available: !soldOut,
          emoji: "🧊",
          image: getCuratedLibraryImageUrl("img_cold_brew"),
          imageSource: "library",
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
          tags: ["Vegetarian", "Organic"],
          available: true,
          emoji: "🥑",
          image: getCuratedLibraryImageUrl("img_avo_toast"),
          imageSource: "library",
          schedule: {
            enabled: true,
            name: "Breakfast Only",
            startTime: "07:00",
            endTime: "11:30",
            days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
          },
          modifiers: [
            {
              id: "mod_egg",
              name: "Add",
              options: [{ id: "o5", name: "Poached egg", priceDelta: 100 }],
            },
          ],
        },
        {
          id: "off_croissant_almond",
          name: "Almond Croissant",
          description: "Twice-baked butter croissant filled with frangipane and toasted almonds.",
          price: 360,
          tags: ["Freshly Baked", "Vegetarian"],
          available: true,
          emoji: "🥐",
          image: getCuratedLibraryImageUrl("img_croissant"),
          imageSource: "library",
          modifiers: [],
        },
        {
          id: "off_mandazi",
          name: "Cardamom Mandazi",
          description: "Three warm mandazi with honey butter.",
          price: 250,
          tags: ["Vegetarian", "Freshly Baked"],
          available: true,
          emoji: "🍩",
          image: getCuratedLibraryImageUrl("img_mandazi"),
          imageSource: "library",
          modifiers: [],
        },
      ],
    },
  ],
});

const hotelVenue: Venue = {
  id: "venue_horizon",
  orgId: "org_horizon",
  name: "The Grand Horizon Hotel",
  slug: "grand-horizon-hotel",
  category: "Hotel & Hospitality",
  address: "88 Riverside Drive, Nairobi",
  deliveryOnly: false,
  serviceArea: "",
  services: ["Dine-in", "In-Room Dining", "Bar"],
  contact: {
    phone: "+254711987654",
    whatsapp: "+254711987654",
    email: "guestservices@grandhorizon.example",
  },
  tagline: "Luxury hospitality, rooftop lounge & 24hr in-room dining",
  currency: "KES",
  coordinates: {
    latitude: -1.2683,
    longitude: 36.7972,
    verificationStatus: "demonstration",
  },
};

const hotelPublicMenu: Menu = {
  id: "menu_horizon_lounge",
  orgId: "org_horizon",
  venueId: "venue_horizon",
  name: "Terrace Bistro & Lounge",
  status: "published",
  isProtected: false,
  updatedAt: "2026-10-19T10:00:00.000Z",
  publishedAt: "2026-10-19T10:00:00.000Z",
  sections: [
    {
      id: "sec_bistro_mains",
      name: "Bistro Plates",
      offerings: [
        {
          id: "off_steak",
          name: "Prime Aged Ribeye",
          description: "250g grass-fed beef, herb butter, hand-cut frites.",
          price: 2400,
          tags: ["Chef's Special", "Gluten-Free"],
          specialBadge: "Chef's Special",
          available: true,
          emoji: "🥩",
          image: getCuratedLibraryImageUrl("img_steak_frites"),
          imageSource: "library",
          modifiers: [],
        },
        {
          id: "off_risotto",
          name: "Wild Mushroom Risotto",
          description: "Arborio rice, aged parmesan, black truffle oil.",
          price: 1650,
          tags: ["Vegetarian", "Signature"],
          available: true,
          emoji: "🍲",
          image: getCuratedLibraryImageUrl("img_risotto"),
          imageSource: "library",
          modifiers: [],
        },
      ],
    },
  ],
};

const hotelProtectedMenu: Menu = {
  id: "menu_horizon_room",
  orgId: "org_horizon",
  venueId: "venue_horizon",
  name: "In-Room Dining (Guests Only)",
  status: "published",
  isProtected: true,
  updatedAt: "2026-10-19T10:00:00.000Z",
  publishedAt: "2026-10-19T10:00:00.000Z",
  sections: [
    {
      id: "sec_room_service",
      name: "24-Hour Room Service",
      offerings: [
        {
          id: "off_room_breakfast",
          name: "Horizon Continental In-Bed",
          description: "Fresh bakery basket, tropical fruit platter, juice and French press.",
          price: 1800,
          tags: ["Guest Exclusive", "Freshly Baked"],
          available: true,
          emoji: "🥐",
          modifiers: [],
        },
        {
          id: "off_room_club",
          name: "Late-Night Triple Club Sandwich",
          description: "Smoked turkey, bacon, aged cheddar, herb mayo with skin-on chips.",
          price: 1450,
          tags: ["Comfort", "Popular"],
          available: true,
          emoji: "🥪",
          modifiers: [],
        },
        {
          id: "off_steak_room",
          name: "Prime Aged Ribeye (In-Room Dining)",
          description: "250g grass-fed beef, herb butter, hand-cut frites delivered to your room.",
          price: 2800,
          tags: ["Chef's Special", "Gluten-Free"],
          specialBadge: "In-Room",
          available: true,
          emoji: "🥩",
          image: getCuratedLibraryImageUrl("img_steak_frites"),
          imageSource: "library",
          modifiers: [
            {
              id: "mod_tray_service",
              name: "Tray Service Setup",
              selectionType: "single",
              required: true,
              options: [
                { id: "opt_standard_tray", name: "Standard Room Tray Setup", priceDelta: 150 },
                {
                  id: "opt_luxury_setup",
                  name: "White Linen & Warm Cloche Setup",
                  priceDelta: 350,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const cloudBurgerVenue: Venue = {
  id: "venue_cloudburger",
  orgId: "org_cloudburger",
  name: "CloudBurger Kitchen",
  slug: "cloudburger",
  category: "Delivery & Cloud Kitchen",
  address: "",
  deliveryOnly: true,
  serviceArea: "Kilimani, Lavington & Westlands",
  deliveryCoverageStatus: "approximate_preview",
  services: ["Delivery"],
  contact: {
    phone: "+254722334455",
    whatsapp: "+254722334455",
    email: "dispatch@cloudburger.example",
  },
  tagline: "Smashed patties & loaded shakes · Cloud delivery only",
  currency: "KES",
};

const cloudBurgerMenu: Menu = {
  id: "menu_cloudburger_delivery",
  orgId: "org_cloudburger",
  venueId: "venue_cloudburger",
  name: "Delivery Menu",
  status: "published",
  isProtected: false,
  updatedAt: "2026-10-19T11:00:00.000Z",
  publishedAt: "2026-10-19T11:00:00.000Z",
  sections: [
    {
      id: "sec_burgers",
      name: "Smashed Burgers",
      offerings: [
        {
          id: "off_double_smash",
          name: "The Double Wagyu Smash",
          description: "Double smash patty, American cheese, house pickles, secret sauce.",
          price: 850,
          tags: ["Popular", "Halal"],
          specialBadge: "20% Off Launch",
          available: true,
          emoji: "🍔",
          image: getCuratedLibraryImageUrl("img_wagyu_smash"),
          imageSource: "library",
          modifiers: [],
        },
      ],
    },
  ],
};

const solBakeryVenue: Venue = {
  id: "venue_sol",
  orgId: "org_multi_brand",
  name: "Sol Artisan Bakery",
  slug: "sol-artisan-bakery",
  category: "Artisan Bakery",
  address: "24 Karuna Close, Westlands",
  deliveryOnly: false,
  serviceArea: "",
  services: ["Dine-in", "Takeaway"],
  contact: {
    phone: "+254733445566",
    whatsapp: "+254733445566",
    email: "bread@solbakery.example",
  },
  tagline: "Natural sourdough breads, pastries & morning coffee",
  currency: "KES",
  coordinates: {
    latitude: -1.2612,
    longitude: 36.8044,
    verificationStatus: "demonstration",
  },
};

const gelatoLabVenue: Venue = {
  id: "venue_gelato",
  orgId: "org_multi_brand",
  name: "Gelato Craft Lab",
  slug: "gelato-craft-lab",
  category: "Artisan Gelato & Desserts",
  address: "Village Market, Courtyard",
  deliveryOnly: false,
  serviceArea: "",
  services: ["Takeaway"],
  contact: {
    phone: "+254744556677",
    whatsapp: "+254744556677",
    email: "ciao@gelatolab.example",
  },
  tagline: "Small-batch Italian gelato churned daily",
  currency: "KES",
  coordinates: {
    latitude: -1.2294,
    longitude: 36.8047,
    verificationStatus: "demonstration",
  },
};

const solBakeryMenu: Menu = {
  id: "menu_sol_bakery",
  orgId: "org_multi_brand",
  venueId: "venue_sol",
  name: "Artisan Bakery & Pastry Menu",
  status: "published",
  isProtected: false,
  updatedAt: "2026-10-19T09:00:00.000Z",
  publishedAt: "2026-10-19T09:00:00.000Z",
  sections: [
    {
      id: "sec_breads",
      name: "Sourdough Loaves",
      offerings: [
        {
          id: "off_country_sourdough",
          name: "Country Sourdough Loaf",
          description: "36-hour slow fermentation, dark caramelized blistered crust.",
          price: 450,
          tags: ["Vegan", "Sourdough", "Organic"],
          available: true,
          emoji: "🥖",
          image: getCuratedLibraryImageUrl("img_sourdough"),
          imageSource: "library",
          modifiers: [],
        },
      ],
    },
    {
      id: "sec_pastries",
      name: "Viennoiserie & Pastries",
      offerings: [
        {
          id: "off_croissant",
          name: "Golden Butter Croissant",
          description: "Layered French cultured butter, crisp golden honeycomb interior.",
          price: 320,
          tags: ["Freshly Baked", "Vegetarian"],
          available: true,
          emoji: "🥐",
          image: getCuratedLibraryImageUrl("img_croissant"),
          imageSource: "library",
          modifiers: [],
        },
      ],
    },
    {
      id: "sec_bakery_coffee",
      name: "Coffee & Drinks",
      offerings: [
        {
          id: "off_cappuccino_sol",
          sharedOfferingId: "sh_artisan_cappuccino",
          name: "Artisan Cappuccino",
          description: "Double-shot espresso with silky steamed microfoam",
          price: 280,
          tags: ["Coffee", "Artisan"],
          available: true,
          emoji: "☕",
          image: getCuratedLibraryImageUrl("img_cappuccino"),
          imageSource: "library",
          modifiers: [
            {
              id: "mod_milk_choice",
              name: "Milk Choice",
              selectionType: "single",
              required: true,
              options: [
                { id: "opt_whole", name: "Whole Milk", priceDelta: 0 },
                { id: "opt_oat", name: "Oat Milk", priceDelta: 50 },
                { id: "opt_almond", name: "Almond Milk", priceDelta: 50 },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const gelatoLabMenu: Menu = {
  id: "menu_gelato_lab",
  orgId: "org_multi_brand",
  venueId: "venue_gelato",
  name: "Gelato & Espresso Menu",
  status: "published",
  isProtected: false,
  updatedAt: "2026-10-19T10:30:00.000Z",
  publishedAt: "2026-10-19T10:30:00.000Z",
  sections: [
    {
      id: "sec_gelato",
      name: "Gelato Cups",
      offerings: [
        {
          id: "off_pistachio",
          name: "Bronte Pistachio",
          description: "Sicilian roasted pistachio with sea salt crystals.",
          price: 400,
          tags: ["Gluten-Free", "Vegetarian", "Signature"],
          available: true,
          emoji: "🍨",
          image: getCuratedLibraryImageUrl("img_pistachio_gelato"),
          imageSource: "library",
          modifiers: [],
        },
      ],
    },
    {
      id: "sec_gelato_coffee",
      name: "Espresso Bar",
      offerings: [
        {
          id: "off_cappuccino_gelato",
          sharedOfferingId: "sh_artisan_cappuccino",
          name: "Artisan Cappuccino",
          description: "Double-shot espresso with silky steamed microfoam",
          price: 280,
          tags: ["Coffee", "Artisan"],
          available: true,
          emoji: "☕",
          image: getCuratedLibraryImageUrl("img_cappuccino"),
          imageSource: "library",
          venueOverrides: {
            venue_gelato: {
              venueId: "venue_gelato",
              price: 350,
              description: "Quick grab-and-go roast with steamed microfoam",
            },
          },
          modifiers: [
            {
              id: "mod_milk_choice",
              name: "Milk Choice",
              selectionType: "single",
              required: true,
              options: [
                { id: "opt_whole", name: "Whole Milk", priceDelta: 0 },
                { id: "opt_oat", name: "Oat Milk", priceDelta: 50 },
                { id: "opt_almond", name: "Almond Milk", priceDelta: 50 },
              ],
            },
          ],
        },
        {
          id: "off_strawberry_brioche_exclusion",
          name: "Fresh Strawberry Brioche",
          description: "Warm brioche filled with sweet strawberry compote.",
          price: 380,
          tags: ["Freshly Baked", "Vegetarian"],
          available: true,
          emoji: "🍓",
          image: getCuratedLibraryImageUrl("img_croissant"),
          imageSource: "library",
          venueOverrides: {
            venue_gelato: {
              venueId: "venue_gelato",
              hidden: true,
            },
          },
          modifiers: [],
        },
      ],
    },
  ],
};

const promoSeedCampaign: PromotionCampaign = {
  id: "camp_ggc_coldbrew",
  orgId: "org_ggc",
  venueId: "venue_ggc",
  title: "20% Off Slow Cold Brews All Week",
  tagline: "Steeped 18 hours · Garden-fresh brew at Green Garden Café",
  badgeText: "Sponsored",
  budget: 50,
  spent: 14.2,
  impressions: 142,
  clicks: 18,
  active: true,
  startDate: "2026-10-15T00:00:00.000Z",
  endDate: "2026-10-31T00:00:00.000Z",
};

export {
  greenGardenVenue,
  greenGardenMenu,
  hotelVenue,
  hotelPublicMenu,
  hotelProtectedMenu,
  cloudBurgerVenue,
  cloudBurgerMenu,
  solBakeryVenue,
  solBakeryMenu,
  gelatoLabVenue,
  gelatoLabMenu,
  promoSeedCampaign,
};

export const PROTOTYPE_DIRECTORY_VENUES: Venue[] = [
  greenGardenVenue,
  hotelVenue,
  cloudBurgerVenue,
  solBakeryVenue,
  gelatoLabVenue,
];

export const PROTOTYPE_DIRECTORY_MENUS: Menu[] = [
  greenGardenMenu(false),
  hotelPublicMenu,
  hotelProtectedMenu,
  cloudBurgerMenu,
  solBakeryMenu,
  gelatoLabMenu,
];

export const SAMPLE_FOUNDER_IDENTITY: PersonalIdentity = {
  id: "id_founder_njeri",
  fullName: "Njeri Kamau",
  email: "njeri@greengarden.example",
  mobile: "+254700123456",
  preferredSignIn: "email",
  verifiedSimulation: true,
  verifiedAt: "2026-10-19T07:50:00.000Z",
  createdAt: "2026-10-19T07:45:00.000Z",
};

export const SAMPLE_ADMIN_IDENTITY: PersonalIdentity = {
  id: "id_admin_kevin",
  fullName: "Kevin Omondi",
  email: "kevin@greengarden.example",
  mobile: "+254700456789",
  preferredSignIn: "email",
  verifiedSimulation: true,
  verifiedAt: "2026-10-19T07:50:00.000Z",
  createdAt: "2026-10-19T07:45:00.000Z",
};

export const SAMPLE_MANAGER_IDENTITY: PersonalIdentity = {
  id: "id_manager_alex",
  fullName: "Alex Mwangi",
  email: "alex@greengarden.example",
  mobile: "+254700234567",
  preferredSignIn: "email",
  verifiedSimulation: true,
  verifiedAt: "2026-10-19T07:50:00.000Z",
  createdAt: "2026-10-19T07:45:00.000Z",
};

export const SAMPLE_STAFF_IDENTITY: PersonalIdentity = {
  id: "id_staff_barista",
  fullName: "Faith Achieng",
  email: "faith@greengarden.example",
  mobile: "+254700345678",
  preferredSignIn: "mobile",
  verifiedSimulation: true,
  verifiedAt: "2026-10-19T07:50:00.000Z",
  createdAt: "2026-10-19T07:45:00.000Z",
};

export const SCENARIO_DEMO_IDENTITIES: PersonalIdentity[] = [
  SAMPLE_FOUNDER_IDENTITY,
  SAMPLE_ADMIN_IDENTITY,
  SAMPLE_MANAGER_IDENTITY,
  SAMPLE_STAFF_IDENTITY,
];

export const samplePendingInvitation: TeamInvitation = {
  id: "inv_sample_brian",
  token: "tok_sample_brian",
  orgId: "org_ggc",
  orgName: "Green Garden Café Ltd",
  recipientContact: "brian@greengarden.example",
  recipientName: "Brian Kiprop",
  role: "manager",
  scopeType: "restricted",
  venueIds: ["venue_ggc"],
  servicePoints: ["Main Counter", "Dine-in Area"],
  invitedById: SAMPLE_FOUNDER_IDENTITY.id,
  invitedByName: SAMPLE_FOUNDER_IDENTITY.fullName,
  createdAt: "2026-10-21T09:00:00.000Z",
  expiresAt: "2026-10-28T09:00:00.000Z",
  status: "pending",
};

function buildScenarioMemberships(
  orgId: string,
  primaryRole: MembershipRole = "owner",
  venueId?: string,
): OrganisationMembership[] {
  const venues = venueId ? [venueId] : [];
  return [
    {
      id: `mem_${orgId}_owner`,
      identityId: SAMPLE_FOUNDER_IDENTITY.id,
      orgId,
      role: "owner",
      status: "active",
      venueId,
      venueIds: venues,
      scopeType: "all",
      joinedAt: "2026-10-19T07:55:00.000Z",
    },
    {
      id: `mem_${orgId}_admin`,
      identityId: SAMPLE_ADMIN_IDENTITY.id,
      orgId,
      role: "admin",
      status: "active",
      venueId,
      venueIds: venues,
      scopeType: "all",
      joinedAt: "2026-10-19T08:00:00.000Z",
    },
    {
      id: `mem_${orgId}_manager`,
      identityId: SAMPLE_MANAGER_IDENTITY.id,
      orgId,
      role: "manager",
      status: "active",
      venueId,
      venueIds: venues,
      scopeType: "restricted",
      servicePoints: ["Main Counter", "Dine-in Area"],
      joinedAt: "2026-10-19T08:05:00.000Z",
    },
    {
      id: `mem_${orgId}_staff`,
      identityId: SAMPLE_STAFF_IDENTITY.id,
      orgId,
      role: "staff",
      status: "active",
      venueId,
      venueIds: venues,
      scopeType: "restricted",
      servicePoints: ["Barista Station", "Main Counter"],
      joinedAt: "2026-10-19T08:10:00.000Z",
    },
  ];
}

export const KNOWN_ORGANISATIONS: Record<string, Organisation> = {
  org_ggc: {
    id: "org_ggc",
    name: "Green Garden Café Ltd",
    businessType: "Single-venue café",
    country: "Kenya",
    currency: "KES",
    ownerIdentityId: SAMPLE_FOUNDER_IDENTITY.id,
    status: "active",
  },
  org_horizon: {
    id: "org_horizon",
    name: "The Grand Horizon Hotel Ltd",
    businessType: "Hotel & Hospitality",
    country: "Kenya",
    currency: "KES",
    ownerIdentityId: SAMPLE_FOUNDER_IDENTITY.id,
    status: "active",
  },
  org_cloudburger: {
    id: "org_cloudburger",
    name: "CloudBurger Kitchen Ltd",
    businessType: "Delivery-only cloud kitchen",
    country: "Kenya",
    currency: "KES",
    ownerIdentityId: SAMPLE_FOUNDER_IDENTITY.id,
    status: "active",
  },
  org_multi_brand: {
    id: "org_multi_brand",
    name: "Horizon Hospitality Group",
    businessType: "Multi-brand restaurant group",
    country: "Kenya",
    currency: "KES",
    ownerIdentityId: SAMPLE_FOUNDER_IDENTITY.id,
    status: "active",
  },
};

export const sampleAccessReferences: MenuAccessReference[] = [
  {
    id: "acc_ggc_dine",
    orgId: "org_ggc",
    venueId: "venue_ggc",
    menuId: "menu_ggc_allday",
    servicePoint: "Main Dining",
    shortCode: "GGC-DINE",
    channel: "qr",
    status: "active",
    type: "public",
    label: "Main Dining Room Table QR",
    createdAt: "2026-10-19T08:00:00.000Z",
    updatedAt: "2026-10-19T08:00:00.000Z",
  },
  {
    id: "acc_ggc_bar",
    orgId: "org_ggc",
    venueId: "venue_ggc",
    menuId: "menu_ggc_allday",
    servicePoint: "Lobby Bar",
    shortCode: "GGC-BAR",
    channel: "qr",
    status: "active",
    type: "public",
    label: "Lobby Bar Counter QR",
    createdAt: "2026-10-19T08:00:00.000Z",
    updatedAt: "2026-10-19T08:00:00.000Z",
  },
  {
    id: "acc_ggc_wa",
    orgId: "org_ggc",
    venueId: "venue_ggc",
    menuId: "menu_ggc_allday",
    servicePoint: "Lobby Bar",
    shortCode: "GGC-CHAT",
    channel: "whatsapp",
    status: "active",
    type: "public",
    label: "WhatsApp Order Concierge",
    customPrompt: "Hi Green Garden Café! I'd like to browse your menu on PEWA.",
    createdAt: "2026-10-19T08:00:00.000Z",
    updatedAt: "2026-10-19T08:00:00.000Z",
  },
  {
    id: "acc_ggc_web",
    orgId: "org_ggc",
    venueId: "venue_ggc",
    menuId: "menu_ggc_allday",
    shortCode: "GGC-WEB",
    channel: "direct",
    status: "active",
    type: "public",
    label: "Website Direct Link",
    createdAt: "2026-10-19T08:00:00.000Z",
    updatedAt: "2026-10-19T08:00:00.000Z",
  },
  {
    id: "acc_hrz_pool",
    orgId: "org_horizon",
    venueId: "venue_horizon",
    menuId: "menu_horizon_lounge",
    servicePoint: "Poolside Bar",
    shortCode: "HRZ-POOL",
    channel: "qr",
    status: "active",
    type: "public",
    label: "Poolside Loungers QR",
    createdAt: "2026-10-19T08:00:00.000Z",
    updatedAt: "2026-10-19T08:00:00.000Z",
  },
  {
    id: "acc_hrz_room",
    orgId: "org_horizon",
    venueId: "venue_horizon",
    menuId: "menu_horizon_room",
    servicePoint: "Room 304",
    shortCode: "HRZ-ROOM",
    channel: "qr",
    status: "active",
    type: "protected",
    label: "In-Room Dining Bedside QR",
    createdAt: "2026-10-19T08:00:00.000Z",
    updatedAt: "2026-10-19T08:00:00.000Z",
  },
  {
    id: "acc_cb_del",
    orgId: "org_cloudburger",
    venueId: "venue_cloudburger",
    menuId: "menu_cloudburger_delivery",
    servicePoint: "Kilimani Dispatch",
    shortCode: "CB-DEL",
    channel: "direct",
    status: "active",
    type: "public",
    label: "Packaging Direct Link",
    createdAt: "2026-10-19T08:00:00.000Z",
    updatedAt: "2026-10-19T08:00:00.000Z",
  },
  {
    id: "acc_cb_wa",
    orgId: "org_cloudburger",
    venueId: "venue_cloudburger",
    menuId: "menu_cloudburger_delivery",
    servicePoint: "Kilimani Dispatch",
    shortCode: "CB-CHAT",
    channel: "whatsapp",
    status: "active",
    type: "public",
    label: "WhatsApp Smash Orders",
    customPrompt: "Hey CloudBurger! I want to view your smashed burger menu on PEWA.",
    createdAt: "2026-10-19T08:00:00.000Z",
    updatedAt: "2026-10-19T08:00:00.000Z",
  },
];

export function buildScenarioAccessReferences(id: ScenarioId): MenuAccessReference[] {
  if (id === "new-cafe") return [];
  if (id === "hotel") {
    return sampleAccessReferences.filter((a) => a.orgId === "org_horizon");
  }
  if (id === "delivery-only") {
    return sampleAccessReferences.filter((a) => a.orgId === "org_cloudburger");
  }
  if (id === "multi-brand") {
    return sampleAccessReferences;
  }
  return sampleAccessReferences.filter((a) => a.orgId === "org_ggc");
}

export function buildScenario(
  id: ScenarioId,
): Omit<PewaState, "role"> & { role: PewaState["role"] } {
  const common = {
    favourites: [],
    recents: [],
    cart: null,
    orders: [],
    orderSequence: 0,
    orderPolicy: {
      included: id === "units-available" || id === "duplicate-accept" ? 142 : 200,
      includedMax: 200,
      topUp: 0,
      overdraftUsed: 0,
      overdraftMax: 10,
      expired: id === "expired-beyond-grace",
      cycleRenewsAt: "2026-11-19T00:00:00.000Z",
      tier: "Base Monthly Tier",
    },
    campaigns: [promoSeedCampaign] as PromotionCampaign[],
    guestSession: null as GuestSession | null,
    disputes: [
      {
        id: "disp_1",
        orgId: "org_ggc",
        merchantName: "Green Garden Café",
        orderReference: "PEWA-0012",
        reason: "Accidental double-tap acceptance by barista during peak morning rush",
        status: "open",
        openedAt: "2026-10-19T08:30:00.000Z",
      },
    ] as UsageDisputeCase[],
    moderationCases: [
      {
        id: "mod_1",
        orgId: "org_cloudburger",
        targetType: "offering",
        targetName: "The Double Wagyu Smash",
        reportReason: "Customer reported missing allergen declaration for dairy cheese",
        status: "pending",
        flaggedAt: "2026-10-19T14:15:00.000Z",
      },
    ] as ModerationCase[],
    simulatedOffline: false,
    sharedOfferings: sampleSharedOfferings,
    simulatedTime: "10:00",
    personalIdentity: SAMPLE_FOUNDER_IDENTITY as PersonalIdentity | null,
    identities: SCENARIO_DEMO_IDENTITIES as PersonalIdentity[],
    organisations: Object.values(KNOWN_ORGANISATIONS) as Organisation[],
    memberships: buildScenarioMemberships("org_ggc", "owner", "venue_ggc"),
    invitations: (id === "new-cafe" ? [] : [samplePendingInvitation]) as TeamInvitation[],
    accessReferences: buildScenarioAccessReferences(id),
    onboardingDraft: null as OnboardingDraft | null,
  };
  if (id === "zero-units") {
    common.orderPolicy.included = 0;
    common.orderPolicy.topUp = 0;
    common.orderPolicy.overdraftUsed = 10;
  }
  if (id === "admitted-pending") {
    common.orderPolicy.included = 0;
    common.orderPolicy.topUp = 0;
    common.orderPolicy.overdraftUsed = 0;
  }

  if (id === "new-cafe") {
    return {
      ...common,
      scenario: id,
      role: "owner",
      organisation: null,
      organisations: [],
      venues: [greenGardenVenue],
      menus: [greenGardenMenu(false)].map((m) => ({ ...m, orgId: "org_ggc" })),
      activity: [],
      personalIdentity: null,
      identities: [],
      memberships: [],
      invitations: [],
      onboardingDraft: null,
    };
  }

  if (id === "hotel") {
    return {
      ...common,
      scenario: id,
      role: "owner",
      organisation: {
        id: "org_horizon",
        name: "The Grand Horizon Hotel Ltd",
        businessType: "Hotel & Hospitality",
        country: "Kenya",
        currency: "KES",
        ownerIdentityId: SAMPLE_FOUNDER_IDENTITY.id,
      },
      venues: [hotelVenue],
      menus: [hotelPublicMenu, hotelProtectedMenu],
      memberships: buildScenarioMemberships("org_horizon", "owner", hotelVenue.id),
      guestSession: {
        venueId: hotelVenue.id,
        roomNumber: "402",
        lastName: "Smith",
        verified: true,
      },
      activity: [
        {
          id: "act_hotel_1",
          at: "2026-10-19T10:00:00.000Z",
          role: "owner",
          kind: "menu.published",
          message: "Menu “In-Room Dining (Guests Only)” published (protected access)",
        },
      ],
    };
  }

  if (id === "protected-denied") {
    return {
      ...common,
      scenario: id,
      role: "customer",
      organisation: {
        id: "org_horizon",
        name: "The Grand Horizon Hotel Ltd",
        businessType: "Hotel & Hospitality",
        country: "Kenya",
        currency: "KES",
        ownerIdentityId: SAMPLE_FOUNDER_IDENTITY.id,
      },
      venues: [hotelVenue],
      menus: [hotelPublicMenu, hotelProtectedMenu],
      memberships: buildScenarioMemberships("org_horizon", "owner", hotelVenue.id),
      guestSession: null, // unverified guest session
      activity: [],
    };
  }

  if (id === "delivery-only") {
    return {
      ...common,
      scenario: id,
      role: "owner",
      organisation: {
        id: "org_cloudburger",
        name: "CloudBurger Kitchen Ltd",
        businessType: "Delivery-only cloud kitchen",
        country: "Kenya",
        currency: "KES",
        ownerIdentityId: SAMPLE_FOUNDER_IDENTITY.id,
      },
      venues: [cloudBurgerVenue],
      menus: [cloudBurgerMenu],
      memberships: buildScenarioMemberships("org_cloudburger", "owner", cloudBurgerVenue.id),
      activity: [
        {
          id: "act_cloud_1",
          at: "2026-10-19T11:00:00.000Z",
          role: "owner",
          kind: "venue.configured",
          message:
            "Delivery area configured: Kilimani, Lavington & Westlands (no public storefront)",
        },
      ],
    };
  }

  if (id === "multi-brand") {
    return {
      ...common,
      scenario: id,
      role: "admin",
      personalIdentity: SAMPLE_ADMIN_IDENTITY,
      organisation: {
        id: "org_multi_brand",
        name: "Horizon Hospitality Group",
        businessType: "Multi-brand restaurant group",
        country: "Kenya",
        currency: "KES",
        ownerIdentityId: SAMPLE_FOUNDER_IDENTITY.id,
      },
      venues: [{ ...greenGardenVenue, orgId: "org_multi_brand" }, solBakeryVenue, gelatoLabVenue],
      menus: [
        { ...greenGardenMenu(false), orgId: "org_multi_brand" },
        solBakeryMenu,
        gelatoLabMenu,
      ],
      memberships: buildScenarioMemberships("org_multi_brand", "admin"),
      activity: [
        {
          id: "act_multi_1",
          at: "2026-10-19T09:00:00.000Z",
          role: "admin",
          kind: "brand.added",
          message: "Sol Artisan Bakery added to Horizon Hospitality Group",
        },
      ],
    };
  }

  if (id === "sponsored-campaign") {
    return {
      ...common,
      scenario: id,
      role: "owner",
      organisation: {
        id: "org_ggc",
        name: "Green Garden Café Ltd",
        businessType: "Single-venue café",
        country: "Kenya",
        currency: "KES",
        ownerIdentityId: SAMPLE_FOUNDER_IDENTITY.id,
      },
      venues: [greenGardenVenue],
      menus: [greenGardenMenu(false)],
      campaigns: [promoSeedCampaign],
      memberships: buildScenarioMemberships("org_ggc", "owner", greenGardenVenue.id),
      activity: [
        {
          id: "act_camp_1",
          at: "2026-10-15T00:00:00.000Z",
          role: "owner",
          kind: "promo.created",
          message: "Featured Offer “20% Off Slow Cold Brews” launched on PEWA Home ($50 budget)",
        },
      ],
    };
  }

  const soldOut = id === "unavailable-item";
  const menu = greenGardenMenu(soldOut);
  const venue =
    id === "channel-unavailable"
      ? { ...greenGardenVenue, contact: { ...greenGardenVenue.contact, whatsapp: "" } }
      : greenGardenVenue;
  const line = {
    id: "line_seed",
    menuId: menu.id,
    offeringId: "off_flat",
    name: "Flat White",
    emoji: "☕",
    basePrice: 280,
    options: [],
    quantity: 2,
    note: "",
  };
  const pending: OrderRequest[] = [
    "duplicate-accept",
    "withdraw-vs-accept",
    "admitted-pending",
  ].includes(id)
    ? [
        {
          id: "order_seed",
          reference: "PEWA-0001",
          venueId: venue.id,
          orgId: venue.orgId,
          venueName: venue.name,
          currency: venue.currency,
          lines: [line],
          total: 560,
          guestName: "Amani",
          guestContact: "0700000000",
          service: "Takeaway",
          note: "Collect at the counter",
          status: "pending",
          submittedAt: "2026-10-20T05:00:00.000Z",
          unitConsumed: false,
        },
      ]
    : [];
  if (id === "outdated-price")
    menu.sections[0]?.offerings.forEach((o) => {
      if (o.id === "off_flat") o.price = 300;
    });
  return {
    ...common,
    scenario: id,
    role: "owner",
    organisation: {
      id: "org_ggc",
      name: "Green Garden Café Ltd",
      businessType: "Single-venue café",
      country: "Kenya",
      currency: "KES",
      ownerIdentityId: SAMPLE_FOUNDER_IDENTITY.id,
    },
    venues: [venue],
    menus: [menu],
    memberships: buildScenarioMemberships("org_ggc", "owner", venue.id),
    orders: pending,
    orderSequence: pending.length,
    cart: id === "outdated-price" ? { venueId: venue.id, lines: [line] } : null,
    activity: [
      {
        id: "seed1",
        at: "2026-10-19T08:00:00.000Z",
        role: "owner",
        kind: "menu.published",
        message: "Menu “All-Day Menu” is now published",
      },
    ],
  };
}

export const ORG_CURRENCY: Record<string, string> = {
  org_ggc: "KES",
  org_horizon: "KES",
  org_cloudburger: "KES",
  org_multi_brand: "KES",
};
