package cmd

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"runtime"

	"github.com/DinanathDash/Envault/cli-go/internal/api"
	"github.com/DinanathDash/Envault/cli-go/internal/ui"
	"github.com/spf13/cobra"
)

var runCmd = &cobra.Command{
	Use:   "run -- <command>",
	Short: "Run a command with secrets injected from Envault",
	Args: func(cmd *cobra.Command, args []string) error {
		if len(args) == 0 {
			return fmt.Errorf("missing command to run")
		}
		return nil
	},
	Run: func(cmd *cobra.Command, args []string) {
		projectID := ensureProjectID()
		if projectID == "" {
			fmt.Println(ui.ColorYellow("No project linked."))
			projectID = selectProjectAndPersistOrExit()
			fmt.Println(ui.ColorGreen(fmt.Sprintf("✔ Project linked! (ID: %s)\n", projectID)))
		}
		if !isValidProjectID(projectID) {
			fmt.Println(ui.ColorRed("Invalid project ID. Expected a UUID."))
			os.Exit(1)
		}

		targetEnv := resolveTargetEnvironment()
		client := api.NewClient()
		path := fmt.Sprintf("/projects/%s/secrets?environment=%s", projectID, url.QueryEscape(targetEnv))
		respBytes, err := client.Get(path)
		if err != nil {
			fmt.Println(ui.ColorRed("Run failed."))
			fmt.Println(ui.ColorRed(classifyAPIError(err)))
			os.Exit(1)
		}

		var secretsResp SecretsResponse
		if err := json.Unmarshal(respBytes, &secretsResp); err != nil {
			fmt.Println(ui.ColorRed(fmt.Sprintf("Error parsing response: %v", err)))
			os.Exit(1)
		}

		runTarget := args[0]
		runArgs := args[1:]

		var command *exec.Cmd
		if runtime.GOOS == "windows" {
			allArgs := append([]string{"/c", runTarget}, runArgs...)
			command = exec.Command("cmd", allArgs...)
		} else {
			command = exec.Command(runTarget, runArgs...)
		}

		command.Env = os.Environ()
		for _, s := range secretsResp.Secrets {
			command.Env = append(command.Env, fmt.Sprintf("%s=%s", s.Key, s.Value))
		}
		command.Stdout = os.Stdout
		command.Stderr = os.Stderr
		command.Stdin = os.Stdin

		if err := command.Run(); err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok {
				os.Exit(exitErr.ExitCode())
			}
			fmt.Println(ui.ColorRed(fmt.Sprintf("Failed to execute command: %v", err)))
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(runCmd)
	runCmd.Flags().StringVarP(&projectFlag, "project", "p", "", "Project ID")
}
