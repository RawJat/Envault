import { loadedSource } from '@/lib/source';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import defaultMdxComponents from 'fumadocs-ui/mdx';

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = loadedSource.getPage(slug);

  if (!page) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MDX = (page.data as any).body;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <DocsPage toc={(page.data as any).toc} full={(page.data as any).full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents }} />
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
