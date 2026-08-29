import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'INR', 'BRL', 'CAD', 'AUD'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

interface ExchangeRateResponse {
  rates: Record<string, number>;
  currencyNote?: string;
}

@Injectable()
export class CurrencyConversionService {
  private readonly logger = new Logger(CurrencyConversionService.name);
  private readonly apiKey: string;
  private ratesCache: { rates: Record<string, number>; fetchedAt: number } | null = null;
  private readonly cacheTtlMs = 60 * 60 * 1000; // 1 hour
  private readonly cacheKey = 'exchange_rates';

  constructor(
    private configService: ConfigService,
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache,
  ) {
    this.apiKey = this.configService.get<string>('exchangeRate.apiKey') || '';
  }

  async getRates(base: SupportedCurrency = 'USD'): Promise<Record<string, number>> {
    const { rates } = await this.getRatesWithMetadata(base);
    return rates;
  }

  async getRatesWithMetadata(base: SupportedCurrency = 'USD'): Promise<ExchangeRateResponse> {
    const now = Date.now();
    if (this.ratesCache && now - this.ratesCache.fetchedAt < this.cacheTtlMs) {
      return { rates: this.ratesCache.rates };
    }

    try {
      const url = this.apiKey
        ? `https://v6.exchangerate-api.com/v6/${this.apiKey}/latest/${base}`
        : `https://open.er-api.com/v6/latest/${base}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);
      const data = await res.json();
      const rates: Record<string, number> = data.rates ?? data.conversion_rates;

      this.ratesCache = { rates, fetchedAt: now };
      await this.cacheManager?.set(this.cacheKey, { rates, fetchedAt: now }, this.cacheTtlMs / 1000);
      return { rates };
    } catch (err) {
      this.logger.warn(`Failed to fetch exchange rates, falling back to cached values: ${err instanceof Error ? err.message : err}`);

      const cached = await this.getCachedRates();
      if (cached) {
        this.ratesCache = cached;
        return { rates: cached.rates };
      }

      return {
        rates: {},
        currencyNote: 'Live rates unavailable, showing USD',
      };
    }
  }

  async convert(amountInUsd: number, targetCurrency: SupportedCurrency): Promise<number> {
    return (await this.convertWithMetadata(amountInUsd, targetCurrency)).amount;
  }

  async convertWithMetadata(amountInUsd: number, targetCurrency: SupportedCurrency): Promise<{ amount: number; currencyNote?: string }> {
    if (targetCurrency === 'USD') return { amount: amountInUsd };

    const { rates, currencyNote } = await this.getRatesWithMetadata('USD');
    if (currencyNote) {
      return { amount: amountInUsd, currencyNote };
    }

    const rate = rates[targetCurrency];
    if (!rate) {
      throw new Error(`Unsupported currency: ${targetCurrency}`);
    }

    return { amount: Math.round(amountInUsd * rate * 100) / 100 };
  }

  /** Returns amount in smallest currency unit (e.g. cents) for Stripe */
  async toStripeAmount(amountInUsd: number, targetCurrency: SupportedCurrency): Promise<number> {
    const { amount } = await this.convertWithMetadata(amountInUsd, targetCurrency);
    // Zero-decimal currencies
    const zeroDecimal = ['KES', 'NGN', 'GHS'];
    return zeroDecimal.includes(targetCurrency)
      ? Math.round(amount)
      : Math.round(amount * 100);
  }

  private async getCachedRates(): Promise<{ rates: Record<string, number>; fetchedAt: number } | null> {
    if (this.ratesCache) return this.ratesCache;
    if (!this.cacheManager) return null;

    try {
      const cachedValue = await this.cacheManager.get<{ rates: Record<string, number>; fetchedAt: number }>(this.cacheKey);
      if (cachedValue?.rates) {
        return cachedValue;
      }
    } catch (err) {
      this.logger.warn(`Failed to read cached exchange rates: ${err instanceof Error ? err.message : err}`);
    }

    return null;
  }

  /** Detect currency from Accept-Language or locale header */
  detectCurrencyFromLocale(locale: string): SupportedCurrency {
    const map: Record<string, SupportedCurrency> = {
      'en-US': 'USD', 'en-CA': 'CAD', 'en-AU': 'AUD', 'en-GB': 'GBP',
      'en-NG': 'NGN', 'en-KE': 'KES', 'en-GH': 'GHS', 'en-ZA': 'ZAR',
      'en-IN': 'INR', 'pt-BR': 'BRL',
      'de': 'EUR', 'fr': 'EUR', 'es': 'EUR', 'it': 'EUR', 'nl': 'EUR',
    };
    const normalized = locale?.split(',')[0]?.trim();
    return map[normalized] ?? map[normalized?.split('-')[0]] ?? 'USD';
  }
}
