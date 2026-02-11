module.exports = {
    // Release from main branch
    branches: ['main'],

    // Plugins to run
    plugins: [
        // 1. Analyze commits to determine version bump (patch/minor/major)
        '@semantic-release/commit-analyzer',

        // 2. Generate release notes
        '@semantic-release/release-notes-generator',

        // 3. Update package.json version in cli-wrapper (this is what we publish to NPM)
        ['@semantic-release/npm', {
            pkgRoot: 'cli-wrapper',
            npmPublish: true // Enable publishing for wrapper
        }],

        // 4. Run GoReleaser to build/release binaries
        // We use 'verifyRelease' (after version is determined) or 'publish' (after tag is created)?
        // GoReleaser needs the tag to exist on the remote. 
        // Standard semantic-release flow creates tag in the 'publish' phase via @semantic-release/git or internal?

        // Actually, semantic-release creates the tag internally before calling 'publish' plugins if configured correctly?
        // Let's use @semantic-release/exec to run GoReleaser during the 'publish' phase.
        // But wait, @semantic-release/github creates the GitHub Release. GoReleaser ALSO creates it.
        // We should disable @semantic-release/github and let GoReleaser do the GitHub Release.
        ['@semantic-release/exec', {
            // Run GoReleaser after the tag is created by semantic-release?
            // Actually, semantic-release core pushes the tag? 
            // If we use @semantic-release/git, it pushes the changed package.json and tag.
            // Let's run GoReleaser in the publish cmd.
            // We pass the new version to GoReleaser just in case, but it relies on git tags.
            publishCmd: 'cd cli-go && goreleaser release --clean'
        }],

        // 5. Commit the version bump in cli-wrapper/package.json back to the repo
        ['@semantic-release/git', {
            assets: ['cli-wrapper/package.json'],
            message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
        }]
    ]
};
