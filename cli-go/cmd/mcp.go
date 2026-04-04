package cmd

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"github.com/spf13/cobra"
)

var globalInstall bool
var localInstall bool
var mcpConfigOnly bool

var mcpCmd = &cobra.Command{
	Use:   "mcp",
	Short: "Manage Envault MCP integrations for AI assistants",
}

var mcpInstallCmd = &cobra.Command{
	Use:   "install",
	Short: "Install Envault MCP globally (Claude/Cursor) or locally (.vscode)",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Configuring AI Clients for Envault MCP...")

		if !globalInstall && !localInstall {
			globalInstall = true
			localInstall = true
		}

		if globalInstall {
			fmt.Println("\n--- Global Installations ---")
			installClaudeDesktop()
			installGlobalCline()
		}

		if localInstall {
			fmt.Println("\n--- Local Workspace Installations ---")
			installLocalVSCodeMCP()
		}

		fmt.Println("\n[OK] Installed MCP Server integrations! Please restart your AI client if it's currently open.")
	},
}

var mcpUpdateCmd = &cobra.Command{
	Use:   "update",
	Short: "Update the Envault MCP Server integration",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Updating Envault MCP Server...")

		if !mcpConfigOnly {
			if err := runNpmGlobalInstall("@dinanathdash/envault-mcp-server@latest"); err != nil {
				fmt.Printf("[WARN] Global MCP package update failed: %v\n", err)
				fmt.Println("[WARN] Continuing with config refresh. You can run `npm install -g @dinanathdash/envault-mcp-server@latest` manually.")
			} else {
				fmt.Println("[OK] Updated global MCP package to latest.")
			}
		}

		fmt.Println("Refreshing MCP client configurations...")

		if !globalInstall && !localInstall {
			globalInstall = true
			localInstall = true
		}

		if globalInstall {
			installClaudeDesktop()
			installGlobalCline()
		}

		if localInstall {
			installLocalVSCodeMCP()
		}

		fmt.Println("\n[OK] Envault MCP update completed.")
	},
}

func init() {
	rootCmd.AddCommand(mcpCmd)
	mcpCmd.AddCommand(mcpInstallCmd)
	mcpCmd.AddCommand(mcpUpdateCmd)

	mcpInstallCmd.Flags().BoolVarP(&globalInstall, "global", "g", false, "Install globally for Claude Desktop and global VS Code/Cursor")
	mcpInstallCmd.Flags().BoolVarP(&localInstall, "local", "l", false, "Install locally in the current project (.vscode/mcp.json)")

	mcpUpdateCmd.Flags().BoolVarP(&globalInstall, "global", "g", false, "Update global installations")
	mcpUpdateCmd.Flags().BoolVarP(&localInstall, "local", "l", false, "Update local project installations")
	mcpUpdateCmd.Flags().BoolVar(&mcpConfigOnly, "config-only", false, "Only refresh MCP configuration files without npm global package update")
}

func runNpmGlobalInstall(pkg string) error {
	cmd := exec.Command("npm", "install", "-g", pkg)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func getClaudeConfigPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	switch runtime.GOOS {
	case "darwin":
		return filepath.Join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json")
	case "windows":
		return filepath.Join(os.Getenv("APPDATA"), "Claude", "claude_desktop_config.json")
	default:
		return filepath.Join(home, ".config", "Claude", "claude_desktop_config.json")
	}
}

func getGlobalClineConfigPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	switch runtime.GOOS {
	case "darwin":
		return filepath.Join(home, "Library", "Application Support", "Code", "User", "globalStorage", "rooveterinaryinc.roo-cline", "settings", "cline_mcp_settings.json")
	case "windows":
		return filepath.Join(os.Getenv("APPDATA"), "Code", "User", "globalStorage", "rooveterinaryinc.roo-cline", "settings", "cline_mcp_settings.json")
	default:
		return filepath.Join(home, ".config", "Code", "User", "globalStorage", "rooveterinaryinc.roo-cline", "settings", "cline_mcp_settings.json")
	}
}

func getLocalVSCodeMCPPath() string {
	cwd, err := os.Getwd()
	if err != nil {
		return ""
	}
	return filepath.Join(cwd, ".vscode", "mcp.json")
}

func readOrCreateJSON(path string) map[string]interface{} {
	data := make(map[string]interface{})

	dir := filepath.Dir(path)
	_ = os.MkdirAll(dir, 0755)

	file, err := os.Open(path)
	if err == nil {
		defer file.Close()
		bytes, _ := io.ReadAll(file)
		_ = json.Unmarshal(bytes, &data)
	}
	return data
}

func injectClaudeConfig(config map[string]interface{}) {
	servers, ok := config["mcpServers"].(map[string]interface{})
	if !ok || servers == nil {
		servers = make(map[string]interface{})
		config["mcpServers"] = servers
	}

	servers["envault"] = map[string]interface{}{
		"command": "npx",
		"args": []string{
			"-y",
			"@dinanathdash/envault-mcp-server@latest",
		},
		"env": map[string]string{},
	}
}

func injectVSCodeMCPConfig(config map[string]interface{}) {
	servers, ok := config["servers"].(map[string]interface{})
	if !ok || servers == nil {
		servers = make(map[string]interface{})
		config["servers"] = servers
	}
	
	if _, ok := config["inputs"]; !ok {
		config["inputs"] = []interface{}{}
	}

	servers["envault"] = map[string]interface{}{
		"command": "npx",
		"args": []string{
			"-y",
			"@dinanathdash/envault-mcp-server@latest",
		},
		"type": "stdio",
	}
}

func writeJSON(path string, config map[string]interface{}) {
	bytes, err := json.MarshalIndent(config, "", "\t")
	if err == nil {
		_ = os.WriteFile(path, bytes, 0644)
	}
}

func installClaudeDesktop() {
	path := getClaudeConfigPath()
	if path == "" {
		return
	}
	config := readOrCreateJSON(path)
	injectClaudeConfig(config)
	writeJSON(path, config)
	fmt.Printf("[OK] Added Envault MCP to Claude Desktop (%s)\n", path)
}

func installGlobalCline() {
	path := getGlobalClineConfigPath()
	if path == "" {
		return
	}
	config := readOrCreateJSON(path)
	injectClaudeConfig(config)
	writeJSON(path, config)
	fmt.Printf("[OK] Added Envault MCP to Global Cline/RooCode (%s)\n", path)
}

func installLocalVSCodeMCP() {
	path := getLocalVSCodeMCPPath()
	if path == "" {
		return
	}
	config := readOrCreateJSON(path)
	injectVSCodeMCPConfig(config)
	writeJSON(path, config)
	fmt.Printf("[OK] Added Envault MCP to Local VS Code Config (%s)\n", path)
}
