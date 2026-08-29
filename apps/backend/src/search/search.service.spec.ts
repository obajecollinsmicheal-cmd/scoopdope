import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { SearchService } from './search.service';
import { SearchAnalytic } from './search-analytic.entity';
import { Course } from '../courses/course.entity';

describe('SearchService', () => {
  let service: SearchService;
  let mockElasticsearchService: {
    index: jest.Mock;
    delete: jest.Mock;
    search: jest.Mock;
    indices: {
      exists: jest.Mock;
      create: jest.Mock;
    };
  };
  let mockAnalyticsRepo: {
    save: jest.Mock;
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    mockElasticsearchService = {
      index: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      search: jest.fn().mockResolvedValue({}),
      indices: {
        exists: jest.fn().mockResolvedValue(false),
        create: jest.fn().mockResolvedValue({}),
      },
    };

    mockAnalyticsRepo = {
      save: jest.fn().mockResolvedValue({}),
      create: jest.fn((obj) => obj),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: ElasticsearchService, useValue: mockElasticsearchService },
        { provide: getRepositoryToken(SearchAnalytic), useValue: mockAnalyticsRepo },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);

    // Reset mocks after module creation (onModuleInit is called during testing)
    jest.clearAllMocks();
    mockElasticsearchService.indices.exists.mockResolvedValue(false);
  });

  afterEach(() => jest.clearAllMocks());

  describe('indexCourse', () => {
    /**
     * Test: indexCourse correctly maps a Course entity to an Elasticsearch document.
     * 
     * The document should contain all required fields with correct types:
     * - title (text)
     * - description (text)
     * - level (keyword)
     * - language (keyword)
     * - durationHours (float)
     * - isPublished (boolean)
     * - suggest (completion)
     */
    it('indexes a course with the correct document shape', async () => {
      const mockCourse: Partial<Course> = {
        id: 'course-123',
        title: 'Advanced Blockchain Development',
        description: 'Learn to build smart contracts on Stellar',
        level: 'advanced',
        language: 'en',
        durationHours: 40.5,
        isPublished: true,
      };

      await service.indexCourse(mockCourse as Course);

      // Assert Elasticsearch index was called with correct arguments
      expect(mockElasticsearchService.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'courses',
          id: 'course-123',
          document: expect.objectContaining({
            title: 'Advanced Blockchain Development',
            description: 'Learn to build smart contracts on Stellar',
            level: 'advanced',
            language: 'en',
            durationHours: 40.5,
            isPublished: true,
            suggest: { input: ['Advanced Blockchain Development'] },
          }),
        })
      );
    });

    it('indexes a course with null optional fields gracefully', async () => {
      const mockCourse: Partial<Course> = {
        id: 'course-456',
        title: 'Beginner Course',
        description: undefined,
        level: 'beginner',
        language: 'en',
        durationHours: 10,
        isPublished: false,
      };

      await service.indexCourse(mockCourse as Course);

      expect(mockElasticsearchService.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'courses',
          id: 'course-456',
          document: expect.objectContaining({
            title: 'Beginner Course',
            description: undefined,
            level: 'beginner',
            language: 'en',
            durationHours: 10,
            isPublished: false,
            suggest: { input: ['Beginner Course'] },
          }),
        })
      );
    });

    it('includes the course title in the suggest field for autocomplete', async () => {
      const mockCourse: Partial<Course> = {
        id: 'course-789',
        title: 'Stellar Token Economics',
        description: 'Understand token design',
        level: 'intermediate',
        language: 'en',
        durationHours: 25,
        isPublished: true,
      };

      await service.indexCourse(mockCourse as Course);

      const callArgs = mockElasticsearchService.index.mock.calls[0][0];
      expect(callArgs.document.suggest).toEqual({ input: ['Stellar Token Economics'] });
    });

    it('sets isPublished to false for unpublished courses', async () => {
      const mockCourse: Partial<Course> = {
        id: 'draft-course',
        title: 'Draft Course',
        description: 'Work in progress',
        level: 'all',
        language: 'en',
        durationHours: 0,
        isPublished: false,
      };

      await service.indexCourse(mockCourse as Course);

      const callArgs = mockElasticsearchService.index.mock.calls[0][0];
      expect(callArgs.document.isPublished).toBe(false);
    });

    it('preserves exact field types for Elasticsearch mapping', async () => {
      const mockCourse: Partial<Course> = {
        id: 'type-check',
        title: 'Type Check Course',
        description: 'Verify field types',
        level: 'advanced',
        language: 'es',
        durationHours: 15.75,
        isPublished: true,
      };

      await service.indexCourse(mockCourse as Course);

      const callArgs = mockElasticsearchService.index.mock.calls[0][0];
      const doc = callArgs.document;

      // Verify field types match Elasticsearch mapping expectations
      expect(typeof doc.title).toBe('string');
      expect(typeof doc.description).toBe('string');
      expect(typeof doc.level).toBe('string');
      expect(typeof doc.language).toBe('string');
      expect(typeof doc.durationHours).toBe('number');
      expect(typeof doc.isPublished).toBe('boolean');
      expect(doc.suggest.input).toBeInstanceOf(Array);
    });

    it('uses the course ID as the Elasticsearch document ID', async () => {
      const mockCourse: Partial<Course> = {
        id: 'unique-id-12345',
        title: 'Unique Course',
        description: 'Should use this ID',
        level: 'intermediate',
        language: 'en',
        durationHours: 20,
        isPublished: true,
      };

      await service.indexCourse(mockCourse as Course);

      const callArgs = mockElasticsearchService.index.mock.calls[0][0];
      expect(callArgs.id).toBe('unique-id-12345');
    });

    it('calls Elasticsearch index method exactly once per course', async () => {
      const mockCourse: Partial<Course> = {
        id: 'course-single',
        title: 'Single Index Test',
        description: 'Should index once',
        level: 'beginner',
        language: 'en',
        durationHours: 5,
        isPublished: true,
      };

      mockElasticsearchService.index.mockClear();
      await service.indexCourse(mockCourse as Course);

      expect(mockElasticsearchService.index).toHaveBeenCalledTimes(1);
    });

    it('targets the "courses" index', async () => {
      const mockCourse: Partial<Course> = {
        id: 'index-target-test',
        title: 'Index Target',
        description: 'Verify correct index',
        level: 'advanced',
        language: 'en',
        durationHours: 30,
        isPublished: true,
      };

      await service.indexCourse(mockCourse as Course);

      const callArgs = mockElasticsearchService.index.mock.calls[0][0];
      expect(callArgs.index).toBe('courses');
    });

    it('handles courses with special characters in title', async () => {
      const mockCourse: Partial<Course> = {
        id: 'special-chars',
        title: 'C++ & Rust: Advanced & Secure Programming',
        description: 'Learn & master low-level code',
        level: 'advanced',
        language: 'en',
        durationHours: 50,
        isPublished: true,
      };

      await service.indexCourse(mockCourse as Course);

      const callArgs = mockElasticsearchService.index.mock.calls[0][0];
      expect(callArgs.document.title).toBe('C++ & Rust: Advanced & Secure Programming');
      expect(callArgs.document.suggest.input).toContain('C++ & Rust: Advanced & Secure Programming');
    });

    it('handles courses with very long descriptions', async () => {
      const longDesc = 'A'.repeat(5000);
      const mockCourse: Partial<Course> = {
        id: 'long-desc',
        title: 'Long Description Course',
        description: longDesc,
        level: 'all',
        language: 'en',
        durationHours: 100,
        isPublished: true,
      };

      await service.indexCourse(mockCourse as Course);

      const callArgs = mockElasticsearchService.index.mock.calls[0][0];
      expect(callArgs.document.description).toBe(longDesc);
    });

    it('handles durationHours with decimal precision', async () => {
      const mockCourse: Partial<Course> = {
        id: 'decimal-duration',
        title: 'Precise Duration',
        description: 'Test decimal precision',
        level: 'intermediate',
        language: 'en',
        durationHours: 12.333333,
        isPublished: true,
      };

      await service.indexCourse(mockCourse as Course);

      const callArgs = mockElasticsearchService.index.mock.calls[0][0];
      expect(callArgs.document.durationHours).toBe(12.333333);
    });
  });
});
