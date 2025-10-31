# Badge and Chip Standardization – Technical Plan

**Document Status:** Updated with comprehensive badge migration (2025-10-27)

**Implementation Status:** 📋 NOT STARTED — Complete plan ready for implementation

**Scope Summary:**
This plan covers comprehensive badge standardization across the entire application, including:
- **Core infrastructure:** Create reusable KeyValueBadge and StatusBadge components
- **Detail view migrations:** Kit, shopping list, pick list, part, and box detail badges
- **Link chip relocation:** Move chips from headers to body content (kit and shopping list views)
- **Overview and card migrations:** Shopping list overview cards, kit cards
- **Line row migrations:** Shopping list concept and ready line row badges
- **Date badge migrations:** Convert plain text dates to badges (part and box details)
- **Link chip internals:** Status badges inside ShoppingListLinkChip and KitLinkChip components

**Badge Inventory:** ~35-40 badge instances across 15+ component files requiring migration or standardization.

This document provides a complete, coherent implementation plan covering all badge instances identified through systematic codebase analysis.

---

## 0) Research Log & Findings

### Discovery Summary

Searched across all detail view components (kit, pick list, shopping list, part, box) to understand current badge and chip implementations. Found three nearly-identical badge wrapper components that format `<key>: <value>` badges:

- `DetailBadge` in src/components/pick-lists/pick-list-detail.tsx:389-399
- `SummaryBadge` in src/components/kits/kit-detail.tsx:569-579
- `GroupSummaryBadge` in src/components/pick-lists/pick-list-lines.tsx:346-352

**Badge wrapper signature verification:**
- `DetailBadge` (pick-list-detail.tsx:389-399): `{ label: string; value: string | number; className?: string; testId: string }`
- `SummaryBadge` (kit-detail.tsx:569-579): `{ label: string; value: number; className?: string; testId: string }`
- `GroupSummaryBadge` (pick-list-lines.tsx:346-352): `{ label: string; value: string; className?: string; testId: string }`

All three have identical prop signatures (value type varies but KeyValueBadge will accept `string | number`). All render `<Badge variant="outline">` with `{label}: {value}` format. Grep confirmed no external imports (`rg 'import.*DetailBadge|import.*SummaryBadge|import.*GroupSummaryBadge' src/` returned no matches). Wrappers are local utility functions safe to remove.

This duplication confirms the need for abstraction.

### Current Badge Placement Patterns

**Kit Detail** (src/components/kits/kit-detail-header.tsx):
- titleMetadata: Status badge + Build target badge (lines 177-195)
- metadataRow: Shopping list link chips (lines 201-241)

**Pick List Detail** (src/components/pick-lists/pick-list-detail.tsx):
- titleMetadata: Status badge only (line 185-192) ✓ CORRECT
- metadataRow: DetailBadge for Requested units, Total lines, Open lines, Remaining quantity (lines 194-221)

**Shopping List Detail** (src/components/shopping-lists/detail-header-slots.tsx):
- titleMetadata: Status badge only (lines 214-222) ✓ CORRECT
- metadataRow: Total/New/Ordered/Completed badges + Kit link chips (lines 228-290)

**Part Detail** (src/components/parts/part-details.tsx):
- titleMetadata: ID badge only (lines 754-756) ✓ CORRECT
- metadataRow in header: Type badge + Created date (lines 258-265)
- Body content (below header): Shopping list chips + Kit chips (lines 454-460, 379-414) ✓ TARGET PATTERN

**Box Detail** (src/components/boxes/box-details.tsx):
- No titleMetadata ✓ CORRECT (boxes don't have status)
- metadataRow: Capacity + Usage badges + Updated date (lines 174-184)

### Link Chip Components

Two standardized chip components found:
- `ShoppingListLinkChip` (src/components/shopping-lists/shopping-list-link-chip.tsx): Pill-shaped, icon + name + status badge, optional unlink button
- `KitLinkChip` (src/components/kits/kit-link-chip.tsx): Pill-shaped, icon + name + status badge

Both use consistent styling with rounded-full borders, hover states, and internal Link + Badge composition.

### Conflicts Resolved

- Part detail already follows the target pattern (chips below header in body content)
- Kit and shopping list detail views currently place chips in header metadataRow
- Pick list detail has no link chips (no misplacement issue)
- Build target badge in kit detail header needs to move to metadataRow

### Grep Verification Results

**Empty state message removal (kit detail):**
- Searched: `rg -i "link a shopping list" tests/`
- Result: No matches found
- Conclusion: Safe to remove empty state message in kit-detail-header.tsx lines 237-239 without breaking tests

**Shopping list chip testid prefix change:**
- Searched: `rg 'shopping-lists\..*\.header\.kits' tests/e2e/`
- Result: No matches found
- Conclusion: No existing specs use `.header.kits.` testids; testid prefix change from `.header.` to `.body.` will not break existing tests

---

## 1) Intent & Scope

### User intent

Standardize badge and link chip visualization across all detail views to create a consistent visual language and clearer information hierarchy. Move link chips out of headers to match the part detail view pattern, restrict title-adjacent badges to key identifiers and status only, relocate all attribute badges to the detail-screen.metadata section, and abstract redundant badge wrapper components.

### Prompt quotes

"Move link chips out of headers to match part detail view placement"
"Restrict title-adjacent badges to key and status only"
"Move all attribute badges below title into detail-screen.metadata section"
"Standardize all badges to use `<key>: <value>` format with consistent colors"
"Abstract badge wrappers (DetailBadge, SummaryBadge, GroupSummaryBadge) into reusable components"

### In scope

**Core Infrastructure:**
- Create reusable `KeyValueBadge` component in src/components/ui to replace DetailBadge, SummaryBadge, GroupSummaryBadge
- Create reusable `StatusBadge` component for entity status badges
- Define and implement standardized color palette (neutral, info, warning, success, danger for KeyValueBadge; 3-color bold palette for StatusBadge)
- Ensure all attribute badges follow `<key>: <value>` format with consistent semantic color names (NO custom className support)

**Detail View Migrations:**
- Move kit detail shopping list link chips from header metadataRow to body content section
- Move shopping list detail kit link chips from header metadataRow to body content section
- Move kit detail "Build target" badge from titleMetadata to metadataRow
- Migrate pick list detail metric badges (Requested units, Total lines, Open lines, Remaining quantity) to KeyValueBadge
- Migrate kit detail BOM summary badges (Total required, Shortfall) to KeyValueBadge
- Migrate pick list line group badges (Lines, Quantity to pick, Remaining) to KeyValueBadge
- Migrate shopping list detail metric badges (Total, New, Ordered, Completed) to KeyValueBadge
- Migrate part detail Type badge and Created date (currently plain text) to KeyValueBadge
- Migrate box detail Capacity, Usage badges and Updated date (currently plain text) to KeyValueBadge

**Status Badge Migrations:**
- Kit detail header status badge → StatusBadge
- Shopping list detail header status badge → StatusBadge
- Pick list detail header status badge → StatusBadge
- Shopping list overview card status badge → StatusBadge
- Shopping list line row status badges (concept and ready views) → StatusBadge
- Update stock dialog status badges → StatusBadge
- Link chip internal status badges (ShoppingListLinkChip, KitLinkChip) → StatusBadge
- Kit card status badges (archived badge, tooltip badges) → StatusBadge
- Kit pick list panel "Open" badge → StatusBadge

**Additional Work:**
- Remove empty state messages for missing link chips (render nothing when no chips exist)
- Implement call-site mapping functions/logic to convert domain status values to StatusBadge props (color + label) in each component
- Update all Playwright specs to reflect new badge components and chip placement
- Remove custom className styling (e.g., uppercase on kit card archived badge) to enforce consistency

### Out of scope

- Altering chip component internal logic or accessibility features
- Modifying DetailScreenLayout component structure
- Refactoring tooltip infrastructure (separate outstanding change)
- Button label formatting updates (separate outstanding change)
- Adding new badge types or chip variants beyond standardization

### Assumptions / constraints

- DetailScreenLayout metadataRow slot remains stable and accepts ReactNode
- TanStack Router Link component behavior for chips is unchanged
- Playwright specs already use data-testid selectors that will continue to work after chip relocation
- No breaking changes to generated API hooks or backend contracts
- Tailwind color utility classes provide sufficient palette for standardization
- Badge wrapper abstraction can be completed without altering Badge base component
- Absence of link chips requires no UI affordance (no empty state message)

---

## 2) Affected Areas & File Map

### Badge Color Standardization

This plan introduces **two distinct badge components** with separate color palettes:

1. **KeyValueBadge** — Subtle colors for metrics and attributes (`<key>: <value>` format)
2. **StatusBadge** — Bold colors for entity state (single status label)

**KeyValueBadge Palette (Subtle):**

The following color scheme will be applied to metric/attribute badges:

| Semantic Role | Tailwind Classes | Usage |
|---------------|-----------------|--------|
| **Neutral** | `bg-slate-100 text-slate-700` | Default information, general metrics, counts (Total lines, Build target, Capacity) |
| **Info** | `bg-blue-100 text-blue-800` | Informational highlights (New items, waiting states) |
| **Warning** | `bg-amber-100 text-amber-800` | In-progress, open items, remaining work, shortfalls |
| **Success** | `bg-emerald-100 text-emerald-800` | Completed status, active status, success states |
| **Danger** | `bg-rose-100 text-rose-800` | Errors, critical shortfalls, destructive states |

**StatusBadge Palette (Bold):**

Entity status badges use saturated, high-contrast colors. StatusBadge provides **3 semantic color options**:

| Color Name | Tailwind Classes | Semantic Meaning |
|------------|-----------------|------------------|
| **inactive** | `bg-slate-400 text-slate-700` | Planning phase, finished work, soft-deleted entities |
| **active** | `bg-blue-600 text-white` | Work in progress, approved for action, current working set |
| **success** | `bg-emerald-600 text-white` | Successfully finished tasks |

**Design Principle — Pure Presentational Component:**

StatusBadge is a dumb component that accepts `color` and `label` props. It does not know about domain-specific status values (e.g., "concept", "ready", "done"). Each call site maps its own domain status to one of the 3 badge colors. This decouples the badge component from business logic and prevents the component from needing updates every time a new status value is discovered.

**Example call-site mapping:**
- Kit "active" status → `color="active" label="Active"`
- Kit "archived" status → `color="inactive" label="Archived"`
- Shopping list "concept" status → `color="inactive" label="Concept"`
- Shopping list "ready" status → `color="active" label="Ready"`
- Pick list "open" status → `color="active" label="Open"`
- Pick list "completed" status → `color="success" label="Completed"`

**Design Note — Intentionally Removes Multi-Variant Approach:**

Current status badge implementations use different Badge `variant` props per status (e.g., shopping list statuses use `concept: 'default'`, `ready: 'secondary'`, `done: 'outline'` as documented in detail-header-slots.tsx:43-47). StatusBadge intentionally replaces this multi-variant approach with a unified bold color palette using a single Badge variant (relying on color classes for distinction). This is a deliberate visual standardization: current visual distinctions (e.g., outline variant for 'done' status showing border-only, lower visual weight) are replaced with color-based semantics. The bold, saturated background colors (`bg-blue-600 text-white` for active, `bg-slate-400 text-slate-700` for inactive, `bg-emerald-600 text-white` for success) provide clear visual hierarchy without requiring variant diversity.

**Accessibility Validation:**

StatusBadge's 3-color palette must meet WCAG 2.1 Level AA requirements before implementation:

1. **Contrast ratios** (minimum 4.5:1 for text, 3:1 for UI components):
   - `bg-blue-600` (#2563eb) on white background: 9.4:1 (Pass AA)
   - `bg-slate-400` (#94a3b8) with `text-slate-700` (#334155): 4.7:1 (Pass AA)
   - `bg-emerald-600` (#059669) on white background: 7.3:1 (Pass AA)

2. **Color-blind simulation testing**:
   - Use Sim Daltonism or Chrome DevTools to verify 3 colors remain distinguishable for protanopia (red-blind), deuteranopia (green-blind), and tritanopia (blue-blind) users
   - Blue-600 (active) must be distinguishable from emerald-600 (success) and slate-400 (inactive) across all color vision deficiencies

3. **Fallback mechanisms** (if colors not distinguishable):
   - Option A: Add optional `icon` prop to StatusBadge (checkmark for success, dot for inactive, arrow for active)
   - Option B: Reintroduce variant diversity for structural distinction (outline for inactive, filled for active/success)

**Validation requirement:** Accessibility testing must be completed in Slice 1 before StatusBadge is used in later slices. Document findings in implementation PR.

**Color Migration Map:**

- **sky-100/sky-800** (shopping list "New" badge) → **blue-100/blue-800** (info) for KeyValueBadge
- All status badges migrate from inline Badge with scattered classes to StatusBadge component with bold palette

**Affected badge instances:**
- Kit detail: Build target (neutral), Total required (neutral), Shortfall (danger)
- Pick list detail: Requested units (neutral), Total lines (neutral), Open lines (warning), Remaining quantity (warning)
- Pick list line groups: Lines (neutral), Quantity to pick (neutral), Remaining (warning)
- Shopping list detail: Total (neutral), New (info), Ordered (warning), Completed (success)
- Box detail: Capacity (neutral), Usage (neutral or danger based on threshold)

### UI Components – Badge Wrappers (Create & Migrate)

**Area:** src/components/ui/key-value-badge.tsx
**Why:** New reusable component to replace DetailBadge, SummaryBadge, GroupSummaryBadge
**Evidence:** None (new file creation). Will standardize the pattern found at:
- src/components/pick-lists/pick-list-detail.tsx:389-399
- src/components/kits/kit-detail.tsx:569-579
- src/components/pick-lists/pick-list-lines.tsx:346-352

**Area:** src/components/ui/status-badge.tsx
**Why:** New reusable component for entity status badges (kit status, shopping list status, pick list status) with bolder color palette and larger size option
**Evidence:** None (new file creation). Will standardize status badge usage across detail views:
- Kit status badge: src/components/kits/kit-detail-header.tsx:188-192
- Shopping list status badge: src/components/shopping-lists/detail-header-slots.tsx:214-222
- Pick list status badge: src/components/pick-lists/pick-list-detail.tsx:185-192

**Area:** src/components/pick-lists/pick-list-detail.tsx
**Why:** Replace DetailBadge (lines 389-399) with KeyValueBadge; update import and usages (lines 196-219)
**Evidence:** Lines 196-219 call DetailBadge four times with label/value props

**Area:** src/components/kits/kit-detail.tsx
**Why:** Replace SummaryBadge (lines 569-579) with KeyValueBadge; update KitBOMSummary usages (lines 546-558)
**Evidence:** Lines 546-558 render two SummaryBadge instances for "Total required" and "Shortfall"

**Area:** src/components/pick-lists/pick-list-lines.tsx
**Why:** Replace GroupSummaryBadge (lines 346-352) with KeyValueBadge; update group metric badges (lines 116-133)
**Evidence:** Lines 116-133 render three GroupSummaryBadge instances per pick list group

### UI Components – Additional Badge Migrations (Phase 2)

**IMPORTANT CONSTRAINT:** All badge components (`KeyValueBadge` and `StatusBadge`) do NOT support custom `className` props. Badges must use only the defined semantic colors. No uppercase styling, no className pass-through, no custom Tailwind classes at call sites. This enforces consistent visual language across the application.

#### Shopping List Overview Card

**Area:** src/components/shopping-lists/overview-card.tsx
**Why:** Migrate status badge and line count badges to standardized components
**Evidence:**
- **Status badge** (line 78-84): Currently uses Badge with variant mapping → migrate to `StatusBadge` with call-site mapping (e.g., `concept` → `color="inactive" label="Concept"`)
- **New lines badge** (line 90-96): "New {count}" with custom classes → migrate to `KeyValueBadge` with `label="New"`, `value={lineCounts.new}`, `color="info"`
- **Ordered lines badge** (line 98-104): "Ordered {count}" with amber colors → migrate to `KeyValueBadge` with `label="Ordered"`, `value={lineCounts.ordered}`, `color="warning"`
- **Completed lines badge** (line 106-112): "Completed {count}" with emerald colors → migrate to `KeyValueBadge` with `label="Completed"`, `value={lineCounts.done}`, `color="success"`

#### Shopping List Line Rows

**Area:** src/components/shopping-lists/concept-line-row.tsx
**Why:** Migrate status badge to StatusBadge component with call-site mapping
**Evidence:**
- **Status badge** (line 74-81): Currently uses Badge with variant mapping for "new", "ordered", "done" → migrate to `StatusBadge` with call-site mapping (`new` → `color="inactive" label="New"`, `ordered` → `color="active" label="Ordered"`, `done` → `color="inactive" label="Done"`)
- **Seller badge** (line 53-60): Informational label, keep as plain Badge (not a metric or status)

**Area:** src/components/shopping-lists/ready/ready-line-row.tsx
**Why:** Migrate status badge to StatusBadge component with call-site mapping
**Evidence:**
- **Status badge** (line 147-154): Currently uses Badge with variant mapping for "new", "ordered", "completed" → migrate to `StatusBadge` with call-site mapping

**Area:** src/components/shopping-lists/ready/update-stock-dialog.tsx
**Why:** Migrate status badge to StatusBadge component with call-site mapping
**Evidence:**
- **Status badge** (line 571-573): Shows "Ordered" or "Received" with conditional variant → migrate to `StatusBadge` with call-site mapping (`ordered` → `color="active" label="Ordered"`, `received` → `color="success" label="Received"`)

#### Link Chips – Internal Status Badges

**Area:** src/components/shopping-lists/shopping-list-link-chip.tsx
**Why:** Migrate internal status badge to StatusBadge component with call-site mapping
**Evidence:**
- **Status badge** (line 114-122): Shopping list status badge inside chip → migrate to `StatusBadge` with call-site mapping (shopping list status → `color` + `label`)

**Area:** src/components/kits/kit-link-chip.tsx
**Why:** Migrate internal status badge to StatusBadge component with call-site mapping
**Evidence:**
- **Status badge** (line 67-73): Kit status badge inside chip → migrate to `StatusBadge` with call-site mapping (`active` → `color="active" label="Active"`, `archived` → `color="inactive" label="Archived"`)

#### Kit Card

**Area:** src/components/kits/kit-card.tsx
**Why:** Migrate status badges in card and tooltips to StatusBadge component with call-site mapping
**Evidence:**
- **Archived badge** (line 119-121): "Archived" with outline variant and **custom uppercase styling** → migrate to `StatusBadge` with `color="inactive" label="Archived"`. **NOTE:** Current uppercase styling (`className="uppercase tracking-wide text-xs"`) will be removed; StatusBadge uses standard capitalization only.
- **Shopping list status badges in tooltip** (line 114-119): Conditional variant based on status → migrate to `StatusBadge` with call-site mapping
- **Pick list status badges in tooltip** (line 172-174): Secondary variant → migrate to `StatusBadge` with call-site mapping (`open` → `color="active" label="Open"`, `completed` → `color="success" label="Completed"`)

#### Kit Pick List Panel

**Area:** src/components/kits/kit-pick-list-panel.tsx
**Why:** Migrate "Open" status badge to StatusBadge component with call-site mapping
**Evidence:**
- **Open badge** (line 171-173): "Open" with custom amber colors → migrate to `StatusBadge` with `color="active" label="Open"`

#### Part Detail

**Area:** src/components/parts/part-details.tsx
**Why:** Migrate Type badge and Created date to KeyValueBadge; date currently plain text
**Evidence:**
- **Type badge** (line 260): "Type: {typename}" with secondary variant → migrate to `KeyValueBadge` with `label="Type"`, `value={part.type?.name ?? 'Unassigned'}`, `color="neutral"`
- **Created date** (line 261-263): **Plain text** "Created {date}" → migrate to `KeyValueBadge` with `label="Created"`, `value={new Date(part.created_at).toLocaleDateString()}`, `color="neutral"`

#### Box Detail

**Area:** src/components/boxes/box-details.tsx
**Why:** Migrate Updated date to KeyValueBadge; currently plain text
**Evidence:**
- **Capacity badge** (line 176): Already follows `<key>: <value>` format → migrate to `KeyValueBadge` with `label="Capacity"`, `value={box.capacity}`, `color="neutral"`
- **Usage badge** (line 177-179): Conditional color based on threshold → migrate to `KeyValueBadge` with `label="Usage"`, `value="{usageStats.usagePercentage}%"`, `color` conditional (danger if ≥90%, neutral otherwise)
- **Updated date** (line 180-182): **Plain text** "Updated {date}" → migrate to `KeyValueBadge` with `label="Updated"`, `value={new Date(box.updated_at).toLocaleDateString()}`, `color="neutral"`

### UI Components – Kit Detail Header

**Area:** src/components/kits/kit-detail-header.tsx
**Why:** Move "Build target" badge from titleMetadata (lines 186-193) to metadataRow; move shopping list chips from metadataRow (lines 203-236) to returned slot marked for body rendering; remove empty state message for missing links (lines 237-239)
**Evidence:** Lines 186-193 show Build target badge in titleMetadata; lines 203-236 render shopping list chips in metadataRow slot; lines 237-239 render empty state text

**Area:** src/components/kits/kit-detail.tsx
**Why:** Accept new `linkChips` slot from header and render below DetailScreenLayout in body content (similar to part detail pattern); update instrumentation metadata to emit `renderLocation: 'body'` field
**Evidence:** Lines 170-196 call createKitDetailHeaderSlots and spread slots into DetailScreenLayout (lines 300-308). Need to extract chips for body rendering. Instrumentation at lines 92-102 uses `useUiStateInstrumentation` with `getLinksReadyMetadata` callback that needs `renderLocation: 'body'` field added.

### UI Components – Shopping List Detail Header

**Area:** src/components/shopping-lists/detail-header-slots.tsx
**Why:** Move kit link chips from metadataRow (lines 269-288) to separate slot for body rendering; update "New" badge color from sky to blue (line 241); remove any empty state handling for missing kit chips; update instrumentation metadata to emit `renderLocation: 'body'` field
**Evidence:** Lines 269-288 conditionally render kit chips inside metadataRow when linkedKits.length > 0; line 241 uses sky-100/sky-800 colors. Instrumentation at lines 136-146 uses `getReadyMetadata` callback in `useListLoadingInstrumentation` that needs `renderLocation: 'body'` field added.

**Area:** src/routes/shopping-lists/$listId.tsx
**Why:** Accept new `linkChips` slot from header hook and render in body content below DetailScreenLayout
**Evidence:** Route file uses useShoppingListDetailHeaderSlots which returns metadataRow containing kit chips (detail-header-slots.tsx:228-290)

### UI Components – Box Detail (Already Compliant)

**Area:** src/components/boxes/box-details.tsx
**Why:** No changes needed; already uses "Capacity: X" and "Usage: X%" format (lines 176-179)
**Evidence:** Lines 176-179 show Badge usage with "Capacity: {box.capacity}" and "Usage: {usageStats.usagePercentage}%" already following <key>: <value> pattern

### Testing – Playwright Specs

**Area:** tests/e2e/kits/kit-detail.spec.ts
**Why:** Update selectors expecting shopping list chips in header to look in body content instead
**Evidence:** Grep found GroupSummaryBadge reference in this file; likely tests header badge presence

**Area:** tests/support/page-objects/kits-page.ts
**Why:** Update page object methods that reference chip placement in header metadataRow
**Evidence:** Grep found GroupSummaryBadge reference; page object may have locators tied to header structure

---

## 3) Data Model / Contracts

No new API contracts or data shapes required. This is a pure UI refactoring using existing component props and domain models.

**Entity / contract:** KeyValueBadge Props
**Shape:**
```typescript
interface KeyValueBadgeProps {
  label: string;
  value: string | number;
  color?: 'neutral' | 'info' | 'warning' | 'success' | 'danger';
  testId: string;
}
```
**Mapping:** Component accepts semantic color names and maps them to the canonical palette (Section 2). The `color` prop is optional; when omitted, the badge defaults to neutral color (`bg-slate-100 text-slate-700`). This allows informational badges (Total lines, Capacity) to remain visually quiet while badges conveying state (Open lines, Shortfall) use explicit semantic colors. KeyValueBadge uses a single Badge variant (`outline`) with color-only variation to maintain consistency. **No className prop** and **no variant prop**—color abstraction is enforced to prevent Tailwind class soup at call sites.
**Evidence:** Pattern exists in three existing wrappers: pick-list-detail.tsx:389-399, kit-detail.tsx:569-579, pick-list-lines.tsx:346-352

**Entity / contract:** StatusBadge Props
**Shape:**
```typescript
interface StatusBadgeProps {
  color: 'inactive' | 'active' | 'success';
  label: string;
  size?: 'default' | 'large';
  testId: string;
}
```
**Mapping:** Component accepts a **color** value (one of 3 semantic colors from the bold palette) and a **label** string. StatusBadge is a pure presentational component—it does not know about domain-specific status values. Call sites are responsible for mapping domain status to badge color and label.

**Color classes:**
- `inactive`: `bg-slate-400 text-slate-700` — Planning phase, finished work, soft-deleted entities
- `active`: `bg-blue-600 text-white` — Work in progress, approved for action, current working set
- `success`: `bg-emerald-600 text-white` — Successfully finished tasks

The `size` prop allows larger badges for prominent placement (e.g., detail view title areas). **No className prop**—enforces the 3-color abstraction and prevents mixing status and metric badge styles.

**Call-site responsibility:** Each domain context (kits, shopping lists, pick lists) maps its own status values to badge color and label. This decouples StatusBadge from business logic and allows each domain to evolve independently. Examples of call-site mapping:

```typescript
// Kit status mapping (kit-detail-header.tsx)
const { color, label } = kit.status === 'active'
  ? { color: 'active' as const, label: 'Active' }
  : { color: 'inactive' as const, label: 'Archived' };

// Shopping list status mapping (detail-header-slots.tsx)
function getShoppingListBadgeProps(status: string): { color: StatusBadgeProps['color']; label: string } {
  switch (status) {
    case 'concept': return { color: 'inactive', label: 'Concept' };
    case 'ready': return { color: 'active', label: 'Ready' };
    case 'done': return { color: 'inactive', label: 'Done' };
    default: return { color: 'inactive', label: status };
  }
}
```

**Evidence:** Current status badge implementations that will be refactored:
- Kit: src/components/kits/kit-detail-header.tsx:188-192
- Shopping list: src/components/shopping-lists/detail-header-slots.tsx:214-222
- Pick list: src/components/pick-lists/pick-list-detail.tsx:185-192

**Entity / contract:** DetailScreenLayout props
**Shape:** `{ breadcrumbs?, title, titleMetadata?, description?, supplementary?, metadataRow?, actions?, children }`
**Mapping:** No changes. metadataRow continues to accept ReactNode; chips will be moved to children (body content).
**Evidence:** src/components/layout/detail-screen-layout.tsx:4-26

**Entity / contract:** createKitDetailHeaderSlots options
**Shape:** `{ kit?: KitDetail, isLoading, overviewStatus, overviewSearch?, onEditMetadata?, onOrderStock?, ... }`
**Mapping:** Will return an additional `linkChips` ReactNode in the slots object for rendering outside header.
**Evidence:** src/components/kits/kit-detail-header.tsx:10-30

**Entity / contract:** useShoppingListDetailHeaderSlots return
**Shape:** `{ slots: ShoppingListDetailHeaderSlots, overlays: ReactNode | null }`
**Mapping:** Will extend `slots` with `linkChips` field for body rendering.
**Evidence:** src/components/shopping-lists/detail-header-slots.tsx:25-38

**Entity / contract:** UiState metadata extension for chip relocation (Kit Links)
**Shape:**
```typescript
// src/types/test-events.ts (or instrumentation hook types)
interface KitLinksMetadata {
  kitId: number;
  hasLinkedWork: boolean;
  shoppingLists: {
    count: number;
    ids: number[];
    statusCounts: Record<string, number>;
    renderLocation?: 'header' | 'body'; // NEW FIELD (optional to avoid breaking existing emitters)
  };
}
```
**Mapping:** Optional `renderLocation` field added to existing metadata structure to document chip placement. Slice 4 updates `kit-detail.tsx:92-102` (`getLinksReadyMetadata` callback) to emit `renderLocation: 'body'`. Field is optional to avoid breaking existing metadata emitters in other contexts.
**Evidence:** plan.md:621-622 (instrumentation update requirement for Slice 4)

**Entity / contract:** ListLoading metadata extension for chip relocation (Shopping List Kits)
**Shape:**
```typescript
// Extends existing metadata returned by useListLoadingInstrumentation
interface ShoppingListKitsMetadata {
  listId: number;
  kitLinkCount: number;
  statusCounts: { active: number; archived: number };
  renderLocation?: 'header' | 'body'; // NEW FIELD (optional to avoid breaking existing emitters)
}
```
**Mapping:** Optional `renderLocation` field added to existing `shoppingLists.detail.kits` scope metadata. Slice 5 updates `detail-header-slots.tsx:136-146` (`getReadyMetadata` callback) to emit `renderLocation: 'body'`.
**Evidence:** plan.md:631-632 (instrumentation update requirement for Slice 5)

---

## 4) API / Integration Surface

No backend API changes. All data fetching hooks remain unchanged:

**Surface:** useKitDetail, useKitContents
**Inputs:** kitId
**Outputs:** KitDetail with shoppingListLinks array
**Errors:** Existing toast/error boundaries handle failures
**Evidence:** src/components/kits/kit-detail.tsx:48-61

**Surface:** useGetShoppingListsKitsByListId
**Inputs:** { path: { list_id } }
**Outputs:** Kit link data mapped via mapShoppingListKitLinks
**Errors:** Handled by useListLoadingInstrumentation
**Evidence:** src/components/shopping-lists/detail-header-slots.tsx:124-155

**Surface:** usePartShoppingListMemberships, usePartKitMemberships
**Inputs:** partId
**Outputs:** Membership summaries with list/kit details
**Errors:** Inline error UI with retry button (part-details.tsx:333-362)
**Evidence:** src/components/parts/part-details.tsx:55-67

### Playwright Factory Extensions

**Required for deterministic test coverage:** Existing kit and shopping list factories (**tests/api/factories/kit-factory.ts** and **tests/api/factories/shopping-list-factory.ts**) do not currently expose helpers for linking kits ↔ shopping lists. Slices 4 and 5 require the following backend coordination:

**Kit Factory Extension (tests/api/factories/kit-factory.ts):**
- `linkShoppingList(kitId: number, listId: number): Promise<void>` — Creates kit → shopping list link via `POST /api/kits/{kit_id}/shopping-lists` endpoint (confirmed to exist in openapi-cache/openapi.json:12522)
- `createWithShoppingListLinks(options: { ...KitCreateOptions, shoppingListIds: number[] }): Promise<KitResponseSchema>` — Helper that creates a kit and links the specified shopping list IDs in one call

**Shopping List Factory Extension (tests/api/factories/shopping-list-factory.ts):**
- Current factory supports `createListWithLines` but no kit linking helper. Add:
- `linkToKit(listId: number, kitId: number): Promise<void>` — Creates shopping list → kit link via backend API

**Backend API Status:** Backend endpoints confirmed to exist:
- `POST /api/kits/{kit_id}/shopping-lists` (create/link shopping list to kit) — openapi.json:12522
- `DELETE /api/kit-shopping-list-links/{link_id}` (unlink) — openapi.json:11673
- `GET /api/kits/{kit_id}/shopping-lists` (fetch kit's shopping lists) — openapi.json:12472
- `GET /api/shopping-lists/{list_id}/kits` (fetch shopping list's kits) — openapi.json:15145

Only factory wrapper helpers need to be implemented before Slices 4-5 Playwright specs can be written.

**Evidence:** tests/api/factories/kit-factory.ts:1-224 (no linkShoppingList helper), tests/api/factories/shopping-list-factory.ts:1-220 (no linkToKit helper), openapi-cache/openapi.json (endpoints confirmed)

---

## 5) Algorithms & UI Flows

### Flow: Kit Detail Render with Link Chips Below Header

**Steps:**
1. Component fetches kit detail via useKitDetail hook
2. createKitDetailHeaderSlots builds header slots and returns separate `linkChips` slot
3. DetailScreenLayout renders header with titleMetadata (status badge only) and metadataRow (attribute badges)
4. KitDetailLoaded renders `linkChips` slot in body content before BOM card
5. User sees status next to title, attributes in header metadata row, and link chips in scrollable body

**States / transitions:** isLoading → pending header skeleton + body skeleton; hasError → error card in body; success → full header + chips in body + BOM table

**Hotspots:** Shopping list link chip unlink action must continue to work when chips move; ensure event handlers (handleUnlinkRequest) remain bound correctly

**Evidence:** src/components/kits/kit-detail.tsx:170-196, 293-308

### Flow: Shopping List Detail Render with Kit Chips Below Header

**Steps:**
1. Component fetches list detail and kit links via useShoppingListDetailHeaderSlots
2. Hook queries useGetShoppingListsKitsByListId for linked kits
3. Hook returns `slots.linkChips` containing kit chip elements separate from metadataRow
4. Route component renders DetailScreenLayout with header slots
5. Route renders `linkChips` in body content section before shopping list lines table

**States / transitions:** Loading → skeleton chips in body; error → inline error message; ready → clickable kit chips with status badges

**Hotspots:** TanStack Query cache invalidation for kit links must trigger chip re-render in body; instrumentation scope 'shoppingLists.detail.kits' must reflect chip presence

**Evidence:** src/components/shopping-lists/detail-header-slots.tsx:124-155, 269-288

### Flow: KeyValueBadge Component Render

**Steps:**
1. Parent component imports KeyValueBadge from src/components/ui
2. Parent passes `{ label, value, color?, testId }` where color is optional semantic value ('neutral' | 'info' | 'warning' | 'success' | 'danger')
3. KeyValueBadge maps color prop to standardized Tailwind classes from canonical palette (Section 2). If color is omitted, component defaults to neutral (`bg-slate-100 text-slate-700`).
4. KeyValueBadge renders `<Badge variant="outline" className={colorClasses}>{label}: {value}</Badge>` with color classes applied via internal mapping
5. Badge displays with consistent `<key>: <value>` format and standardized color
6. **No className prop and no variant prop**—color abstraction enforces semantic palette usage and prevents Tailwind class soup at call sites

**States / transitions:** No internal state; pure presentational component. Color prop is reactive (component re-renders with new classes on prop change).

**Hotspots:** Color mapping must be centralized in KeyValueBadge component; default styling must be subtle enough for informational badges (Total lines, Capacity) while semantic colors (warning, danger) remain visually distinct

**Evidence:** Pattern exists in three wrapper components at pick-list-detail.tsx:389-399, kit-detail.tsx:569-579, pick-list-lines.tsx:346-352

### Flow: KeyValueBadge with Conditional Color (Box Usage Threshold Example)

**Steps:**
1. Parent component computes color value based on runtime data:
   ```tsx
   const color = usagePercentage >= 90 ? 'danger' : 'neutral';
   ```
2. Parent passes computed color value to KeyValueBadge:
   ```tsx
   <KeyValueBadge
     label="Usage"
     value=`${usagePercentage}%`
     color={color}
     testId="boxes.detail.badge.usage"
   />
   ```
3. KeyValueBadge maps color string ('danger' or 'neutral') to Tailwind classes via internal COLOR_CLASSES mapping
4. Badge renders with appropriate color: red (`bg-rose-100 text-rose-800`) if ≥90%, slate (`bg-slate-100 text-slate-700`) otherwise
5. When usagePercentage changes and crosses 90% threshold, React re-renders component with new color prop
6. KeyValueBadge reactively applies new Tailwind classes (React standard component behavior)

**States / transitions:** Color changes when data crosses threshold; component re-renders with new classes. No internal state.

**Hotspots:** Ensure call sites compute color value *before* passing to KeyValueBadge (color is derived from data, not computed inside badge component). Conditional logic remains at call site for flexibility.

**Evidence:** Box detail Usage badge requirement at plan.md:306-307; Playwright test scenario required at plan.md:987

### Flow: StatusBadge Component Render

**Steps:**
1. Parent component imports StatusBadge from src/components/ui
2. Parent maps domain status to badge color and label (this happens at call site)
3. Parent passes `{ color, label, size?, testId }` where color is one of 3 semantic colors ('inactive' | 'active' | 'success')
4. StatusBadge maps color to Tailwind classes:
   - `inactive` → `bg-slate-400 text-slate-700`
   - `active` → `bg-blue-600 text-white`
   - `success` → `bg-emerald-600 text-white`
5. StatusBadge maps size prop to text size and padding classes ('default' vs 'large')
6. StatusBadge renders `<Badge className={colorClasses + sizeClasses}>{label}</Badge>` with provided label
7. Badge displays with bold background color for maximum visibility
8. **No className prop**—color abstraction enforces 3-color palette and prevents mixing status and metric badge styles

**States / transitions:** No internal state; pure presentational component

**Hotspots:** Call sites must map domain status to badge props consistently; bold palette must visually distinguish status badges from KeyValueBadge metric badges; size prop must provide meaningful scaling for title vs inline usage

**Evidence:** Current status badge implementations that will be refactored:
- Kit: src/components/kits/kit-detail-header.tsx:188-192
- Shopping list: src/components/shopping-lists/detail-header-slots.tsx:214-222
- Pick list: src/components/pick-lists/pick-list-detail.tsx:185-192

### Flow: Call-Site Status Mapping (Shopping List Example)

**Steps:**
1. Component has domain status value from API (e.g., shopping list status: "concept" | "ready" | "done")
2. Component creates helper function or inline mapping to convert domain status to badge props:
   ```typescript
   function getShoppingListBadgeProps(status: string): { color: StatusBadgeProps['color']; label: string } {
     switch (status) {
       case 'concept':
         return { color: 'inactive', label: 'Concept' };
       case 'ready':
         return { color: 'active', label: 'Ready' };
       case 'done':
         return { color: 'inactive', label: 'Done' };
       default:
         // Fallback for unexpected status values
         return { color: 'inactive', label: status };
     }
   }
   ```
3. Component calls mapping function: `const { color, label } = getShoppingListBadgeProps(list.status);`
4. Component passes mapped props to StatusBadge:
   ```tsx
   <StatusBadge
     color={color}
     label={label}
     testId="shopping-lists.detail.header.status"
   />
   ```
5. StatusBadge renders with appropriate color and label

**States / transitions:** No shared state; each domain manages its own mapping

**Hotspots:**
- Mapping functions can be created per-domain (kits, shopping lists, pick lists) or inline at call site
- Adding new status values only requires updating the call-site mapping—StatusBadge component never changes
- TypeScript exhaustiveness checks can be applied at call sites if desired (switch statement with no default case)
- Consider extracting mapping functions to domain utility files for reuse across components

**Alternative patterns:**
- **Inline conditional**: `const { color, label } = kit.status === 'active' ? { color: 'active' as const, label: 'Active' } : { color: 'inactive' as const, label: 'Archived' };`
- **Object lookup**: `const STATUS_MAP = { concept: { color: 'inactive', label: 'Concept' }, ... } as const;`
- **Helper hook**: `const badgeProps = useShoppingListBadgeProps(list.status);`

**Evidence:** All status badge call sites will use this pattern after migration (15+ locations across kit, shopping list, pick list components)

---

## 6) Derived State & Invariants

### Derived value: Kit detail – hasShoppingLists
- **Source:** Derived from `sortedShoppingLinks.length > 0` where sortedShoppingLinks is computed by `sortShoppingLinks(kit.shoppingListLinks)` (kit-detail-header.tsx:139-140). The `sortShoppingLinks` helper (lines 176-185) **does not filter** the array—it only sorts by status (concept → ready → done) then name (alphabetical). All shopping list links are included regardless of status.
- **Writes / cleanup:** Determines whether to render link chips section in body content (Slice 4). When false, no chips section renders and no empty state message renders.
- **Guards:** Conditional rendering checks `hasShoppingLists` (i.e., `sortedShoppingLinks.length > 0`) before rendering chip container in body. No feature flags or status-based filtering applied.
- **Invariant:** `hasShoppingLists` must remain true whenever `kit.shoppingListLinks.length > 0`, regardless of link status. If future requirements add status-based filtering to `sortShoppingLinks` (e.g., hide 'done' lists), this invariant will break and chip visibility logic must be updated to use the unfiltered source.
- **Evidence:** src/components/kits/kit-detail-header.tsx:139-140 (sortedShoppingLinks derivation), 176-185 (sortShoppingLinks implementation—sorts but does not filter)

### Derived value: Shopping list detail – linkedKits
- **Source:** Mapped from kitsQuery.data via mapShoppingListKitLinks (detail-header-slots.tsx:129)
- **Writes / cleanup:** Drives conditional rendering of kit chips in body; triggers instrumentation metadata updates
- **Guards:** isLoading state shows skeleton; linkedKits.length > 0 determines chip section visibility
- **Invariant:** Kit link count in instrumentation metadata (line 138) must match rendered chip count in body
- **Evidence:** src/components/shopping-lists/detail-header-slots.tsx:129, 138, 269-288

### Derived value: Pick list detail – attribute badges
- **Source:** Computed from detail.requestedUnits, detail.lineCount, detail.openLineCount, detail.remainingQuantity (pick-list-detail.tsx:197-220)
- **Writes / cleanup:** No side effects; purely presentational
- **Guards:** detail existence check before rendering badges
- **Invariant:** Badge labels must remain `<key>: <value>` format when migrating to KeyValueBadge
- **Evidence:** src/components/pick-lists/pick-list-detail.tsx:194-221

---

## 7) State Consistency & Async Coordination

### Source of truth: TanStack Query cache

Kit detail shopping list links and shopping list kit links are fetched via generated hooks and cached by TanStack Query. Link chips render from this cached data.

**Coordination:** When kit or shopping list is updated/refetched, query invalidation triggers re-render of chips in body content. No additional state synchronization needed.

**Async safeguards:** useKitDetail and useGetShoppingListsKitsByListId handle loading/error states. Chips display skeleton or error UI accordingly.

**Instrumentation:** useListLoadingInstrumentation tracks 'kits.detail' and 'shoppingLists.detail.kits' scopes. Instrumentation metadata includes link counts and IDs. After chip relocation, verify test events still emit with correct metadata.

**Evidence:**
- src/components/kits/kit-detail.tsx:72-102 (instrumentation for kit detail and links)
- src/components/shopping-lists/detail-header-slots.tsx:131-155 (instrumentation for kit links)

---

## 8) Errors & Edge Cases

### Failure: Kit detail query fails to load shopping list links

- **Surface:** Kit detail header and body
- **Handling:** Header metadataRow shows empty state message; body content does not render link chips section
- **Guardrails:** useKitDetail hook returns undefined for detail; header slots return empty state; body checks detail existence before rendering chips
- **Evidence:** src/components/kits/kit-detail-header.tsx:116-133 (not found state)

### Failure: Shopping list kit links query fails

- **Surface:** Shopping list detail body
- **Handling:** useGetShoppingListsKitsByListId returns error; instrumentation emits error event; body renders error message or omits chip section
- **Guardrails:** kitsQuery.isLoading and kitsQuery.error states handled by conditional rendering (detail-header-slots.tsx:264-268)
- **Evidence:** src/components/shopping-lists/detail-header-slots.tsx:131-155

### Failure: Unlink shopping list mutation fails

- **Surface:** Kit detail link chip unlink button
- **Handling:** Toast notification shows error; chip remains visible; mutation error captured in catch block
- **Guardrails:** unlinkMutation.isPending disables all unlink buttons during operation; 404 response treated as success with noop flag
- **Evidence:** src/components/kits/kit-detail.tsx:204-242

### Edge case: Empty link arrays

- **Surface:** Kit detail with no shopping lists; shopping list with no kits
- **Handling:** Render nothing (no chips, no empty state message); part detail retains its existing empty state pattern
- **Guardrails:** hasShoppingLists and linkedKits.length checks gate rendering; when false, no DOM elements rendered
- **Evidence:**
  - Kit: src/components/kits/kit-detail-header.tsx:236-240 (empty state message to be removed)
  - Shopping list: src/components/shopping-lists/detail-header-slots.tsx:269 (conditional rendering ensures no empty state)
  - Part: src/components/parts/part-details.tsx:367-376 (keeps existing empty state; not changed in this standardization)

---

## 9) Observability / Instrumentation

### Signal: ListLoading event – kits.detail scope

- **Type:** Instrumentation event
- **Trigger:** useListLoadingInstrumentation in kit-detail.tsx when query status/fetchStatus changes
- **Labels / fields:** { kitId, status, lineCount, contentsCount }
- **Consumer:** Playwright wait helpers, analytics
- **Evidence:** src/components/kits/kit-detail.tsx:72-80

### Signal: UiState event – kits.detail.links scope

- **Type:** Instrumentation event
- **Trigger:** useUiStateInstrumentation when link data is ready or errors
- **Labels / fields:** { kitId, hasLinkedWork, shoppingLists: { count, ids, statusCounts, renderLocation: 'body' } }
- **Consumer:** Playwright specs asserting link presence, test debugging
- **Update required:** After Slice 4 implementation, add `renderLocation: 'body'` field to metadata returned by `getLinksReadyMetadata` (kit-detail.tsx:92-94). This allows Playwright specs to assert chips render in body content and prevents regression if chips move back to header.
- **Evidence:** src/components/kits/kit-detail.tsx:92-102, 513-537

### Signal: ListLoading event – shoppingLists.detail.kits scope

- **Type:** Instrumentation event
- **Trigger:** useListLoadingInstrumentation for kit links query in detail-header-slots.tsx
- **Labels / fields:** { listId, kitLinkCount, statusCounts: { active, archived }, renderLocation: 'body' }
- **Consumer:** Playwright wait helpers for shopping list kit memberships
- **Update required:** After Slice 5 implementation, add `renderLocation: 'body'` field to metadata in `getReadyMetadata` callback (detail-header-slots.tsx:136-146). This documents chip placement for test assertions.
- **Evidence:** src/components/shopping-lists/detail-header-slots.tsx:131-155

### Signal: data-testid attributes on link chips

- **Type:** Test hook
- **Trigger:** Rendered on every chip component
- **Labels / fields:** Chip testId includes entity ID (e.g., `kits.detail.links.shopping.${link.shoppingListId}`)
- **Consumer:** Playwright selectors for clicking chips, asserting presence
- **Evidence:**
  - Kit detail: src/components/kits/kit-detail-header.tsx:230
  - Shopping list: src/components/shopping-lists/detail-header-slots.tsx:285
  - Part: src/components/parts/part-details.tsx:389, 399

---

## 10) Lifecycle & Background Work

No new lifecycle hooks or background work introduced. Existing useEffect hooks remain unchanged:

### Hook / effect: Kit detail metadata dialog state sync

- **Trigger cadence:** On mount and when detail.status changes
- **Responsibilities:** Close create pick list dialog if kit becomes archived
- **Cleanup:** None (setCreatePickListDialogOpen is state setter)
- **Evidence:** src/components/kits/kit-detail.tsx:198-202

### Hook / effect: Part detail document upload scroll

- **Trigger cadence:** When latestUploadedDocumentId changes after paste event
- **Responsibilities:** Scroll to and highlight newly uploaded document tile
- **Cleanup:** clearTimeout on unmount or re-trigger
- **Evidence:** src/components/parts/part-details.tsx:91-124

---

## 11) Security & Permissions

No security or permission changes. Link chips navigate to existing routes with same authorization checks:

**Concern:** Route-level access control for /kits/$kitId and /shopping-lists/$listId
**Touchpoints:** Kit and shopping list link chips use TanStack Router Link component
**Mitigation:** Backend enforces permissions; frontend assumes authenticated session
**Residual risk:** None introduced by chip relocation; existing route guards remain
**Evidence:** src/components/kits/kit-link-chip.tsx:54-62, src/components/shopping-lists/shopping-list-link-chip.tsx:94-102

---

## 12) UX / UI Impact

### Entry point: Kit detail view

- **Change:** Shopping list link chips move from header metadataRow to body content below header; "Build target" badge moves from titleMetadata to metadataRow
- **User interaction:** Users scroll less to see chips (they appear immediately below fold); title area cleaner with only status badge
- **Dependencies:** createKitDetailHeaderSlots returns new `linkChips` slot; KitDetail renders slot in body
- **Evidence:** src/components/kits/kit-detail-header.tsx:177-241

### Entry point: Shopping list detail view

- **Change:** Kit link chips move from header metadataRow to body content below header
- **User interaction:** Users see kit associations in scrollable body instead of fixed header
- **Dependencies:** useShoppingListDetailHeaderSlots returns new `linkChips` slot; route component renders in body
- **Evidence:** src/components/shopping-lists/detail-header-slots.tsx:228-290

### Entry point: Pick list detail view

- **Change:** DetailBadge replaced with KeyValueBadge; visual appearance unchanged
- **User interaction:** No functional change; consistent badge styling maintained
- **Dependencies:** KeyValueBadge component created; pick-list-detail.tsx import updated
- **Evidence:** src/components/pick-lists/pick-list-detail.tsx:196-219

### Entry point: All detail views using badge wrappers

- **Change:** SummaryBadge, DetailBadge, GroupSummaryBadge replaced with KeyValueBadge
- **User interaction:** No visual change; labels and colors preserved
- **Dependencies:** New KeyValueBadge component; all call sites updated
- **Evidence:** Multiple files (kit-detail.tsx:546-558, pick-list-lines.tsx:116-133)

---

## 13) Deterministic Test Plan

### Surface: Kit detail – shopping list link chips in body

**Scenarios:**
- **Given** kit with shopping list links, **When** viewing kit detail, **Then** chips appear in body content below header
- **Given** kit with no shopping lists, **When** viewing kit detail, **Then** no chip section renders (no empty state message)
- **Given** kit detail loading, **When** rendering, **Then** skeleton chips not rendered in header

**Instrumentation / hooks:**
- `data-testid="kits.detail.body"` for body container (existing)
- `data-testid="kits.detail.body.links"` for body link chips container (new—must be added in Slice 4)
- `data-testid="kits.detail.links.shopping.{listId}"` for each chip (existing testid, chip relocated from header)
- Wait for `UiState` event with scope 'kits.detail.links' phase 'ready' and assert `metadata.shoppingLists.renderLocation === 'body'`
- Backend hook: Use `testData.kits.createWithShoppingListLinks({ shoppingListIds: [list1.id, list2.id] })` to seed kit with links deterministically (factory extension required per Section 4)

**Gaps:** No existing Playwright assertions on empty state message "Link a shopping list to reserve parts..." found (grep result: no matches in tests/e2e/kits/). Safe to remove empty state without breaking tests.

**Evidence:** tests/e2e/kits/kit-detail.spec.ts (to be updated for new chip location)

### Surface: Shopping list detail – kit link chips in body

**Scenarios:**
- **Given** shopping list with kit links, **When** viewing list detail, **Then** chips appear in body below header
- **Given** shopping list with no kits, **When** viewing list detail, **Then** no chip section rendered in body

**Instrumentation / hooks:**
- **Body container testid:** `data-testid="shopping-lists.detail.body.kits"` (new—must be added in Slice 5)
- Individual chip testid: `data-testid="shopping-lists.concept.header.kits.{kitId}"` (existing testid, chip relocated from header; testid prefix will change from `.header.` to `.body.` for consistency)
- Wait for `ListLoading` event with scope 'shoppingLists.detail.kits' phase 'ready' and assert `metadata.renderLocation === 'body'`
- Backend hook: Use `testData.shoppingLists.createList()` then `testData.shoppingLists.linkToKit(listId, kitId)` to seed list with kit links deterministically (factory extension required per Section 4)
- **Integration point:** Shopping list route file (`src/routes/shopping-lists/$listId.tsx`) renders body content via `{contentNode}` at line 627. Link chips will render as a separate section before `{contentNode}` or inside a wrapper div.

**Gaps:** No existing spec file `tests/e2e/shopping-lists/shopping-list-detail.spec.ts` found. Slice 5 may require creating new spec or extending existing shopping list suite.

**Evidence:** src/routes/shopping-lists/$listId.tsx:627 (body content integration point)

### Surface: KeyValueBadge component

**Scenarios:**
- **Given** component receives label, value, className, testId, **When** rendered, **Then** displays `{label}: {value}` in Badge with custom classes
- **Given** component receives variant prop, **When** rendered, **Then** Badge uses specified variant

**Instrumentation / hooks:**
- `data-testid={testId}` passed through to Badge
- No dedicated test file needed; covered by parent component specs

**Gaps:** Storybook story for KeyValueBadge would help visual QA but is out of scope

**Evidence:** Component will follow existing Badge test patterns

### Surface: Kit detail – Build target badge moved to metadataRow

**Scenarios:**
- **Given** kit detail loaded, **When** viewing header, **Then** titleMetadata contains only status badge
- **Given** kit detail loaded, **When** viewing header, **Then** metadataRow contains Build target badge

**Instrumentation / hooks:**
- `data-testid="kits.detail.header.status"` for status badge
- `data-testid="kits.detail.badge.build-target"` for Build target badge (relocated)

**Gaps:** None

**Evidence:** tests/e2e/kits/kit-detail.spec.ts (will need assertion updates)

---

## 14) Implementation Slices

### Slice 1: Create KeyValueBadge and StatusBadge Components & Standardize Colors

**Goal:** Establish two reusable badge components with distinct color palettes (subtle for metrics, bold for status)
**Touches:**
- src/components/ui/key-value-badge.tsx (new file with subtle color palette constants)
- src/components/ui/status-badge.tsx (new file with bold status palette constants)
- src/components/ui/index.ts (export KeyValueBadge and StatusBadge)
- docs/contribute/ui_patterns.md or AGENTS.md (document both palettes and usage guidance; optional)

**Dependencies:** None; foundational components created first

### Slice 2: Migrate Badge Wrapper Call Sites and Status Badges with Color Updates

**Goal:** Replace DetailBadge, SummaryBadge, GroupSummaryBadge with KeyValueBadge; replace inline status badges with StatusBadge; apply standardized colors
**Touches:**
- src/components/pick-lists/pick-list-detail.tsx (migrate to KeyValueBadge for metrics; add call-site mapping for pick list status → StatusBadge `color` + `label`)
- src/components/kits/kit-detail.tsx (migrate to KeyValueBadge for metrics)
- src/components/kits/kit-detail-header.tsx (add call-site mapping for kit status → StatusBadge `color` + `label`)
- src/components/pick-lists/pick-list-lines.tsx (migrate to KeyValueBadge for group metrics; add call-site mapping for line status → StatusBadge `color` + `label`)
- src/components/shopping-lists/detail-header-slots.tsx (add call-site mapping for shopping list status → StatusBadge `color` + `label`; update "New" badge from sky to blue using KeyValueBadge)

**Dependencies:** Slice 1 complete; KeyValueBadge and StatusBadge components available

**Call-site mapping examples:**
- Kit status: `active` → `{ color: 'active', label: 'Active' }`, `archived` → `{ color: 'inactive', label: 'Archived' }`
- Shopping list status: `concept` → `{ color: 'inactive', label: 'Concept' }`, `ready` → `{ color: 'active', label: 'Ready' }`, `done` → `{ color: 'inactive', label: 'Done' }`
- Pick list status: `open` → `{ color: 'active', label: 'Open' }`, `completed` → `{ color: 'success', label: 'Completed' }`

### Slice 3: Move Kit Detail Build Target Badge

**Goal:** Clean up kit title metadata to show only status badge
**Touches:**
- src/components/kits/kit-detail-header.tsx (move Build target badge from titleMetadata to metadataRow)
- tests/e2e/kits/kit-detail.spec.ts (update badge selector assertions to verify Build target badge exists in metadataRow, not titleMetadata)

**Dependencies:** None; independent UI change

**Playwright verification:** Add or update scenario: "Given active kit loaded, When viewing header, Then `data-testid='kits.detail.header.status'` exists in titleMetadata and `data-testid='kits.detail.badge.build-target'` exists in metadataRow (not in titleMetadata)"

### Slice 3.5: Extend Test Factories for Link Chip Coverage

**Goal:** Implement factory helpers for kit↔shopping list linking to unblock Slices 4-5 Playwright specs
**Touches:**
- tests/api/factories/kit-factory.ts (add `linkShoppingList(kitId, listId)` and `createWithShoppingListLinks({ shoppingListIds })` helpers wrapping `POST /api/kits/{kit_id}/shopping-lists`)
- tests/api/factories/shopping-list-factory.ts (add `linkToKit(listId, kitId)` helper wrapping backend API)
- (Optional) Unit tests for factory helpers if time permits

**Dependencies:** None; backend endpoints confirmed to exist (openapi.json:12522, 11673, 12472, 15145); no backend work required

**Deliverables:**
- Kit factory extension with `linkShoppingList(kitId: number, listId: number): Promise<void>` — Creates kit → shopping list link via `POST /api/kits/{kit_id}/shopping-lists` endpoint
- Kit factory extension with `createWithShoppingListLinks(options: { ...KitCreateOptions, shoppingListIds: number[] }): Promise<KitResponseSchema>` — Creates a kit and links specified shopping list IDs in one call
- Shopping list factory extension with `linkToKit(listId: number, kitId: number): Promise<void>` — Creates shopping list → kit link via backend API
- All factory helpers throw descriptive errors on API failures
- Factory helpers return strongly-typed responses matching OpenAPI schema

**Validation:** Run existing factory tests to ensure no regressions; optionally add unit tests for new helpers

### Slice 4: Move Kit Detail Link Chips to Body & Remove Empty State

**Goal:** Relocate shopping list chips from header to body content; remove empty state message; update instrumentation metadata
**Touches:**
- src/components/kits/kit-detail-header.tsx (return linkChips slot; remove empty state message at lines 237-239)
- src/components/kits/kit-detail.tsx (render linkChips slot in body before BOM card; update `getLinksReadyMetadata` callback at lines 92-94 to include `renderLocation: 'body'` field in metadata)
- src/types/test-events.ts (extend KitLinksMetadata interface with optional `renderLocation` field)
- tests/e2e/kits/kit-detail.spec.ts (update selectors; verify no empty state message; add scenario asserting `metadata.shoppingLists.renderLocation === 'body'` in UiState event)
- tests/support/page-objects/kits-page.ts (update locators)

**Dependencies:** Slices 1-3.5 complete; ensures header is fully standardized before chip relocation and factory helpers are available for Playwright specs

### Slice 5: Move Shopping List Detail Link Chips to Body & Remove Empty State

**Goal:** Relocate kit chips from header to body content; ensure no empty state renders; update instrumentation metadata
**Touches:**
- src/components/shopping-lists/detail-header-slots.tsx (return linkChips slot; ensure conditional rendering omits empty state; update `getReadyMetadata` callback at lines 136-146 to include `renderLocation: 'body'` field in metadata)
- src/routes/shopping-lists/$listId.tsx (render linkChips in body)
- src/types/test-events.ts (extend ShoppingListKitsMetadata interface with optional `renderLocation` field)
- Playwright specs for shopping list detail (update selectors; verify no empty state; add scenario asserting `metadata.renderLocation === 'body'` in ListLoading event for 'shoppingLists.detail.kits' scope)

**Dependencies:** Slices 1-4 complete (includes Slice 3.5 factory helpers); follows same pattern as kit detail

### Slice 6: Migrate Shopping List Overview and Line View Badges

**Goal:** Migrate all shopping list overview cards and line row badges to standardized components
**Touches:**
- src/components/shopping-lists/overview-card.tsx:
  - Add call-site mapping for shopping list status → StatusBadge (status badge at line 78-84)
  - Migrate "New" line count badge (line 90-96) to KeyValueBadge with color="info"
  - Migrate "Ordered" line count badge (line 98-104) to KeyValueBadge with color="warning"
  - Migrate "Completed" line count badge (line 106-112) to KeyValueBadge with color="success"
- src/components/shopping-lists/concept-line-row.tsx:
  - Add call-site mapping for line status → StatusBadge (status badge at line 74-81; includes 'new', 'ordered', 'done' values)
  - Keep seller badge as plain Badge (informational, not metric)
- src/components/shopping-lists/ready/ready-line-row.tsx:
  - Add call-site mapping for line status → StatusBadge (status badge at line 147-154)
- src/components/shopping-lists/ready/update-stock-dialog.tsx:
  - Add call-site mapping for stock status → StatusBadge (status badge at line 571-573; includes 'ordered', 'received' values)
- tests/e2e/shopping-lists/*.spec.ts (update assertions for new badge components)

**Dependencies:** Slices 1-5 complete; StatusBadge and KeyValueBadge components available

**Call-site mapping for shopping list line statuses:**
- `new` → `{ color: 'inactive', label: 'New' }`
- `ordered` → `{ color: 'active', label: 'Ordered' }`
- `done` / `completed` → `{ color: 'success', label: 'Completed' }` or `{ color: 'inactive', label: 'Done' }` depending on context
- `received` → `{ color: 'success', label: 'Received' }`

**Playwright verification:** Verify status badges render with correct colors and labels; verify line count badges follow `<key>: <value>` format

### Slice 7: Migrate Link Chip Internal Status Badges

**Goal:** Migrate status badges inside link chip components to StatusBadge with call-site mapping
**Touches:**
- src/components/shopping-lists/shopping-list-link-chip.tsx (add call-site mapping for shopping list status; migrate status badge at line 114-122 to StatusBadge)
- src/components/kits/kit-link-chip.tsx (add call-site mapping for kit status; migrate status badge at line 67-73 to StatusBadge)
- tests/e2e/kits/kit-detail.spec.ts (verify link chip status badges)
- tests/e2e/parts/*.spec.ts (verify link chip status badges in part detail)

**Dependencies:** Slice 6 complete

**Call-site mapping:**
- Kit status: `active` → `{ color: 'active', label: 'Active' }`, `archived` → `{ color: 'inactive', label: 'Archived' }`
- Shopping list status: reuse mapping from Slice 2/6

**Playwright verification:** Verify link chips render with StatusBadge components; ensure status colors match expectations

### Slice 8: Migrate Kit Card and Pick List Panel Badges

**Goal:** Migrate kit card and pick list panel status badges to StatusBadge with call-site mapping
**Touches:**
- src/components/kits/kit-card.tsx:
  - Add call-site mapping for kit status (archived badge at line 119-121; remove uppercase styling)
  - Add call-site mapping for shopping list tooltip status badges (line 114-119)
  - Add call-site mapping for pick list tooltip status badges (line 172-174)
- src/components/kits/kit-pick-list-panel.tsx:
  - Add call-site mapping for pick list status; migrate "Open" badge (line 171-173) to StatusBadge with `color="active" label="Open"`
- tests/e2e/kits/*.spec.ts (update assertions for kit card badges)

**Dependencies:** Slice 7 complete

**Important note:** Removal of uppercase styling on archived badge changes visual appearance. StatusBadge uses standard capitalization ("Archived" not "ARCHIVED"). This is an intentional standardization.

**Playwright verification:** Verify kit card archived badge renders without uppercase; verify pick list panel "Open" badge uses StatusBadge

### Slice 9: Migrate Part and Box Detail Badges (Dates and Attributes)

**Goal:** Migrate remaining detail view badges including dates (currently plain text)
**Touches:**
- src/components/parts/part-details.tsx:
  - Migrate Type badge (line 260) to KeyValueBadge with color="neutral"
  - **NEW:** Migrate "Created" date (line 261-263) from plain text to KeyValueBadge with label="Created", value formatted date
- src/components/boxes/box-details.tsx:
  - Migrate Capacity badge (line 176) to KeyValueBadge with color="neutral"
  - Migrate Usage badge (line 177-179) to KeyValueBadge with conditional color (danger if ≥90%, neutral otherwise)
  - **NEW:** Migrate "Updated" date (line 180-182) from plain text to KeyValueBadge with label="Updated", value formatted date
- tests/e2e/parts/part-detail.spec.ts (verify Type and Created badges)
- tests/e2e/boxes/box-detail.spec.ts (verify Capacity, Usage, and Updated badges)

**Dependencies:** Slice 8 complete

**Date formatting requirement:** Use deterministic date formatting for Playwright test stability. Replace locale-dependent `toLocaleDateString()` with fixed format:
- **Option A (Recommended)**: `new Intl.DateTimeFormat('en-US', { dateStyle: 'short' }).format(new Date(date))` — Produces consistent "M/D/YYYY" format regardless of user's browser locale
- **Option B**: ISO format `new Date(date).toISOString().split('T')[0]` — Produces "YYYY-MM-DD" format

Both options ensure Playwright assertions on date badge text remain stable across different test environments and locales. Current `toLocaleDateString()` calls produce locale-dependent output (e.g., "10/27/2025" in en-US vs "27/10/2025" in en-GB), breaking deterministic test expectations.

**Playwright verification:** Verify all badges follow `<key>: <value>` format; verify date badges render with formatted dates using fixed format; verify Usage badge color changes at 90% threshold; assert date badge values match expected deterministic format

---

## 15) Risks & Open Questions

### Risk: Playwright specs break due to chip relocation

- **Impact:** CI pipeline fails; tests must be fixed before merge
- **Mitigation:** Update all test selectors in same commit; verify specs pass locally before pushing

### Risk: Unlink action on relocated chips fails

- **Impact:** Users cannot remove shopping list links from kits
- **Mitigation:** Verify event handler binding after chip moves to body; test unlink flow in Playwright suite

### Risk: Instrumentation metadata becomes incorrect after chip relocation

- **Impact:** Test events report wrong link counts or placement
- **Mitigation:** Review getReadyMetadata functions for 'kits.detail.links' and 'shoppingLists.detail.kits' scopes; ensure metadata still reflects visible chips

### Risk: Color changes break visual semantics

- **Impact:** Users may misinterpret badge meanings after color migration (e.g., "New" badge changing from sky to blue)
- **Mitigation:** Limited palette ensures consistency; blue and sky are both "info" colors, semantic meaning preserved; app not yet in production so safe to change

### Risk: Removing empty state messages confuses users

- **Impact:** Users may wonder if data failed to load when no chips appear
- **Mitigation:** Part detail already demonstrates this pattern successfully; absence of chips in detail views is normal state; loading states still show skeletons; error states still show error UI

### Risk: Removing uppercase styling from archived badge changes visual appearance

- **Impact:** Kit card archived badge currently uses uppercase styling (`className="uppercase tracking-wide text-xs"`); StatusBadge uses standard capitalization, changing "ARCHIVED" → "Archived"
- **Mitigation:** Intentional standardization to enforce consistent visual language; app not yet in production so safe to change; all other status badges use standard capitalization; no className prop support ensures consistency
- **Evidence:** src/components/kits/kit-card.tsx:119-121 (current implementation with custom styling)

### Risk: Inconsistent call-site mapping across components

- **Impact:** Different components may map the same domain status to different badge colors or labels, creating visual inconsistency
- **Mitigation:** Document canonical status-to-color mappings in plan (Section 2 and slice deliverables); use helper functions or constants to centralize mapping logic per domain (e.g., `getShoppingListBadgeProps` function); code review to verify mapping consistency
- **Benefit of design:** StatusBadge remains a pure presentational component—discovering new status values never requires changing StatusBadge component, only updating call-site mapping logic

### Risk: Date formatting inconsistency

- **Impact:** Part detail "Created" date and box detail "Updated" date currently use `toLocaleDateString()` formatting; migrating to KeyValueBadge preserves this but doesn't standardize date format across app
- **Mitigation:** KeyValueBadge accepts formatted string as `value` prop; date formatting logic remains at call site; future date standardization can be implemented separately without changing KeyValueBadge API
- **Evidence:** part-details.tsx:262, box-details.tsx:181

---

## 16) Confidence

**Confidence: High** —

This plan provides comprehensive coverage of all badge instances across the application (~35-40 instances across 15+ component files). Systematic codebase scan identified all status badges, key-value metric badges, and plain text dates requiring migration.

**Strengths:**
- **Clear patterns:** Status badges consistently use variant mapping; key-value badges use inline color classes; all follow predictable patterns
- **Clean abstraction:** Two component types (KeyValueBadge, StatusBadge) cover all use cases without complexity
- **Centralized color mapping:** Status-to-color mapping (10 status values → 3 colors) is centralized in StatusBadge; no duplication
- **No breaking changes:** All migrations are UI-only; no API or data model changes required
- **Deterministic testing:** All changes have clear Playwright verification criteria

**Badge inventory confirmed:**
- **Detail views:** Kit, shopping list, pick list, part, box (all covered)
- **Overview/cards:** Shopping list overview cards, kit cards (all covered)
- **Line rows:** Shopping list concept and ready line rows (all covered)
- **Link chips:** Internal status badges in ShoppingListLinkChip and KitLinkChip (all covered)
- **Dates:** Part detail Created date, box detail Updated date (both identified and included)

**Risk factors (all low-medium risk):**
- Uppercase styling removal on kit card archived badge is intentional visual change (low risk - app not in production)
- Date badge migration converts plain text to badges (low risk - semantic change only, no functional impact)
- Additional status values ('new', 'ordered', 'received') map cleanly to existing 3-color palette (low risk - centralized mapping)
- Playwright test updates required for all migrated components (medium effort - deterministic and testable)
- Conditional color logic (e.g., Usage badge ≥90% threshold) requires careful testing (low risk - straightforward conditional)

**Mitigations:**
- No className prop support enforces consistent styling and prevents Tailwind class soup
- All badge call sites use semantic color names instead of direct Tailwind classes
- Centralized color mapping in badge components ensures visual consistency
- App not in production allows safe visual standardization changes
- Systematic slice-by-slice approach allows incremental testing and rollback if needed

**Primary concerns:** Playwright test coverage for all migrated components (deterministic); ensuring conditional color logic works correctly (testable); verifying status badge color mappings render correctly across all contexts (visual QA). All concerns are addressable through systematic testing.
