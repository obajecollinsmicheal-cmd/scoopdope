import type { Meta, StoryObj } from '@storybook/react';
import { CourseCard } from './CourseCard';

const meta = {
  title: 'Courses/CourseCard',
  component: CourseCard,
  parameters: {
    layout: 'centered',
    a11y: {
      // Ensure @storybook/addon-a11y runs axe checks on every story
      config: {},
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CourseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseCourse = {
  id: 'stellar-101',
  title: 'Stellar Blockchain Fundamentals',
  level: 'beginner' as const,
  language: 'EN',
  category: 'Blockchain',
  durationHours: 8,
  price: 0,
  rating: 4.7,
  enrollments: 1200,
  description:
    'Learn the fundamentals of the Stellar network, including accounts, assets, and Soroban smart contracts.',
  thumbnailUrl: 'https://placehold.co/400x144?text=Stellar+101',
};

/**
 * Default card showing all available metadata including the Enroll button.
 * The Enroll link has `aria-label="Enroll in Stellar Blockchain Fundamentals"`
 * so screen readers announce the course name alongside the action.
 */
export const Default: Story = {
  args: {
    course: baseCourse,
  },
};

/**
 * Demonstrates the accessible Enroll label — the key fix for issue #658.
 * When screen readers navigate a list of CourseCards they will hear
 * "Enroll in <course title>" instead of a generic "Enroll" repeated for every card.
 */
export const AccessibleEnrollLabel: Story = {
  name: 'Accessible Enroll Label (#658)',
  args: {
    course: baseCourse,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The Enroll link carries `aria-label="Enroll in Stellar Blockchain Fundamentals"`. ' +
          'Run the Accessibility panel (A11y tab) to confirm zero violations.',
      },
    },
  },
};

/** Paid course with a price tag displayed alongside the Enroll button. */
export const PaidCourse: Story = {
  args: {
    course: {
      ...baseCourse,
      id: 'soroban-advanced',
      title: 'Advanced Soroban Smart Contracts',
      level: 'advanced',
      price: 49,
      rating: 4.9,
      description: 'Deep-dive into Soroban contract development, RBAC patterns, and mainnet deployment.',
    },
  },
};

/** Card without optional metadata (no thumbnail, price, rating, or description). */
export const Minimal: Story = {
  args: {
    course: {
      id: 'intro',
      title: 'Introduction to Crypto',
      level: 'beginner',
    },
  },
};

/** Intermediate course with a thumbnail image. */
export const WithThumbnail: Story = {
  args: {
    course: {
      ...baseCourse,
      id: 'stellar-intermediate',
      title: 'Stellar Intermediate: Assets & Anchors',
      level: 'intermediate',
      price: 29,
      thumbnailUrl: 'https://placehold.co/400x144?text=Intermediate',
    },
  },
};
