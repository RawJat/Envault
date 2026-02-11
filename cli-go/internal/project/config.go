package project

import (
	"encoding/json"
	"os"
)

type Config struct {
	ProjectId string `json:"projectId"`
}

func GetProjectId() (string, error) {
	data, err := os.ReadFile("envault.json")
	if os.IsNotExist(err) {
		return "", nil
	}
	if err != nil {
		return "", err
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return "", err
	}

	return config.ProjectId, nil
}
