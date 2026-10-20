# Deliverable C — Experience Map
**PEWA Master Prototype — Experience Reference Release Candidate**

---

## 1. Role System & Navigation Architecture

PEWA recognizes six distinct roles, each strictly partitioned to uphold Product Truth, data confidentiality, and operational boundaries:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 PEWA ECOSYSTEM                                   │
├──────────────────────┬───────────────────────────────┬───────────────────────────┤
│  PUBLIC AUDIENCE     │      MERCHANT WORKSPACE       │    PLATFORM OPERATOR      │
├──────────────────────┼───────────────────────────────┼───────────────────────────┤
│ • Customer           │ • Organisation Owner          │ • PEWA Operator           │
│   (No auth required, │   (Full authority, billing)   │   (Tenant compliance,     │
│    zero installation)│ • Organisation Administrator  │    disputes, moderation,  │
│ • Hotel In-Room Guest│   (Multi-brand management)    │    campaign oversight)    │
│   (Room + PIN verify)│ • Business Manager            │   [Prohibited from order  │
│                      │   (Menu authoring, campaigns) │    acceptance, kitchen,   │
│                      │ • Operational Staff           │    and food pricing]      │
│                      │   (Queue, 86-ing items only)  │                           │
└──────────────────────┴───────────────────────────────┴───────────────────────────┘
```

---

## 2. Screen Hierarchy & URL Map

| Route URL | Screen Name | Permitted Roles | Primary Interactivity & Intent |
| :--- | :--- | :--- | :--- |
| `/` | **PEWA Home & Discovery** | All | Search by dish/cuisine/tag, recent venues carousel, saved favourites, active sponsored Featured Offers. |
| `/directory` | **Menu Directory** | All | Exhaustive multi-filter directory (category, service mode, area). Excludes protected menus. |
| `/m/:slug` | **Public Menu Direct** | All (Guest verified for room dining) | Instant mobile menu with category anchors, dietary tags, sold-out indicators, direct contact drawer, offering drawer & guest cart. |
| `/onboarding` | **Café Quickstart Wizard** | Owner / Admin | 3-step phone onboarding: Name & currency, single venue creation, instant published menu generation. |
| `/admin` | **Business Workspace Hub** | Owner, Admin, Manager, Staff | Venue switcher, menu publishing status, QR code display & download, quick links to orders, billing, and promotions. |
| `/admin/menus/:menuId` | **Menu Authoring Studio** | Owner, Admin, Manager (Staff can 86 items) | Section manager, offering creation, price configuration, modifiers with price deltas, instant publish/unpublish/hide toggle. |
| `/admin/orders` | **Merchant Order Cockpit** | Owner, Admin, Manager, Staff | Live incoming requests queue, acceptance unit balance indicator, accept / decline with canned reasons, mark ready. |
| `/admin/billing` | **Subscription & Units Engine** | Owner, Admin (Staff forbidden) | Fuel gauge of 200 monthly units, top-up balance, continuity overdraft usage, top-up purchase modal, billing cycle simulation sandbox. |
| `/admin/promotions` | **Campaigns & Featured Offers** | Owner, Admin, Manager | Self-serve Featured Offer campaign studio ($50 budget, impressions, clicks, CPC) and free in-menu special badges. |
| `/admin/activity` | **PEWA-Observed Activity** | All business roles | Real-time observational metrics: digital order requests, acceptance rate, direct manual contact taps, search impressions. |
| `/orders` | **Customer Requests List** | Customer / All | List of active and past orders placed from this browser with status tags. |
| `/orders/:orderId` | **Customer Live Order Tracker** | Customer / All | Real-time status display (Submitted → Accepted → Ready), order snapshot, pre-acceptance customer withdrawal button, direct contact drawer. |
| `/operator` | **PEWA Operator Console** | PEWA Operator, Admin, Owner | Tenant directory, bounded tenant suspension/reactivation, dispute credit adjustments, allergen/content moderation, campaign review, technical guardrails audit. |
| `/docs` | **Deliverables & Review Guide** | All | Integrated documentation viewer containing Deliverables A through H, interactive scenario loader, and Acceptance Criteria matrix. |

---

## 3. Core Workflow State Machines

### 3.1 Structured Ordering & Lifecycle Decision Engine

```
       Customer Submits Cart
                 │
                 ▼
       ┌──────────────────┐
       │     PENDING      │ ◄─── Consumes ZERO units
       └─────────┬────────┘      Clearly labelled: "Request, not a confirmed sale"
                 │
        ┌────────┴────────┬─────────────────────────┐
        │                 │                         │
 Customer Withdraws       │ Merchant Accepts        │ Merchant Declines
        │                 │                         │
        ▼                 ▼                         ▼
┌───────────────┐ ┌───────────────┐        ┌───────────────┐
│   WITHDRAWN   │ │   ACCEPTED    │        │   DECLINED    │
└───────────────┘ └───────┬───────┘        └───────────────┘
0 Units consumed          │ Deducts EXACTLY 0 Units consumed
Merchant notified         │ ONE unit        Reason sent to guest
                          ▼
                  ┌───────────────┐
                  │     READY     │ ◄─── Consumes ZERO units
                  └───────────────┘      Arranges pickup/delivery
```

### 3.2 Subscription Unit Entitlement Priority

When a merchant accepts an admitted order:
1. **Included Monthly Units (Tier: 200 units)**: Deducted first.
2. **Top-Up Balance**: Deducted if included units reach zero. Carries forward across monthly billing cycles.
3. **Continuity Units (Bounded Overdraft: 10 units)**: Allowed ONLY for orders already admitted before capacity reached zero. Prevents abrupt rejection of customer requests in flight.
4. **Graceful Zero-Capacity State**: When both included and top-up reach 0, menu stays 100% published, phone/WhatsApp/email contact stay 100% active. New structured cart submissions are politely paused with clear guidance.

### 3.3 Hotel Public vs Protected Context

```
   User arrives at /m/grand-horizon-hotel
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
  [Terrace Bistro]    [In-Room Dining]
    Public Menu        Protected Menu
         │                   │
         │                   ▼
         │           Verified In-House Guest?
         │             /                  \
         │           NO                    YES
         │           /                      \
         │     Show Room + PIN        Show VIP 24-hr Menu
         │     Verification Wall      & In-Room Order Form
         ▼           │                      │
   Instant Browse    └── Zero Leakage ──────┘
```
