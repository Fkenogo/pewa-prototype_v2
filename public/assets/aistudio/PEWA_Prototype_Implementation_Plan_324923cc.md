# PEWA — Master Prototype Implementation Plan

## Mobile-First PWA Experience Reference (Initial Build)

**Document Reference:** PEWA-ENG-PLAN-001  
**Authority:** Founder-Approved PEWA Master Prototype Builder Brief  
**Author:** Lead Product Experience Architect & Prototype Engineer  
**Status:** Ready for Execution | Prototype Authorised  
**Production Engineering Status:** Not Authorised (Strictly Isolated Prototype)  
**Target Repository / Workspace:** Isolated Prototype Workspace (`pewa-prototype`)

---

## 1. Executive Summary & Strategic Intent

### 1.1 The Mission

This implementation plan establishes the architectural, product, and phased development roadmap to construct the **PEWA Experience Reference**—a fully interactive, mobile-first Progressive Web App (PWA) prototype.

The Experience Reference is neither a disposable marketing mockup nor a production engineering build. It is the definitive, interactive embodiment of **PEWA Product Truth**. It enables the Founder to experience, test, and refine all critical user journeys, commercial rules, operational workflows, and role permissions before capital-intensive production engineering begins.

### 1.2 Core Product Truths & Non-Negotiables

Every screen, state transition, and simulated domain interaction within this prototype will strictly adhere to the following product invariants:

1. **PEWA is a Menu Publishing and Customer Engagement Product, NOT a Food Marketplace:**
   - PEWA does not handle food payments, merchant kitchen tickets, delivery dispatch, food safety, or physical stock inventory.
   - The merchant remains 100% responsible for food quality, pricing, declarations, order acceptance, and customer fulfilment.
2. **Mobile-First Administration is Non-Negotiable:**
   - Small food & beverage businesses often lack desktop computers. A café owner or bakery manager must be able to onboard, build menus, upload items, adjust prices, toggle availability, accept orders, and manage staff entirely from a mobile phone viewport (375px–430px).
   - Desktop viewports provide enhanced multi-venue and multi-brand visibility for larger organizations, but desktop access is never mandatory for daily operations.
3. **Zero-Friction Customer Experience:**
   - Customers must **never** be forced to download an app, create an account, enable push notifications, or use WhatsApp to browse a menu or submit an order request.
   - Public direct links and QR codes route **directly** to the merchant's menu, bypassing PEWA Home.
4. **Structured Ordering is an Explicit Request, NOT a Completed Sale:**
   - Customer submission is solely an order request. Acceptance occurs strictly when an authorized merchant explicitly confirms the order.
   - Unaccepted orders can expire, be declined, or be withdrawn by the customer prior to acceptance.
5. **Exact Unit Consumption Mechanics:**
   - **Exactly one unit is consumed if and only if an authorized merchant accepts an order.**
   - Units are _never_ consumed upon order submission, customer withdrawal, merchant decline, "Ready" status declaration, or cancellation.
   - Monthly base subscription provides **200 included accepted-order units**. Included units expire at the end of the billing period; purchased top-up units carry forward. Up to 10 recoverable overdraft units are supported for admitted continuity (debt-backed).
6. **Graceful Entitlement Exhaustion:**
   - When order consumption reaches zero, public menus, direct links, QR codes, organic directory discovery, and direct manual contact **remain 100% active and accessible**.
   - Only _new structured order submissions_ are paused. The system must never show a generic "Business Closed" or "Menu Unavailable" state upon unit exhaustion.
7. **Role Segregation & Operator Boundaries:**
   - Staff members cannot access billing or ownership controls.
   - PEWA Operators manage tenant participation, platform compliance, and disputes, but can never alter food prices, accept orders, or modify operational kitchen statuses.

---

## 2. Technical Architecture & Isolation Strategy

To ensure zero risk to canonical production repositories while maximizing iteration speed and design fidelity, the prototype will be built in an isolated workspace.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PEWA Prototype Workspace                        │
├────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐  │
│  │   UI Shell & Pages    │  │        Scenario Control Panel          │  │
│  │  - Mobile Viewport    │  │  - 16 Deterministic Scenarios          │  │
│  │  - Responsive Desktop │  │  - Role Switcher (Owner, Staff, etc.)  │  │
│  │  - PWA Offline Banner │  │  - State Reset & Seed Hydration        │  │
│  └───────────┬───────────┘  └───────────────────┬────────────────────┘  │
│              │                                  │                       │
│  ┌───────────▼──────────────────────────────────▼────────────────────┐  │
│  │                 Reactive Prototype State Store                    │  │
│  │  - LocalStorage / Memory Persistence                              │  │
│  │  - Reactive Subscriptions (Zustand / Reactive Context)             │  │
│  └───────────┬──────────────────────────────────┬────────────────────┘  │
│              │                                  │                       │
│  ┌───────────▼───────────┐  ┌───────────────────▼────────────────────┐  │
│  │ Simulated Domain Core │  │        Mock Scenario Fixtures          │  │
│  │ - Order State Machine │  │ - "Green Garden Café" (Single Venue)   │  │
│  │ - Unit Entitlements   │  │ - "The Grand Horizon Hotel"            │  │
│  │ - Access Control RBAC │  │ - "CloudBurger Kitchen" (Delivery)     │  │
│  │ - Event Logging Engine│  │ - "Artisan Bakery & Co" (Multi-brand)  │  │
│  └───────────────────────┘  └────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Technology Stack Selection

- **Application Framework:** React 18 / modern TypeScript with Vite or TanStack Start (aligned with the ultimate Next.js App Router domain models while enabling lightweight local execution).
- **Styling & Design Tokens:** Tailwind CSS with a mobile-optimized tokens system (custom typography scale, touch-target standards [min 44px], and high-contrast status palettes).
- **Component Primitives:** Radix UI / shadcn/ui primitives (Drawer, Dialog, Sheet, Tabs, DropdownMenu, Accordion) ensuring native-app touch responsiveness on mobile.
- **Iconography:** Lucide Icons.
- **State & Scenario Engine:** Zustand with immutable state transitions and deterministic scenario fixture hydration.
- **PWA Emulation:** Web App Manifest, ServiceWorker registration simulator, install prompt prompt-handler, and offline banner.

### 2.2 Strict Prototype Isolation Rules

- **No live external dependencies:** No production Postgres connections, Supabase keys, Stripe payment gateways, or live Meta WhatsApp Cloud APIs.
- **Deterministic Mocking:** All API delays, simulated network drops, and order state transitions execute deterministically with clear visual indicators.
- **Separation of Concerns:** UI components must consume domain interfaces that mirror future production contracts, ensuring clean future refactoring.

---

## 3. Product Truth & Acceptance Criteria Matrix

| #         | Acceptance Criterion                                                      | Prototype Implementation Mechanism                                                                     | Primary Slice  |
| --------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | :------------: |
| **AC-01** | Small café owner joins, creates, and publishes a menu entirely on a phone | 4-step mobile onboarding wizard; touch-first menu/offering authoring; one-tap instant publication      |   **P0, P2**   |
| **AC-02** | Customer discovers or opens menu without account or app installation      | Direct QR link simulation `/m/:slug`; responsive public menu; zero-barrier browsing                    |     **P1**     |
| **AC-03** | Customer can contact business manually without creating an order          | WhatsApp/Phone/Email floating action drawer with pre-filled menu context                               |     **P1**     |
| **AC-04** | Customer submits order and clearly sees it is pending business decision   | Order snapshot review; status screen displaying "Awaiting Merchant Acceptance" with pulsing indicator  |     **P3**     |
| **AC-05** | Merchant accepts order and exactly 1 unit is deducted                     | Real-time merchant incoming order screen; Accept action triggers atomic balance decrement (-1)         |   **P3, P4**   |
| **AC-06** | Duplicate accept attempt does not deduct additional units                 | Idempotent state machine check; disabled repeat triggers; explicit audit log verification              |   **P3, P4**   |
| **AC-07** | Subscribed business with 0 units remains discoverable and contactable     | Ordering badge changes to "Manual Contact Only"; menu browsing & directory remain fully active         |     **P4**     |
| **AC-08** | Hotel demonstrates public vs. guest-protected menus without data leakage  | Room service QR simulation with mock room token; guest validation; strict isolation of room/guest data |     **P5**     |
| **AC-09** | Multi-venue admin manages operations on both mobile and desktop           | Adaptive layout: bottom-tab + sheet navigation on mobile; dual-pane master-detail view on desktop      |     **P2**     |
| **AC-10** | Role-scoped staff member cannot access billing or owner controls          | RBAC context; billing/settings routes guarded; masked commercial tabs in staff view                    |     **P5**     |
| **AC-11** | Sponsored offer clearly labelled and isolated from organic discovery      | "Sponsored / Featured" pill on Home; separate carousel; zero weight in organic search rank             |   **P1, P5**   |
| **AC-12** | Usable under empty, loading, error, and offline conditions                | Dedicated zero-state illustrations, simulated network throttling, offline indicator badge              |   **P0, P7**   |
| **AC-13** | Consistent mock balances when switching between Customer and Merchant     | Single shared reactive domain store; immediate bidirectional synchronisation                           | **P0, P3, P4** |
| **AC-14** | Clear feedback and understandable next step for every major action        | Optimistic UI feedback, contextual toast notices, and persistent breadcrumbs                           |   **P0–P7**    |
| **AC-15** | Zero contradictions with approved PEWA Product Truth                      | Explicit Product Truth Binding Map cross-referenced in development docs                                |    **All**     |

---

## 4. Phase-by-Phase Implementation Slices

### Slice P0 — Foundation, Design Tokens & Scenario Control Engine

**Goal:** Establish the isolated workspace, core design system, responsive app shell, and the prototype simulation engine.

#### Scope & Deliverables

1. **Isolated Workspace Scaffold:** Setup React + TypeScript + Vite + Tailwind CSS.
2. **Design Tokens & Mobile Foundation:**
   - 44px+ touch targets, safe-area inset support (iOS notch/home indicator).
   - High-contrast, accessibility-checked color palettes for status badges: Draft (zinc), Published (emerald), Awaiting (amber), Accepted (blue), Ready (purple), Declined/Cancelled (rose).
3. **Scenario Control Panel (Dev Mode Floating Widget):**
   - Collapsible floating tool (fixed bottom-right or overlay toggle).
   - Instant switching between all 6 primary user roles:
     - Customer
     - Organisation Owner
     - Organisation Administrator
     - Business Manager
     - Operational Staff (Waiter / Barista)
     - PEWA Platform Operator
   - Quick-load selector for the 16 standard business scenarios.
   - Master **"Reset Scenario State"** button to restore seed fixtures cleanly.
4. **Mock Domain Store:**
   - In-memory state with LocalStorage synchronization.
   - Models: `Organisation`, `Brand`, `Venue`, `Menu`, `Section`, `Offering`, `Order`, `SubscriptionAccount`, `ActivityEvent`.

---

### Slice P1 — Customer Discovery & Public Menu Journey

**Goal:** Deliver the complete zero-friction customer experience from discovery to menu browsing and manual engagement.

#### Scope & Deliverables

1. **Public Menu Experience (`/m/:slug` or `/v/:venueId`):**
   - Prominent supplying business identity (logo, verified brand, venue address/service area).
   - Section navigation (sticky horizontal category scroll).
   - Offering cards: high-res photo, item name, localized description, price with currency formatting, dietary tags, availability status (In Stock / Sold Out).
   - Offering detail bottom sheet (mobile) / modal (desktop) with modifier groups and ingredient declarations.
2. **Direct Manual Contact Engine:**
   - Prominent Floating Action Button: "Contact Business".
   - Direct manual contact drawer: WhatsApp quick-chat link (with pre-filled context: _"Hi, I'm viewing your menu on PEWA..."_), Direct Phone Call, Direct Email.
   - Full utility even if structured ordering is disabled or unavailable.
3. **Customer Home (`/`):**
   - Search bar (instant client-side filtering by business name, dish, category, tags).
   - Recently visited menus carousel (saved locally in browser storage).
   - Saved favourite venues/menus (one-tap heart toggle).
   - Featured Offers section (clearly marked as "Sponsored").
   - PWA Install banner (simulated "Add to Home Screen").
4. **Directory & Discovery (`/directory`):**
   - Multi-facet filters: Cuisine type, Service context (Dine-in, Takeaway, Delivery-only), Distance/Area.
   - Support for original-language merchant content (no forced English taxonomy).
   - Organic vs. Featured separation: sponsored venues never artificially boost organic list position.

---

### Slice P2 — Business Onboarding, Workspace & Menu Authoring

**Goal:** Implement the phone-first business experience enabling an owner to register, configure their business, and build menus.

#### Scope & Deliverables

1. **Guided Mobile Onboarding Wizard (`/onboarding`):**
   - Step 1: Organisation name & business type (Single-venue café, Multi-venue restaurant, Hotel, Bakery, Delivery-only).
   - Step 2: Brand & venue profile (handles delivery-only without forcing a public street address).
   - Step 3: Default currency, service models (Dine-in, Takeaway, Delivery).
   - Step 4: First menu creation shortcut or template selection.
2. **Business Workspace Hub (`/admin`):**
   - Bottom navigation bar on mobile: Overview, Menus, Orders, Activity, More (Staff, Billing, Settings).
   - Desktop responsive expansion: Left sidebar navigation with responsive data grids.
3. **Menu Creation & Offering Management:**
   - Menu-level publishing lifecycle: Draft, Published, Hidden, Archived.
   - Section creation & drag-to-reorder simulation.
   - Offering editor: item name, description, price, photo upload simulation, tax/currency, modifiers/options (e.g., choice of milk, extra shot), availability toggle (Immediate "Mark as Sold Out").
   - Multi-menu support: e.g., Breakfast Menu (7am–11am), All-Day Menu, Cocktail Menu.
4. **Mobile-First Settings:**
   - Operating hours, contact methods, service areas, and notifications.

---

### Slice P3 — Structured Ordering & Lifecycle Decision Engine

**Goal:** Deliver the end-to-end order request workflow, strictly respecting the merchant decision model.

#### Scope & Deliverables

1. **Customer Order Assembly & Request Submission:**
   - Interactive cart drawer / bottom sheet showing itemized selections, modifiers, quantity, and total.
   - Customer details input (Name, Phone number, Table number or Delivery/Pickup notes) — **no compulsory account login**.
   - Explicit Confirmation Step: Disclaimers stating _"PEWA transmits your order request directly to the venue. Payment and fulfilment are handled directly with the business."_
   - Order Request Submission event.
2. **Order Lifecycle State Machine:**
   Simulate all canonical order states:
   - `SUBMITTED_AWAITING_DECISION` (Pulsing amber indicator)
   - `ACCEPTED` (Merchant confirmed)
   - `DECLINED` (Merchant declined with predefined reason)
   - `WITHDRAWN` (Customer cancelled before merchant decision)
   - `READY` (Merchant declared food/drink ready for pickup/service)
   - `AMENDMENT_PROPOSED` & `AMENDMENT_AGREED` (Price/item adjustment)
   - `CANCELLED` (Agreed cancellation)
   - `EXPIRED` (Auto-timeout if business does not respond in configured window)
3. **Merchant Order Management Cockpit (`/admin/orders`):**
   - Incoming orders audio/visual simulated alert.
   - Order detail card showing exact item snapshot, timestamps, and customer notes.
   - Action controls: "Accept Order", "Decline", "Propose Change".
   - One-tap "Mark as Ready".
4. **Customer Live Status Screen (`/orders/:orderId`):**
   - Real-time simulated status stepper tracking state transitions.
   - Access to direct call/WhatsApp to the venue for instant customer support.

---

### Slice P4 — Subscription Entitlements & Consumption Mechanics

**Goal:** Implement the 200 included monthly units, top-up balances, exact acceptance deduction, and graceful zero-unit exhaustion.

#### Scope & Deliverables

1. **Entitlement Balance Model:**
   - Base monthly tier: **200 Included Accepted-Order Units** per billing cycle.
   - Top-Up Units: Purchased bundles (e.g., +100, +500 units) that carry forward.
   - Recoverable Units: Up to 10 overdraft/debt units for in-flight continuity.
   - Expiration rules: Included units reset every cycle; top-ups remain.
2. **The Atomic Deduction Engine:**
   - State transition hook: `ORDER_STATE -> ACCEPTED`.
   - Priority deduction: Deducts from Included Units first; if 0, deducts from Top-up Units; if 0, activates Recoverable Debt Units (up to -10 max).
   - **Idempotency Guarantee:** Repeated clicks or re-renders never deduct duplicate units for the same order ID.
   - Zero deduction on decline, withdrawal, expiry, or ready status.
3. **The Critical Zero-Unit Exhaustion Scenario:**
   - Visual indicator on merchant dashboard: "0 Order Units Available — Top-up Required".
   - Customer menu experience:
     - Menu remains live, fast, and fully readable.
     - Direct links and QR codes remain fully functional.
     - Directory and organic search remain fully accessible.
     - Structured "Add to Cart" button is replaced with prominent "Contact Venue to Order" (Manual Contact Drawer).
     - **NEVER** displays "Business Closed" or "Service Unavailable".
4. **Subscription Dashboard (`/admin/billing`):**
   - Visual fuel-gauge meters for Included Units, Top-Up Units, and Billing Cycle progress.
   - Simulated Top-up purchase modal (demonstrates how business replenishes capacity).

---

### Slice P5 — Advanced Experiences: Hotel, Sponsored Offers & Staff RBAC

**Goal:** Model complex multi-context service environments, sponsored campaigns, and role-based permissions.

#### Scope & Deliverables

1. **Hotel Multi-Context & Protected Guest Service:**
   - Venue profile: "The Grand Horizon Hotel".
   - Public contexts: "The Horizon Lounge (Public Bar)", "Terrace Bistro (Public)".
   - Protected context: "In-Room Dining (Guests Only)".
   - Mock Guest Authentication: Room number + Guest PIN / Last Name simulation.
   - Public view completely hides guest-restricted menus from the public directory; direct QR scan in room validates guest session.
   - Strict guest isolation: guest name/room details are never leaked into public views or analytics.
2. **Paid Featured Offers vs. Free In-Menu Specials:**
   - In-Menu Specials: Free merchant badges ("Chef's Special", "20% Off Lunch") rendered inside their own menu.
   - Featured Offers Campaign Studio (`/admin/promotions`):
     - Campaign setup: Title, hero banner, target cuisine/category, budget, schedule.
     - Simulation of qualifying ad impressions vs. off-screen/unseen placements.
     - Distinct "Sponsored" badge on PEWA Home.
3. **Role & Permission Simulation (RBAC):**
   - Role switching triggers dynamic permission filters:
     - **Owner/Admin:** Full access to onboarding, billing, top-ups, staff, deletion.
     - **Business Manager:** Menu editing, order management, opening hours, local staff.
     - **Operational Staff:** View & accept orders, mark items as out-of-stock, view menu. Masked billing and settings.
     - **Customer:** Read-only menu, personal cart, order tracking.
4. **PEWA-Observed Activity Insights (`/admin/activity`):**
   - Metric cards: Menu visits, item views, manual contact taps, order requests, accepted orders, conversion rate.
   - Transparent disclaimer: Shows PEWA-observed events only; does not claim verified food turnover or physical table turnover.

---

### Slice P6 — PEWA Operator Console

**Goal:** Deliver the internal platform operations console for administrative oversight and compliance.

#### Scope & Deliverables

1. **Operator Console (`/operator`):**
   - Tenant overview: Registered organisations, brands, active menus, subscription states.
   - Bounded tenant management: Suspend/reactivate tenant access (for policy violations).
   - Usage dispute resolution: Inspect unit consumption logs, review disputed order events, simulate manual credit adjustments with audit notes.
   - Content moderation: Flagged menu items or misleading merchant claims.
   - Campaign integrity review: Monitor sponsored offer campaigns.
2. **Operator Guardrails:**
   - Technical prohibition: Operator role cannot accept orders on behalf of merchants, modify food prices, or change kitchen ready states.

---

### Slice P7 — Experience Hardening, Accessibility & Freeze Candidate

**Goal:** Validate all journeys across mobile and desktop, conduct accessibility audits, verify scenario fixtures, and assemble the final Experience Reference package.

#### Scope & Deliverables

1. **Cross-Role Journey Verification:** Validate all 15 Acceptance Criteria end-to-end.
2. **Viewport & Device Verification:** Test responsive breakpoints (375px, 390px, 414px mobile; 768px tablet; 1280px desktop).
3. **Scenario Engine Audit:** Ensure all 16 scenarios load cleanly from the Scenario Control Panel and reset reliably.
4. **Accessibility (a11y) Polish:** Verify keyboard navigation, screen-reader labels on buttons, minimum 4.5:1 color contrast, and proper focus rings.
5. **Freeze Candidate Assembly:** Tag versioned release candidate for Founder review.

---

## 5. Master Scenario Engine Specification

The Scenario Control Panel will feature one-click hydration for 16 deterministic scenarios:

| ID        | Scenario Name                     | Preset Context & Fixture                    | Primary Verification Goal                                                           |
| :-------- | :-------------------------------- | :------------------------------------------ | :---------------------------------------------------------------------------------- |
| **SC-01** | **New Café Quickstart**           | Unconfigured account, zero menus            | Test mobile onboarding to first published menu in under 3 minutes                   |
| **SC-02** | **Established Restaurant**        | Multi-category menu, active lunch rush      | Test operational staff order queue and fast item 86-ing (sold out)                  |
| **SC-03** | **Multi-Brand Hospitality Group** | 1 Org, 3 Brands (Bistro, Pizza, Dessert)    | Test brand switching and organization-level admin permissions                       |
| **SC-04** | **Luxury Hotel Context**          | Public bar + Protected In-Room Dining       | Test guest room verification and zero public data leakage                           |
| **SC-05** | **Ghost / Delivery Kitchen**      | Delivery-only operation, no storefront      | Test service area radius configuration without public address                       |
| **SC-06** | **Active Units (Normal Flow)**    | 142 / 200 units remaining                   | Test standard order submission, acceptance, and -1 unit balance deduction           |
| **SC-07** | **Zero Units Exhaustion**         | 0 / 200 units, 0 top-ups, active sub        | Verify menu stays live, direct contact stays active, new orders gracefully disabled |
| **SC-08** | **Expired Subscription**          | Subscription expired > 14 days              | Verify grace period expiration banner and recovery flow                             |
| **SC-09** | **In-Flight Order Continuity**    | Order submitted while units drop to 0       | Verify previously admitted order can still be accepted under debt allowance         |
| **SC-10** | **Duplicate Accept Race**         | Two staff tap "Accept" simultaneously       | Verify idempotent execution: 1 acceptance state, exactly 1 unit deducted            |
| **SC-11** | **Customer Withdrawal Conflict**  | Customer withdraws while merchant reviews   | Verify withdrawal takes precedence; merchant notified; 0 units deducted             |
| **SC-12** | **Sold-Out Item in Cart**         | Item marked unavailable while in cart       | Verify cart alerts customer with honest availability messaging                      |
| **SC-13** | **Price Update During Review**    | Merchant edits price before customer submit | Verify order snapshot integrity and price amendment workflow                        |
| **SC-14** | **Simulated Offline Network**     | Device loses connection mid-session         | Verify offline banner and read-only cache simulation                                |
| **SC-15** | **Unauthorized Guest Access**     | Unauthenticated user visits room menu URL   | Verify access blocked cleanly without revealing room/guest details                  |
| **SC-16** | **Sponsored Campaign Live**       | Active Featured Offer on PEWA Home          | Verify clear "Sponsored" tag and separate metrics from organic visits               |

---

## 6. Execution Roadmap & Milestones

The work is organized into iterative, verifiable sprints focused on delivering tangible interaction value at every step.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          MILESTONE TIMELINE                            │
├────────────────────────────────────────────────────────────────────────┤
│ Sprint 1: Foundation & First Vertical Experience (First Execution)     │
│   - Workspace scaffolding & design system tokens                       │
│   - Mock store & scenario engine widget                                │
│   - Café Onboarding -> Menu Build -> Publish -> Public Menu -> Contact │
├────────────────────────────────────────────────────────────────────────┤
│ Sprint 2: Customer Discovery & Structured Ordering                     │
│   - PEWA Home & Directory search                                       │
│   - Customer cart, order request submission, order snapshot            │
│   - Merchant order cockpit & full lifecycle state machine              │
├────────────────────────────────────────────────────────────────────────┤
│ Sprint 3: Commercial Engine & Entitlements                             │
│   - 200 Included units, top-up balances, atomic acceptance deduction   │
│   - Zero-unit exhaustion behavior and graceful fallback                │
├────────────────────────────────────────────────────────────────────────┤
│ Sprint 4: Advanced Contexts & Operator Experience                      │
│   - Hotel guest room service & protected menus                         │
│   - Sponsored Featured Offers campaign manager                         │
│   - Role-based access control (RBAC)                                   │
│   - PEWA Platform Operator Console                                     │
├────────────────────────────────────────────────────────────────────────┤
│ Sprint 5: Hardening & Experience Reference Freeze Candidate            │
│   - 16-Scenario suite testing & audit                                  │
│   - Accessibility & cross-device polish                                │
│   - Founder Review Guide & Freeze Documentation                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Deliverables & Documentation Package

In accordance with Section 12 of the Master Brief, the prototype delivery comprises 8 formal deliverables:

1. **Deliverable A — Working Interactive Prototype:** Responsive PWA with embedded Scenario Control Panel and mock domain data.
2. **Deliverable B — Prototype README:** Setup commands, execution instructions, scenario switching guide, and reset commands.
3. **Deliverable C — Experience Map:** Diagrammatic user journeys, screen hierarchy, and state transition logic.
4. **Deliverable D — Product Truth Binding Map:** Traceability table linking every interaction to approved Stage 3/4 requirements.
5. **Deliverable E — Scenario Library:** Comprehensive JSON/TypeScript seed fixtures for all 16 business situations.
6. **Deliverable F — Founder Review Guide:** Step-by-step walkthrough scripts for validating each experience slice on desktop and mobile.
7. **Deliverable G — Open Decisions & Assumptions Log:** Consolidated register of open product/commercial/security items reserved for Founder decision.
8. **Deliverable H — Experience Reference Freeze Candidate:** Formal versioned package designating the approved reference build for future engineering handover.

---

## 8. Immediate Next Actions (First Execution Assignment)

To fulfill **Section 14 ("First Execution Assignment")**, immediate implementation commences with the following sequence:

1. **Scaffold the isolated prototype workspace** with mobile-first PWA responsive shell and typography tokens.
2. **Implement the reactive Mock Domain Store** with initial seed data and the floating Scenario Control Panel.
3. **Assemble the first complete vertical journey:**
   - Small Café Onboarding (Name, Single Venue, Brand).
   - Menu Authoring (Create Section, Add 2 Offerings with prices/modifiers, Set Availability).
   - Instant Menu Publication.
   - Public Menu Direct Link (`/m/green-garden-cafe`) viewing.
   - Customer manual engagement (direct WhatsApp / Call drawer).
4. **Verify responsive rendering** on 375px mobile and 1280px desktop viewports.
5. **Publish the initial execution milestone report** with step-by-step preview and review instructions.
