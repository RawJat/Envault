import { docs, meta } from "fumadocs-mdx:collections/server";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";
import { loader } from "fumadocs-core/source";
import { createElement } from "react";
import { icons } from "lucide-react";

export const loadedSource = loader({
  source: toFumadocsSource(docs, meta),
  baseUrl: "/docs",
  icon(icon) {
    if (!icon) return;

    const Icon = icons[icon as keyof typeof icons];
    if (!Icon) return;

    return createElement(Icon);
  },
});
