import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NotificationBell } from '@/components/NotificationBell';

expect.extend(toHaveNoViolations);

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/hooks/useNotifications', () => ({
  TYPE_ICONS: {
    enrollment: '📚',
    progress: '📈',
    credential: '🏆',
    token_reward: '🪙',
    general: '🔔',
  },
  useNotifications: vi.fn(),
}));

// next/link not used in this component, but guard against accidental imports
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

import { useNotifications } from '@/hooks/useNotifications';

const mockUseNotifications = useNotifications as ReturnType<typeof vi.fn>;

const makeNotification = (overrides = {}) => ({
  id: '1',
  type: 'general' as const,
  message: 'You earned a token reward',
  isRead: false,
  createdAt: new Date('2026-01-01T10:00:00Z').toISOString(),
  ...overrides,
});

function setupHook(notifications = [makeNotification()], unreadCount = 1) {
  mockUseNotifications.mockReturnValue({
    notifications,
    unreadCount,
    markAsRead: vi.fn(),
    markAllRead: vi.fn(),
    playSound: false,
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('NotificationBell — focus trap (#659)', () => {
  beforeEach(() => setupHook());

  // -- Bell button ARIA attributes ------------------------------------------

  it('bell button has aria-expanded=false when closed', () => {
    render(<NotificationBell />);
    expect(screen.getByRole('button', { name: /notifications/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('bell button has aria-expanded=true when open', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByRole('button', { name: /notifications/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('bell button has aria-haspopup=dialog', () => {
    render(<NotificationBell />);
    expect(screen.getByRole('button', { name: /notifications/i })).toHaveAttribute(
      'aria-haspopup',
      'dialog'
    );
  });

  // -- Panel ARIA attributes -------------------------------------------------

  it('panel has role=dialog and aria-modal=true when open', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    const panel = screen.getByRole('dialog', { name: /notifications/i });
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('aria-modal', 'true');
  });

  // -- Focus on open --------------------------------------------------------

  it('moves focus into the panel when it opens', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: /notifications/i }));

    // First focusable item inside the panel gets focus
    await waitFor(() => {
      const focused = document.activeElement;
      const panel = screen.getByRole('dialog');
      expect(panel.contains(focused)).toBe(true);
    });
  });

  // -- Escape key -----------------------------------------------------------

  it('closes the panel on Escape', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('returns focus to the bell button after Escape', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    const bell = screen.getByRole('button', { name: /notifications/i });

    await user.click(bell);
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(bell).toHaveFocus();
    });
  });

  // -- Tab wrapping ---------------------------------------------------------

  it('wraps Tab forward from last item back to first focusable element', async () => {
    const user = userEvent.setup();
    // Two notifications so we have multiple focusable items
    setupHook([
      makeNotification({ id: '1', message: 'First notification' }),
      makeNotification({ id: '2', message: 'Second notification', isRead: true }),
    ], 1);

    render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: /notifications/i }));

    const panel = screen.getByRole('dialog');
    // Move to the last focusable item by Shift-tabbing from first
    // then Tab forward from last should wrap to first
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>('[tabindex]:not([tabindex="-1"]), button:not([disabled])')
    );
    // Focus the last item directly
    focusable[focusable.length - 1].focus();
    expect(document.activeElement).toBe(focusable[focusable.length - 1]);

    await user.tab(); // should wrap to first
    await waitFor(() => {
      expect(document.activeElement).toBe(focusable[0]);
    });
  });

  it('wraps Shift+Tab backward from first item to last focusable element', async () => {
    const user = userEvent.setup();
    setupHook([
      makeNotification({ id: '1', message: 'First notification' }),
      makeNotification({ id: '2', message: 'Second notification', isRead: true }),
    ], 1);

    render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: /notifications/i }));

    const panel = screen.getByRole('dialog');
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>('[tabindex]:not([tabindex="-1"]), button:not([disabled])')
    );

    // Focus the first item directly
    focusable[0].focus();
    expect(document.activeElement).toBe(focusable[0]);

    await user.tab({ shift: true }); // should wrap to last
    await waitFor(() => {
      expect(document.activeElement).toBe(focusable[focusable.length - 1]);
    });
  });

  // -- Notification item keyboard interaction --------------------------------

  it('marks notification as read when Enter is pressed on an unread item', async () => {
    const markAsRead = vi.fn();
    mockUseNotifications.mockReturnValue({
      notifications: [makeNotification({ id: 'n1', isRead: false })],
      unreadCount: 1,
      markAsRead,
      markAllRead: vi.fn(),
      playSound: false,
    });

    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: /notifications/i }));

    const item = screen.getByRole('menuitem');
    item.focus();
    await user.keyboard('{Enter}');

    expect(markAsRead).toHaveBeenCalledWith(['n1']);
  });

  it('marks notification as read when Space is pressed on an unread item', async () => {
    const markAsRead = vi.fn();
    mockUseNotifications.mockReturnValue({
      notifications: [makeNotification({ id: 'n1', isRead: false })],
      unreadCount: 1,
      markAsRead,
      markAllRead: vi.fn(),
      playSound: false,
    });

    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: /notifications/i }));

    const item = screen.getByRole('menuitem');
    item.focus();
    await user.keyboard(' ');

    expect(markAsRead).toHaveBeenCalledWith(['n1']);
  });

  // -- axe-core WCAG 2.1 AA -------------------------------------------------

  it('has no axe violations when closed', async () => {
    const { container } = render(<NotificationBell />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when open with notifications', async () => {
    const user = userEvent.setup();
    const { container } = render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when open with empty notification list', async () => {
    setupHook([], 0);
    const user = userEvent.setup();
    const { container } = render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
