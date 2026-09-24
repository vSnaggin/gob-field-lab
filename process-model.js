// Pure process model: deterministic playback and reversible scrubbing.
// Default teaching rates are ILLUSTRATIVE / not calibrated against field production.
// Optional CALIBRATED mode swaps labeled literature-range defaults (not mine-specific).

export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); };
export const SIM_SECONDS = 110;

/** Shared geometry / timeline (mode-independent). */
export const MODEL = Object.freeze({
  faceStart: -21,
  faceTravel: 52,
  seamHeight: 2.3,
  minutes: 720,
  boreArea: Math.PI * 0.1 ** 2,
  intakeHeight: 1.2,
  /** ILLUSTRATIVE default drive (kPa). Calibrated mode overrides via resolveProcessParams. */
  driveKPa: 14,
  maxWater: 4.8
});

export const ROOF = [
  { bottom: 2.3, thickness: .72, type: 'shale', drop: 1.86 },
  { bottom: 3.02, thickness: .83, type: 'silt', drop: 1.43 },
  { bottom: 3.85, thickness: 1.0, type: 'shale', drop: 1.04 },
  { bottom: 4.85, thickness: 1.1, type: 'sand', drop: .72 }
];

/** Process-mode ids. Default remains illustrative for scrub-identity. */
export const PROCESS_MODES = Object.freeze({
  ILLUSTRATIVE: 'illustrative',
  CALIBRATED: 'calibrated'
});
export const DEFAULT_PROCESS_MODE = PROCESS_MODES.ILLUSTRATIVE;

/**
 * ILLUSTRATIVE supply rates (L/min) — teaching clarity only.
 * Identity-locked with Alan scrub (28/28); do not change without re-scrub.
 */
export const ILLUSTRATIVE_SUPPLY_LPM = Object.freeze({ dry: 0, seep: .025, wet: .48 });

/**
 * CALIBRATED labeled defaults — transparent literature-range picks, NOT field calibration.
 *
 * driveKPa 30 — typical active GVB wellhead vacuum used as CFD baseline in U.S. longwall
 *   gob-ventilation studies (e.g. ~30 kPa / 4 psi in Optimization of gob ventilation boreholes,
 *   Int. J. Min. Sci. Technol. / NIOSH-linked GVB work). Broader practice spans slight suction
 *   (~6.9 kPa / 1 psi can raise production; EPA Enhanced Gob Gas Recovery) up to industrial
 *   exhauster ratings (~17–50 kPa / 5–15 in Hg). 30 kPa is a documented mid active-extraction
 *   teaching default — not a Warrior Met / Blue Creek measurement.
 *
 * supplyLpm — order-of-magnitude connected-water entry into a conceptual 0.20 m bore.
 *   Wet ~1.2 L/min sits below multi-L/min water encounters reported for overburden/gob
 *   boreholes (e.g. USBM/CDC underground gob-drainage water tables) while still loading
 *   the teaching bore under the calibrated drive. Seep stays a light connected trickle.
 *   These are labeled defaults, not site hydrology.
 *
 * maxWater — unchanged (4.8 m): column above intake can still exceed 30 kPa head
 *   (ρg·3.06 m ≈ 30 kPa), so wet can still water-load without changing Mark’s meter scale.
 *
 * Restriction law — √(1 − head/drive) RETAINED (see SQRT_LAW rationale). Calibrated path
 *   only changes drive + supply; the curve shape stays the orifice/Bernoulli teaching form.
 */
export const CALIBRATED = Object.freeze({
  driveKPa: 30,
  maxWater: 4.8,
  supplyLpm: Object.freeze({ dry: 0, seep: .05, wet: 1.2 })
});

/**
 * Resolve mode-dependent fluid params. Geometry/timeline always from MODEL.
 * @param {'illustrative'|'calibrated'} [mode]
 */
export function resolveProcessParams(mode = DEFAULT_PROCESS_MODE) {
  const calibrated = mode === PROCESS_MODES.CALIBRATED;
  return Object.freeze({
    mode: calibrated ? PROCESS_MODES.CALIBRATED : PROCESS_MODES.ILLUSTRATIVE,
    driveKPa: calibrated ? CALIBRATED.driveKPa : MODEL.driveKPa,
    maxWater: calibrated ? CALIBRATED.maxWater : MODEL.maxWater,
    supplyLpm: calibrated ? CALIBRATED.supplyLpm : ILLUSTRATIVE_SUPPLY_LPM,
    boreArea: MODEL.boreArea,
    intakeHeight: MODEL.intakeHeight,
    minutes: MODEL.minutes
  });
}

export function faceAt(t) { return MODEL.faceStart + MODEL.faceTravel * clamp(t, 0, 100) / 100; }
export function cavePose(t, x, layer, seed = 0) {
  const behind = faceAt(t) - x;
  const lag = 3.7 + layer * .8 + hash(seed) * .7;
  const release = clamp((behind - lag) / 2.8);
  const fall = release < .8 ? (release / .8) ** 2 : 1;
  const rebound = release >= .8 ? .035 * Math.sin((release - .8) * Math.PI / .2) : 0;
  const sag = .07 * smooth(1.5, lag, behind);
  const drop = sag + (ROOF[layer].drop - sag) * fall - rebound;
  return { release, drop, tilt: (hash(seed + 12) - .5) * .5 * smooth(0, 1, release), settle: .055 * smooth(lag + 8, lag + 22, behind) };
}
export function connectionAt(t) { return smooth(.12, .88, cavePose(t, 0, 2, 13).release); }
export function advanceTimeline(t, dt) { return clamp(t + Math.max(0, Math.min(.15, dt)) * (100 / SIM_SECONDS), 0, 100); }

/**
 * √-law gas restriction from liquid head under assumed drive.
 * Why √ stays: treating remaining driving ΔP against liquid hydrostatic backpressure as an
 * orifice/Bernoulli capacity (Q ∝ √ΔP) collapses to √(1 − head/drive) when drive is the
 * available gas-driving pressure at zero head. Same form for both modes; calibrated only
 * changes the drive magnitude. Not a mine-specific multiphase wellbore model.
 */
export function gasHeadRestriction(headKPa, driveKPa = MODEL.driveKPa) {
  const drive = Math.max(1e-9, driveKPa);
  return Math.sqrt(Math.max(0, 1 - Math.max(0, headKPa) / drive));
}

/**
 * Instantaneous fluid rates at scrub time t.
 * @param {number} t scrub percent 0–100
 * @param {number} level water level m from bore bottom
 * @param {'dry'|'seep'|'wet'} scenario
 * @param {'illustrative'|'calibrated'} [mode] default illustrative (identity path)
 */
export function fluidRates(t, level, scenario, mode = DEFAULT_PROCESS_MODE) {
  const params = resolveProcessParams(mode);
  const connection = connectionAt(t);
  const headKPa = Math.max(0, level - params.intakeHeight) * 9.80665;
  const potential = connection * (1 - .18 * smooth(78, 100, t));
  const gas = potential * gasHeadRestriction(headKPa, params.driveKPa);
  const supply = params.supplyLpm[scenario] ?? params.supplyLpm.seep;
  const inflow = supply * connection * Math.max(0, 1 - level / 6);
  const carry = .1 * Math.max(0, gas - .35) * Math.min(1, level / .18);
  return { connection, headKPa, gas, inflow, carry, driveKPa: params.driveKPa, processMode: params.mode };
}

/**
 * Precompute fluid table for scrubbing.
 * @param {'dry'|'seep'|'wet'} scenario
 * @param {'illustrative'|'calibrated'} [mode] default illustrative
 */
export function buildFluidTable(scenario, mode = DEFAULT_PROCESS_MODE) {
  const params = resolveProcessParams(mode);
  const table = []; let volume = 0;
  const step = .1, minutesPerStep = params.minutes * step / 100;
  for (let i = 0; i <= 1000; i++) {
    const t = i * step, level = volume / params.boreArea;
    const rates = fluidRates(t, level, scenario, mode);
    table.push({ t, level, volume, ...rates });
    volume = clamp(volume + (rates.inflow - rates.carry) / 1000 * minutesPerStep, 0, params.boreArea * params.maxWater);
  }
  return table;
}
export function sampleFluids(table, t) {
  const at = clamp(t, 0, 100) * 10, i = Math.floor(at), a = table[i], b = table[Math.min(i + 1, 1000)], k = at - i;
  const f = {};
  for (const key of ['level', 'volume', 'gas', 'inflow', 'carry', 'headKPa', 'connection', 'driveKPa']) {
    const av = a[key], bv = b[key];
    f[key] = (av == null && bv == null) ? undefined : (Number(av) || 0) + ((Number(bv) || 0) - (Number(av) || 0)) * k;
  }
  f.processMode = a.processMode ?? DEFAULT_PROCESS_MODE;
  return f;
}

// Alfred chapter cues — keep title/text intact; UI may cross-link teaching telemetry only.
export function cueAt(t, scenario, fluids) {
  if (t < 14) return { id: 0, title: 'Before mining', text: 'Solid coal supports the roof. The surface gob well will gain a stronger connection as mining opens fractures through the surrounding beds.' };
  if (t < 42) return { id: 1, title: 'The face advances', text: 'The shields support the working face. Behind them, the immediate roof loses support and breaks into fragments. Higher beds bend and separate above the growing gob.' };
  if (t < 56) return { id: 2, title: 'Past the well', text: 'The face has passed the well. A useful gas connection depends on roof disruption and connected fractures, not on the face position alone.' };
  if (t < 70) return { id: 3, title: 'Fractures connect', text: 'Pale trails trace gas through separated beds into the conceptual slotted casing. Pressure differences drive flow toward the well. Methane itself is invisible.' };
  if (t < 86) return { id: 4, title: 'Water and gas', text: scenario === 'dry' ? 'With no connected water supply, the bore stays dry. Gas continues through the fractures as the gob consolidates.' : scenario === 'wet' ? 'Water enters faster than the gas can carry it out. It pools below the inlet. Once the inlet is submerged, the water column adds backpressure.' : 'A light seep drains down the casing. Some droplets move upward with the gas; the rest forms a small pool below the inlet.' };
  return { id: 5, title: fluids.gas < .03 && fluids.connection > .8 ? 'Water-loaded well' : 'Settling gob', text: fluids.gas < .03 && fluids.connection > .8 ? 'Water head now consumes the assumed gas-driving pressure. Gas delivery stops in this example. Real loading depends on the completion, water supply, and measured pressures.' : 'Broken rock settles while the main roof sags above it. Fractures can remain open, allowing gas to reach the well after the face has moved on.' };
}

// ---------- Scrub-sync teaching knobs ----------
export const TEACHING_DISCLAIMER = 'ILLUSTRATIVE · not calibrated';
export const CALIBRATED_DISCLAIMER = 'CALIBRATED RANGES · literature defaults · not mine-specific';
export const SQRT_LAW_FOOTNOTE = 'Water head restricts gas via √(1−head/drive) under the assumed 14 kPa drive — teaching clarity, not new physics. Rates shown while scrubbing are illustrative / not calibrated.';
export const CALIBRATED_SQRT_LAW_FOOTNOTE = 'Water head restricts gas via √(1−head/drive) under the labeled 30 kPa drive (typical active GVB vacuum baseline in published CFD). Same orifice/Bernoulli teaching form as illustrative — not a multiphase wellbore calibration. Rates are literature-range defaults / not mine-specific.';

const INFLOW_MODE = Object.freeze({
  dry: 'Dry fractures',
  seep: 'Small seep',
  wet: 'Strong water entry'
});

const PROCESS_MODE_LABEL = Object.freeze({
  illustrative: 'Illustrative (teaching)',
  calibrated: 'Calibrated ranges (literature)'
});

export function inflowModeLabel(scenario) {
  return INFLOW_MODE[scenario] ?? INFLOW_MODE.seep;
}

export function processModeLabel(mode) {
  return PROCESS_MODE_LABEL[mode] ?? PROCESS_MODE_LABEL.illustrative;
}

/** Snapshot of key scrub teaching rates for the telemetry panel. */
export function formatTeachingTelemetry(fluids, scenario, mode = DEFAULT_PROCESS_MODE) {
  const params = resolveProcessParams(mode);
  const calibrated = params.mode === PROCESS_MODES.CALIBRATED;
  return {
    disclaimer: calibrated ? CALIBRATED_DISCLAIMER : TEACHING_DISCLAIMER,
    processMode: params.mode,
    processModeLabel: processModeLabel(params.mode),
    inflowMode: inflowModeLabel(scenario),
    headKPa: Number(fluids.headKPa) || 0,
    gas: Number(fluids.gas) || 0,
    carry: Number(fluids.carry) || 0,
    connection: Number(fluids.connection) || 0,
    inflow: Number(fluids.inflow) || 0,
    driveKPa: params.driveKPa,
    maxWater: params.maxWater,
    footnote: calibrated ? CALIBRATED_SQRT_LAW_FOOTNOTE : SQRT_LAW_FOOTNOTE
  };
}
