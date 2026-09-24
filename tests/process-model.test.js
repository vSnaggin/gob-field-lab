import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL, gasHeadRestriction, fluidRates, buildFluidTable, sampleFluids, cueAt,
  inflowModeLabel, formatTeachingTelemetry, TEACHING_DISCLAIMER, SQRT_LAW_FOOTNOTE,
  PROCESS_MODES, DEFAULT_PROCESS_MODE, resolveProcessParams, CALIBRATED,
  CALIBRATED_DISCLAIMER, CALIBRATED_SQRT_LAW_FOOTNOTE, processModeLabel,
  ILLUSTRATIVE_SUPPLY_LPM
} from '../public/process-model.js';

test('√-law gasHeadRestriction is 1 at zero head and 0 at full drive', () => {
  assert.equal(gasHeadRestriction(0), 1);
  assert.equal(gasHeadRestriction(MODEL.driveKPa), 0);
  assert.ok(Math.abs(gasHeadRestriction(MODEL.driveKPa / 2) - Math.SQRT1_2) < 1e-12);
  assert.equal(gasHeadRestriction(-3), 1);
});

test('fluidRates apply √(1−head/drive) under 14 kPa drive', () => {
  const open = fluidRates(90, MODEL.intakeHeight, 'dry');
  const loaded = fluidRates(90, MODEL.intakeHeight + MODEL.driveKPa / 9.80665, 'dry');
  assert.ok(open.connection > .9);
  assert.ok(open.gas > .7);
  assert.ok(loaded.headKPa >= MODEL.driveKPa - 1e-6);
  assert.equal(loaded.gas, 0);
});

test('scrub sampling is deterministic across rewind', () => {
  const table = buildFluidTable('wet');
  const a = sampleFluids(table, 72.4);
  sampleFluids(table, 100);
  assert.deepEqual(sampleFluids(table, 72.4), a);
  assert.ok(a.connection >= 0 && a.connection <= 1);
});

test('inflowModeLabel names each water-connection teaching knob', () => {
  assert.equal(inflowModeLabel('dry'), 'Dry fractures');
  assert.equal(inflowModeLabel('seep'), 'Small seep');
  assert.equal(inflowModeLabel('wet'), 'Strong water entry');
  assert.equal(inflowModeLabel('unknown'), 'Small seep');
});

test('formatTeachingTelemetry labels ILLUSTRATIVE scrub rates', () => {
  const fluids = sampleFluids(buildFluidTable('seep'), 80);
  const snap = formatTeachingTelemetry(fluids, 'seep');
  assert.equal(snap.disclaimer, TEACHING_DISCLAIMER);
  assert.match(snap.disclaimer, /ILLUSTRATIVE/);
  assert.equal(snap.inflowMode, 'Small seep');
  assert.equal(snap.headKPa, fluids.headKPa);
  assert.equal(snap.gas, fluids.gas);
  assert.equal(snap.carry, fluids.carry);
  assert.equal(snap.connection, fluids.connection);
  assert.match(snap.footnote, /√\(1−head\/drive\)/);
  assert.match(snap.footnote, /14 kPa/);
  assert.equal(snap.footnote, SQRT_LAW_FOOTNOTE);
  assert.equal(snap.processMode, PROCESS_MODES.ILLUSTRATIVE);
  assert.equal(snap.driveKPa, MODEL.driveKPa);
});

test('Alfred cueAt chapter copy stays intact at key beats', () => {
  const dry = cueAt(80, 'dry', { gas: 1, connection: 1 });
  const wet = cueAt(80, 'wet', { gas: 1, connection: 1 });
  const loaded = cueAt(95, 'wet', { gas: 0, connection: 1 });
  assert.equal(dry.title, 'Water and gas');
  assert.match(dry.text, /no connected water supply/);
  assert.match(wet.text, /pools below the inlet/);
  assert.equal(loaded.title, 'Water-loaded well');
  assert.match(loaded.text, /Gas delivery stops in this example/);
});

test('wet table reaches water-loaded zero gas while seep stays flowing', () => {
  const wet = sampleFluids(buildFluidTable('wet'), 100);
  const seep = sampleFluids(buildFluidTable('seep'), 100);
  assert.equal(wet.gas, 0);
  assert.ok(wet.headKPa >= MODEL.driveKPa * .9);
  assert.ok(seep.gas > .5);
  assert.ok(seep.level < .3);
});

test('teaching disclaimer constant is explicit and stable', () => {
  assert.equal(TEACHING_DISCLAIMER, 'ILLUSTRATIVE · not calibrated');
  assert.match(SQRT_LAW_FOOTNOTE, /not calibrated/);
});

test('default process mode is illustrative and preserves MODEL drive', () => {
  assert.equal(DEFAULT_PROCESS_MODE, PROCESS_MODES.ILLUSTRATIVE);
  const p = resolveProcessParams();
  assert.equal(p.mode, PROCESS_MODES.ILLUSTRATIVE);
  assert.equal(p.driveKPa, 14);
  assert.equal(p.supplyLpm.wet, ILLUSTRATIVE_SUPPLY_LPM.wet);
  assert.equal(p.supplyLpm.seep, .025);
  assert.equal(processModeLabel('illustrative'), 'Illustrative (teaching)');
  assert.equal(processModeLabel('calibrated'), 'Calibrated ranges (literature)');
});

test('illustrative fluidRates omit mode arg equals explicit illustrative', () => {
  const a = fluidRates(60, 0.5, 'seep');
  const b = fluidRates(60, 0.5, 'seep', PROCESS_MODES.ILLUSTRATIVE);
  assert.deepEqual(a, b);
  assert.equal(a.driveKPa, MODEL.driveKPa);
  assert.equal(a.processMode, PROCESS_MODES.ILLUSTRATIVE);
});

test('calibrated mode uses 30 kPa drive and literature supply defaults', () => {
  const p = resolveProcessParams(PROCESS_MODES.CALIBRATED);
  assert.equal(p.driveKPa, CALIBRATED.driveKPa);
  assert.equal(p.driveKPa, 30);
  assert.equal(p.supplyLpm.seep, .05);
  assert.equal(p.supplyLpm.wet, 1.2);
  assert.equal(p.maxWater, MODEL.maxWater);
  const open = fluidRates(90, MODEL.intakeHeight, 'dry', PROCESS_MODES.CALIBRATED);
  const loaded = fluidRates(90, MODEL.intakeHeight + CALIBRATED.driveKPa / 9.80665, 'dry', PROCESS_MODES.CALIBRATED);
  assert.ok(open.gas > .7);
  assert.ok(loaded.gas < 1e-6);
  assert.ok(loaded.headKPa >= CALIBRATED.driveKPa - 1e-6);
  assert.equal(open.driveKPa, 30);
  assert.ok(Math.abs(gasHeadRestriction(15, 30) - Math.SQRT1_2) < 1e-12);
  assert.equal(gasHeadRestriction(CALIBRATED.driveKPa, CALIBRATED.driveKPa), 0);
});

test('calibrated wet loads to zero gas; seep stays open; differs from illustrative', () => {
  const wetC = sampleFluids(buildFluidTable('wet', PROCESS_MODES.CALIBRATED), 100);
  const seepC = sampleFluids(buildFluidTable('seep', PROCESS_MODES.CALIBRATED), 100);
  const wetI = sampleFluids(buildFluidTable('wet'), 100);
  assert.equal(wetC.gas, 0);
  assert.ok(wetC.headKPa >= CALIBRATED.driveKPa * .9);
  assert.ok(seepC.gas > .4);
  assert.ok(seepC.level < 1.2);
  // Stronger calibrated wet supply reaches load earlier / higher head than illustrative
  assert.ok(wetC.headKPa >= wetI.headKPa - 1e-9);
  const midI = fluidRates(80, 0.2, 'wet');
  const midC = fluidRates(80, 0.2, 'wet', PROCESS_MODES.CALIBRATED);
  assert.ok(midC.inflow > midI.inflow);
  assert.equal(midI.driveKPa, 14);
  assert.equal(midC.driveKPa, 30);
});

test('formatTeachingTelemetry calibrated banner and 30 kPa footnote', () => {
  const fluids = sampleFluids(buildFluidTable('seep', PROCESS_MODES.CALIBRATED), 80);
  const snap = formatTeachingTelemetry(fluids, 'seep', PROCESS_MODES.CALIBRATED);
  assert.equal(snap.disclaimer, CALIBRATED_DISCLAIMER);
  assert.match(snap.disclaimer, /CALIBRATED/);
  assert.match(snap.disclaimer, /not mine-specific/);
  assert.equal(snap.driveKPa, 30);
  assert.equal(snap.footnote, CALIBRATED_SQRT_LAW_FOOTNOTE);
  assert.match(snap.footnote, /30 kPa/);
  assert.equal(snap.processMode, PROCESS_MODES.CALIBRATED);
});

test('illustrative buildFluidTable identity: wet zero-gas and seep bounds unchanged', () => {
  const wet = buildFluidTable('wet');
  const seep = buildFluidTable('seep');
  assert.equal(sampleFluids(wet, 100).gas, 0);
  assert.ok(sampleFluids(seep, 100).level < .3);
  for (const row of wet) {
    assert.ok(row.level >= 0 && row.level <= MODEL.maxWater);
    assert.ok(row.gas >= 0 && row.gas <= 1);
  }
});
