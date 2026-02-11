package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/AlecAivazis/survey/v2"
	"github.com/DinanathDash/Envault/cli-go/internal/api"
	"github.com/DinanathDash/Envault/cli-go/internal/project"
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

var pullCmd = &cobra.Command{
	Use:   "pull",
	Short: "Fetch secrets and write to .env",
	Run: func(cmd *cobra.Command, args []string) {
		// 1. Get Project ID
		projectId := projectFlag
		if projectId == "" {
			var err error
			projectId, err = project.GetProjectId()
			if err != nil {
				// Silent fail/continue?
			}
		}

		if projectId == "" {
			fmt.Println(ui.ColorYellow("No project linked."))
			// Auto-Select project
			var err error
			projectId, err = project.SelectProject()
			if err != nil {
				if err == project.ErrUserCancelled {
					fmt.Println(ui.ColorYellow("\nOperation cancelled."))
					os.Exit(0)
				}
				fmt.Printf("Error selecting project: %v\n", err)
				os.Exit(1)
			}
			if projectId == "" {
				fmt.Println("Operation cancelled.")
				os.Exit(0)
			}
			
			// Save selection
			config := project.Config{ProjectId: projectId}
			data, _ := json.MarshalIndent(config, "", "  ")
			_ = os.WriteFile("envault.json", data, 0644)
			fmt.Println(ui.ColorGreen(fmt.Sprintf("✔ Project linked! (ID: %s)\n", projectId)))
		}

		// 2. Check for existing .env
		if _, err := os.Stat(".env"); err == nil && !forcePull {
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
				"%s\n\n%s%s%s%s\n\n%s%s%s\n\n%s\n%s",
				ui.ColorRed("WARNING: POTENTIAL DATA LOSS"),
				"You are about to ", ui.ColorRed("OVERWRITE"), " your local ", ui.ColorYellow(".env"), " file.",
				"Any local changes not synced to ", ui.ColorCyan(projectName), " will be ", ui.ColorRed("PERMANENTLY LOST."),
				ui.ColorDim("We recommend checking the dashboard for differences:"),
				ui.ColorCyan(fmt.Sprintf("%s/project/%s", appUrl, projectId)),
			)

			fmt.Println(ui.WarningBoxStyle.Render(warningMsg))

			confirm := false
			prompt := &survey.Confirm{
				Message: "Are you sure you want to overwrite your local .env file?",
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
		s := ui.NewSpinner("Fetching secrets...")
		s.Start()

		respBytes, err := client.Get(fmt.Sprintf("/projects/%s/secrets", projectId))
		if err != nil {
			s.Stop()
			// Check for specific error? 
			fmt.Println(ui.ColorRed("Pull failed."))
			fmt.Println(ui.ColorRed(fmt.Sprintf("Error: %v", err)))
			os.Exit(1)
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
		f, err := os.Create(".env")
		if err != nil {
			s.Stop()
			fmt.Println(ui.ColorRed(fmt.Sprintf("Error creating .env file: %v", err)))
			os.Exit(1)
		}
		defer f.Close()

		for _, secret := range secretsResp.Secrets {
			_, err := f.WriteString(fmt.Sprintf("%s=%s\n", secret.Key, secret.Value))
			if err != nil {
				s.Stop()
				fmt.Println(ui.ColorRed(fmt.Sprintf("Error writing to .env: %v", err)))
				os.Exit(1)
			}
		}
		
		s.Stop()
		fmt.Println(ui.ColorGreen(fmt.Sprintf("✔ Pulled %d secrets from project.", len(secretsResp.Secrets))))
	},
}

func init() {
	rootCmd.AddCommand(pullCmd)
	pullCmd.Flags().BoolVarP(&forcePull, "force", "f", false, "Overwrite .env without confirmation")
	pullCmd.Flags().StringVarP(&projectFlag, "project", "p", "", "Project ID")
}
