import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recommendations',
};

export default function RecommendationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
