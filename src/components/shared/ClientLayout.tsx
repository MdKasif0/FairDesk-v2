
"use client";

import { usePwaUpdate } from '@/hooks/usePwaUpdate';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  usePwaUpdate();

  return <>{children}</>;
}
