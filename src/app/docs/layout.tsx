import type { ReactNode } from 'react';
import { loadedSource } from '@/lib/source';
import DocsLayoutClient from '@/components/docs/docs-layout-client';
import { getServerOS } from '@/lib/os';

export default async function Layout({ children }: { children: ReactNode }) {
  const os = await getServerOS();
  return (
    <DocsLayoutClient tree={loadedSource.pageTree} os={os}>
      {children}
    </DocsLayoutClient>
  );
}
