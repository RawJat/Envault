import { loadedSource } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const { GET } = createFromSource(loadedSource, {
  language: 'english',
});
