import { docs, meta } from 'fumadocs-mdx:collections/server';
import { toFumadocsSource } from 'fumadocs-mdx/runtime/server';
import { loader } from 'fumadocs-core/source';

export const loadedSource = loader({
  source: toFumadocsSource(docs, meta),
  baseUrl: '/docs',
});
