package offerintelligence

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
)

func HashInputSnapshot(snapshot InputSnapshot) (string, error) {
	payload, err := json.Marshal(snapshot)
	if err != nil {
		return "", err
	}
	return hashBytes(payload), nil
}

func HashSettingsSnapshot(snapshot SettingsSnapshot) (string, error) {
	payload, err := json.Marshal(snapshot)
	if err != nil {
		return "", err
	}
	return hashBytes(payload), nil
}

func hashBytes(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}
