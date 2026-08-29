import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { UserTable } from '@/components/admin/UserTable';
import TransactionList from '@/components/wallet/TransactionList';
import { TopCoursesTable } from '@/components/admin/charts/TopCoursesTable';
import { CompareBar } from '@/components/courses/CompareBar';

expect.extend(toHaveNoViolations);

// Mock the admin API
vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    getUsers: vi.fn(() =>
      Promise.resolve({
        users: [
          {
            id: '1',
            displayName: 'John Doe',
            email: 'john@example.com',
            role: 'student',
            status: 'active',
          },
        ],
        total: 1,
      })
    ),
    banUser: vi.fn(() => Promise.resolve()),
    updateUserRole: vi.fn(() => Promise.resolve()),
  },
  AdminUser: {},
}));

// Mock the API module
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(() =>
      Promise.resolve({
        data: [
          {
            id: '1',
            hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            createdAt: '2024-01-01T00:00:00Z',
            operationCount: 1,
            successful: true,
            memo: 'test',
            memoType: 'text',
            feeCharged: '100',
          },
        ],
      })
    ),
  },
}));

// Mock the compare store
vi.mock('@/store/compare.store', () => ({
  useCompareStore: () => ({
    selected: [
      {
        id: '1',
        title: 'Course 1',
        description: 'A test course',
        level: 'Beginner',
        category: 'Technology',
        durationHours: 10,
        price: 99,
        rating: 4.5,
        moduleCount: 5,
        prerequisites: [],
        enrollments: 100,
      },
      {
        id: '2',
        title: 'Course 2',
        description: 'Another test course',
        level: 'Intermediate',
        category: 'Technology',
        durationHours: 15,
        price: 149,
        rating: 4.8,
        moduleCount: 8,
        prerequisites: [],
        enrollments: 150,
      },
    ],
    remove: vi.fn(),
    clear: vi.fn(),
  }),
}));

describe('Table Accessibility - scope attributes', () => {
  describe('UserTable', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render without accessibility violations', async () => {
      const { container } = render(<UserTable />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have scope="col" on all header cells', () => {
      render(<UserTable />);
      const headerCells = screen.getAllByRole('columnheader');
      expect(headerCells.length).toBeGreaterThan(0);
      headerCells.forEach((cell) => {
        expect(cell).toHaveAttribute('scope', 'col');
      });
    });

    it('should have correct number of header cells', () => {
      render(<UserTable />);
      const headerCells = screen.getAllByRole('columnheader');
      expect(headerCells).toHaveLength(5); // Name, Email, Role, Status, Actions
    });

    it('should have header text content', () => {
      render(<UserTable />);
      expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Role' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    });
  });

  describe('TransactionList', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render without accessibility violations', async () => {
      const { container } = render(<TransactionList publicKey="test-key" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have scope="col" on all header cells', async () => {
      render(<TransactionList publicKey="test-key" />);
      // Wait for the table to load
      await screen.findByRole('table');
      const headerCells = screen.getAllByRole('columnheader');
      expect(headerCells.length).toBeGreaterThan(0);
      headerCells.forEach((cell) => {
        expect(cell).toHaveAttribute('scope', 'col');
      });
    });

    it('should have correct header cells', async () => {
      render(<TransactionList publicKey="test-key" />);
      await screen.findByRole('table');
      expect(screen.getByRole('columnheader', { name: 'Hash' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Memo' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    });
  });

  describe('TopCoursesTable', () => {
    const mockCourses = [
      {
        courseId: '1',
        title: 'React Basics',
        enrollments: 150,
        completions: 120,
        completionRate: 80,
      },
      {
        courseId: '2',
        title: 'Advanced React',
        enrollments: 100,
        completions: 75,
        completionRate: 75,
      },
    ];

    it('should render without accessibility violations', async () => {
      const { container } = render(<TopCoursesTable courses={mockCourses} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have scope="col" on all header cells', () => {
      render(<TopCoursesTable courses={mockCourses} />);
      const headerCells = screen.getAllByRole('columnheader');
      expect(headerCells.length).toBeGreaterThan(0);
      headerCells.forEach((cell) => {
        expect(cell).toHaveAttribute('scope', 'col');
      });
    });

    it('should have correct header cells', () => {
      render(<TopCoursesTable courses={mockCourses} />);
      expect(screen.getByRole('columnheader', { name: 'Course' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Enrollments' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Completions' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Completion Rate' })).toBeInTheDocument();
    });

    it('should have 4 header cells', () => {
      render(<TopCoursesTable courses={mockCourses} />);
      const headerCells = screen.getAllByRole('columnheader');
      expect(headerCells).toHaveLength(4);
    });
  });

  describe('CompareBar - Course Comparison Table', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render without accessibility violations', async () => {
      const { container } = render(<CompareBar />);
      // Click the compare button
      const compareBtn = screen.getByRole('button', { name: /Compare Now/i });
      await screen.findByRole('button', { name: /Compare Now/i });
      if (compareBtn && !compareBtn.hasAttribute('disabled')) {
        compareBtn.click();
        // Wait for modal to open
        await screen.findByRole('dialog');
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      }
    });

    it('should have scope="col" on column header cells', async () => {
      render(<CompareBar />);
      const compareBtn = screen.getByRole('button', { name: /Compare Now/i });
      if (compareBtn && !compareBtn.hasAttribute('disabled')) {
        compareBtn.click();
        await screen.findByRole('dialog');
        const colHeaders = screen.getAllByRole('columnheader', { scope: 'col' });
        expect(colHeaders.length).toBeGreaterThan(0);
        colHeaders.forEach((cell) => {
          expect(cell).toHaveAttribute('scope', 'col');
        });
      }
    });

    it('should have scope="row" on row header cells (attribute labels)', async () => {
      render(<CompareBar />);
      const compareBtn = screen.getByRole('button', { name: /Compare Now/i });
      if (compareBtn && !compareBtn.hasAttribute('disabled')) {
        compareBtn.click();
        await screen.findByRole('dialog');
        const rowHeaders = screen.getAllByRole('rowheader');
        // Should have at least one row header for the attributes
        expect(rowHeaders.length).toBeGreaterThan(0);
        rowHeaders.forEach((cell) => {
          expect(cell).toHaveAttribute('scope', 'row');
        });
      }
    });
  });

  describe('Table Structure', () => {
    it('UserTable should have properly structured table with thead and tbody', () => {
      render(<UserTable />);
      const table = screen.getByRole('table');
      expect(table.querySelector('thead')).toBeInTheDocument();
      expect(table.querySelector('tbody')).toBeInTheDocument();
    });

    it('TopCoursesTable should have properly structured table with thead and tbody', () => {
      const mockCourses = [
        {
          courseId: '1',
          title: 'Test Course',
          enrollments: 100,
          completions: 80,
          completionRate: 80,
        },
      ];
      render(<TopCoursesTable courses={mockCourses} />);
      const table = screen.getByRole('table');
      expect(table.querySelector('thead')).toBeInTheDocument();
      expect(table.querySelector('tbody')).toBeInTheDocument();
    });
  });
});
