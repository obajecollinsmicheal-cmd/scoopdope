import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { CourseCard, type Course } from '@/components/courses/CourseCard';

expect.extend(toHaveNoViolations);

// BookmarkButton and CompareCheckbox both rely on zustand stores.
// Mock them so unit tests don't need store providers.
vi.mock('@/components/courses/BookmarkButton', () => ({
  BookmarkButton: ({ course }: { course: Course }) => (
    <button aria-label="Bookmark course" aria-pressed={false}>
      🔖
    </button>
  ),
}));

vi.mock('@/components/courses/CompareCheckbox', () => ({
  CompareCheckbox: ({ course }: { course: Course }) => (
    <label>
      <input type="checkbox" aria-label={`Compare ${course.title}`} />
      Compare
    </label>
  ),
}));

// next/link renders a plain <a> in the test environment — no extra mock needed.

const baseCourse: Course = {
  id: 'stellar-101',
  title: 'Stellar Blockchain Fundamentals',
  level: 'beginner',
  language: 'EN',
  category: 'Blockchain',
  durationHours: 8,
  price: 0,
  rating: 4.7,
  enrollments: 1200,
  description: 'Learn the fundamentals of the Stellar network.',
};

describe('CourseCard', () => {
  describe('Enroll button — aria-label (#658)', () => {
    it('renders an Enroll link with aria-label containing the course title', () => {
      render(<CourseCard course={baseCourse} />);

      const enrollLink = screen.getByRole('link', {
        name: `Enroll in ${baseCourse.title}`,
      });
      expect(enrollLink).toBeInTheDocument();
    });

    it('Enroll link points to the correct enroll URL', () => {
      render(<CourseCard course={baseCourse} />);

      const enrollLink = screen.getByRole('link', {
        name: `Enroll in ${baseCourse.title}`,
      });
      expect(enrollLink).toHaveAttribute('href', `/courses/${baseCourse.id}/enroll`);
    });

    it('has distinct accessible names for Enroll and View links', () => {
      render(<CourseCard course={baseCourse} />);

      // Both links must exist with unique, descriptive names
      expect(
        screen.getByRole('link', { name: `Enroll in ${baseCourse.title}` })
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /view/i })).toBeInTheDocument();
    });

    it('Enroll aria-label updates when course title changes', () => {
      const course: Course = { ...baseCourse, id: 'rust-101', title: 'Rust for Soroban Devs' };
      render(<CourseCard course={course} />);

      expect(
        screen.getByRole('link', { name: 'Enroll in Rust for Soroban Devs' })
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility — axe-core (WCAG 2.1 AA)', () => {
    it('has no accessibility violations with full course data', async () => {
      const { container } = render(<CourseCard course={baseCourse} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations with minimal course data', async () => {
      const minimalCourse: Course = {
        id: 'intro',
        title: 'Introduction to Crypto',
        level: 'beginner',
      };
      const { container } = render(<CourseCard course={minimalCourse} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations for a paid course', async () => {
      const paidCourse: Course = {
        ...baseCourse,
        id: 'soroban-advanced',
        title: 'Advanced Soroban Smart Contracts',
        level: 'advanced',
        price: 49,
      };
      const { container } = render(<CourseCard course={paidCourse} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
