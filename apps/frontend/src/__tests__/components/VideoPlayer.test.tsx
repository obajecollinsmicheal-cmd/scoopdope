import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoPlayer } from '@/components/courses/VideoPlayer';

// Mock the useVideoShortcuts hook – it binds keyboard listeners we don't need in these tests
vi.mock('@/hooks/useVideoShortcuts', () => ({
  useVideoShortcuts: vi.fn(),
}));

const defaultProps = {
  src: 'https://example.com/video.mp4',
  lessonId: 'lesson-1',
  courseId: 'course-1',
};

describe('VideoPlayer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a video element by default', () => {
    render(<VideoPlayer {...defaultProps} />);
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', defaultProps.src);
  });

  it('restores saved playback position from localStorage on mount', () => {
    localStorage.setItem('vp-lesson-1', '42.5');
    render(<VideoPlayer {...defaultProps} />);
    const video = document.querySelector('video') as HTMLVideoElement;
    expect(video.currentTime).toBe(42.5);
  });

  it('does not throw when no saved position exists', () => {
    expect(() => render(<VideoPlayer {...defaultProps} />)).not.toThrow();
    const video = document.querySelector('video') as HTMLVideoElement;
    expect(video.currentTime).toBe(0);
  });

  it('saves playback position to localStorage on the first timeupdate', () => {
    render(<VideoPlayer {...defaultProps} />);
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'currentTime', { value: 5, writable: true });

    fireEvent.timeUpdate(video);

    expect(localStorage.getItem('vp-lesson-1')).toBe('5');
  });

  it('does NOT write to localStorage again before 10 seconds have elapsed', () => {
    render(<VideoPlayer {...defaultProps} />);
    const video = document.querySelector('video') as HTMLVideoElement;

    // First save at t=0
    Object.defineProperty(video, 'currentTime', { value: 5, writable: true });
    fireEvent.timeUpdate(video);
    expect(localStorage.getItem('vp-lesson-1')).toBe('5');

    // Advance only 5 seconds — should NOT save again
    vi.advanceTimersByTime(5_000);
    Object.defineProperty(video, 'currentTime', { value: 10, writable: true });
    fireEvent.timeUpdate(video);
    expect(localStorage.getItem('vp-lesson-1')).toBe('5'); // unchanged
  });

  it('saves again after 10 seconds have elapsed since the last write', () => {
    render(<VideoPlayer {...defaultProps} />);
    const video = document.querySelector('video') as HTMLVideoElement;

    // First save
    Object.defineProperty(video, 'currentTime', { value: 5, writable: true });
    fireEvent.timeUpdate(video);
    expect(localStorage.getItem('vp-lesson-1')).toBe('5');

    // Advance 10 seconds — should now save the updated position
    vi.advanceTimersByTime(10_000);
    Object.defineProperty(video, 'currentTime', { value: 15, writable: true });
    fireEvent.timeUpdate(video);
    expect(localStorage.getItem('vp-lesson-1')).toBe('15');
  });

  it('shows error UI when the video fires an error event', () => {
    render(<VideoPlayer {...defaultProps} />);
    const video = document.querySelector('video')!;

    // Simulate a video load error
    fireEvent.error(video);

    // The video element should be replaced by the error state
    expect(document.querySelector('video')).not.toBeInTheDocument();

    // Error message should be visible
    expect(screen.getByText('Video failed to load')).toBeInTheDocument();
    expect(
      screen.getByText(/network issue or an unsupported format/),
    ).toBeInTheDocument();

    // Retry button should be present
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

    // The error container should have role="alert" for accessibility
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('restores the video element when Retry is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<VideoPlayer {...defaultProps} />);
    const video = document.querySelector('video')!;

    // Trigger error
    fireEvent.error(video);
    expect(document.querySelector('video')).not.toBeInTheDocument();

    // Click Retry
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    // Video should be rendered again
    const restoredVideo = document.querySelector('video');
    expect(restoredVideo).toBeInTheDocument();
  });

  it('appends a cache-busting query param on retry', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<VideoPlayer {...defaultProps} />);

    // First error + retry
    fireEvent.error(document.querySelector('video')!);
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    const video1 = document.querySelector('video')!;
    expect(video1.getAttribute('src')).toBe(
      'https://example.com/video.mp4?_retry=1',
    );

    // Second error + retry
    fireEvent.error(video1);
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    const video2 = document.querySelector('video')!;
    expect(video2.getAttribute('src')).toBe(
      'https://example.com/video.mp4?_retry=2',
    );
  });

  it('handles src with existing query params on retry', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(
      <VideoPlayer
        {...defaultProps}
        src="https://example.com/video.mp4?token=abc"
      />,
    );

    fireEvent.error(document.querySelector('video')!);
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    const video = document.querySelector('video')!;
    expect(video.getAttribute('src')).toBe(
      'https://example.com/video.mp4?token=abc&_retry=1',
    );
  });
});
