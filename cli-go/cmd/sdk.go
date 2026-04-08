package cmd

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/DinanathDash/Envault/cli-go/internal/ui"
	"github.com/spf13/cobra"
)

var sdkGlobal bool
var sdkLocal bool

var sdkCmd = &cobra.Command{
	Use:   "sdk",
	Short: "Manage the Envault TypeScript SDK",
}

var sdkInstallCmd = &cobra.Command{
	Use:   "install",
	Short: "Install the Envault TS SDK",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Installing Envault SDK...")

		local, global := resolveSDKInstallModes()

		if local {
			localLoader := ui.NewLoader(ui.LoaderThemeDeploy, "Installing SDK in local project...")
			localLoader.Start()
			if err := runPkgManagerCommand("install", "@dinanathdash/envault-sdk"); err != nil {
				localLoader.Stop()
				fmt.Printf("Failed to run %s. Please try installing manually.\n", getPackageManager())
				os.Exit(1)
			}
			localLoader.Stop()
		}

		if global {
			globalLoader := ui.NewLoader(ui.LoaderThemeDeploy, "Installing SDK globally via npm...")
			globalLoader.Start()
			if err := runNpmGlobalInstall("@dinanathdash/envault-sdk"); err != nil {
				globalLoader.Stop()
				fmt.Printf("Failed to globally install SDK via npm: %v\n", err)
				os.Exit(1)
			}
			globalLoader.Stop()
			fmt.Println("\n[OK] Global SDK install completed via npm.")
		}
	},
}

var sdkUpdateCmd = &cobra.Command{
	Use:   "update",
	Short: "Update the Envault TS SDK to the latest version",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Updating Envault SDK...")

		local, global := resolveSDKInstallModes()

		if local {
			localLoader := ui.NewLoader(ui.LoaderThemeDeploy, "Updating local SDK package...")
			localLoader.Start()
			if err := runPkgManagerCommand("update", "@dinanathdash/envault-sdk@latest"); err != nil {
				localLoader.Stop()
				fmt.Printf("Failed to run %s. Please try updating manually.\n", getPackageManager())
				os.Exit(1)
			}
			localLoader.Stop()
		}

		if global {
			globalLoader := ui.NewLoader(ui.LoaderThemeDeploy, "Updating global SDK package...")
			globalLoader.Start()
			if err := runNpmGlobalInstall("@dinanathdash/envault-sdk@latest"); err != nil {
				globalLoader.Stop()
				fmt.Printf("Failed to globally update SDK via npm: %v\n", err)
				os.Exit(1)
			}
			globalLoader.Stop()
			fmt.Println("\n[OK] Global SDK update completed via npm.")
		}
	},
}

func init() {
	rootCmd.AddCommand(sdkCmd)
	sdkCmd.AddCommand(sdkInstallCmd)
	sdkCmd.AddCommand(sdkUpdateCmd)

	sdkInstallCmd.Flags().BoolVarP(&sdkLocal, "local", "l", false, "Install SDK into the current project")
	sdkInstallCmd.Flags().BoolVarP(&sdkGlobal, "global", "g", false, "Install SDK globally via npm")

	sdkUpdateCmd.Flags().BoolVarP(&sdkLocal, "local", "l", false, "Update SDK in the current project")
	sdkUpdateCmd.Flags().BoolVarP(&sdkGlobal, "global", "g", false, "Update SDK globally via npm")
}

func resolveSDKInstallModes() (local bool, global bool) {
	if sdkLocal || sdkGlobal {
		return sdkLocal, sdkGlobal
	}

	if _, err := os.Stat("package.json"); err == nil {
		return true, false
	}

	return false, true
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

func runPkgManagerCommand(baseCmd, pkg string) error {
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
		return err
	}

	fmt.Printf("\n[OK] %s %s installed successfully using %s.\n", pkg, baseCmd, pm)
	return nil
}
