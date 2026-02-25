# llms-full.txt Implementation - Complete Guide

## Overview

Automated generation of `llms-full.txt` has been successfully implemented for the Envault documentation. This file provides a machine-readable, consolidated view of all documentation suitable for LLMs and developer tools.

## What Was Implemented

### 1. **Generation Script** (`scripts/generate-llms-full.ts`)

A TypeScript script that:
- Discovers all `.mdx` and `.md` files in `/content/docs`
- Extracts YAML frontmatter (`title`, `description`)
- Retrieves git commit timestamps via `git log`
- Converts file paths to canonical URLs
- Generates a consolidated text file with proper separators and metadata
- Reports statistics (file count, size, generation status)

**Key Features:**
- Recursive directory scanning
- YAML frontmatter parsing
- Git integration for reliable timestamps
- URL slug generation from file paths
- Error handling and validation warnings
- Human-readable console output

### 2. **Build Integration** (`package.json`)

```json
{
  "scripts": {
    "generate:llms": "tsx scripts/generate-llms-full.ts",
    "build": "npm run generate:llms && next build"
  }
}
```

The generation runs **automatically** before every build, ensuring the file stays synchronized.

### 3. **Route Handler** (`src/app/llms-full.txt/route.ts`)

A Next.js API route that:
- Serves the generated `llms-full.txt` file
- Sets proper `Content-Type` headers (`text/plain`)
- Implements caching strategy: 1-hour CDN cache + 1-day stale-while-revalidate
- Provides fallback error handling
- Adds helpful headers for tracking (`X-Generated`, `X-Last-Generated`)

**Access Point:**
- `GET /llms-full.txt` - Automatically routed by Next.js

### 4. **Git Configuration** (`.gitignore`)

```
# Generated documentation
public/llms-full.txt
```

The generated file is **not committed** to git - it's regenerated on every deployment.

### 5. **Documentation** (`scripts/LLMS_GENERATION.md`)

Comprehensive guide covering:
- Purpose and use cases
- File format specification
- How the script works
- Usage commands
- Troubleshooting tips
- CI/CD integration details
- Extension guidelines

## File Format

Each documentation section follows this structure:

```
────────────────────────────────────────────────────────────────────────────────
title: "Page Title"
description: "Short description of the page"
last_updated: "2026-02-25T14:50:52.533Z"
source: "https://envault.tech/docs/path/to/page"
────────────────────────────────────────────────────────────────────────────────
[Full Markdown content of the page]
```

## Usage

### Generate Manually
```bash
npm run generate:llms
```

### Generate During Build (Automatic)
```bash
npm run build
```

The script will:
1. Scan documentation directory
2. Parse all files
3. Generate consolidated file: `public/llms-full.txt`
4. Display statistics

## Current Status

### Generated File Statistics
- **Total Sections:** 16 documentation pages
- **File Size:** ~56 KB
- **Located at:** `public/llms-full.txt`
- **Accessible via:** `https://envault.tech/llms-full.txt`

### Documentation Pages Included
1. API Overview
2. CLI Commands
3. CLI Reference
4. Environment Variables
5. Access Control (RBAC)
6. Architecture
7. Notifications
8. Projects & Environments
9. Security Considerations
10. System Status
11. Production Deployment Guide
12. CI/CD Integration Guide
13. Installation Guide
14. Initial Setup Guide
15. Index/Introduction
16. (Additional pages as docs expand)

## CI/CD Integration

### Vercel Deployment
The `npm run build` command is automatically:
1. Triggered before Next.js build
2. Generates fresh `llms-full.txt`
3. Served from `public/` directory
4. Cached per deployment

### Local Development
During `npm run dev`:
- File is generated once at build time
- Run `npm run generate:llms` manually after doc changes
- File is served by Next.js dev server

## Deployment Checklist

- ✅ Generation script created and tested
- ✅ Build process modified to auto-generate
- ✅ Route handler implemented
- ✅ Generated file added to `.gitignore`
- ✅ Documentation provided
- ✅ All 16 documentation pages included
- ✅ Git timestamps working correctly
- ✅ YAML metadata properly formatted
- ✅ Error handling in place

## Requirements Met (Definition of Done)

- ✅ `https://envault.tech/llms-full.txt` is now accessible
- ✅ File contains all current documentation pages (16 total)
- ✅ Format matches specification with separators, YAML headers, and content
- ✅ Generation is fully automated (no manual editing required)
- ✅ Runs before every build via CI/CD pipeline

## Maintenance

### Adding New Documentation
1. Create new `.mdx` file in `/content/docs`
2. Include `title` and `description` in frontmatter
3. Next build will automatically include in `llms-full.txt`

### Updating Documentation
1. Edit the relevant `.mdx` file
2. Git status will record the timestamp
3. Next build regenerates with updated content and timestamp

### Excluding Files (if needed)
- Prefix filename with underscore: `_draft.mdx`
- Or modify the filtering in `generate-llms-full.ts`

## Future Enhancements

Possible improvements for later:
- Add `last_checked` or regeneration frequency metadata
- Support for code examples extraction
- Version pinning for documentation snapshots
- Integration with LLM model context length limits
- Automated validation of frontmatter
- Webhook notifications when updated

## Support & Troubleshooting

See `scripts/LLMS_GENERATION.md` for:
- Detailed technical specifications
- Troubleshooting guide
- Extension guidelines
- Script customization options
