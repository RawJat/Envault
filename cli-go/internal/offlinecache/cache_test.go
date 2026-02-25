package offlinecache

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/zalando/go-keyring"
)

func setupTestEnv(t *testing.T) {
	t.Helper()

	tempHome := t.TempDir()
	userHomeDir = func() (string, error) {
		return tempHome, nil
	}

	store := map[string]string{}
	keyringGet = func(service, user string) (string, error) {
		value, ok := store[service+":"+user]
		if !ok {
			return "", keyring.ErrNotFound
		}
		return value, nil
	}
	keyringSet = func(service, user, password string) error {
		store[service+":"+user] = password
		return nil
	}

	t.Cleanup(func() {
		userHomeDir = os.UserHomeDir
		keyringGet = defaultKeyringGet
		keyringSet = defaultKeyringSet
	})
}

var (
	defaultKeyringGet = keyringGet
	defaultKeyringSet = keyringSet
)

func TestSaveAndLoadRoundTrip(t *testing.T) {
	setupTestEnv(t)

	projectID := "11111111-1111-4111-8111-111111111111"
	env := "development"
	original := []Secret{
		{Key: "API_URL", Value: "https://example.com"},
		{Key: "TOKEN", Value: "secret"},
	}

	if err := Save(projectID, env, original); err != nil {
		t.Fatalf("save failed: %v", err)
	}

	loaded, cachedAt, err := Load(projectID, env)
	if err != nil {
		t.Fatalf("load failed: %v", err)
	}

	if cachedAt.IsZero() {
		t.Fatalf("expected cached_at to be set")
	}

	if len(loaded) != len(original) {
		t.Fatalf("unexpected secret count: got %d want %d", len(loaded), len(original))
	}

	for i := range original {
		if loaded[i] != original[i] {
			t.Fatalf("secret mismatch at %d: got %+v want %+v", i, loaded[i], original[i])
		}
	}
}

func TestLoadCacheMissForWrongEnvironment(t *testing.T) {
	setupTestEnv(t)

	projectID := "11111111-1111-4111-8111-111111111111"
	if err := Save(projectID, "development", []Secret{{Key: "A", Value: "1"}}); err != nil {
		t.Fatalf("save failed: %v", err)
	}

	_, _, err := Load(projectID, "preview")
	if !errors.Is(err, ErrCacheMiss) {
		t.Fatalf("expected cache miss, got %v", err)
	}
}

func TestCacheFileIsEncryptedEnvelope(t *testing.T) {
	setupTestEnv(t)

	projectID := "11111111-1111-4111-8111-111111111111"
	if err := Save(projectID, "development", []Secret{{Key: "PLAIN", Value: "VISIBLE"}}); err != nil {
		t.Fatalf("save failed: %v", err)
	}

	home, _ := userHomeDir()
	path := filepath.Join(home, ".envault", cacheFileName)
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read cache file failed: %v", err)
	}

	text := string(raw)
	if strings.Contains(text, "VISIBLE") || strings.Contains(text, "PLAIN") {
		t.Fatalf("cache file should not contain plaintext secrets")
	}
}

func TestLoadCorruptedCacheFails(t *testing.T) {
	setupTestEnv(t)

	home, _ := userHomeDir()
	dir := filepath.Join(home, ".envault")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatalf("mkdir failed: %v", err)
	}

	path := filepath.Join(dir, cacheFileName)
	if err := os.WriteFile(path, []byte("not-encrypted-json"), 0o600); err != nil {
		t.Fatalf("write failed: %v", err)
	}

	_, _, err := Load("11111111-1111-4111-8111-111111111111", "development")
	if err == nil {
		t.Fatalf("expected error for corrupted cache")
	}
}
