package cmd

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"

	"github.com/AlecAivazis/survey/v2"
	"github.com/DinanathDash/Envault/cli-go/internal/api"
	"github.com/DinanathDash/Envault/cli-go/internal/ui"
	"github.com/spf13/cobra"
)

type Secret struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type SecretsResponse struct {
	Secrets []Secret `json:"secrets"`
}

type ProjectResponse struct {
	Projects []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"projects"`
}

var forcePull bool
var projectFlag string
var fileFlag string

var pullCmd = &cobra.Command{
	Use:   "pull",
	Short: "Fetch secrets and write to .env",
	Run: func(cmd *cobra.Command, args []string) {
		// 1. Get Project ID
		projectId := ensureProjectID()

		if projectId == "" {
			fmt.Println(ui.ColorYellow("No project linked."))
			projectId = selectProjectAndPersistOrExit()
			fmt.Println(ui.ColorGreen(fmt.Sprintf("✔ Project linked! (ID: %s)\n", projectId)))
		}
		if !isValidProjectID(projectId) {
			fmt.Println(ui.ColorRed("Invalid project ID. Expected a UUID."))
			os.Exit(1)
		}
		targetEnv := resolveTargetEnvironment()
		targetFile := resolveEnvFile(targetEnv, fileFlag)

		// 2. Check for existing .env
		if _, err := os.Stat(targetFile); err == nil && !forcePull {
			// Fetch project name for better warning
			client := api.NewClient()
			projectName := "Envault"

			// Try to get project name (best effort)
			projectsBytes, err := client.Get("/projects")
			if err == nil {
				var pResp ProjectResponse
				// API might return {data: []} or just [] or {projects: []} depending on endpoint
				// The deploy.js says: data.projects || data.data || []
				// Let's try flexible parsing if needed, but for now struct matches common pattern
				if err := json.Unmarshal(projectsBytes, &pResp); err == nil {
					for _, p := range pResp.Projects {
						if p.ID == projectId {
							projectName = p.Name
							break
						}
					}
				}
			}

			appUrl := os.Getenv("NEXT_PUBLIC_APP_URL")
			if appUrl == "" {
				appUrl = "https://envault.tech"
			}

			warningMsg := fmt.Sprintf(
				"%s\n\n%s%s%s%s%s\n\n%s%s%s%s\n\n%s\n%s",
				ui.ColorRed("WARNING: POTENTIAL DATA LOSS"),
				"You are about to ", ui.ColorRed("OVERWRITE"), " your local ", ui.ColorYellow(targetFile), " file.",
				"Any local changes not synced to ", ui.ColorCyan(projectName), " will be ", ui.ColorRed("PERMANENTLY LOST."),
				ui.ColorDim("We recommend checking the dashboard for differences:"),
				ui.ColorCyan(fmt.Sprintf("%s/project/%s", appUrl, projectId)),
			)

			fmt.Println(ui.WarningBoxStyle.Render(warningMsg))

			confirm := false
			prompt := &survey.Confirm{
				Message: fmt.Sprintf("Are you sure you want to overwrite %s for %s?", targetFile, targetEnv),
			}
			if err := survey.AskOne(prompt, &confirm); err != nil {
				fmt.Println(ui.ColorYellow("\nOperation cancelled."))
				return
			}

			if !confirm {
				fmt.Println(ui.ColorYellow("Operation cancelled."))
				return
			}
		}

		// 3. Fetch Secrets
		client := api.NewClient()
		s := ui.NewSpinner(fmt.Sprintf("Fetching secrets (%s)...", targetEnv))
		s.Start()

		path := fmt.Sprintf("/projects/%s/secrets?environment=%s", projectId, url.QueryEscape(targetEnv))
		respBytes, err := client.Get(path)
		if err != nil {
			s.Stop()
				// Check specifically for the ACCESS_REQUIRED JIT error
				var apiErr *api.APIError
				if errors.As(err, &apiErr) && apiErr.StatusCode == 403 {
					var errBody struct {
						Error   string `json:"error"`
						Message string `json:"message"`
					}
					if jsonErr := json.Unmarshal([]byte(apiErr.Body), &errBody); jsonErr == nil && errBody.Error == "ACCESS_REQUIRED" {
						handleAccessRequired(client, projectId)
						return
					}
				}
		}

		var secretsResp SecretsResponse
		if err := json.Unmarshal(respBytes, &secretsResp); err != nil {
			s.Stop()
			fmt.Println(ui.ColorRed(fmt.Sprintf("Error parsing response: %v", err)))
			os.Exit(1)
		}

		if len(secretsResp.Secrets) == 0 {
			s.Stop()
			// Info style?
			// ora.info check... Node uses spinner.info
			// ui package doesn't have Info/Warn specific spinners.
			// Just print text.
			fmt.Println(ui.ColorBlue("ℹ No secrets found for this project."))
			return
		}

		// 4. Write to .env
		f, err := os.Create(targetFile)
		if err != nil {
			s.Stop()
			fmt.Println(ui.ColorRed(fmt.Sprintf("Error creating %s: %v", targetFile, err)))
			os.Exit(1)
		}
		defer f.Close()

		for _, secret := range secretsResp.Secrets {
			_, err := f.WriteString(fmt.Sprintf("%s=%s\n", secret.Key, secret.Value))
			if err != nil {
				s.Stop()
				fmt.Println(ui.ColorRed(fmt.Sprintf("Error writing to %s: %v", targetFile, err)))
				os.Exit(1)
			}
		}

		s.Stop()
		fmt.Println(ui.ColorGreen(fmt.Sprintf("✔ Pulled %d secrets from %s into %s.", len(secretsResp.Secrets), targetEnv, targetFile)))
	},
}

// handleAccessRequired prompts the user to request access to the project
// when the server returns ACCESS_REQUIRED (no existing membership + GitHub check failed/skipped).
func handleAccessRequired(client *api.Client, projectId string) {
	fmt.Println(ui.ColorYellow("\n⚠  You do not have access to this project."))

	confirm := false
	prompt := &survey.Confirm{
		Message: "Would you like to send an access request to the project owner?",
		Default: false,
	}
	if err := survey.AskOne(prompt, &confirm); err != nil || !confirm {
		fmt.Println(ui.ColorYellow("Access request cancelled."))
		return
	}

	s := ui.NewSpinner("Sending access request...")
	s.Start()

	path := fmt.Sprintf("/projects/%s/request-access", projectId)
	_, err := client.Post(path, nil)
	s.Stop()

	if err != nil {
		var apiErr *api.APIError
		if errors.As(err, &apiErr) && apiErr.StatusCode == 409 {
			fmt.Println(ui.ColorBlue("ℹ  You already have a pending access request for this project."))
			return
		}
		fmt.Println(ui.ColorRed(fmt.Sprintf("Failed to send access request: %v", err)))
		return
	}

	fmt.Println(ui.ColorGreen("✔ Access request sent! The project owner will be notified via email and in-app notification."))
}

func init() {
	rootCmd.AddCommand(pullCmd)
	pullCmd.Flags().BoolVarP(&forcePull, "force", "f", false, "Overwrite .env without confirmation")
	pullCmd.Flags().StringVarP(&projectFlag, "project", "p", "", "Project ID")
	pullCmd.Flags().StringVar(&fileFlag, "file", "", "Local .env file path override")
}
