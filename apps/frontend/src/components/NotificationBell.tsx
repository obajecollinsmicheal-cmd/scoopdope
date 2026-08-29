'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNotifications, TYPE_ICONS } from '@/hooks/useNotifications';

/** Returns all focusable descendants of an element in DOM order. */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead, playSound } = useNotifications();
  const [open, setOpen] = useState(false);

  // Refs for focus management
  const containerRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Move focus into panel when it opens ──────────────────────────────────
  useEffect(() => {
    if (!open || !panelRef.current) return;

    const focusable = getFocusableElements(panelRef.current);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      // Nothing focusable yet (e.g. empty list) — focus the panel itself
      panelRef.current.focus();
    }
  }, [open]);

  // ── Return focus to bell when panel closes ───────────────────────────────
  const closePanel = useCallback(() => {
    setOpen(false);
    // Use rAF so the button is visible before we focus it
    requestAnimationFrame(() => bellRef.current?.focus());
  }, []);

  // ── Keyboard handler scoped to the panel ────────────────────────────────
  const handlePanelKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
        return;
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusable = getFocusableElements(panelRef.current);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: if we're on the first item, wrap to last
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab: if we're on the last item, wrap to first
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [closePanel]
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={bellRef}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={`relative p-1 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors ${
          playSound ? 'animate-pulse' : ''
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ${
              playSound ? 'animate-bounce' : ''
            }`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          aria-modal="true"
          tabIndex={-1}
          onKeyDown={handlePanelKeyDown}
          className="absolute right-0 mt-2 w-80 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50 outline-none"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <ul
            role="menu"
            aria-label="Notification list"
            className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800"
          >
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No notifications yet
              </li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  role="menuitem"
                  tabIndex={0}
                  aria-label={`${n.message}${n.isRead ? '' : ' — unread'}`}
                  onClick={() => !n.isRead && markAsRead([n.id])}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !n.isRead) {
                      e.preventDefault();
                      markAsRead([n.id]);
                    }
                  }}
                  className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                    !n.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <span className="text-lg shrink-0" aria-hidden="true">{TYPE_ICONS[n.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{n.message}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span aria-hidden="true" className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
