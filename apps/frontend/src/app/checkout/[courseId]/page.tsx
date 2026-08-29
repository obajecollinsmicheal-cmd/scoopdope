'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import api from '@/lib/api';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { OrderSummary } from '@/components/checkout/OrderSummary';

interface OrderPreviewData {
  courseId: string;
  courseTitle: string;
  originalPriceUsd: number;
  originalPrice: number;
  currency: string;
  discountApplied: number;
  finalPriceUsd: number;
  finalPrice: number;
  hasCoupon: boolean;
  couponCode?: string;
  currencyNote?: string;
}

// ── Stripe key check ──────────────────────────────────────────────────────
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

// ── Inline SVG icons (no external dependency) ────────────────────────────
function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Checkout Form (inner, inside <Elements>) ─────────────────────────────
function CheckoutForm({
  courseId,
  clientSecret,
  couponInput,
  onCouponInputChange,
  onApplyCoupon,
  orderPreview,
}: {
  courseId: string;
  clientSecret: string;
  couponInput: string;
  onCouponInputChange: (code: string) => void;
  onApplyCoupon: () => void;
  orderPreview: OrderPreviewData | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setPaymentError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/courses/${courseId}`,
      },
    });

    if (error) {
      setPaymentError(error.message ?? 'Payment failed.');
      toast.error(error.message ?? 'Payment failed.');
    } else {
      toast.success('Payment successful! Redirecting...');
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Coupon Code Input */}
      <Card className="border-gray-200 dark:border-gray-700">
        <label htmlFor="coupon-code-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Have a coupon code?
        </label>
        <div className="flex gap-2">
          <input
            id="coupon-code-input"
            type="text"
            value={couponInput}
            onChange={(e) => onCouponInputChange(e.target.value)}
            placeholder="Enter coupon code"
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            aria-describedby="coupon-help-text"
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onApplyCoupon}
            disabled={!couponInput.trim()}
            aria-label="Apply coupon code"
          >
            Apply
          </Button>
        </div>
        <p id="coupon-help-text" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter a valid coupon code to see your discount applied
        </p>
      </Card>

      {/* Payment Element */}
      <Card className="border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <CreditCardIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Payment Details
          </h3>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          {clientSecret ? (
            <PaymentElement
              options={{
                layout: { type: 'tabs', defaultCollapsed: false },
                business: { name: 'ScoopDope' },
              }}
            />
          ) : (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-6 h-6 text-blue-600" />
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                Loading payment form...
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Payment Error */}
      {paymentError && (
        <div
          className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4"
          role="alert"
        >
          <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {paymentError}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!stripe || isProcessing || !clientSecret}
      >
        {isProcessing ? (
          <>
            <Spinner className="w-5 h-5 mr-2" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCardIcon className="w-5 h-5 mr-2" />
            Pay{' '}
            {orderPreview
              ? new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: orderPreview.currency,
                  minimumFractionDigits: 2,
                }).format(orderPreview.finalPrice)
              : ''}
          </>
        )}
      </Button>
    </form>
  );
}

// ── Main Checkout Page ───────────────────────────────────────────────────
export default function CheckoutPage({ params }: { params: { courseId: string } }) {
  const router = useRouter();
  const { courseId } = params;

  const [orderPreview, setOrderPreview] = useState<OrderPreviewData | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [currency, setCurrency] = useState('USD');

  const stripeKeyMissing = useMemo(() => !STRIPE_PUBLISHABLE_KEY, []);

  // Fetch preview + intent from API using the *applied* coupon code
  const fetchPreview = useCallback(async () => {
    try {
      const previewParams: Record<string, string> = { courseId, currency };
      if (appliedCoupon) {
        previewParams.couponCode = appliedCoupon;
      }
      const { data } = await api.get('/v1/payments/preview', { params: previewParams });
      setOrderPreview(data);
      setError(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to load order preview.';
      setError(msg);
      setOrderPreview(null);
    }
  }, [courseId, currency, appliedCoupon]);

  const fetchPaymentIntent = useCallback(async () => {
    try {
      const { data } = await api.post('/v1/payments/intent', {
        courseId,
        currency,
        couponCode: appliedCoupon || undefined,
      });
      setClientSecret(data.clientSecret);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to initialize payment.';
      setError(msg);
      toast.error(msg);
    }
  }, [courseId, currency, appliedCoupon]);

  // Initialise on mount and when appliedCoupon or currency change
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);
      await fetchPreview();
      if (cancelled) return;
      await fetchPaymentIntent();
      if (!cancelled) setIsLoading(false);
    }

    initialize();
    return () => { cancelled = true; };
  }, [fetchPreview, fetchPaymentIntent]);

  // Apply coupon — sets the appliedCoupon state which triggers the effect above
  const handleApplyCoupon = useCallback(() => {
    setAppliedCoupon(couponInput.trim());
    if (couponInput.trim()) {
      toast.success('Applying coupon...');
    }
  }, [couponInput]);

  // ── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center space-y-4">
            <Spinner className="w-10 h-10 text-blue-600 mx-auto" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading checkout...</p>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  // ── Error state (no preview data) ──────────────────────────────────────
  if (error && !orderPreview && !clientSecret) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
          <Card className="max-w-md w-full border-red-200 dark:border-red-900/50">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Checkout Unavailable
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
              <Button variant="secondary" onClick={() => router.back()}>
                Go Back
              </Button>
            </div>
          </Card>
        </main>
      </ProtectedRoute>
    );
  }

  // ── Stripe not configured ──────────────────────────────────────────────
  if (stripeKeyMissing) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
          <Card className="max-w-md w-full border-amber-200 dark:border-amber-900/50">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Payment Not Configured
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Stripe publishable key is missing. Please set{' '}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">
                  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                </code>{' '}
                in your environment variables.
              </p>
            </div>
          </Card>
        </main>
      </ProtectedRoute>
    );
  }

  // ── Main checkout UI ───────────────────────────────────────────────────
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors mb-6 group"
          >
            <svg className="w-4 h-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">Checkout</h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Review your order and complete your purchase
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left — Order Summary + Currency Selector */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-8 space-y-6">
                {orderPreview && (
                  <OrderSummary
                    courseTitle={orderPreview.courseTitle}
                    originalPrice={orderPreview.originalPrice}
                    originalPriceUsd={orderPreview.originalPriceUsd}
                    finalPrice={orderPreview.finalPrice}
                    finalPriceUsd={orderPreview.finalPriceUsd}
                    currency={orderPreview.currency}
                    discountApplied={orderPreview.discountApplied}
                    hasCoupon={orderPreview.hasCoupon}
                    couponCode={orderPreview.couponCode}
                    currencyNote={orderPreview.currencyNote}
                  />
                )}

                {/* Currency Selector */}
                <Card className="border-gray-200 dark:border-gray-700">
                  <label htmlFor="currency-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Currency
                  </label>
                  <select
                    id="currency-select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="NGN">NGN (₦)</option>
                    <option value="KES">KES (KSh)</option>
                    <option value="GHS">GHS (GH₵)</option>
                    <option value="ZAR">ZAR (R)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="BRL">BRL (R$)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="AUD">AUD (A$)</option>
                  </select>
                </Card>
              </div>
            </div>

            {/* Right — Payment Form */}
            <div className="lg:col-span-3">
              <Card className="border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <CreditCardIcon className="w-5 h-5" />
                  Complete Payment
                </h2>

                {clientSecret && stripePromise ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#2563eb',
                          colorBackground: '#ffffff',
                          colorText: '#111827',
                          colorDanger: '#dc2626',
                          fontFamily: 'system-ui, sans-serif',
                          borderRadius: '8px',
                        },
                      },
                    }}
                  >
                    <CheckoutForm
                      courseId={courseId}
                      clientSecret={clientSecret}
                      couponInput={couponInput}
                      onCouponInputChange={setCouponInput}
                      onApplyCoupon={handleApplyCoupon}
                      orderPreview={orderPreview}
                    />
                  </Elements>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <Spinner className="w-8 h-8 text-blue-600" />
                    <span className="ml-3 text-gray-500 dark:text-gray-400">
                      Preparing payment...
                    </span>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
