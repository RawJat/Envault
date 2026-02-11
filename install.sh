#!/bin/sh

# Envault CLI - Universal Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/DinanathDash/Envault/main/install.sh | sh

set -e

REPO="DinanathDash/Envault"
BINARY_NAME="envault"
INSTALL_DIR="/usr/local/bin"

# Detect OS
OS="$(uname -s)"
case "$OS" in
    Linux)  OS_NAME="Linux" ;;
    Darwin) OS_NAME="Darwin" ;;
    *)      echo "Unsupported OS: $OS"; exit 1 ;;
esac

# Detect Architecture
ARCH="$(uname -m)"
case "$ARCH" in
    x86_64) ARCH_NAME="x86_64" ;;
    arm64|aarch64) ARCH_NAME="arm64" ;;
    *)      echo "Unsupported Architecture: $ARCH"; exit 1 ;;
esac

# Fetch latest version from GitHub API
VERSION=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$VERSION" ]; then
    echo "Could not fetch latest version. Please check your internet connection."
    exit 1
fi

FILE_NAME="envault_${OS_NAME}_${ARCH_NAME}.tar.gz"
URL="https://github.com/$REPO/releases/download/$VERSION/$FILE_NAME"

echo "Downloading Envault CLI $VERSION for $OS_NAME $ARCH_NAME..."

# Create temp directory
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

# Download and extract
curl -sSL "$URL" -o "$FILE_NAME"
tar -xzf "$FILE_NAME"

# Install binary
echo "Installing to $INSTALL_DIR/$BINARY_NAME..."
if [ -w "$INSTALL_DIR" ]; then
    mv "$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"
else
    echo "Permission denied. Attempting with sudo..."
    sudo mv "$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"
fi

# Cleanup
rm -rf "$TMP_DIR"

echo "Envault CLI installed successfully!"
echo "Run 'envault --version' to verify."
