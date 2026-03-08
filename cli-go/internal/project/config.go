package project

import (
	"encoding/json"
	"fmt"
	"os"
)

type Config struct {
	ProjectId          string            `json:"projectId"`
	DefaultEnvironment string            `json:"defaultEnvironment,omitempty"`
	EnvironmentFiles   map[string]string `json:"environmentFiles,omitempty"`
}

func ReadConfig() (Config, error) {
	data, err := os.ReadFile("envault.json")
	if os.IsNotExist(err) {
		return Config{}, nil
	}
	if err != nil {
		return Config{}, err
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return Config{}, err
	}

	return config, nil
}

// WriteConfig writes config atomically: it writes to a temp file first, then
// renames it over the target so that a crash or Ctrl+C mid-write never leaves
// envault.json in a partially-written state.
func WriteConfig(config Config) error {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	tmp, err := os.CreateTemp(".", ".envault-config-*.tmp")
	if err != nil {
		// Fallback for systems where CreateTemp fails (e.g. read-only FS in tests).
		return os.WriteFile("envault.json", data, 0644)
	}
	tmpPath := tmp.Name()

	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		_ = os.Remove(tmpPath)
		return fmt.Errorf("writing config: %w", err)
	}
	if err := tmp.Close(); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("closing temp config: %w", err)
	}
	_ = os.Chmod(tmpPath, 0644)
	if err := os.Rename(tmpPath, "envault.json"); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("finalizing config: %w", err)
	}
	return nil
}

func GetProjectId() (string, error) {
	config, err := ReadConfig()
	if err != nil {
		return "", err
	}

	return config.ProjectId, nil
}

func GetDefaultEnvironment() (string, error) {
	config, err := ReadConfig()
	if err != nil {
		return "", err
	}

	return config.DefaultEnvironment, nil
}
