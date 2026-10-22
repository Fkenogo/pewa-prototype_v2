# Deliverable H — Experience Reference Freeze Candidate

**Candidate Package: PEWA Prototype Build Revision v1.0.0-rc1**

---

## 1. Executive Summary & Freeze Declaration

This document designates **PEWA Prototype Build Revision `v1.0.0-rc1`** as the formal **Experience Reference Freeze Candidate** submitted for Founder review and determination.

This build integrates all seven experience slices (Slice P0 through P7), fully realizes the Master Builder Brief specifications, implements the 16 deterministic scenarios, and strictly enforces approved Product Truth boundaries.

```
BUILD METADATA
Revision:       pewa-prototype-v1.0.0-rc1
Release Target: Founder Experience Reference Freeze
Date:           October 20, 2026
Test Coverage:  40+ passing automated tests across all state machines and guardrails
Platform:       Progressive Web App (PWA) / Responsive SPA (375px to 1440px+)
Persistence:    Client-persisted Zustand state engine with StorageEvent synchronization
```

---

## 2. Accepted Journeys & Binding Interaction Behaviors

The following 10 primary journeys constitute the **Binding Experience Reference** for future production engineering:

1. **Zero-Friction Public Menu Discovery (`/m/:slug`)**:
   - Zero app installation, zero registration, zero cookie walls.
   - Anchor-based section navigation, responsive item detail drawer, specialty badges, and sold-out states.
2. **Direct Manual Contact Safeguard**:
   - Contact drawer offering direct WhatsApp, Phone, and Email links that bypass platform order creation.
3. **Structured Ordering Communication Protocol**:
   - Non-sale disclaimer on review screen: _"This is a request, not a confirmed sale. PEWA transmits your order request directly to the venue."_
   - Explicit confirmation checkbox before submission.
4. **Merchant Order Cockpit & Kitchen State Machine (`/admin/orders`)**:
   - Real-time queue: `pending` → `accepted` → `ready`.
   - Single atomic unit deduction upon first `accept`; 0 units on repeated accept, decline, or mark ready.
5. **Customer Live Tracking & Withdrawal Safeguard (`/orders/:orderId`)**:
   - Customer can withdraw a pending order prior to merchant acceptance.
   - Immediate mutual synchronization; if customer withdraws first, merchant cannot accept.
6. **Graceful Zero-Capacity Exhaustion (`/admin/billing`)**:
   - Included monthly tier (200 units) + top-up balances.
   - When capacity hits 0, public menus and contact remain 100% live. New orders pause politely.
   - Admitted orders in-flight draw on bounded continuity units (up to 10).
7. **Protected Context & Hotel In-Room Dining**:
   - Room number and guest verification gate for private menus (`isProtected: true`).
   - Zero menu or pricing leakage to unverified public visitors.
8. **Sponsored Featured Offers Studio (`/admin/promotions`)**:
   - Clear "Sponsored" tag on PEWA Home.
   - Transparent performance metrics (Impressions, Clicks, CPC, Budget drawdown).
9. **Role-Based Access Control (RBAC)**:
   - Operational staff can manage orders and toggle availability (86-ing items), but cannot access billing or organizational settings.
10. **PEWA Platform Operator Console (`/operator`)**:
    - Tenant suspension/reactivation for policy compliance.
    - Usage dispute credit adjustments and content moderation.
    - Absolute technical prohibition preventing operators from accepting food orders or altering food prices.

---

## 3. Known Prototype Exclusions (Non-Goals)

In strict accordance with Master Brief Section 10 ("What Not to Build"), the following systems are explicitly excluded from this prototype:

- **No Online Payment Gateway**: PEWA does not collect credit cards, charge customer wallets, or integrate payment processors. Fulfilment and payment remain between customer and venue.
- **No Production Cloud Database**: State is entirely maintained in the deterministic prototype store to allow rapid scenario switching and offline testing.
- **No AI Chatbots or Virtual Assistants**: Zero conversational AI clutter; the UI is direct, legible, and honest.

---

## 4. Founder Signoff Gate

```
[ ] APPROVED AS EXPERIENCE REFERENCE FREEZE (v1.0.0-rc1)
[ ] REVISION REQUESTED (See notes below)

Founder Signature: __________________________    Date: ______________
```
