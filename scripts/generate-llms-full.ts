#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

interface FrontMatter {
  title: string;
  description: string;
  [key: string]: string;
}

interface DocumentMetadata {
  filePath: string;
  relativePath: string;
  title: string;
  description: string;
  lastUpdated: string;
  source: string;
  content: string;
}

const DOCS_DIR = path.join(process.cwd(), "content", "docs");
const OUTPUT_FILE = path.join(process.cwd(), "public", "llms-full.txt");
const BASE_URL = "https://envault.tech/docs";
const SEPARATOR = "─".repeat(80);

/**
 * Parse YAML frontmatter from MDX/MD files
 */
function parseFrontMatter(content: string): {
  frontmatter: FrontMatter;
  body: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: { title: "", description: "" }, body: content };
  }

  const frontmatterStr = match[1];
  const body = match[2];

  const frontmatter: FrontMatter = { title: "", description: "" };

  // Simple YAML parser for title and description
  const titleMatch = frontmatterStr.match(/^\s*title:\s*['"]?(.+?)['"]?\s*$/m);
  const descMatch = frontmatterStr.match(
    /^\s*description:\s*['"]?(.+?)['"]?\s*$/m
  );

  if (titleMatch) frontmatter.title = titleMatch[1].trim();
  if (descMatch) frontmatter.description = descMatch[1].trim();

  return { frontmatter, body };
}

/**
 * Extract title from H1 if not in frontmatter
 */
function extractTitleFromContent(content: string): string {
  const h1Match = content.match(/^#\s+(.+?)$/m);
  return h1Match ? h1Match[1].trim() : "";
}

/**
 * Get the last updated timestamp from git
 */
function getLastUpdated(filePath: string): string {
  try {
    const timestamp = execSync(
      `git log --follow --format="%aI" -1 -- "${filePath}"`,
      { encoding: "utf-8", cwd: process.cwd() }
    ).trim();

    // Convert to UTC Z format
    if (timestamp) {
      return new Date(timestamp).toISOString();
    }
  } catch {
    console.warn(`Could not get git timestamp for ${filePath}`);
  }

  return new Date().toISOString();
}

/**
 * Convert file path to URL slug
 */
function pathToSlug(filePath: string): string {
  // Remove docs prefix and extension
  let slug = filePath.replace(/^content\/docs\//, "").replace(/\.mdx?$/, "");

  // Remove /index from the end (it becomes the directory itself)
  if (slug.endsWith("/index")) {
    slug = slug.slice(0, -"/index".length);
  }

  // Clean up empty string (root index)
  if (slug === "" || slug === "index") {
    return "";
  }

  return slug;
}

/**
 * Load the documentation order from meta.json files
 */
function loadDocOrder(): { root: string[]; nested: Record<string, string[]> } {
  const order = { root: [] as string[], nested: {} as Record<string, string[]> };

  try {
    // Load root meta.json
    const rootMetaPath = path.join(DOCS_DIR, "meta.json");
    if (fs.existsSync(rootMetaPath)) {
      const meta = JSON.parse(fs.readFileSync(rootMetaPath, "utf-8"));
      order.root = meta.pages || [];
    }

    // Load nested meta.json files
    const dirs = fs.readdirSync(DOCS_DIR).filter(f => fs.statSync(path.join(DOCS_DIR, f)).isDirectory());
    for (const dir of dirs) {
      const nestedMetaPath = path.join(DOCS_DIR, dir, "meta.json");
      if (fs.existsSync(nestedMetaPath)) {
        const meta = JSON.parse(fs.readFileSync(nestedMetaPath, "utf-8"));
        order.nested[dir] = meta.pages || [];
      }
    }
  } catch (error) {
    console.warn("Error loading meta.json files:", error);
  }

  return order;
}

/**
 * Recursively find all MDX/MD files in a directory
 */
function findDocFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and hidden directories
      if (!file.startsWith(".") && file !== "node_modules") {
        findDocFiles(filePath, fileList);
      }
    } else if (file.endsWith(".mdx") || file.endsWith(".md")) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Sort files according to meta.json order, with alphabetical fallback
 */
function sortDocumentsByMetaOrder(
  files: string[],
  docOrder: { root: string[]; nested: Record<string, string[]> }
): string[] {
  if (docOrder.root.length === 0) {
    return files.sort();
  }

  const rootOrderMap = new Map<string, number>();
  docOrder.root.forEach((category, index) => {
    rootOrderMap.set(category, index);
  });

  const nestedOrderMaps = new Map<string, Map<string, number>>();
  for (const [category, pages] of Object.entries(docOrder.nested)) {
    const map = new Map<string, number>();
    pages.forEach((page, index) => {
      map.set(page, index);
    });
    nestedOrderMaps.set(category, map);
  }

  return files.sort((a, b) => {
    // Extract the category from the path (first subdirectory)
    // e.g., content/docs/guides/installation.mdx -> guides
    // e.g., content/docs/index.mdx -> index
    const aMatch = a.match(/\/content\/docs\/([^/]+)/);
    const bMatch = b.match(/\/content\/docs\/([^/]+)/);

    let aCategory = aMatch ? aMatch[1] : "";
    let bCategory = bMatch ? bMatch[1] : "";

    // If it's a file directly in docs (like index.mdx), use the filename without extension
    if (aCategory.endsWith(".mdx") || aCategory.endsWith(".md")) {
      aCategory = aCategory.replace(/\.mdx?$/, "");
    }
    if (bCategory.endsWith(".mdx") || bCategory.endsWith(".md")) {
      bCategory = bCategory.replace(/\.mdx?$/, "");
    }

    const aOrder = rootOrderMap.get(aCategory) ?? Number.MAX_VALUE;
    const bOrder = rootOrderMap.get(bCategory) ?? Number.MAX_VALUE;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    // Within same category, sort by nested meta.json order
    const aFileMatch = a.match(/\/content\/docs\/[^/]+\/([^/]+)\.mdx?$/);
    const bFileMatch = b.match(/\/content\/docs\/[^/]+\/([^/]+)\.mdx?$/);

    const aFile = aFileMatch ? aFileMatch[1] : "";
    const bFile = bFileMatch ? bFileMatch[1] : "";

    const nestedMap = nestedOrderMaps.get(aCategory);
    if (nestedMap) {
      const aNestedOrder = nestedMap.get(aFile) ?? Number.MAX_VALUE;
      const bNestedOrder = nestedMap.get(bFile) ?? Number.MAX_VALUE;

      if (aNestedOrder !== bNestedOrder) {
        return aNestedOrder - bNestedOrder;
      }
    }

    // Fallback to alphabetical
    return a.localeCompare(b);
  });
}

/**
 * Process a single document
 */
function processDocument(filePath: string): DocumentMetadata {
  const content = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = parseFrontMatter(content);

  // If title is missing, try to extract from H1
  if (!frontmatter.title) {
    frontmatter.title = extractTitleFromContent(body) || "Untitled";
  }

  // If description is missing, use empty string (will warn)
  if (!frontmatter.description) {
    console.warn(`Missing description in: ${filePath}`);
    frontmatter.description = "No description provided";
  }

  const absolutePath = path.resolve(filePath);
  const relativeToContent = path.relative(DOCS_DIR, filePath);
  const slug = pathToSlug(`content/docs/${relativeToContent}`);
  const sourceUrl = slug ? `${BASE_URL}/${slug}` : BASE_URL;
  const lastUpdated = getLastUpdated(absolutePath);

  return {
    filePath: absolutePath,
    relativePath: relativeToContent,
    title: frontmatter.title,
    description: frontmatter.description,
    lastUpdated,
    source: sourceUrl,
    content: body.trim(),
  };
}

/**
 * Generate the llms-full.txt file
 */
function generateLlmsFullTxt() {
  console.log("🔍 Scanning documentation...");

  // Load the desired order from meta.json
  const docOrder = loadDocOrder();

  // Find all doc files
  const docFiles = findDocFiles(DOCS_DIR)
    .filter((f) => {
      // Skip files that shouldn't be included
      const baseName = path.basename(f);
      return !baseName.startsWith("_");
    });

  if (docFiles.length === 0) {
    throw new Error(`No documentation files found in ${DOCS_DIR}`);
  }

  // Sort according to meta.json order
  const sortedFiles = sortDocumentsByMetaOrder(docFiles, docOrder);

  console.log(`📚 Found ${sortedFiles.length} documentation files`);

  // Process all documents
  const documents: DocumentMetadata[] = sortedFiles.map((file) => {
    try {
      return processDocument(file);
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
      throw error;
    }
  });

  // Generate the output
  console.log("✏️  Generating llms-full.txt...");

  const sections = documents.map((doc) => {
    const metadata = `title: "${doc.title.replace(/"/g, '\\"')}"
description: "${doc.description.replace(/"/g, '\\"')}"
last_updated: "${doc.lastUpdated}"
source: "${doc.source}"`;

    return `${SEPARATOR}\n${metadata}\n${SEPARATOR}\n${doc.content}`;
  });

  const output = sections.join("\n\n");

  // Ensure public directory exists
  const publicDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write the file
  fs.writeFileSync(OUTPUT_FILE, output, "utf-8");

  console.log(`✅ Generated: ${OUTPUT_FILE}`);
  console.log(`📄 Total sections: ${documents.length}`);
  console.log(`📏 File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);
}

// Run the generator
try {
  generateLlmsFullTxt();
  process.exit(0);
} catch (error) {
  console.error("❌ Generation failed:", error);
  process.exit(1);
}
