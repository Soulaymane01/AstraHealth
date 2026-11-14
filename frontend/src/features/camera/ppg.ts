export interface PpgSample {
  t: number;
  value: number;
}

export interface PpgAnalysisOptions {
  faceCoverage?: number;
  motionScore?: number;
  durationMs?: number;
}

export interface PpgResult {
  bpm: number;
  confidence: number;
  quality: "good" | "fair" | "poor";
  reason?: string;
  snr: number;
}

const FS = 30;
const MIN_DURATION_MS = 15_000;
const TARGET_DURATION_MS = 25_000;
const MIN_BPM = 42;
const MAX_BPM = 180;

function nextPowerOfTwo(value: number): number {
  let power = 1;
  while (power < value) power *= 2;
  return power;
}

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let length = 2; length <= n; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += length) {
      let curRe = 1;
      let curIm = 0;
      for (let j = 0; j < length / 2; j += 1) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + length / 2] * curRe - im[i + j + length / 2] * curIm;
        const vIm = re[i + j + length / 2] * curIm + im[i + j + length / 2] * curRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + length / 2] = uRe - vRe;
        im[i + j + length / 2] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

function resample(samples: PpgSample[], durationMs: number): Float64Array {
  const count = Math.floor((durationMs / 1000) * FS);
  const values = new Float64Array(count);
  let cursor = 0;
  const start = samples[0].t;

  for (let index = 0; index < count; index += 1) {
    const target = start + (index * 1000) / FS;
    while (cursor < samples.length - 2 && samples[cursor + 1].t < target) {
      cursor += 1;
    }
    const left = samples[cursor];
    const right = samples[Math.min(cursor + 1, samples.length - 1)];
    const span = right.t - left.t || 1;
    const ratio = Math.max(0, Math.min(1, (target - left.t) / span));
    values[index] = left.value + (right.value - left.value) * ratio;
  }
  return values;
}

function movingAverage(values: Float64Array, window: number): Float64Array {
  const result = new Float64Array(values.length);
  const radius = Math.max(1, Math.floor(window / 2));
  const prefix = new Float64Array(values.length + 1);
  for (let index = 0; index < values.length; index += 1) {
    prefix[index + 1] = prefix[index] + values[index];
  }
  for (let index = 0; index < values.length; index += 1) {
    const start = Math.max(0, index - radius);
    const end = Math.min(values.length - 1, index + radius);
    result[index] = (prefix[end + 1] - prefix[start]) / (end - start + 1);
  }
  return result;
}

function bandpass(values: Float64Array): Float64Array {
  const baseline = movingAverage(values, Math.round(FS * 1.0));
  const highPassed = new Float64Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    highPassed[index] = values[index] - baseline[index];
  }
  return movingAverage(highPassed, Math.max(2, Math.round(FS * 0.2)));
}

export function analyzePpg(samples: PpgSample[], options: PpgAnalysisOptions = {}): PpgResult {
  const actualDuration = (samples.at(-1)?.t ?? 0) - (samples[0]?.t ?? 0);
  const durationMs = Math.min(options.durationMs ?? actualDuration, actualDuration);
  if (samples.length < 100 || durationMs < MIN_DURATION_MS) {
    return {
      bpm: 0,
      confidence: 0,
      quality: "poor",
      reason: "Not enough signal. Hold your face in frame for at least 20 seconds.",
      snr: 0,
    };
  }

  const faceCoverage = options.faceCoverage ?? 1;
  const motionScore = options.motionScore ?? 0;
  if (faceCoverage < 0.7) {
    return {
      bpm: 0,
      confidence: 0,
      quality: "poor",
      reason: "Your face left the frame too often. Center it, hold still, and try again.",
      snr: 0,
    };
  }
  if (motionScore > 0.035) {
    return {
      bpm: 0,
      confidence: 0,
      quality: "poor",
      reason: "Too much movement. Rest your head and try again.",
      snr: 0,
    };
  }

  const uniform = resample(samples, durationMs);
  const filtered = bandpass(uniform);
  const size = nextPowerOfTwo(filtered.length);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  for (let index = 0; index < filtered.length; index += 1) {
    const hann =
      filtered.length > 1 ? 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (filtered.length - 1)) : 1;
    re[index] = filtered[index] * hann;
  }
  fft(re, im);

  const resolution = FS / size;
  const minBin = Math.max(1, Math.ceil(0.7 / resolution));
  const maxBin = Math.min(size / 2 - 1, Math.floor(3.0 / resolution));
  let peakIndex = minBin;
  let peakPower = 0;

  for (let bin = minBin; bin <= maxBin; bin += 1) {
    const power = re[bin] * re[bin] + im[bin] * im[bin];
    if (power > peakPower) {
      peakPower = power;
      peakIndex = bin;
    }
  }

  if (peakPower <= 0) {
    return {
      bpm: 0,
      confidence: 0,
      quality: "poor",
      reason: "The pulse signal was too weak. Improve the light and try again.",
      snr: 0,
    };
  }

  let noiseSum = 0;
  let noiseCount = 0;
  for (let bin = minBin; bin <= maxBin; bin += 1) {
    if (Math.abs(bin - peakIndex) <= 2) continue;
    noiseSum += re[bin] * re[bin] + im[bin] * im[bin];
    noiseCount += 1;
  }
  const noise = noiseCount > 0 ? noiseSum / noiseCount : 0;
  const snr = noise > 0 ? peakPower / noise : 0;

  if (peakIndex <= minBin || peakIndex >= maxBin) {
    return {
      bpm: 0,
      confidence: 0,
      quality: "poor",
      reason: "The pulse was at the edge of the measurable range. Try again.",
      snr,
    };
  }

  const left = re[peakIndex - 1] ** 2 + im[peakIndex - 1] ** 2;
  const center = peakPower;
  const right = re[peakIndex + 1] ** 2 + im[peakIndex + 1] ** 2;
  const denominator = left - 2 * center + right;
  const offset = denominator !== 0 ? (0.5 * (left - right)) / denominator : 0;
  const frequency = (peakIndex + offset) * resolution;
  const bpm = Math.round(frequency * 60);

  if (bpm < MIN_BPM || bpm > MAX_BPM) {
    return {
      bpm: 0,
      confidence: 0,
      quality: "poor",
      reason: "The pulse reading was outside the expected range. Try again.",
      snr,
    };
  }

  const quality = snr >= 4 ? "good" : snr >= 2 ? "fair" : "poor";
  const confidence = Math.max(
    0,
    Math.min(
      1,
      0.35 * faceCoverage +
        0.35 * Math.min(1, snr / 5) +
        0.2 * (1 - Math.min(1, motionScore / 0.05)) +
        0.1 * Math.min(1, durationMs / TARGET_DURATION_MS),
    ),
  );

  if (quality === "poor") {
    return {
      bpm,
      confidence,
      quality,
      reason: "The signal was noisy. Hold still, improve the light, and try again.",
      snr,
    };
  }

  return { bpm, confidence, quality, snr };
}
