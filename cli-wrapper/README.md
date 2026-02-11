# @dinanathdash/envault (Go Wrapper)

This is a lightweight NPM wrapper for the **Envault Go CLI**. It automatically downloads the correct Go binary for your platform during installation.

## Installation

```bash
npm install -g @dinanathdash/envault
```

## Usage

The usage is identical to the original Node.js CLI:

```bash
envault login
envault pull
envault deploy
```

## How it works

When you install this package, a `postinstall` script runs to:
1. Detect your Operating System and Architecture (Mac, Linux, Windows; x86_64, arm64).
2. Download the versioned binary from the GitHub Releases.
3. Place it in the `bin/` directory and ensure it is executable.

This allows you to keep using your existing NPM-based workflows while benefiting from the speed and reliability of the Go implementation.

## License

MIT © [Envault](https://envault.tech)
