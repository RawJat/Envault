import { loadedSource } from '@/lib/source';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { ManualInstallSelector } from '@/components/docs/ManualInstallSelector';

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = loadedSource.getPage(slug);

  if (!page) notFound();

  const MDX = (page.data as any).body;

  return (
    <DocsPage
      toc={(page.data as any).toc}
      full={(page.data as any).full}
      tableOfContent={{
        style: 'clerk',
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

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = loadedSource.getPage(slug);
  if (!page) return;

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
