# TutorME responsive design audit and improvements

> Historical implementation record. Current technical guidance: [Testing and responsive design](testing.md). Original detail is retained for review; dated test results are not new verification.

November 6, 2026

Implemented frontend layout/accessibility improvements while retaining the blue identity, existing routes, authorization, APIs, booking snapshots and scheduling calculations. No backend, environment, credentials, database, provider settings or feature flags were changed. No commit, merge, push or deployment was performed. The earlier production-readiness snapshot is preserved in the private review archive; current release guidance is in [deployment](deployment.md).

## Audit scope and initial findings

Inspected every page/layout in app and all shared components. The highest-severity issue was the tutor editor: its intro textarea had a fixed 600px width, the avatar/text/rate header stayed horizontal, About/calendar columns did not collapse, and the eight-column calendar had no scroll boundary. A synthetic 390px Chrome viewport reproduced a **1,522px document width** before changes.

Existing strengths were retained: mobile filter disclosure, native navigation disclosures, public profile's contained calendar, responsive auth forms, shared booking cards instead of tables, independent Google widget integration, reduced-motion rule and responsive map height. Changes fix intrinsic sizing and wrapping; no global overflow-x:hidden workaround was added.

### Complete route inventory

Severity describes the initial issue: High = blocked/overflowing core mobile flow; Medium = difficult reflow, long-data or touch behavior; Low = polish; None = no independent route-level defect found. Shared changes benefit routes without rewriting them.

| Route | Initial assessment / severity | Implementation or retained behavior | Verification |
| --- | --- | --- | --- |
| / | Medium: decorative note competes with text at intermediate tablet widths; tight CTA at enlarged text | Tablet hero stacks; mobile CTA/section link can wrap; existing How it works content and vertical scrolling retained | Source + Chrome fixture |
| /tutors | Already collapsible filters; Medium: long results/hidden active-filter feedback | Active-filter summary outside collapsed panel, bounded result container, wrapping cards and 44px view controls | Source + Chrome fixture |
| /tutors/[id] | Mostly responsive; Medium: custom date popover, calendar controls/column width | Shared native schedule/date controls, comfortable wide-screen calendar column, retained local calendar scrolling, readable bio width, dark surface rules | Source + Chrome fixture |
| /login | Existing shared fluid form; Medium long text/theme edge cases | Shared auth surface padding/wrapping/dark styles; sign-in handlers unchanged | Source + Chrome fixture + existing auth tests |
| /signup | Existing fluid form; Medium long text/theme edge cases | Shared auth surface; checkbox sizes and account-purpose choices preserved | Source + Chrome fixture + existing auth tests |
| /signup/tutor | Same shared form | Same shared improvements, tutor signup behavior retained | Source + Chrome fixture + existing auth tests |
| /verify-email | Already responsive; Low theme/long feedback | Shared auth styling, code/email handlers retained | Source + Chrome fixture + existing tests |
| /complete-registration | Already uses original identity data; Medium long identity display/theme | Shared auth styling, wrapped original identity; no registration-completion changes | Source + Chrome fixture + existing recovery tests |
| /terms | Already bounded document; Medium long contact/link risk | Inherited document-level overflow wrapping, existing text unchanged | Source + actual LegalDocument rendered in fixture |
| /privacy | Same document component | Same shared link wrapping, existing text unchanged | Source + actual LegalDocument rendered in fixture |
| /account/settings | Medium: nested padding consumes phone width; long emails/labels | 16px mobile outer/card padding, minimum widths, long-data wrapping, scoped touch controls | Source + Chrome fixture |
| /student/dashboard | Already stacks Explore tutors/session content | Bounded account content and shared navigation/session fixes; CTA retained | Source + Chrome fixture |
| /student/sessions | Already card-based; Medium long snapshots/narrow actions | One-column base quote grid with zero-minimum children, wrapping data, larger controls and mobile action reflow | Source + shared BookingList fixture + booking tests |
| /tutor/dashboard | Already fluid compact booking list | Bounded account content and shared navigation/session fixes | Source + Chrome fixture |
| /tutor/profile | High: fixed intro width and noncollapsing header/columns/calendar; clickable div cells | Stacked editor/header, fluid textarea, in-flow edit buttons, stacked sections until spacious desktop widths, contained calendar and native controls, keyboard buttons with pressed state | Source + Chrome fixture + new controls tests |
| /tutor/sessions | Same shared list; Medium action density | Shared snapshot/action/meeting-form reflow; accept/decline/cancel/complete logic unchanged | Source + tutor BookingList fixture + booking tests |
| /tutor/students | None: explanatory flow, no wide table | Shared text/container/navigation rules; no feature changes | Source + Chrome fixture |
| /tutor/payments | None: explanatory flow, no payment table | Shared text/container/navigation rules; no payment functionality added | Source + Chrome fixture |

Root layout, landing layout, protected session gate, student/tutor shells, student dashboard pass-through layout, discovery Suspense layout and public profile layout were inspected. The two server route handlers (/api/auth/[...path] and /api/registration/context) have no visual layout and were not modified. Icon/favicon and framework-generated not-found behavior remain unchanged; generated error pages were not independently browser-tested.

### Shared component inventory

| Group | Components reviewed | Findings / response |
| --- | --- | --- |
| Navigation | LandingNav, ProtectedStudentNav, ProtectedTutorNav, MobileMenu, TutorMELogo | Remove absolute logo positioning; flexible rows wrap at enlarged text; retain native details, Enter activation and Escape handler; desktop sidebar unchanged |
| Footer/legal | SiteFooter, LegalDocument | Legal links wrap and provide comfortable click areas; long document links wrap; existing content/contact unchanged |
| Authentication | auth-layout, SignupForm, CompleteRegistration, VerifyEmail | Reuse shared fluid auth surface; compact mobile padding, long text and dark contrast rules; retain checkbox dimensions and all identity flows |
| Account/profile | AccountSettings, TutorRateEditor, TutorLocationSettings, SubjectsYouTeach | Shared scoped touch sizing; long subject labels/badges wrap; rate form shrinks; lesson/location form logic unchanged |
| Search/profile display | ResponsivePanel, TutorCard, TutorLocationBadges, RatingStar | Keep existing disclosure; cards/rate actions reflow, badges constrain to container; decorative stars/logo retained |
| Geography | ServiceAreaPicker, LocationAutocomplete, TutorMap | Source review: keep sole native Google widget, attribution/clear/selection behavior and public area logic; no shadow-DOM filters, prediction clipping or custom autocomplete added |
| Booking | BookingRequest, BookingDetails, BookingList, BookingNotice, UpcomingSessionsCard | Explicit base one-column summary grid, zero-minimum children, long-data wrapping, phone padding and wrapping actions; existing loading/error/empty/quote semantics retained |
| Availability | Existing page calendars and new AvailabilityControls | Shared native select/date input, displayed timezone in editor, local scroll region, larger paging controls and actual toggle buttons |

No custom modal/dialog system or wide booking table exists in these routes. Existing subject popover, Google prediction list, native date/select UI, booking notices and filter/menu disclosures were reviewed instead of inventing new overlays.

## Implemented conventions and improvements

- Reused Tailwind mobile-first breakpoints (640/768/1024/1280/1536px), existing blue tokens, surface borders and rounded cards. No framework or dependency added.
- Base-layer zero-minimum semantic containers, wrapping text, and bounded form/media sizing allow utilities to retain their intended widths. Long words are preserved and wrapped rather than silently truncated.
- Account/discovery/public-profile containers cap at 100rem; paragraphs use existing max widths or max-w-prose. Phone padding starts at 16px and grows at existing breakpoints.
- The editor header stacks on phones, its image scales from 128px to the existing 210px size, and the textarea uses available width. About/calendar sections stack until 1536px. Desktop calendars receive enough width to avoid unnecessary local scrolling at 1920px.
- A labeled, focusable calendar-scroll region contains genuine tabular horizontal scrolling. Six time columns/day labels retain their spatial relationship. Instructions remain visible; no page-level scroll suppression is used.
- Calendar toggles are native buttons with descriptive day/date/time labels and aria-pressed. Previous/next controls have accessible names. Schedule type and date selection now use labeled native controls, removing the positioned custom popover and hidden date-picker trigger. Empty date input does not replace the current selection.
- Scoped touch-controls supplies approximately 44px button/control heights and 16px input text. Checkbox glyphs remain small; labels provide a larger target. Google map controls are not covered by these application-only rules.
- Navigation logo/menu rows wrap naturally when text grows. Native menus still work without a custom focus trap; Escape closes and returns focus after hydration. Open mobile menus receive a full row instead of a cramped side column.
- Mobile session actions wrap into readable rows; quote grids explicitly use minmax-style single-column sizing before their two-column breakpoint. This fixed a long unbroken subject/name overflow detected during browser validation.
- Active discovery filters remain visible while the filter form is collapsed. No filtering, location-resolution, pricing, request payload or API logic changed.
- Auth/location surfaces gained missing dark-theme field, muted-text, subject-box and badge rules. Existing semantic status colors, Google color-scheme behavior and reduced-motion handling remain.

## Summary of initial issues and fixes

| Page/component | Original issue | Fix | Sizes | Status |
| --- | --- | --- | --- | --- |
| Tutor editor | 600px intro, horizontal header/columns; High | Fluid editor, stacked header/sections, bounded data | 320–1280px; enlarged text | Chrome fixture + TypeScript |
| Editor calendar | Uncontained eight-column grid/clickable divs; High | Local scroll region; native pressed buttons; named paging | Phones/tablets; keyboard | Chrome layout + controls tests |
| Both calendars | Custom schedule/date popover; Medium | Shared labeled native controls | All sizes | Native binding tests + Chrome |
| Calendar desktop column | Needlessly narrow panel | Minimum wide-screen column at 1536px+ | 1920px checked | Explicit Chrome desktop containment check |
| Quote review/history | Intrinsic auto-grid expands for long subject/name; High stress-data case | Explicit single-column grid and zero-minimum children | Phones/tablets; 200% text | Chrome stress fixtures + existing booking tests |
| Navigation | Absolute logo can collide at large text; Medium | Flow layout and wrapping menu rows | Phones, tablets, enlarged text | Chrome overlap and native Enter checks; Escape unit test |
| Tutor cards/badges | Long names/subjects/location labels can force width; Medium | Min-width constraints, wrapping badges/actions | 320–1024px | Chrome discovery/public-profile fixtures |
| Account/auth | Nested padding and long email/theme data; Medium | Shared phone spacing and wrapping | 320–600px; 200% text | Chrome fixtures + auth regressions |
| Landing/tablet | Note competes with hero copy; Medium | Stack decorative note at tablet widths | 640–1023px | Chrome home fixtures |
| Landing CTA | Narrow enlarged-text button/link | Allow wrapping instead of nowrap | Narrow/enlarged text | Chrome home fixtures |
| Footer/legal links | Shrink-resistant links/unbroken contact | Wrapping footer and document overflow-wrap | Small screens/enlarged text | Chrome Terms/Privacy fixtures |
| Filter disclosure | Active filter detail hidden with form | Summary in results area outside panel | Mobile/tablet | Source + Chrome discovery fixture |

## Automated and actual browser validation

### Source/component checks

- **45 frontend Node tests passed** (42 existing plus three targeted responsive controls tests).
- New tests execute the actual native availability controls, check selected-date/type bindings and empty-date handling, verify filter disclosure state/ARIA linkage, and verify mobile-menu Escape/click dismissal behavior.
- Existing tests retain subject selection, quote review/formatting/staleness/retry/loading behavior, original historical snapshots and NULL fallbacks, auth retries/recovery/receipts, and mocked Google loader behavior.
- TypeScript --noEmit passed. Next.js production build passed with synthetic API/Auth/Google settings. Existing fonts were downloaded with approved network access. This synthetic build is a validation artifact, not a production release.
- ESLint: zero errors; four existing unused id/tutorId destructuring warnings remain in tutor profile mapping. Previously unused UI imports/state were removed when extracting controls; no new warning was introduced.
- git diff --check passed. No backend changes occurred, so no backend/database suite or live concurrency test was needed or run.

### Actual Chrome fixture matrix

Used installed **Chrome 156.0.8078.81**, without adding Playwright/browser dependencies. The harness executes actual frontend components with controlled hooks, state and mocked service boundaries, renders them to static HTML, applies the built Tailwind/global CSS and mapped landing CSS module, and measures them in real headless Chrome. It is **not** a hydrated Next.js end-to-end test.

Final matrix: **532 checks passed**, zero document overflow relative to documentElement.clientWidth and no logo/menu overlap:

- 19 route/component fixture cases, including separate tutor/student signup, dashboards/session lists, complete registration, account settings, discovery, profile/editor, booking review and actual Terms/Privacy components.
- Widths **320, 360, 390, 430, 600, 768, 1024, 1280, 1440, 1920px**, plus intermediate **900 and 1100px**, at 900px height: 456 checks across light/dark.
- **844×390 landscape:** 38 checks across both themes.
- **320px width with 200% root text sizing:** 38 checks across both themes.
- Four additional native menu Enter-activation/expanded-layout assertions (public/protected navigation, light/dark) passed within those cases. Escape handler behavior is tested separately in Node; static fixtures do not attach React event listeners.
- Wide-screen calendar containment was checked separately within the matrix: no unnecessary calendar overflow in the 1920px fixtures.

The 320px matrix is useful reflow evidence corresponding to a 1280px viewport reduced to 400% effective width. **Actual browser UI zoom at 200%/400% was not performed**; 200% root text sizing and CSS viewport emulation are distinct tests. Fixtures use Arial fallback, not proof of final production Inter font metrics. Browser screens are synthetic stress-data states, not real accounts.

During validation, the harness's landing CSS-module mapping was corrected and affected checks were repeated. The final matrix replaced intermediate diagnostic results. The original before-editor measurement was captured using baseline source/build before the new build; it did not depend on the landing module. Screenshot scroll positions differ and are not pixel-diff comparisons.

### Artifacts and reproduction

- [Final measurements](responsive-artifacts/after-results.json) and [browser/build context](responsive-artifacts/after-environment.json).
- [Original editor overflow measurement](responsive-artifacts/before-results.json).
- [Before editor, 390px](responsive-artifacts/before-tutor-editor-light-390.png).
- [After editor, 390px](responsive-artifacts/after-tutor-editor-light-390.png).

The retained editor comparison and three JSON files provide public representative evidence. Additional synthetic calendar, discovery and booking screenshots have been preserved in the private review archive and retired from the current tree; their numerical coverage remains in the measurement JSON. The source audit visually reviewed representative editor, calendar and booking screenshots as well as numerical measurements.

From frontend, after building with reviewed synthetic settings:

```powershell
node --experimental-strip-types --test tests/*.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
node node_modules/next/dist/bin/next build
node scripts/responsive-audit.mjs
```

The browser script requires installed Chrome at its documented Windows path and local browser/server permissions. Its --quick mode is diagnostic only and overwrites the after-results file; always use a full run for final evidence. --before reads HEAD source and requires CSS built from the same baseline; do not combine baseline source with a modified build and call it a before comparison. The script opens a fresh isolated Chrome profile, blocks provider/API hosts and stops its own browser/local fixture server. Build/test caches stay under ignored .next. No live signup, profile save, booking or provider operation is invoked.

## Files modified

- app/globals.css and app/(landing)/landing.module.css
- app/(protected)/student/layout.tsx and app/(protected)/tutor/layout.tsx
- app/(protected)/tutor/profile/page.tsx
- app/tutors/(main page)/page.tsx and app/tutors/[id]/page.tsx
- components/AvailabilityControls.tsx (new)
- components/AccountSettings.tsx
- components/BookingRequest.tsx, BookingDetails.tsx and BookingList.tsx
- components/LandingNav.tsx, MobileMenu.tsx, ProtectedStudentNav.tsx and ProtectedTutorNav.tsx
- components/SiteFooter.tsx
- components/SubjectsYouTeach.tsx, TutorCard.tsx, TutorLocationBadges.tsx and TutorRateEditor.tsx
- components/auth-layout.ts
- scripts/responsive-audit.mjs (new)
- tests/responsive-controls.mjs (new)
- This report and docs/responsive-artifacts evidence

Application paths above are relative to frontend. No dependencies/lockfiles, backend source, migration, environment file, API contract or booking calculation changed.

## Remaining browser-only checks and limitations

No page-level overflow remains in the measured synthetic matrix. This does not establish every real device/state, full WCAG conformance or completed authenticated end-to-end acceptance. Remaining checks:

- Real iOS Safari/Android Chrome, portrait/landscape, on-screen keyboard and browser text/zoom settings; ensure native date/select UI and caret/value presentation remain usable.
- Actual Next hydration and focus restoration, sticky sidebar behavior, long open menus, filter expand/collapse, subject popover flipping and keyboard progression. Native menu Enter and Node handler checks are narrower evidence.
- Actual Google Places widget/predictions/branding/clear/selection, map controls/info windows and map loading/failure: **Google components are mocked in the fixture matrix**. No Google request or branding audit was performed in this task; existing widget internals/attribution were not changed.
- Real Inter fonts, screen-reader announcements and contrast audits in both themes. Dark fixture emulation and screenshot review are not an automated WCAG 2.2 AA certification. Some public surfaces intentionally retain the existing light brand treatment rather than a new site-wide dark redesign.
- Actual provider email delivery, expired authentication, profile persistence, booking approval/cancellation and meeting-link authorization. Existing Node regressions cover selected boundaries, not all live workflows. Use only separately approved controlled accounts/environment for those tests.
- Fixture lists include long names/subjects/emails and legacy bookings; not every loading/network-error/empty combination of every page was rendered in Chrome. Existing source states and auth/booking error tests were reviewed. Validate no-results, API outage, policies unavailable, many records, many subjects and unverified/incomplete sessions manually.
- Four existing lint warnings and pre-existing text-encoding artifacts in some copy remain; no unrelated content rewrite was attempted.

## Manual visual acceptance checklist

- [ ] At 320/360/390/430px: no body horizontal scrollbar; logo/menu visible; fields, cards, badges and notices wrap without losing information.
- [ ] At 600/768/900/1024/1100px: filter disclosure works; active filters remain visible; hero note and profile sections have comfortable widths.
- [ ] At 1280/1440/1920px: desktop sidebar/navigation, card/rate alignment and bounded content remain consistent; calendars do not scroll unnecessarily on spacious screens.
- [ ] Repeat portrait/landscape, 200% text and actual 200%/400% browser zoom; allow normal vertical scrolling. How it works remains reachable.
- [ ] Keyboard: open/close menu, Escape return focus, filter disclosure, subject choices, native schedule/date controls, every calendar toggle and paging button, rate/intro/About saves, booking actions.
- [ ] Test long names, full email/contact links, 50 subjects, no subjects, empty search/session lists, many historical bookings, missing snapshots, loading, errors and expired sessions.
- [ ] Light/dark: readable text, controls, badges, status notices and focus indicators; independently check Google attribution/prediction visibility and maps.
- [ ] On mobile keyboard: email/password/OTP, date/time, intro/About, custom subject, rate, meeting URL and location selection remain reachable and scroll correctly.
- [ ] In an approved isolated environment only: verify unchanged login/signup/verification/recovery, tutor saves, filters/location resolution, availability save, stale quote refresh, booking creation/confirmation/cancellation and history. No such live operations were executed here.

Frontend improvements and isolated validation are complete. Remaining real-device, hosted-widget and authenticated acceptance is explicitly deferred; nothing was committed or released.
