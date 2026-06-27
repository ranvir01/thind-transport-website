/**
 * Money — integer-cent value object. The non-negotiable money rule, made explicit.
 *
 * All HaulDesk money is stored and computed in integer cents (bigint columns);
 * this class makes that discipline enforceable in code: construction rejects
 * non-integer cents, arithmetic stays in cents, and rounding happens only at the
 * final multiply/allocate step. A floating-point cent error in driver pay or a
 * factoring submission destroys trust and creates tax exposure — so never do
 * money math on raw floats; route it through here.
 */
export class Money {
  private constructor(
    readonly cents: number,
    readonly currency: string = "USD"
  ) {}

  static fromCents(cents: number, currency = "USD"): Money {
    if (!Number.isInteger(cents)) {
      throw new Error(`Money.fromCents requires an integer number of cents, got ${cents}`)
    }
    return new Money(cents, currency)
  }

  /** Parse a dollar amount (e.g. from a form) into cents, rounding to the nearest cent. */
  static fromDollars(dollars: number, currency = "USD"): Money {
    if (!Number.isFinite(dollars)) throw new Error(`Money.fromDollars requires a finite number, got ${dollars}`)
    return new Money(Math.round(dollars * 100), currency)
  }

  static zero(currency = "USD"): Money {
    return new Money(0, currency)
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`)
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other)
    return new Money(this.cents + other.cents, this.currency)
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other)
    return new Money(this.cents - other.cents, this.currency)
  }

  /** Multiply by a scalar (miles × rate, percentage, etc.). Rounds to the nearest cent. */
  times(factor: number): Money {
    if (!Number.isFinite(factor)) throw new Error(`Money.times requires a finite factor, got ${factor}`)
    return new Money(Math.round(this.cents * factor), this.currency)
  }

  /**
   * Split into `weights.length` parts proportional to `weights`, losing no penny
   * (largest-remainder method). Used for penny-exact settlement/deduction splits.
   */
  allocate(weights: number[]): Money[] {
    const total = weights.reduce((s, w) => s + w, 0)
    if (total <= 0) throw new Error("Money.allocate requires weights summing to a positive number")
    const raw = weights.map((w) => (this.cents * w) / total)
    const floors = raw.map((r) => Math.floor(r))
    let remainder = this.cents - floors.reduce((s, f) => s + f, 0)
    // Hand out the leftover cents to the largest fractional remainders first.
    const order = raw
      .map((r, i) => ({ i, frac: r - Math.floor(r) }))
      .sort((a, b) => b.frac - a.frac)
    const out = floors.slice()
    for (const { i } of order) {
      if (remainder <= 0) break
      out[i] += 1
      remainder -= 1
    }
    return out.map((c) => new Money(c, this.currency))
  }

  isZero(): boolean {
    return this.cents === 0
  }

  isNegative(): boolean {
    return this.cents < 0
  }

  get dollars(): number {
    return this.cents / 100
  }

  /** Sum a list of Money, all in the same currency. */
  static sum(items: Money[], currency = "USD"): Money {
    return items.reduce((acc, m) => acc.add(m), Money.zero(currency))
  }

  format(): string {
    return formatUSD(this.cents)
  }

  toString(): string {
    return this.format()
  }
}

/** `$1,234.56` from integer cents. Negative shows as `-$1.23`. */
export function formatUSD(cents: number): string {
  const sign = cents < 0 ? "-" : ""
  const abs = Math.abs(cents)
  return `${sign}$${(abs / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
