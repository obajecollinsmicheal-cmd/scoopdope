import api from './api';

export interface ForumPost {
  id: string;
  courseId: string;
  userId: string;
  title: string;
  content: string;
  isPinned: boolean;
  answerReplyId: string | null;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  user?: { id: string; username?: string; avatar?: string };
  replies?: ForumReply[];
}

export interface ForumReply {
  id: string;
  postId: string;
  userId: string;
  content: string;
  isAnswer: boolean;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  user?: { id: string; username?: string; avatar?: string };
}

export type VoteDirection = 'up' | 'down' | 'remove';

// Legacy Thread type kept for compatibility with existing components
export interface Thread extends ForumPost {
  body: string;
  authorId: string;
  authorName: string;
  category: string;
  replyCount: number;
  isLocked: boolean;
  lastActivityAt: string;
}

export interface Reply extends ForumReply {
  threadId: string;
  authorId: string;
  authorName: string;
  body: string;
}

export type ThreadSort = 'newest' | 'upvoted' | 'replies';

export const forumApi = {
  /** Fetch posts for a course (maps to GET /courses/:id/posts) */
  getPosts: (courseId: string) =>
    api.get<ForumPost[]>(`/courses/${courseId}/posts`).then((r) => r.data),

  /** Legacy alias used by existing ThreadList component */
  getThreads: (courseId: string, sort: ThreadSort = 'newest', search?: string, category?: string) =>
    api
      .get<{ threads: Thread[]; total: number }>(`/courses/${courseId}/forum/threads`, {
        params: { sort, search, category },
      })
      .then((r) => r.data),

  getThread: (courseId: string, threadId: string) =>
    api.get<Thread>(`/courses/${courseId}/forum/threads/${threadId}`).then((r) => r.data),

  getReplies: (courseId: string, threadId: string) =>
    api
      .get<Reply[]>(`/courses/${courseId}/forum/threads/${threadId}/replies`)
      .then((r) => r.data),

  /** Create a post for a course (maps to POST /courses/:id/posts) */
  createPost: (courseId: string, data: { title: string; content: string; isPinned?: boolean }) =>
    api.post<ForumPost>(`/courses/${courseId}/posts`, data).then((r) => r.data),

  /** Legacy alias used by existing ForumPage component */
  createThread: (courseId: string, data: { title: string; body: string; category: string }) =>
    api.post<Thread>(`/courses/${courseId}/forum/threads`, data).then((r) => r.data),

  /** Create a reply for a post (maps to POST /posts/:id/replies) */
  createReply: (postId: string, content: string) =>
    api.post<ForumReply>(`/posts/${postId}/replies`, { content }).then((r) => r.data),

  /** Vote on a post */
  votePost: (id: string, direction: VoteDirection) =>
    api.post<ForumPost>(`/posts/${id}/vote`, { direction }).then((r) => r.data),

  /** Vote on a reply */
  voteReply: (id: string, direction: VoteDirection) =>
    api.post<ForumReply>(`/replies/${id}/vote`, { direction }).then((r) => r.data),

  pinThread: (courseId: string, threadId: string) =>
    api.post(`/courses/${courseId}/forum/threads/${threadId}/pin`).then((r) => r.data),

  lockThread: (courseId: string, threadId: string) =>
    api.post(`/courses/${courseId}/forum/threads/${threadId}/lock`).then((r) => r.data),

  deleteThread: (courseId: string, threadId: string) =>
    api.delete(`/courses/${courseId}/forum/threads/${threadId}`).then((r) => r.data),

  deleteReply: (courseId: string, threadId: string, replyId: string) =>
    api
      .delete(`/courses/${courseId}/forum/threads/${threadId}/replies/${replyId}`)
      .then((r) => r.data),
};
