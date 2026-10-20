# Deliverable F — Founder Review Guide

**Step-by-Step Walkthrough Scripts for Reviewing Every Experience Slice**

---

## 1. Quick Start & Reviewer Controls

- **Floating Scenario Control Panel**: Located at the top right of every screen. Tap to change roles (`Customer`, `Organisation Owner`, `Organisation Administrator`, `Business Manager`, `Operational Staff`, `PEWA Operator`), load any of the 16 scenarios, jump to key routes, or reset state to baseline.
- **Responsive Viewport Testing**: Test on mobile viewports (375px iPhone SE, 390px iPhone 14/15, 414px Max) as well as desktop (1280px+).

---

## 2. Slice-by-Slice Review Walkthroughs

### Slice P0 & P1 — Customer Discovery & Public Menu Journey

1. Open the floating Scenario Panel and tap **Customer Home** (`/`).
2. Search for "coffee", "bistro", or "smash". Notice real-time filtering across titles, tags, and offerings.
3. Open the **Menu Directory** (`/directory`). Filter by Category ("Smashed Burgers", "Pastries"), Service ("Takeaway"), and Area.
4. Click into **Green Garden Café** (`/m/green-garden-cafe`).
5. Notice:
   - Category anchor links scroll smoothly to sections.
   - Dietary and specialty tags are visible on dishes.
   - Floating action bar offers **Contact business** (direct WhatsApp, Phone, Email) and **View cart**.
   - Tap **Contact business** to inspect the Contact Drawer. Notice direct external links bypassing platform order creation.

### Slice P2 — Business Onboarding, Workspace & Menu Authoring

1. In the Scenario Panel, select scenario **New café** (`new-cafe`). The app navigates to `/onboarding`.
2. Follow the 3-step mobile wizard:
   - Step 1: Account name & currency (KES).
   - Step 2: Venue name, services (Dine-in, Takeaway), phone & WhatsApp contact.
   - Step 3: Enter first menu name and add a sample offering.
3. Tap **Publish & Open Workspace**.
4. You are directed to `/admin`. Notice the published status badge, QR code preview & print/save buttons, and venue switchers.
5. Tap **Manage menu** to visit `/admin/menus/:menuId`. Add offerings, adjust price, add milk/modifier options, and toggle visibility.

### Slice P3 — Structured Ordering & Lifecycle Decision Engine

1. In the Scenario Panel, select scenario **Units available** (`units-available`).
2. On `/m/green-garden-cafe`, tap on **Flat White**.
3. Choose modifier (e.g. "Oat Milk +50"), enter optional kitchen note ("Extra hot"), tap **Add to cart**.
4. Open the Cart Drawer. Tap **Review request**.
5. Observe the mandatory disclaimer: _"This is a request, not a confirmed sale"_.
6. Check the confirmation checkbox and tap **Submit order request**.
7. You are redirected to `/orders/:orderId`. Status shows **Submitted** (`pending`).
8. Open the Scenario Panel, switch role to **Operational Staff**, and jump to **Merchant orders** (`/admin/orders`).
9. Tap **Accept order**. Notice:
   - Order moves from "Incoming" to "Preparing".
   - Exactly **1 acceptance unit** is deducted.
   - Tap **Mark as ready** to advance kitchen status (consumes 0 units).
10. Check live customer view (`/orders/:orderId`) in another tab or link: status instantly updates to **Ready**.

### Slice P4 — Commercial Entitlements & Zero-Unit Graceful Fallback

1. Open the Scenario Panel and load scenario **Zero units** (`zero-units`).
2. Switch role to **Organisation Owner** and visit **Subscription & Units** (`/admin/billing`).
3. Notice:
   - Fuel gauges clearly show `0 / 200 included units` and `0 top-up units`.
   - Alert informs: _"New structured requests paused. Public menus and direct contact remain live."_
4. Visit `/m/green-garden-cafe`: The menu is 100% visible, phone and WhatsApp are accessible. Attempting to add an item to the cart politely displays: _"Structured requests are paused. Please contact the business directly."_
5. Return to `/admin/billing`. Click **Purchase Top-Up Bundle** (e.g. `+100 units`).
6. Notice balances instantly replenish and ordering capability resumes.
7. Switch role to **Operational Staff** and attempt to visit `/admin/billing`: Access is strictly blocked with an informative security message.

### Slice P5 — Advanced Hospitality, Promotions & Observational Insights

1. **Luxury Hotel Context**:
   - In the Scenario Panel, load scenario **Protected access denied** (`protected-denied`).
   - Visit `/m/grand-horizon-hotel`.
   - Notice the public menu ("Terrace Bistro & Lounge") is openly browseable.
   - Tap the tab for **In-Room Dining (Guests Only)**.
   - The room verification barrier appears: enter demo credentials (Room `402`, Last name `Smith`).
   - Room service unlocks; room number is stored in session and attached to orders.
2. **Featured Offers Campaign Studio**:
   - In the Scenario Panel, load scenario **Sponsored campaign** (`sponsored-campaign`).
   - Visit `/admin/promotions`. Inspect active campaign metrics (Budget: $50, Clicks: 18, CPC: $0.79).
   - Visit Home (`/`): Observe the "Featured Offers" block with clear "Sponsored" badge.
3. **PEWA-Observed Activity**:
   - Visit `/admin/activity` to review digital interaction insights, acceptance rate, and WhatsApp click-throughs.

### Slice P6 — PEWA Operator Console & Guardrails

1. In the Scenario Panel, switch role to **PEWA Operator** and jump to **Operator console** (`/operator`).
2. Notice the dedicated platform dashboard:
   - **Tenants & Subscriptions Tab**: Inspect Green Garden Café, Grand Horizon Hotel, and CloudBurger.
   - Test **Suspend Tenant** / **Reactivate Tenant** with audit notes.
   - **Dispute Resolution Tab**: Inspect usage dispute `disp_1`; resolve with manual credit adjustments (+1 unit) or dismiss.
   - **Content Moderation Tab**: Inspect flagged allergen claim on CloudBurger; take action (issue warning or hide item).
   - **Campaign Review Tab**: Review sponsored offers; test policy pause.
   - **Platform Guardrails Tab**: Review technical prohibition tests verifying operators cannot accept food orders, change kitchen status, or edit prices.

### Slice P7 — Experience Hardening & Freeze Candidate

1. Open the documentation portal at `/docs` to inspect all 8 deliverables.
2. Toggle **Offline Network Simulation** in the Scenario Panel:
   - Observe the yellow Offline Banner at the top of the app.
   - Verify menus and local cart remain responsive while offline.
   - Verify cart submission gracefully prevents submission until connection restores.
3. Test keyboard navigation using `Tab` key:
   - "Skip to main content" link appears on first tab.
   - All buttons have visible focus rings (`ring-2 ring-ring`).
4. Run automated test suite: 100% of tests passing across scenarios, operator guardrails, and ordering state machines.

---

### Slice R1-A — Menu Taxonomy and Structure (Refinement Slice)

1. **Status Banner**:
   - Open the Scenario Panel (top-right flask button).
   - Observe the yellow banner: `UNFROZEN — FOUNDER REFINEMENT IN PROGRESS (R1-A: Taxonomy & Structure)`.
2. **Onboarding Category Selection & Custom Category**:
   - In Scenario Panel, load `new-cafe`.
   - Tap **Step 1 ("What kind of business?")**:
     - Notice the rich suggested categories (`Café`, `Restaurant & Bistro`, `Artisan Bakery`, `Hotel & Hospitality`, `Pizzeria & Trattoria`, `Delivery & Cloud Kitchen`) with contextual sub-descriptions.
     - Tap **Custom category...**: an input field appears where any merchant category can be entered (e.g. `Swahili Coastal Kitchen`).
3. **Menu Editor — Suggested Sections vs Custom Creation**:
   - Jump to `/admin` then tap **Manage menu**.
   - Notice the **"Suggested sections for your Café"** chip bar (e.g. `[+ Hot Coffee & Espresso]`, `[+ Cold Brew & Iced Drinks]`, `[+ Breakfast & Brunch]`).
   - One tap on a suggested section chip instantly adds that section to the menu.
   - Use the **Custom section name** input to add any custom section in any natural language (e.g. `Vyakula Vya Asili`).
4. **Offering Editor — Tags & Tag Reuse**:
   - Tap **Add item** or edit an existing item (e.g. `Flat White`).
   - Notice the **Descriptive Tags & Dietaries** section:
     - Currently assigned tags render as visual chips with an `×` remove button.
     - **Suggested tags** based on category: tap `[+ Single Origin]`, `[+ Organic]`, or `[+ Vegan]` to attach immediately.
     - **Reuse tags from this menu**: shows tags already used in other items in this menu for 1-tap consistency.
     - **Custom tag creation**: type `House Roast` or `Keto` and press Enter to create and assign immediately.
5. **Offering Editor — Dual-Mode Media Selection**:
   - In the item editor, inspect the **Photo & Icon** section:
     - Tap **Library**: opens the curated prototype image library drawer with high-resolution food and beverage photography across categories (Coffee, Breakfast, Bakery, Burgers, Mains, Desserts). Tap an image to attach it.
     - Tap **Upload**: selects a local photo from device with instant browser-based preview (zero database/upload services required).
     - Tap `×` on the image preview to clear the photo and revert to emoji.
6. **Customer Discovery & Publication-Eligible Directory Filtering**:
   - Jump to `/` (Customer Home) or `/directory`:
     - Test the **Quick Tag Pills** (`All`, `Vegetarian`, `Vegan`, `Gluten-Free`, `Halal`, `Chef's Special`, `Popular`): one tap filters venues immediately to those with published matching dishes.
     - In `/directory`, open the **Category** dropdown: notice the clean optgroup separation between **Business Categories** (Cafés, Bakeries, Restaurants, Hotels) and **Menu Sections** (Coffee, Breakfast, Bistro Plates).
     - Verify publication isolation: in scenario `hotel`, public search matches `Terrace Bistro` dishes, but protected `In-Room Dining` dishes are strictly excluded from organic public directory results.

---

### Slice R1-A Corrections Walkthrough (CORR-A through CORR-E)

1. **CORR-A: Multi-Venue Menu Eligibility & Isolation**:
   - Load scenario **Multi-brand business** (`multi-brand`).
   - Three venues exist under Horizon Hospitality Group: Green Garden Café, Sol Artisan Bakery, and Gelato Craft Lab.
   - Visit `/m/sol-artisan-bakery`: verify that ONLY the Artisan Bakery menu appears. It no longer leaks the Café or Gelato menus.
   - Visit `/m/green-garden-cafe`: verify that ONLY the All-Day Café menu appears.
   - In `/directory`, search "sourdough": only Sol Artisan Bakery matches; Green Garden Café is not falsely returned despite sharing the same parent organization.

2. **CORR-B: Coherent Offering-Level Matching & Result Explanations**:
   - In `/directory`, test combined search: search `vegan burger` or select tag `Vegan` + search `burger`:
     - A venue having a beef burger and an unrelated garden salad does NOT match. Only a venue with a single coherent offering that is both a burger and vegan will match.
   - Notice the **Result Explanation Snippet** on each returned VenueCard:
     - Whenever a search query or tag filter is active, the card displays: `Matching item(s): "Wild Mushroom Risotto" (Vegetarian, Signature) · KES 1,650`, clearly explaining why the venue was surfaced.
   - Test protected menu isolation: search `Midnight Truffle Burger` or `Horizon Continental In-Bed`: 0 results appear, verifying protected in-room offerings never leak to public directory.

3. **CORR-C: Tag Semantics, Provenance & Disclaimers**:
   - In `/admin/menus/menu_ggc_allday`, open the item editor:
     - Suggested tags are structured into 3 distinct groups:
       1. **Dietary & Consequential Claims** (Vegetarian, Vegan, Gluten-Free, Halal, etc.) with italic disclaimer: *"Merchant-asserted · Not certified by PEWA"*.
       2. **Promotional Highlights** (Chef's Special, Popular, Signature, etc.).
       3. **Preparation & Style Attributes** (Single Origin, Wood-Fired, Organic, etc.).
   - Visit `/m/grand-horizon-hotel` and tap `Wild Mushroom Risotto`:
     - Item detail drawer shows highlighted dietary tags and the disclaimer: *"Dietary and attribute declarations are merchant-provided and have not been independently verified by PEWA."*

4. **CORR-D: Media Safeguards & Image Provenance**:
   - In the item editor, attach an image from the **Curated Prototype Library**:
     - On customer menu `/m/green-garden-cafe`, tap `Flat White`: detail drawer shows `Representative photo` badge.
   - Attach an image via **Upload**:
     - Image is scaled on client-side canvas (max 800px, JPEG 0.82) to keep local storage lightweight and avoid unbounded base64 state.
     - **Fail-closed image processing (Final Correction A)**: Canvas compression failure or memory error strictly rejects and displays an understandable error toast without returning uncompressed images or corrupting persistent store state. Previously selected images are preserved intact.
     - Detail drawer displays `Merchant photo` badge.
     - Test uploading a `.txt` file or file >5MB: graceful toast error notification appears without crashing.
     - Tap `×` on the image preview in the editor: cleanly clears photo and restores emoji icon.

5. **CORR-E: Traceability & Test Results**:
   - Automated test suite runs 97 tests across 6 suites (100% passing).
   - Dedicated regression tests in `src/test/taxonomy.test.ts` verify:
     - Multi-venue isolation and single-venue automatic eligibility.
     - Coherent offering-level matching and protected menu isolation.
     - **Accurate venue-name discovery explanations (Final Correction B)**: Searches matching business names return the business with a distinct `"Matched business: [Name]"` explanation without mislabeling unrelated offerings as search matches.
     - **Fail-closed image compression (Final Correction A)**: Canvas context unavailability and memory failure reject cleanly without writing uncompressed raw data to state.
     - Tag grouping, dietary unverified declarations, and image library provenance.

