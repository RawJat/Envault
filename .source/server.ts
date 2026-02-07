// @ts-nocheck
import { default as __fd_glob_15 } from "../content/docs/guides/meta.json?collection=meta"
import { default as __fd_glob_14 } from "../content/docs/core/meta.json?collection=meta"
import { default as __fd_glob_13 } from "../content/docs/cli/meta.json?collection=meta"
import { default as __fd_glob_12 } from "../content/docs/configuration/meta.json?collection=meta"
import { default as __fd_glob_11 } from "../content/docs/api/meta.json?collection=meta"
import { default as __fd_glob_10 } from "../content/docs/meta.json?collection=meta"
import * as __fd_glob_9 from "../content/docs/guides/installation.mdx?collection=docs"
import * as __fd_glob_8 from "../content/docs/guides/initial-setup.mdx?collection=docs"
import * as __fd_glob_7 from "../content/docs/core/security.mdx?collection=docs"
import * as __fd_glob_6 from "../content/docs/core/projects.mdx?collection=docs"
import * as __fd_glob_5 from "../content/docs/core/architecture.mdx?collection=docs"
import * as __fd_glob_4 from "../content/docs/configuration/environment-variables.mdx?collection=docs"
import * as __fd_glob_3 from "../content/docs/cli/reference.mdx?collection=docs"
import * as __fd_glob_2 from "../content/docs/cli/commands.mdx?collection=docs"
import * as __fd_glob_1 from "../content/docs/api/overview.mdx?collection=docs"
import * as __fd_glob_0 from "../content/docs/index.mdx?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.doc("docs", "content/docs", {"index.mdx": __fd_glob_0, "api/overview.mdx": __fd_glob_1, "cli/commands.mdx": __fd_glob_2, "cli/reference.mdx": __fd_glob_3, "configuration/environment-variables.mdx": __fd_glob_4, "core/architecture.mdx": __fd_glob_5, "core/projects.mdx": __fd_glob_6, "core/security.mdx": __fd_glob_7, "guides/initial-setup.mdx": __fd_glob_8, "guides/installation.mdx": __fd_glob_9, });

export const meta = await create.meta("meta", "content/docs", {"meta.json": __fd_glob_10, "api/meta.json": __fd_glob_11, "configuration/meta.json": __fd_glob_12, "cli/meta.json": __fd_glob_13, "core/meta.json": __fd_glob_14, "guides/meta.json": __fd_glob_15, });