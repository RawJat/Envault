package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/AlecAivazis/survey/v2"
	"github.com/DinanathDash/Envault/cli-go/internal/api"
	"github.com/DinanathDash/Envault/cli-go/internal/project"
	"github.com/DinanathDash/Envault/cli-go/internal/ui"
	"github.com/joho/godotenv"
	"github.com/spf13/cobra"
)

var forceDeploy bool
var dryRun bool

var deployCmd = &cobra.Command{
	Use:   "deploy",
	Short: "Push secrets from .env to Envault",
	Run: func(cmd *cobra.Command, args []string) {
		// 1. Get Project ID
		projectId := projectFlag
		if projectId == "" {
			var err error
			projectId, err = project.GetProjectId()
			if err != nil {
				// Silent fail
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

		// 2. Read .env manually to be lenient
		content, err := os.ReadFile(".env")
		if err != nil {
			fmt.Println(ui.ColorRed("Error reading .env file"))
			os.Exit(1)
		}

		// Filter invalid lines
		var validLines []string
		lines := strings.Split(string(content), "\n")
		for _, line := range lines {
			trimmed := strings.TrimSpace(line)
			if trimmed == "" {
				continue
			}
			// It's a comment
			if strings.HasPrefix(trimmed, "#") {
				continue 
			}
			// It has a key=value pair
			if strings.Contains(trimmed, "=") {
				validLines = append(validLines, line)
			}
		}

		envMap, err := godotenv.Unmarshal(strings.Join(validLines, "\n"))
		if err != nil {
			fmt.Println(ui.ColorRed("Error parsing .env file"))
			os.Exit(1)
		}

		if len(envMap) == 0 {
			fmt.Println(ui.ColorYellow("No secrets found in .env"))
			return
		}

		secrets := []Secret{}
		for k, v := range envMap {
			secrets = append(secrets, Secret{Key: k, Value: v})
		}

		if dryRun {
			fmt.Println(ui.ColorBlue(fmt.Sprintf("Dry Run: Would deploy %d secrets to project %s", len(secrets), projectId)))
			for _, s := range secrets {
				fmt.Printf("- %s\n", s.Key)
			}
			return
		}

		// 3. Confirmation
		if !forceDeploy {
			// Fetch project name for warning
			client := api.NewClient()
			projectName := "Envault"
			
			projectsBytes, err := client.Get("/projects")
			if err == nil {
				var pResp ProjectResponse
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
				ui.ColorRed("WARNING: OVERWRITING REMOTE SECRETS"),
				"You are about to ", ui.ColorRed("DEPLOY"), " local variables to your project: ",
				ui.ColorCyan(projectName),
				"Existing secrets in the project will be ", ui.ColorRed("OVERWRITTEN"), " by values in your .env.",
				ui.ColorDim("We recommend checking the dashboard for differences:"),
				ui.ColorCyan(fmt.Sprintf("%s/project/%s", appUrl, projectId)),
			)

			fmt.Println(ui.WarningBoxStyle.Render(warningMsg))

			confirm := false
			prompt := &survey.Confirm{
				Message: fmt.Sprintf("Are you sure you want to deploy %d secrets to the project?", len(secrets)),
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

		// 4. Push Secrets
		client := api.NewClient()
		s := ui.NewSpinner("Encrypting and deploying secrets...")
		s.Start()

		payload := map[string]interface{}{
			"secrets": secrets,
		}

		_, err = client.Post(fmt.Sprintf("/projects/%s/secrets", projectId), payload)
		if err != nil {
			s.Stop()
			fmt.Println(ui.ColorRed("Deploy failed."))
			fmt.Println(ui.ColorRed(fmt.Sprintf("Error: %v", err)))
			os.Exit(1)
		}
		
		s.Stop()
		fmt.Println(ui.ColorGreen(fmt.Sprintf("✔ Successfully deployed %d secrets!", len(secrets))))
	},
}

func init() {
	rootCmd.AddCommand(deployCmd)
	deployCmd.Flags().BoolVarP(&forceDeploy, "force", "f", false, "Deploy without confirmation")
	deployCmd.Flags().BoolVar(&dryRun, "dry-run", false, "Show what would be deployed without actually deploying")
	deployCmd.Flags().StringVarP(&projectFlag, "project", "p", "", "Project ID")
}
