import sdkConfig from "./release.sdk.config.js";
import mcpConfig from "./release.mcp.config.js";

const cliConfig = {
  branches: ["main"],
  tagFormat: "v${version}",
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          { type: "refactor", release: "patch" },
          { type: "perf", release: "patch" },
          { type: "build", release: "patch" },
        ],
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
      },
    ],
    [
      "@semantic-release/npm",
      {
        pkgRoot: "cli-wrapper",
        npmPublish: true,
      },
    ],
    [
      "@semantic-release/exec",
      {
        publishCmd: "cd cli-go && goreleaser release --clean",
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: ["cli-wrapper/package.json"],
        message:
          "chore(cli-release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
  ],
};

const target = (process.env.RELEASE_TARGET || "").trim().toLowerCase();

const selectedConfig =
  target === "sdk" ? sdkConfig : target === "mcp" ? mcpConfig : cliConfig;

export default selectedConfig;
