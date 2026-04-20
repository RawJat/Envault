package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
)

// EncryptAESGCM encrypts a plaintext string using AES-256-GCM and the given hex-encoded DEK.
// The payload is structured exactly as base64(IV + Ciphertext + AuthTag), matching the TypeScript backend.
func EncryptAESGCM(plaintext string, hexKey string) (string, error) {
	key, err := hex.DecodeString(hexKey)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	const ivLength = 16
	iv := make([]byte, ivLength)
	if _, err := rand.Read(iv); err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCMWithNonceSize(block, ivLength)
	if err != nil {
		return "", err
	}

	// Seal appends the authentication tag to the ciphertext.
	sealed := aesGCM.Seal(nil, iv, []byte(plaintext), nil)

	combined := append(iv, sealed...)
	return base64.StdEncoding.EncodeToString(combined), nil
}

// DecryptAESGCM decrypts a base64 encoded payload using AES-256-GCM and the given hex-encoded DEK.
// The payload is structured as base64(IV + Ciphertext + AuthTag), where IV is 16 bytes and AuthTag is 16 bytes.
func DecryptAESGCM(payload string, hexKey string) (string, error) {
	key, err := hex.DecodeString(hexKey)
	if err != nil {
		return "", err
	}

	combined, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return "", err
	}

	const ivLength = 16
	const authTagLength = 16

	if len(combined) < ivLength+authTagLength {
		return "", errors.New("payload too short")
	}

	iv := combined[:ivLength]
	ciphertextWithTag := combined[ivLength:]

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCMWithNonceSize(block, ivLength)
	if err != nil {
		return "", err
	}

	plaintext, err := aesGCM.Open(nil, iv, ciphertextWithTag, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
