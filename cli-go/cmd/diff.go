package cmd

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"sort"
	"strings"

	"github.com/DinanathDash/Envault/cli-go/internal/api"
	"github.com/DinanathDash/Envault/cli-go/internal/ui"
	"github.com/joho/godotenv"
	"github.com/spf13/cobra"
)

type diffResult struct {
	Additions     []string
	Deletions     []string
	Modifications []string
	Unchanged     int
	LocalCount    int
	RemoteCount   int
}

var diffCmd = &cobra.Command{
	Use:   "diff",
	Short: "Compare local env file with remote vault secrets",
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
		targetFile := resolveEnvFile(targetEnv, fileFlag)

		result, err := computeDiff(projectID, targetEnv, targetFile)
		if err != nil {
			fmt.Println(ui.ColorRed("Diff failed."))
			fmt.Println(ui.ColorRed(err.Error()))
			os.Exit(1)
		}

		fmt.Printf("%s %s (%s)\n", ui.ColorBold("Environment:"), targetEnv, projectID)
		fmt.Printf("%s %s\n", ui.ColorBold("Local file:"), targetFile)

		for _, k := range result.Additions {
			fmt.Println(ui.ColorGreen("+ " + k))
		}
		for _, k := range result.Deletions {
			fmt.Println(ui.ColorRed("- " + k))
		}
		for _, k := range result.Modifications {
			fmt.Println(ui.ColorYellow("~ " + k))
		}

		if len(result.Additions) == 0 && len(result.Deletions) == 0 && len(result.Modifications) == 0 {
			fmt.Println(ui.ColorGreen("No differences found."))
		}

		fmt.Printf("\n%s %d additions, %d deletions, %d modifications, %d unchanged\n",
			ui.ColorBold("Summary:"),
			len(result.Additions),
			len(result.Deletions),
			len(result.Modifications),
			result.Unchanged,
		)
	},
}

func computeDiff(projectID, targetEnv, targetFile string) (diffResult, error) {
	localEnv, err := readEnvFile(targetFile)
	if err != nil {
		return diffResult{}, err
	}

	client := api.NewClient()
	path := fmt.Sprintf("/projects/%s/secrets?environment=%s", projectID, url.QueryEscape(targetEnv))
	respBytes, err := client.Get(path)
	if err != nil {
		return diffResult{}, fmt.Errorf(classifyAPIError(err))
	}

	var remote SecretsResponse
	if err := json.Unmarshal(respBytes, &remote); err != nil {
		return diffResult{}, fmt.Errorf("failed to parse remote secrets: %w", err)
	}

	remoteMap := make(map[string]string, len(remote.Secrets))
	for _, s := range remote.Secrets {
		remoteMap[s.Key] = s.Value
	}

	res := diffResult{LocalCount: len(localEnv), RemoteCount: len(remoteMap)}

	for k, lv := range localEnv {
		rv, exists := remoteMap[k]
		if !exists {
			res.Additions = append(res.Additions, k)
			continue
		}
		if rv != lv {
			res.Modifications = append(res.Modifications, k)
		} else {
			res.Unchanged++
		}
	}

	for k := range remoteMap {
		if _, exists := localEnv[k]; !exists {
			res.Deletions = append(res.Deletions, k)
		}
	}

	sort.Strings(res.Additions)
	sort.Strings(res.Deletions)
	sort.Strings(res.Modifications)

	return res, nil
}

func readEnvFile(path string) (map[string]string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("error reading %s", path)
	}

	var validLines []string
	lines := strings.Split(string(content), "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		if strings.Contains(trimmed, "=") {
			validLines = append(validLines, line)
		}
	}

	parsed, err := godotenv.Unmarshal(strings.Join(validLines, "\n"))
	if err != nil {
		return nil, fmt.Errorf("error parsing %s", path)
	}

	return parsed, nil
}

func init() {
	rootCmd.AddCommand(diffCmd)
	diffCmd.Flags().StringVarP(&projectFlag, "project", "p", "", "Project ID")
	diffCmd.Flags().StringVar(&fileFlag, "file", "", "Local .env file path override")
}
