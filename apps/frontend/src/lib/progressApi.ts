import api from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuizScore {
  quizId: string;
  title: string;
  /** 0–100 */
  score: number;
  /** Total possible points */
  maxScore: number;
  completedAt: string;
}

export interface LessonProgressDetail {
  lessonId: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
}

export interface ModuleProgress {
  moduleId: string;
  title: string;
  order: number;
  lessons: LessonProgressDetail[];
  /** 0–100 derived from completed/total lessons */
  progressPct: number;
  quizScores: QuizScore[];
}

export interface CourseProgressPayload {
  courseId: string;
  courseTitle: string;
  /** 0–100 overall */
  overallProgressPct: number;
  totalLessons: number;
  completedLessons: number;
  modules: ModuleProgress[];
  /** ISO timestamp of the last recorded activity */
  lastActivityAt: string | null;
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

/**
 * Fetches structured progress data for a given course and user.
 *
 * Strategy: the backend's existing progress endpoint returns a flat list
 * (`GET /users/:userId/progress`). We also fetch course modules/lessons to
 * build the per-module breakdown the UI needs. Both calls run in parallel.
 *
 * When the dedicated `GET /v1/progress/:courseId` endpoint is added to the
 * backend, replace this function body with a single api.get call and keep
 * the return type identical.
 */
export async function fetchCourseProgress(
  courseId: string,
  userId: string,
): Promise<CourseProgressPayload> {
  const [progressRes, modulesRes, courseRes] = await Promise.all([
    api.get<Array<{ courseId: string; lessonId: string; progressPct: number; completedAt: string | null }>>(`/users/${userId}/progress`),
    api.get<Array<{ id: string; title: string; order: number; lessons: Array<{ id: string; title: string }> }>>(`/courses/${courseId}/modules`),
    api.get<{ id: string; title: string }>(`/courses/${courseId}`),
  ]);

  // Flat progress records for this course, keyed by lessonId
  const lessonProgressMap = new Map(
    progressRes.data
      .filter((p) => p.courseId === courseId)
      .map((p) => [p.lessonId, p]),
  );

  // Build per-module breakdown
  const modules: ModuleProgress[] = modulesRes.data.map((mod) => {
    const lessons: LessonProgressDetail[] = (mod.lessons ?? []).map((lesson) => {
      const record = lessonProgressMap.get(lesson.id);
      return {
        lessonId: lesson.id,
        title: lesson.title,
        completed: (record?.progressPct ?? 0) >= 100,
        completedAt: record?.completedAt ?? null,
      };
    });

    const completed = lessons.filter((l) => l.completed).length;
    const progressPct =
      lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;

    return {
      moduleId: mod.id,
      title: mod.title,
      order: mod.order,
      lessons,
      progressPct,
      // Quiz scores are fetched separately if available; default to empty
      quizScores: [],
    };
  });

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const completedLessons = modules.reduce(
    (sum, m) => sum + m.lessons.filter((l) => l.completed).length,
    0,
  );
  const overallProgressPct =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Most recent completion timestamp across all lessons
  const timestamps = modules
    .flatMap((m) => m.lessons)
    .map((l) => l.completedAt)
    .filter((t): t is string => t !== null)
    .sort()
    .reverse();

  return {
    courseId,
    courseTitle: courseRes.data?.title ?? courseId,
    overallProgressPct,
    totalLessons,
    completedLessons,
    modules: modules.sort((a, b) => a.order - b.order),
    lastActivityAt: timestamps[0] ?? null,
  };
}
