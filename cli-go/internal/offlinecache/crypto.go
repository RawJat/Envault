package offlinecache

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
)

type encryptedEnvelope struct {
	Version    int    `json:"version"`
	Algorithm  string `json:"algorithm"`
	Nonce      string `json:"nonce"`
	Ciphertext string `json:"ciphertext"`
}

func encryptPayload(plaintext []byte, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create gcm: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nil, nonce, plaintext, nil)
	envelope := encryptedEnvelope{
		Version:    cacheVersion,
		Algorithm:  "AES-256-GCM",
		Nonce:      base64.StdEncoding.EncodeToString(nonce),
		Ciphertext: base64.StdEncoding.EncodeToString(ciphertext),
	}

	raw, err := json.Marshal(envelope)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal encrypted payload: %w", err)
	}
	return raw, nil
}

func decryptPayload(raw []byte, key []byte) ([]byte, error) {
	var envelope encryptedEnvelope
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return nil, fmt.Errorf("failed to parse encrypted payload: %w", err)
	}

	if envelope.Version != cacheVersion {
		return nil, fmt.Errorf("unsupported cache version: %d", envelope.Version)
	}

	if envelope.Algorithm != "AES-256-GCM" {
		return nil, fmt.Errorf("unsupported cache algorithm: %s", envelope.Algorithm)
	}

	nonce, err := base64.StdEncoding.DecodeString(envelope.Nonce)
	if err != nil {
		return nil, fmt.Errorf("invalid nonce encoding: %w", err)
	}

	ciphertext, err := base64.StdEncoding.DecodeString(envelope.Ciphertext)
	if err != nil {
		return nil, fmt.Errorf("invalid ciphertext encoding: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create gcm: %w", err)
	}
	if len(nonce) != gcm.NonceSize() {
		return nil, fmt.Errorf("invalid nonce length: %d", len(nonce))
	}

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt payload: %w", err)
	}

	return plaintext, nil
}
