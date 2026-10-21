import { describe, it, expect } from "vitest";
import {
  haversineDistanceKm,
  evaluateVenueProximity,
  hasVenueLocationData,
  DEFAULT_NEARBY_RADIUS_KM,
  NAIROBI_NEIGHBORHOOD_ZONES,
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
    expect(evalResult.isVerified).toBe(false);
    expect(evalResult.isDemonstrationData).toBe(true);
  });

  it("CORR-005: explicitly identifies prototype zones as approximations and distinguishes demonstration vs verified venues", () => {
    // 1. Prototype delivery zones are marked as prototype approximations
    const cbdZone = NAIROBI_NEIGHBORHOOD_ZONES.find((z) => z.id === "cbd");
    expect(cbdZone).toBeDefined();
    expect(cbdZone?.isPrototypeApproximation).toBe(true);

    // 2. Demonstration storefront venue produces isVerified: false, isDemonstrationData: true
    const demoVenue: Venue = {
      id: "v_demo",
      orgId: "org_demo",
      name: "Demo Café",
      slug: "demo-cafe",
      address: "Moi Avenue, CBD",
      deliveryOnly: false,
      serviceArea: "",
      services: ["Dine-in"],
      contact: { phone: "", whatsapp: "", email: "" },
      tagline: "",
      currency: "KES",
      coordinates: { latitude: -1.2841, longitude: 36.8236, verificationStatus: "demonstration" },
    };
    const demoResult = evaluateVenueProximity(demoVenue, {
      latitude: -1.2841,
      longitude: 36.8236,
    });
    expect(demoResult.isNearby).toBe(true);
    expect(demoResult.isVerified).toBe(false);
    expect(demoResult.isDeliveryConfirmed).toBe(false);
    expect(demoResult.isDemonstrationData).toBe(true);
    expect(demoResult.verificationNote).toContain("Demonstration reference coordinates");

    // 3. Verified storefront venue produces isVerified: true, isDemonstrationData: false
    const verifiedVenue: Venue = {
      ...demoVenue,
      id: "v_verified",
      coordinates: { latitude: -1.2841, longitude: 36.8236, verificationStatus: "verified" },
    };
    const verifiedResult = evaluateVenueProximity(verifiedVenue, {
      latitude: -1.2841,
      longitude: 36.8236,
    });
    expect(verifiedResult.isNearby).toBe(true);
    expect(verifiedResult.isVerified).toBe(true);
    expect(verifiedResult.isDemonstrationData).toBe(false);
    expect(verifiedResult.verificationNote).toContain("Verified storefront coordinates");

    // 4. Demonstration delivery kitchen produces isDeliveryConfirmed: false
    const demoDeliveryVenue: Venue = {
      id: "v_demo_delivery",
      orgId: "org_demo_delivery",
      name: "Demo Cloud Kitchen",
      slug: "demo-cloud-kitchen",
      address: "",
      deliveryOnly: true,
      serviceArea: "Westlands",
      deliveryCoverageStatus: "approximate_preview",
      services: ["Delivery"],
      contact: { phone: "", whatsapp: "", email: "" },
      tagline: "",
      currency: "KES",
    };
    const demoDeliveryResult = evaluateVenueProximity(demoDeliveryVenue, {
      latitude: -1.2612,
      longitude: 36.8044,
    });
    expect(demoDeliveryResult.isNearby).toBe(true);
    expect(demoDeliveryResult.isVerified).toBe(false);
    expect(demoDeliveryResult.isDeliveryConfirmed).toBe(false);
    expect(demoDeliveryResult.verificationNote).toContain(
      "not confirmed merchant delivery coverage",
    );

    // 5. Confirmed merchant delivery coverage produces isDeliveryConfirmed: true
    const confirmedDeliveryVenue: Venue = {
      ...demoDeliveryVenue,
      id: "v_confirmed_delivery",
      deliveryCoverageStatus: "confirmed_merchant_coverage",
    };
    const confirmedDeliveryResult = evaluateVenueProximity(confirmedDeliveryVenue, {
      latitude: -1.2612,
      longitude: 36.8044,
    });
    expect(confirmedDeliveryResult.isNearby).toBe(true);
    expect(confirmedDeliveryResult.isVerified).toBe(true);
    expect(confirmedDeliveryResult.isDeliveryConfirmed).toBe(true);
    expect(confirmedDeliveryResult.verificationNote).toContain(
      "Verified merchant delivery coverage",
    );
  });
});
