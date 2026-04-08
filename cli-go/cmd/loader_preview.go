package cmd

import (
	"fmt"
	"time"

	"github.com/DinanathDash/Envault/cli-go/internal/ui"
	"github.com/spf13/cobra"
)

var loaderPreviewCmd = &cobra.Command{
	Use:    "__loader-preview",
	Hidden: true,
	Short:  "Preview Envault CLI loader animations",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(ui.ColorBold("Envault Loader Preview"))
		fmt.Println(ui.ColorDim("Shows each loader theme for quick visual review."))
		fmt.Println(ui.ColorDim("Tip: set ENVAULT_NO_ANIMATION=1 to disable animations globally."))
		fmt.Println()

		runLoaderPreview(ui.LoaderThemeFetch, "VaultPulse fetching secrets...", 2400*time.Millisecond)
		runLoaderPreview(ui.LoaderThemeDeploy, "SealForge encrypting and deploying...", 2800*time.Millisecond)
		runLoaderPreview(ui.LoaderThemeCheck, "ScanGrid verifying status and checks...", 2400*time.Millisecond)
		runLoaderPreview(ui.LoaderThemeAuth, "Handshake waiting for browser approval...", 2400*time.Millisecond)
		runLoaderPreview(ui.LoaderThemeSync, "Syncing config and hooks...", 2400*time.Millisecond)
		runLoaderPreview(ui.LoaderThemePulse, "Default pulse loader...", 2400*time.Millisecond)

		fmt.Println()
		fmt.Println(ui.ColorGreen("[OK] Loader preview completed."))
	},
}

func runLoaderPreview(theme ui.LoaderTheme, message string, duration time.Duration) {
	fmt.Printf("%s %s\n", ui.ColorBold("Theme:"), string(theme))
	loader := ui.NewLoader(theme, message)
	if !loader.Enabled() {
		fmt.Println(ui.ColorYellow("  Animations disabled in this terminal session (non-TTY/CI/dumb TERM or ENVAULT_NO_ANIMATION=1)."))
		fmt.Println()
		return
	}

	loader.Start()
	time.Sleep(duration)
	loader.Stop()
	fmt.Println(ui.ColorGreen("  [OK] Preview rendered"))
	fmt.Println()
}

func init() {
	rootCmd.AddCommand(loaderPreviewCmd)
}
