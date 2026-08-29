import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bundle',
};

export default function BundleDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
