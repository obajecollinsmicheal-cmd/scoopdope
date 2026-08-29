'use client';

import useSWR from 'swr';
import { RefreshCw, Coins, AlertTriangle, WalletMinimal } from 'lucide-react';
import { useWalletStore } from '@/store/walletStore';
import { fetchBstBalance } from '@/lib/walletApi';
import { formatStellarAmount } from '@/lib/stellar';
import { Card } from '@/components/ui/Card';

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TokenBalanceSkeleton() {
  return (
    <Card className="p-6 animate-pulse" aria-busy="true" aria-label="Loading BST balance">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="h-9 w-36 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
      <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
      <span className="sr-only">Loading BST balance…</span>
    </Card>
  );
}

// ── No wallet connected ───────────────────────────────────────────────────────

function NoWalletState() {
  return (
    <Card className="p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[116px]">
      <WalletMinimal className="w-8 h-8 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Connect your Freighter wallet to see your BST balance.
      </p>
    </Card>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="p-6 flex flex-col gap-3 min-h-[116px]">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium">Balance unavailable</p>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Could not fetch your BST balance. This can happen if your Stellar account
        hasn&apos;t been activated yet or if there is a temporary network issue.
      </p>
      <button
        onClick={onRetry}
        className="self-start flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        aria-label="Retry fetching BST balance"
      >
        <RefreshCw className="w-3 h-3" aria-hidden="true" />
        Retry
      </button>
    </Card>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

/**
 * Displays the user's BST token balance.
 *
 * Auto-refreshes when:
 *  1. The component mounts (initial fetch)
 *  2. The window regains focus (SWR default)
 *  3. `useWalletStore().refreshBstBalance()` is called — any token claim/burn
 *     action should call this to trigger a silent background re-fetch
 *
 * Usage in dashboard:
 *   <TokenBalanceWidget stellarPublicKey={user.stellarPublicKey} />
 *
 * To trigger a refresh from anywhere (e.g. after claiming tokens):
 *   useWalletStore.getState().refreshBstBalance()
 */
export function TokenBalanceWidget({
  stellarPublicKey,
}: {
  stellarPublicKey?: string | null;
}) {
  const { bstBalanceRefreshKey, setBstBalance } = useWalletStore();

  // SWR key includes the refresh key so bumping it forces a re-fetch.
  // When publicKey is falsy the key is null and SWR skips the fetch entirely.
  const swrKey = stellarPublicKey
    ? ['bst-balance', stellarPublicKey, bstBalanceRefreshKey]
    : null;

  const {
    data: balance,
    error,
    isLoading,
    mutate,
  } = useSWR<string>(
    swrKey,
    ([, key]: [string, string, number]) => fetchBstBalance(key),
    {
      // Refresh every 60 seconds in the background
      refreshInterval: 60_000,
      // Keep stale data visible while revalidating — no flash of skeleton
      keepPreviousData: true,
      // Don't show error toasts for this widget; we handle errors locally
      shouldRetryOnError: false,
      onSuccess: (data) => setBstBalance(data),
    },
  );

  if (!stellarPublicKey) return <NoWalletState />;
  if (isLoading && balance === undefined) return <TokenBalanceSkeleton />;
  if (error && balance === undefined) return <ErrorState onRetry={() => mutate()} />;

  // Convert raw stroop integer → human-readable amount with 7 decimal places.
  // e.g. "10000000" → "1.0000000"  |  "0" / undefined → "0.0000000"
  const formatted = formatStellarAmount(balance ?? '0');

  const isRefreshing = isLoading && balance !== undefined;

  return (
    <Card className="p-6 relative overflow-hidden group transition-all hover:shadow-lg border-green-100 dark:border-green-900/30">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          BST Balance
        </h3>
        <div
          className={`p-2 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          aria-hidden="true"
        >
          {isRefreshing ? (
            <RefreshCw className="w-5 h-5" />
          ) : (
            <Coins className="w-5 h-5" />
          )}
        </div>
      </div>

      {/* Balance value */}
      <p
        className="text-4xl font-black text-gray-900 dark:text-gray-100 tabular-nums"
        aria-label={`${formatted} BST tokens`}
      >
        {formatted}
        <span className="ml-2 text-lg font-bold text-gray-400 dark:text-gray-500">BST</span>
      </p>

      {/* Subtle error indicator when stale data is shown after a failed refresh */}
      {error && balance !== undefined && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          Showing cached balance — refresh failed
          <button
            onClick={() => mutate()}
            className="underline ml-1 hover:no-underline focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 rounded"
          >
            retry
          </button>
        </p>
      )}

      {/* Background decoration — mirrors StreakWidget style */}
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
        <Coins size={100} aria-hidden="true" />
      </div>
    </Card>
  );
}
