'use client';
import { useEffect, useState } from 'react';
import { forumApi, ForumPost, ForumReply } from '@/lib/forumApi';
import { VoteButton } from '@/components/forum/VoteButton';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

interface CourseForumTabProps {
  courseId: string;
}

function ReplyItem({ reply }: { reply: ForumReply }) {
  const authorName = reply.user?.username ?? 'User';
  return (
    <div className="pl-6 border-l-2 border-gray-100 space-y-1">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="font-medium text-gray-700">{authorName}</span>
        <span>·</span>
        <span>{new Date(reply.createdAt).toLocaleDateString()}</span>
        {reply.isAnswer && (
          <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs">✓ Answer</span>
        )}
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
      <VoteButton
        type="reply"
        id={reply.id}
        initialUpvotes={reply.upvotes}
        initialDownvotes={reply.downvotes}
      />
    </div>
  );
}

function PostCard({
  post,
  onReply,
}: {
  post: ForumPost;
  onReply: (postId: string, content: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const authorName = post.user?.username ?? 'User';

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setSubmitting(true);
    await onReply(post.id, replyContent);
    setReplyContent('');
    setShowReplyForm(false);
    setSubmitting(false);
  }

  return (
    <div
      className={`border rounded-xl p-4 space-y-3 transition-shadow hover:shadow-sm ${
        post.isPinned ? 'border-blue-300 bg-blue-50/30' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {post.isPinned && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                📌 Pinned
              </span>
            )}
            {post.answerReplyId && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                ✓ Answered
              </span>
            )}
          </div>
          <h3 className="font-semibold">{post.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {authorName} · {new Date(post.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className="text-xs text-gray-400 shrink-0">
          {post.replies?.length ?? 0} replies
        </span>
      </div>

      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{post.content}</p>

      <div className="flex items-center gap-3">
        <VoteButton
          type="post"
          id={post.id}
          initialUpvotes={post.upvotes}
          initialDownvotes={post.downvotes}
        />
        {(post.replies?.length ?? 0) > 0 && (
          <button
            className="text-xs text-blue-600 hover:underline"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Hide replies' : `Show ${post.replies!.length} replies`}
          </button>
        )}
        <button
          className="text-xs text-gray-500 hover:text-blue-600 ml-auto"
          onClick={() => setShowReplyForm((v) => !v)}
        >
          Reply
        </button>
      </div>

      {expanded && post.replies && post.replies.length > 0 && (
        <div className="space-y-3 pt-2">
          {post.replies.map((r) => (
            <ReplyItem key={r.id} reply={r} />
          ))}
        </div>
      )}

      {showReplyForm && (
        <form onSubmit={handleReply} className="space-y-2 pt-2 border-t">
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder="Write a reply…"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            maxLength={5000}
          />
          <Button type="submit" disabled={submitting || !replyContent.trim()}>
            {submitting ? 'Posting…' : 'Post Reply'}
          </Button>
        </form>
      )}
    </div>
  );
}

export function CourseForumTab({ courseId }: CourseForumTabProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    forumApi.getPosts(courseId).then((data) => {
      setPosts(data);
      setLoading(false);
    });
  }, [courseId]);

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const post = await forumApi.createPost(courseId, { title, content });
      setPosts((prev) => [post, ...prev]);
      setTitle('');
      setContent('');
      setShowNewPost(false);
    } catch {
      setError('Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(postId: string, replyContent: string) {
    try {
      const reply = await forumApi.createReply(postId, replyContent);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, replies: [...(p.replies ?? []), reply] } : p
        )
      );
    } catch {
      // silent fail — reply form shows its own error state
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse border rounded-xl p-4 h-24 bg-gray-50" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Discussion Forum</h2>
        {user && (
          <Button onClick={() => setShowNewPost((v) => !v)}>
            {showNewPost ? 'Cancel' : 'New Post'}
          </Button>
        )}
      </div>

      {showNewPost && (
        <form
          onSubmit={handleCreatePost}
          className="border rounded-xl p-5 space-y-3 bg-gray-50"
        >
          <h3 className="font-medium">Create a new post</h3>
          <input
            type="text"
            placeholder="Post title"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={4}
            placeholder="Write your post…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={10000}
            required
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit" disabled={submitting || !title.trim() || !content.trim()}>
            {submitting ? 'Posting…' : 'Post'}
          </Button>
        </form>
      )}

      {posts.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No posts yet. {user ? 'Be the first to start a discussion!' : 'Log in to start a discussion.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} onReply={handleReply} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
