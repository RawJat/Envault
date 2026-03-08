package project

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// chdir changes to dir for the duration of the test, restoring the original
// working directory via t.Cleanup.
func chdir(t *testing.T, dir string) {
	t.Helper()
	orig, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatalf("chdir %s: %v", dir, err)
	}
	t.Cleanup(func() { _ = os.Chdir(orig) })
}

func TestWriteConfig_RoundTrip(t *testing.T) {
	tmp := t.TempDir()
	chdir(t, tmp)

	cfg := Config{
		ProjectId:          "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
		DefaultEnvironment: "production",
		EnvironmentFiles:   map[string]string{"production": ".env.production"},
	}

	if err := WriteConfig(cfg); err != nil {
		t.Fatalf("WriteConfig: %v", err)
	}

	got, err := ReadConfig()
	if err != nil {
		t.Fatalf("ReadConfig: %v", err)
	}

	if got.ProjectId != cfg.ProjectId {
		t.Errorf("ProjectId: got %q, want %q", got.ProjectId, cfg.ProjectId)
	}
	if got.DefaultEnvironment != cfg.DefaultEnvironment {
		t.Errorf("DefaultEnvironment: got %q, want %q", got.DefaultEnvironment, cfg.DefaultEnvironment)
	}
	if got.EnvironmentFiles["production"] != ".env.production" {
		t.Errorf("EnvironmentFiles[production]: got %q, want .env.production", got.EnvironmentFiles["production"])
	}
}

func TestWriteConfig_Atomic_NoTemp(t *testing.T) {
	// After a successful WriteConfig call there must be no leftover temp file.
	tmp := t.TempDir()
	chdir(t, tmp)

	if err := WriteConfig(Config{ProjectId: "11111111-1111-4111-8111-111111111111"}); err != nil {
		t.Fatalf("WriteConfig: %v", err)
	}

	entries, _ := os.ReadDir(tmp)
	for _, e := range entries {
		if filepath.Ext(e.Name()) == ".tmp" {
			t.Errorf("leftover temp file after WriteConfig: %s", e.Name())
		}
	}
}

func TestWriteConfig_ValidJSON(t *testing.T) {
	tmp := t.TempDir()
	chdir(t, tmp)

	if err := WriteConfig(Config{ProjectId: "22222222-2222-4222-8222-222222222222"}); err != nil {
		t.Fatalf("WriteConfig: %v", err)
	}

	data, err := os.ReadFile("envault.json")
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}

	var m map[string]interface{}
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("envault.json is not valid JSON: %v\ncontent: %s", err, data)
	}
}

func TestWriteConfig_OverwritesExisting(t *testing.T) {
	tmp := t.TempDir()
	chdir(t, tmp)

	if err := WriteConfig(Config{ProjectId: "first-id"}); err != nil {
		t.Fatalf("first WriteConfig: %v", err)
	}
	if err := WriteConfig(Config{ProjectId: "second-id"}); err != nil {
		t.Fatalf("second WriteConfig: %v", err)
	}

	got, err := ReadConfig()
	if err != nil {
		t.Fatalf("ReadConfig: %v", err)
	}
	if got.ProjectId != "second-id" {
		t.Errorf("expected second-id, got %q", got.ProjectId)
	}
}

func TestReadConfig_NotExist(t *testing.T) {
	tmp := t.TempDir()
	chdir(t, tmp)

	cfg, err := ReadConfig()
	if err != nil {
		t.Fatalf("ReadConfig on missing file should not error: %v", err)
	}
	if cfg.ProjectId != "" {
		t.Errorf("expected empty config, got %+v", cfg)
	}
}

func TestWriteConfig_FilePermissions(t *testing.T) {
	tmp := t.TempDir()
	chdir(t, tmp)

	if err := WriteConfig(Config{ProjectId: "33333333-3333-4333-8333-333333333333"}); err != nil {
		t.Fatalf("WriteConfig: %v", err)
	}

	info, err := os.Stat("envault.json")
	if err != nil {
		t.Fatalf("stat envault.json: %v", err)
	}

	mode := info.Mode().Perm()
	// Should be at most 0644 (owner rw, group r, world r)
	if mode&0111 != 0 {
		t.Errorf("envault.json should not be executable, got mode %o", mode)
	}
}
