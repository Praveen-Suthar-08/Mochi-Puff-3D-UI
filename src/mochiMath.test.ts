import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FUR_PRESETS,
  MOOD_CONFIGS,
  formatFurLengthLabel,
  formatFurDensityLabel,
  stepBoopSpring,
  computeKeyLightDirection,
  updateCombVector,
  computeEyeGazeOffset,
  computeBloomParameters,
} from './mochiMath';

test('formatFurLengthLabel formats inches and millimeters accurately', () => {
  assert.equal(formatFurLengthLabel(0.62), '0.62" (16 mm)');
  assert.equal(formatFurLengthLabel(1.0), '1.00" (25 mm)');
  assert.equal(formatFurLengthLabel(0.1), '0.10" (3 mm)');
});

test('formatFurDensityLabel formats percentage and strand count in thousands', () => {
  assert.equal(formatFurDensityLabel(75), '75% (45k)');
  assert.equal(formatFurDensityLabel(100), '100% (60k)');
  assert.equal(formatFurDensityLabel(10), '10% (6k)');
});

test('FUR_PRESETS contains all 4 required presets with valid hex colors', () => {
  assert.equal(FUR_PRESETS.sakura.rootColor, '#3B00E3');
  assert.equal(FUR_PRESETS.sakura.tipColor, '#FF82A9');
  assert.ok(FUR_PRESETS.golden.name.includes('Golden'));
  assert.ok(FUR_PRESETS.midnight.name.includes('Midnight'));
  assert.ok(FUR_PRESETS.matcha.name.includes('Matcha'));
});

test('MOOD_CONFIGS defines all 4 mood expressions with distinct eye and blush states', () => {
  assert.equal(MOOD_CONFIGS.calm.eyeScaleY, 1.0);
  assert.equal(MOOD_CONFIGS.happy.happyArc, true);
  assert.ok(MOOD_CONFIGS.sleepy.eyeScaleY < 0.35);
  assert.equal(MOOD_CONFIGS.starry.starCatchlight, true);
});

test('stepBoopSpring squishes Y and expands XZ on positive impulse and decays toward 1', () => {
  let state = { displacement: 0.8, velocity: 0 };
  const firstStep = stepBoopSpring(state, 0.016);
  assert.ok(firstStep.scale[1] < 1.0, 'Y scale should squish below 1.0');
  assert.ok(firstStep.scale[0] > 1.0, 'X scale should expand above 1.0');

  for (let i = 0; i < 120; i++) {
    state = stepBoopSpring(state, 0.016).state;
  }
  assert.ok(Math.abs(state.displacement) < 0.02, 'Spring displacement should settle near 0');
});

test('computeKeyLightDirection returns a normalized unit vector', () => {
  const [x, y, z] = computeKeyLightDirection(-74);
  const length = Math.hypot(x, y, z);
  assert.ok(Math.abs(length - 1.0) < 1e-6);
  assert.ok(x < 0, 'Negative angle should place key light on the left (-X)');
});

test('updateCombVector accumulates drag velocity and clamps to maxMagnitude', () => {
  const v1 = updateCombVector([0, 0, 0], 0.5, -0.5, 1.0);
  assert.ok(v1[0] > 0);
  assert.ok(v1[1] > 0);

  const clamped = updateCombVector([0, 0, 0], 10, 10, 1.0);
  const mag = Math.hypot(clamped[0], clamped[1], clamped[2]);
  assert.ok(Math.abs(mag - 1.0) < 1e-6);
});

test('computeEyeGazeOffset bounds NDC inputs cleanly', () => {
  const [gx, gy] = computeEyeGazeOffset(2.5, -3.0, 0.05);
  assert.ok(Math.abs(gx - 0.05) < 1e-6);
  assert.ok(gy < 0 && Math.abs(gy) <= 0.05);
});

test('computeBloomParameters scales UnrealBloomPass strength and radius with Rim Scatter and Coat Mode', () => {
  const zeroBloom = computeBloomParameters(0.0, 0.0);
  assert.equal(zeroBloom.strength, 0);
  assert.equal(zeroBloom.threshold, 0.95);

  const webgpuBloom = computeBloomParameters(1.35, 0.0);
  const webglBloom = computeBloomParameters(1.35, 1.0);
  assert.ok(webgpuBloom.strength > webglBloom.strength);
  assert.ok(webgpuBloom.radius > webglBloom.radius);
});

