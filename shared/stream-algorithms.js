// Algorithm R. The injected RNG allows reproducible demonstrations and tests.
export class ReservoirSampling {
  constructor(capacity, random = Math.random) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('Invalid capacity');
    this.capacity = capacity; this.random = random; this.count = 0; this.sample = [];
  }
  insert(value) {
    this.count++;
    const index = this.count <= this.capacity ? this.count - 1 : Math.floor(this.random() * this.count);
    const accepted = index < this.capacity, previous = this.sample[index];
    if (accepted) this.sample[index] = value;
    return {index, accepted, previous, probability: Math.min(1, this.capacity / this.count)};
  }
}
// Greenwald–Khanna summary: tuples contain value, minimum rank increment g,
// and rank uncertainty delta. Exact history is deliberately kept outside this class.
export class QuantileSketch {
  constructor(epsilon = 0.05) {
    if (!Number.isFinite(epsilon) || epsilon <= 0 || epsilon > 0.5) throw new RangeError('Invalid epsilon');
    this.epsilon = epsilon; this.count = 0; this.tuples = [];
  }
  insert(value) {
    if (!Number.isFinite(value)) throw new TypeError('Expected a finite number');
    this.count++;
    let lo = 0, hi = this.tuples.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (this.tuples[mid].value <= value) lo = mid + 1; else hi = mid; }
    const delta = lo === 0 || lo === this.tuples.length ? 0 : Math.max(0, Math.floor(2 * this.epsilon * this.count) - 1);
    this.tuples.splice(lo, 0, {value, g: 1, delta});
    let merged = 0;
    for (let i = this.tuples.length - 2; i > 0; i--) {
      const a = this.tuples[i], b = this.tuples[i + 1];
      if (a.g + b.g + b.delta <= Math.floor(2 * this.epsilon * this.count)) {
        b.g += a.g; this.tuples.splice(i, 1); merged++;
      }
    }
    return {merged, delta};
  }
  quantile(q) {
    if (!Number.isFinite(q) || q < 0 || q > 1) throw new RangeError('Expected q in [0, 1]');
    if (!this.count) return null;
    if (q === 0) return this.tuples[0].value;
    if (q === 1) return this.tuples.at(-1).value;
    const rank = Math.max(1, Math.ceil(q * this.count)), allowance = this.epsilon * this.count;
    let rmin = 0, previous = this.tuples[0].value;
    for (const t of this.tuples) {
      rmin += t.g;
      if (rmin + t.delta > rank + allowance) return previous;
      previous = t.value;
    }
    return previous;
  }
}
