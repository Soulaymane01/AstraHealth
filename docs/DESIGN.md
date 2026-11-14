# Design System

**Concept:** *A quieter flight deck.* The astronaut is the most critical system on the mission, but the interface should feel calm, legible, and low-effort — not like a cockpit.

The design system lives in code:

- Tokens — `frontend/src/styles/index.css`
- Primitives — `frontend/src/components/ui/`
- Live reference — `/styleguide`
- Status semantics — `frontend/src/lib/status.ts`

---

## 1. Principles

1. **One clear answer first.** Readiness and the current state are visible before any detail.
2. **Calm by default.** Off-white surfaces, one accent, no glows, no scan effects, no ambient motion.
3. **Status is never color alone.** Every status carries a color, an icon or dot, and a word.
4. **Explain the score.** Factors and fired rules are one click away. No black-box health judgment.
5. **Guidance, not diagnosis.** Copy escalates red flags and never prescribes treatment.
6. **Built for a gloved hand.** 48 px targets, no hover-only information, high contrast, reduced-motion support.
7. **Offline is a state, not an error.** Stale and queued data are labeled, never silently faked.

---

## 2. Tokens

| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `#F4F6F8` | App background |
| `--color-surface` | `#FFFFFF` | Cards, panels, inputs |
| `--color-surface-muted` | `#F0F3F6` | Inset wells, secondary blocks |
| `--color-line` | `#E2E8EF` | Borders and dividers |
| `--color-line-strong` | `#CBD5E1` | Emphasized borders |
| `--color-ink` | `#0F1B2D` | Primary text |
| `--color-ink-2` | `#526175` | Secondary text |
| `--color-muted` | `#5F6F82` | Metadata and captions |
| `--color-accent` | `#0F766E` | Primary actions, progress, links |
| `--color-accent-strong` | `#0B5F59` | Accent hover |
| `--color-accent-soft` | `#E6F4F2` | Accent tint, selected rows |
| `--color-nominal` | `#15803D` | Nominal status |
| `--color-watch` | `#B45309` | Watch status |
| `--color-caution` | `#C2410C` | Caution status |
| `--color-critical` | `#B91C1C` | Critical status |
| `--color-unknown` | `#55657A` | No-data status |

Status tints (`*-soft`) are used only as pill or badge backgrounds. The palette is intentionally narrow: one accent for interaction, four semantic colors for health state.

---

## 3. Typography

| Role | Family | Notes |
|---|---|---|
| Display and interface | Geist Variable | Headlines, section titles, body, labels |
| Telemetry | Geist Mono Variable | Numbers, units, MET, credits |

Rules:

- One sans family for hierarchy. Weight and size carry the difference, not a second display face.
- Telemetry numbers use `font-mono` and `tabular` so values do not shift width.
- Labels are sentence case. No wide-tracked uppercase eyebrows.
- Body copy is 13–15 px with `leading-relaxed`.
- No more than three type sizes in one panel.

---

## 4. Status semantics

| Status | Meaning | Icon | Behavior |
|---|---|---|---|
| Nominal | Within your baseline | Check circle | Static |
| Watch | Slightly outside baseline | Eye | Static |
| Caution | Action recommended | Triangle | Static |
| Critical | Contact the flight surgeon | Octagon | Static; red is reserved for this state |
| Unknown | Not enough measurements | Question circle | Dashed border, never inferred |

A status appears as a dot or icon, a word, and a color. In dense rows, the dot may replace the icon only when the row also has a text label or accessible name.

The readiness ring uses the teal accent for Nominal, Watch, and Caution, and turns red only for Critical. This keeps the screen calm while still making an emergency unmistakable.

---

## 5. Components

| Component | File | Purpose |
|---|---|---|
| `Panel` | `Panel.tsx` | White card with optional header, subtitle, and actions |
| `StatusPill`, `StatusBadge`, `StatusDot`, `StatusLegend` | `Status.tsx` | Status semantics |
| `Button` | `Button.tsx` | Action hierarchy |
| `Sparkline` | `Sparkline.tsx` | Inline trend, thin line, no fill by default |
| `TelemetryNumber` | `TelemetryNumber.tsx` | Tabular number, short count-up |
| `ReadinessRing` | `ReadinessRing.tsx` | Composite score |
| `MetricCard` | `MetricCard.tsx` | Single metric with trend |
| `DomainRail` | `DomainRail.tsx` | Domain row with score and progress bar |
| `AnomalyCard` | `AnomalyCard.tsx` | Alert with rationale and action |
| `MissionTape` | `MissionTape.tsx` | Event timeline |
| `StepIndicator` | `StepIndicator.tsx` | Compact progress primitive |
| `ScaleInput` | `ScaleInput.tsx` | 1–5 self-report scale |
| `CheckinProgress` | `features/checkin/components/CheckinProgress.tsx` | Five ring segments and a labelled progress bar |
| `MetricInput` | `features/checkin/components/MetricInput.tsx` | Large-touch metric field with unit and inline errors |
| `OptionalScale` | `features/checkin/components/OptionalScale.tsx` | Clearable 1–5 scale with low/high anchors |
| `SymptomStep` | `features/checkin/components/SymptomStep.tsx` | Region, symptom, severity, duration, and logged list |
| `SymptomBodyMap` | `features/checkin/components/SymptomBodyMap.tsx` | Front/back body map with six symptom regions |
| `WhyWeAsk` | `features/checkin/components/WhyWeAsk.tsx` | Per-step rationale with an HRP source |
| `AnatomyMap` | `AnatomyMap.tsx` | 70+ region anatomical body map with front/back views |
| `MetricChart` | `features/telemetry/components/MetricChart.tsx` | Time-scaled line with band and event guides |
| `EventRail` | `features/telemetry/components/EventRail.tsx` | Aligned event dots, legend, and accessible event list |
| `SegmentedControl` | `features/telemetry/components/SegmentedControl.tsx` | Range and comparison-band toggle |
| `MetricSummaryCard` | `features/telemetry/components/MetricSummaryCard.tsx` | Domain metric card with sparkline and baseline |
| `AchievementTile` | `features/gamification/components/AchievementTile.tsx` | Locked/unlocked commendation with icon |
| `StreakTile` | `features/gamification/components/StreakTile.tsx` | Current/longest streak, milestone, and grace state |
| `PlanItemCard` | `features/training/components/PlanItemCard.tsx` | Training or countermeasure progress with a log action |
| `LogSessionForm` | `features/training/components/LogSessionForm.tsx` | Duration and RPE session logging |
| `DutyRoster` | `features/training/components/DutyRoster.tsx` | Daily check-in, hydration, training, and sleep timeline |
| `ArticleCard` | `ArticleCard.tsx` | Knowledge preview |
| `RankBadge` | `RankBadge.tsx` | Rank, credits, progress |
| `RewardCard` | `RewardCard.tsx` | Mission allowance |
| `QuizCard` | `QuizCard.tsx` | Quiz entry point |
| `CopilotDrawer` | `CopilotDrawer.tsx` | Cited assistant surface |
| `MarkdownBody` | `MarkdownBody.tsx` | Article headings, lists, and inline emphasis |
| `PulseCamera` | `features/camera/PulseCamera.tsx` | Camera pulse measurement with explicit fallback |
| `MetClock` | `MetClock.tsx` | Mission elapsed time |

### AnatomyMap

- Uses the Apache-2.0 `body-muscles` SVG data: 70+ muscle regions across anterior and posterior views.
- Domain mapping: head and neck → neurobehavioral, chest → cardiovascular, abdominals → metabolic, shoulders/arms/back/legs/hands/feet → musculoskeletal, whole body → immune. Sleep is a schedule domain, not a region.
- Base body fill `#D8E3ED` with white separations; every domain carries a soft status tint, and the selected domain is stronger.
- Hovering a muscle raises its status color and shows the muscle name plus domain in the footer. Clicking selects the domain.
- The whole-body button selects the immune domain and draws a dashed halo.
- The SVG is a mouse enhancement. The Systems rows are the keyboard and screen-reader control surface.
- No scan sweep, grid, or ambient motion. The front/back toggle and selection are the only state changes.

---

## 6. Density and layout

- Maximum content width: 1152 px (`max-w-6xl`).
- Page padding: 24 px mobile, 32 px desktop.
- Card padding: 16–20 px.
- Gaps: 16 px between cards, 32–40 px between sections.
- Desktop Flight Deck: one 8/12 column for readiness and body, one 4/12 column for exceptions and today.
- Mobile: strict single column. No horizontal scrolling except the mission tape.

The design intentionally uses fewer panels than a traditional mission-control dashboard. If a detail can live behind a click, it does.

### 6.1 App shell

- Sidebar 240 px, fixed on desktop, hidden below 1024 px.
- Top bar 64 px, sticky, showing readiness, MET, crew count, and comms delay. A slim status strip sits under it only when the device is offline, a check-in is queued, or a queued item failed.
- Content max width 1152 px with 16–32 px padding.
- Mobile navigation is a 288 px drawer with a focus trap, Escape to close, and body scroll lock.
- Auth pages use a split layout on desktop and a single column on mobile.
- Active navigation uses a soft accent fill; no underlines, bars, or glow.

### 6.2 Flight Deck composition

- A space-weather banner sits above the grid when a recent event exists.
- Row 1: readiness and next action stacked on the left (8/12), exceptions on the right (4/12).
- Row 2: anatomical body map plus selected-domain detail on the left (7/12), systems and "Why this score?" on the right (5/12).
- Row 3: mission tape full width with a 7-day / 30-day toggle.
- The anatomical map uses 70+ muscle regions with front and back views. Head and neck map to neurobehavioral, chest to cardiovascular, abdominals to metabolic, shoulders/arms/back/legs to musculoskeletal, and the whole-body halo to immune. Sleep is a schedule domain, not a region.
- The selected-domain detail uses a light surface well, not a nested card.
- Exceptions are full cards with rationale, recommended action, guidance link, and acknowledgement.

### 6.3 Systems Check wizard

- Five steps: Vitals, Sleep, Mood & Stress, Symptoms, Training & Nutrition. The left column holds the active step; the right column holds the running summary, notes, credit preview, and "What happens next".
- Progress uses five small rings. Complete steps are nominal green with a check, the active step is accent teal, skipped steps are a muted dash, and a labelled progress bar sits underneath.
- Fields use large-touch inputs with a 24 px tabular value, unit, optional tag, and inline error. Scales are 1–5 with low/high anchors and an explicit Clear action.
- Every step has a "Why we ask" disclosure. The copy is condensed from the corresponding knowledge article and names the NASA HRP source.
- The symptoms step pairs a front/back body map with a keyboard-accessible region list. Selecting a region filters the symptom options; severity is a 1–10 row and duration is a chip set. Logged symptoms can be removed individually.
- "No symptoms today" records a clean symptom score without marking the step skipped. "Skip this step" clears the step and adds it to the check-in notes.
- A versioned draft is written to IndexedDB 400 ms after a change. Returning to the page prompts to resume or start fresh; submitting deletes it.
- The step change is a short opacity/translate transition (180 ms). Reduced motion removes it.
- Errors are inline and also summarized above the footer. The primary action is Continue, then Complete check-in on the last step.

### 6.4 Systems Report

- The recommended next action is the first panel: one sentence, one primary "Back to Flight Deck" action, and a caption naming the source (highest-severity alert, largest factor, or baseline).
- Left column: readiness ring, score delta in points, status transition, top three factors with SD context, and the notes/skipped-step record.
- Right column: credits earned, active alerts (severity, title, rationale), and the guidance disclaimer.
- If the engine cannot form a baseline, the readiness panel becomes an explicit "Insufficient data for a score" state. The readings, notes, and credits remain visible.
- The report never uses a red surface fill. Critical appears only as the ring arc, the status pill, and the alert dot.
- No celebration animation. The only motion is the readiness arc.

### 6.5 Telemetry

- `/telemetry` is the index: six domain cards with the current domain score, status, metric chips, and a link to the domain summary.
- `/telemetry/domain/:domain` shows the current domain score and a card for every metric. The cards carry the in-range sparkline, latest value, point count, delta, status, and baseline range. A range switch changes the charts without changing the current score; the page says so explicitly.
- `/telemetry/metric/:code` puts the latest reading first, then an 8/12 trend panel and a 4/12 sidebar with the personal baseline, spaceflight reference, and recent readings.
- The chart is a Recharts time-scaled line. It draws the selected band (personal baseline or spaceflight reference), the baseline median, and faint vertical guides for check-ins, training, alerts, and space weather. Alerts and weather use their semantic colors; the rest use low-opacity accents.
- The event rail sits under the chart, aligned to the plot area with the same y-axis width. It carries a legend and an expandable, scrollable event list. The rail is decorative; the list is the accessible equivalent.
- The range and comparison band live in the URL (`?days=30&band=baseline`). Browser back/forward and navigation from a domain card preserve the state.
- A missing baseline or reference range does not hide the chart. The selected band is simply absent and the caption explains what is needed.
- Empty ranges show the latest reading (if one exists outside the range), a Try 90 days action, and a Start a check-in action. The export button is disabled.
- CSV export writes the in-range points only: `measured_at,value,unit,source,confidence`.
- The chart also includes a screen-reader summary. The visual line is never the only source of the values.

### 6.6 Crew and motivation

- The Mission Log is the motivation hub: a `RankBadge`, streaks, a credit ledger, the activity feed, the one-time allowance catalog, and the achievement grid.
- Rank uses lifetime credited credits, not spendable balance, so a redemption never demotes the astronaut. The rank card shows the next rank and the percentage progress.
- The activity feed is a vertical timeline of check-ins, alerts, training sessions, achievements, and redemptions, newest first. Alerts keep their semantic status pill; the rest use quiet icon circles.
- The allowance catalog uses existing `RewardCard` states: available, locked with the exact shortfall, or redeemed. The redemption result updates the ledger, rank, and feed without a full reload.
- Achievements are compact tiles with an icon, name, description, and unlock date. Locked tiles use a dashed border and a lock icon, never a red or warning surface.
- A new achievement appears as a celebration panel on the check-in report and quiz result. There is no confetti or flash; the accent-soft surface and the unlock line carry the moment.
- The Crew page has a privacy control, a consistency board, and a privacy-filtered readiness roster. There is no in-app chat or nudge inbox; direct crew communication stays in the habitat.
- The crew board ranks consistency only. Consistency is 70% check-in coverage (target 7) plus 30% training coverage (target 5) over 14 days. No readiness field exists in the leaderboard schema, and no message is sent from the board.
- Crew readiness is a separate roster. `private` shows a lock and no status; `status_only` shows the status label and not the score; `full` shows both. The current user always sees their own score.
- The privacy control is a three-option segmented panel with a plain-language description. The change applies immediately to the roster and leaderboard.

### 6.7 Quizzes

- `/quizzes` lists the two quizzes as `QuizCard` buttons with mode, question count, best score, and retake state.
- The runner is one question at a time with a progress bar, large option rows, Back/Next, and a final Submit. Every option exposes `aria-pressed`.
- The crew quiz starts with a consent gate: a crewmate select populated only with `status_only` or `full` subjects. If no one is eligible, the Start action is disabled and the page says why.
- The result shows the score, correct count, credits awarded (first completion only), new achievements, and a review of every question with the selected answer, correct answer, and source explanation.
- The answer key is never present in the quiz detail response; it appears only after submission.

### 6.8 Training and Duty Roster

- The Training page starts with three compact stats: training adherence, next due, and training streak. Adherence counts the four prescribed training types only; daily countermeasures track separately.
- The weekly plan is generated from the mission profile and active alerts. Alert-linked items carry a quiet watch border, a **Countermeasure** pill, and the alert titles they address. They sort ahead of ordinary sessions.
- The plan is split into **Training plan** (resistance, aerobic, bone load, mobility) and **Daily countermeasures** (sleep, hydration, recovery, nutrition). Each card shows target/completed/remaining, a progress bar, duration, and a Log action.
- The alert cards on the Flight Deck and the Systems Report include a `Countermeasure` link. It deep-links to `/training?item=<code>` and opens the log form for that item.
- The log form is inline, not a modal: duration defaults to the item duration and RPE is a 1–10 button row. Saving awards 30 FC, updates the training streak, and refreshes the plan, roster, reminders, credits, and Mission Log.
- The Duty Roster is a vertical timeline: 07:00 Systems Check, 08:00 Hydration check, 10:00 Training, 21:30 Sleep wind-down. Status is done, due, or upcoming; the next due row gets a soft accent wash.
- The roster check-in detail names the mission profile's comms context; the lunar profile emphasizes bone loading. The profile label appears in the page header and the roster.
- The Training nav item shows a small count badge when items are due. The top bar shows the next due time and title on wide screens. Both use the lightweight `/training/reminders` endpoint.
- Recent sessions sit beside the roster. Empty plans and no-mission states explain the default profile instead of leaving a blank page.

### 6.9 Library, Flight Surgeon, and camera pulse

- `/library` lists nine HRP-sourced articles as `ArticleCard` buttons with domain, summary, read time, and source. Domain filters live in the URL (`?domain=Cardiovascular`) and the count is always visible. No article is hidden behind search.
- `/library/:slug` keeps the reading column at `max-w-3xl`, renders headings and lists with `MarkdownBody`, and closes with a source card: source name, full citation, and an external link. The breadcrumb returns to the filtered index.
- Inline guidance is a quiet text link, never a new panel: "Read the HRP guidance" on a metric, "Learn" on a training card, article links in every "Why we ask" disclosure, and "Read guidance" on alerts and the Systems Report.
- The Flight Surgeon opens from a stethoscope button in the top bar or from the Library. It is a right-side drawer at `max-w-md` with a dimmed backdrop, Escape to close, and body scroll lock. It reuses the `CopilotDrawer` presentation.
- The drawer greets with a scope statement, then offers up to three context-aware suggestions from active alerts. Answers are plain text, capped at 120 words, with citation chips that link to the article and close the drawer.
- Refusals and red-flag escalations use the same surface, not a modal or a red panel. The text names the flight surgeon and the escalation criteria. There is no typing animation and no streaming indicator; the pending state is one static line.
- The camera pulse card sits below the vitals fields, never in place of them. Idle state explains the 25-second measurement and says the manual field is always available. Requesting, loading, and measuring states show a mirrored preview, a labelled progress bar, and a cancel action.
- A result shows the BPM, signal quality, and confidence, with **Use this reading**, **Try again**, and close. Using it fills the heart-rate field and marks the measurement `source=camera_rppg` with confidence; editing the field manually clears that metadata.
- Camera errors are a quiet watch-toned well with one sentence and two actions: **Try again** and **Enter manually**. Permission denial, a missing device, a busy device, and a noisy signal all resolve to the same fallback path.
- The camera is optional. Nothing in the check-in depends on it, no video leaves the device, and the privacy line says so.

### 6.10 Offline, PWA, and recovery

- The production build registers a Workbox service worker. The app shell, route chunks, CSS, fonts, and icons are precached; API responses are deliberately not cached.
- The manifest uses the teal brand mark at 192 and 512 px and an apple-touch icon. The theme color is the light canvas, not the old dark console color.
- Each authenticated route is its own chunk. The Flight Deck loading state renders the real header immediately and reserves the readiness, body, and systems geometry, so data arrival does not move the page.
- Check-ins use React Query `networkMode: "always"` so the mutation runs even when the browser is offline. The mutation writes the payload to the `checkinQueue` IndexedDB store with the user id, timestamp, attempts, and the original idempotency key.
- The queue is per user. A different account on the same device sees an empty queue and cannot sync another user's check-ins.
- The offline banner is a slim watch-toned strip with an icon and one sentence. Offline: "The shell and check-in drafts stay on this device," plus the queued count and next comms window. Online with pending items: a `Sync now` action and the same window. Failed items: a `Discard failed` action.
- The next comms window is the next 30-minute boundary, shown as a local time. It is a mission-cadence cue; sync still starts immediately on reconnect, `online`, visibility, or the 60-second retry tick.
- A queued check-in replaces the wizard with a confirmation panel: what is stored, how many readings, when it was queued, the queue state, and the idempotency key. `Back to Flight Deck` leaves; `Try sync now` forces an attempt. Background sync returns to the Flight Deck and invalidates readiness, alerts, metrics, training, crew, and mission-log queries.
- A permanent 4xx sync failure marks the item `failed` rather than retrying forever. Network, 429, and 5xx failures stay pending with a retry message.
- Offline reload is supported by caching the last user profile. The shell and navigation render, and the Flight Deck shows a calm offline panel instead of a critical error.
- Every data view has a retry panel or inline retry. The panel names the view, keeps the primary action, and shows a secondary route back where one exists.
- Demo mode is on by default. The sidebar carries a small **Demo** pill with a tooltip explaining that the mission and crew are seeded, and the top-bar mission subtitle ends with **Simulated**. The design-system link is hidden and `/styleguide` redirects to the Flight Deck. `VITE_DEMO_MODE=false` restores both for development.
- A static boot splash paints the product name and "Mission health overview" before the app bundle is ready, then is removed after 500 ms. It is an overlay, so it does not shift the page, and it has no animation.

---

## 7. Shape and elevation

| Element | Radius |
|---|---|
| Buttons and inputs | 8 px |
| Cards and panels | 12 px |
| Pills and avatars | Full |

- Borders: 1 px `--color-line`.
- Shadow: `0 1px 2px rgba(15, 27, 45, 0.04)`. No heavy elevation.
- Status color is never used as a decorative surface fill.

---

## 8. Motion

| Motion | Duration | Easing |
|---|---|---|
| Hover and focus | 150 ms | ease-out |
| Readiness arc | 800 ms | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Number count-up | 600 ms | ease-out cubic |
| Domain progress bar | 500 ms | ease-out |

Rules:

- Animate only opacity, transform, and stroke dash values.
- No ambient loops, pulsing dots, scan sweeps, or breathing effects.
- Every animation is disabled or reduced under `prefers-reduced-motion`.
- No bounce anywhere except a future reward celebration, if added.

---

## 9. Accessibility

- Minimum interactive target: 24×24 CSS px, with 44–48 px preferred for primary actions and form controls.
- Visible `:focus-visible` ring on every control.
- No information available only on hover.
- Body text on canvas and surface meets WCAG AA; muted text is reserved for non-essential metadata.
- The body map's muscle SVG is a mouse enhancement; the Systems rows provide the accessible keyboard and screen-reader equivalent.
- The symptoms map repeats this pattern: the SVG is decorative and the region chips are the keyboard and screen-reader controls.
- Wizard inputs have explicit labels, units, `aria-invalid`, and error descriptions. The step progress exposes `role="progressbar"` with `aria-valuenow` and a text "Step X of 5".
- Scale buttons carry an accessible name that includes both the number and the anchor word, not the number alone.
- Skip and "No symptoms today" are separate actions: one records missing data, the other records a clean symptom report.
- The report uses real headings and a linear reading order: action, score, factors, notes, credits, rank, streak, alerts.
- Charts include a text summary in the surrounding panel. The telemetry chart has an `sr-only` summary, a recent-readings list, and an accessible event list.
- The privacy control announces its state with `aria-pressed`; the crew board never relies on color to identify rank or readiness. The page states that no message is sent.
- Quiz options are real buttons with `aria-pressed`; the consent select has an explicit label and the disabled Start action is explained in text.
- Training duration and RPE inputs have explicit labels; RPE buttons expose `aria-pressed`. The nav reminder badge has a descriptive `title`, and the next-due chip has a text label, not color alone.
- The mission-tape markers are decorative spans, not buttons; a screen-reader-only list states every event, and the Mission Log is the full interactive record. This also keeps dense marker clusters from becoming overlapping touch targets.
- The offline banner uses `role="status"` and `aria-live="polite"`. Queue state is always expressed in words as well as color.
- Reduced motion is respected globally.
- Lighthouse on the Flight Deck: performance 100 desktop / 99–100 mobile and accessibility 100 on both presets across verification runs. A static boot splash paints the largest content before the app bundle finishes, then is removed after 500 ms.

---

## 10. Theme

The current product is **light-only by design**. The brief is a calm clinical interface for a bright cabin or a well-lit habitat, and the previous dark console direction was rejected as too heavy.

A dark variant can be added later by swapping the semantic tokens under `[data-theme="dark"]`. Components must continue to use semantic tokens rather than raw colors so that switch remains a one-file change.
