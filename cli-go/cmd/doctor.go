package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/DinanathDash/Envault/cli-go/internal/ui"
	"github.com/spf13/cobra"
)

type doctorCheck struct {
	name   string
	status string
	detail string
	fix    []string
}

type brewFormulaInfo struct {
	Formulae []struct {
		Versions struct {
			Stable string `json:"stable"`
		} `json:"versions"`
		Installed []struct {
			Version string `json:"version"`
		} `json:"installed"`
	} `json:"formulae"`
}

var doctorCmd = &cobra.Command{
	Use:   "doctor",
	Short: "Run local diagnostics and suggested fixes",
	Long:  "Diagnose local Envault CLI installation and common Homebrew version mismatch issues.",
	Run: func(cmd *cobra.Command, args []string) {
		exePath, err := os.Executable()
		if err != nil {
			fmt.Fprintln(os.Stderr, ui.ColorRed("Doctor failed: could not resolve executable path."))
			os.Exit(1)
		}
		exePath, _ = filepath.Abs(exePath)
		normalizedPath := filepath.ToSlash(exePath)
		installSource := detectInstallSource(normalizedPath)

		checks := []doctorCheck{
			{
				name:   "envault version",
				status: "ok",
				detail: fmt.Sprintf("envault v%s", version),
			},
			{
				name:   "executable path",
				status: "ok",
				detail: exePath,
			},
			{
				name:   "install source",
				status: "ok",
				detail: installSource,
			},
		}

		if installSource == "homebrew-cask" {
			checks = append(checks, doctorCheck{
				name:   "homebrew cask",
				status: "warn",
				detail: "Cask install is deprecated. Envault now uses Homebrew formula only.",
				fix: []string{
					"brew uninstall --cask dinanathdash/envault/envault",
					"brew tap dinanathdash/envault",
					"brew install --formula envault",
				},
			})
		}

		if isHomebrewPath(normalizedPath) {
			checks = append(checks, runHomebrewChecks(version)...)
		}

		hasIssue := false
		fmt.Println(ui.ColorBold("Envault Doctor"))
		fmt.Println(ui.ColorDim("Checks local installation and update readiness."))
		fmt.Println()

		for _, c := range checks {
			prefix := "[OK]"
			colorize := ui.ColorGreen
			if c.status == "warn" {
				prefix = "[WARN]"
				colorize = ui.ColorYellow
				hasIssue = true
			}
			if c.status == "error" {
				prefix = "[ERR]"
				colorize = ui.ColorRed
				hasIssue = true
			}
			fmt.Printf("%s %s: %s\n", colorize(prefix), c.name, c.detail)
			if len(c.fix) > 0 {
				fmt.Println(ui.ColorDim("  Suggested fix:"))
				for _, line := range c.fix {
					fmt.Printf("    %s\n", line)
				}
			}
		}

		if hasIssue {
			fmt.Println()
			fmt.Println(ui.ColorYellow("Doctor found actionable issues."))
			os.Exit(1)
		}

		fmt.Println()
		fmt.Println(ui.ColorGreen("No issues detected."))
	},
}

func runHomebrewChecks(currentVersion string) []doctorCheck {
	checks := []doctorCheck{}

	if _, err := exec.LookPath("brew"); err != nil {
		checks = append(checks, doctorCheck{
			name:   "homebrew binary",
			status: "warn",
			detail: "Install appears Homebrew-based but `brew` is not on PATH.",
		})
		return checks
	}

	formulaInfo, err := readBrewFormulaInfo()
	if err != nil {
		checks = append(checks, doctorCheck{
			name:   "homebrew formula metadata",
			status: "warn",
			detail: fmt.Sprintf("Could not read formula metadata: %v", err),
			fix: []string{
				"brew update",
				"brew tap dinanathdash/envault",
			},
		})
		return checks
	}

	latest := "unknown"
	installed := "not installed"
	if len(formulaInfo.Formulae) > 0 {
		latest = strings.TrimSpace(formulaInfo.Formulae[0].Versions.Stable)
		if len(formulaInfo.Formulae[0].Installed) > 0 {
			installed = strings.TrimSpace(formulaInfo.Formulae[0].Installed[0].Version)
		}
	}

	checks = append(checks, doctorCheck{
		name:   "homebrew formula",
		status: "ok",
		detail: fmt.Sprintf("installed=%s latest=%s", installed, latest),
	})

	if latest != "" && latest != "unknown" && normalizeVersion(latest) != normalizeVersion(currentVersion) {
		checks = append(checks, doctorCheck{
			name:   "version parity",
			status: "warn",
			detail: fmt.Sprintf("Current CLI version (%s) differs from formula stable (%s).", currentVersion, latest),
			fix: []string{
				"brew update",
				"brew untap dinanathdash/envault || true",
				"brew tap dinanathdash/envault",
				"brew upgrade --formula envault",
			},
		})
	}

	caskInstalled, caskErr := isBrewCaskInstalled()
	if caskErr == nil && caskInstalled {
		checks = append(checks, doctorCheck{
			name:   "deprecated cask detected",
			status: "warn",
			detail: "Homebrew cask install is deprecated for Envault.",
			fix: []string{
				"brew uninstall --cask dinanathdash/envault/envault",
				"brew install --formula envault",
			},
		})
	}

	return checks
}

func readBrewFormulaInfo() (*brewFormulaInfo, error) {
	cmd := exec.Command("brew", "info", "--json=v2", "--formula", "envault")
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var info brewFormulaInfo
	if err := json.Unmarshal(out, &info); err != nil {
		return nil, err
	}
	return &info, nil
}

func isBrewCaskInstalled() (bool, error) {
	cmd := exec.Command("brew", "list", "--cask", "--versions", "envault")
	out, err := cmd.Output()
	if err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			if len(strings.TrimSpace(string(ee.Stderr))) > 0 {
				return false, nil
			}
		}
		return false, nil
	}
	return strings.TrimSpace(string(out)) != "", nil
}

func detectInstallSource(path string) string {
	if strings.Contains(path, "/Caskroom/") {
		return "homebrew-cask"
	}
	if strings.Contains(path, "/Cellar/") || strings.Contains(path, "linuxbrew") {
		return "homebrew-formula"
	}
	if strings.Contains(path, "npm") || strings.Contains(path, "pnpm") || strings.Contains(path, "yarn") || strings.Contains(path, "bun") {
		return "node-package-manager"
	}
	if strings.Contains(path, "/go/bin/") {
		return "go-install"
	}
	if strings.Contains(path, "/usr/local/bin") || strings.Contains(path, "/usr/bin") || strings.Contains(path, "/opt/") {
		return "system-binary"
	}
	return "unknown"
}

func isHomebrewPath(path string) bool {
	return strings.Contains(path, "brew") || strings.Contains(path, "Cellar") || strings.Contains(path, "linuxbrew") || strings.Contains(path, "Caskroom")
}

func normalizeVersion(v string) string {
	return strings.TrimPrefix(strings.TrimSpace(v), "v")
}

func init() {
	rootCmd.AddCommand(doctorCmd)
}
