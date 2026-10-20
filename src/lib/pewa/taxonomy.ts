// src/lib/pewa/taxonomy.ts
// R1-A: Bounded Menu Taxonomy and Structure Engine for PEWA Prototype

export interface BusinessCategoryDefinition {
  id: string;
  label: string;
  description: string;
  recommendedSections: string[];
  recommendedTags: string[];
}

export const SUGGESTED_BUSINESS_CATEGORIES: BusinessCategoryDefinition[] = [
  {
    id: "cafe",
    label: "Café",
    description: "Specialty coffee, teas, breakfasts and counter bakes",
    recommendedSections: [
      "Hot Coffee & Espresso",
      "Cold Brew & Iced Drinks",
      "Breakfast & Brunch",
      "Pastries & Counter Bakes",
      "Sandwiches & Toasties",
      "Fresh Juices & Teas",
    ],
    recommendedTags: [
      "Hot",
      "Iced",
      "Vegetarian",
      "Vegan",
      "Dairy-Free",
      "Single Origin",
      "House Blend",
      "Organic",
    ],
  },
  {
    id: "restaurant",
    label: "Restaurant & Bistro",
    description: "Sit-down dining, starters, mains, sides and bar service",
    recommendedSections: [
      "Starters & Small Plates",
      "Chef's Mains",
      "Grills & Steaks",
      "Pasta & Risotto",
      "Sides & Fresh Salads",
      "Desserts",
      "Signature Cocktails",
      "Wine & Cellar",
    ],
    recommendedTags: [
      "Chef's Special",
      "Signature",
      "Vegetarian",
      "Vegan",
      "Gluten-Free",
      "Halal",
      "Spicy",
      "Popular",
    ],
  },
  {
    id: "bakery",
    label: "Artisan Bakery",
    description: "Handcrafted sourdough, pastries, viennoiserie and savory bakes",
    recommendedSections: [
      "Sourdough & Artisanal Loaves",
      "Viennoiserie & Croissants",
      "Savoury Pastries",
      "Tarts & Sweet Bakes",
      "Filled Baguettes & Sandwiches",
      "Coffee & Morning Drinks",
    ],
    recommendedTags: [
      "Freshly Baked",
      "Sourdough",
      "Vegan",
      "Vegetarian",
      "Dairy-Free",
      "Organic",
      "Nut-Free",
    ],
  },
  {
    id: "hotel",
    label: "Hotel & Hospitality",
    description: "Multi-outlet hotel with public dining and in-room service",
    recommendedSections: [
      "Breakfast Buffet & A La Carte",
      "Terrace Bistro Plates",
      "All-Day Dining",
      "Light Bites & Tapas",
      "Late-Night Room Service",
      "Executive Lounge Bar",
    ],
    recommendedTags: [
      "Guest Exclusive",
      "Chef's Special",
      "Comfort",
      "Vegetarian",
      "Gluten-Free",
      "Halal",
      "24/7",
    ],
  },
  {
    id: "pizzeria",
    label: "Pizzeria & Trattoria",
    description: "Wood-fired crusts, traditional toppings, calzones and antipasti",
    recommendedSections: [
      "Wood-Fired Pizzas",
      "White & Specialty Pizzas",
      "Calzones",
      "Antipasti & Fresh Salads",
      "Italian Desserts & Gelato",
      "Italian Sodas & Wine",
    ],
    recommendedTags: ["Wood-Fired", "Vegetarian", "Spicy", "Halal", "Contains Dairy", "Popular"],
  },
  {
    id: "cloud-kitchen",
    label: "Delivery & Cloud Kitchen",
    description: "Virtual storefront optimized for fast delivery packaging",
    recommendedSections: [
      "Signature Combos",
      "Smashed Burgers",
      "Loaded Sides & Fries",
      "House Shakes & Drinks",
      "Sweet Desserts",
    ],
    recommendedTags: ["Popular", "Special Offer", "Halal", "Spicy", "Fast Prep", "Family Size"],
  },
];

export const GENERAL_SUGGESTED_TAGS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Halal",
  "Dairy-Free",
  "Spicy",
  "Chef's Special",
  "Popular",
  "Single Origin",
  "Sourdough",
  "Organic",
  "Kids",
];

export interface CuratedLibraryImage {
  id: string;
  title: string;
  category: "coffee" | "breakfast" | "bakery" | "mains" | "burgers" | "dessert" | "drinks";
  url: string;
}

export const PROTOTYPE_IMAGE_LIBRARY: CuratedLibraryImage[] = [
  {
    id: "img_flat_white",
    title: "Artisan Flat White & Latte Art",
    category: "coffee",
    url: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "img_cold_brew",
    title: "18-Hour Slow Cold Brew on Ice",
    category: "coffee",
    url: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "img_avo_toast",
    title: "Avocado Sourdough Toast with Seeds",
    category: "breakfast",
    url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "img_croissant",
    title: "Flaky Golden Butter Croissant",
    category: "bakery",
    url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "img_sourdough",
    title: "Crusty Artisanal Country Sourdough",
    category: "bakery",
    url: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "img_wagyu_smash",
    title: "Double Wagyu Cheeseburger with Fries",
    category: "burgers",
    url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "img_steak_frites",
    title: "Prime Aged Ribeye Steak & Herb Butter",
    category: "mains",
    url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "img_risotto",
    title: "Wild Mushroom & Truffle Risotto",
    category: "mains",
    url: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "img_pistachio_gelato",
    title: "Bronte Pistachio Artisanal Gelato",
    category: "dessert",
    url: "https://images.unsplash.com/photo-1560008511-11c63416e52d?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "img_mandazi",
    title: "Cardamom Spiced Mandazi Pastries",
    category: "bakery",
    url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
  },
];

/**
 * Returns recommended section names tailored to a business category or business type.
 * If custom or unrecognized, returns sensible universal defaults.
 */
export function getRecommendedSectionsForCategory(categoryOrType: string = ""): string[] {
  const norm = categoryOrType.toLowerCase().trim();
  const matched = SUGGESTED_BUSINESS_CATEGORIES.find(
    (c) =>
      norm.includes(c.id) ||
      norm.includes(c.label.toLowerCase()) ||
      c.label.toLowerCase().includes(norm),
  );
  if (matched) return matched.recommendedSections;

  return [
    "Specialties & Signatures",
    "Mains & Plates",
    "Starters & Small Bites",
    "Sides & Extras",
    "Desserts & Sweets",
    "Drinks & Beverages",
  ];
}

/**
 * Returns suggested tags tailored to a category, combined with universal dietary/descriptor tags.
 */
export function getRecommendedTagsForCategory(categoryOrType: string = ""): string[] {
  const norm = categoryOrType.toLowerCase().trim();
  const matched = SUGGESTED_BUSINESS_CATEGORIES.find(
    (c) =>
      norm.includes(c.id) ||
      norm.includes(c.label.toLowerCase()) ||
      c.label.toLowerCase().includes(norm),
  );
  if (matched) {
    return Array.from(new Set([...matched.recommendedTags, ...GENERAL_SUGGESTED_TAGS]));
  }
  return GENERAL_SUGGESTED_TAGS;
}

/**
 * Aggregates all unique descriptive tags across all sections of a menu
 * to support immediate 1-tap tag reuse for merchants.
 */
export function getExistingMenuTags(menu?: {
  sections: { offerings: { tags?: string[] }[] }[];
}): string[] {
  if (!menu?.sections) return [];
  const tags = new Set<string>();
  for (const sec of menu.sections) {
    if (!sec.offerings) continue;
    for (const off of sec.offerings) {
      if (Array.isArray(off.tags)) {
        for (const t of off.tags) {
          const clean = t?.trim();
          if (clean) tags.add(clean);
        }
      }
    }
  }
  return Array.from(tags);
}
