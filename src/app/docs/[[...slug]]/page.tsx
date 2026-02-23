import { loadedSource } from "@/lib/source";
import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
} from "fumadocs-ui/page";
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toc: any[];
    full?: boolean;
  };

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
  };
}
