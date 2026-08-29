import { useEffect } from 'react';

/**
 * Attaches a `beforeunload` listener that prompts the user when they attempt
 * to close the tab / navigate away via the browser's own controls (back button,
 * address-bar navigation, tab close, etc.) while there are unsaved changes.
 *
 * This does NOT guard Next.js client-side route transitions — use
 * `useRouteChangeGuard` for that.
 *
 * @param isDirty - When `true` the prompt is shown; when `false` it is silent.
 * @param message - Custom message text (browsers may ignore it in favour of a
 *   generic string, but it is passed to `returnValue` for those that respect it).
 */
export function useBeforeUnload(
  isDirty: boolean,
  message = 'You have unsaved changes. Are you sure you want to leave?',
) {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy support (Chrome requires returnValue to be set)
      event.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, message]);
}
