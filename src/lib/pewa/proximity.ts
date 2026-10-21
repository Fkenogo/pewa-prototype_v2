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
}

export const NAIROBI_NEIGHBORHOOD_ZONES: NeighborhoodZone[] = [
  {
    id: "cbd",
    name: "CBD",
    center: { latitude: -1.2841, longitude: 36.8236 },
    dispatchRadiusKm: 2.5,
    aliases: ["cbd", "moi avenue", "moi ave", "city centre", "central business district"],
  },
  {
    id: "westlands",
    name: "Westlands",
    center: { latitude: -1.2612, longitude: 36.8044 },
    dispatchRadiusKm: 3.0,
    aliases: ["westlands", "karuna close", "sarit", "westgate"],
  },
  {
    id: "riverside",
    name: "Riverside",
    center: { latitude: -1.2683, longitude: 36.7972 },
    dispatchRadiusKm: 2.5,
    aliases: ["riverside", "riverside drive"],
  },
  {
    id: "kilimani",
    name: "Kilimani & Lavington",
    center: { latitude: -1.295, longitude: 36.785 },
    dispatchRadiusKm: 3.5,
    aliases: ["kilimani", "lavington", "hurlingham"],
  },
  {
    id: "village-market",
    name: "Village Market & Gigiri",
    center: { latitude: -1.2294, longitude: 36.8047 },
    dispatchRadiusKm: 3.0,
    aliases: ["village market", "gigiri", "un avenue", "courtyard"],
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
 * - Venues lacking coordinates or delivery coverage return hasSufficientData: false.
 */
export function evaluateVenueProximity(
  venue: Venue,
  userCoords: VenueCoordinates,
  radiusKm = DEFAULT_NEARBY_RADIUS_KM,
): ProximityEvaluation {
  if (venue.deliveryOnly) {
    const areaLower = (venue.serviceArea || "").toLowerCase().trim();
    if (!areaLower) {
      return { isNearby: false, hasSufficientData: false };
    }

    // Identify which defined delivery zones match this venue's serviceArea text
    const coveredZones = NAIROBI_NEIGHBORHOOD_ZONES.filter((zone) =>
      zone.aliases.some((alias) => areaLower.includes(alias)),
    );

    if (coveredZones.length === 0) {
      // Service area text exists but doesn't map to known coordinate boundaries
      return { isNearby: false, hasSufficientData: false };
    }

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
        };
      }
    }

    return {
      isNearby: false,
      hasSufficientData: true,
      matchingReason: "delivery_service_area",
    };
  }

  // Storefront venue: evaluate direct physical coordinates
  if (
    !venue.coordinates ||
    typeof venue.coordinates.latitude !== "number" ||
    typeof venue.coordinates.longitude !== "number"
  ) {
    return { isNearby: false, hasSufficientData: false };
  }

  const dist = haversineDistanceKm(
    userCoords.latitude,
    userCoords.longitude,
    venue.coordinates.latitude,
    venue.coordinates.longitude,
  );

  return {
    isNearby: dist <= radiusKm,
    hasSufficientData: true,
    distanceKm: dist,
    matchingReason: "storefront_proximity",
  };
}
