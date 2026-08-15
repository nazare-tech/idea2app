export interface SpectralSignalMotion {
  outer: number
  middle: number
  inner: number
  spin: number
}

// One authored four-second subcycle from Figma node 473:30170. Figma repeats
// these samples four times inside its 16-second timeline; keeping one cycle
// produces the same loop without duplicating the track data.
const OUTER_ENVELOPE = [
  0, 5.222, 21.623, 49.62, 87.879, 132.394, 176.909, 215.168, 243.165,
  259.566, 264.788, 265.987, 269.765, 276.102, 284.255, 292.657, 299.603,
  304.106, 305.987, 306.074, 304.506, 296.922, 282.665, 261.788, 235.237,
  205.134, 174.575, 146.79, 124.22, 108.118, 98.737, 95.738, 93.85, 87.92,
  77.797, 63.964, 47.869, 31.774, 17.941, 7.818, 1.888, 0,
] as const

const OUTER_TIMES = [
  0, 0.1008, 0.2, 0.3008, 0.4, 0.5008, 0.6, 0.7008, 0.8, 0.9008, 1,
  1.1008, 1.2, 1.3008, 1.4, 1.5008, 1.6, 1.7008, 1.8, 1.8272, 1.9008,
  2, 2.1008, 2.2, 2.3008, 2.4, 2.5008, 2.6, 2.7008, 2.8, 2.9008, 3,
  3.1008, 3.2, 3.3008, 3.4, 3.5008, 3.6, 3.7008, 3.8, 3.9008, 4,
] as const

const MIDDLE_ENVELOPE = [
  0, 5.469, 22.668, 50.119, 80.816, 105.337, 118.575, 120.961, 119.52,
  96.598, 44.739, -28.21, -101.159, -153.019, -175.94, -177.381, -172.629,
  -146.402, -96.31, -25.97, 53.532, 126.535, 180.703, 211.189, 218.892,
  218.355, 186.754, 107.743, 14.938, -42.378, -52.77, -50.88, -20.806,
  47.237, 142.949, 238.662, 306.704, 336.778, 338.669, 331.989, 294.926,
  226.27, 140.324, 63.465, 15.311, 0,
] as const

const MIDDLE_TIMES = [
  0, 0.1008, 0.2, 0.3008, 0.4, 0.5008, 0.6, 0.6672, 0.7008, 0.8,
  0.9008, 1, 1.1008, 1.2, 1.3008, 1.3328, 1.4, 1.5008, 1.6, 1.7008,
  1.8, 1.9008, 2, 2.1008, 2.184, 2.2, 2.3008, 2.4, 2.5008, 2.6, 2.6672,
  2.7008, 2.8, 2.9008, 3, 3.1008, 3.2, 3.3008, 3.3328, 3.4, 3.5008,
  3.6, 3.7008, 3.8, 3.9008, 4,
] as const

const INNER_ENVELOPE = [
  0, -10.042, -39.204, -69.772, -82.108, -82.222, -80.754, -75.392,
  -65.868, -52.191, -34.814, -14.8, 6.214, 26.334, 43.898, 57.806, 67.572,
  73.169, 74.837, 74.833, 73.399, 69.247, 62.225, 52.252, 39.363, 23.759,
  5.864, -13.66, -33.947, -54.023, -72.945, -89.925, -104.403, -116.056,
  -124.759, -130.536, -133.503, -134.003, -132.728, -115.846, -80.303,
  -38.628, -9.428, 0,
] as const

const INNER_TIMES = [
  0, 0.1008, 0.2, 0.3008, 0.4, 0.4112, 0.5008, 0.6, 0.7008, 0.8,
  0.9008, 1, 1.1008, 1.2, 1.3008, 1.4, 1.5008, 1.6, 1.6944, 1.7008, 1.8,
  1.9008, 2, 2.1008, 2.2, 2.3008, 2.4, 2.5008, 2.6, 2.7008, 2.8,
  2.9008, 3, 3.1008, 3.2, 3.3008, 3.4, 3.4624, 3.5008, 3.6, 3.7008,
  3.8, 3.9008, 4,
] as const

// Shared one-second rotation applied to each angular-gradient ring inside its
// slower envelope. The acceleration profile comes from the nested Figma node.
const RING_SPIN = [
  0, 5.479, 18.65, 45.276, 99.83, 198.326, 275.382, 316.197, 339.31,
  352.715, 359.984, 360,
] as const

const RING_SPIN_TIMES = [
  0, 0.1008, 0.2, 0.3008, 0.4, 0.5008, 0.6, 0.7008, 0.8, 0.9008,
  0.9984, 1,
] as const

const DEGREES_TO_RADIANS = Math.PI / 180

function sampleLoop(
  track: readonly number[],
  times: readonly number[],
  durationSeconds: number,
  elapsedSeconds: number,
) {
  const safeElapsed = Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0
  const wrapped = ((safeElapsed % durationSeconds) + durationSeconds) % durationSeconds
  let lowerIndex = 0
  let upperIndex = times.length - 1

  while (lowerIndex + 1 < upperIndex) {
    const midpoint = Math.floor((lowerIndex + upperIndex) / 2)
    if (times[midpoint] <= wrapped) lowerIndex = midpoint
    else upperIndex = midpoint
  }

  const span = times[upperIndex] - times[lowerIndex]
  const amount = span > 0 ? (wrapped - times[lowerIndex]) / span : 0

  return track[lowerIndex] + (track[upperIndex] - track[lowerIndex]) * amount
}

export function getSpectralSignalMotion(elapsedSeconds: number): SpectralSignalMotion {
  return {
    outer: sampleLoop(OUTER_ENVELOPE, OUTER_TIMES, 4, elapsedSeconds) * DEGREES_TO_RADIANS,
    middle: sampleLoop(MIDDLE_ENVELOPE, MIDDLE_TIMES, 4, elapsedSeconds) * DEGREES_TO_RADIANS,
    inner: sampleLoop(INNER_ENVELOPE, INNER_TIMES, 4, elapsedSeconds) * DEGREES_TO_RADIANS,
    spin: sampleLoop(RING_SPIN, RING_SPIN_TIMES, 1, elapsedSeconds) * DEGREES_TO_RADIANS,
  }
}
