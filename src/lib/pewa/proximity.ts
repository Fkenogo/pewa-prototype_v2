import type { Venue, VenueCoordinates } from "./types";

/**
 * Genuine Earth radius in kilometers for Haversine spherical distance calculation.
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Default nearby discovery radius in kilometers for local neighborhood exploration.
 */
export const DEFAULT_NEARBY_RADIUS_KM = 3.0;

/**
 * Prototype neighborhood delivery and dispatch zones with authentic Nairobi coordinates.
 */
export interface NeighborhoodZone {
  id: string;
  name: string;
  center: VenueCoordinates;
  dispatchRadiusKm: number;
  aliases: string[];
  isPrototypeApproximation: boolean;
}

export const NAIROBI_NEIGHBORHOOD_ZONES: NeighborhoodZone[] = [
  {
    id: "cbd",
    name: "CBD",
    center: { latitude: -1.2841, longitude: 36.8236, verificationStatus: "demonstration" },
    dispatchRadiusKm: 2.5,
    aliases: ["cbd", "moi avenue", "moi ave", "city centre", "central business district"],
    isPrototypeApproximation: true,
  },
  {
    id: "westlands",
    name: "Westlands",
    center: { latitude: -1.2612, longitude: 36.8044, verificationStatus: "demonstration" },
    dispatchRadiusKm: 3.0,
    aliases: ["westlands", "karuna close", "sarit", "westgate"],
    isPrototypeApproximation: true,
  },
  {
    id: "riverside",
    name: "Riverside",
    center: { latitude: -1.2683, longitude: 36.7972, verificationStatus: "demonstration" },
    dispatchRadiusKm: 2.5,
    aliases: ["riverside", "riverside drive"],
    isPrototypeApproximation: true,
  },
  {
    id: "kilimani",
    name: "Kilimani & Lavington",
    center: { latitude: -1.295, longitude: 36.785, verificationStatus: "demonstration" },
    dispatchRadiusKm: 3.5,
    aliases: ["kilimani", "lavington", "hurlingham"],
    isPrototypeApproximation: true,
  },
  {
    id: "village-market",
    name: "Village Market & Gigiri",
    center: { latitude: -1.2294, longitude: 36.8047, verificationStatus: "demonstration" },
    dispatchRadiusKm: 3.0,
    aliases: ["village market", "gigiri", "un avenue", "courtyard"],
    isPrototypeApproximation: true,
  },
];

/**
 * Calculates great-circle distance between two geographic coordinates using Haversine formula.
 * Pure mathematical calculation with zero external service dependencies.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export interface ProximityEvaluation {
  isNearby: boolean;
  hasSufficientData: boolean;
  distanceKm?: number;
  matchingReason?: "storefront_proximity" | "delivery_service_area";
  isVerified: boolean;
  isDeliveryConfirmed: boolean;
  isDemonstrationData: boolean;
  verificationNote: string;
}

/**
 * Checks if a venue has sufficient grounded location data (either exact storefront
 * coordinates or a defined delivery dispatch area for delivery-only businesses).
 */
export function hasVenueLocationData(venue: Venue): boolean {
  if (venue.deliveryOnly) {
    return Boolean(venue.serviceArea && venue.serviceArea.trim().length > 0);
  }
  return Boolean(
    venue.coordinates &&
    typeof venue.coordinates.latitude === "number" &&
    typeof venue.coordinates.longitude === "number",
  );
}

/**
 * Evaluates whether a venue is nearby the user's coordinates.
 *
 * Rules:
 * - Physical storefronts are evaluated by direct distance to their coordinates.
 * - Delivery-only businesses are evaluated by whether the user's coordinates fall
 *   within their designated dispatch service area.
 * - Demonstration fixture coordinates and approximate dispatch circles are clearly
 *   flagged as illustrative with isVerified: false and isDemonstrationData: true.
 * - Verified merchant onboarding data (coordinates.verificationStatus === "verified"
 *   or venue.deliveryCoverageStatus === "confirmed_merchant_coverage") produces
 *   isVerified: true and isDemonstrationData: false.
 */
export function evaluateVenueProximity(
  venue: Venue,
  userCoords: VenueCoordinates,
  radiusKm = DEFAULT_NEARBY_RADIUS_KM,
): ProximityEvaluation {
  if (venue.deliveryOnly) {
    const areaLower = (venue.serviceArea || "").toLowerCase().trim();
    if (!areaLower) {
      return {
        isNearby: false,
        hasSufficientData: false,
        isVerified: false,
        isDeliveryConfirmed: false,
        isDemonstrationData: true,
        verificationNote: "No delivery dispatch area defined.",
      };
    }

    // Identify which defined delivery zones match this venue's serviceArea text
    const coveredZones = NAIROBI_NEIGHBORHOOD_ZONES.filter((zone) =>
      zone.aliases.some((alias) => areaLower.includes(alias)),
    );

    if (coveredZones.length === 0) {
      // Service area text exists but doesn't map to known coordinate boundaries
      return {
        isNearby: false,
        hasSufficientData: false,
        isVerified: false,
        isDeliveryConfirmed: false,
        isDemonstrationData: true,
        verificationNote: "Service area does not map to known demonstration dispatch boundaries.",
      };
    }

    const isConfirmed = venue.deliveryCoverageStatus === "confirmed_merchant_coverage";

    // Check if user is within the dispatch delivery radius of any covered zone
    for (const zone of coveredZones) {
      const dist = haversineDistanceKm(
        userCoords.latitude,
        userCoords.longitude,
        zone.center.latitude,
        zone.center.longitude,
      );
      if (dist <= zone.dispatchRadiusKm) {
        return {
          isNearby: true,
          hasSufficientData: true,
          distanceKm: dist,
          matchingReason: "delivery_service_area",
          isVerified: isConfirmed,
          isDeliveryConfirmed: isConfirmed,
          isDemonstrationData: !isConfirmed,
          verificationNote: isConfirmed
            ? "Verified merchant delivery coverage."
            : "Prototype approximate delivery zone. Delivery coverage is an illustrative estimate, not confirmed merchant delivery coverage or a service guarantee.",
        };
      }
    }

    return {
      isNearby: false,
      hasSufficientData: true,
      matchingReason: "delivery_service_area",
      isVerified: isConfirmed,
      isDeliveryConfirmed: isConfirmed,
      isDemonstrationData: !isConfirmed,
      verificationNote: isConfirmed
        ? "Outside verified delivery service area."
        : "Outside prototype approximate delivery zone.",
    };
  }

  // Storefront venue: evaluate direct physical coordinates
  if (
    !venue.coordinates ||
    typeof venue.coordinates.latitude !== "number" ||
    typeof venue.coordinates.longitude !== "number"
  ) {
    return {
      isNearby: false,
      hasSufficientData: false,
      isVerified: false,
      isDeliveryConfirmed: false,
      isDemonstrationData: true,
      verificationNote: "Incomplete venue location data.",
    };
  }

  const dist = haversineDistanceKm(
    userCoords.latitude,
    userCoords.longitude,
    venue.coordinates.latitude,
    venue.coordinates.longitude,
  );

  const isVerifiedStorefront = venue.coordinates.verificationStatus === "verified";

  return {
    isNearby: dist <= radiusKm,
    hasSufficientData: true,
    distanceKm: dist,
    matchingReason: "storefront_proximity",
    isVerified: isVerifiedStorefront,
    isDeliveryConfirmed: false,
    isDemonstrationData: !isVerifiedStorefront,
    verificationNote: isVerifiedStorefront
      ? "Verified storefront coordinates."
      : "Demonstration reference coordinates. Storefront distance is an illustrative prototype estimate, not verified storefront coordinates.",
  };
}
