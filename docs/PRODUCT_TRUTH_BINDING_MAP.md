# Deliverable D — Product Truth Binding Map
**Traceability Register: Approved Stage 3/4 Requirements vs Prototype Implementation**

---

## 1. Overview & Purpose
This document establishes unbroken traceability between the approved PEWA Product Truth (Master Builder Brief Sections 3–10) and the interactive prototype implementation. It explicitly demarcates **simulated prototype behavior** from **future production engineering requirements**.

---

## 2. Comprehensive Traceability Matrix

| Area | Product Truth Requirement | Prototype Implementation | Simulated Behavior (Prototype) | Production Implementation (Future) |
| :--- | :--- | :--- | :--- | :--- |
| **PWA & Zero Install** | Customers must open menus instantly via QR/web link without registration, apps, or friction. | Responsive SPA loaded at `/m/:slug` with instant SSR/client hydration. | Mock menus stored in memory/Zustand persist layer. | CDN-cached static/edge HTML with PWA service worker caching and manifest. |
| **Manual Direct Contact** | Customers can always contact the business directly without creating a PEWA order. | Contact Drawer with direct `tel:`, `mailto:`, and `wa.me` links populated from venue metadata. | Formats links and triggers OS protocols / mock feedback. | Live WhatsApp Business API, Click-to-Call analytics, and merchant call routing. |
| **Cart & Disclaimer** | Order submission must be explicitly disclaimed as a request, not a confirmed sale. | Cart Drawer includes explicit non-sale disclaimer, mandatory confirmation checkbox, and clear review screen. | Guest cart persisted in client storage; transmitted to local state. | Push notifications to merchant POS / mobile webhook transmission. |
| **Atomic Unit Deduction** | Merchant acceptance deducts exactly 1 unit; repeat acceptances deduct 0; declines/withdrawals deduct 0. | `acceptOrder(id)` checks `order.unitConsumed === false` and decrements units atomically. | Local state mutation on in-memory store; verified via Vitest. | Distributed PostgreSQL row-level locks / Firestore transaction with atomic unit decrement. |
| **Zero Units Graceful Exhaustion** | When capacity reaches 0, public menus and contact stay live; structured ordering pauses. | `canAdmitOrder(orderPolicy)` returns false; Cart notifies customer; public menu remains available. | Simulated through scenario `zero-units` and billing cockpit slider. | Automated webhook trigger alerting merchant to top up; queue throttling. |
| **In-Flight Order Continuity** | Admitted orders can be accepted even if capacity reaches 0 while pending, up to 10 continuity units. | `overdraftUsed` tracks up to 10 continuity units upon acceptance when included + topUp == 0. | Bounded overdraft counter in store state. | Credit overdraft balance invoiced or recovered from next billing cycle / card charge. |
| **Customer Withdrawal Conflict** | Customer withdrawal takes precedence over simultaneous merchant decision if received first. | `withdrawOrder(id)` succeeds only if `status === "pending"`; subsequent merchant accept returns `false`. | Atomic Zustand transition check. | Optimistic concurrency control / Firestore state version comparison. |
| **Hotel Protected Dining** | Protected room service menus require in-house guest verification without public leakage. | `m.$slug.tsx` evaluates `menu.isProtected`; shows room verification gate; clears on exit. | Verification checks against mock guest fixtures (Room 402, Smith / PIN 1234). | PMS integration (Opera, Cloudbeds, Mews) with real-time guest room folio validation. |
| **Sponsored Featured Offers** | Sponsored offers must be clearly tagged and separate from organic search rankings. | Home renders dedicated "Featured Offers" box with "Sponsored" badge; clicks recorded separately. | In-memory campaigns array; CPC metrics logged to activity feed. | Ad billing auction engine, geo-targeted impression counters, budget drawdown worker. |
| **RBAC Isolation** | Operational staff cannot view commercial billing or edit organisation settings. | Route guards in `admin.billing.tsx`, `admin.promotions.tsx`, and action helpers. | Disabled buttons, access denied screens, role switcher widget. | JWT claims, backend API gateway middleware, Postgres Row-Level Security (RLS). |
| **Operator Technical Guardrails** | PEWA Operator cannot accept orders, change kitchen status, or alter food prices. | `canManageOrders("operator") === false`, `canAuthorMenus("operator") === false`. | Enforced in UI rendering and store action guards; returns `false`. | Hardened IAM roles, microservice perimeter authentication, append-only operator audit log. |
| **Network Interruption Resilience** | Prototype remains navigable under offline and interrupted network conditions. | `OfflineBanner` alerts user; `validateCart` prevents submission; cached menus remain readable. | In-store `simulatedOffline` toggle and browser `navigator.onLine` listener. | Full Service Worker Cache API with Background Sync for queued offline submissions. |

---

## 3. Production Boundaries: What Is NOT In The Prototype

1. **No External Payment Gateways**: The prototype deliberately does not collect customer credit cards or integrate Stripe/M-Pesa. PEWA is a menu and ordering communication vehicle; transactions settle directly between merchant and patron.
2. **No Backend Database**: In compliance with the prototype brief, all state is self-contained in a persistent reactive Zustand engine.
3. **No Automated Bot / AI Chat**: The prototype strictly avoids AI chatbots or unsolicited AI assistants, adhering to direct merchant-to-customer communication.
