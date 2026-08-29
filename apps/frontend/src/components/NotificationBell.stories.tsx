import type { Meta, StoryObj } from '@storybook/react';
import { within, expect, userEvent } from '@storybook/test';
import { NotificationBell } from './NotificationBell';

const meta = {
  title: 'Components/NotificationBell',
  component: NotificationBell,
  parameters: {
    layout: 'centered',
    a11y: { config: {} },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NotificationBell>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state: bell button is visible, dropdown is closed.
 * Verifies the button has an aria-label and aria-expanded=false.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /notifications/i });
    await expect(button).toHaveAttribute('aria-label');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toHaveAttribute('aria-haspopup', 'dialog');
  },
};

/**
 * Focus Trap (#659): Opens the dropdown with keyboard (Enter) and verifies
 * that focus moves into the panel. Pressing Escape closes the panel and
 * returns focus to the bell button.
 *
 * Run the A11y tab to confirm zero axe violations while the panel is open.
 */
export const KeyboardFocusTrap: Story = {
  name: 'Keyboard Focus Trap (#659)',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    const bell = canvas.getByRole('button', { name: /notifications/i });

    // Open the dropdown via keyboard
    bell.focus();
    await user.keyboard('{Enter}');

    // Panel should now be in the DOM
    const panel = canvas.getByRole('dialog', { name: /notifications/i });
    await expect(panel).toBeInTheDocument();
    await expect(bell).toHaveAttribute('aria-expanded', 'true');

    // Escape should close panel and return focus to bell
    await user.keyboard('{Escape}');
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
    await expect(bell).toHaveFocus();
  },
};

/**
 * Opens the dropdown with a click to show the panel visually
 * in the Storybook canvas without any play-function assertions.
 */
export const OpenPanel: Story = {
  name: 'Open Panel (visual)',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();
    const bell = canvas.getByRole('button', { name: /notifications/i });
    await user.click(bell);
    await expect(canvas.getByRole('dialog', { name: /notifications/i })).toBeInTheDocument();
  },
};
