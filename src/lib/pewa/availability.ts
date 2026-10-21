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

export const DAY_ORDER: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function getPreviousDay(day: DayOfWeek): DayOfWeek {
  const idx = DAY_ORDER.indexOf(day);
  return DAY_ORDER[(idx - 1 + DAY_ORDER.length) % DAY_ORDER.length]!;
}

export function getNextDay(day: DayOfWeek): DayOfWeek {
  const idx = DAY_ORDER.indexOf(day);
  return DAY_ORDER[(idx + 1) % DAY_ORDER.length]!;
}

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
 * Returns the effective shared offerings list for a given menu context.
 * Published live menus read frozen snapshot shared offerings;
 * drafts and explicit preview mode read working catalogue state.
 */
export function getMenuEffectiveSharedOfferings(
  menu?: Menu | null,
  sharedOfferings?: SharedOffering[],
  options?: { isPreview?: boolean },
): SharedOffering[] {
  if (
    !options?.isPreview &&
    menu?.status === "published" &&
    menu.publishedSnapshot?.sharedOfferingsSnapshot
  ) {
    return menu.publishedSnapshot.sharedOfferingsSnapshot;
  }
  return sharedOfferings || [];
}

/**
 * Checks whether an offering is explicitly hidden/excluded at a specific venue.
 * Precedence hierarchy (CORR-B):
 * 1. Explicit local offering venue override takes highest precedence.
 * 2. Inherits master venue exclusion if offering references a shared master.
 */
export function isOfferingHiddenAtVenue(
  offering: Offering,
  venueId?: string,
  sharedOfferingsOrMaster?: SharedOffering[] | SharedOffering,
): boolean {
  if (!venueId) return false;

  // 1. Explicit local offering venue override
  const localOverride = offering.venueOverrides?.[venueId];
  if (localOverride && localOverride.hidden !== undefined) {
    return Boolean(localOverride.hidden);
  }

  // 2. Inherited master venue exclusion
  let master: SharedOffering | undefined;
  if (sharedOfferingsOrMaster) {
    if (Array.isArray(sharedOfferingsOrMaster)) {
      if (offering.sharedOfferingId) {
        master = sharedOfferingsOrMaster.find((s) => s.id === offering.sharedOfferingId);
      }
    } else {
      master = sharedOfferingsOrMaster;
    }
  }
  if (master?.venueOverrides?.[venueId]?.hidden !== undefined) {
    return Boolean(master.venueOverrides[venueId]?.hidden);
  }

  return false;
}

/**
 * Resolves the effective offering attributes for a given venue context.
 * Applies shared master defaults and explicit venue-level overrides.
 * Precedence hierarchy:
 * 1. Shared master default (base)
 * 2. Menu offering definition
 * 3. Explicit venue-specific override
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
      // Deep merge venueOverrides per venueId so master venue overrides (e.g. hidden: true)
      // are not wiped out if offering specifies other properties for the same venueId.
      const mergedVenueOverrides: Record<string, VenueOfferingOverride> = {};
      const allVenueIds = new Set([
        ...Object.keys(master.venueOverrides || {}),
        ...Object.keys(offering.venueOverrides || {}),
      ]);
      for (const vid of allVenueIds) {
        mergedVenueOverrides[vid] = {
          venueId: vid,
          ...(master.venueOverrides?.[vid] || {}),
          ...(offering.venueOverrides?.[vid] || {}),
        };
      }

      base = {
        ...offering,
        name: master.name || offering.name,
        // Preserve intentionally cleared optional attributes from master (e.g. empty description)
        description: master.description !== undefined ? master.description : offering.description,
        price: master.price ?? offering.price,
        tags: master.tags !== undefined ? [...master.tags] : offering.tags,
        emoji: master.emoji !== undefined ? master.emoji : offering.emoji,
        image: master.image !== undefined ? master.image : offering.image,
        imageSource: master.imageSource !== undefined ? master.imageSource : offering.imageSource,
        modifiers: master.modifiers !== undefined ? master.modifiers : offering.modifiers,
        schedule: master.schedule !== undefined ? master.schedule : offering.schedule,
        specialBadge:
          master.specialBadge !== undefined ? master.specialBadge : offering.specialBadge,
        venueOverrides: mergedVenueOverrides,
      };
    }
  }

  // If a venueId is provided, resolve venue-specific overrides
  if (venueId && base.venueOverrides?.[venueId]) {
    const override = base.venueOverrides[venueId];
    // Reject negative, NaN, or non-finite prices; preserve explicit zero
    const validPrice =
      override.price !== undefined &&
      typeof override.price === "number" &&
      Number.isFinite(override.price) &&
      override.price >= 0
        ? override.price
        : undefined;

    return {
      ...base,
      price: validPrice !== undefined ? validPrice : base.price,
      description: override.description !== undefined ? override.description : base.description,
      available: override.available !== undefined ? override.available : base.available,
      specialBadge: override.specialBadge !== undefined ? override.specialBadge : base.specialBadge,
    };
  }

  return base;
}

/**
 * Returns current day of week and minutes from midnight in the venue's local timezone.
 * Defaults to "Africa/Nairobi" (UTC+3) if timezone is unconfigured.
 */
export function getVenueLocalTime(
  venueOrTz?: Venue | string,
  date: Date = new Date(),
): { day: DayOfWeek; minutes: number } {
  const tz = (typeof venueOrTz === "string" ? venueOrTz : venueOrTz?.timezone) || "Africa/Nairobi";

  try {
    const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" });
    const dayStr = dayFmt.format(date).toLowerCase().slice(0, 3) as DayOfWeek;
    const day: DayOfWeek = DAY_ORDER.includes(dayStr) ? dayStr : "mon";

    const timeFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = timeFmt.formatToParts(date);
    const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
    const minPart = parts.find((p) => p.type === "minute")?.value ?? "0";
    const hours = parseInt(hourPart, 10) % 24;
    const minutes = parseInt(minPart, 10);

    return { day, minutes: hours * 60 + minutes };
  } catch {
    const day = DAY_MAP[date.getDay()] || "mon";
    const minutes = date.getHours() * 60 + date.getMinutes();
    return { day, minutes };
  }
}

/**
 * Parses time string "HH:MM" to minutes from midnight (0 to 1439).
 * Returns null if the format or numbers are invalid.
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

export interface ParsedScheduleReferenceTime {
  valid: boolean;
  day: DayOfWeek;
  minutes: number;
  error?: string | undefined;
}

/**
 * Parses a simulated schedule reference time.
 * Supports:
 * - "09:00" (HH:MM -> uses venue's current day)
 * - "mon 09:00" or "Monday 09:00" (explicit Day + HH:MM)
 * - Date instance
 * - { day?: DayOfWeek; time?: string }
 *
 * Fails closed with an explanatory error if the string is malformed or invalid.
 */
export function parseScheduleReferenceTime(
  ref?: string | Date | { day?: DayOfWeek; time?: string } | undefined,
  venueOrTz?: Venue | string,
): ParsedScheduleReferenceTime {
  if (!ref) {
    const venueNow = getVenueLocalTime(venueOrTz);
    return { valid: true, day: venueNow.day, minutes: venueNow.minutes };
  }

  if (ref instanceof Date) {
    const venueTime = getVenueLocalTime(venueOrTz, ref);
    return { valid: true, day: venueTime.day, minutes: venueTime.minutes };
  }

  if (typeof ref === "object") {
    const parsedMinutes = ref.time ? parseTimeToMinutes(ref.time) : null;
    if (ref.time && parsedMinutes === null) {
      return {
        valid: false,
        day: "mon",
        minutes: 0,
        error: `Invalid time format "${ref.time}". Expected HH:MM between 00:00 and 23:59.`,
      };
    }
    const day = ref.day && DAY_ORDER.includes(ref.day) ? ref.day : getVenueLocalTime(venueOrTz).day;
    const minutes = parsedMinutes !== null ? parsedMinutes : getVenueLocalTime(venueOrTz).minutes;
    return { valid: true, day, minutes };
  }

  if (typeof ref === "string") {
    const trimmed = ref.trim().toLowerCase();
    if (!trimmed) {
      const venueNow = getVenueLocalTime(venueOrTz);
      return { valid: true, day: venueNow.day, minutes: venueNow.minutes };
    }

    // Check for ISO 8601 date-time string (e.g. "2026-10-21T14:30:00Z", "2026-10-21 14:30", etc.)
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parsedDate = new Date(ref);
      if (!isNaN(parsedDate.getTime())) {
        const venueTime = getVenueLocalTime(venueOrTz, parsedDate);
        return { valid: true, day: venueTime.day, minutes: venueTime.minutes };
      }
      return {
        valid: false,
        day: "mon",
        minutes: 0,
        error: `Invalid ISO date-time string "${ref}".`,
      };
    }

    // Check for day prefix (e.g. "mon 09:00", "tue 22:30", "monday 09:00")
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const dayRaw = parts[0]!.slice(0, 3) as DayOfWeek;
      const timeRaw = parts[1]!;
      if (!DAY_ORDER.includes(dayRaw)) {
        return {
          valid: false,
          day: "mon",
          minutes: 0,
          error: `Unrecognized day of week "${parts[0]}". Expected mon, tue, wed, thu, fri, sat, or sun.`,
        };
      }
      const minutes = parseTimeToMinutes(timeRaw);
      if (minutes === null) {
        return {
          valid: false,
          day: dayRaw,
          minutes: 0,
          error: `Invalid time format "${timeRaw}". Expected HH:MM between 00:00 and 23:59.`,
        };
      }
      return { valid: true, day: dayRaw, minutes };
    }

    // Single token: must be strict HH:MM
    if (trimmed.includes(":")) {
      const minutes = parseTimeToMinutes(trimmed);
      if (minutes === null) {
        return {
          valid: false,
          day: "mon",
          minutes: 0,
          error: `Invalid time format "${trimmed}". Expected HH:MM between 00:00 and 23:59.`,
        };
      }
      const day = getVenueLocalTime(venueOrTz).day;
      return { valid: true, day, minutes };
    }

    return {
      valid: false,
      day: "mon",
      minutes: 0,
      error: `Malformed schedule reference "${ref}". Expected "HH:MM", "[day] HH:MM", or ISO date string.`,
    };
  }

  return { valid: false, day: "mon", minutes: 0, error: "Unsupported reference time value." };
}

/**
 * Checks whether a given schedule is active at a specified reference time/date.
 * Handles deterministic day evaluation, fail-closed validation, and overnight
 * intervals continuing past midnight (e.g. Monday 22:00 to Tuesday 04:00).
 */
export function isOfferingInSchedule(
  schedule?: OfferingSchedule,
  simulatedTimeOrDate?: string | Date | { day?: DayOfWeek; time?: string },
  venueOrTz?: Venue | string,
): boolean {
  if (!schedule || !schedule.enabled) return true;

  // If merchant explicitly configured an empty days list (days: []), offering is inactive/unavailable
  if (schedule.days !== undefined && schedule.days.length === 0) {
    return false;
  }

  const parsed = parseScheduleReferenceTime(simulatedTimeOrDate, venueOrTz);
  if (!parsed.valid) {
    // Fail closed if schedule reference time is malformed
    return false;
  }

  const { day: currentDay, minutes: currentMinutes } = parsed;
  const days = schedule.days && schedule.days.length > 0 ? schedule.days : null;

  const startMin = schedule.startTime ? parseTimeToMinutes(schedule.startTime) : null;
  const endMin = schedule.endTime ? parseTimeToMinutes(schedule.endTime) : null;

  // If start or end time strings are set but malformed, fail closed
  if (schedule.startTime && startMin === null) return false;
  if (schedule.endTime && endMin === null) return false;

  if (startMin !== null && endMin !== null) {
    if (startMin <= endMin) {
      // Normal intraday range (e.g. 07:00 to 11:30)
      if (days && !days.includes(currentDay)) return false;
      return currentMinutes >= startMin && currentMinutes < endMin;
    } else {
      // Overnight range crossing midnight (e.g. 22:00 to 04:00)
      if (!days) {
        return currentMinutes >= startMin || currentMinutes < endMin;
      }
      // Part A: Started today and runs to midnight
      const isTodayStart = days.includes(currentDay) && currentMinutes >= startMin;
      // Part B: Started yesterday and continues until endMin this morning
      const prevDay = getPreviousDay(currentDay);
      const isYesterdayContinuation = days.includes(prevDay) && currentMinutes < endMin;

      return isTodayStart || isYesterdayContinuation;
    }
  } else if (startMin !== null) {
    if (days && !days.includes(currentDay)) return false;
    return currentMinutes >= startMin;
  } else if (endMin !== null) {
    if (days && !days.includes(currentDay)) return false;
    return currentMinutes < endMin;
  } else {
    if (days && !days.includes(currentDay)) return false;
    return true;
  }
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
    simulatedTime?: string | Date | { day?: DayOfWeek; time?: string } | undefined;
    sharedOfferings?: SharedOffering[] | undefined;
    venue?: Venue | undefined;
    venueOrTz?: Venue | string | undefined;
  },
): EffectiveAvailability {
  // 1. Check venue exclusion (including inherited master exclusions)
  if (isOfferingHiddenAtVenue(offering, venueId, options?.sharedOfferings)) {
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
    const tzTarget = options?.venueOrTz || options?.venue;
    const inSchedule = isOfferingInSchedule(effective.schedule, options?.simulatedTime, tzTarget);
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
  options?: { orgId?: string | undefined },
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
    if (options?.orgId && menu.orgId && menu.orgId !== options.orgId) continue;
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
