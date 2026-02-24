package update

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/fatih/color"
	"golang.org/x/mod/semver"
)

const (
	repoUrl     = "https://api.github.com/repos/DinanathDash/Envault/releases/latest"
	ttlDuration = 12 * time.Hour
	cacheFile   = "update_cache.json"
)

type CacheData struct {
	LatestVersion string    `json:"latest_version"`
	LastChecked   time.Time `json:"last_checked"`
}

// PerformBackgroundCheck spawns a background process of the CLI itself to
// perform the update check without blocking the main execution.
func PerformBackgroundCheck() {
	exe, err := os.Executable()
	if err != nil {
		return
	}
	
	cmd := exec.Command(exe, "__update_check")
	_ = cmd.Start()
	// We don't wait for it to finish, just let it run entirely in the background
}

// FetchLatestAndCache performs the actual network request and cache writing.
// This should be called by the background process.
func FetchLatestAndCache() {
	resp, err := http.Get(repoUrl)
	if err != nil {
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return
	}

	var release struct {
		TagName string `json:"tag_name"`
	}

	if err := json.Unmarshal(body, &release); err != nil {
		return
	}

	saveCache(release.TagName)
}

// ShouldNotfiyIfUpdateAvailable checks if an update is available based on local cache
// and spawns a background check if the cache TTL has expired.
func ShouldNotifyIfUpdateAvailable(currentVersion string) {
	cache, err := readCache()
	if err != nil || time.Since(cache.LastChecked) > ttlDuration {
		// Cache expired or missing, spawn background process to update it
		PerformBackgroundCheck()
		if err != nil {
			return // Nothing to show yet, cache is missing or corrupt
		}
	}

	// Compare current version with cached latest version
	latest := cache.LatestVersion
	if !strings.HasPrefix(latest, "v") {
		latest = "v" + latest
	}
	
	currentSemver := currentVersion
	if !strings.HasPrefix(currentSemver, "v") && currentSemver != "dev" {
		currentSemver = "v" + currentSemver
	}

	if currentSemver == "dev" {
		currentSemver = "v0.0.0" // Treat dev as version 0 for semver
	}

	if semver.IsValid(latest) && semver.IsValid(currentSemver) && semver.Compare(latest, currentSemver) > 0 {
		printUpdateWarning(currentVersion, latest)
	}
}

func getCachePath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	
	configDir := filepath.Join(home, ".envault")
	if _, err := os.Stat(configDir); os.IsNotExist(err) {
		_ = os.Mkdir(configDir, 0700)
	}
	
	return filepath.Join(configDir, cacheFile), nil
}

func readCache() (*CacheData, error) {
	path, err := getCachePath()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cache CacheData
	if err := json.Unmarshal(data, &cache); err != nil {
		return nil, err
	}

	return &cache, nil
}

func saveCache(version string) {
	path, err := getCachePath()
	if err != nil {
		return
	}

	cache := CacheData{
		LatestVersion: version,
		LastChecked:   time.Now(),
	}

	data, err := json.Marshal(cache)
	if err != nil {
		return
	}

	_ = os.WriteFile(path, data, 0644)
}

func printUpdateWarning(current, latest string) {
	updateCmd := getUpdateCommand()
	warningMsg := fmt.Sprintf("\n  Update available: %s -> %s\n  Run '%s' to update.\n", current, latest, updateCmd)
	
	// Print a nicely formatted warning to stderr
	fmt.Fprintln(os.Stderr, color.YellowString(warningMsg))
}

func getUpdateCommand() string {
	exe, err := os.Executable()
	if err != nil {
		return getUniversalCommand()
	}

	path := filepath.ToSlash(exe) // Use forward slashes for easier substring matching

	// Check package managers
	if strings.Contains(path, "npx") || strings.Contains(path, ".npm") {
		return "npm install -g @dinanathdash/envault"
	}
	if strings.Contains(path, "pnpm") {
		return "pnpm add -g @dinanathdash/envault"
	}
	if strings.Contains(path, "yarn") {
		return "yarn global add @dinanathdash/envault"
	}
	if strings.Contains(path, "bun") {
		return "bun add -g @dinanathdash/envault"
	}
	if strings.Contains(path, "brew") || strings.Contains(path, "Cellar") || strings.Contains(path, "linuxbrew") {
		return "brew upgrade envault"
	}
	if strings.Contains(path, "/go/bin/") || strings.Contains(path, "GOPATH") {
		return "go install github.com/DinanathDash/Envault/cli-go@latest"
	}

	return getUniversalCommand()
}

func getUniversalCommand() string {
	return "curl -fsSL https://raw.githubusercontent.com/DinanathDash/Envault/main/install.sh | sh"
}
