package cmd

import (
	"fmt"
	"os"
	"strings"

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

		// Automatically install the audit pre-commit hook so the user never
		// has to remember the separate --install-hook command.
		alreadyInstalled, _, hookErr := installPreCommitHook()
		switch {
		case hookErr != nil && strings.Contains(hookErr.Error(), "no .git directory"):
			// No git repo yet - print a clear, actionable reminder instead of silently skipping.
			// The user may git init later and forget to add protection.
			fmt.Println(ui.ColorYellow("  ⚠ No git repository detected."))
			fmt.Println(ui.ColorYellow("    After running git init, protect your secrets by running:"))
			fmt.Println(ui.ColorCyan("      envault audit --install-hook"))
		case hookErr != nil:
			// Any other filesystem error - surface as a soft warning.
			fmt.Println(ui.ColorYellow(fmt.Sprintf("  ⚠ Could not install pre-commit hook: %v", hookErr)))
		case alreadyInstalled:
			fmt.Println(ui.ColorDim("  ✔ envault audit pre-commit hook already installed."))
		default:
			fmt.Println(ui.ColorGreen("  ✔ envault audit pre-commit hook installed - your commits are now protected."))
		}
	},
}

func init() {
	rootCmd.AddCommand(initCmd)
}
