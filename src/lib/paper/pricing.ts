import { RISK_FREE } from "./types";

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const poly =
    t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return sign * (1 - poly * Math.exp(-a * a));
}

export function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function d1d2(spot: number, strike: number, t: number, iv: number, r: number): [number, number] {
  const vt = iv * Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (r + (iv * iv) / 2) * t) / vt;
  return [d1, d1 - vt];
}

function usable(spot: number, strike: number, t: number, iv: number): boolean {
  return spot > 0 && strike > 0 && t > 0 && iv > 0;
}

/** Black–Scholes call value. `t` in years, `iv` as a fraction. */
export function bsCall(spot: number, strike: number, t: number, iv: number, r = RISK_FREE): number {
  if (!usable(spot, strike, t, iv)) return Math.max(0, spot - strike);
  const [d1, d2] = d1d2(spot, strike, t, iv, r);
  return spot * normCdf(d1) - strike * Math.exp(-r * t) * normCdf(d2);
}

export function bsPut(spot: number, strike: number, t: number, iv: number, r = RISK_FREE): number {
  if (!usable(spot, strike, t, iv)) return Math.max(0, strike - spot);
  const [d1, d2] = d1d2(spot, strike, t, iv, r);
  return strike * Math.exp(-r * t) * normCdf(-d2) - spot * normCdf(-d1);
}

/** Absolute Black–Scholes delta. */
export function bsDelta(
  type: "call" | "put",
  spot: number,
  strike: number,
  t: number,
  iv: number,
  r = RISK_FREE,
): number {
  if (!usable(spot, strike, t, iv)) {
    const itm = type === "call" ? spot > strike : spot < strike;
    return itm ? 1 : 0;
  }
  const [d1] = d1d2(spot, strike, t, iv, r);
  return type === "call" ? normCdf(d1) : 1 - normCdf(d1);
}

export function bsPrice(type: "call" | "put", spot: number, strike: number, t: number, iv: number): number {
  return type === "call" ? bsCall(spot, strike, t, iv) : bsPut(spot, strike, t, iv);
}

/**
 * Delta estimate from moneyness for chains without Greeks (mock data), in the
 * same shape `src/lib/options/pmcc.ts` uses for calls; puts mirror it.
 */
export function estimateDelta(type: "call" | "put", spot: number, strike: number, dte: number): number {
  const moneyness = spot / strike;
  const timeAdjust = Math.sqrt(Math.max(1, dte) / 365);
  let call: number;
  if (moneyness > 1.2) call = Math.min(0.95, 0.5 + ((moneyness - 1) * 1.5) / timeAdjust);
  else if (moneyness > 1) call = 0.5 + (moneyness - 1) * 2.5;
  else if (moneyness > 0.8) call = 0.5 - (1 - moneyness) * 2.5;
  else call = Math.max(0.05, 0.5 - (1 - moneyness) * 3);
  call = Math.min(0.99, Math.max(0.01, call));
  return type === "call" ? call : 1 - call;
}

export function intrinsic(type: "call" | "put", spot: number, strike: number): number {
  return type === "call" ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
}
