import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CurrencyConversionService } from './currency-conversion.service';

describe('CurrencyConversionService', () => {
  let service: CurrencyConversionService;
  let mockCacheManager: { get: jest.Mock; set: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'exchangeRate.apiKey') return '';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrencyConversionService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<CurrencyConversionService>(CurrencyConversionService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('falls back to cached rates when the live API fails', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    mockCacheManager.get.mockResolvedValue({ rates: { EUR: 1.15 }, fetchedAt: Date.now() });

    const result = await service.convertWithMetadata(100, 'EUR');

    expect(result.amount).toBe(115);
    expect(result.currencyNote).toBeUndefined();
  });

  it('falls back to USD with a warning when no cached rates are available', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    mockCacheManager.get.mockResolvedValue(null);

    const result = await service.convertWithMetadata(100, 'EUR');

    expect(result.amount).toBe(100);
    expect(result.currencyNote).toBe('Live rates unavailable, showing USD');
  });
});
