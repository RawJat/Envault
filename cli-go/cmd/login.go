package cmd

import (
	"fmt"
	"os"

	"github.com/DinanathDash/Envault/cli-go/internal/auth"
	"github.com/DinanathDash/Envault/cli-go/internal/ui"
	"github.com/spf13/cobra"
)

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Authenticate with Envault",
	Run: func(cmd *cobra.Command, args []string) {
		ui.ShowLogo()
		if err := auth.Login(); err != nil {
			fmt.Printf("Error: %v\n", err)
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(loginCmd)
}
