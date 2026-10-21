import { describe, it, expect } from "vitest";
import {
  haversineDistanceKm,
  evaluateVenueProximity,
  hasVenueLocationData,
  DEFAULT_NEARBY_RADIUS_KM,
} from "@/lib/pewa/proximity";
import type { Venue } from "@/lib/pewa/types";

describe("Proximity and Delivery Coverage Engine", () => {
  it("calculates accurate great-circle distances between known Nairobi landmarks", () => {
    // Westlands to Riverside (~1.1 km)
    const distWestlandsToRiverside = haversineDistanceKm(-1.2612, 36.8044, -1.2683, 36.7972);
    expect(distWestlandsToRiverside).toBeGreaterThan(1.0);
    expect(distWestlandsToRiverside).toBeLessThan(1.3);

    // Westlands to CBD (~3.3 km)
    const distWestlandsToCBD = haversineDistanceKm(-1.2612, 36.8044, -1.2841, 36.8236);
    expect(distWestlandsToCBD).toBeGreaterThan(3.1);
    expect(distWestlandsToCBD).toBeLessThan(3.6);

    // CBD to Gigiri / Village Market (~6.4 km)
    const distCBDToGigiri = haversineDistanceKm(-1.2841, 36.8236, -1.2294, 36.8047);
    expect(distCBDToGigiri).toBeGreaterThan(6.0);
    expect(distCBDToGigiri).toBeLessThan(6.8);
  });

  it("evaluates physical storefronts by direct coordinates and radius", () => {
    const westlandsVenue: Venue = {
      id: "v_westlands",
      orgId: "org_1",
      name: "Westlands Bakery",
      slug: "westlands-bakery",
      address: "24 Karuna Close, Westlands",
      deliveryOnly: false,
      serviceArea: "",
      services: ["Dine-in"],
      contact: { phone: "", whatsapp: "", email: "" },
      tagline: "",
      currency: "KES",
      coordinates: { latitude: -1.2612, longitude: 36.8044 },
    };

    // User at Westlands: exactly 0 km -> nearby
    const atWestlands = evaluateVenueProximity(
      westlandsVenue,
      { latitude: -1.2612, longitude: 36.8044 },
      DEFAULT_NEARBY_RADIUS_KM,
    );
    expect(atWestlands.isNearby).toBe(true);
    expect(atWestlands.hasSufficientData).toBe(true);
    expect(atWestlands.distanceKm).toBeCloseTo(0, 1);
    expect(atWestlands.matchingReason).toBe("storefront_proximity");

    // User in CBD: ~3.32 km -> outside default 3.0 km radius
    const atCBD = evaluateVenueProximity(
      westlandsVenue,
      { latitude: -1.2841, longitude: 36.8236 },
      DEFAULT_NEARBY_RADIUS_KM,
    );
    expect(atCBD.isNearby).toBe(false);
    expect(atCBD.hasSufficientData).toBe(true);
    expect(atCBD.distanceKm).toBeGreaterThan(3.0);
  });

  it("evaluates delivery-only businesses by defined service area coverage", () => {
    const cloudKitchenVenue: Venue = {
      id: "v_cloud",
      orgId: "org_2",
      name: "Cloud Kitchen Dispatch",
      slug: "cloud-kitchen",
      address: "",
      deliveryOnly: true,
      serviceArea: "Kilimani, Lavington & Westlands",
      services: ["Delivery"],
      contact: { phone: "", whatsapp: "", email: "" },
      tagline: "",
      currency: "KES",
    };

    // User in Westlands: covered
    const userInWestlands = evaluateVenueProximity(cloudKitchenVenue, {
      latitude: -1.2612,
      longitude: 36.8044,
    });
    expect(userInWestlands.isNearby).toBe(true);
    expect(userInWestlands.hasSufficientData).toBe(true);
    expect(userInWestlands.matchingReason).toBe("delivery_service_area");

    // User in Gigiri / Village Market: NOT in Kilimani, Lavington, or Westlands
    const userInGigiri = evaluateVenueProximity(cloudKitchenVenue, {
      latitude: -1.2294,
      longitude: 36.8047,
    });
    expect(userInGigiri.isNearby).toBe(false);
    expect(userInGigiri.hasSufficientData).toBe(true);
  });

  it("reports insufficient data when venue lacks both coordinates and service area", () => {
    const unconfiguredVenue: Venue = {
      id: "v_unconfigured",
      orgId: "org_3",
      name: "Unconfigured Eatery",
      slug: "unconfigured-eatery",
      address: "Some Unknown Street",
      deliveryOnly: false,
      serviceArea: "",
      services: ["Dine-in"],
      contact: { phone: "", whatsapp: "", email: "" },
      tagline: "",
      currency: "KES",
      coordinates: undefined,
    };

    expect(hasVenueLocationData(unconfiguredVenue)).toBe(false);

    const evalResult = evaluateVenueProximity(unconfiguredVenue, {
      latitude: -1.2612,
      longitude: 36.8044,
    });
    expect(evalResult.isNearby).toBe(false);
    expect(evalResult.hasSufficientData).toBe(false);
  });
});
