# Deliverable E — Scenario Library

**Comprehensive Seed Fixtures & Deterministic Business Scenarios**

---

## 1. Overview

The Scenario Engine provides 16 pre-configured, realistic situations that allow immediate, reproducible testing of all operational, commercial, and edge-case behaviors without requiring manual database setup.

Each scenario is accessible with a single click from the floating **Scenario Control Panel** in the top-right corner of the interface.

---

## 2. Master Scenario Register (SC-01 through SC-16)

### SC-01: New Café Quickstart

- **Scenario ID**: `new-cafe`
- **Default Role**: `owner`
- **Fixture State**: Empty organization workspace, zero menus published.
- **Verification Target**: Test mobile onboarding flow (`/onboarding`) from account naming to first published menu in under 3 minutes.

### SC-02: Established Café

- **Scenario ID**: `established-restaurant`
- **Default Role**: `owner`
- **Fixture State**: "Green Garden Café" with a complete all-day breakfast and lunch menu, active offerings, modifiers, and dine-in/takeaway services.
- **Verification Target**: Test operational staff order queue, item authoring, and fast 86-ing (marking items sold out).

### SC-03: Multi-Brand Hospitality Group

- **Scenario ID**: `multi-brand`
- **Default Role**: `admin`
- **Fixture State**: "Horizon Hospitality Group" overseeing 3 distinct venues: Green Garden Café, Sol Artisan Bakery, and Gelato Lab Nairobi.
- **Verification Target**: Test brand/venue switching in the business workspace and organization-level administration permissions.

### SC-04: Luxury Hotel Context

- **Scenario ID**: `hotel`
- **Default Role**: `owner`
- **Fixture State**: "The Grand Horizon Hotel" featuring a public menu ("Terrace Bistro & Lounge") alongside a protected menu ("In-Room Dining — Guests Only"). Pre-loaded with verified guest session (Room 402, Smith).
- **Verification Target**: Test guest in-room dining access, room ordering, and zero public data leakage.

### SC-05: Ghost / Delivery Kitchen

- **Scenario ID**: `delivery-only`
- **Default Role**: `owner`
- **Fixture State**: "CloudBurger Kitchen" operating as a delivery-only brand with service areas in Kilimani, Lavington & Westlands. No physical storefront.
- **Verification Target**: Verify delivery service area radius configuration without public street address.

### SC-06: Active Units (Normal Flow)

- **Scenario ID**: `units-available`
- **Default Role**: `owner`
- **Fixture State**: 142 of 200 included monthly acceptance units available, active subscription.
- **Verification Target**: Test standard order submission from guest cart, merchant acceptance, and atomic -1 unit balance deduction.

### SC-07: Zero Units Exhaustion

- **Scenario ID**: `zero-units`
- **Default Role**: `customer`
- **Fixture State**: 0 / 200 included units, 0 top-ups, active subscription.
- **Verification Target**: Verify menu stays live, direct manual contact (WhatsApp/phone) stays active, and new structured cart submissions are politely paused with clear guidance.

### SC-08: Expired Subscription

- **Scenario ID**: `expired-beyond-grace`
- **Default Role**: `customer`
- **Fixture State**: Subscription expired past the 14-day grace period.
- **Verification Target**: Verify graceful fallback banner and recovery link to the billing dashboard; menus remain browseable.

### SC-09: In-Flight Order Continuity

- **Scenario ID**: `admitted-pending`
- **Default Role**: `owner`
- **Fixture State**: 0 included units remaining, but an incoming order (`order_seed`) was submitted while capacity was active.
- **Verification Target**: Verify that the merchant can still accept this already-admitted order by drawing on bounded continuity units (overdraft allowance up to 10).

### SC-10: Duplicate Accept Race

- **Scenario ID**: `duplicate-accept`
- **Default Role**: `staff`
- **Fixture State**: Pending order (`order_seed`) awaiting decision.
- **Verification Target**: Verify idempotent execution: when acceptance is triggered repeatedly (or by multiple staff members), exactly one unit is deducted and subsequent attempts return false.

### SC-11: Customer Withdrawal Conflict

- **Scenario ID**: `withdraw-vs-accept`
- **Default Role**: `customer` / `owner`
- **Fixture State**: Active pending order request.
- **Verification Target**: Customer withdraws from `/orders/:orderId`; merchant acceptance then fails; exactly 0 units deducted.

### SC-12: Sold-Out Item in Cart

- **Scenario ID**: `unavailable-item`
- **Default Role**: `customer`
- **Fixture State**: An offering in the cart is toggled to unavailable (sold out today).
- **Verification Target**: Verify cart validation immediately alerts customer with clear, honest availability messaging and prevents submission until resolved.

### SC-13: Price Update During Review

- **Scenario ID**: `outdated-price`
- **Default Role**: `customer`
- **Fixture State**: Offering price in merchant menu updated from 280 to 300 KES while cart holds old snapshot.
- **Verification Target**: Verify order snapshot integrity and price amendment alert requiring the customer to review the updated price.

### SC-14: Simulated Offline Network

- **Scenario ID**: `channel-unavailable`
- **Default Role**: `customer`
- **Fixture State**: WhatsApp contact channel unavailable; optional network simulation active.
- **Verification Target**: Verify graceful fallback to phone/email contact and responsive offline cached menu browsing.

### SC-15: Unauthorized Guest Access

- **Scenario ID**: `protected-denied`
- **Default Role**: `customer`
- **Fixture State**: Unauthenticated customer viewing Grand Horizon Hotel menu.
- **Verification Target**: In-room dining menu is protected by room verification gate; guest cannot view VIP offerings or order room service without room number and last name.

### SC-16: Sponsored Campaign Live

- **Scenario ID**: `sponsored-campaign`
- **Default Role**: `customer`
- **Fixture State**: Active "Featured Offer" campaign on PEWA Home ($50 budget, 20% Off Slow Cold Brews).
- **Verification Target**: Verify prominent "Sponsored" badge, separation from organic directory search, and impression/click tracking in `/admin/activity`.
