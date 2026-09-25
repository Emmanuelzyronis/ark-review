# ArkReview — UI/UX Audit Report

**Date:** 2026-09-25
**Auditor:** Claude Sonnet 4.6
**Build:** Next.js 15.5.26 — All 8 routes confirmed passing post-fixes

---

## Scores

| Criterion | Before | After Fixes | Notes |
|---|---|---|---|
| Visual Hierarchy | 8/10 | 8/10 | No fixes needed |
| Mobile Responsiveness | **5/10** | **8/10** | Fixed — see below |
| Accessibility | **6/10** | **8/10** | Fixed — see below |
| Loading & Empty States | **6/10** | **8/10** | Fixed — see below |
| Copy Quality | 8/10 | 8/10 | No fixes needed |
| **Overall** | **6.6/10** | **8/10** | |

---

## Visual Hierarchy — 8/10

**Justification:**
- Landing h1 at `text-5xl`/`text-6xl` vs body at `text-xl` → ~3× ratio. Strong.
- METR problem callout with amber-bordered box creates a clear secondary focal point after the hero.
- Primary CTA ("Install on GitHub") is blue on dark-navy — immediately scannable.
- Review page sticky bottom action bar ("Post Review to GitHub") is the best single design decision in the app: the action is always visible while reading issues.
- Severity badge color system (red / amber / blue) creates instant scannable hierarchy across the PR table.

**No fixes applied.**

---

## Mobile Responsiveness — 5/10 → 8/10

**Issues found:**

1. **Sidebar broke layout at 375px.** The sidebar is `w-64` (256px) by default. At 375px that leaves 119px for content — unusable. No hamburger, no mobile toggle.
2. **PR table grid overflowed.** `grid-cols-[1fr_auto_auto_auto_auto]` with 5 columns had no responsive breakpoints. Would force horizontal scroll on mobile.
3. **No mobile navigation pattern** — only a collapsible desktop sidebar.

**Fixes applied:**

- `navigation-sidebar.tsx`: Restructured to render as in-flow desktop sidebar (`hidden md:flex`) and a fixed z-50 overlay on mobile when `mobileOpen` is true. Backdrop click closes it. Added close (X) button inside mobile drawer.
- `app/(app)/layout.tsx`: Added `mobileNavOpen` state. Added hamburger `<Menu>` button (`md:hidden`) to the top bar that toggles the mobile sidebar. Route-change effect auto-closes the drawer.
- `dashboard/[owner]/[repo]/page.tsx`: Table header hidden on mobile (`hidden sm:grid`). Each PR row is `flex flex-col sm:grid` — mobile shows title + severity badge inline + age inline. Desktop shows all 5 columns. Age and Voice columns hidden on mobile.

---

## Accessibility — 6/10 → 8/10

**Issues found:**

1. **Bell button had no label.** Icon-only button with no `aria-label`.
2. **Sidebar collapse button had no label when collapsed.** Text "Collapse" was hidden in collapsed state, leaving an unlabeled button.
3. **Modal dialogs had no ARIA roles.** Both `AddRepoModal` and the "Simulate PR" modal lacked `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
4. **Form inputs in modals had no `id`/`for` associations.** Labels were siblings, not programmatically linked.
5. **Voice player seek bar was click-only.** Had `role="slider"` but no `tabIndex` and no keyboard handlers — arrow keys did nothing.
6. **User account dropdown was CSS hover-only.** `group-hover` is not keyboard accessible; added `group-focus-within` to expose it on Tab focus.
7. **Index status dots conveyed state via color only.** Added `aria-label` and `title` to status dots.
8. **Decorative icons lacked `aria-hidden="true"`** in several components.

**Fixes applied:**

- `navigation-sidebar.tsx`: `aria-label` on collapse toggle, `aria-label="Main"` on nav, `aria-hidden` on decorative icons, `aria-label` with semantic text on severity dots.
- `app/(app)/layout.tsx`: `aria-label="View notifications"` on bell button, `aria-label` on hamburger, `aria-label` on account button, `role="menu"` and `role="menuitem"` on dropdown, `group-focus-within` for keyboard dropdown access.
- `dashboard/[owner]/[repo]/page.tsx`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on modal, `id`/`for` pairing on all form inputs, `role="alert"` on error messages, `role="list"`/`role="listitem"` on PR list.
- `dashboard/page.tsx`: Same modal ARIA pattern, `role="alert"` on errors, `role="progressbar"` with `aria-valuenow/min/max/label` on index progress bar.
- `voice-player.tsx`: Added `tabIndex={0}`, `onKeyDown={seekByKeyboard}`, `aria-valuetext` with human-readable time. `seekByKeyboard` handler advances/retreats by 5s on ArrowRight/ArrowLeft/ArrowUp/ArrowDown.

---

## Loading & Empty States — 6/10 → 8/10

**Issues found:**

1. **Silent error handling.** `catch(() => {})` in `fetchRepos` and `fetchData` meant API failures showed a blank/stale empty state with no indication something went wrong.
2. **`alert()` for error messages.** Both `AddRepoModal` and `SettingsPage` used native browser `alert()` — not dismissible without reload, blocks the UI, breaks the visual design system entirely.
3. **Settings loading state was plain text.** `<div>Loading settings...</div>` instead of skeleton matching the page layout.
4. **"PR not found" state was minimal.** Just a text line and link — no icon, no explanation, no clear recovery path.
5. **PR list empty state lacked a CTA.** The empty message "Open a PR on GitHub or simulate one above" had no button — users had to scroll up.

**Fixes applied:**

- `dashboard/page.tsx`: Added `error` state, `fetchRepos` sets it on failure. Red banner with `AlertTriangle` icon and "Try again" action. `AddRepoModal` replaced `alert()` with inline red error inside the modal (dismisses when modal closes).
- `dashboard/[owner]/[repo]/page.tsx`: Same pattern — `error` state, dismissible red banner, "Try again" link. `addPR` replaced `alert()` with `addError` state shown inline in modal. Empty PR list now includes a "Simulate a PR" Button CTA.
- `settings/[owner]/[repo]/page.tsx`: Replaced `alert()` with `saveError` state shown as a styled red banner above the save button. Loading state replaced with skeleton matching the 4-section layout.
- `review/[owner]/[repo]/[prNumber]/page.tsx`: "PR not found" state upgraded to icon + h2 + explanation paragraph + descriptive back link.

---

## Copy Quality — 8/10

**Justification (no fixes applied):**

- Landing headline "Voice-driven AI code review that catches what Copilot creates" is 13 words — slightly over the 10-word target, but punchy and specific. No cut needed.
- CTAs are specific: "Install on GitHub", "Get started free", "Get started — it's free", "Create account", "Start reviewing PRs in under 5 minutes" (register subhead). All strong.
- The METR 2026 data point ("developers 19% slower with AI assistants") is the most credible line in the product — it creates urgency before the feature pitch.
- One copy fix applied: Modal "Add Repository" renamed to "Connect Repository" (more accurate to what the action does). Empty dashboard message extended to explain the indexing flow.

---

## Issues Found and Fixed (Summary)

| # | File | Issue | Fix |
|---|---|---|---|
| 1 | navigation-sidebar.tsx | No mobile support; unlabeled collapse button | Mobile overlay drawer + hamburger + aria-labels |
| 2 | app/(app)/layout.tsx | No hamburger; unlabeled bell button; hover-only dropdown | Hamburger toggle; aria-labels; focus-within |
| 3 | dashboard/[owner]/[repo]/page.tsx | 5-col table overflows on mobile; no modal ARIA; alert() | Responsive flex/grid; role="dialog"; inline error |
| 4 | dashboard/page.tsx | Silent catch; alert() in modal; no modal ARIA | Error state; inline modal error; role="dialog" |
| 5 | settings/[owner]/[repo]/page.tsx | alert() on save error; plain text loading state | Inline saveError banner; skeleton loader |
| 6 | review/[owner]/[repo]/[prNumber]/page.tsx | "PR not found" was minimal | Icon + heading + explanation + descriptive link |
| 7 | voice-player.tsx | Seek bar click-only; no keyboard; no aria-valuetext | tabIndex + onKeyDown handler + aria-valuetext |

---

## Final Verdict

**ArkReview is a strong hackathon product that passes the "would I use this?" test for the target audience — engineering team leads and senior developers.** The design is coherent, the color system is well-considered, and the review page's sticky action bar is genuinely good UX. The voice walkthrough player is a standout component that no competitor has.

The remaining open gap is that the "Issue Trends" section on the Analytics page is an empty placeholder div. This is the one area where the product shows its hackathon origins to a sharp evaluator. It should either show a real chart seeded with synthetic trend data, or the empty state should be replaced with a more specific message about what data is needed and when it will appear.

Build: PASS. All 8 routes. No TypeScript errors. No lint errors.
