# PEWA — Master Interactive Prototype & Experience Reference

**Build Revision: `v1.0.0-rc1` (Freeze Candidate)**

> **Deliverable B — Prototype README**  
> Exact local setup, execution, scenario switching, reset instructions, and architecture guide.

---

## 1. About the Prototype

PEWA is a mobile-first Progressive Web Application (PWA) that empowers hospitality businesses (cafés, multi-brand restaurant groups, luxury hotels, and delivery kitchens) to author and publish menus instantly from a mobile phone, and allows customers to browse menus, submit structured order requests, or contact businesses directly with zero app installation and zero mandatory account creation.

This interactive prototype demonstrates all 7 foundational and advanced experience slices (Slice P0 through Slice P7) in full alignment with the approved Stage 3/4 Product Truth.

---

## 2. Quick Local Setup & Execution

### Prerequisites

- Node.js 18+ or 20+
- npm 9+

### Commands

```bash
# 1. Install dependencies
npm install

# 2. Start the development server (runs on port 3000)
npm run dev

# 3. Run the automated test suite (40+ unit & integration tests)
npm test

# 4. Check syntax and linting
npm run lint

# 5. Build production bundle
npm run build
```

The application will be live at `http://localhost:3000`.

---

## 3. Scenario Control Engine & Reset Instructions

The prototype is powered by a deterministic, client-persisted Zustand state engine (`src/lib/pewa/store.ts`).

### The Floating Scenario Control Panel

Look at the **top right corner** of any screen for the floating purple button showing the active role (e.g., `Customer`, `Organisation Owner`).

1. **Switch Roles**: Instantly switch between `Customer`, `Organisation Owner`, `Organisation Administrator`, `Business Manager`, `Operational Staff`, and `PEWA Operator`.
2. **Jump to Key Views**: One-click navigation to Customer Home (`/`), Directory (`/directory`), Merchant Workspace (`/admin`), Merchant Orders (`/admin/orders`), Public Menus (`/m/:slug`), Operator Console (`/operator`), or Deliverables (`/docs`).
3. **Simulate Offline Mode**: Click the **Offline Network Simulation** toggle to test network resilience and cached menu reading.
4. **Load Scenarios**: 16 deterministic scenarios pre-configured for one-click review (SC-01 through SC-16).
5. **Reset State**: Click the **Reset** button in the Scenario Panel at any time to return the prototype to its default clean seed state.

---

## 4. Key Route Directory

| URL Route                | Description                                                  | Target Role               |
| :----------------------- | :----------------------------------------------------------- | :------------------------ |
| `/`                      | Customer Home, search, recent venues, and Featured Offers    | Customer / All            |
| `/directory`             | Multi-criteria public menu directory                         | Customer / All            |
| `/m/green-garden-cafe`   | Public menu for Green Garden Café (cart + contact)           | Customer                  |
| `/m/grand-horizon-hotel` | Luxury hotel menu (public bistro + protected in-room dining) | Customer / In-House Guest |
| `/m/cloudburger`         | Delivery-only ghost kitchen menu                             | Customer                  |
| `/onboarding`            | 3-minute café quickstart setup wizard                        | Business Owner            |
| `/admin`                 | Business Workspace hub & QR code generator                   | Business Roles            |
| `/admin/menus/:menuId`   | Menu authoring studio (sections, offerings, modifiers)       | Owner / Admin / Manager   |
| `/admin/orders`          | Merchant Order Cockpit & kitchen workflow                    | Owner / Admin / Staff     |
| `/admin/billing`         | Acceptance units gauge, top-ups, and subscription engine     | Owner / Admin             |
| `/admin/promotions`      | Featured Offer campaign studio & in-menu badges              | Owner / Admin / Manager   |
| `/admin/activity`        | PEWA-observed digital interaction insights                   | Business Roles            |
| `/operator`              | Dedicated PEWA Platform Operator Console                     | PEWA Operator             |
| `/docs`                  | Formal Deliverables Package (Deliverables A through H)       | Reviewer / Founder        |

---

## 5. Formal Deliverables Package

In accordance with Section 12 of the Master Builder Brief:

- **Deliverable A — Working Interactive Prototype**: Responsive PWA runnable locally and via preview URL.
- **Deliverable B — Prototype README**: This document (`README.md`).
- **Deliverable C — Experience Map**: [`docs/EXPERIENCE_MAP.md`](docs/EXPERIENCE_MAP.md).
- **Deliverable D — Product Truth Binding Map**: [`docs/PRODUCT_TRUTH_BINDING_MAP.md`](docs/PRODUCT_TRUTH_BINDING_MAP.md).
- **Deliverable E — Scenario Library**: [`docs/SCENARIO_LIBRARY.md`](docs/SCENARIO_LIBRARY.md).
- **Deliverable F — Founder Review Guide**: [`docs/FOUNDER_REVIEW_GUIDE.md`](docs/FOUNDER_REVIEW_GUIDE.md).
- **Deliverable G — Open Decisions & Assumptions Log**: [`docs/OPEN_DECISIONS_AND_ASSUMPTIONS.md`](docs/OPEN_DECISIONS_AND_ASSUMPTIONS.md).
- **Deliverable H — Experience Reference Freeze Candidate**: [`docs/EXPERIENCE_REFERENCE_FREEZE_CANDIDATE.md`](docs/EXPERIENCE_REFERENCE_FREEZE_CANDIDATE.md).

All deliverables can also be viewed live inside the prototype by visiting `/docs`.
