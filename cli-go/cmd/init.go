package cmd

import (
	"encoding/json"
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
		config := project.Config{ProjectId: projectId}
		data, err := json.MarshalIndent(config, "", "  ")
		if err != nil {
			fmt.Println(ui.ColorRed(fmt.Sprintf("\nError creating config JSON: %v", err)))
			os.Exit(1)
		}

		if err := os.WriteFile("envault.json", data, 0644); err != nil {
			fmt.Println(ui.ColorRed(fmt.Sprintf("\nError writing envault.json: %v", err)))
			os.Exit(1)
		}

		fmt.Println(ui.ColorGreen(fmt.Sprintf("\n✔ Project linked! (ID: %s)", projectId)))
	},
}

func init() {
	rootCmd.AddCommand(initCmd)
}
