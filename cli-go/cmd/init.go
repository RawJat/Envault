package cmd

import (
	"fmt"
	"os"

	"github.com/AlecAivazis/survey/v2"
	"github.com/DinanathDash/Envault/cli-go/internal/project"
	"github.com/DinanathDash/Envault/cli-go/internal/ui"
	"github.com/spf13/cobra"
)

var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize Envault in the current directory",
	Run: func(cmd *cobra.Command, args []string) {
		// Check config existing
		if _, err := os.Stat("envault.json"); err == nil {
			fmt.Println(ui.ColorYellow("envault.json already exists in this directory."))

			confirm := false
			prompt := &survey.Confirm{
				Message: "Do you want to overwrite it?",
				Default: false,
			}
			if err := survey.AskOne(prompt, &confirm); err != nil {
				// Handle Ctrl+C (terminal.InterruptErr)
				fmt.Println(ui.ColorYellow("\nOperation cancelled."))
				return
			}

			if !confirm {
				return
			}
		}

		projectId, err := project.SelectProject()
		if err != nil {
			if err == project.ErrUserCancelled {
				fmt.Println(ui.ColorYellow("\nOperation cancelled."))
				return
			}
			fmt.Println(ui.ColorRed(fmt.Sprintf("\nError: %v", err)))
			os.Exit(1)
		}

		if projectId == "" {
			// User cancelled or no selection
			return
		}

		// Write config
		cfg, err := project.ReadConfig()
		if err != nil {
			fmt.Println(ui.ColorRed(fmt.Sprintf("\nError reading existing config: %v", err)))
			os.Exit(1)
		}
		cfg.ProjectId = projectId
		if cfg.DefaultEnvironment == "" {
			cfg.DefaultEnvironment = defaultEnvName
		}
		if cfg.EnvironmentFiles == nil {
			cfg.EnvironmentFiles = map[string]string{}
		}

		if err := project.WriteConfig(cfg); err != nil {
			fmt.Println(ui.ColorRed(fmt.Sprintf("\nError writing envault.json: %v", err)))
			os.Exit(1)
		}

		fmt.Println(ui.ColorGreen(fmt.Sprintf("\n✔ Project linked! (ID: %s)", projectId)))
	},
}

func init() {
	rootCmd.AddCommand(initCmd)
}
