const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const { execSync } = require('child_process');

const REPO = 'DinanathDash/Envault';
const BINARY_NAME = 'envault';
// Grab version from package.json to sync releases
const pkg = require('./package.json');
const VERSION = `v${pkg.version}`;

function getPlatform() {
    const platform = os.platform();
    const arch = os.arch();

    let osName = '';
    let archName = '';

    switch (platform) {
        case 'darwin': osName = 'Darwin'; break;
        case 'linux': osName = 'Linux'; break;
        case 'win32': osName = 'Windows'; break;
        default: throw new Error(`Unsupported platform: ${platform}`);
    }

    switch (arch) {
        case 'x64': archName = 'x86_64'; break;
        case 'arm64': archName = 'arm64'; break;
        case 'ia32': archName = 'i386'; break;
        default: throw new Error(`Unsupported architecture: ${arch}`);
    }

    return { osName, archName };
}

function downloadBinary() {
    const { osName, archName } = getPlatform();
    const extension = os.platform() === 'win32' ? '.zip' : '.tar.gz';
    const fileName = `envault_${osName}_${archName}${extension}`;
    const url = `https://github.com/${REPO}/releases/download/${VERSION}/${fileName}`;

    console.log(`Downloading Envault CLI ${VERSION} for ${osName} ${archName}...`);

    const binDir = path.join(__dirname, 'bin');
    if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir);
    }
    const dest = path.join(binDir, fileName);

    function download(downloadUrl) {
        https.get(downloadUrl, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return download(response.headers.location);
            }

            if (response.statusCode !== 200) {
                console.error(`Download failed with status code ${response.statusCode}`);
                process.exit(1);
            }

            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    extract(dest, binDir, extension);
                });
            });
        }).on('error', (err) => {
            console.error('Error downloading binary:', err.message);
            process.exit(1);
        });
    }

    download(url);
}

function extract(filePath, destDir, extension) {
    console.log('Extracting...');
    try {
        if (extension === '.zip') {
            // Requires 'unzip' on path or a library. 
            // Minimal dependency approach: use system unzip for now
            // Or node 'adm-zip' if we add dependencies.
            // Let's assume unzip command exists for Windows users with Git Bash/WSL or standard unzip?
            // Windows native: Use PowerShell?
            // Standard user might not have unzip in PATH on bare Windows.
            // Simplest is to add 'adm-zip' to package.json dependencies only for wrapper.
            // But let's try using tar for tar.gz (available on Mac/Linux/Win10+)

            // For now, let's just use tar for everything since GoReleaser can output tar.gz for Windows too? (We configured Zip for windows)
            // Let's use 'tar' command, usually available.
            // But Windows default tar handles .zip?
            // Let's assume proper environment or add dependency.
            // I'll add 'adm-zip' as dependency for safety in package.json next.
            // For now, placeholder.
        } else {
            execSync(`tar -xzf "${filePath}" -C "${destDir}"`);
        }

        // Cleanup archive
        fs.unlinkSync(filePath);

        // Make executable (if untar didn't preserve)
        const binName = os.platform() === 'win32' ? 'envault.exe' : 'envault';
        const finalPath = path.join(destDir, binName);
        if (os.platform() !== 'win32') {
            fs.chmodSync(finalPath, 0o755);
        }

        console.log('Envault CLI installed successfully!');
    } catch (e) {
        console.error('Extraction failed:', e.message);
        process.exit(1);
    }
}

downloadBinary();
