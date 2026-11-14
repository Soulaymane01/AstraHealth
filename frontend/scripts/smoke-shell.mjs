/**
 * Phase 2 shell smoke test.
 *
 * Requires the local stack: Postgres, the API, the web app, and the demo seed.
 * Run from `frontend/`:
 *
 *   npm run smoke
 */
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

const base = process.env.ASTRA_WEB_URL ?? "http://localhost:5173";
const out = process.env.ASTRA_OUT_DIR ?? path.resolve(process.cwd(), "../docs/screenshots");
fs.mkdirSync(out, { recursive: true });

const failures = [];
function check(name, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
  if (!condition) failures.push(name);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (
    message.type() === "error" &&
    !message.text().includes("401 (Unauthorized)") &&
    !message.text().includes("ERR_INTERNET_DISCONNECTED")
  ) {
    errors.push(message.text());
  }
});

// Login screen
await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(out, "login.png"), fullPage: true });

// Sign in
await page.fill("#email", "commander@astra.space");
await page.fill("#password", "astra-demo");
await Promise.all([
  page.waitForURL(`${base}/`, { timeout: 15000 }),
  page.click("button[type=submit]"),
]);
await page.waitForTimeout(5500);
await page.screenshot({ path: path.join(out, "shell.png"), fullPage: true });

let body = await page.textContent("body");
check("greeting", /Good (morning|afternoon|evening)/.test(body ?? ""));
check("readiness ring", Boolean(body?.includes("Readiness")));
check("active alerts", Boolean(body?.includes("Needs attention")));
check("countermeasure cards", Boolean(body?.includes("Countermeasure")));
check("MET clock", Boolean(body?.includes("MET")));
check(
  "primary navigation",
  Boolean(body?.includes("Systems Check") && body?.includes("Telemetry")),
);
check("body systems", Boolean(body?.includes("Body systems")));
check("domain detail", Boolean(body?.includes("Domain score")));
check("mission tape", Boolean(body?.includes("Mission tape")));
check("space weather banner", Boolean(body?.includes("Space weather")));
check("demo data badge", Boolean(body?.includes("Demo")));

await page.getByRole("button", { name: "7 days" }).click();
await page.waitForTimeout(600);
body = await page.textContent("body");
check("tape 7-day view", Boolean(body?.includes("Last 7 days")));

// Telemetry index
await page.click("a[href='/telemetry']");
await page.waitForTimeout(1000);
body = await page.textContent("body");
check("telemetry catalog", Boolean(body?.includes("Every metric, in context.")));
check(
  "telemetry domains",
  Boolean(body?.includes("Cardiovascular") && body?.includes("Sleep & circadian")),
);
await page.screenshot({ path: path.join(out, "telemetry.png"), fullPage: true });

// Domain summary
await page.getByRole("link", { name: "Open domain" }).first().click();
await page.waitForTimeout(1000);
body = await page.textContent("body");
check(
  "domain summary",
  Boolean(body?.includes("Domain summary") && body?.includes("Domain readiness")),
);
check("domain metrics", Boolean(body?.includes("Heart rate") && body?.includes("HRV (RMSSD)")));
await page.screenshot({ path: path.join(out, "domain.png"), fullPage: true });

// Metric detail
await page.getByRole("link", { name: /HRV/ }).first().click();
await page.waitForTimeout(1500);
body = await page.textContent("body");
check(
  "metric detail",
  Boolean(body?.includes("Metric detail") && body?.includes("Latest reading")),
);
check("metric chart", (await page.locator(".recharts-line-curve").count()) > 0);
check("metric events", Boolean(body?.includes("Events in this range")));
await page.screenshot({ path: path.join(out, "metric.png"), fullPage: true });

// Range and band state are preserved in the URL.
await page.getByRole("button", { name: "7 days" }).click();
await page.waitForTimeout(900);
const sevenDayUrl = page.url();
await page.getByRole("button", { name: "Spaceflight range" }).click();
await page.waitForTimeout(900);
await page.getByRole("button", { name: "90 days" }).click();
await page.waitForTimeout(1200);
check(
  "range and band preserved",
  sevenDayUrl.includes("days=7") &&
    page.url().includes("days=90") &&
    page.url().includes("band=reference"),
);
check("chart after range switch", (await page.locator(".recharts-line-curve").count()) > 0);
await page.screenshot({ path: path.join(out, "metric-reference.png"), fullPage: true });

// CSV export
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: /Export CSV/ }).click();
const download = await downloadPromise;
check(
  "csv export",
  download.suggestedFilename().startsWith("astrahealth-") &&
    download.suggestedFilename().endsWith(".csv"),
);

// Library and Flight Surgeon
await page.goto(`${base}/library`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
body = await page.textContent("body");
check(
  "library index",
  Boolean(body?.includes("The evidence behind the numbers.") && body?.includes("9 articles")),
);
check("library sources", Boolean(body?.includes("NASA Human Research Program")));
await page.getByRole("button", { name: "Cardiovascular", exact: true }).click();
await page.waitForTimeout(300);
check("library domain filter", page.url().includes("domain=Cardiovascular"));
body = await page.textContent("body");
check("library filter count", Boolean(body?.includes("2 articles")));
await page.screenshot({ path: path.join(out, "library.png"), fullPage: true });

await page.getByRole("button", { name: /Why HRV falls before you feel tired/ }).click();
await page.waitForTimeout(800);
body = await page.textContent("body");
check(
  "article detail",
  page.url().endsWith("/library/hrv-basics") && Boolean(body?.includes("21-day baseline")),
);
check(
  "article source card",
  Boolean(body?.includes("min read") && body?.includes("NASA Human Research Program")),
);
await page.screenshot({ path: path.join(out, "article.png"), fullPage: true });

await page.getByRole("button", { name: "Ask the Flight Surgeon" }).click();
await page.waitForTimeout(1200);
body = await page.textContent("body");
check(
  "assistant drawer",
  Boolean(body?.includes("Cited guidance, not a diagnosis.") && body?.includes("Why is my HRV low?")),
);
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
check(
  "assistant closes on Escape",
  (await page.locator("[role=dialog]").count()) === 0 &&
    (await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))) ===
      "Ask the Flight Surgeon",
);
await page.getByRole("button", { name: "Ask the Flight Surgeon" }).click();
await page.waitForTimeout(900);
await page.getByRole("button", { name: "Why is my HRV low?" }).click();
await page.waitForTimeout(1500);
body = await page.textContent("body");
check(
  "assistant cited answer",
  Boolean(body?.includes("HRV") && body?.includes("Why HRV falls before you feel tired")),
);
await page.screenshot({ path: path.join(out, "assistant.png"), fullPage: true });

await page.getByPlaceholder("Ask the Flight Surgeon…").fill(
  "Diagnose my chest pain and prescribe a dose.",
);
await page.getByRole("button", { name: "Send question" }).click();
await page.waitForTimeout(1500);
body = await page.textContent("body");
check(
  "assistant refusal",
  Boolean(body?.includes("can't diagnose") && body?.includes("flight surgeon")),
);
check("assistant refusal citation", Boolean(body?.includes("When to contact the flight surgeon")));
await page.screenshot({ path: path.join(out, "assistant-refusal.png"), fullPage: true });
await page.getByRole("link", { name: "When to contact the flight surgeon" }).click();
await page.waitForTimeout(800);
check(
  "assistant citation navigates",
  page.url().endsWith("/library/red-flags") &&
    (await page.locator("[role=dialog]").count()) === 0,
);
body = await page.textContent("body");
check(
  "red-flag article",
  Boolean(body?.includes("When to contact the flight surgeon") && body?.includes("Escalate now")),
);

// Crew
await page.goto(`${base}/crew`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
body = await page.textContent("body");
check("crew board", Boolean(body?.includes("Crew board") && body?.includes("Consistency")));
check("crew privacy", Boolean(body?.includes("Sharing") && body?.includes("Status only")));
check(
  "crew no messaging",
  Boolean(body?.includes("no in-app chat") && body?.includes("No message is sent")),
);
await page.screenshot({ path: path.join(out, "crew.png"), fullPage: true });

// Mission log
await page.goto(`${base}/log`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
body = await page.textContent("body");
check("mission log", Boolean(body?.includes("Mission rank") && body?.includes("Credit ledger")));
check(
  "mission log feed",
  Boolean(
    body?.includes("Activity") &&
    body?.includes("Mission allowances") &&
    body?.includes("Achievements"),
  ),
);
await page.screenshot({ path: path.join(out, "log.png"), fullPage: true });

// Quizzes
await page.goto(`${base}/quizzes`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
body = await page.textContent("body");
check("quizzes", Boolean(body?.includes("Know yourself") && body?.includes("Know your crew")));
await page.screenshot({ path: path.join(out, "quizzes.png"), fullPage: true });

await page.getByRole("button", { name: /Know yourself: sleep/ }).click();
await page.waitForTimeout(400);
body = await page.textContent("body");
check("quiz intro", Boolean(body?.includes("Start quiz") && body?.includes("5 questions")));
await page.getByRole("button", { name: "Start quiz" }).click();
await page.waitForTimeout(300);
const quizAnswers = [
  /7–9 hours/,
  /Rising autonomic strain/,
  /2\.0–3\.0 L/,
  /Chest pain with shortness of breath/,
  /Regular resistance exercise/,
];
for (let index = 0; index < quizAnswers.length; index += 1) {
  await page.getByRole("button", { name: quizAnswers[index] }).click();
  await page
    .getByRole("button", {
      name: index === quizAnswers.length - 1 ? "Submit quiz" : "Next question",
    })
    .click();
  await page.waitForTimeout(250);
}
await page.waitForTimeout(1000);
body = await page.textContent("body");
check("quiz result", Boolean(body?.includes("Quiz result") && body?.includes("100%")));
check("quiz review", Boolean(body?.includes("Review") && body?.includes("source explanation")));
await page.screenshot({ path: path.join(out, "quiz-result.png"), fullPage: true });

// Training plan, roster, and session logging
await page.goto(`${base}/training`, { waitUntil: "networkidle" });
await page.waitForTimeout(1100);
body = await page.textContent("body");
check(
  "training plan",
  Boolean(body?.includes("Training plan") && body?.includes("Daily countermeasures")),
);
check("training roster", Boolean(body?.includes("Today's roster") && body?.includes("Next due")));
await page.screenshot({ path: path.join(out, "training.png"), fullPage: true });

const trainingPanel = page.locator("section").filter({ hasText: "Training plan" }).first();
await trainingPanel.getByRole("button", { name: "Log" }).first().click();
await page.waitForTimeout(350);
body = await page.textContent("body");
check(
  "training log form",
  Boolean(body?.includes("Perceived exertion") && body?.includes("Save session")),
);
await page.screenshot({ path: path.join(out, "training-log.png"), fullPage: true });
await page.getByRole("button", { name: "6", exact: true }).click();
await page.getByRole("button", { name: "Save session" }).click();
await page.waitForTimeout(1500);
body = await page.textContent("body");
check("training session saved", Boolean(body?.includes("Session logged")));

await page.goto(`${base}/training?item=sleep-hygiene`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
body = await page.textContent("body");
check(
  "training countermeasure",
  Boolean(body?.includes("Log Sleep wind-down") && body?.includes("Countermeasure for")),
);
await page.screenshot({ path: path.join(out, "training-countermeasure.png"), fullPage: true });

// Mobile drawer
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(out, "mobile.png"), fullPage: true });
await page.click("button[aria-label='Open navigation']");
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(out, "mobile-menu.png") });
body = await page.textContent("body");
check("mobile drawer", Boolean(body?.includes("Mission Log")));
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
check("mobile drawer closes on Escape", (await page.locator("[role=dialog]").count()) === 0);

// Refresh-token recovery: valid refresh token, corrupt access token.
await page.setViewportSize({ width: 1440, height: 1000 });
await page.evaluate(() => localStorage.setItem("astra.access_token", "invalid-token"));
await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
body = await page.textContent("body");
check("refresh-token recovery", page.url() === `${base}/` && Boolean(body?.includes("Readiness")));

// Expired session: both tokens invalid, expect a single redirect to /login.
await page.evaluate(() => {
  localStorage.setItem("astra.access_token", "invalid");
  localStorage.setItem("astra.refresh_token", "invalid");
});
await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.waitForURL("**/login", { timeout: 10000 });
check("expired session redirect", page.url().endsWith("/login"));

// Sign in again, then exercise the Systems Check and report.
await page.fill("#email", "commander@astra.space");
await page.fill("#password", "astra-demo");
await Promise.all([
  page.waitForURL(`${base}/`, { timeout: 15000 }),
  page.click("button[type=submit]"),
]);
await page.waitForTimeout(800);

await page.goto(`${base}/check-in`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
if (
  await page
    .getByText("Resume your check-in?")
    .isVisible()
    .catch(() => false)
) {
  await page.getByRole("button", { name: "Start fresh" }).click();
  await page.waitForTimeout(300);
}
body = await page.textContent("body");
check("check-in wizard", Boolean(body?.includes("A two-minute read on your body.")));
check("check-in progress", Boolean(body?.includes("Step 1 of 5")));
check("check-in why we ask", Boolean(body?.includes("Why we ask")));
await page.screenshot({ path: path.join(out, "checkin.png"), fullPage: true });

await page.getByRole("button", { name: "Measure", exact: true }).click();
await page.waitForTimeout(2500);
body = await page.textContent("body");
check(
  "camera fallback",
  Boolean(body?.includes("Camera pulse") && body?.includes("heart-rate field")),
);
check(
  "manual heart rate remains enabled",
  await page.locator("#metric-heart_rate").isEnabled(),
);
await page.screenshot({ path: path.join(out, "checkin-camera.png"), fullPage: true });

await page.fill("#metric-heart_rate", "72");
await page.fill("#metric-body_temp_c", "36.8");
await page.getByRole("button", { name: /Continue/ }).click();
await page.waitForTimeout(400);
await page.fill("#metric-sleep_duration_h", "5.4");
await page.fill("#metric-sleep_efficiency_pct", "76");
await page.getByRole("button", { name: /Continue/ }).click();
await page.waitForTimeout(400);
await page
  .locator("[role=group]")
  .nth(0)
  .getByRole("button", { name: "2 — Low", exact: true })
  .click();
await page
  .locator("[role=group]")
  .nth(1)
  .getByRole("button", { name: "4 — High", exact: true })
  .click();
await page.getByRole("button", { name: /Continue/ }).click();
await page.waitForTimeout(400);
body = await page.textContent("body");
check("check-in symptoms", Boolean(body?.includes("Tap a region")));
await page.screenshot({ path: path.join(out, "checkin-symptoms.png"), fullPage: true });
await page.getByRole("button", { name: "No symptoms today" }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: "Skip and complete" }).click();
await page.waitForURL("**/check-in/report/*", { timeout: 20000 });
await page.waitForTimeout(1800);
body = await page.textContent("body");
check("systems report", Boolean(body?.includes("Check-in complete.")));
check("report action", Boolean(body?.includes("Recommended next action")));
check("report credits", Boolean(body?.includes("+40")));
check("report factors", Boolean(body?.includes("Top factors")));
check("report rank", Boolean(body?.includes("Mission rank")));
check("report streak", Boolean(body?.includes("Systems Check streak")));
await page.screenshot({ path: path.join(out, "report.png"), fullPage: true });

// Camera-source metadata survives the check-in pipeline.
const cameraMeta = await page.evaluate(async () => {
  const token = localStorage.getItem("astra.access_token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const created = await fetch("http://localhost:8000/checkins", {
    method: "POST",
    headers,
    body: JSON.stringify({
      entries: [
        {
          metric_code: "heart_rate",
          value: 71,
          meta: { source: "camera_rppg", confidence: 0.84 },
        },
      ],
    }),
  });
  if (!created.ok) return { ok: false, status: created.status };
  const list = await fetch("http://localhost:8000/measurements?metric=heart_rate", { headers });
  const measurements = await list.json();
  const latest = measurements[measurements.length - 1];
  return { ok: true, source: latest.source, confidence: latest.confidence };
});
check(
  "camera-source metadata stored",
  cameraMeta.ok && cameraMeta.source === "camera_rppg" && cameraMeta.confidence === 0.84,
);

// Offline check-in queue: submit without a connection, then sync on reconnect.
const offlineMarker = `offline-smoke-${Date.now()}`;
await page.goto(`${base}/check-in`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
if (
  await page
    .getByText("Resume your check-in?")
    .isVisible()
    .catch(() => false)
) {
  await page.getByRole("button", { name: "Start fresh" }).click();
  await page.waitForTimeout(300);
}
await page.fill("#metric-heart_rate", "70");
await page.fill("#checkin-notes", offlineMarker);
await page.context().setOffline(true);
await page.waitForTimeout(400);
body = await page.textContent("body");
check("offline banner appears", Boolean(body?.includes("Offline.")));
await page.getByRole("button", { name: /Continue/ }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Skip this step" }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Skip this step" }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "No symptoms today" }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Skip and complete" }).click();
await page.waitForTimeout(900);
body = await page.textContent("body");
check(
  "offline check-in queued",
  Boolean(body?.includes("Check-in saved on this device") && body?.includes("exactly once")),
);
check("offline queue count", Boolean(body?.includes("1 check-in queued")));
await page.screenshot({ path: path.join(out, "offline-queue.png"), fullPage: true });

await page.context().setOffline(false);
await page.waitForURL(`${base}/`, { timeout: 20000 });
await page.waitForTimeout(1500);
body = await page.textContent("body");
check("offline banner clears after sync", !body?.includes("waiting to sync"));
const offlineSynced = await page.evaluate(async (marker) => {
  const token = localStorage.getItem("astra.access_token");
  const response = await fetch("http://localhost:8000/checkins?limit=100", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const checkins = await response.json();
  return checkins.filter((checkin) => (checkin.notes ?? "").includes(marker)).length;
}, offlineMarker);
check("offline check-in synced exactly once", offlineSynced === 1);

await page.goto(`${base}/styleguide`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
check("demo mode hides styleguide", page.url() === `${base}/`);

await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

if (process.env.ASTRA_TEST_PWA === "1") {
  await page.evaluate(() => navigator.serviceWorker?.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, {
    timeout: 15000,
  });
  await page.context().setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  body = await page.textContent("body");
  check(
    "offline shell reload",
    Boolean(body?.includes("AstraHealth") && body?.includes("Flight Deck")),
  );
  await page.screenshot({ path: path.join(out, "offline-shell.png"), fullPage: true });
  await page.context().setOffline(false);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
}

await page.click("button[aria-label='Sign out']");
await page.waitForURL("**/login", { timeout: 10000 });
check("logout", page.url().endsWith("/login"));

check("no unexpected console errors", errors.length === 0);
if (errors.length) console.error(errors);

await browser.close();

if (failures.length) {
  console.error(`\n${failures.length} smoke check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll smoke checks passed.");
}
