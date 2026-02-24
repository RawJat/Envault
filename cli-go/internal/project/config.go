package project

import (
	"encoding/json"
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

func WriteConfig(config Config) error {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile("envault.json", data, 0644)
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
