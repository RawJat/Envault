package offlinecache

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var userHomeDir = os.UserHomeDir

func Save(projectID, environment string, secrets []Secret) error {
	entryKey, err := makeEntryKey(projectID, environment)
	if err != nil {
		return err
	}

	payload := cachePayload{Entries: map[string]cacheEntry{}}
	current, err := loadPayload()
	if err == nil {
		payload = current
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}

	payload.Entries[entryKey] = cacheEntry{
		Secrets:  cloneSecrets(secrets),
		CachedAt: time.Now().UTC(),
	}

	plaintext, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to encode cache payload: %w", err)
	}

	key, err := getOrCreateMasterKey()
	if err != nil {
		return err
	}

	encrypted, err := encryptPayload(plaintext, key)
	if err != nil {
		return err
	}

	path, err := cacheFilePath(true)
	if err != nil {
		return err
	}

	tempPath := path + ".tmp"
	if writeErr := os.WriteFile(tempPath, encrypted, 0600); writeErr != nil {
		return fmt.Errorf("failed to write temp cache file: %w", writeErr)
	}

	if renameErr := os.Rename(tempPath, path); renameErr != nil {
		_ = os.Remove(tempPath)
		return fmt.Errorf("failed to persist cache file: %w", renameErr)
	}

	return nil
}

func Load(projectID, environment string) ([]Secret, time.Time, error) {
	entryKey, err := makeEntryKey(projectID, environment)
	if err != nil {
		return nil, time.Time{}, err
	}

	payload, err := loadPayload()
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, time.Time{}, ErrCacheMiss
		}
		return nil, time.Time{}, err
	}

	entry, ok := payload.Entries[entryKey]
	if !ok {
		return nil, time.Time{}, ErrCacheMiss
	}

	return cloneSecrets(entry.Secrets), entry.CachedAt, nil
}

func loadPayload() (cachePayload, error) {
	path, err := cacheFilePath(false)
	if err != nil {
		return cachePayload{}, err
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		return cachePayload{}, err
	}

	key, err := getOrCreateMasterKey()
	if err != nil {
		return cachePayload{}, err
	}

	plaintext, err := decryptPayload(raw, key)
	if err != nil {
		return cachePayload{}, err
	}

	var payload cachePayload
	if err := json.Unmarshal(plaintext, &payload); err != nil {
		return cachePayload{}, fmt.Errorf("failed to parse cache payload: %w", err)
	}

	if payload.Entries == nil {
		payload.Entries = map[string]cacheEntry{}
	}
	return payload, nil
}

func cacheFilePath(createDir bool) (string, error) {
	home, err := userHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to resolve home directory: %w", err)
	}

	configDir := filepath.Join(home, ".envault")
	if createDir {
		if err := os.MkdirAll(configDir, 0700); err != nil {
			return "", fmt.Errorf("failed to create config directory: %w", err)
		}
	}

	return filepath.Join(configDir, cacheFileName), nil
}

func makeEntryKey(projectID, environment string) (string, error) {
	projectID = strings.TrimSpace(projectID)
	environment = strings.ToLower(strings.TrimSpace(environment))

	if projectID == "" {
		return "", errors.New("project ID is required")
	}
	if environment == "" {
		return "", errors.New("environment is required")
	}

	return projectID + ":" + environment, nil
}

func cloneSecrets(secrets []Secret) []Secret {
	if len(secrets) == 0 {
		return []Secret{}
	}

	cloned := make([]Secret, len(secrets))
	copy(cloned, secrets)
	return cloned
}
