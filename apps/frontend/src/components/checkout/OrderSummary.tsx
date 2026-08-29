'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface OrderSummaryProps {
  courseTitle: string;
  originalPrice: number;
  originalPriceUsd: number;
  finalPrice: number;
  finalPriceUsd: number;
  currency: string;
  discountApplied: number;
  hasCoupon: boolean;
  couponCode?: string;
  currencyNote?: string;
}

export function OrderSummary({
  courseTitle,
  originalPrice,
  originalPriceUsd,
  finalPrice,
  finalPriceUsd,
  currency,
  discountApplied,
  hasCoupon,
  couponCode,
  currencyNote,
}: OrderSummaryProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const hasDiscount = discountApplied > 0;

  return (
    <Card className="border-blue-200 dark:border-blue-900/50 shadow-lg" aria-label="Order summary">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Order Summary</h2>
          <Badge variant="default" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
            Course
          </Badge>
        </div>

        <div className="border-t dark:border-gray-700 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {courseTitle}
              </h3>
              {hasCoupon && couponCode && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Coupon: <span className="font-mono font-medium text-green-600 dark:text-green-400">{couponCode}</span>
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatPrice(originalPrice)}
              </p>
              {hasDiscount && (
                <p className="text-xs text-gray-400 line-through dark:text-gray-500">
                  {formatPrice(originalPriceUsd)} USD
                </p>
              )}
            </div>
          </div>
        </div>

        {hasDiscount && (
          <div className="flex items-center justify-between py-3 px-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900/50">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Discount
                {hasCoupon && couponCode ? ` (${couponCode})` : ''}
              </span>
            </div>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              -{formatPrice(discountApplied)}
            </span>
          </div>
        )}

        <div className="border-t dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-gray-900 dark:text-white">Total</span>
            <div className="text-right">
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {formatPrice(finalPrice)}
              </p>
              {currency !== 'USD' && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ≈ {formatPrice(finalPriceUsd)} USD
                </p>
              )}
            </div>
          </div>
        </div>

        {currencyNote && (
          <p className="text-xs text-amber-600 dark:text-amber-400 italic" role="alert">
            {currencyNote}
          </p>
        )}

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Secure payment via Stripe
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Lifetime access upon purchase
          </p>
        </div>
      </div>
    </Card>
  );
}
