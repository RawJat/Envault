package cmd

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"strings"

	"github.com/AlecAivazis/survey/v2"
	"github.com/DinanathDash/Envault/cli-go/internal/api"
	"github.com/DinanathDash/Envault/cli-go/internal/ui"
	"github.com/joho/godotenv"
	"github.com/spf13/cobra"
)

var forceDeploy bool
var dryRun bool

var deployCmd = &cobra.Command{
	Use:     "deploy",
	Aliases: []string{"push"},
	Short:   "Push secrets from .env to Envault",
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

		// 2. Read .env manually to be lenient
		content, err := os.ReadFile(targetFile)
		if err != nil {
			if os.IsNotExist(err) {
				fmt.Println(ui.ColorRed(fmt.Sprintf("Local env file not found: %s", targetFile)))
				fmt.Println(ui.ColorYellow("Provide a file explicitly with --file, or map one with `envault env map --env <name> --file <path>`."))
			} else {
				fmt.Println(ui.ColorRed(fmt.Sprintf("Error reading %s: %v", targetFile, err)))
			}
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
			fmt.Println(ui.ColorYellow(fmt.Sprintf("No secrets found in %s", targetFile)))
			return
		}

		secrets := []Secret{}
		for k, v := range envMap {
			secrets = append(secrets, Secret{Key: k, Value: v})
		}

		if diff, err := computeDiff(projectId, targetEnv, targetFile); err == nil {
			fmt.Printf(
				"%s %d additions, %d deletions, %d modifications, %d unchanged\n",
				ui.ColorBold("Diff Summary:"),
				len(diff.Additions),
				len(diff.Deletions),
				len(diff.Modifications),
				diff.Unchanged,
			)
			for _, k := range diff.Additions {
				fmt.Println(ui.ColorGreen("+ " + k))
			}
			for _, k := range diff.Deletions {
				fmt.Println(ui.ColorRed("- " + k))
			}
			for _, k := range diff.Modifications {
				fmt.Println(ui.ColorYellow("~ " + k))
			}
		}

		if dryRun {
			fmt.Println(ui.ColorBlue(fmt.Sprintf("Dry Run: Would deploy %d secrets to %s (%s)", len(secrets), projectId, targetEnv)))
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
				"You are about to ", ui.ColorRed("DEPLOY"), fmt.Sprintf(" local variables from %s to your project: ", targetFile),
				ui.ColorCyan(projectName),
				"Existing secrets in the project will be ", ui.ColorRed("OVERWRITTEN"), " by values in your .env.",
				ui.ColorDim("We recommend checking the dashboard for differences:"),
				ui.ColorCyan(fmt.Sprintf("%s/project/%s", appUrl, projectId)),
			)

			fmt.Println(ui.WarningBoxStyle.Render(warningMsg))

			confirm := false
			prompt := &survey.Confirm{
				Message: fmt.Sprintf("Deploy %d secrets to %s environment?", len(secrets), targetEnv),
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
		s := ui.NewSpinner(fmt.Sprintf("Encrypting and deploying secrets (%s)...", targetEnv))
		s.Start()

		payload := map[string]interface{}{
			"secrets": secrets,
		}

		path := fmt.Sprintf("/projects/%s/secrets?environment=%s", projectId, url.QueryEscape(targetEnv))
		_, err = client.Post(path, payload)
		if err != nil {
			s.Stop()
			fmt.Println(ui.ColorRed("Deploy failed."))
			fmt.Println(ui.ColorRed(classifyAPIError(err)))
			os.Exit(1)
		}

		s.Stop()
		fmt.Println(ui.ColorGreen(fmt.Sprintf("✔ Successfully deployed %d secrets to %s!", len(secrets), targetEnv)))
	},
}

func init() {
	rootCmd.AddCommand(deployCmd)
	deployCmd.Flags().BoolVarP(&forceDeploy, "force", "f", false, "Deploy without confirmation")
	deployCmd.Flags().BoolVar(&dryRun, "dry-run", false, "Show what would be deployed without actually deploying")
	deployCmd.Flags().StringVarP(&projectFlag, "project", "p", "", "Project ID")
	deployCmd.Flags().StringVar(&fileFlag, "file", "", "Local .env file path override")
}
