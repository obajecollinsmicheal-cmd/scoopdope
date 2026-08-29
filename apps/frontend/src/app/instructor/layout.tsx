import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Instructor',
};

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
