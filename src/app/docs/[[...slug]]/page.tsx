import { loadedSource } from "@/lib/utils/source";
import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
} from "fumadocs-ui/page";
import {
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/flux/page";
import { notFound } from "next/navigation";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { ManualInstallSelector } from "@/components/docs/ManualInstallSelector";

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = loadedSource.getPage(slug);

  if (!page) notFound();

  const pageData = page.data as {
    title: string;
    description: string;
    info?: {
      path: string;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toc: any[];
    full?: boolean;
  };
  const slugPath = slug?.join("/") ?? "";
  const markdownUrl = slugPath
    ? `/api/docs/markdown?slug=${encodeURIComponent(slugPath)}`
    : "/api/docs/markdown";
  const githubPath = pageData.info?.path;
  const githubUrl = githubPath
    ? `https://github.com/DinanathDash/Envault/blob/main/content/docs/${githubPath}`
    : undefined;
  const MDX = pageData.body;

  return (
    <DocsPage
      toc={pageData.toc}
      full={pageData.full}
      tableOfContent={{
        style: "clerk",
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <div className="not-prose mb-8 border-b border-fd-border pb-4">
        <div className="flex items-center gap-2">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={githubUrl} />
        </div>
      </div>
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents, ManualInstallSelector }} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return loadedSource.generateParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = loadedSource.getPage(slug);
  if (!page) return;

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: slug ? `/docs/${slug.join("/")}` : "/docs",
    },
    openGraph: {
      url: slug
        ? `https://www.envault.tech/docs/${slug.join("/")}`
        : "https://www.envault.tech/docs",
      siteName: "Envault",
      images: [
        `/api/og?title=${encodeURIComponent(page.data.title as string)}&section=Docs&description=${encodeURIComponent(page.data.description as string)}`,
      ],
    },
  };
}
