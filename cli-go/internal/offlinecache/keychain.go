package offlinecache

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"

	"github.com/zalando/go-keyring"
)

const (
	keychainService = "envault"
	keychainAccount = "offline-cache-master-key"
	masterKeySize   = 32
)

var (
	keyringGet = keyring.Get
	keyringSet = keyring.Set
)

func getOrCreateMasterKey() ([]byte, error) {
	encoded, err := keyringGet(keychainService, keychainAccount)
	if err == nil && encoded != "" {
		key, decodeErr := base64.StdEncoding.DecodeString(encoded)
		if decodeErr != nil {
			return nil, fmt.Errorf("failed to decode cache key: %w", decodeErr)
		}
		if len(key) != masterKeySize {
			return nil, fmt.Errorf("invalid cache key length: %d", len(key))
		}
		return key, nil
	}

	if err != nil && !errors.Is(err, keyring.ErrNotFound) {
		return nil, fmt.Errorf("failed to read cache key from keychain: %w", err)
	}

	key := make([]byte, masterKeySize)
	if _, readErr := rand.Read(key); readErr != nil {
		return nil, fmt.Errorf("failed to generate cache key: %w", readErr)
	}

	if setErr := keyringSet(keychainService, keychainAccount, base64.StdEncoding.EncodeToString(key)); setErr != nil {
		return nil, fmt.Errorf("failed to store cache key in keychain: %w", setErr)
	}

	return key, nil
}
