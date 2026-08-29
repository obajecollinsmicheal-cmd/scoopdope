/**
 * Stellar balance utilities.
 *
 * On the Stellar network, the smallest unit is a "stroop":
 *   1 XLM (or any custom asset token) = 10,000,000 stroops
 *
 * When a balance is returned from a raw Soroban / token contract call it
 * arrives as an integer stroop value (e.g. 10_000_000 for 1 token).
 * This helper converts that integer to a human-readable decimal string with
 * 7 decimal places, which matches Stellar Horizon's canonical balance format.
 *
 * @example
 * formatStellarAmount('10000000')  // → '1.0000000'
 * formatStellarAmount('15000000')  // → '1.5000000'
 * formatStellarAmount('0')         // → '0.0000000'
 * formatStellarAmount('')          // → '0.0000000'
 */
export function formatStellarAmount(stroops: string): string {
  const raw = Number(stroops);
  if (!Number.isFinite(raw)) return '0.0000000';
  return (raw / 10_000_000).toFixed(7);
}
