// ============================================================================
// Boss for a Day - Virginia Ventures Module 8
// FOUNDATION SHELL  -  rebuilt to match the Market Harvest (m4) house style.
// This file sets up:
//   1. The economic CONSTANTS (kept; the stages will read these)
//   2. The house colors (cream / navy / gold / green)
//   3. The three score meters and the HUD that shows them
//   4. The IWSDK world: a walkable, lit space, with mouse-look + WASD/thumbstick
//   5. The hidden-panel click guard and a press helper (needed once panels exist)
//   6. The phase machine skeleton (Select -> Morning -> Midday -> Afternoon -> Close)
// The stations, the mentor, the panels, and the stage logic arrive in later prompts.
// ============================================================================

import {
  World,
  SessionMode,
  LocomotionEnvironment,
  EnvironmentType,
  VisibilityState,
  Pressed,
  PanelUI,
  PanelDocument,
  Interactable,
  Vector3,
  Box3,
} from "@iwsdk/core";

import { buildBaseWorld, buildShopProps, setStageLook, buildBeacon, buildCustomers, GUS_SPOT, STATIONS } from "./environment";
import { setActiveShop, activeShop, SHOPS, ShopId, ShopPack, ChoiceOption, ShopDecision, ECONOMY } from "./shops";
import { sfxStage, sfxClick, sfxCoin, sfxDown, sfxFanfare } from "./sfx";

// ============================================================================
// THE DAY'S LEDGER  (the real economy - money in vs. money out)
// You open the register with ECONOMY.startingCash and run the shop. Every buy is
// money out; every sale is money in. Net profit at close is simply in minus out.
// These totals are tracked independently of the on-screen number (which floors
// at $0), so the end-of-day report is always accurate. The morning pricing and
// stocking picks are remembered here so the two sales ticks can size themselves.
// ============================================================================
let dayStartCash = 0;   // the float you began the day with
let dayMoneyIn = 0;     // running total of everything earned today
let dayMoneyOut = 0;    // running total of everything spent today
let dayStarted = false; // guard so the day is only set up once per playthrough
let priceTier = "";     // "premium" | "fair" | "bargain" - set in the morning
let stockTier = "";     // "fancy" | "mix" | "bulk" - set in the morning
let flyerChosen = false; // true if the ad flyer growth move was bought
let dealChosen = false;  // true if the bulk-supply deal growth move was bought

// Every choice the student makes is logged here as it happens, so the daily
// report can recap the day, name the best call and the one to rethink, and hand
// the whole run to a teacher (localStorage / clipboard / postMessage). score is
// the choice's net effect on the meters - higher is a better call.
type Decision = { title: string; choice: string; feedback: string; score: number };
let dayDecisions: Decision[] = [];
function recordDecision(title: string, choice: string, feedback: string, score: number) {
  dayDecisions.push({ title, choice, feedback, score });
}

// Apply one option from a generic three-option ShopDecision (the Phase 4 beats):
// nudge the meters, move the register, and log the choice for the report.
function applyDecisionOption(opt: ChoiceOption, title: string) {
  if (opt.sat) updateScore("satisfaction", opt.sat);
  if (opt.profit) updateScore("profit", opt.profit);
  if (opt.instinct) updateScore("instinct", opt.instinct);
  if (opt.cash > 0) earn(opt.cash);
  else if (opt.cash < 0) spend(-opt.cash);
  else sfxClick();
  recordDecision(title, opt.label, opt.fb, opt.sat + opt.profit + opt.instinct);
}

// Wire a generic three-option beat: buttons prefix-opt0/1/2 fire the matching
// option, then onPicked advances the stage. getDecision is read at click time so
// the live shop's options drive the effects. First tap wins.
function wireDecisionBeat(
  doc: any,
  prefix: string,
  getDecision: () => ShopDecision,
  title: string,
  onPicked: () => void,
) {
  let picked = false;
  for (let i = 0; i < 3; i = i + 1) {
    const idx = i;
    doc.getElementById(prefix + "-opt" + idx)?.setProperties({
      onClick: function () {
        if (picked) return;
        picked = true;
        applyDecisionOption(getDecision().options[idx], title);
        onPicked();
      },
    });
  }
}

// Push a ShopDecision's words (eyebrow, question, three option labels) into its
// beat. Called from applyShopWords so each beat shows the chosen shop's wording.
function applyDecisionWords(doc: any, prefix: string, dec: ShopDecision) {
  doc.getElementById(prefix + "-eyebrow")?.setProperties({ text: dec.eyebrow });
  doc.getElementById(prefix + "-q")?.setProperties({ text: dec.q });
  for (let i = 0; i < 3; i = i + 1) {
    doc.getElementById(prefix + "-opt" + i + "-label")?.setProperties({ text: dec.options[i].label });
  }
}

// ============================================================================
// HOUSE PALETTE  (the Market Harvest colonial parchment look)
// Bright values are for graphics (bars). The TEXT_ values are darker,
// high-contrast versions for words on light backgrounds.
// ============================================================================
const COLOR_NAVY = "#1F3A5F";
const TEXT_GOLD = "#8a6118";
const TEXT_GREEN = "#2e7d32";
const TEXT_BLUE = "#1e5fa8";
const TEXT_CORAL = "#a23a1c";
const METER_SATISFACTION_COLOR = "#ee7a4f"; // Customer Satisfaction bar (coral)
const METER_PROFIT_COLOR = "#5fae4a";       // Business Profit bar (green)
const METER_INSTINCT_COLOR = "#3f9fd0";     // Owner's Instinct bar (blue)

// ============================================================================
// THREE METERS  (each starts at 50, the neutral middle, and moves 0..100)
// ============================================================================
const SCORE_MIN = 0;
const SCORE_MAX = 100;
let scoreSatisfaction = 50;
let scoreProfit = 50;
let scoreInstinct = 50;

function clampScore(value: number): number {
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, value));
}

// The one and only way to change a meter. meter is "satisfaction", "profit", or
// "instinct"; delta is positive to reward, negative to penalize.
function updateScore(meter: string, delta: number) {
  let before = 0;
  let after = 0;
  if (meter === "satisfaction") { before = scoreSatisfaction; after = clampScore(scoreSatisfaction + delta); scoreSatisfaction = after; }
  else if (meter === "profit") { before = scoreProfit; after = clampScore(scoreProfit + delta); scoreProfit = after; }
  else if (meter === "instinct") { before = scoreInstinct; after = clampScore(scoreInstinct + delta); scoreInstinct = after; }
  else { console.warn("updateScore: unknown meter " + meter); return; }
  console.log("[SCORE] " + meter + ": " + before + " to " + after);
  refreshHUD();
  if (meter === "satisfaction") bumpHudValue(hudSatisfactionValue);
  else if (meter === "profit") bumpHudValue(hudProfitValue);
  else bumpHudValue(hudInstinctValue);
}
void updateScore; // used by the stages in later prompts

// ============================================================================
// HUD  (a small panel pinned to the top-left, always showing the three meters)
// Built as a plain HTML overlay on top of the 3D canvas. pointerEvents is off
// so it never blocks a click. A matching 3D scoreboard for the headset is added
// with the panels in a later prompt.
// ============================================================================
let hudSatisfactionValue: HTMLElement | null = null;
let hudProfitValue: HTMLElement | null = null;
let hudInstinctValue: HTMLElement | null = null;
let hudSatisfactionFill: HTMLElement | null = null;
let hudProfitFill: HTMLElement | null = null;
let hudInstinctFill: HTMLElement | null = null;
let hudStageChip: HTMLElement | null = null;
let hudObjective: HTMLElement | null = null;
let hudPanel: HTMLElement | null = null;

// The in-day clock: Morning ▸ Midday ▸ Afternoon ▸ Closing, so the student feels
// the day's arc. Past parts go green, the current one gold, the rest are muted.
// The same active index feeds the in-VR dashboard's clock line.
let hudClockSegs: HTMLElement[] = [];
let stageClockIndex = -1;
const CLOCK_LABELS = ["Morning", "Midday", "Afternoon", "Closing"];

function buildClockRow(): HTMLElement {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "4px";
  row.style.margin = "0 0 9px";
  hudClockSegs = [];
  for (let i = 0; i < CLOCK_LABELS.length; i = i + 1) {
    if (i > 0) {
      const sep = document.createElement("span");
      sep.textContent = "▸";
      sep.style.color = "#c3b790";
      sep.style.fontSize = "10px";
      row.appendChild(sep);
    }
    const seg = document.createElement("span");
    seg.textContent = CLOCK_LABELS[i];
    seg.style.fontSize = "11px";
    seg.style.fontWeight = "700";
    seg.style.color = "#c3b790";
    seg.style.transition = "color 0.2s ease";
    hudClockSegs.push(seg);
    row.appendChild(seg);
  }
  return row;
}

function updateHudClock(activeIndex: number) {
  for (let i = 0; i < hudClockSegs.length; i = i + 1) {
    const seg = hudClockSegs[i];
    if (i === activeIndex) { seg.style.color = TEXT_GOLD; seg.style.fontWeight = "800"; }
    else if (i < activeIndex) { seg.style.color = TEXT_GREEN; seg.style.fontWeight = "700"; }
    else { seg.style.color = "#c3b790"; seg.style.fontWeight = "700"; }
  }
}

function makeHudMeter(label: string, barColor: string, textColor: string) {
  const row = document.createElement("div");
  row.style.marginBottom = "9px";

  // The label sits on its own line, so a long name like "Customer Satisfaction"
  // gets the full width and is never clipped. The bar and number go below it.
  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  labelEl.style.color = COLOR_NAVY;
  labelEl.style.fontWeight = "700";
  labelEl.style.fontSize = "12.5px";
  labelEl.style.display = "block";
  labelEl.style.marginBottom = "4px";

  const barRow = document.createElement("div");
  barRow.style.display = "flex";
  barRow.style.alignItems = "center";
  barRow.style.gap = "8px";

  const track = document.createElement("div");
  track.style.width = "120px";
  track.style.height = "12px";
  track.style.background = "#e4ddd0";
  track.style.borderRadius = "6px";
  track.style.overflow = "hidden";
  track.style.flexShrink = "0";

  const fill = document.createElement("div");
  fill.style.height = "100%";
  fill.style.width = "50%";
  fill.style.background = barColor;
  fill.style.borderRadius = "6px";
  fill.style.transition = "width 0.45s ease";
  track.appendChild(fill);

  const value = document.createElement("span");
  value.textContent = "50";
  value.style.color = textColor;
  value.style.fontWeight = "800";
  value.style.minWidth = "26px";
  value.style.textAlign = "right";
  value.style.transition = "transform 0.18s ease";

  barRow.appendChild(track);
  barRow.appendChild(value);
  row.appendChild(labelEl);
  row.appendChild(barRow);
  return { row, value, fill };
}

// Turn a #rrggbb color into a see-through rgba string, so the overlay keeps
// its soft translucent look instead of becoming a solid block.
function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

// Tint the corner overlay to the active shop: a translucent version of the
// shop's panel color, with the shop's border. The bars, money, and text keep
// their own colors.
function applyShopHudTheme(pack: ShopPack) {
  if (!hudPanel) return;
  hudPanel.style.background = hexToRgba(pack.theme.panelBg, 0.95);
  hudPanel.style.border = "2px solid " + pack.theme.panelBorder;
}

// Show a counter activity's meter changes in its result: one short line per
// meter that moved, green for a gain and red for a drop. Unchanged meters stay
// hidden. Shared by all three activities.
const DELTA_UP = "#2e7d32";
const DELTA_DOWN = "#b23a2e";

function setMeterChange(doc: any, id: string, label: string, delta: number) {
  const el = doc.getElementById(id);
  if (!el) return;
  if (!delta) {
    el.setProperties({ display: "none" });
    return;
  }
  el.setProperties({
    text: label + "   " + (delta > 0 ? "+" : "") + delta,
    color: delta > 0 ? DELTA_UP : DELTA_DOWN,
    display: "flex",
  });
}

function showMeterChanges(doc: any, sat: number, profit: number, instinct: number) {
  setMeterChange(doc, "change-sat", "Customer Satisfaction", sat);
  setMeterChange(doc, "change-profit", "Business Profit", profit);
  setMeterChange(doc, "change-instinct", "Owner's Instinct", instinct);
  flashHudDeltas(sat, profit, instinct);
}

// Desktop HUD: a small +/- badge beside each meter's number that flashes the
// change from a counter activity (green up, red down) and fades. These are
// on-screen DOM elements, so they appear on the laptop and are unused in the
// headset, where the floating dashboard already shows the meters.
let hudDeltaSat: HTMLElement | null = null;
let hudDeltaProfit: HTMLElement | null = null;
let hudDeltaInstinct: HTMLElement | null = null;

function makeDeltaBadge(valueEl: HTMLElement | null): HTMLElement | null {
  if (!valueEl) return null;
  const badge = document.createElement("span");
  badge.style.marginLeft = "8px";
  badge.style.fontWeight = "700";
  badge.style.fontSize = "13px";
  badge.style.opacity = "0";
  badge.style.transition = "opacity 0.3s ease";
  valueEl.insertAdjacentElement("afterend", badge);
  return badge;
}

function setupHudDeltas() {
  hudDeltaSat = makeDeltaBadge(hudSatisfactionValue);
  hudDeltaProfit = makeDeltaBadge(hudProfitValue);
  hudDeltaInstinct = makeDeltaBadge(hudInstinctValue);
}

function flashOneDelta(badge: HTMLElement | null, delta: number) {
  if (!badge) return;
  if (!delta) {
    badge.style.opacity = "0";
    return;
  }
  badge.textContent = (delta > 0 ? "+" : "") + delta;
  badge.style.color = delta > 0 ? "#2e7d32" : "#b23a2e";
  badge.style.opacity = "1";
  window.setTimeout(function () {
    badge.style.opacity = "0";
  }, 1800);
}

function flashHudDeltas(sat: number, profit: number, instinct: number) {
  flashOneDelta(hudDeltaSat, sat);
  flashOneDelta(hudDeltaProfit, profit);
  flashOneDelta(hudDeltaInstinct, instinct);
}

function createHUD() {
  const hud = document.createElement("div");
  hud.style.position = "fixed";
  hud.style.top = "16px";
  hud.style.left = "16px";
  hud.style.zIndex = "1000";
  hud.style.background = "rgba(255, 252, 244, 0.95)";
  hud.style.padding = "12px 16px 10px";
  hud.style.borderRadius = "14px";
  hud.style.border = "2px solid " + COLOR_NAVY;
  hud.style.fontFamily = "system-ui, sans-serif";
  hud.style.fontSize = "14px";
  hud.style.boxShadow = "0 4px 14px rgba(31, 58, 95, 0.3)";
  hud.style.pointerEvents = "none";
  hudPanel = hud; // remember the panel so we can recolor it per shop

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "12px";
  header.style.marginBottom = "8px";

  const title = document.createElement("span");
  title.textContent = "Boss for a Day";
  title.style.color = COLOR_NAVY;
  title.style.fontWeight = "800";
  title.style.fontSize = "15px";

  hudStageChip = document.createElement("span");
  hudStageChip.textContent = "Getting Ready";
  hudStageChip.style.background = TEXT_GREEN;
  hudStageChip.style.color = "#ffffff";
  hudStageChip.style.fontWeight = "700";
  hudStageChip.style.fontSize = "12px";
  hudStageChip.style.padding = "2px 10px";
  hudStageChip.style.borderRadius = "10px";

  header.appendChild(title);
  header.appendChild(hudStageChip);
  hud.appendChild(header);

  hud.appendChild(buildClockRow());

  const moneyRow = buildMoneyRow();
  hud.appendChild(moneyRow);

  const satisfactionRow = makeHudMeter("Customer Satisfaction", METER_SATISFACTION_COLOR, TEXT_CORAL);
  const profitRow       = makeHudMeter("Business Profit", METER_PROFIT_COLOR, TEXT_GREEN);
  const instinctRow     = makeHudMeter("Owner's Instinct", METER_INSTINCT_COLOR, TEXT_BLUE);

  hudSatisfactionValue = satisfactionRow.value;
  hudProfitValue = profitRow.value;
  hudInstinctValue = instinctRow.value;
  hudSatisfactionFill = satisfactionRow.fill;
  hudProfitFill = profitRow.fill;
  hudInstinctFill = instinctRow.fill;

  hud.appendChild(satisfactionRow.row);
  hud.appendChild(profitRow.row);
  hud.appendChild(instinctRow.row);

  hudObjective = document.createElement("div");
  hudObjective.textContent = "";
  hudObjective.style.marginTop = "8px";
  hudObjective.style.background = TEXT_GOLD;
  hudObjective.style.color = "#ffffff";
  hudObjective.style.fontWeight = "800";
  hudObjective.style.fontSize = "13px";
  hudObjective.style.padding = "6px 10px";
  hudObjective.style.borderRadius = "10px";
  hudObjective.style.maxWidth = "260px";
  hudObjective.style.display = "none";
  hud.appendChild(hudObjective);

  document.body.appendChild(hud);
  refreshHUD();
}

// Push the current numbers and bar widths into the HUD.
function refreshHUD() {
  if (hudSatisfactionValue) hudSatisfactionValue.textContent = String(Math.round(scoreSatisfaction));
  if (hudProfitValue) hudProfitValue.textContent = String(Math.round(scoreProfit));
  if (hudInstinctValue) hudInstinctValue.textContent = String(Math.round(scoreInstinct));
  if (hudSatisfactionFill) hudSatisfactionFill.style.width = scoreSatisfaction + "%";
  if (hudProfitFill) hudProfitFill.style.width = scoreProfit + "%";
  if (hudInstinctFill) hudInstinctFill.style.width = scoreInstinct + "%";
}

// ---- In-headset dashboard: keep its numbers in step with the game ----
// The follow loop calls this each tick while you are in the headset. It reads
// the same live numbers the corner overlay uses, and only pushes a value when
// it actually changed, so the panel is never redrawn for no reason.
let dashboardDoc: any = null;
const DASH_TRACK = 64; // must match the .track width in ui/dashboard.uikitml
let _lastSat = -1;
let _lastProf = -1;
let _lastInst = -1;
let _lastMoney = -1;
let _lastObjective = "";
let _lastClock = -2; // -1 is a real state (pre-shop), so seed outside its range

function refreshVrDashboard() {
  if (!dashboardDoc) return;

  const sat = Math.round(scoreSatisfaction);
  if (sat !== _lastSat) {
    _lastSat = sat;
    const v = dashboardDoc.getElementById("dash-val-sat");
    if (v) v.setProperties({ text: String(sat) });
    const f = dashboardDoc.getElementById("dash-fill-sat");
    if (f) f.setProperties({ width: (DASH_TRACK * sat) / 100 });
  }

  const prof = Math.round(scoreProfit);
  if (prof !== _lastProf) {
    _lastProf = prof;
    const v = dashboardDoc.getElementById("dash-val-profit");
    if (v) v.setProperties({ text: String(prof) });
    const f = dashboardDoc.getElementById("dash-fill-profit");
    if (f) f.setProperties({ width: (DASH_TRACK * prof) / 100 });
  }

  const inst = Math.round(scoreInstinct);
  if (inst !== _lastInst) {
    _lastInst = inst;
    const v = dashboardDoc.getElementById("dash-val-instinct");
    if (v) v.setProperties({ text: String(inst) });
    const f = dashboardDoc.getElementById("dash-fill-instinct");
    if (f) f.setProperties({ width: (DASH_TRACK * inst) / 100 });
  }

  if (currentMoney !== _lastMoney) {
    _lastMoney = currentMoney;
    const m = dashboardDoc.getElementById("dash-money");
    if (m) m.setProperties({ text: "$" + currentMoney });
  }

  if (stageClockIndex !== _lastClock) {
    _lastClock = stageClockIndex;
    const c = dashboardDoc.getElementById("dash-clock");
    if (c) {
      const text = stageClockIndex >= 0
        ? "PART " + (stageClockIndex + 1) + " OF 4  -  " + CLOCK_LABELS[stageClockIndex].toUpperCase()
        : "";
      c.setProperties({ text: text });
    }
  }

  const obj =
    hudObjective && hudObjective.textContent
      ? hudObjective.textContent
      : "Running your shop.";
  if (obj !== _lastObjective) {
    _lastObjective = obj;
    const o = dashboardDoc.getElementById("dash-objective");
    if (o) o.setProperties({ text: obj });
  }
}

// A quick pop on a number that just changed.
function bumpHudValue(el: HTMLElement | null) {
  if (!el) return;
  el.style.transform = "scale(1.25)";
  setTimeout(function () { if (el) el.style.transform = "scale(1)"; }, 180);
}

// One short line telling the student what to do right now.
function setObjective(text: string) {
  if (hudObjective) {
    hudObjective.textContent = text ? "Goal: " + text : "";
    hudObjective.style.display = text ? "block" : "none";
  }
  console.log("[OBJECTIVE] " + text);
}

// Update the stage chip AND the in-day clock (desktop + VR) for each phase.
function setHudStage(phase: string) {
  let label = "Pick a Shop";
  let idx = -1;
  if (phase === PHASE_MORNING) { label = "Morning"; idx = 0; }
  else if (phase === PHASE_MIDDAY) { label = "Midday"; idx = 1; }
  else if (phase === PHASE_AFTERNOON) { label = "Afternoon"; idx = 2; }
  else if (phase === PHASE_CLOSE) { label = "Closing"; idx = 3; }
  if (hudStageChip) hudStageChip.textContent = label;
  stageClockIndex = idx;
  updateHudClock(idx);
}

// ============================================================================
// MONEY READOUT  (a live "Your Money" number on the dashboard)
// A fresh amount each stage. setMoney() sets it when a stage begins. changeMoney()
// nudges it up or down as the student spends, saves, earns, or invests, counting
// to the new value and flashing green for a gain or red for a loss. The number
// lives in the HUD (a screen overlay), so it shows on a laptop. In the headset,
// the stage panels show the money where it changes.
// ============================================================================
let currentMoney = 0;
let moneyRowEl: HTMLElement | null = null;
let moneyValueEl: HTMLElement | null = null;
const MONEY_DOWN = "#a33b2a"; // rust red for a loss (green and gold reuse the palette)

// Build the "Your Money" row. createHUD() drops it in at the top of the panel.
function buildMoneyRow(): HTMLElement {
  const row = document.createElement("div");
  row.style.display = "none"; // hidden until a stage sets an amount
  row.style.alignItems = "center";
  row.style.justifyContent = "space-between";
  row.style.gap = "10px";
  row.style.margin = "2px 0 10px";
  row.style.padding = "7px 11px";
  row.style.background = "#fbf3dd";
  row.style.border = "1px solid #e8d6a8";
  row.style.borderRadius = "10px";

  const label = document.createElement("span");
  label.textContent = "Your Money";
  label.style.color = COLOR_NAVY;
  label.style.fontWeight = "800";
  label.style.fontSize = "13px";

  moneyValueEl = document.createElement("span");
  moneyValueEl.textContent = "$0";
  moneyValueEl.style.color = TEXT_GOLD;
  moneyValueEl.style.fontWeight = "800";
  moneyValueEl.style.fontSize = "20px";
  moneyValueEl.style.transition = "transform 0.16s ease, color 0.2s ease";

  row.appendChild(label);
  row.appendChild(moneyValueEl);
  moneyRowEl = row;
  return row;
}

function showMoneyRow() {
  if (moneyRowEl) moneyRowEl.style.display = "flex";
}
function hideMoneyRow() {
  if (moneyRowEl) moneyRowEl.style.display = "none";
}

// Set the money to a fresh amount (used when each stage begins). Instant, with a pop.
function setMoney(amount: number) {
  currentMoney = Math.max(0, Math.round(amount));
  showMoneyRow();
  if (moneyValueEl) {
    moneyValueEl.style.color = TEXT_GOLD;
    moneyValueEl.textContent = "$" + currentMoney;
    moneyValueEl.style.transform = "scale(1.18)";
    setTimeout(function () {
      if (moneyValueEl) moneyValueEl.style.transform = "scale(1)";
    }, 170);
  }
  console.log("[MONEY] set to " + currentMoney);
}

// Count the money up or down by delta, flashing green for a gain, red for a loss.
// (Used by the coin budgeting and the investing result in the next prompts.)
function changeMoney(delta: number) {
  const target = Math.max(0, Math.round(currentMoney + delta));
  if (delta === 0) {
    if (moneyValueEl) {
      moneyValueEl.style.transform = "scale(1.12)";
      setTimeout(function () {
        if (moneyValueEl) moneyValueEl.style.transform = "scale(1)";
      }, 160);
    }
    currentMoney = target;
    console.log("[MONEY] unchanged at " + currentMoney);
    return;
  }
  animateMoneyTo(target, delta > 0);
  console.log("[MONEY] change " + delta + " to " + target);
}

// The two ways money actually moves during the day. spend() is cash leaving the
// register (buying stock, a replacement, a promo); earn() is cash coming in (a
// sale, a deposit). Both keep the day's ledger honest AND animate the readout,
// so the number the student sees always matches money-in minus money-out.
function spend(amount: number) {
  if (amount <= 0) return;
  dayMoneyOut += amount;
  changeMoney(-amount);
  sfxDown();
}
function earn(amount: number) {
  if (amount <= 0) return;
  dayMoneyIn += amount;
  changeMoney(amount);
  sfxCoin();
}

// A sales tick. Revenue grows with the morning's pricing and stocking picks, and
// the ad flyer (if bought) pulls a bigger crowd on top. Rounded to a whole dollar.
function computeRush(base: number): number {
  const pf =
    priceTier === "premium" ? ECONOMY.pricePremiumFactor
    : priceTier === "bargain" ? ECONOMY.priceBargainFactor
    : ECONOMY.priceFairFactor;
  const sf =
    stockTier === "fancy" ? ECONOMY.stockFancyFactor
    : stockTier === "bulk" ? ECONOMY.stockBulkFactor
    : ECONOMY.stockMixFactor;
  let r = base * pf * sf;
  if (flyerChosen) r += ECONOMY.flyerBonus;
  return Math.round(r);
}

// Set up the day's money the first time the morning opens. Guarded so re-entering
// the morning phase never wipes the ledger.
function startDay() {
  if (dayStarted) return;
  dayStarted = true;
  dayStartCash = ECONOMY.startingCash;
  dayMoneyIn = 0;
  dayMoneyOut = 0;
  priceTier = "";
  stockTier = "";
  flyerChosen = false;
  dealChosen = false;
  dayDecisions = [];
  setMoney(dayStartCash);
}

// The little counting animation behind changeMoney().
function animateMoneyTo(target: number, isGain: boolean) {
  if (!moneyValueEl) {
    currentMoney = target;
    return;
  }
  const start = currentMoney;
  const steps = 14;
  let i = 0;
  moneyValueEl.style.color = isGain ? TEXT_GREEN : MONEY_DOWN;
  moneyValueEl.style.transform = "scale(1.28)";
  const timer = setInterval(function () {
    i = i + 1;
    const t = i / steps;
    const val = Math.round(start + (target - start) * t);
    if (moneyValueEl) moneyValueEl.textContent = "$" + val;
    if (i >= steps) {
      clearInterval(timer);
      if (moneyValueEl) {
        moneyValueEl.textContent = "$" + target;
        moneyValueEl.style.transform = "scale(1)";
      }
      setTimeout(function () {
        if (moneyValueEl) moneyValueEl.style.color = TEXT_GOLD;
      }, 280);
    }
  }, 26);
  currentMoney = target;
}

// ============================================================================
// PHASE MACHINE  (the master flow; panels get attached in a later prompt)
// ============================================================================
const PHASE_SELECT = "select";
const PHASE_MORNING = "morning";
const PHASE_MIDDAY = "midday";
const PHASE_AFTERNOON = "afternoon";
const PHASE_CLOSE = "close";
const PHASE_ORDER = [PHASE_SELECT, PHASE_MORNING, PHASE_MIDDAY, PHASE_AFTERNOON, PHASE_CLOSE];
let currentPhase = PHASE_SELECT;

// Panels registered per phase. showPhase shows the active one and hides the rest.
const phasePanels: any = {};

function showPhase(phase: string) {
  currentPhase = phase;
  setHudStage(phase);
  // The register opens once, when the morning begins, and the same cash carries
  // through the whole day into the report. Before that (shop picker) it is hidden.
  if (phase === PHASE_MORNING) startDay();
  else if (phase === PHASE_SELECT) hideMoneyRow();
  for (const key in phasePanels) {
    const panel = phasePanels[key];
    if (panel && panel.object3D) panel.object3D.visible = false;
  }
  const active = phasePanels[phase];
  if (active && active.object3D) active.object3D.visible = true;
  console.log("[PHASE] now in " + phase);
}

function nextPhase() {
  const i = PHASE_ORDER.indexOf(currentPhase);
  const next = PHASE_ORDER[i + 1];
  if (next) {
    sfxStage();
    showPhase(next);
  }
}
void nextPhase; // called by the panels in later prompts

// ============================================================================
// THE WORLD
// ============================================================================
World.create(document.getElementById("scene-container") as HTMLDivElement, {
  assets: {},
  xr: {
    sessionMode: SessionMode.ImmersiveVR,
    offer: "always",
    features: { handTracking: { required: false }, layers: { required: false } },
  },
  features: {
    // initialPlayerPosition spawns the player RIG (the locomotion collision
    // capsule) on the entrance side of the plaza. The camera below sits at
    // local z 0, so the capsule lines up with where you actually appear to
    // stand - that is what makes the hedge boundary stop you in the right place.
    // useWorker is OFF on purpose: the worker only syncs world.player back to the
    // app after the first move, so with it on the spawn would sit at the origin
    // and snap forward on the first keypress. On the main thread the initial
    // position applies immediately. The scene is light, so there is no cost.
    locomotion: { useWorker: false, browserControls: true, initialPlayerPosition: [0, 0, 7] },
    grabbing: true,
    physics: true,
    sceneUnderstanding: false,
    environmentRaycast: false,
  },
}).then(function (world) {
  const scene = world.scene;
  const camera = world.camera;

  // Eye height only - no z offset. The player rig is spawned back on the
  // entrance side via locomotion's initialPlayerPosition, so keeping the camera
  // at local z 0 means the collision capsule sits exactly under the viewer
  // (otherwise walls would block you metres away from where they look).
  camera.position.set(0, 1.6, 0);

  // --------------------------------------------------------------------------
  // BROWSER MOUSE LOOK (right button looks; left button stays for clicks).
  // In the headset the headset owns the view, so this only runs in the browser.
  // --------------------------------------------------------------------------
  const lookContainer = document.getElementById("scene-container") as HTMLDivElement;
  const LOOK_BUTTON = 2; // right mouse button
  let lookDragging = false;
  let lookHasLooked = false;
  let lookLastX = 0;
  let lookLastY = 0;
  let lookYaw = 0;
  let lookPitch = 0;
  const LOOK_SENSITIVITY = 0.0025;
  const LOOK_PITCH_LIMIT = 1.4;

  lookContainer.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  lookContainer.addEventListener("pointerdown", function (e) {
    if (e.button !== LOOK_BUTTON) return;
    lookDragging = true;
    lookHasLooked = true;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
    lookContainer.style.cursor = "grabbing";
  });
  window.addEventListener("pointermove", function (e) {
    if (!lookDragging) return;
    const dx = e.clientX - lookLastX;
    const dy = e.clientY - lookLastY;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
    lookYaw = lookYaw - dx * LOOK_SENSITIVITY;
    lookPitch = lookPitch - dy * LOOK_SENSITIVITY;
    lookPitch = Math.max(-LOOK_PITCH_LIMIT, Math.min(LOOK_PITCH_LIMIT, lookPitch));
  });
  window.addEventListener("pointerup", function (e) {
    if (e.button !== LOOK_BUTTON) return;
    lookDragging = false;
    lookContainer.style.cursor = "";
  });

  function browserLookLoop() {
    if (lookHasLooked) {
      if (world.visibilityState.peek() === VisibilityState.NonImmersive) {
        camera.rotation.set(lookPitch, lookYaw, 0, "YXZ");
      }
    }
    requestAnimationFrame(browserLookLoop);
  }
  browserLookLoop();

  // --------------------------------------------------------------------------
  // ONE GAME-LOOP TICK
  // Every proximity check, the panel-on-top pass, the pointer guard, and the
  // dashboard sync used to be its own setInterval - ~9 timers all firing at 30Hz.
  // They are now registered as frame tasks and driven by ONE interval, which is
  // easier on Quest thermals over a 25-minute session. Each task still early-
  // returns when its stage is done, so finished work costs almost nothing. A task
  // that throws is isolated so it can never freeze the rest of the loop.
  // setInterval (not requestAnimationFrame) because rAF pauses in a headset.
  // --------------------------------------------------------------------------
  const frameTasks: Array<() => void> = [];
  function tick(fn: () => void, _intervalIgnored?: number) {
    frameTasks.push(fn);
  }
  function runFrameTasks() {
    for (let i = 0; i < frameTasks.length; i = i + 1) {
      try {
        frameTasks[i]();
      } catch (e) {
        console.warn("[frame task] error", e);
      }
    }
  }
  setInterval(runFrameTasks, 33);

  // --------------------------------------------------------------------------
  // HIDDEN-PANEL CLICK GUARD
  // IWSDK keeps every panel alive and just toggles visibility. Pointer ray tests
  // do NOT skip invisible meshes, so a hidden button can sit in front of a real
  // one and silently swallow the click. Each tick we mark effectively-hidden ray
  // targets pointerEvents = "none" so they are skipped, and restore them when
  // shown. setInterval (not requestAnimationFrame) because rAF pauses in a headset.
  // --------------------------------------------------------------------------
  function hitTestVisibilityLoop() {
    const targets = (scene as any).rayDescendants as any[] | undefined;
    if (!targets) return;
    for (const obj of targets) {
      let visible = obj.visible;
      let p = obj.parent;
      while (visible) {
        if (!p) break;
        visible = p.visible;
        p = p.parent;
      }
      if (!visible) {
        if (!obj.__guardHidden) {
          obj.__savedPointerEvents = obj.pointerEvents;
          obj.__guardHidden = true;
        }
        obj.pointerEvents = "none";
      } else if (obj.__guardHidden) {
        obj.pointerEvents = obj.__savedPointerEvents;
        obj.__guardHidden = false;
      }
    }
  }
  tick(hitTestVisibilityLoop);

  // --------------------------------------------------------------------------
  // PANEL PRESENTATION
  // The story panels are anchored in the world, near Gus or a building. But the
  // player almost always walks RIGHT UP to that anchor, ending up far too close
  // to read the panel - the cards and buttons at the bottom fall off the screen.
  // presentPanel snaps a panel to a comfortable distance directly in front of
  // the player, sized from the panel's real bounds and the live camera so the
  // WHOLE panel fits in view, then turns it to face the player. It is called
  // once each time a panel first appears (showPanel), so a panel you are reading
  // or clicking stays put. Works the same on desktop and in a headset.
  // --------------------------------------------------------------------------
  const _presEye = new Vector3();
  const _presFwd = new Vector3();
  const _presSize = new Vector3();
  const _presBox = new Box3();
  const PRESENT_MARGIN = 1.18;  // breathing room so the panel is not edge-to-edge
  const PRESENT_MARGIN_DESKTOP = 1.4; // a bit more on a laptop, so the corner overlay does not crowd panels
  const PRESENT_MIN_DIST = 2.4; // never closer than this, however small the panel
  const PRESENT_MAX_DIST = 6.0; // never farther than this, however large the panel

  function presentPanel(entity: any) {
    const cam: any = world.camera;
    const o3d = entity.object3D;
    if (!cam || !o3d) return;

    // Measure the panel's real size. For a flat panel turned only on its Y axis,
    // the width lives in the X/Z plane and the height is always Y, so this stays
    // correct no matter which way the panel is currently facing.
    _presBox.setFromObject(o3d);
    _presBox.getSize(_presSize);
    const w = Math.hypot(_presSize.x, _presSize.z) || 2.6;
    const h = _presSize.y > 0.01 ? _presSize.y : 2.2;

    // Distance that fits the height (vertical FOV) and the width (FOV * aspect).
    const tanV = Math.tan((cam.fov * Math.PI) / 360); // tan(halfFov)
    const aspect = cam.aspect || 1;
    const distH = h / 2 / tanV;
    const distW = w / 2 / (tanV * aspect);
    // On a laptop the corner overlay sits in front of panels, so give them more
    // room there. In the headset there is no overlay, so keep them big.
    const desktopView = world.visibilityState.peek() === VisibilityState.NonImmersive;
    const margin = desktopView ? PRESENT_MARGIN_DESKTOP : PRESENT_MARGIN;
    let dist = Math.max(distH, distW) * margin;
    dist = Math.max(PRESENT_MIN_DIST, Math.min(PRESENT_MAX_DIST, dist));

    // Place it straight ahead of the camera, level, at the player's eye height.
    cam.getWorldPosition(_presEye);
    cam.getWorldDirection(_presFwd);
    _presFwd.y = 0;
    if (_presFwd.lengthSq() < 1e-6) _presFwd.set(0, 0, -1);
    _presFwd.normalize();
    const px = _presEye.x + _presFwd.x * dist;
    const pz = _presEye.z + _presFwd.z * dist;
    o3d.position.set(px, _presEye.y, pz);
    // Turn to face the player (a panel's front is its +Z side).
    o3d.rotation.set(0, Math.atan2(_presEye.x - px, _presEye.z - pz), 0, "YXZ");
    applyPanelOnTop(entity);
  }

  // Draw a panel OVER the 3D world so Gus, his cart, or a building can never sit
  // in front of it and hide the cards. The player walks right up to these spots,
  // so a readable (far enough) panel often lands at or behind the thing it
  // belongs to; turning off depth testing and lifting the render order keeps the
  // whole panel visible while preserving UIKit's own internal layering.
  function applyPanelOnTop(entity: any) {
    const o3d = entity.object3D;
    if (!o3d) return;
    o3d.traverse(function (child: any) {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        m.depthTest = false;
        m.depthWrite = false;
      }
      // Lift above the scene (renderOrder 0) once, keeping relative UIKit order.
      if (!child.__onTop) {
        child.renderOrder = (child.renderOrder || 0) + 2000;
        child.__onTop = true;
      }
    });
  }

  // Make a panel visible, snapping it in front of the player the first time it
  // appears. Idempotent while already shown, so reading/clicking it is stable.
  // The on-top maintenance loop (below) keeps it drawing over the world, even as
  // UIKit builds later content (a reply, a result) into the panel.
  function showPanel(entity: any) {
    const o3d = entity.object3D;
    if (!o3d) return;
    if (!o3d.visible) presentPanel(entity);
    o3d.visible = true;
  }

  // Every story panel, watched by one loop that re-applies applyPanelOnTop to
  // whichever is visible. UIKit creates text/glyph meshes lazily and only after
  // a panel's content is set, so a one-time pass misses them - a panel placed
  // behind Gus or a building would then show its boxes but hide its words. This
  // keeps the WHOLE visible panel on top, frame after frame.
  const storyPanels: any[] = [];
  tick(function () {
    for (const p of storyPanels) {
      if (p.object3D && p.object3D.visible) applyPanelOnTop(p);
    }
  }, 33);

  // --------------------------------------------------------------------------
  // WAYFINDING BEACON
  // A gold "!" that floats over the station you need to reach next (the counter,
  // the shop floor), so the objective line is not the only guide. setBeacon aims
  // it; the frame task bobs it and hides it once you have walked up (the panel
  // then takes over). Finding the OWNER is still handled by the owner's own "!".
  // --------------------------------------------------------------------------
  const beaconEntity = buildBeacon(world);
  let beaconTarget: { x: number; z: number } | null = null;
  const BEACON_HIDE_RADIUS = 3.2; // once this close, the station panel opens
  const _beaconCam = new Vector3();
  let _beaconT = 0;
  function setBeacon(t: { x: number; z: number } | null) {
    beaconTarget = t;
  }
  tick(function () {
    const o3d = beaconEntity.object3D;
    if (!o3d) return;
    const cam = world.camera;
    if (!beaconTarget || !cam) {
      if (o3d.visible) o3d.visible = false;
      return;
    }
    cam.getWorldPosition(_beaconCam);
    const dx = _beaconCam.x - beaconTarget.x;
    const dz = _beaconCam.z - beaconTarget.z;
    if (Math.sqrt(dx * dx + dz * dz) <= BEACON_HIDE_RADIUS) {
      if (o3d.visible) o3d.visible = false;
      return;
    }
    _beaconT = _beaconT + 1;
    o3d.position.set(beaconTarget.x, 2.5 + Math.sin(_beaconT * 0.12) * 0.09, beaconTarget.z);
    o3d.visible = true;
  }, 33);

  // --------------------------------------------------------------------------
  // AMBIENT CUSTOMERS
  // A few shoppers stroll into the shop during the midday rush, so the busiest
  // part of the day actually looks busy. They walk in staggered, mill near the
  // floor, and clear out (and reset) once the rush is over.
  // --------------------------------------------------------------------------
  const customers = buildCustomers(world);
  const custProgress = customers.map(function (_c, i) { return -i * 0.4; }); // staggered entrances
  tick(function () {
    const midday = currentPhase === PHASE_MIDDAY;
    for (let i = 0; i < customers.length; i = i + 1) {
      const c = customers[i];
      const o3d = c.entity.object3D;
      if (!o3d) continue;
      if (!midday) {
        if (o3d.visible) o3d.visible = false;
        custProgress[i] = -i * 0.4; // rewind so they walk in fresh next midday
        continue;
      }
      custProgress[i] = Math.min(1, custProgress[i] + 0.006);
      const p = custProgress[i] < 0 ? 0 : custProgress[i];
      const e = 1 - (1 - p) * (1 - p); // ease-out so they slow as they arrive
      const x = c.start.x + (c.target.x - c.start.x) * e;
      const z = c.start.z + (c.target.z - c.start.z) * e;
      const bob = p < 1 ? Math.abs(Math.sin(p * 42)) * 0.045 : 0; // a little walk bounce
      o3d.position.set(x, bob, z);
      o3d.visible = true;
    }
  }, 33);

  // --------------------------------------------------------------------------
  // The walkable world (sky, light, ground). See src/environment.ts.
  // --------------------------------------------------------------------------
  const built = buildBaseWorld(world);
  const ground = built.ground;
  ground.addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });
  // The hedge ring is collision too: the locomotion engine bakes its meshes into
  // the walkable BVH, so the player's capsule bumps into it and can no longer
  // walk off the edge of the world and fall.
  built.boundary.addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });
  setStageLook(world, PHASE_SELECT);

  // Hide the shop shell during the picker, so the student chooses over an empty
  // lobby. It is revealed in pick() once they choose. The floor stays present
  // (just invisible) so they are always standing on solid ground.
  ground.object3D!.visible = false;
  built.boundary.object3D!.visible = false;
  for (const e of built.street) e.object3D!.visible = false;

  // Build the HUD and show the opening goal.
  createHUD();
  setupHudDeltas();
  setObjective("Take a moment to read the welcome screen.");

  // ======================================================================
  // IN-HEADSET DASHBOARD
  // The corner overlay is a flat screen element and does not render inside
  // the headset, so there we show this 3D panel and have it ride along with
  // the view so it is always visible. On desktop it stays hidden, because the
  // corner overlay covers that. Wired to live numbers in a later step.
  // ======================================================================
  const dashboardPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/dashboard.json", maxWidth: 1.0, maxHeight: 0.85 });
  dashboardPanel.object3D!.visible = false;

  // Grab the panel's document once it has loaded, so we can update its numbers.
  whenPanelReady(dashboardPanel, function (doc) {
    dashboardDoc = doc;
  });

  // --- Where the dashboard sits in your view (metres). Tune these in headset. ---
  // Kept low and off to the left so it reads like a glance-down instrument panel
  // instead of floating in your forward gaze and covering the world / other panels.
  const DASH_DIST = 1.45;  // how far in front of you
  const DASH_DROP = 0.95;  // how far below your eye line (top edge sits well under gaze)
  const DASH_SIDE = -0.78; // sideways shift (negative = left), clear of the center line
  const DASH_LERP = 0.18;  // 0..1, how quickly it catches up when you turn

  const _dashEye = new Vector3();
  const _dashFwd = new Vector3();
  const _dashRight = new Vector3();
  const _dashUp = new Vector3();
  const _dashTarget = new Vector3();
  const _dashWorldUp = new Vector3(0, 1, 0);

  tick(function () {
    const o3d = dashboardPanel.object3D;
    if (!o3d) return;
    // Desktop uses the corner overlay; keep the 3D one hidden there.
    if (world.visibilityState.peek() === VisibilityState.NonImmersive) {
      o3d.visible = false;
      return;
    }
    const cam = world.camera as any;
    cam.getWorldPosition(_dashEye);
    cam.getWorldDirection(_dashFwd);
    _dashFwd.normalize();
    _dashRight.crossVectors(_dashFwd, _dashWorldUp).normalize();
    _dashUp.crossVectors(_dashRight, _dashFwd).normalize();
    _dashTarget.copy(_dashEye)
      .addScaledVector(_dashFwd, DASH_DIST)
      .addScaledVector(_dashUp, -DASH_DROP)
      .addScaledVector(_dashRight, DASH_SIDE);
    if (!o3d.visible) {
      o3d.position.copy(_dashTarget); // snap into place the first time
      o3d.visible = true;
    } else {
      o3d.position.lerp(_dashTarget, DASH_LERP); // smooth follow afterwards
    }
    // Face the player. Because it now sits low, tilt it up so the face aims at
    // the eyes (like a car dashboard) instead of lying flat below your view.
    const _dashDX = _dashEye.x - o3d.position.x;
    const _dashDY = _dashEye.y - o3d.position.y;
    const _dashDZ = _dashEye.z - o3d.position.z;
    const _dashYaw = Math.atan2(_dashDX, _dashDZ);
    const _dashPitch = -Math.atan2(_dashDY, Math.hypot(_dashDX, _dashDZ));
    o3d.rotation.set(_dashPitch, _dashYaw, 0, "YXZ");
    refreshVrDashboard();
  }, 33);

  // Start the flow at Setup.
  // ==========================================================================
  // OPENING PANELS  -  title -> how to play -> into Main Street.
  // Built from ui/title.uikitml and ui/welcome.uikitml (compiled to public/ui).
  // ==========================================================================

  // A panel's UI document loads over a frame or two. Run wiring once it is ready.
  function whenPanelReady(entity: any, callback: (doc: any) => void) {
    let attempts = 0;
    let warned = false;
    const check = function () {
      if (entity.hasComponent(PanelDocument)) {
        const doc = entity.getValue(PanelDocument, "document");
        if (doc) {
          callback(doc);
          return;
        }
      }
      attempts = attempts + 1;
      // ~60 fps, so 600 frames ≈ 10s. A panel whose JSON never loads would poll
      // forever and its stage would hang with no clue why - warn once instead,
      // then keep trying a while longer before giving up so we don't rAF-spin.
      if (attempts === 600 && !warned) {
        warned = true;
        let cfg = "unknown panel";
        try { cfg = entity.getValue(PanelUI, "config") || cfg; } catch { /* best effort */ }
        console.warn("[whenPanelReady] " + cfg + " not ready after ~10s - its stage may be stuck; check that the panel JSON loaded.");
      }
      if (attempts > 1800) return; // ~30s: give up rather than poll indefinitely
      requestAnimationFrame(check);
    };
    check();
  }

  // The title card, floating in front of where you start.
  const titlePanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/title.json", maxWidth: 2.4, maxHeight: 1.6 })
    .addComponent(Interactable);
  titlePanel.object3D!.position.set(0, 1.6, 4);
  titlePanel.object3D!.visible = false;

  // The how-to-play card, in the same spot.
  const welcomePanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/welcome.json", maxWidth: 2.4, maxHeight: 2.0 })
    .addComponent(Interactable);
  welcomePanel.object3D!.position.set(0, 1.6, 4);
  welcomePanel.object3D!.visible = false;

  // Show the title first.
  function startOpening() {
    titlePanel.object3D!.visible = true;
    welcomePanel.object3D!.visible = false;
  }

  // Title: Start reveals the how-to-play.
  whenPanelReady(titlePanel, function (doc) {
    doc.getElementById("start-button")?.setProperties({
      onClick: function () {
        sfxClick();
        titlePanel.object3D!.visible = false;
        welcomePanel.object3D!.visible = true;
      },
    });
  });

  // How to play: five steps, Back / Next, ending by entering Main Street.
  const WELCOME_STEPS = 3;
  let welcomeStep = 1;
  whenPanelReady(welcomePanel, function (doc) {
    const DISABLED_BG = "#c9c2b5";
    const DISABLED_TEXT = "#7a7a7a";

    const backButton = doc.getElementById("back-button");
    const backLabel = doc.getElementById("back-label");
    const nextButton = doc.getElementById("next-button");
    const nextLabel = doc.getElementById("next-label");
    const indicator = doc.getElementById("step-indicator");

    function showWelcomeStep(n: number) {
      welcomeStep = n;
      for (let i = 1; WELCOME_STEPS >= i; i = i + 1) {
        doc.getElementById("step-" + i)?.setProperties({ display: i === n ? "flex" : "none" });
      }
      indicator?.setProperties({ text: "Step " + n + " of " + WELCOME_STEPS });
      const onFirst = n === 1;
      backButton?.setProperties({ backgroundColor: onFirst ? DISABLED_BG : activeShop.theme.boxBorder });
      backLabel?.setProperties({ color: onFirst ? DISABLED_TEXT : activeShop.theme.ink });
      const onLast = n === WELCOME_STEPS;
      nextLabel?.setProperties({ text: onLast ? "Start Playing" : "Next" });
    }

    backButton?.setProperties({
      onClick: function () {
        if (welcomeStep > 1) {
          sfxClick();
          showWelcomeStep(welcomeStep - 1);
        }
      },
    });
    nextButton?.setProperties({
      onClick: function () {
        if (WELCOME_STEPS > welcomeStep) {
          sfxClick();
          showWelcomeStep(welcomeStep + 1);
        } else {
          sfxClick();
          welcomePanel.object3D!.visible = false;
          showPhase(PHASE_MORNING);
          setObjective(activeShop.goals.sayHi);
        }
      },
    });

    showWelcomeStep(1);
  });

  // ==========================================================================
  // SETUP  -  choose your character, then step onto Main Street.
  // ==========================================================================
  const setupPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/setup.json", maxWidth: 2.6, maxHeight: 2.0 })
    .addComponent(Interactable);
  setupPanel.object3D!.position.set(0, 1.6, 7.2);
  setupPanel.object3D!.visible = false;
  phasePanels[PHASE_SELECT] = setupPanel;

  // The four characters. Only the name is used in code (for the final report);
  // the words on the cards live in ui/setup.uikitml.
  const CHARACTERS = [
    { id: "ada", name: "Ada" },
    { id: "leo", name: "Leo" },
    { id: "mia", name: "Mia" },
    { id: "sam", name: "Sam" },
  ];
  let chosenCharacter: any = null;

  whenPanelReady(setupPanel, function (doc) {
    const GOLD = "#d98a8f";
    const NAVY = "#5b3a24";

    const beginButton = doc.getElementById("begin-button");
    const beginLabel = doc.getElementById("begin-label");
    const cards: any = {};

    // Highlight the chosen card in gold, clear the rest, and switch Begin on.
    function selectCharacter(ch: any) {
      chosenCharacter = ch;
      for (const c of CHARACTERS) {
        const card = cards[c.id];
        if (card) card.setProperties({ borderColor: c.id === ch.id ? GOLD : NAVY });
      }
      beginButton?.setProperties({ backgroundColor: GOLD });
      beginLabel?.setProperties({ color: NAVY });
    }

    for (const c of CHARACTERS) {
      const card = doc.getElementById("card-" + c.id);
      cards[c.id] = card;
      card?.setProperties({ onClick: function () { sfxClick(); selectCharacter(c); } });
    }

    beginButton?.setProperties({
      onClick: function () {
        if (!chosenCharacter) return; // must pick someone first
        sfxClick();
        setupPanel.object3D!.visible = false;
        showPhase(PHASE_MORNING);
        setObjective(activeShop.goals.sayHi);
      },
    });
  });

  // ==========================================================================
  // GUS'S STAGE 1 QUESTION  -  opens when you walk up to Gus in Stage 1.
  // The best answer grows Money Smarts more; any answer earns some, because
  // thinking it through is the point. Gus explains, then you carry on.
  // ==========================================================================
  const GUSQ1_RADIUS = 3.0; // how close you must be for the question to open
  const SMARTS_BEST = 10;   // Owner's Instinct for the best answer; per-option
                            // scores for the other answers now live in shops.ts
                            // (gusBScore / gusCScore).

  // A shuffled owner question keeps the best answer from always sitting in the
  // same button. The order is built once per playthrough (in applyShopWords) and
  // read at click time, so the SAME shuffle drives both the labels and the score.
  type GusOpt = { label: string; score: number; fb: string; isBest: boolean };
  function buildGusOpts(g: {
    gusBest: string; gusB: string; gusC: string; gusLesson: string;
    gusBFb: string; gusCFb: string; gusBScore: number; gusCScore: number;
  }): GusOpt[] {
    return [
      { label: g.gusBest, score: SMARTS_BEST, fb: g.gusLesson, isBest: true },
      { label: g.gusB, score: g.gusBScore, fb: g.gusBFb, isBest: false },
      { label: g.gusC, score: g.gusCScore, fb: g.gusCFb, isBest: false },
    ];
  }
  function shuffleOpts(a: GusOpt[]): GusOpt[] {
    for (let i = a.length - 1; i > 0; i = i - 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  // The live shuffled order for each owner question (reset per shop in applyShopWords).
  let gus1Order: GusOpt[] = buildGusOpts(activeShop.morning);
  let gus2Order: GusOpt[] = buildGusOpts(activeShop.midday);
  let gus3Order: GusOpt[] = buildGusOpts(activeShop.afternoon);

  // Wire a shuffled owner question's three answer buttons and its reply beat.
  // getOrder reads the live order so button A/B/C map to whatever option landed
  // there this playthrough; each answer shows its OWN feedback and its own score.
  function wireGusAnswers(doc: any, title: string, getOrder: () => GusOpt[], setReplying: (v: boolean) => void) {
    const beatQ = doc.getElementById("beat-q");
    const beatReply = doc.getElementById("beat-reply");
    const replyText = doc.getElementById("reply-text");
    const meterChange = doc.getElementById("meter-change");
    beatQ?.setProperties({ display: "flex" });
    beatReply?.setProperties({ display: "none" });
    let answered = false; // only the first tap counts
    function answer(opt: GusOpt) {
      if (answered) return;
      answered = true;
      sfxCoin();
      updateScore("instinct", opt.score);
      const opener = opt.isBest ? "Exactly right!" : "Good try.";
      replyText?.setProperties({ text: opener + " " + opt.fb });
      meterChange?.setProperties({ text: "Owner's Instinct  +" + opt.score });
      recordDecision(title, opt.isBest ? "Chose the best answer" : "Missed the best answer", opt.fb, opt.score);
      beatQ?.setProperties({ display: "none" });
      beatReply?.setProperties({ display: "flex" });
      setReplying(true);
    }
    doc.getElementById("answer-a")?.setProperties({ onClick: function () { answer(getOrder()[0]); } });
    doc.getElementById("answer-b")?.setProperties({ onClick: function () { answer(getOrder()[1]); } });
    doc.getElementById("answer-c")?.setProperties({ onClick: function () { answer(getOrder()[2]); } });
  }

  const gusQ1Panel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/gus-stage1.json", maxWidth: 2.4, maxHeight: 1.9 })
    .addComponent(Interactable);
  gusQ1Panel.object3D!.position.set(GUS_SPOT.x, 1.7, GUS_SPOT.z + 1.5);
  gusQ1Panel.object3D!.visible = false;

  let gusQ1Done = false;     // true once the player has read Gus's reply
  let gusQ1Replying = false; // true while the reply is on screen (keep it up)

  whenPanelReady(gusQ1Panel, function (doc) {
    wireGusAnswers(doc, "Morning advice", function () { return gus1Order; }, function (v) { gusQ1Replying = v; });

    doc.getElementById("got-it-button")?.setProperties({
      onClick: function () {
        sfxClick();
        gusQ1Done = true;
        gusQ1Replying = false;
        gusQ1Panel.object3D!.visible = false;
        setObjective(activeShop.goals.morningCounter);
        setBeacon(STATIONS.bank); // point the way to the counter
      },
    });
  });

  // Watch how close the player is to Gus, and open the question in Stage 1.
  const gusCamPos = new Vector3();
  tick(function () {
    if (gusQ1Done) {
      gusQ1Panel.object3D!.visible = false;
      return;
    }
    if (currentPhase !== PHASE_MORNING) {
      gusQ1Panel.object3D!.visible = false;
      return;
    }
    if (gusQ1Replying) {
      showPanel(gusQ1Panel); // keep the reply up until Got It
      return;
    }
    const cam = world.camera;
    if (!cam) return;
    cam.getWorldPosition(gusCamPos);
    const dx = gusCamPos.x - GUS_SPOT.x;
    const dz = gusCamPos.z - GUS_SPOT.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (GUSQ1_RADIUS >= dist) showPanel(gusQ1Panel);
    else gusQ1Panel.object3D!.visible = false;
  }, 33);

  // Begin the opening sequence.
  // ==========================================================================
  // MORNING SETUP  -  opens at the counter, after you have talked with Ms. Delia.
  // Two tap choices (pricing, then stocking) move Profit and Satisfaction; then
  // Open the Doors advances the day to Midday.
  // ==========================================================================
  // Morning setup deltas (tunable). Profit and Satisfaction drift with each call.
  const MORNING = {
    PRICE_PREMIUM: { profit: 12, satisfaction: -8 },
    PRICE_FAIR:    { profit: 6,  satisfaction: 6 },
    PRICE_BARGAIN: { profit: -4, satisfaction: 12 },
    STOCK_FANCY:   { profit: 12, satisfaction: -4 },
    STOCK_MIX:     { profit: 6,  satisfaction: 6 },
    STOCK_BULK:    { profit: -2, satisfaction: 12 },
  };
  const stage1MoneyPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/stage1-money.json", maxWidth: 2.6, maxHeight: 2.0 })
    .addComponent(Interactable);
  stage1MoneyPanel.object3D!.position.set(STATIONS.bank.x, 1.6, STATIONS.bank.z + 2.2);
  stage1MoneyPanel.object3D!.visible = false;

  let stage1MoneyDone = false;      // true once the plan is chosen and reviewed
  let stage1ShowingOutcome = false; // true while the result is on screen

  whenPanelReady(stage1MoneyPanel, function (doc) {
    const beatSpecial = doc.getElementById("beat-special");
    const beatSupply = doc.getElementById("beat-supply");
    const beatPrice = doc.getElementById("beat-price");
    const beatStock = doc.getElementById("beat-stock");
    const beatReady = doc.getElementById("beat-ready");
    const readyText = doc.getElementById("ready-text");
    const revenueLine = doc.getElementById("revenue-line");
    const supplyAnswers = doc.getElementById("supply-answers");
    const supplyNote = doc.getElementById("supply-note");
    const supplyNext = doc.getElementById("supply-next");

    // The morning opens on this shop's own market twist, then the growth call.
    wireDecisionBeat(doc, "special", function () { return activeShop.special; }, "Market twist", function () {
      beatSpecial?.setProperties({ display: "none" });
      beatSupply?.setProperties({ display: "flex" });
    });

    // The morning opens on the market twist, then the scarcity decision, then
    // pricing, then stocking.
    beatSpecial?.setProperties({ display: "flex" });
    beatSupply?.setProperties({ display: "none" });
    beatPrice?.setProperties({ display: "none" });
    beatStock?.setProperties({ display: "none" });
    beatReady?.setProperties({ display: "none" });
    supplyNote?.setProperties({ display: "none" });
    supplyNext?.setProperties({ display: "none" });
    revenueLine?.setProperties({ display: "none" });

    let supplyPicked = false;
    let pricePicked = false;
    let stockPicked = false;
    const totals = { satisfaction: 0, profit: 0 };

    function applyMeters(d: { profit: number; satisfaction: number }) {
      updateScore("profit", d.profit);
      updateScore("satisfaction", d.satisfaction);
      totals.profit += d.profit;
      totals.satisfaction += d.satisfaction;
    }

    // SCARCITY / OPPORTUNITY COST - you can afford one growth move, not both.
    // Both cost the same, so the whole lesson is "what did you give up?"
    function pickSupply(kind: "deal" | "flyer") {
      if (supplyPicked) return;
      supplyPicked = true;
      spend(ECONOMY.oppCost);
      if (kind === "deal") {
        dealChosen = true;
        updateScore("profit", 6); // lower costs help the bottom line
        totals.profit += 6;
        supplyNote?.setProperties({ text: activeShop.economy.oppDealNote });
      } else {
        flyerChosen = true;
        updateScore("satisfaction", 6); // a bigger crowd, more happy customers
        totals.satisfaction += 6;
        supplyNote?.setProperties({ text: activeShop.economy.oppFlyerNote });
      }
      const note = kind === "deal" ? activeShop.economy.oppDealNote : activeShop.economy.oppFlyerNote;
      recordDecision("Morning growth move", kind === "deal" ? "Took the bulk deal" : "Bought the ad flyer", note, 6);
      supplyAnswers?.setProperties({ display: "none" });
      supplyNote?.setProperties({ display: "flex" });
      supplyNext?.setProperties({ display: "flex" });
    }
    doc.getElementById("supply-deal")?.setProperties({ onClick: function () { pickSupply("deal"); } });
    doc.getElementById("supply-flyer")?.setProperties({ onClick: function () { pickSupply("flyer"); } });
    supplyNext?.setProperties({
      onClick: function () {
        sfxClick();
        beatSupply?.setProperties({ display: "none" });
        beatPrice?.setProperties({ display: "flex" });
      },
    });

    // PRICING sets the margin the two sales ticks earn; it costs nothing now.
    // The pick's consequence line is held so the OPEN beat can recap both choices.
    let pricePickFb = "";
    function pickPrice(tier: string, fb: string, d: { profit: number; satisfaction: number }) {
      if (pricePicked) return;
      pricePicked = true;
      priceTier = tier;
      pricePickFb = fb;
      applyMeters(d);
      recordDecision("Morning prices", tier === "premium" ? "Premium prices" : tier === "bargain" ? "Bargain prices" : "Fair prices", fb, d.profit + d.satisfaction);
      sfxClick();
      beatPrice?.setProperties({ display: "none" });
      beatStock?.setProperties({ display: "flex" });
    }
    doc.getElementById("price-premium")?.setProperties({ onClick: function () { pickPrice("premium", activeShop.morning.priceFbP, MORNING.PRICE_PREMIUM); } });
    doc.getElementById("price-fair")?.setProperties({ onClick: function () { pickPrice("fair", activeShop.morning.priceFbF, MORNING.PRICE_FAIR); } });
    doc.getElementById("price-bargain")?.setProperties({ onClick: function () { pickPrice("bargain", activeShop.morning.priceFbB, MORNING.PRICE_BARGAIN); } });

    // STOCKING is real cash out (buying inventory), then the doors open and the
    // lunch rush brings the first real revenue in - sized by these two picks.
    function pickStock(tier: string, cost: number, fb: string, d: { profit: number; satisfaction: number }) {
      if (stockPicked) return;
      stockPicked = true;
      stockTier = tier;
      spend(cost);
      applyMeters(d);
      recordDecision("Morning stock", tier === "fancy" ? "High-end stock" : tier === "bulk" ? "Bulk stock" : "Balanced mix", fb, d.profit + d.satisfaction);
      const lunch = computeRush(ECONOMY.lunchRushBase);
      earn(lunch);
      readyText?.setProperties({ text: activeShop.morning.readyText });
      doc.getElementById("recap-a")?.setProperties({ text: pricePickFb, display: "flex" });
      doc.getElementById("recap-b")?.setProperties({ text: fb, display: "flex" });
      revenueLine?.setProperties({ text: activeShop.economy.lunchRushLabel + " $" + lunch + "!", display: "flex" });
      showMeterChanges(doc, totals.satisfaction, totals.profit, 0);
      beatStock?.setProperties({ display: "none" });
      beatReady?.setProperties({ display: "flex" });
      stage1ShowingOutcome = true;
    }
    doc.getElementById("stock-fancy")?.setProperties({ onClick: function () { pickStock("fancy", ECONOMY.stockFancyCost, activeShop.morning.stockFbFancy, MORNING.STOCK_FANCY); } });
    doc.getElementById("stock-mix")?.setProperties({ onClick: function () { pickStock("mix", ECONOMY.stockMixCost, activeShop.morning.stockFbMix, MORNING.STOCK_MIX); } });
    doc.getElementById("stock-bulk")?.setProperties({ onClick: function () { pickStock("bulk", ECONOMY.stockBulkCost, activeShop.morning.stockFbBulk, MORNING.STOCK_BULK); } });

    doc.getElementById("continue-button")?.setProperties({
      onClick: function () {
        sfxStage();
        stage1MoneyDone = true;
        stage1ShowingOutcome = false;
        stage1MoneyPanel.object3D!.visible = false;
        setBeacon(null);
        showPhase(PHASE_MIDDAY);
        setStageLook(world, "midday");
        setObjective(activeShop.goals.middayFind);
      },
    });
  });

  // Open the money plan at the Bank, once you have talked with Gus.
  const bankCamPos = new Vector3();
  const STAGE1_BANK_RADIUS = 3.0;
  tick(function () {
    if (stage1MoneyDone) {
      stage1MoneyPanel.object3D!.visible = false;
      return;
    }
    if (currentPhase !== PHASE_MORNING) {
      stage1MoneyPanel.object3D!.visible = false;
      return;
    }
    if (!gusQ1Done) {
      stage1MoneyPanel.object3D!.visible = false; // talk to Gus first
      return;
    }
    if (stage1ShowingOutcome) {
      showPanel(stage1MoneyPanel); // keep the result up until Continue
      return;
    }
    const cam = world.camera;
    if (!cam) return;
    cam.getWorldPosition(bankCamPos);
    const dx = bankCamPos.x - STATIONS.bank.x;
    const dz = bankCamPos.z - STATIONS.bank.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (STAGE1_BANK_RADIUS >= dist) showPanel(stage1MoneyPanel);
    else stage1MoneyPanel.object3D!.visible = false;
  }, 33);

  // ==========================================================================
  // GUS'S STAGE 2 QUESTION  -  about investing. Opens near Gus in Stage 2.
  // ==========================================================================
  const gusQ2Panel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/gus-stage2.json", maxWidth: 2.4, maxHeight: 1.9 })
    .addComponent(Interactable);
  gusQ2Panel.object3D!.position.set(GUS_SPOT.x, 1.7, GUS_SPOT.z + 1.5);
  gusQ2Panel.object3D!.visible = false;

  let gusQ2Done = false;
  let gusQ2Replying = false;

  whenPanelReady(gusQ2Panel, function (doc) {
    wireGusAnswers(doc, "Midday advice", function () { return gus2Order; }, function (v) { gusQ2Replying = v; });

    doc.getElementById("got-it-button")?.setProperties({
      onClick: function () {
        sfxClick();
        gusQ2Done = true;
        gusQ2Replying = false;
        gusQ2Panel.object3D!.visible = false;
        setObjective(activeShop.goals.middayFloor);
        setBeacon(STATIONS.business); // point the way to the shop floor
      },
    });
  });

  const gusQ2CamPos = new Vector3();
  tick(function () {
    if (gusQ2Done) { gusQ2Panel.object3D!.visible = false; return; }
    if (currentPhase !== PHASE_MIDDAY) { gusQ2Panel.object3D!.visible = false; return; }
    if (gusQ2Replying) { showPanel(gusQ2Panel); return; }
    const cam = world.camera;
    if (!cam) return;
    cam.getWorldPosition(gusQ2CamPos);
    const dx = gusQ2CamPos.x - GUS_SPOT.x;
    const dz = gusQ2CamPos.z - GUS_SPOT.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (3.0 >= dist) showPanel(gusQ2Panel);
    else gusQ2Panel.object3D!.visible = false;
  }, 33);

  // ==========================================================================
  // MIDDAY RUSH  -  opens at your shop floor, after Ms. Delia's Midday question.
  // Two tap choices: the Cary Street rival's deal, then the burnt-loaf complaint,
  // ending in an "Into the Afternoon" button. The rival judgment moves Owner's
  // Instinct; Profit and Satisfaction drift with the choices.
  // ==========================================================================
  // Midday deltas (tunable). Instinct moves on the rival judgment; Profit and Satisfaction drift.
  const MIDDAY = {
    RIVAL_HOLD:   { instinct: 10, profit: 6 },
    RIVAL_MATCH:  { instinct: 0,  profit: -8 },
    RIVAL_IGNORE: { instinct: 0,  profit: 0 },
    COMPLAINT_FREE:     { satisfaction: 12, profit: -2 },
    COMPLAINT_DISCOUNT: { satisfaction: 4,  profit: 0 },
    COMPLAINT_FIRM:     { satisfaction: -8, profit: 2 },
  };

  const stage2Panel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/stage2-invest.json", maxWidth: 2.6, maxHeight: 2.0 })
    .addComponent(Interactable);
  stage2Panel.object3D!.position.set(STATIONS.business.x, 1.6, STATIONS.business.z + 2.2);
  stage2Panel.object3D!.visible = false;

  let stage2Done = false;
  let stage2ShowingOutcome = false;

  whenPanelReady(stage2Panel, function (doc) {
    const beatDelay = doc.getElementById("beat-delay");
    const beatRival = doc.getElementById("beat-rival");
    const beatComplaint = doc.getElementById("beat-complaint");
    const beatDone = doc.getElementById("beat-done");
    const doneText = doc.getElementById("done-text");
    const revenueLine = doc.getElementById("revenue-line");

    // The rush opens with a supplier delay curveball, then the rival, then the complaint.
    wireDecisionBeat(doc, "delay", function () { return activeShop.midday.delay; }, "Supplier delay", function () {
      beatDelay?.setProperties({ display: "none" });
      beatRival?.setProperties({ display: "flex" });
    });

    beatDelay?.setProperties({ display: "flex" });
    beatRival?.setProperties({ display: "none" });
    beatComplaint?.setProperties({ display: "none" });
    beatDone?.setProperties({ display: "none" });
    revenueLine?.setProperties({ display: "none" });

    let rivalPicked = false;
    let complaintPicked = false;
    const totals = { satisfaction: 0, profit: 0, instinct: 0 };

    // Holding steady with a thank-you treat costs a little cash; matching or
    // ignoring the rival costs nothing now (matching shows up in weaker sales).
    let rivalPickFb = "";
    function pickRival(cost: number, fb: string, name: string, d: { instinct: number; profit: number }) {
      if (rivalPicked) return;
      rivalPicked = true;
      rivalPickFb = fb;
      updateScore("instinct", d.instinct);
      updateScore("profit", d.profit);
      totals.instinct += d.instinct;
      totals.profit += d.profit;
      if (cost > 0) spend(cost);
      else sfxClick();
      recordDecision("Rival's deal", name, fb, d.instinct + d.profit);
      beatRival?.setProperties({ display: "none" });
      beatComplaint?.setProperties({ display: "flex" });
    }
    doc.getElementById("rival-hold")?.setProperties({ onClick: function () { pickRival(ECONOMY.rivalPromoCost, activeShop.midday.rivalFbHold, "Held steady", MIDDAY.RIVAL_HOLD); } });
    doc.getElementById("rival-match")?.setProperties({ onClick: function () { pickRival(0, activeShop.midday.rivalFbMatch, "Matched their deal", MIDDAY.RIVAL_MATCH); } });
    doc.getElementById("rival-ignore")?.setProperties({ onClick: function () { pickRival(0, activeShop.midday.rivalFbIgnore, "Ignored the rival", MIDDAY.RIVAL_IGNORE); } });

    // A no-charge replacement costs real cash now; the afternoon crowd then rolls
    // in with the day's second sales tick, sized by the morning's price + stock.
    function pickComplaint(cost: number, fb: string, name: string, d: { satisfaction: number; profit: number }) {
      if (complaintPicked) return;
      complaintPicked = true;
      updateScore("satisfaction", d.satisfaction);
      updateScore("profit", d.profit);
      totals.satisfaction += d.satisfaction;
      totals.profit += d.profit;
      if (cost > 0) spend(cost);
      else sfxClick();
      recordDecision("A complaint", name, fb, d.satisfaction + d.profit);
      const afternoon = computeRush(ECONOMY.afternoonBase);
      earn(afternoon);
      doneText?.setProperties({ text: activeShop.midday.doneText });
      doc.getElementById("recap-a")?.setProperties({ text: rivalPickFb, display: "flex" });
      doc.getElementById("recap-b")?.setProperties({ text: fb, display: "flex" });
      revenueLine?.setProperties({ text: activeShop.economy.afternoonRushLabel + " $" + afternoon + "!", display: "flex" });
      showMeterChanges(doc, totals.satisfaction, totals.profit, totals.instinct);
      beatComplaint?.setProperties({ display: "none" });
      beatDone?.setProperties({ display: "flex" });
      stage2ShowingOutcome = true;
    }
    doc.getElementById("comp-free")?.setProperties({ onClick: function () { pickComplaint(ECONOMY.complaintFreeCost, activeShop.midday.compFbFree, "Free replacement", MIDDAY.COMPLAINT_FREE); } });
    doc.getElementById("comp-discount")?.setProperties({ onClick: function () { pickComplaint(0, activeShop.midday.compFbDiscount, "Markdown next time", MIDDAY.COMPLAINT_DISCOUNT); } });
    doc.getElementById("comp-firm")?.setProperties({ onClick: function () { pickComplaint(0, activeShop.midday.compFbFirm, "Held firm", MIDDAY.COMPLAINT_FIRM); } });

    doc.getElementById("continue-button")?.setProperties({
      onClick: function () {
        sfxStage();
        stage2Done = true;
        stage2ShowingOutcome = false;
        stage2Panel.object3D!.visible = false;
        setBeacon(null);
        showPhase(PHASE_AFTERNOON);
        setStageLook(world, "afternoon");
        setObjective(activeShop.goals.afternoonFind);
      },
    });
  });

  // Open the invest board at the Business lot, once you have talked with Gus.
  const bizCamPos = new Vector3();
  tick(function () {
    if (stage2Done) { stage2Panel.object3D!.visible = false; return; }
    if (currentPhase !== PHASE_MIDDAY) { stage2Panel.object3D!.visible = false; return; }
    if (!gusQ2Done) { stage2Panel.object3D!.visible = false; return; }
    if (stage2ShowingOutcome) { showPanel(stage2Panel); return; }
    const cam = world.camera;
    if (!cam) return;
    cam.getWorldPosition(bizCamPos);
    const dx = bizCamPos.x - STATIONS.business.x;
    const dz = bizCamPos.z - STATIONS.business.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (3.0 >= dist) showPanel(stage2Panel);
    else stage2Panel.object3D!.visible = false;
  }, 33);

  // ==========================================================================
  // GUS'S STAGE 3 QUESTION  -  about diversifying. Opens near Gus in Stage 3.
  // ==========================================================================
  const gusQ3Panel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/gus-stage3.json", maxWidth: 2.4, maxHeight: 1.9 })
    .addComponent(Interactable);
  gusQ3Panel.object3D!.position.set(GUS_SPOT.x, 1.7, GUS_SPOT.z + 1.5);
  gusQ3Panel.object3D!.visible = false;

  let gusQ3Done = false;
  let gusQ3Replying = false;

  whenPanelReady(gusQ3Panel, function (doc) {
    wireGusAnswers(doc, "Afternoon advice", function () { return gus3Order; }, function (v) { gusQ3Replying = v; });

    doc.getElementById("got-it-button")?.setProperties({
      onClick: function () {
        sfxClick();
        gusQ3Done = true;
        gusQ3Replying = false;
        gusQ3Panel.object3D!.visible = false;
        setObjective(activeShop.goals.closeCounter);
        setBeacon(STATIONS.bank); // point the way back to the counter
      },
    });
  });

  const gusQ3CamPos = new Vector3();
  tick(function () {
    if (gusQ3Done) { gusQ3Panel.object3D!.visible = false; return; }
    if (currentPhase !== PHASE_AFTERNOON) { gusQ3Panel.object3D!.visible = false; return; }
    if (gusQ3Replying) { showPanel(gusQ3Panel); return; }
    const cam = world.camera;
    if (!cam) return;
    cam.getWorldPosition(gusQ3CamPos);
    const dx = gusQ3CamPos.x - GUS_SPOT.x;
    const dz = gusQ3CamPos.z - GUS_SPOT.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (3.0 >= dist) showPanel(gusQ3Panel);
    else gusQ3Panel.object3D!.visible = false;
  }, 33);

  // ==========================================================================
  // AFTERNOON CLOSE  -  opens at your counter, after Ms. Delia's question.
  // Two quick calls (leftover stock, then a big-order quote) nudge Profit and
  // Satisfaction, then a See Your Day button hands off to the report.
  // ==========================================================================
  // Afternoon deltas (tunable). Profit and Satisfaction drift with each close-out call.
  const AFTERNOON = {
    CLOSE_DONATE:   { satisfaction: 10, profit: -2 },
    CLOSE_MARKDOWN: { satisfaction: 4,  profit: 8 },
    CLOSE_TOSS:     { satisfaction: -6, profit: 0 },
    ORDER_PREMIUM:  { profit: 12, satisfaction: -4 },
    ORDER_FAIR:     { profit: 6,  satisfaction: 6 },
    ORDER_FRIENDLY: { profit: -2, satisfaction: 12 },
  };

  const stage3Panel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/stage3-spread.json", maxWidth: 2.6, maxHeight: 2.0 })
    .addComponent(Interactable);
  stage3Panel.object3D!.position.set(STATIONS.bank.x, 1.6, STATIONS.bank.z + 2.2);
  stage3Panel.object3D!.visible = false;

  let stage3Done = false;
  let stage3Engaged = false; // true from the first close-out call until See Your Day

  whenPanelReady(stage3Panel, function (doc) {
    const beatCapacity = doc.getElementById("beat-capacity");
    const beatStock = doc.getElementById("beat-stock");
    const beatOrder = doc.getElementById("beat-order");
    const beatDone = doc.getElementById("beat-done");
    const doneText = doc.getElementById("done-text");

    // The afternoon opens with the big-order capacity call, then leftovers, then
    // the weekly-order price. The first pick counts as engaging the panel.
    wireDecisionBeat(doc, "capacity", function () { return activeShop.afternoon.capacity; }, "The big order", function () {
      stage3Engaged = true;
      beatCapacity?.setProperties({ display: "none" });
      beatStock?.setProperties({ display: "flex" });
    });

    beatCapacity?.setProperties({ display: "flex" });
    beatStock?.setProperties({ display: "none" });
    beatOrder?.setProperties({ display: "none" });
    beatDone?.setProperties({ display: "none" });

    let stockPicked = false;
    let orderPicked = false;
    const totals = { satisfaction: 0, profit: 0, instinct: 0 };

    // Leftovers: donating gives no cash (but happy customers), a markdown brings
    // in a little cash, tossing gets nothing back.
    let leftoverPickFb = "";
    function pickStock(gain: number, fb: string, name: string, d: { satisfaction: number; profit: number }) {
      if (stockPicked) return;
      stockPicked = true;
      leftoverPickFb = fb;
      updateScore("satisfaction", d.satisfaction);
      updateScore("profit", d.profit);
      totals.satisfaction += d.satisfaction;
      totals.profit += d.profit;
      if (gain > 0) earn(gain);
      else sfxClick();
      recordDecision("Leftovers", name, fb, d.satisfaction + d.profit);
      stage3Engaged = true;
      beatStock?.setProperties({ display: "none" });
      beatOrder?.setProperties({ display: "flex" });
    }
    doc.getElementById("close-donate")?.setProperties({ onClick: function () { pickStock(0, activeShop.afternoon.leftFbDonate, "Donated them", AFTERNOON.CLOSE_DONATE); } });
    doc.getElementById("close-markdown")?.setProperties({ onClick: function () { pickStock(ECONOMY.leftoverMarkdownGain, activeShop.afternoon.leftFbMarkdown, "Marked them down", AFTERNOON.CLOSE_MARKDOWN); } });
    doc.getElementById("close-toss")?.setProperties({ onClick: function () { pickStock(0, activeShop.afternoon.leftFbToss, "Tossed them", AFTERNOON.CLOSE_TOSS); } });

    // The big future order books a deposit into the register now - bigger if you
    // quoted premium, smaller if you quoted a friendly rate.
    function pickOrder(deposit: number, fb: string, name: string, d: { profit: number; satisfaction: number }) {
      if (orderPicked) return;
      orderPicked = true;
      updateScore("profit", d.profit);
      updateScore("satisfaction", d.satisfaction);
      totals.profit += d.profit;
      totals.satisfaction += d.satisfaction;
      earn(deposit);
      recordDecision("Big order price", name, fb, d.profit + d.satisfaction);
      doneText?.setProperties({ text: activeShop.afternoon.doneText });
      doc.getElementById("recap-a")?.setProperties({ text: leftoverPickFb, display: "flex" });
      doc.getElementById("recap-b")?.setProperties({ text: fb, display: "flex" });
      showMeterChanges(doc, totals.satisfaction, totals.profit, totals.instinct);
      beatOrder?.setProperties({ display: "none" });
      beatDone?.setProperties({ display: "flex" });
    }
    doc.getElementById("order-premium")?.setProperties({ onClick: function () { pickOrder(ECONOMY.orderDepositPremium, activeShop.afternoon.orderFbP, "Premium price", AFTERNOON.ORDER_PREMIUM); } });
    doc.getElementById("order-fair")?.setProperties({ onClick: function () { pickOrder(ECONOMY.orderDepositFair, activeShop.afternoon.orderFbF, "Fair price", AFTERNOON.ORDER_FAIR); } });
    doc.getElementById("order-friendly")?.setProperties({ onClick: function () { pickOrder(ECONOMY.orderDepositFriendly, activeShop.afternoon.orderFbFriendly, "Friendly rate", AFTERNOON.ORDER_FRIENDLY); } });

    doc.getElementById("continue-button")?.setProperties({
      onClick: function () {
        sfxStage();
        // If you took the morning bulk deal, its supply savings pay back now.
        if (dealChosen) earn(ECONOMY.bulkDealRebate);
        stage3Done = true;
        stage3Engaged = false;
        stage3Panel.object3D!.visible = false;
        setBeacon(null);
        showReport();
      },
    });
  });

  // Open the spread board at the Bank, once you have talked with Gus.
  const bank3CamPos = new Vector3();
  tick(function () {
    if (stage3Done) { stage3Panel.object3D!.visible = false; return; }
    if (currentPhase !== PHASE_AFTERNOON) { stage3Panel.object3D!.visible = false; return; }
    if (!gusQ3Done) { stage3Panel.object3D!.visible = false; return; }
    if (stage3Engaged) { showPanel(stage3Panel); return; }
    const cam = world.camera;
    if (!cam) return;
    cam.getWorldPosition(bank3CamPos);
    const dx = bank3CamPos.x - STATIONS.bank.x;
    const dz = bank3CamPos.z - STATIONS.bank.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (3.0 >= dist) showPanel(stage3Panel);
    else stage3Panel.object3D!.visible = false;
  }, 33);

  // ==========================================================================
  // MONEY REPORT  -  the finale. Reads the three meters, names the money
  // personality, greets the chosen explorer, and offers Play Again.
  // ==========================================================================
  // {shop} is swapped for the chosen shop's name in showReport, so no blurb is
  // hard-wired to the bakery anymore.
  const OWNER_TYPES: Record<string, { name: string; blurb: string }> = {
    bossMaterial: {
      name: "Boss Material",
      blurb: "You kept customers happy, the money strong, and your gut in charge, all at once. That is the whole package. {shop} is lucky to have you.",
    },
    crowdPleaser: {
      name: "The Crowd-Pleaser",
      blurb: "Customers loved your shop today. You put people first, and it showed. A happy, loyal crowd is worth its weight in gold.",
    },
    dealMaker: {
      name: "The Deal-Maker",
      blurb: "You had a sharp eye for profit and made the money work. Every shop needs a boss who watches the bottom line, and that is you.",
    },
    natural: {
      name: "The Natural",
      blurb: "You trusted your instincts and made smart calls all day. That kind of judgment is what turns a good shop into a great one.",
    },
    steadyHand: {
      name: "The Steady Hand",
      blurb: "You kept everything balanced and steady from open to close. No panic, no drama, just solid choices. That is how shops last.",
    },
    learningRopes: {
      name: "Learning the Ropes",
      blurb: "Running a shop is hard work, and you gave it a real go today. Every great boss starts somewhere. Come back and try a few new moves!",
    },
  };

  const reportPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/report.json", maxWidth: 2.6, maxHeight: 2.9 })
    .addComponent(Interactable);
  reportPanel.object3D!.position.set(STATIONS.bank.x, 1.6, STATIONS.bank.z + 2.2);
  reportPanel.object3D!.visible = false;
  phasePanels[PHASE_CLOSE] = reportPanel;

  let reportDoc: any = null;
  let lastResultText = "";   // the copyable text blob, rebuilt each time the report shows
  let playAgainArmed = false; // Play Again is a two-tap confirm so a stray click can't nuke results

  // Put the day's results on the clipboard as a plain-text blob the student can
  // paste into a discussion post or the LMS. Falls back quietly if the browser
  // blocks clipboard access (e.g. no user gesture / insecure context).
  function copyResults(doc: any) {
    const label = doc.getElementById("copy-label");
    function flash(text: string) {
      label?.setProperties({ text: text });
      setTimeout(function () { label?.setProperties({ text: "Copy My Results" }); }, 2200);
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lastResultText).then(
          function () { flash("Copied!"); },
          function () { flash("Copy blocked"); },
        );
      } else {
        flash("Copy blocked");
      }
    } catch {
      flash("Copy blocked");
    }
  }

  // Save the result for a teacher/debrief: to localStorage (a rolling history of
  // the last 20 runs, plus the latest) and, when embedded in a course shell, up
  // to the parent frame via postMessage. The schema is documented in README.md.
  function saveResult(payload: any) {
    try {
      localStorage.setItem("bossForADay:last", JSON.stringify(payload));
      const raw = localStorage.getItem("bossForADay:history");
      const hist = raw ? JSON.parse(raw) : [];
      hist.push(payload);
      while (hist.length > 20) hist.shift();
      localStorage.setItem("bossForADay:history", JSON.stringify(hist));
    } catch { /* storage may be blocked/full; not fatal */ }
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "bossForADay:result", payload: payload }, "*");
      }
    } catch { /* cross-origin parent; ignore */ }
  }

  // A plain-text version of the results for the clipboard / a discussion post.
  function buildResultText(payload: any, best: Decision | null, worst: Decision | null): string {
    const net = payload.money.net;
    const lines: string[] = [];
    lines.push("Boss for a Day - my results");
    lines.push("Shop: " + payload.shop.name);
    lines.push("Boss: " + payload.player + " (" + payload.personality + ")");
    lines.push("Net profit: " + (net >= 0 ? "+$" : "-$") + Math.abs(net) + "  (in $" + payload.money.in + ", out $" + payload.money.out + ")");
    lines.push("Meters - Satisfaction " + payload.meters.satisfaction + ", Profit " + payload.meters.profit + ", Instinct " + payload.meters.instinct);
    if (best) lines.push("Best call: " + best.title + " - " + best.choice);
    if (worst) lines.push("Try next time: " + worst.title + " - " + worst.choice);
    lines.push("");
    lines.push("My choices:");
    for (let i = 0; i < payload.decisions.length; i = i + 1) {
      const d = payload.decisions[i];
      lines.push((i + 1) + ". " + d.title + " - " + d.choice);
    }
    return lines.join("\n");
  }

  whenPanelReady(reportPanel, function (doc) {
    reportDoc = doc;
    const pageMain = doc.getElementById("page-main");
    const pageRecap = doc.getElementById("page-recap");

    // The recap page is authored display:flex so UIKit builds its lines; hide it
    // now (its elements stay findable) so the report opens on the debrief page.
    pageRecap?.setProperties({ display: "none" });

    doc.getElementById("see-choices-button")?.setProperties({
      onClick: function () {
        sfxClick();
        pageMain?.setProperties({ display: "none" });
        pageRecap?.setProperties({ display: "flex" });
      },
    });
    doc.getElementById("recap-back-button")?.setProperties({
      onClick: function () {
        sfxClick();
        pageRecap?.setProperties({ display: "none" });
        pageMain?.setProperties({ display: "flex" });
      },
    });
    doc.getElementById("copy-button")?.setProperties({
      onClick: function () { sfxClick(); copyResults(doc); },
    });
    doc.getElementById("play-again-button")?.setProperties({
      onClick: function () {
        sfxClick();
        if (!playAgainArmed) {
          playAgainArmed = true;
          doc.getElementById("play-again-label")?.setProperties({ text: "Tap again to restart" });
          setTimeout(function () {
            playAgainArmed = false;
            doc.getElementById("play-again-label")?.setProperties({ text: "Play Again" });
          }, 3000);
          return;
        }
        window.location.reload(); // a clean, full restart back to the title
      },
    });
  });

  // Decide the money personality from the final meters, fill the card, show it.
  function showReport() {
    // Net profit for the day is simply money in minus money out. Tie the abstract
    // Business Profit meter to the real dollars so the two never disagree: a truly
    // profitable day lifts it, a thin day dents it. Do this BEFORE reading the
    // meters below so the personality reflects the reconciled numbers.
    const netProfit = dayMoneyIn - dayMoneyOut;
    let profitNudge = 0;
    if (netProfit >= 250) profitNudge = 10;
    else if (netProfit >= 170) profitNudge = 5;
    else if (netProfit >= 90) profitNudge = 0;
    else if (netProfit >= 30) profitNudge = -5;
    else profitNudge = -10;
    if (profitNudge !== 0) updateScore("profit", profitNudge);

    const S = scoreSatisfaction;
    const P = scoreProfit;
    const I = scoreInstinct;
    const avg = (S + P + I) / 3;
    const hi = Math.max(S, P, I);
    const lo = Math.min(S, P, I);
    const spread = hi - lo;

    let key: string;
    if (avg < 45) {
      key = "learningRopes";
    } else if (spread <= 15 && avg >= 65) {
      key = "bossMaterial";
    } else if (spread <= 15) {
      key = "steadyHand";
    } else if (S === hi) {
      key = "crowdPleaser";
    } else if (P === hi) {
      key = "dealMaker";
    } else {
      key = "natural";
    }

    const t = OWNER_TYPES[key];
    const name = chosenCharacter ? chosenCharacter.name : "boss";
    const blurb = t.blurb.split("{shop}").join(activeShop.shopName);
    const netProfitStr = (netProfit >= 0 ? "+$" : "-$") + Math.abs(netProfit);

    // Best call = the choice that helped the meters most; the one to rethink =
    // the choice that helped least (its own feedback line is the "what to try" tip).
    let best: Decision | null = null;
    let worst: Decision | null = null;
    for (const d of dayDecisions) {
      if (!best || d.score > best.score) best = d;
      if (!worst || d.score < worst.score) worst = d;
    }

    // The three reflection prompts from the module outline's debrief.
    const reflections = [
      "What was the hardest choice you faced today, and how did you handle it?",
      "Name one time you gave up something to get something else. That is opportunity cost.",
      "If you ran the shop again, what would you change to earn more or make customers happier?",
    ];

    // Build the result payload, persist it (localStorage + postMessage), and keep
    // the copyable text blob ready for the Copy My Results button.
    const payload = {
      app: "boss-for-a-day",
      schema: 1,
      timestamp: new Date().toISOString(),
      shop: { id: activeShop.id, name: activeShop.shopName },
      player: name,
      personality: t.name,
      meters: { satisfaction: S, profit: P, instinct: I },
      money: { start: dayStartCash, in: dayMoneyIn, out: dayMoneyOut, net: netProfit },
      decisions: dayDecisions.map(function (d) { return { title: d.title, choice: d.choice, score: d.score }; }),
    };
    saveResult(payload);
    lastResultText = buildResultText(payload, best, worst);

    if (reportDoc) {
      reportDoc.getElementById("report-eyebrow")?.setProperties({ text: activeShop.shopName.toUpperCase() });
      reportDoc.getElementById("greeting")?.setProperties({ text: "Great work, " + name + "!" });
      reportDoc.getElementById("personality-name")?.setProperties({ text: t.name });
      reportDoc.getElementById("personality-blurb")?.setProperties({ text: blurb });
      reportDoc.getElementById("value-sat")?.setProperties({ text: String(S) });
      reportDoc.getElementById("value-profit")?.setProperties({ text: String(P) });
      reportDoc.getElementById("value-instinct")?.setProperties({ text: String(I) });
      reportDoc.getElementById("fill-sat")?.setProperties({ width: Math.round(S * 0.4) });
      reportDoc.getElementById("fill-profit")?.setProperties({ width: Math.round(P * 0.4) });
      reportDoc.getElementById("fill-instinct")?.setProperties({ width: Math.round(I * 0.4) });

      // The dollars: money in, money out, and the day's net profit.
      reportDoc.getElementById("report-money-in")?.setProperties({ text: "$" + dayMoneyIn });
      reportDoc.getElementById("report-money-out")?.setProperties({ text: "$" + dayMoneyOut });
      reportDoc.getElementById("report-net")?.setProperties({ text: netProfitStr, color: netProfit >= 0 ? "#2e7d32" : "#b23a2e" });

      // Best call of the day / one thing to try next time.
      reportDoc.getElementById("report-best")?.setProperties({ text: best ? best.title + ": " + best.choice + "." : "You gave it a real go today." });
      reportDoc.getElementById("report-try")?.setProperties({ text: worst ? worst.feedback : "Try a different shop and see what changes." });

      // Recap page: one line per decision, hiding the unused slots.
      for (let i = 0; i < 14; i = i + 1) {
        const el = reportDoc.getElementById("recap-line-" + i);
        if (!el) continue;
        if (i < dayDecisions.length) {
          const d = dayDecisions[i];
          el.setProperties({ text: (i + 1) + ". " + d.title + " - " + d.choice, display: "flex" });
        } else {
          el.setProperties({ display: "none" });
        }
      }
      for (let i = 0; i < reflections.length; i = i + 1) {
        reportDoc.getElementById("think-line-" + i)?.setProperties({ text: (i + 1) + ". " + reflections[i] });
      }

      // Always open on the debrief page, never the recap.
      reportDoc.getElementById("page-main")?.setProperties({ display: "flex" });
      reportDoc.getElementById("page-recap")?.setProperties({ display: "none" });
    }

    sfxFanfare();
    showPhase(PHASE_CLOSE);
    presentPanel(reportPanel);
    setObjective("You ran the shop! Here is how your day went.");
  }

  // Watch all the story panels so the on-top loop keeps whichever is showing
  // fully drawn over Gus, his cart, or a building.
  storyPanels.push(
    setupPanel,
    gusQ1Panel,
    stage1MoneyPanel,
    gusQ2Panel,
    stage2Panel,
    gusQ3Panel,
    stage3Panel,
    reportPanel,
  );

  // ========================================================================
  // SHOP PICKER - the first thing the player sees. The floor, walls, and sky
  // are already built, so the player stands in an empty themed room. Tapping a
  // shop sets the active pack, builds that shop's props, hides the picker, and
  // runs the opening.
  // ========================================================================
  // A brief "setting up" card, shown between picking a shop and the shop appearing.
  const loadingPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/loading.json", maxWidth: 2.2, maxHeight: 1.4 })
    .addComponent(Interactable);
  loadingPanel.object3D!.position.set(0, 1.6, 4);
  loadingPanel.object3D!.visible = false;

  const shopPickerPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/shop-picker.json", maxWidth: 2.8, maxHeight: 2.2 })
    .addComponent(Interactable);
  shopPickerPanel.object3D!.position.set(0, 1.6, 4);
  shopPickerPanel.object3D!.visible = false;

  whenPanelReady(shopPickerPanel, function (doc) {
    // How long the "Setting up your shop..." card shows before the shop appears.
    const SHOP_SETUP_MS = 1200;
    function pick(id: ShopId) {
      sfxClick();
      setActiveShop(id);
      shopPickerPanel.object3D!.visible = false;
      loadingPanel.object3D!.visible = true;
      setTimeout(function () {
        // The shop appears now: reveal the shell, build this shop's fixtures,
        // reword and recolor, and switch the sky from lobby to morning.
        ground.object3D!.visible = true;
        built.boundary.object3D!.visible = true;
        for (const e of built.street) e.object3D!.visible = true;
        buildShopProps(world, id);
        applyShopWords(SHOPS[id]);
        applyShopTheme(SHOPS[id]);
        applyShopGameTheme(SHOPS[id]);
        applyShopHudTheme(SHOPS[id]);
        setStageLook(world, PHASE_MORNING);
        loadingPanel.object3D!.visible = false;
        startOpening();
      }, SHOP_SETUP_MS);
    }
    doc.getElementById("shop-bakery")?.setProperties({ onClick: function () { pick("bakery"); } });
    doc.getElementById("shop-surf")?.setProperties({ onClick: function () { pick("surf"); } });
    doc.getElementById("shop-repair")?.setProperties({ onClick: function () { pick("repair"); } });
  });

  // The orientation screen shows first. Its button reveals the shop picker.
  const introPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/intro.json", maxWidth: 2.6, maxHeight: 2.5 })
    .addComponent(Interactable);
  introPanel.object3D!.position.set(0, 1.6, 4);
  introPanel.object3D!.visible = false;
  whenPanelReady(introPanel, function (doc) {
    doc.getElementById("intro-continue")?.setProperties({
      onClick: function () {
        sfxClick();
        introPanel.object3D!.visible = false;
        shopPickerPanel.object3D!.visible = true;
        setObjective("Choose the shop you want to run for the day.");
      },
    });
  });

  // Show the welcome screen first; the picker appears when they continue.
  introPanel.object3D!.visible = true;

  // ========================================================================
  // SHOP WORDS - overwrite each panel's per-shop text from the chosen pack.
  // Called once, the moment a shop is picked, so every panel shows that
  // shop's words. The questions and activities get added here in 3b and 3c.
  // ========================================================================
  function applyShopWords(pack: ShopPack) {
    whenPanelReady(titlePanel, function (doc) {
      doc.getElementById("subtitle")?.setProperties({ text: pack.subtitle });
    });
    whenPanelReady(welcomePanel, function (doc) {
      // Only the premise is per-shop now; the trimmed how-to-play cards are shared.
      doc.getElementById("welcome-premise")?.setProperties({ text: pack.premise });
    });

    // Shuffle each owner question once, here at shop pick, so the best answer
    // lands on a random button this playthrough. The same order drives the click
    // handlers (via gusNOrder), so labels and scoring never drift apart.
    whenPanelReady(gusQ1Panel, function (doc) {
      const q = pack.morning;
      gus1Order = shuffleOpts(buildGusOpts(q));
      doc.getElementById("eyebrow-asks")?.setProperties({ text: pack.ownerName.toUpperCase() + " ASKS" });
      doc.getElementById("eyebrow-says")?.setProperties({ text: pack.ownerName.toUpperCase() + " SAYS" });
      doc.getElementById("q-text")?.setProperties({ text: q.gusQ });
      doc.getElementById("answer-a-label")?.setProperties({ text: gus1Order[0].label });
      doc.getElementById("answer-b-label")?.setProperties({ text: gus1Order[1].label });
      doc.getElementById("answer-c-label")?.setProperties({ text: gus1Order[2].label });
    });

    whenPanelReady(gusQ2Panel, function (doc) {
      const q = pack.midday;
      gus2Order = shuffleOpts(buildGusOpts(q));
      doc.getElementById("eyebrow-asks")?.setProperties({ text: pack.ownerName.toUpperCase() + " ASKS" });
      doc.getElementById("eyebrow-says")?.setProperties({ text: pack.ownerName.toUpperCase() + " SAYS" });
      doc.getElementById("q-text")?.setProperties({ text: q.gusQ });
      doc.getElementById("answer-a-label")?.setProperties({ text: gus2Order[0].label });
      doc.getElementById("answer-b-label")?.setProperties({ text: gus2Order[1].label });
      doc.getElementById("answer-c-label")?.setProperties({ text: gus2Order[2].label });
    });

    whenPanelReady(gusQ3Panel, function (doc) {
      const q = pack.afternoon;
      gus3Order = shuffleOpts(buildGusOpts(q));
      doc.getElementById("eyebrow-asks")?.setProperties({ text: pack.ownerName.toUpperCase() + " ASKS" });
      doc.getElementById("eyebrow-says")?.setProperties({ text: pack.ownerName.toUpperCase() + " SAYS" });
      doc.getElementById("q-text")?.setProperties({ text: q.gusQ });
      doc.getElementById("answer-a-label")?.setProperties({ text: gus3Order[0].label });
      doc.getElementById("answer-b-label")?.setProperties({ text: gus3Order[1].label });
      doc.getElementById("answer-c-label")?.setProperties({ text: gus3Order[2].label });
    });

    whenPanelReady(stage1MoneyPanel, function (doc) {
      const q = pack.morning;
      applyDecisionWords(doc, "special", pack.special);
      doc.getElementById("supply-q")?.setProperties({ text: pack.economy.oppQ });
      doc.getElementById("supply-deal-label")?.setProperties({ text: pack.economy.oppDealLabel });
      doc.getElementById("supply-flyer-label")?.setProperties({ text: pack.economy.oppFlyerLabel });
      doc.getElementById("price-q")?.setProperties({ text: q.priceQ });
      doc.getElementById("price-premium-label")?.setProperties({ text: q.priceP });
      doc.getElementById("price-fair-label")?.setProperties({ text: q.priceF });
      doc.getElementById("price-bargain-label")?.setProperties({ text: q.priceB });
      doc.getElementById("stock-q")?.setProperties({ text: q.stockQ });
      doc.getElementById("stock-fancy-label")?.setProperties({ text: q.stockFancy });
      doc.getElementById("stock-mix-label")?.setProperties({ text: q.stockMix });
      doc.getElementById("stock-bulk-label")?.setProperties({ text: q.stockBulk });
    });

    whenPanelReady(stage2Panel, function (doc) {
      const q = pack.midday;
      applyDecisionWords(doc, "delay", q.delay);
      doc.getElementById("rival-q")?.setProperties({ text: q.rivalQ });
      doc.getElementById("rival-hold-label")?.setProperties({ text: q.rivalHold });
      doc.getElementById("rival-match-label")?.setProperties({ text: q.rivalMatch });
      doc.getElementById("rival-ignore-label")?.setProperties({ text: q.rivalIgnore });
      doc.getElementById("comp-q")?.setProperties({ text: q.compQ });
      doc.getElementById("comp-free-label")?.setProperties({ text: q.compFree });
      doc.getElementById("comp-discount-label")?.setProperties({ text: q.compDiscount });
      doc.getElementById("comp-firm-label")?.setProperties({ text: q.compFirm });
    });

    whenPanelReady(stage3Panel, function (doc) {
      const q = pack.afternoon;
      applyDecisionWords(doc, "capacity", q.capacity);
      doc.getElementById("close-q")?.setProperties({ text: q.leftoverQ });
      doc.getElementById("close-donate-label")?.setProperties({ text: q.leftDonate });
      doc.getElementById("close-markdown-label")?.setProperties({ text: q.leftMarkdown });
      doc.getElementById("close-toss-label")?.setProperties({ text: q.leftToss });
      doc.getElementById("order-q")?.setProperties({ text: q.orderQ });
      doc.getElementById("order-premium-label")?.setProperties({ text: q.orderP });
      doc.getElementById("order-fair-label")?.setProperties({ text: q.orderF });
      doc.getElementById("order-friendly-label")?.setProperties({ text: q.orderFriendly });
    });
  }

  // ========================================================================
  // SHOP THEME - paint the onboarding cards (title, welcome, character pick)
  // in the chosen shop's colors. Same idea as applyShopWords, but for color.
  // ========================================================================
  function applyShopTheme(pack: ShopPack) {
    const t = pack.theme;
    whenPanelReady(titlePanel, function (doc) {
      doc.getElementById("title-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      doc.getElementById("title-text")?.setProperties({ color: t.ink });
      doc.getElementById("subtitle")?.setProperties({ color: t.ink });
      doc.getElementById("start-button")?.setProperties({ backgroundColor: t.accent });
      doc.getElementById("start-label")?.setProperties({ color: t.accentInk });
    });
    whenPanelReady(welcomePanel, function (doc) {
      doc.getElementById("welcome-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      doc.getElementById("welcome-eyebrow")?.setProperties({ color: t.ink });
      doc.getElementById("welcome-heading")?.setProperties({ color: t.ink });
      for (const sid of ["step-1", "step-2", "step-3"]) {
        doc.getElementById(sid)?.setProperties({ backgroundColor: t.boxBg, borderColor: t.boxBorder });
      }
      doc.getElementById("next-button")?.setProperties({ backgroundColor: t.accent });
      doc.getElementById("next-label")?.setProperties({ color: t.accentInk });
    });
    whenPanelReady(setupPanel, function (doc) {
      doc.getElementById("setup-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      doc.getElementById("setup-heading")?.setProperties({ color: t.ink });
      for (const cid of ["card-ada", "card-leo", "card-mia", "card-sam"]) {
        doc.getElementById(cid)?.setProperties({ backgroundColor: t.boxBg });
      }
    });
  }

  // ====================================================================
  // SHOP GAME THEME - paint the question, activity, and report panels in
  // the chosen shop's colors, including the bakery.
  // ====================================================================
  function applyShopGameTheme(pack: ShopPack) {
    const t = pack.theme;

    // The owner's three question panels (morning, midday, afternoon).
    for (const panel of [gusQ1Panel, gusQ2Panel, gusQ3Panel]) {
      whenPanelReady(panel, function (doc) {
        doc.getElementById("game-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
        for (const aid of ["answer-a", "answer-b", "answer-c"]) {
          doc.getElementById(aid)?.setProperties({ backgroundColor: t.boxBg, borderColor: t.boxBorder, hover: { backgroundColor: t.boxBorder } });
        }
        for (const tid of ["q-text", "answer-a-label", "answer-b-label", "answer-c-label", "reply-text"]) {
          doc.getElementById(tid)?.setProperties({ color: t.ink });
        }
      });
    }

    // Morning activity panel: the growth decision, pricing, and stocking.
    whenPanelReady(stage1MoneyPanel, function (doc) {
      doc.getElementById("game-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      for (const aid of ["special-opt0", "special-opt1", "special-opt2", "supply-deal", "supply-flyer", "price-premium", "price-fair", "price-bargain", "stock-fancy", "stock-mix", "stock-bulk"]) {
        doc.getElementById(aid)?.setProperties({ backgroundColor: t.boxBg, borderColor: t.boxBorder });
      }
      for (const tid of ["special-q", "special-opt0-label", "special-opt1-label", "special-opt2-label", "supply-q", "supply-deal-label", "supply-flyer-label", "price-q", "stock-q", "price-premium-label", "price-fair-label", "price-bargain-label", "stock-fancy-label", "stock-mix-label", "stock-bulk-label", "ready-text"]) {
        doc.getElementById(tid)?.setProperties({ color: t.ink });
      }
    });

    // Midday activity panel: rival and complaint.
    whenPanelReady(stage2Panel, function (doc) {
      doc.getElementById("game-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      for (const aid of ["delay-opt0", "delay-opt1", "delay-opt2", "rival-hold", "rival-match", "rival-ignore", "comp-free", "comp-discount", "comp-firm"]) {
        doc.getElementById(aid)?.setProperties({ backgroundColor: t.boxBg, borderColor: t.boxBorder });
      }
      for (const tid of ["delay-q", "delay-opt0-label", "delay-opt1-label", "delay-opt2-label", "rival-q", "comp-q", "rival-hold-label", "rival-match-label", "rival-ignore-label", "comp-free-label", "comp-discount-label", "comp-firm-label", "done-text"]) {
        doc.getElementById(tid)?.setProperties({ color: t.ink });
      }
    });

    // Afternoon activity panel: leftovers and the big order.
    whenPanelReady(stage3Panel, function (doc) {
      doc.getElementById("game-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      for (const aid of ["capacity-opt0", "capacity-opt1", "capacity-opt2", "close-donate", "close-markdown", "close-toss", "order-premium", "order-fair", "order-friendly"]) {
        doc.getElementById(aid)?.setProperties({ backgroundColor: t.boxBg, borderColor: t.boxBorder });
      }
      for (const tid of ["capacity-q", "capacity-opt0-label", "capacity-opt1-label", "capacity-opt2-label", "close-q", "order-q", "close-donate-label", "close-markdown-label", "close-toss-label", "order-premium-label", "order-fair-label", "order-friendly-label", "done-text"]) {
        doc.getElementById(tid)?.setProperties({ color: t.ink });
      }
    });

    // End-of-day report card (meters keep their own colors).
    whenPanelReady(reportPanel, function (doc) {
      doc.getElementById("report-card")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      for (const tid of ["greeting", "personality-name", "personality-blurb"]) {
        doc.getElementById(tid)?.setProperties({ color: t.ink });
      }
    });

    // In-headset dashboard (the bars, money, and objective keep their own colors).
    whenPanelReady(dashboardPanel, function (doc) {
      doc.getElementById("dash-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      for (const tid of ["dash-title", "dash-label-sat", "dash-label-profit", "dash-label-instinct", "dash-val-sat", "dash-val-profit", "dash-val-instinct"]) {
        doc.getElementById(tid)?.setProperties({ color: t.ink });
      }
    });
  }

  // Log the economy config once so we can confirm it loaded.
  console.log("[Boss for a Day] economy loaded", ECONOMY);

  // consumePress: clear a stuck "Pressed" tag so 3D buttons stay reliable.
  // Used once the panels and 3D buttons arrive in later prompts.
  function consumePress(entity: any) {
    if (entity && entity.hasComponent(Pressed)) {
      entity.removeComponent(Pressed);
    }
  }
  void consumePress;
});
