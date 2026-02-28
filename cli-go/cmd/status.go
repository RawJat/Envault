package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/DinanathDash/Envault/cli-go/internal/api"
	"github.com/DinanathDash/Envault/cli-go/internal/project"
	"github.com/DinanathDash/Envault/cli-go/internal/ui"
	"github.com/spf13/cobra"
)

type meResponse struct {
	Email string `json:"email"`
}

type statusResponse struct {
	User    meResponse `json:"user"`
	Project struct {
		ID                 string   `json:"id"`
		Name               string   `json:"name"`
		Role               string   `json:"role"`
		Permissions        []string `json:"permissions"`
		DefaultEnvironment string   `json:"defaultEnvironment"`
	} `json:"project"`
}

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show current auth, project, and environment context",
	Run: func(cmd *cobra.Command, args []string) {
		client := api.NewClient()
		cfg, _ := project.ReadConfig()
		projectID := ensureProjectID()
		if projectID != "" && !isValidProjectID(projectID) {
			fmt.Println(ui.ColorRed("Invalid project ID. Expected a UUID."))
			os.Exit(1)
		}
		resolvedEnv := resolveTargetEnvironment()
		resolvedFile := resolveEnvFile(resolvedEnv, "")
		path := "/status"
		if projectID != "" {
			path = fmt.Sprintf("/status?projectId=%s", projectID)
		}

		statusBytes, err := client.Get(path)
		if err != nil {
			fmt.Println(ui.ColorRed("Status failed."))
			fmt.Println(ui.ColorRed(classifyAPIError(err)))
			os.Exit(1)
		}

		var status statusResponse
		if err := json.Unmarshal(statusBytes, &status); err != nil {
			fmt.Println(ui.ColorRed(fmt.Sprintf("Failed to parse /status response: %v", err)))
			os.Exit(1)
		}

		role := status.Project.Role
		if role == "" {
			role = "(unknown)"
		}
		defaultEnv := status.Project.DefaultEnvironment
		if defaultEnv == "" {
			defaultEnv = cfg.DefaultEnvironment
		}
		if defaultEnv == "" {
			defaultEnv = defaultEnvName
		}
		projectName := status.Project.Name
		if projectName == "" {
			projectName = "(not linked)"
		}

		permissions := "read-only"
		if len(status.Project.Permissions) > 0 {
			permissions = fmt.Sprintf("%v", status.Project.Permissions)
		}

		fmt.Printf("%s %s\n", ui.ColorBold("User:"), status.User.Email)
		fmt.Printf("%s %s\n", ui.ColorBold("Role:"), role)
		fmt.Printf("%s %s (%s)\n", ui.ColorBold("Project:"), projectName, projectID)
		fmt.Printf("%s %s\n", ui.ColorBold("Permissions:"), permissions)
		fmt.Printf("%s %s\n", ui.ColorBold("Default Environment:"), defaultEnv)
		fmt.Printf("%s %s\n", ui.ColorBold("Active Environment:"), resolvedEnv)
		fmt.Printf("%s %s\n", ui.ColorBold("Mapped Local File:"), resolvedFile)
	},
}

func init() {
	rootCmd.AddCommand(statusCmd)
	statusCmd.Flags().StringVarP(&projectFlag, "project", "p", "", "Project ID")
}
