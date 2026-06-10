// Customer-facing price formatting. Currency is a single demo-wide default
// (EGP for the Barka reference) since the backend doesn't yet expose a currency
// per restaurant — centralized here so it can become dynamic later.
export const CURRENCY = 'EGP';

export function formatPrice(value: number | string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe.toFixed(2)} ${CURRENCY}`;
}
