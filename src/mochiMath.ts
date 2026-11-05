export interface FurPreset {
  id: 'sakura' | 'golden' | 'midnight' | 'matcha';
  name: string;
  dotColor: string;
  rootColor: string;
  tipColor: string;
  furLength: number;
  furDensity: number;
  curl: number;
  clumping: number;
  roughness: number;
  specular: number;
  rimScatter: number;
}

export type MoodId = 'calm' | 'happy' | 'sleepy' | 'starry';

export interface MoodConfig {
  id: MoodId;
  label: string;
  eyeScaleY: number;
  eyeScaleX: number;
  blushOpacity: number;
  earWiggleAmp: number;
  earWiggleFreq: number;
  starCatchlight: boolean;
  happyArc: boolean;
}

export const MOOD_CONFIGS: Record<MoodId, MoodConfig> = {
  calm: {
    id: 'calm',
    label: 'Calm',
    eyeScaleY: 1.0,
    eyeScaleX: 1.0,
    blushOpacity: 0.65,
    earWiggleAmp: 0.02,
    earWiggleFreq: 2.2,
    starCatchlight: false,
    happyArc: false,
  },
  happy: {
    id: 'happy',
    label: 'Happy',
    eyeScaleY: 0.96,
    eyeScaleX: 1.06,
    blushOpacity: 0.95,
    earWiggleAmp: 0.095,
    earWiggleFreq: 5.8,
    starCatchlight: false,
    happyArc: true,
  },
  sleepy: {
    id: 'sleepy',
    label: 'Sleepy',
    eyeScaleY: 0.28,
    eyeScaleX: 1.04,
    blushOpacity: 0.55,
    earWiggleAmp: 0.01,
    earWiggleFreq: 1.2,
    starCatchlight: false,
    happyArc: false,
  },
  starry: {
    id: 'starry',
    label: 'Starry-Eyed',
    eyeScaleY: 1.12,
    eyeScaleX: 1.08,
    blushOpacity: 0.88,
    earWiggleAmp: 0.07,
    earWiggleFreq: 4.8,
    starCatchlight: true,
    happyArc: false,
  },
};

export const FUR_PRESETS: Record<FurPreset['id'], FurPreset> = {
  sakura: {
    id: 'sakura',
    name: 'Sakura Mochi',
    dotColor: '#A855F7',
    rootColor: '#3B00E3',
    tipColor: '#FF82A9',
    furLength: 0.62,
    furDensity: 75,
    curl: 23,
    clumping: 35,
    roughness: 0.77,
    specular: 0.24,
    rimScatter: 1.35,
  },
  golden: {
    id: 'golden',
    name: 'Golden Fluff',
    dotColor: '#F59E0B',
    rootColor: '#5C2400',
    tipColor: '#FFD466',
    furLength: 0.72,
    furDensity: 82,
    curl: 18,
    clumping: 42,
    roughness: 0.68,
    specular: 0.34,
    rimScatter: 1.55,
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Velvet',
    dotColor: '#38BDF8',
    rootColor: '#0A0E2E',
    tipColor: '#5CE1E6',
    furLength: 0.54,
    furDensity: 88,
    curl: 12,
    clumping: 28,
    roughness: 0.62,
    specular: 0.42,
    rimScatter: 1.75,
  },
  matcha: {
    id: 'matcha',
    name: 'Matcha Puff',
    dotColor: '#4ADE80',
    rootColor: '#11381F',
    tipColor: '#98F5B4',
    furLength: 0.66,
    furDensity: 78,
    curl: 30,
    clumping: 38,
    roughness: 0.74,
    specular: 0.26,
    rimScatter: 1.4,
  },
};

export function formatFurLengthLabel(inches: number): string {
  const clamped = Math.max(0.1, Math.min(1.5, inches));
  const mm = Math.round(clamped * 25.4);
  return `${clamped.toFixed(2)}" (${mm} mm)`;
}

export function formatFurDensityLabel(percent: number, mode?: 'webgpu' | 'webgl'): string {
  const clamped = Math.max(10, Math.min(100, Math.round(percent)));
  if (mode === 'webgl') {
    return `${clamped}% (${Math.round(clamped * 0.6)}k)`;
  }
  const kStrands = Math.round(clamped * 0.6);
  return `${clamped}% (${kStrands}k)`;
}

export interface SpringState {
  displacement: number;
  velocity: number;
}

/**
 * Advances a damped harmonic oscillator for the "Boop" squish & bounce effect.
 * Returns updated displacement and X/Y/Z squash-and-stretch scale factors.
 */
export function stepBoopSpring(
  state: SpringState,
  dt: number,
  stiffness = 180,
  damping = 11
): { state: SpringState; scale: [number, number, number] } {
  const safeDt = Math.min(Math.max(dt, 0), 0.05);
  const force = -stiffness * state.displacement - damping * state.velocity;
  const velocity = state.velocity + force * safeDt;
  const displacement = state.displacement + velocity * safeDt;

  // Volume-preserving squash and stretch: when y squishes down, x and z bulge out
  const scaleY = 1.0 - displacement * 0.28;
  const scaleXZ = 1.0 + displacement * 0.16;

  return {
    state: { displacement, velocity },
    scale: [scaleXZ, scaleY, scaleXZ],
  };
}

/**
 * Computes normalized 3D directional light position from horizontal angle in degrees.
 */
export function computeKeyLightDirection(angleDegrees: number): [number, number, number] {
  const rad = (angleDegrees * Math.PI) / 180;
  const elevation = 0.52;
  const cosEl = Math.cos(elevation);
  const x = Math.sin(rad) * cosEl;
  const y = Math.sin(elevation) + 0.35;
  const z = Math.cos(rad) * cosEl;
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

/**
 * Smoothly blends cursor drag delta into a bounded 3D combing vector.
 */
export function updateCombVector(
  current: [number, number, number],
  dragDeltaX: number,
  dragDeltaY: number,
  maxMagnitude = 1.0
): [number, number, number] {
  const nextX = current[0] * 0.92 + dragDeltaX * 0.45;
  const nextY = current[1] * 0.92 - dragDeltaY * 0.45;
  const nextZ = current[2] * 0.92;
  const mag = Math.hypot(nextX, nextY, nextZ);
  if (mag > maxMagnitude && mag > 0) {
    const s = maxMagnitude / mag;
    return [nextX * s, nextY * s, nextZ * s];
  }
  return [nextX, nextY, nextZ];
}

/**
 * Computes bounded eye gaze offset from normalized device coordinates [-1, 1].
 */
export function computeEyeGazeOffset(
  ndcX: number,
  ndcY: number,
  maxOffset = 0.055
): [number, number] {
  const clampedX = Math.max(-1, Math.min(1, ndcX));
  const clampedY = Math.max(-1, Math.min(1, ndcY));
  return [clampedX * maxOffset, clampedY * maxOffset * 0.85];
}

export interface BloomParameters {
  strength: number;
  radius: number;
  threshold: number;
}

/**
 * Computes UnrealBloomPass parameters from Rim Scatter (0.0 - 3.0) and Coat Mode (0 = WebGPU, 1 = WebGL).
 */
export function computeBloomParameters(
  rimScatter: number,
  coatMode = 0.0
): BloomParameters {
  const clampedRim = Math.max(0.0, Math.min(3.0, rimScatter));
  const modeMultiplier = coatMode < 0.5 ? 1.0 : 0.72;
  const strength = Number((clampedRim * 0.16 * modeMultiplier).toFixed(3));
  const radius = Number((0.36 + (clampedRim / 3.0) * 0.18 * modeMultiplier).toFixed(3));
  const threshold = 0.95;
  return { strength, radius, threshold };
}

