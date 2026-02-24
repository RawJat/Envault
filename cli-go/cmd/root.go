package cmd

import (
	"fmt"
	"os"

	"github.com/DinanathDash/Envault/cli-go/internal/update"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile string
	envFlag string
	showVersion bool
	version = "dev"
	commit  = "none"
	date    = "unknown"
)

var rootCmd = &cobra.Command{
	Use:   "envault",
	Short: "Envault CLI - Securely manage your environment variables",
	Long: `Envault CLI is a tool to securely manage your environment variables
across your development workflow.`,
	Run: func(cmd *cobra.Command, args []string) {
		if showVersion {
			fmt.Printf("envault v%s (%s) built at %s\n", version, commit, date)
			return
		}
		_ = cmd.Help()
	},
	PersistentPostRun: func(cmd *cobra.Command, args []string) {
		// Only check for updates if it's not the internal update check command itself
		if cmd.Name() != "__update_check" {
			update.ShouldNotifyIfUpdateAvailable(version)
		}
	},
}

func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.envault/config.toml)")
	rootCmd.PersistentFlags().StringVarP(&envFlag, "env", "e", "", "Target environment (development, preview, production, etc.)")
	rootCmd.PersistentFlags().BoolVarP(&showVersion, "version", "v", false, "Print the version number of Envault CLI")

	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(updateCheckCmd)
}

var updateCheckCmd = &cobra.Command{
	Use:    "__update_check",
	Hidden: true,
	Run: func(cmd *cobra.Command, args []string) {
		update.FetchLatestAndCache()
	},
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the version number of Envault CLI",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("envault v%s (%s) built at %s\n", version, commit, date)
	},
}

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		home, err := os.UserHomeDir()
		cobra.CheckErr(err)

		configDir := home + "/.envault"
		if _, err := os.Stat(configDir); os.IsNotExist(err) {
			_ = os.Mkdir(configDir, 0700)
		}

		viper.AddConfigPath(configDir)
		viper.SetConfigType("toml")
		viper.SetConfigName("config")
	}

	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err == nil {
		fmt.Fprintln(os.Stderr, "Using config file:", viper.ConfigFileUsed())
	}
}
