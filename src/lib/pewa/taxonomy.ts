// src/lib/pewa/taxonomy.ts
// R1-A: Bounded Menu Taxonomy, Eligibility, and Safeguards Engine for PEWA Prototype

import type { Menu, Offering, Venue, Organisation } from "./types";

export interface BusinessCategoryDefinition {
  id: string;
  label: string;
  description: string;
  recommendedSections: string[];
  recommendedTags: string[];
}

export type TagGroupKind = "dietary_claims" | "promotional" | "descriptive";

export interface TagSuggestionGroup {
  id: TagGroupKind;
  label: string;
  hint: string;
  tags: string[];
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

export const DIETARY_AND_DECLARATION_TAGS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Halal",
  "Dairy-Free",
  "Nut-Free",
];

export const PROMOTIONAL_HIGHLIGHT_TAGS = [
  "Chef's Special",
  "Popular",
  "Signature",
  "Seasonal",
  "New",
  "Guest Exclusive",
];

export const PEWA_TAG_DISCLAIMER =
  "Dietary and attribute declarations are merchant-provided and have not been independently verified by PEWA. Customers with severe allergies or religious requirements should verify directly with the business.";

export function isDietaryClaimTag(tag: string): boolean {
  const norm = tag.trim().toLowerCase();
  return DIETARY_AND_DECLARATION_TAGS.some((d) => d.toLowerCase() === norm);
}

export const GENERAL_SUGGESTED_TAGS = [
  ...DIETARY_AND_DECLARATION_TAGS,
  ...PROMOTIONAL_HIGHLIGHT_TAGS,
  "Spicy",
  "Single Origin",
  "Sourdough",
  "Organic",
  "Kids",
];

export function getGroupedTagSuggestionsForCategory(
  categoryOrType: string = "",
): TagSuggestionGroup[] {
  const norm = categoryOrType.toLowerCase().trim();
  const matched = SUGGESTED_BUSINESS_CATEGORIES.find(
    (c) =>
      norm.includes(c.id) ||
      norm.includes(c.label.toLowerCase()) ||
      c.label.toLowerCase().includes(norm),
  );

  const categorySpecific = matched?.recommendedTags || [
    "Specialty",
    "House Blend",
    "Organic",
    "Spicy",
  ];
  const descriptive = categorySpecific.filter(
    (t) =>
      !DIETARY_AND_DECLARATION_TAGS.some((d) => d.toLowerCase() === t.toLowerCase()) &&
      !PROMOTIONAL_HIGHLIGHT_TAGS.some((p) => p.toLowerCase() === t.toLowerCase()),
  );

  return [
    {
      id: "dietary_claims",
      label: "Dietary & Consequential Claims",
      hint: "Merchant-declared; not certified by PEWA.",
      tags: DIETARY_AND_DECLARATION_TAGS,
    },
    {
      id: "promotional",
      label: "Promotional Highlights",
      hint: "Highlight chef specialties and customer favorites.",
      tags: PROMOTIONAL_HIGHLIGHT_TAGS,
    },
    {
      id: "descriptive",
      label: "Preparation & Style Attributes",
      hint: "Style, origin, temperature, or culinary technique.",
      tags:
        descriptive.length > 0 ? descriptive : ["Freshly Made", "Artisanal", "Organic", "Spicy"],
    },
  ];
}

export interface CuratedLibraryImage {
  id: string;
  title: string;
  category: "coffee" | "breakfast" | "bakery" | "mains" | "burgers" | "dessert" | "drinks";
  url: string;
  keywords?: string[];
}

export const IMAGE_LIBRARY_CATEGORIES = [
  { id: "all", label: "All Photos" },
  { id: "coffee", label: "Coffee & Tea" },
  { id: "bakery", label: "Bakery & Bakes" },
  { id: "breakfast", label: "Breakfast & Brunch" },
  { id: "mains", label: "Main Dishes" },
  { id: "burgers", label: "Burgers & Sandwiches" },
  { id: "dessert", label: "Desserts & Sweets" },
  { id: "drinks", label: "Cold Drinks & Juices" },
] as const;

export const PROTOTYPE_IMAGE_LIBRARY: CuratedLibraryImage[] = [
  // Coffee & Tea
  {
    id: "img_flat_white",
    title: "Artisan Flat White & Latte Art",
    category: "coffee",
    url: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80",
    keywords: ["coffee", "flat white", "latte", "espresso", "milk", "hot"],
  },
  {
    id: "img_cappuccino",
    title: "Classic Frothy Cappuccino with Cocoa",
    category: "coffee",
    url: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80",
    keywords: ["coffee", "cappuccino", "espresso", "foam", "cocoa", "hot"],
  },
  {
    id: "img_cold_brew",
    title: "18-Hour Slow Cold Brew on Ice",
    category: "coffee",
    url: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
    keywords: ["coffee", "cold brew", "iced", "ice", "black"],
  },
  {
    id: "img_espresso_single",
    title: "Single Origin Double Shot Espresso",
    category: "coffee",
    url: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80",
    keywords: ["coffee", "espresso", "crema", "short", "hot"],
  },
  {
    id: "img_iced_latte",
    title: "Iced Vanilla Oat Milk Latte",
    category: "coffee",
    url: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80",
    keywords: ["coffee", "iced latte", "oat milk", "vanilla", "iced"],
  },

  // Bakery & Bakes
  {
    id: "img_croissant",
    title: "Flaky Golden Butter Croissant",
    category: "bakery",
    url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    keywords: ["croissant", "pastry", "butter", "viennoiserie", "bake", "breakfast"],
  },
  {
    id: "img_almond_croissant",
    title: "Toasted Almond Frangipane Croissant",
    category: "bakery",
    url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
    keywords: ["almond croissant", "croissant", "pastry", "almond", "baked", "flaky"],
  },
  {
    id: "img_sourdough",
    title: "Crusty Artisanal Country Sourdough",
    category: "bakery",
    url: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=600&q=80",
    keywords: ["bread", "sourdough", "loaf", "artisanal", "crust"],
  },
  {
    id: "img_cinnamon_roll",
    title: "Glazed Cinnamon Swirl Bun",
    category: "bakery",
    url: "https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=600&q=80",
    keywords: ["cinnamon roll", "bun", "pastry", "sweet", "spice"],
  },
  {
    id: "img_mandazi",
    title: "Cardamom Spiced Mandazi Pastries",
    category: "bakery",
    url: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=600&q=80",
    keywords: ["mandazi", "swahili", "cardamom", "pastry", "fried"],
  },

  // Breakfast & Brunch
  {
    id: "img_avo_toast",
    title: "Avocado Sourdough Toast with Seeds",
    category: "breakfast",
    url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
    keywords: ["avocado", "toast", "breakfast", "brunch", "sourdough", "vegan"],
  },
  {
    id: "img_pancakes",
    title: "Fluffy Buttermilk Pancakes with Berries",
    category: "breakfast",
    url: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80",
    keywords: ["pancakes", "berries", "syrup", "breakfast", "sweet"],
  },
  {
    id: "img_eggs_benedict",
    title: "Classic Eggs Benedict with Hollandaise",
    category: "breakfast",
    url: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=600&q=80",
    keywords: ["eggs benedict", "poached eggs", "brunch", "breakfast"],
  },

  // Mains
  {
    id: "img_steak_frites",
    title: "Prime Aged Ribeye Steak & Herb Butter",
    category: "mains",
    url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    keywords: ["steak", "beef", "ribeye", "meat", "dinner", "mains"],
  },
  {
    id: "img_risotto",
    title: "Wild Mushroom & Truffle Risotto",
    category: "mains",
    url: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=600&q=80",
    keywords: ["risotto", "mushroom", "truffle", "italian", "vegetarian", "rice"],
  },
  {
    id: "img_salmon",
    title: "Pan-Seared Salmon with Asparagus",
    category: "mains",
    url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80",
    keywords: ["salmon", "fish", "seafood", "healthy", "dinner"],
  },
  {
    id: "img_pizza",
    title: "Wood-Fired Neapolitan Margherita Pizza",
    category: "mains",
    url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
    keywords: ["pizza", "margherita", "cheese", "wood-fired", "italian"],
  },

  // Burgers
  {
    id: "img_wagyu_smash",
    title: "Double Wagyu Cheeseburger with Fries",
    category: "burgers",
    url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    keywords: ["burger", "cheeseburger", "wagyu", "fries", "beef"],
  },
  {
    id: "img_chicken_burger",
    title: "Crispy Buttermilk Chicken Sandwich",
    category: "burgers",
    url: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80",
    keywords: ["chicken burger", "crispy chicken", "sandwich", "spicy"],
  },

  // Desserts
  {
    id: "img_pistachio_gelato",
    title: "Bronte Pistachio Artisanal Gelato",
    category: "dessert",
    url: "https://images.unsplash.com/photo-1560008511-11c63416e52d?auto=format&fit=crop&w=600&q=80",
    keywords: ["gelato", "ice cream", "pistachio", "dessert", "sweet"],
  },
  {
    id: "img_tiramisu",
    title: "Classic Espresso Savoiardi Tiramisu",
    category: "dessert",
    url: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80",
    keywords: ["tiramisu", "dessert", "espresso", "mascarpone", "italian"],
  },

  // Drinks
  {
    id: "img_fresh_juice",
    title: "Freshly Cold-Pressed Orange Juice",
    category: "drinks",
    url: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80",
    keywords: ["orange juice", "juice", "fresh", "drink", "cold", "citrus"],
  },
  {
    id: "img_iced_tea",
    title: "Hibiscus Berry Iced Tea Cooler",
    category: "drinks",
    url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
    keywords: ["iced tea", "hibiscus", "cooler", "tea", "drink", "cold"],
  },
];

/**
 * Resolves a curated library image by its stable ID.
 */
export function getCuratedLibraryImage(id: string): CuratedLibraryImage | undefined {
  return PROTOTYPE_IMAGE_LIBRARY.find((img) => img.id === id);
}

/**
 * Returns the URL for a curated library image by its stable ID, or an empty string if not found.
 */
export function getCuratedLibraryImageUrl(id: string): string {
  const item = getCuratedLibraryImage(id);
  return item ? item.url : "";
}

/**
 * Searches and filters the prototype curated image library by keyword and/or category.
 */
export function searchImageLibrary(
  query: string = "",
  category: string = "all",
): CuratedLibraryImage[] {
  const q = query.toLowerCase().trim();
  return PROTOTYPE_IMAGE_LIBRARY.filter((item) => {
    const matchesCat = category === "all" || item.category === category;
    if (!matchesCat) return false;
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(q)))
    );
  });
}

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

/**
 * Minimum explicit venue/menu publication eligibility check.
 * Ensures organisation ownership alone does not make a menu available at every venue.
 */
export function isMenuEligibleForVenue(menu: Menu, venue: Venue, allVenues?: Venue[]): boolean {
  if (menu.orgId !== venue.orgId) return false;

  // 1. Explicit multi-venue eligibility list
  if (menu.venueIds && menu.venueIds.length > 0) {
    return menu.venueIds.includes(venue.id);
  }

  // 2. Explicit single venue assignment
  if (menu.venueId) {
    return menu.venueId === venue.id;
  }

  // 3. Fallback for single-venue organisations (e.g. initial onboarding or single-store)
  if (allVenues) {
    const orgVenues = allVenues.filter((v) => v.orgId === menu.orgId);
    if (orgVenues.length <= 1) return true;
    // Multi-venue organisation without explicit venue assignment is NOT eligible at this venue
    return false;
  }

  return false;
}

/**
 * Returns the effective customer-facing live menu representation.
 * If a published menu has a publishedSnapshot, the snapshot is returned
 * so that uncommitted draft changes (including venue assignment, protection,
 * sections, offerings, and prices) are isolated from customers until publication.
 */
export function getLiveMenu(menu: Menu): Menu {
  if (menu.status !== "published" || !menu.publishedSnapshot) {
    return menu;
  }
  return {
    ...menu,
    name: menu.publishedSnapshot.name,
    description: menu.publishedSnapshot.description,
    coverImage: menu.publishedSnapshot.coverImage,
    venueId: menu.publishedSnapshot.venueId,
    venueIds: menu.publishedSnapshot.venueIds,
    isProtected: menu.publishedSnapshot.isProtected,
    sections: menu.publishedSnapshot.sections,
    publishedAt: menu.publishedSnapshot.publishedAt,
  };
}

/**
 * Returns all published menus eligible for a specific venue, evaluated against
 * their effective published state (including published venue assignments and protection).
 *
 * Requirements (CORR-D):
 * 1. Determines whether the menu has a published status.
 * 2. Resolves its effective published snapshot.
 * 3. Evaluates venue eligibility and public/protected visibility against that effective published state.
 */
export function getVenuePublishedMenus(
  venue: Venue,
  menus: Menu[],
  allVenues?: Venue[],
  options?: { includeProtected?: boolean },
): Menu[] {
  const includeProtected = options?.includeProtected ?? true;
  return menus
    .filter((m) => m.status === "published")
    .map(getLiveMenu)
    .filter((liveMenu) => {
      if (!includeProtected && liveMenu.isProtected) return false;
      return isMenuEligibleForVenue(liveMenu, venue, allVenues);
    });
}

/**
 * Returns whether an offering image originates from the curated prototype library or merchant upload.
 */
export function getImageSource(offering: {
  image?: string | undefined;
  imageSource?: "library" | "upload" | undefined;
}): "library" | "upload" | undefined {
  if (!offering.image) return undefined;
  if (offering.imageSource) return offering.imageSource;
  if (PROTOTYPE_IMAGE_LIBRARY.some((lib) => lib.url === offering.image)) {
    return "library";
  }
  return "upload";
}

/**
 * Validates and scales down an uploaded user image to prevent unbounded base64 strings
 * from overwhelming persisted prototype localStorage.
 * Max dimension 800px, JPEG quality 0.82. Rejects files > 5MB or non-images.
 */
export async function processImageUpload(file: File): Promise<{
  dataUrl: string;
  source: "upload";
}> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Unsupported file format. Please upload a JPEG, PNG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image file is too large (max 5MB). Please choose a smaller photo.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(
        new Error("Failed to read the selected file. Previously selected image is preserved."),
      );
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        return reject(
          new Error("Failed to process image data. Previously selected image is preserved."),
        );
      }

      // Check if window and Image exist (browser environment)
      if (typeof window === "undefined" || typeof Image === "undefined") {
        return reject(
          new Error(
            "Image processing requires a browser environment. Previously selected image is preserved.",
          ),
        );
      }

      const img = new Image();
      img.onerror = () =>
        reject(new Error("Unable to decode image file. Previously selected image is preserved."));
      img.onload = () => {
        try {
          const maxDim = 800;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return reject(
              new Error(
                "Unable to compress image: 2D canvas context is unavailable. Previously selected image is preserved.",
              ),
            );
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.82);
          if (!compressed || !compressed.startsWith("data:image/")) {
            return reject(
              new Error(
                "Image compression output was invalid. Previously selected image is preserved.",
              ),
            );
          }
          resolve({ dataUrl: compressed, source: "upload" });
        } catch (err: unknown) {
          const detail = err instanceof Error ? err.message : "Compression failed";
          reject(
            new Error(
              `Unable to compress image (${detail}). Previously selected image is preserved.`,
            ),
          );
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export interface CropOptions {
  zoom?: number; // scale: 1.0 to 3.0
  panX?: number; // -50 to 50 (% offset from center)
  panY?: number; // -50 to 50 (% offset from center)
  aspectRatio?: number; // width / height, e.g. 1 (square) or 4/3
}

/**
 * Crops and compresses an image data URL or image source.
 * Supports interactive zoom (scale), pan (repositioning), and aspect-ratio clipping
 * while ensuring bounded output size for prototype persistence.
 */
export async function cropAndCompressImage(
  dataUrl: string,
  options: CropOptions = {},
): Promise<{
  dataUrl: string;
  source: "upload";
}> {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    throw new Error("Invalid image data provided for cropping.");
  }

  if (typeof window === "undefined" || typeof Image === "undefined") {
    throw new Error(
      "Image processing requires a browser environment. Previously selected image is preserved.",
    );
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () =>
      reject(new Error("Unable to decode image file. Previously selected image is preserved."));
    img.onload = () => {
      try {
        const aspect = options.aspectRatio ?? 4 / 3;
        const targetWidth = 800;
        const targetHeight = Math.round(targetWidth / aspect);

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(
            new Error(
              "Unable to compress image: 2D canvas context is unavailable. Previously selected image is preserved.",
            ),
          );
        }

        const zoom = Math.max(1, options.zoom ?? 1);
        const panX = Math.max(-50, Math.min(50, options.panX ?? 0));
        const panY = Math.max(-50, Math.min(50, options.panY ?? 0));

        // Calculate source rect
        const imgAspect = img.width / img.height;
        let baseW = img.width;
        let baseH = img.height;

        if (imgAspect > aspect) {
          baseW = img.height * aspect;
          baseH = img.height;
        } else {
          baseW = img.width;
          baseH = img.width / aspect;
        }

        const cropW = baseW / zoom;
        const cropH = baseH / zoom;

        const maxOffsetW = (img.width - cropW) / 2;
        const maxOffsetH = (img.height - cropH) / 2;

        const centerX = img.width / 2;
        const centerY = img.height / 2;

        const offsetX = (panX / 50) * maxOffsetW;
        const offsetY = (panY / 50) * maxOffsetH;

        let srcX = centerX - cropW / 2 + offsetX;
        let srcY = centerY - cropH / 2 + offsetY;

        srcX = Math.max(0, Math.min(img.width - cropW, srcX));
        srcY = Math.max(0, Math.min(img.height - cropH, srcY));

        ctx.drawImage(img, srcX, srcY, cropW, cropH, 0, 0, targetWidth, targetHeight);
        const compressed = canvas.toDataURL("image/jpeg", 0.82);
        if (!compressed || !compressed.startsWith("data:image/")) {
          return reject(
            new Error(
              "Image compression output was invalid. Previously selected image is preserved.",
            ),
          );
        }
        resolve({ dataUrl: compressed, source: "upload" });
      } catch (err: unknown) {
        const detail = err instanceof Error ? err.message : "Crop failed";
        reject(
          new Error(
            `Unable to crop/compress image (${detail}). Previously selected image is preserved.`,
          ),
        );
      }
    };
    img.src = dataUrl;
  });
}

/**
 * Returns contextual suggested menu names for convenient 1-tap naming in Step 2.
 * Merchants remain free to edit or write arbitrary names in any language.
 */
export function getSuggestedMenuNamesForCategory(categoryContext?: string): string[] {
  const norm = (categoryContext || "").toLowerCase();
  if (norm.includes("café") || norm.includes("cafe")) {
    return [
      "All-Day Menu",
      "Breakfast & Brunch",
      "Breakfast & Morning",
      "All-Day Café Menu",
      "Specialty Coffee & Drinks",
      "Pastries & Bakes",
      "Lunch & Sandwiches",
      "Seasonal Specials",
    ];
  }
  if (norm.includes("hotel") || norm.includes("hospitality")) {
    return [
      "In-Room Dining",
      "Breakfast Menu",
      "Terrace Bistro & Dining",
      "Rooftop Lounge & Cocktails",
      "In-Room Dining (Guests Only)",
      "Breakfast Buffet & A La Carte",
      "Poolside & Light Bites",
      "Late-Night Room Service",
    ];
  }
  if (norm.includes("bakery")) {
    return [
      "Fresh Bakes & Pastries",
      "Artisan Breads & Loaves",
      "Viennoiserie & Morning Pastries",
      "Savory Bakes & Sandwiches",
      "Cakes & Celebration Treats",
      "Coffee & Warm Drinks",
    ];
  }
  if (norm.includes("restaurant") || norm.includes("bistro")) {
    return [
      "Dinner Menu",
      "Chef's Tasting",
      "A La Carte Dining",
      "Lunch Menu",
      "Dinner Specials",
      "Wine & Beverage List",
      "Desserts & Digestifs",
      "Chef's Tasting Menu",
    ];
  }
  if (norm.includes("delivery") || norm.includes("cloud")) {
    return [
      "Express Delivery Menu",
      "Combo Deals & Value Packs",
      "Late Night Cravings",
      "Sides & Beverages",
    ];
  }
  return [
    "All-Day Menu",
    "Breakfast",
    "Lunch",
    "Dinner",
    "Drinks & Beverages",
    "Desserts",
    "Specials",
  ];
}

/**
 * Derives the brand and business context for a venue to display in Step 1.
 */
export function getVenueBrandContext(
  venue: Venue,
  org?: Organisation | null,
): {
  brandName: string;
  category: string;
  services: string[];
  isMultiVenue: boolean;
  isMultiBrand: boolean;
  displayLabel: string;
} {
  const brandName = venue.name;
  const category =
    venue.businessCategory || venue.category || org?.businessType || org?.category || "Business";
  const services = venue.services || [];
  const isMultiBrand = !!(
    org?.name?.toLowerCase().includes("group") ||
    org?.name?.toLowerCase().includes("holdings") ||
    org?.businessType?.toLowerCase().includes("multi-brand")
  );
  const isMultiVenue = isMultiBrand || !!org?.businessType?.toLowerCase().includes("multi-venue");
  const displayLabel = `${venue.name}${org?.name && org.name !== venue.name ? ` (${org.name})` : ""}`;

  return {
    brandName,
    category,
    services,
    isMultiVenue,
    isMultiBrand,
    displayLabel,
  };
}
