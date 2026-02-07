import { docs, meta } from '../../.source/server';
import { loader } from 'fumadocs-core/source';

function toFumadocsSource(pages: any[], metas: any[]) {
	const files = [];
	for (const entry of pages) files.push({
		type: "page" as const,
		path: entry.info.path,
		absolutePath: entry.info.fullPath,
		data: entry
	});
	for (const entry of metas) files.push({
		type: "meta" as const,
		path: entry.info.path,
		absolutePath: entry.info.fullPath,
		data: entry
	});
	return { files };
}

const src = toFumadocsSource(docs, meta);

export const loadedSource = loader(src, { baseUrl: '/docs' });
