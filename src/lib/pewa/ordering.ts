import type { CartLine, GuestCart, ModifierGroup, Offering, OrderPolicy, PewaState } from "./types";
import { getVenuePublishedMenus } from "./taxonomy";
import { getEffectiveOffering, getEffectiveOfferingAvailability } from "./availability";

export const lineTotal = (line: CartLine) =>
  (line.basePrice + line.options.reduce((sum, option) => sum + option.priceDelta, 0)) *
  line.quantity;
export const cartTotal = (lines: CartLine[]) =>
  lines.reduce((sum, line) => sum + lineTotal(line), 0);
export const canAdmitOrder = (policy: OrderPolicy) =>
  !policy.expired && policy.included + policy.topUp > 0;

/**
 * Validates a single ModifierGroup configuration authored by a merchant.
 * Returns null if valid, or an explanatory error string if invalid.
 */
export function validateModifierGroupConfig(group: ModifierGroup): string | null {
  const name = group.name?.trim();
  if (!name) {
    return "Modifier group name is required.";
  }
  if (!group.options || group.options.length === 0) {
    return `Modifier group "${name}" must have at least one option.`;
  }
  const optionIds = new Set<string>();
  for (let i = 0; i < group.options.length; i++) {
    const opt = group.options[i];
    if (!opt) continue;
    if (!opt.name?.trim()) {
      return `Option #${i + 1} in group "${name}" cannot have an empty name.`;
    }
    if (optionIds.has(opt.id)) {
      return `Duplicate option ID "${opt.id}" in group "${name}".`;
    }
    optionIds.add(opt.id);
    if (typeof opt.priceDelta !== "number" || isNaN(opt.priceDelta) || opt.priceDelta < 0) {
      return `Option "${opt.name}" in group "${name}" has an invalid price delta. Modifier price adjustments must be non-negative (>= 0).`;
    }
  }

  const selectionType = group.selectionType ?? "single";
  const numOptions = group.options.length;

  if (selectionType === "single") {
    // Single choice: Exactly 1 option if required, 0 or 1 if optional.
    if (group.minSelections !== undefined) {
      const expectedMin = group.required ? 1 : 0;
      if (group.minSelections !== expectedMin) {
        return `Single-choice group "${name}" cannot have minimum selections other than ${expectedMin}.`;
      }
    }
    if (group.maxSelections !== undefined && group.maxSelections !== 1) {
      return `Single-choice group "${name}" maximum selections must be 1.`;
    }
  } else if (selectionType === "multiple") {
    // Multiple choice
    const isRequired = Boolean(group.required);
    const min = group.minSelections ?? (isRequired ? 1 : 0);
    const max = group.maxSelections;

    if (isRequired && min < 1) {
      return `Required multiple-choice group "${name}" must require at least 1 selection.`;
    }
    if (min < 0) {
      return `Multiple-choice group "${name}" minimum selections cannot be negative.`;
    }
    if (min > numOptions) {
      return `Multiple-choice group "${name}" minimum selections (${min}) exceeds total available options (${numOptions}).`;
    }
    if (max !== undefined) {
      if (max < 1) {
        return `Multiple-choice group "${name}" maximum selections must be at least 1.`;
      }
      if (max > numOptions) {
        return `Multiple-choice group "${name}" maximum selections (${max}) exceeds total available options (${numOptions}).`;
      }
      if (max < min) {
        return `Multiple-choice group "${name}" maximum selections (${max}) cannot be less than minimum selections (${min}).`;
      }
    }
  }

  return null;
}

/**
 * Validates all modifier groups configured on an offering.
 * Returns null if all valid, or an error string if any group or structure is invalid.
 */
export function validateOfferingModifiersConfig(modifiers: ModifierGroup[]): string | null {
  if (!modifiers || modifiers.length === 0) return null;
  const groupIds = new Set<string>();
  for (const group of modifiers) {
    if (groupIds.has(group.id)) {
      return `Duplicate modifier group ID "${group.id}".`;
    }
    groupIds.add(group.id);
    const err = validateModifierGroupConfig(group);
    if (err) return err;
  }
  return null;
}

/**
 * Validates selected options against a single ModifierGroup.
 * Ensures:
 * 1. No duplicate option IDs.
 * 2. Every option ID exists in the group.
 * 3. Single-choice: required -> exactly 1; optional -> 0 or 1.
 * 4. Multiple-choice:
 *    - required -> at least minSelections (or 1)
 *    - optional -> at least minSelections (default 0)
 *    - at most maxSelections (if specified)
 * Returns null if valid, or an explanatory error message.
 */
export function validateModifierSelection(
  group: ModifierGroup,
  selectedOptionIds: string[],
): string | null {
  // Check for duplicate option IDs
  const uniqueIds = new Set(selectedOptionIds);
  if (uniqueIds.size !== selectedOptionIds.length) {
    return `Duplicate option selection in "${group.name}".`;
  }

  // Check unknown option IDs
  for (const id of selectedOptionIds) {
    if (!group.options.some((o) => o.id === id)) {
      return `Invalid or unknown option ID "${id}" in "${group.name}".`;
    }
  }

  const selectionType = group.selectionType ?? "single";
  const count = selectedOptionIds.length;

  if (selectionType === "single") {
    if (group.required) {
      if (count === 0) {
        return `Please select an option for "${group.name}".`;
      }
      if (count > 1) {
        return `Only one option may be selected for "${group.name}".`;
      }
    } else {
      if (count > 1) {
        return `Only one option may be selected for "${group.name}".`;
      }
    }
  } else {
    // Multiple choice
    const isRequired = Boolean(group.required);
    const min = group.minSelections !== undefined ? group.minSelections : isRequired ? 1 : 0;
    const max = group.maxSelections !== undefined ? group.maxSelections : group.options.length;

    if (count < min) {
      if (isRequired && min === 1) {
        return `Please select at least 1 option for "${group.name}".`;
      }
      return `Please select at least ${min} option(s) for "${group.name}" (currently ${count} selected).`;
    }

    if (count > max) {
      return `You may select at most ${max} option(s) for "${group.name}" (currently ${count} selected).`;
    }
  }

  return null;
}

/**
 * Validates cart line modifier options against an authoritative offering and recalculates authoritative options and deltas.
 */
export function validateAndRecalculateLineModifiers(
  offering: Offering,
  lineOptions: CartLine["options"] = [],
): {
  valid: boolean;
  error?: string;
  authoritativeOptions?: CartLine["options"];
  totalModifierDelta?: number;
} {
  const authoritativeOptions: CartLine["options"] = [];
  let totalModifierDelta = 0;

  // Check for unknown or orphan group references in lineOptions
  for (const opt of lineOptions) {
    const group = offering.modifiers.find((g) => g.id === opt.groupId);
    if (!group) {
      return {
        valid: false,
        error: `Cart item "${offering.name}" references an unknown modifier group "${opt.groupId}".`,
      };
    }
    const realOpt = group.options.find((o) => o.id === opt.optionId);
    if (!realOpt) {
      return {
        valid: false,
        error: `Cart item "${offering.name}" references an unknown or removed option "${opt.optionId}".`,
      };
    }
  }

  // Check each modifier group defined on the offering
  for (const group of offering.modifiers) {
    const selectedForGroup = lineOptions.filter((o) => o.groupId === group.id);
    const selectedOptionIds = selectedForGroup.map((o) => o.optionId);

    const selectionError = validateModifierSelection(group, selectedOptionIds);
    if (selectionError) {
      return {
        valid: false,
        error: selectionError,
      };
    }

    // Build authoritative option entries
    for (const opt of selectedForGroup) {
      const realOpt = group.options.find((o) => o.id === opt.optionId)!;
      if (
        typeof realOpt.priceDelta !== "number" ||
        isNaN(realOpt.priceDelta) ||
        realOpt.priceDelta < 0
      ) {
        return {
          valid: false,
          error: `Option "${realOpt.name}" in group "${group.name}" has an invalid negative price delta. Modifier price adjustments must be non-negative (>= 0).`,
        };
      }
      authoritativeOptions.push({
        groupId: group.id,
        optionId: realOpt.id,
        name: realOpt.name,
        priceDelta: realOpt.priceDelta,
      });
      totalModifierDelta += realOpt.priceDelta;
    }
  }

  return {
    valid: true,
    authoritativeOptions,
    totalModifierDelta,
  };
}

export function validateCart(state: PewaState, cart: GuestCart | null): string | null {
  if (state.simulatedOffline) {
    return "Offline network connection: Menus and cart remain cached, but order submission requires connection.";
  }
  if (!cart?.lines.length) return "Your cart is empty.";
  const venue = state.venues.find((v) => v.id === cart.venueId);
  if (!venue) return "This venue is no longer available.";
  const venuePublishedMenus = getVenuePublishedMenus(venue, state.menus, state.venues, {
    includeProtected: true,
  });
  for (const line of cart.lines) {
    const menu = venuePublishedMenus.find((m) => m.id === line.menuId);
    if (!menu) {
      return "Orders cannot be placed for unpublished draft, hidden or archived menus.";
    }
    const rawOffering = menu.sections
      .flatMap((s) => s.offerings)
      .find((o) => o.id === line.offeringId);
    if (!rawOffering) {
      return `${line.name} is no longer available on this menu.`;
    }
    const availability = getEffectiveOfferingAvailability(rawOffering, cart.venueId, {
      simulatedTime: state.simulatedTime,
      sharedOfferings: state.sharedOfferings,
    });
    if (!availability.available) {
      return `${line.name} is no longer available (${availability.message || "Unavailable"}). Remove it before submitting.`;
    }
    const offering = getEffectiveOffering(rawOffering, cart.venueId, state.sharedOfferings);
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99)
      return "Choose a quantity between 1 and 99.";
    if (offering.price !== line.basePrice)
      return `${line.name}'s price has changed. Remove it and add it again to review the new price.`;

    const modResult = validateAndRecalculateLineModifiers(offering, line.options);
    if (!modResult.valid) {
      return modResult.error || `${line.name}'s options are invalid.`;
    }

    // Verify client-submitted modifier values match authoritative values
    for (const option of line.options) {
      const current = offering.modifiers
        .find((g) => g.id === option.groupId)
        ?.options.find((o) => o.id === option.optionId);
      if (!current || current.priceDelta !== option.priceDelta || current.name !== option.name) {
        return `${line.name}'s options have changed. Remove it and add it again.`;
      }
    }
  }
  return null;
}
