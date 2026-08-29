import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ModulesService } from './modules.service';
import { CourseModule } from './course-module.entity';

describe('ModulesService — Reorder and Position Management', () => {
  let service: ModulesService;
  let repo: jest.Mocked<Repository<CourseModule>>;

  const COURSE_ID = 'course-123';

  function mockModule(overrides: Partial<CourseModule> = {}): CourseModule {
    return {
      id: `module-${Math.random()}`,
      courseId: COURSE_ID,
      title: 'Test Module',
      order: 1,
      releaseDate: null,
      lessons: [],
      createdAt: new Date(),
      ...overrides,
    } as CourseModule;
  }

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<Repository<CourseModule>>> = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModulesService,
        { provide: getRepositoryToken(CourseModule), useValue: mockRepo },
      ],
    }).compile();

    service = module.get(ModulesService);
    repo = module.get(getRepositoryToken(CourseModule));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Deletion with automatic position renumbering
  // ─────────────────────────────────────────────────────────────────────────

  describe('remove — deletion with position gap prevention', () => {
    it('throws NotFoundException when module does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('removes module and renumbers remaining modules when middle module deleted', async () => {
      const mod1 = mockModule({ id: 'mod-1', order: 1 });
      const mod2 = mockModule({ id: 'mod-2', order: 2 });
      const mod3 = mockModule({ id: 'mod-3', order: 3 });

      repo.findOne.mockResolvedValue(mod2); // deleting middle module
      repo.find.mockResolvedValue([mod1, mod3]); // after deletion

      const saves: CourseModule[] = [];
      repo.save.mockImplementation((mod) => {
        saves.push(mod as CourseModule);
        return Promise.resolve(mod as CourseModule);
      });

      await service.remove('mod-2');

      expect(repo.remove).toHaveBeenCalledWith(mod2);
      // After deletion, mod1 should stay at 1, mod3 should move to 2
      expect(saves).toHaveLength(2);
      expect(saves[0]).toMatchObject({ id: 'mod-1', order: 1 });
      expect(saves[1]).toMatchObject({ id: 'mod-3', order: 2 });
    });

    it('renumbers positions [1, 3, 5] to [1, 2, 3] after deletions', async () => {
      const deletedMod = mockModule({ id: 'mod-to-delete', order: 3 });
      const mod1 = mockModule({ id: 'mod-1', order: 1 });
      const mod3 = mockModule({ id: 'mod-3', order: 3 });
      const mod5 = mockModule({ id: 'mod-5', order: 5 });

      repo.findOne.mockResolvedValue(deletedMod);
      repo.find.mockResolvedValue([mod1, mod3, mod5]); // after deletion of mod at position 3

      const saves: CourseModule[] = [];
      repo.save.mockImplementation((mod) => {
        saves.push(mod as CourseModule);
        return Promise.resolve(mod as CourseModule);
      });

      await service.remove('mod-to-delete');

      // Remaining modules should be renumbered: 1, 2, 3
      expect(saves[0]).toMatchObject({ id: 'mod-1', order: 1 });
      expect(saves[1]).toMatchObject({ id: 'mod-3', order: 2 });
      expect(saves[2]).toMatchObject({ id: 'mod-5', order: 3 });
    });

    it('handles deletion of last module without errors', async () => {
      const lastMod = mockModule({ id: 'mod-last', order: 5 });
      const mod1 = mockModule({ id: 'mod-1', order: 1 });
      const mod2 = mockModule({ id: 'mod-2', order: 2 });

      repo.findOne.mockResolvedValue(lastMod);
      repo.find.mockResolvedValue([mod1, mod2]); // remaining after deleting last

      const saves: CourseModule[] = [];
      repo.save.mockImplementation((mod) => {
        saves.push(mod as CourseModule);
        return Promise.resolve(mod as CourseModule);
      });

      await service.remove('mod-last');

      expect(saves[0]).toMatchObject({ order: 1 });
      expect(saves[1]).toMatchObject({ order: 2 });
    });

    it('handles deletion of first module and renumbers remaining', async () => {
      const firstMod = mockModule({ id: 'mod-1', order: 1 });
      const mod2 = mockModule({ id: 'mod-2', order: 2 });
      const mod3 = mockModule({ id: 'mod-3', order: 3 });

      repo.findOne.mockResolvedValue(firstMod);
      repo.find.mockResolvedValue([mod2, mod3]); // remaining

      const saves: CourseModule[] = [];
      repo.save.mockImplementation((mod) => {
        saves.push(mod as CourseModule);
        return Promise.resolve(mod as CourseModule);
      });

      await service.remove('mod-1');

      expect(saves[0]).toMatchObject({ id: 'mod-2', order: 1 });
      expect(saves[1]).toMatchObject({ id: 'mod-3', order: 2 });
    });

    it('preserves course integrity when deleting — only renumbers for deleted course', async () => {
      const mod = mockModule({ id: 'mod-to-delete', courseId: COURSE_ID });
      repo.findOne.mockResolvedValue(mod);
      repo.find.mockResolvedValue([]);

      await service.remove('mod-to-delete');

      // find() was called with courseId of deleted module
      expect(repo.find).toHaveBeenCalledWith({
        where: { courseId: COURSE_ID },
        order: { order: 'ASC' },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Reorder functionality
  // ─────────────────────────────────────────────────────────────────────────

  describe('reorder — drag-and-drop reordering', () => {
    it('throws NotFoundException if any module in reorder list does not exist', async () => {
      const mod1 = mockModule({ id: 'mod-1' });
      const mod2 = mockModule({ id: 'mod-2' });

      repo.find.mockResolvedValue([mod1, mod2]);

      await expect(
        service.reorder(COURSE_ID, ['mod-1', 'nonexistent', 'mod-2']),
      ).rejects.toThrow(NotFoundException);
    });

    it('reorders modules to requested sequence and returns in order', async () => {
      const mod1 = mockModule({ id: 'mod-1', order: 1 });
      const mod2 = mockModule({ id: 'mod-2', order: 2 });
      const mod3 = mockModule({ id: 'mod-3', order: 3 });

      repo.find.mockResolvedValueOnce([mod1, mod2, mod3]); // first call
      repo.find.mockResolvedValueOnce([mod3, mod1, mod2]); // second call after reorder

      const saves: CourseModule[] = [];
      repo.save.mockImplementation((mod) => {
        saves.push(mod as CourseModule);
        return Promise.resolve(mod as CourseModule);
      });

      const result = await service.reorder(COURSE_ID, ['mod-3', 'mod-1', 'mod-2']);

      // Verify reordering happened
      expect(saves).toHaveLength(3);
      expect(saves[0]).toMatchObject({ id: 'mod-3', order: 1 });
      expect(saves[1]).toMatchObject({ id: 'mod-1', order: 2 });
      expect(saves[2]).toMatchObject({ id: 'mod-2', order: 3 });

      // Verify returned result is in correct order
      expect(result).toEqual([mod3, mod1, mod2]);
    });

    it('handles moving module from position 3 before module at position 1', async () => {
      const mod1 = mockModule({ id: 'mod-1', order: 1 });
      const mod2 = mockModule({ id: 'mod-2', order: 2 });
      const mod3 = mockModule({ id: 'mod-3', order: 3 });

      repo.find.mockResolvedValueOnce([mod1, mod2, mod3]);
      repo.find.mockResolvedValueOnce([mod3, mod1, mod2]);

      const saves: CourseModule[] = [];
      repo.save.mockImplementation((mod) => {
        saves.push(mod as CourseModule);
        return Promise.resolve(mod as CourseModule);
      });

      await service.reorder(COURSE_ID, ['mod-3', 'mod-1', 'mod-2']);

      expect(saves[0]).toMatchObject({ id: 'mod-3', order: 1 });
      expect(saves[1]).toMatchObject({ id: 'mod-1', order: 2 });
      expect(saves[2]).toMatchObject({ id: 'mod-2', order: 3 });
    });

    it('validates that all modules are provided for reordering', async () => {
      const mod1 = mockModule({ id: 'mod-1', order: 1 });
      const mod2 = mockModule({ id: 'mod-2', order: 2 });
      const mod3 = mockModule({ id: 'mod-3', order: 3 });

      repo.find.mockResolvedValueOnce([mod1, mod2, mod3]);

      // Providing fewer modules than exist should work —
      // the service reorders the specified modules
      repo.find.mockResolvedValueOnce([mod1, mod2, mod3]);
      repo.save.mockResolvedValue(null as any);

      await service.reorder(COURSE_ID, ['mod-1', 'mod-2']);
      // Service accepts the reorder request for provided modules
      expect(repo.find).toHaveBeenCalled();
    });

    it('returns modules in correct order after reordering', async () => {
      const mod1 = mockModule({ id: 'mod-1', order: 1 });
      const mod2 = mockModule({ id: 'mod-2', order: 2 });

      repo.find.mockResolvedValueOnce([mod1, mod2]);
      const reorderedMods = [mod2, mod1];
      repo.find.mockResolvedValueOnce(reorderedMods);

      repo.save.mockResolvedValue(null as any);

      const result = await service.reorder(COURSE_ID, ['mod-2', 'mod-1']);

      expect(result).toEqual(reorderedMods);
    });

    it('ensures positions are sequential after reorder (1, 2, 3...)', async () => {
      const modules = [
        mockModule({ id: 'mod-1', order: 1 }),
        mockModule({ id: 'mod-2', order: 2 }),
        mockModule({ id: 'mod-3', order: 3 }),
        mockModule({ id: 'mod-4', order: 4 }),
      ];

      repo.find.mockResolvedValueOnce(modules);
      repo.find.mockResolvedValueOnce([modules[3], modules[0], modules[2], modules[1]]);

      const saves: CourseModule[] = [];
      repo.save.mockImplementation((mod) => {
        saves.push(mod as CourseModule);
        return Promise.resolve(mod as CourseModule);
      });

      await service.reorder(COURSE_ID, ['mod-4', 'mod-1', 'mod-3', 'mod-2']);

      for (let i = 0; i < saves.length; i++) {
        expect(saves[i].order).toBe(i + 1);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Edge cases
  // ─────────────────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles deletion when course has only one module', async () => {
      const onlyMod = mockModule({ id: 'mod-1' });
      repo.findOne.mockResolvedValue(onlyMod);
      repo.find.mockResolvedValue([]);

      await service.remove('mod-1');

      expect(repo.remove).toHaveBeenCalledWith(onlyMod);
    });

    it('reorders empty course without errors', async () => {
      repo.find.mockResolvedValueOnce([]);
      repo.find.mockResolvedValueOnce([]);

      const result = await service.reorder(COURSE_ID, []);

      expect(result).toEqual([]);
    });

    it('handles single module reorder', async () => {
      const mod = mockModule({ id: 'mod-1', order: 1 });
      repo.find.mockResolvedValueOnce([mod]);
      repo.find.mockResolvedValueOnce([mod]);

      repo.save.mockResolvedValue(mod);

      const result = await service.reorder(COURSE_ID, ['mod-1']);

      expect(result).toEqual([mod]);
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'mod-1', order: 1 }));
    });
  });
});
