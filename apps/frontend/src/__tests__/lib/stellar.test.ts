import { describe, it, expect } from 'vitest';
import { formatStellarAmount } from '@/lib/stellar';

describe('formatStellarAmount', () => {
  it('converts 10_000_000 stroops to "1.0000000"', () => {
    expect(formatStellarAmount('10000000')).toBe('1.0000000');
  });

  it('converts 1 stroop to "0.0000001"', () => {
    expect(formatStellarAmount('1')).toBe('0.0000001');
  });

  it('converts 0 stroops to "0.0000000"', () => {
    expect(formatStellarAmount('0')).toBe('0.0000000');
  });

  it('converts large values correctly', () => {
    // 100 tokens = 1_000_000_000 stroops
    expect(formatStellarAmount('1000000000')).toBe('100.0000000');
  });

  it('handles fractional-stroop amounts (e.g. 15_000_000 → 1.5 tokens)', () => {
    expect(formatStellarAmount('15000000')).toBe('1.5000000');
  });

  it('always returns exactly 7 decimal places', () => {
    const result = formatStellarAmount('20000000');
    const [, decimals] = result.split('.');
    expect(decimals).toHaveLength(7);
  });

  it('returns "0.0000000" for an empty string', () => {
    expect(formatStellarAmount('')).toBe('0.0000000');
  });

  it('returns "0.0000000" for a non-numeric string', () => {
    expect(formatStellarAmount('not-a-number')).toBe('0.0000000');
  });

  it('handles numeric string with leading/trailing whitespace gracefully', () => {
    // Number(' 10000000 ') === 10000000
    expect(formatStellarAmount(' 10000000 ')).toBe('1.0000000');
  });
});
