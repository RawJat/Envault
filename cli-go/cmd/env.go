package cmd

import (
	"fmt"
	"strings"

	"github.com/DinanathDash/Envault/cli-go/internal/project"
	"github.com/DinanathDash/Envault/cli-go/internal/ui"
	"github.com/spf13/cobra"
)

var envMapFile string

var envCmd = &cobra.Command{
	Use:   "env",
	Short: "Manage local environment mappings",
}

var envMapCmd = &cobra.Command{
	Use:   "map",
	Short: "Map an environment to a local .env file",
	Run: func(cmd *cobra.Command, args []string) {
		target := strings.TrimSpace(envFlag)
		file := strings.TrimSpace(envMapFile)
		if target == "" || file == "" {
			fmt.Println(ui.ColorRed("Both --env and --file are required."))
			return
		}

		cfg, err := project.ReadConfig()
		if err != nil {
			fmt.Println(ui.ColorRed(fmt.Sprintf("Error reading config: %v", err)))
			return
		}
		if cfg.EnvironmentFiles == nil {
			cfg.EnvironmentFiles = map[string]string{}
		}
		cfg.EnvironmentFiles[target] = file
		if cfg.DefaultEnvironment == "" {
			cfg.DefaultEnvironment = target
		}

		if err := project.WriteConfig(cfg); err != nil {
			fmt.Println(ui.ColorRed(fmt.Sprintf("Error writing config: %v", err)))
			return
		}

		fmt.Println(ui.ColorGreen(fmt.Sprintf("✔ Mapped %s -> %s", target, file)))
	},
}

var envUnmapCmd = &cobra.Command{
	Use:   "unmap",
	Short: "Remove a local file mapping for an environment",
	Run: func(cmd *cobra.Command, args []string) {
		target := strings.TrimSpace(envFlag)
		if target == "" {
			fmt.Println(ui.ColorRed("--env is required."))
			return
		}

		cfg, err := project.ReadConfig()
		if err != nil {
			fmt.Println(ui.ColorRed(fmt.Sprintf("Error reading config: %v", err)))
			return
		}
		if cfg.EnvironmentFiles == nil {
			fmt.Println(ui.ColorYellow("No mappings found."))
			return
		}
		delete(cfg.EnvironmentFiles, target)

		if err := project.WriteConfig(cfg); err != nil {
			fmt.Println(ui.ColorRed(fmt.Sprintf("Error writing config: %v", err)))
			return
		}

		fmt.Println(ui.ColorGreen(fmt.Sprintf("✔ Removed mapping for %s", target)))
	},
}

var envDefaultCmd = &cobra.Command{
	Use:   "default",
	Short: "Set the default environment",
	Run: func(cmd *cobra.Command, args []string) {
		target := strings.TrimSpace(envFlag)
		if target == "" {
			fmt.Println(ui.ColorRed("--env is required."))
			return
		}

		cfg, err := project.ReadConfig()
		if err != nil {
			fmt.Println(ui.ColorRed(fmt.Sprintf("Error reading config: %v", err)))
			return
		}
		cfg.DefaultEnvironment = target
		if err := project.WriteConfig(cfg); err != nil {
			fmt.Println(ui.ColorRed(fmt.Sprintf("Error writing config: %v", err)))
			return
		}

		fmt.Println(ui.ColorGreen(fmt.Sprintf("✔ Default environment set to %s", target)))
	},
}

func init() {
	rootCmd.AddCommand(envCmd)
	envCmd.AddCommand(envMapCmd)
	envCmd.AddCommand(envUnmapCmd)
	envCmd.AddCommand(envDefaultCmd)

	envMapCmd.Flags().StringVar(&envMapFile, "file", "", "Local .env file path")
}
