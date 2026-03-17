import type { ReactNode } from "react";
import { loadedSource } from "@/lib/utils/source";
import DocsLayoutClient from "@/components/docs/docs-layout-client";
import { getServerOS } from "@/lib/utils/os";
import "./docs.css";

export default async function Layout({ children }: { children: ReactNode }) {
  const os = await getServerOS();
  return (
    <DocsLayoutClient tree={loadedSource.pageTree} os={os}>
      {children}
    </DocsLayoutClient>
  );
}
