import type {
  DayOfWeek,
  Menu,
  Offering,
  OfferingSchedule,
  SharedOffering,
  Venue,
  VenueOfferingOverride,
} from "./types";
import { isMenuEligibleForVenue } from "./taxonomy";

const DAY_MAP: Record<number, DayOfWeek> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

export const ALL_DAYS: { id: DayOfWeek; label: string; short: string }[] = [
  { id: "mon", label: "Monday", short: "Mon" },
  { id: "tue", label: "Tuesday", short: "Tue" },
  { id: "wed", label: "Wednesday", short: "Wed" },
  { id: "thu", label: "Thursday", short: "Thu" },
  { id: "fri", label: "Friday", short: "Fri" },
  { id: "sat", label: "Saturday", short: "Sat" },
  { id: "sun", label: "Sunday", short: "Sun" },
];

/**
 * Checks whether an offering is explicitly hidden/excluded at a specific venue.
 */
export function isOfferingHiddenAtVenue(offering: Offering, venueId?: string): boolean {
  if (!venueId || !offering.venueOverrides) return false;
  return Boolean(offering.venueOverrides[venueId]?.hidden);
}

/**
 * Resolves the effective offering attributes for a given venue context.
 * Applies shared master defaults and explicit venue-level overrides.
 */
export function getEffectiveOffering(
  offering: Offering,
  venueId?: string,
  sharedOfferings?: SharedOffering[],
): Offering {
  // If offering references a shared master, use master as the base
  let base: Offering = { ...offering };
  if (offering.sharedOfferingId && sharedOfferings) {
    const master = sharedOfferings.find((s) => s.id === offering.sharedOfferingId);
    if (master) {
      base = {
        ...offering,
        name: master.name || offering.name,
        description: master.description || offering.description,
        price: master.price ?? offering.price,
        tags: master.tags?.length ? [...master.tags] : offering.tags,
        emoji: master.emoji || offering.emoji,
        image: master.image || offering.image,
        imageSource: master.imageSource || offering.imageSource,
        modifiers: master.modifiers?.length ? master.modifiers : offering.modifiers,
        schedule: master.schedule || offering.schedule,
        specialBadge: master.specialBadge || offering.specialBadge,
        venueOverrides: {
          ...(master.venueOverrides || {}),
          ...(offering.venueOverrides || {}),
        },
      };
    }
  }

  // If a venueId is provided, resolve venue-specific overrides
  if (venueId && base.venueOverrides?.[venueId]) {
    const override = base.venueOverrides[venueId];
    return {
      ...base,
      price: override.price !== undefined ? override.price : base.price,
      description: override.description !== undefined ? override.description : base.description,
      available: override.available !== undefined ? override.available : base.available,
      specialBadge: override.specialBadge !== undefined ? override.specialBadge : base.specialBadge,
    };
  }

  return base;
}

/**
 * Parses time string "HH:MM" to minutes from midnight (0 to 1439).
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0] || "", 10);
  const minutes = parseInt(parts[1] || "", 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Checks whether a given schedule is active at a specified reference time/date.
 */
export function isOfferingInSchedule(
  schedule?: OfferingSchedule,
  simulatedTimeOrDate?: string | Date,
): boolean {
  if (!schedule || !schedule.enabled) return true;

  let currentMinutes: number;
  let currentDay: DayOfWeek;

  if (typeof simulatedTimeOrDate === "string" && simulatedTimeOrDate.includes(":")) {
    // "HH:MM" string format
    const parsed = parseTimeToMinutes(simulatedTimeOrDate);
    currentMinutes =
      parsed !== null ? parsed : new Date().getHours() * 60 + new Date().getMinutes();
    currentDay = DAY_MAP[new Date().getDay()] || "mon";
  } else {
    const date = simulatedTimeOrDate instanceof Date ? simulatedTimeOrDate : new Date();
    currentMinutes = date.getHours() * 60 + date.getMinutes();
    currentDay = DAY_MAP[date.getDay()] || "mon";
  }

  // Check day of week
  if (schedule.days && schedule.days.length > 0) {
    if (!schedule.days.includes(currentDay)) {
      return false;
    }
  }

  // Check time of day window
  const startMin = schedule.startTime ? parseTimeToMinutes(schedule.startTime) : null;
  const endMin = schedule.endTime ? parseTimeToMinutes(schedule.endTime) : null;

  if (startMin !== null && endMin !== null) {
    if (startMin <= endMin) {
      // Normal range (e.g. 07:00 to 11:30)
      if (currentMinutes < startMin || currentMinutes >= endMin) return false;
    } else {
      // Overnight range (e.g. 22:00 to 04:00)
      if (currentMinutes < startMin && currentMinutes >= endMin) return false;
    }
  } else if (startMin !== null) {
    if (currentMinutes < startMin) return false;
  } else if (endMin !== null) {
    if (currentMinutes >= endMin) return false;
  }

  return true;
}

export interface EffectiveAvailability {
  available: boolean;
  reason: "available" | "sold_out_manual" | "outside_schedule" | "venue_excluded";
  message: string;
  badgeText?: string;
  scheduleDetails?: string;
}

/**
 * Evaluates the full effective operational and scheduled availability of an offering.
 */
export function getEffectiveOfferingAvailability(
  offering: Offering,
  venueId?: string,
  options?: {
    simulatedTime?: string | undefined;
    sharedOfferings?: SharedOffering[] | undefined;
  },
): EffectiveAvailability {
  // 1. Check local venue exclusion
  if (isOfferingHiddenAtVenue(offering, venueId)) {
    return {
      available: false,
      reason: "venue_excluded",
      message: "This offering is not available at this service location.",
      badgeText: "Not at this location",
    };
  }

  const effective = getEffectiveOffering(offering, venueId, options?.sharedOfferings);

  // 2. Check operational sold-out state (manual override)
  if (!effective.available) {
    return {
      available: false,
      reason: "sold_out_manual",
      message: "Sold out today (manual operational override).",
      badgeText: "Sold out today",
    };
  }

  // 3. Check time-of-day and day-of-week schedule
  if (effective.schedule && effective.schedule.enabled) {
    const inSchedule = isOfferingInSchedule(effective.schedule, options?.simulatedTime);
    if (!inSchedule) {
      const scheduleLabel = formatSchedule(effective.schedule);
      return {
        available: false,
        reason: "outside_schedule",
        message: `Currently outside scheduled service hours (${scheduleLabel}).`,
        badgeText: scheduleLabel,
        scheduleDetails: scheduleLabel,
      };
    }
  }

  return {
    available: true,
    reason: "available",
    message: "Available for ordering.",
  };
}

/**
 * Formats an offering schedule into a concise human-readable label.
 */
export function formatSchedule(schedule?: OfferingSchedule): string {
  if (!schedule || !schedule.enabled) return "Always available";

  const timePart =
    schedule.startTime && schedule.endTime
      ? `${schedule.startTime} – ${schedule.endTime}`
      : schedule.startTime
        ? `From ${schedule.startTime}`
        : schedule.endTime
          ? `Until ${schedule.endTime}`
          : "";

  let daysPart = "";
  if (schedule.days && schedule.days.length > 0 && schedule.days.length < 7) {
    const isWeekdays =
      schedule.days.length === 5 &&
      ["mon", "tue", "wed", "thu", "fri"].every((d) => schedule.days?.includes(d as DayOfWeek));
    const isWeekends =
      schedule.days.length === 2 &&
      ["sat", "sun"].every((d) => schedule.days?.includes(d as DayOfWeek));

    if (isWeekdays) {
      daysPart = "Mon–Fri";
    } else if (isWeekends) {
      daysPart = "Weekends";
    } else {
      daysPart = schedule.days
        .map((d) => ALL_DAYS.find((item) => item.id === d)?.short || d)
        .join(", ");
    }
  }

  const prefix = schedule.name ? `${schedule.name}: ` : "";

  if (prefix && timePart) {
    return daysPart ? `${prefix}${daysPart} ${timePart}` : `${prefix}${timePart}`;
  }
  if (daysPart && timePart) return `${daysPart} · ${timePart}`;
  if (timePart) return timePart;
  if (daysPart) return daysPart;
  return schedule.name || "Scheduled hours";
}

/**
 * Finds all menus and venues where a shared offering is actively used.
 */
export function getSharedOfferingUsage(
  sharedOfferingId: string,
  menus: Menu[],
  venues: Venue[],
): {
  menuId: string;
  menuName: string;
  sectionName: string;
  venueNames: string[];
}[] {
  const usage: {
    menuId: string;
    menuName: string;
    sectionName: string;
    venueNames: string[];
  }[] = [];

  for (const menu of menus) {
    if (menu.status === "archived") continue;
    for (const section of menu.sections) {
      const match = section.offerings.find(
        (o) => o.id === sharedOfferingId || o.sharedOfferingId === sharedOfferingId,
      );
      if (match) {
        const eligibleVenues = venues.filter((v) => isMenuEligibleForVenue(menu, v, venues));
        usage.push({
          menuId: menu.id,
          menuName: menu.name,
          sectionName: section.name,
          venueNames: eligibleVenues.map((v) => v.name),
        });
      }
    }
  }

  return usage;
}
