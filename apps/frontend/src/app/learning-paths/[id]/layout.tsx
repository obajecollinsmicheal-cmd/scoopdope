import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learning Path',
};

export default function LearningPathDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
