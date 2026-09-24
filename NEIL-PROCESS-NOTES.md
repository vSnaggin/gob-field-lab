# Neil — Gob Field Lab process notes

Working tree: `/workspace/gob-field-lab`  
Role: extract / teach / scrub-sync the pure fluid–caving model without rewriting Mark’s Three.js visuals or inventing MP3/JPEG assets. No git remote/push.

## Done

### Process model extraction
- Pure deterministic model lives in `public/process-model.js` (ESM exports).
- `public/index.html` imports it; Three.js / Cutaway / Narrator stay in the HTML module.
- `tests/cutaway.test.js` injects `process-model` into the VM context for geometry checks.
- Alfred `cueAt` chapter titles/text unchanged (test locks key beats).

### Scrub-sync teaching knobs (PASSED — Alan 28/28)
- Telemetry panel shows labeled **ILLUSTRATIVE · not calibrated** banner.
- Teaching rate row during scrub: **inflow mode**, **head kPa**, **gas**, **carry**, **connection**.
- √-law footnote in copy: water head restricts gas via `√(1−head/drive)` under assumed **14 kPa** drive — teaching clarity, not new physics.
- Pure helpers: `gasHeadRestriction`, `inflowModeLabel`, `formatTeachingTelemetry`, `TEACHING_DISCLAIMER`, `SQRT_LAW_FOOTNOTE`.
- `tests/process-model.test.js` covers √-law, scrub rewind, labels, cue integrity.
- Illustrative path remains the default identity (omit mode arg ≡ `illustrative`).

### Calibrated-physics phase (this pass)
- Optional **Process mode** select next to Water connection:
  - **Illustrative (teaching)** — default; scrub-cleared 14 kPa drive + original supply L/min.
  - **Calibrated ranges (literature)** — labeled engineering defaults; **not** mine-specific / not field-calibrated.
- Calibrated param deltas (transparent labeled defaults):
  | Knob | Illustrative | Calibrated | Notes / sources |
  |------|--------------|------------|-----------------|
  | Drive pressure | 14 kPa | **30 kPa** | Typical active GVB wellhead vacuum in published CFD baselines (e.g. ~30 kPa / 4 psi in IJMST / NIOSH-linked gob-ventilation borehole studies). Practice spans ~6.9 kPa slight suction (EPA Enhanced Gob Gas Recovery) to ~17–50 kPa industrial exhausters. |
  | Supply dry / seep / wet | 0 / 0.025 / 0.48 L/min | **0 / 0.05 / 1.2 L/min** | Order-of-magnitude connected-water entry for a conceptual 0.20 m bore; wet below multi-L/min overburden/gob borehole water encounters (USBM/CDC tables) while still loading under 30 kPa. |
  | maxWater | 4.8 m | 4.8 m (unchanged) | Column above intake can still exceed 30 kPa head; Mark’s water-meter scale stays consistent. |
  | Restriction law | √(1−head/drive) | **same √ form** | Retained: orifice/Bernoulli teaching capacity Q∝√ΔP → √(1−head/drive). Calibrated only changes drive magnitude. Not a multiphase wellbore model. |
- Banner / footnote swap with mode (`CALIBRATED_DISCLAIMER`, `CALIBRATED_SQRT_LAW_FOOTNOTE`).
- UI rebuilds fluid tables on mode change; Cutaway / Alfred MP3s / captions untouched.
- Tests: illustrative identity preserved; calibrated drive/supply/telemetry covered; `npm test` → **34/34** green.

## Intentional non-goals
- Do not rewrite Mark’s Three.js scene, materials, or camera cinema.
- Do not regenerate or invent MP3 / JPEG / texture binaries.
- Do not claim calibration against Warrior Met / Black Warrior production data.
- Do not invent a GitHub remote or push (Alan’s lane for repo URL).
- Do not change Alfred caption / chapter copy.

## Backlog / later
- Optional one-line cross-link from Alfred settlement cue to teaching banner (only if narration UX asks).
- Mobile telemetry density pass if teaching-rates row feels cramped on narrow phones.
- Keep legacy `public/model.js` / `app.js` for older unit tests only; published runtime is HTML + `process-model.js`.
- If product later wants a non-√ restriction (e.g. linear head or two-phase holdup), gate it behind calibrated only — never mutate illustrative identity.

## Key files
| File | Role |
|------|------|
| `public/process-model.js` | Pure scrub model + illustrative/calibrated params |
| `public/index.html` | UI (process-mode select), Cutaway, Narrator |
| `tests/process-model.test.js` | √-law + mode identity + calibrated tests |
| `tests/cutaway.test.js` | Geometry + table bounds via process-model |
| `public/audio/chapters.json` | Alfred recorded captions (do not invent MP3) |

## Verification
```bash
npm test   # expect 34/34
```

## How to toggle modes
Telemetry panel → **Process mode** select:
- `Illustrative (teaching)` — default scrub teaching knobs.
- `Calibrated ranges (literature)` — 30 kPa drive + literature-range supply L/min.
