package cmd

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/spf13/cobra"
)

var sdkCmd = &cobra.Command{
	Use:   "sdk",
	Short: "Manage the Envault TypeScript SDK",
}

var sdkInstallCmd = &cobra.Command{
	Use:   "install",
	Short: "Install the Envault TS SDK",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Installing Envault SDK...")
		runPkgManagerCommand("install", "@dinanathdash/envault-sdk")
	},
}

var sdkUpdateCmd = &cobra.Command{
	Use:   "update",
	Short: "Update the Envault TS SDK to the latest version",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Updating Envault SDK...")
		runPkgManagerCommand("install", "@dinanathdash/envault-sdk@latest")
	},
}

func init() {
	rootCmd.AddCommand(sdkCmd)
	sdkCmd.AddCommand(sdkInstallCmd)
	sdkCmd.AddCommand(sdkUpdateCmd)
}

func getPackageManager() string {
	if _, err := os.Stat("bun.lockb"); err == nil {
		return "bun"
	}
	if _, err := os.Stat("pnpm-lock.yaml"); err == nil {
		return "pnpm"
	}
	if _, err := os.Stat("yarn.lock"); err == nil {
		return "yarn"
	}
	return "npm"
}

func runPkgManagerCommand(baseCmd, pkg string) {
	pm := getPackageManager()
	var execArgs []string

	switch pm {
	case "npm":
		execArgs = []string{"install", pkg}
	case "yarn":
		execArgs = []string{"add", pkg}
	case "pnpm":
		execArgs = []string{"add", pkg}
	case "bun":
		execArgs = []string{"add", pkg}
	}

	cmd := exec.Command(pm, execArgs...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	err := cmd.Run()
	if err != nil {
		fmt.Printf("Failed to run %s. Please try installing manually.\n", pm)
		os.Exit(1)
	}

	fmt.Printf("\n[OK] %s %s installed successfully using %s.\n", pkg, baseCmd, pm)
}
