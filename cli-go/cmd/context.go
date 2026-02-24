package cmd

import (
	"errors"
	"fmt"
	"os"
	"regexp"
	"sort"
	"strings"

	"github.com/DinanathDash/Envault/cli-go/internal/api"
	"github.com/DinanathDash/Envault/cli-go/internal/project"
)

const defaultEnvName = "development"

var uuidPattern = regexp.MustCompile(
	`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`,
)

func resolveTargetEnvironment() string {
	env := strings.TrimSpace(envFlag)
	if env != "" {
		return env
	}

	cfg, err := project.ReadConfig()
	if err == nil && strings.TrimSpace(cfg.DefaultEnvironment) != "" {
		return strings.TrimSpace(cfg.DefaultEnvironment)
	}

	return defaultEnvName
}

func resolveEnvFile(targetEnv string, fileOverride string) string {
	if strings.TrimSpace(fileOverride) != "" {
		return fileOverride
	}

	cfg, err := project.ReadConfig()
	if err == nil && cfg.EnvironmentFiles != nil {
		if mapped := strings.TrimSpace(cfg.EnvironmentFiles[targetEnv]); mapped != "" {
			return mapped
		}
	}

	if auto := autoDetectEnvFile(targetEnv); auto != "" {
		return auto
	}

	return ".env"
}

func autoDetectEnvFile(targetEnv string) string {
	entries, err := os.ReadDir(".")
	if err != nil {
		return ""
	}

	candidates := make([]string, 0)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := strings.TrimSpace(entry.Name())
		if !isValidEnvCandidate(name) {
			continue
		}
		candidates = append(candidates, name)
	}

	if len(candidates) == 0 {
		return ""
	}

	sort.Strings(candidates)
	env := strings.ToLower(strings.TrimSpace(targetEnv))
	best := ""
	bestScore := -1
	for _, c := range candidates {
		score := envFileCandidateScore(c, env)
		if score > bestScore {
			bestScore = score
			best = c
		}
	}
	return best
}

func isValidEnvCandidate(name string) bool {
	// Accept only .env or .env.* files, not files like .envrc
	if name != ".env" && !strings.HasPrefix(name, ".env.") {
		return false
	}

	lower := strings.ToLower(name)
	excludedTokens := []string{
		"example",
		"sample",
		"template",
	}
	for _, token := range excludedTokens {
		if strings.Contains(lower, token) {
			return false
		}
	}

	return true
}

func envFileCandidateScore(name, env string) int {
	lower := strings.ToLower(strings.TrimSpace(name))
	if env != "" {
		if lower == fmt.Sprintf(".env.%s", env) {
			return 100
		}
		if lower == fmt.Sprintf(".env.%s.local", env) {
			return 95
		}
		if strings.HasPrefix(lower, fmt.Sprintf(".env.%s.", env)) {
			return 90
		}
	}
	if lower == ".env" {
		return 80
	}
	if lower == ".env.local" {
		return 70
	}
	if strings.HasPrefix(lower, ".env.") {
		return 50
	}
	return 0
}

func persistProjectSelection(projectID string) {
	cfg, _ := project.ReadConfig()
	cfg.ProjectId = projectID
	if strings.TrimSpace(cfg.DefaultEnvironment) == "" {
		cfg.DefaultEnvironment = defaultEnvName
	}
	if cfg.EnvironmentFiles == nil {
		cfg.EnvironmentFiles = map[string]string{}
	}
	_ = project.WriteConfig(cfg)
}

func classifyAPIError(err error) string {
	var apiErr *api.APIError
	if !errors.As(err, &apiErr) {
		return fmt.Sprintf("Error: %v", err)
	}

	body := strings.TrimSpace(apiErr.Body)
	if body == "" {
		body = httpStatusText(apiErr.StatusCode)
	}

	switch apiErr.StatusCode {
	case 401:
		return "Unauthorized (401): please run `envault login` again."
	case 403:
		return fmt.Sprintf("Forbidden (403): %s", body)
	case 404:
		return fmt.Sprintf("Not found (404): %s", body)
	default:
		return fmt.Sprintf("API error (%d): %s", apiErr.StatusCode, body)
	}
}

func ensureProjectID() string {
	projectID := projectFlag
	if projectID != "" {
		return projectID
	}

	id, err := project.GetProjectId()
	if err == nil && id != "" {
		return id
	}

	return ""
}

func isValidProjectID(projectID string) bool {
	projectID = strings.TrimSpace(projectID)
	if projectID == "" {
		return false
	}
	return uuidPattern.MatchString(projectID)
}

func selectProjectAndPersistOrExit() string {
	selected, err := project.SelectProject()
	if err != nil {
		if err == project.ErrUserCancelled {
			fmt.Println("\nOperation cancelled.")
			os.Exit(0)
		}
		fmt.Printf("Error selecting project: %v\n", err)
		os.Exit(1)
	}
	if selected == "" {
		fmt.Println("Operation cancelled.")
		os.Exit(0)
	}

	persistProjectSelection(selected)
	return selected
}

func httpStatusText(code int) string {
	switch code {
	case 400:
		return "bad request"
	case 401:
		return "unauthorized"
	case 403:
		return "forbidden"
	case 404:
		return "not found"
	case 409:
		return "conflict"
	case 500:
		return "internal server error"
	default:
		return "request failed"
	}
}
