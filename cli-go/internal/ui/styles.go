package ui

import (
	"fmt"

	"github.com/charmbracelet/lipgloss"
)

var (
	// Colors (Pastel/Softer Palette)
	ColorBlue          = lipgloss.NewStyle().Foreground(lipgloss.Color("#60A5FA")).Render // Blue 400
	ColorGreen         = lipgloss.NewStyle().Foreground(lipgloss.Color("#34D399")).Render // Emerald 400
	ColorRed           = lipgloss.NewStyle().Foreground(lipgloss.Color("#F87171")).Render // Red 400
	ColorYellow        = lipgloss.NewStyle().Foreground(lipgloss.Color("#FBBF24")).Render // Amber 400
	ColorCyan          = lipgloss.NewStyle().Foreground(lipgloss.Color("#22D3EE")).Render // Cyan 400
	ColorDim           = lipgloss.NewStyle().Foreground(lipgloss.Color("#9CA3AF")).Render // Gray 400
	ColorBold          = lipgloss.NewStyle().Bold(true).Render
	ColorCyanUnderline = lipgloss.NewStyle().Foreground(lipgloss.Color("#22D3EE")).Underline(true).Render
	ColorGreenBold     = lipgloss.NewStyle().Foreground(lipgloss.Color("#34D399")).Bold(true).Render

	// Boxes
	BoxStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("#34D399")).
			Padding(1).
			Margin(1).
			Align(lipgloss.Center)

	WarningBoxStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("#F87171")).
			Padding(1, 2).
			Margin(1).
			Width(70).
			Align(lipgloss.Center)
)

func NewSpinner(msg string) *Loader {
	return NewLoader(LoaderThemePulse, msg)
}

func RenderBox(title, content string, style lipgloss.Style) string {
	// Lipgloss handles multiline content well, but title usually goes on border?
	// Lipgloss doesn't have built-in title on border in the same way boxen does easily.
	// We can render title inside or use complex border rendering.
	// For simplicity, let's just render the content inside the box.
	// Boxen puts title on top border.
	// Let's just use content for now.

	// Actually, let's append title if needed manually or just let specific commands handle it.
	// Node implementation: title: 'Authentication Code', titleAlignment: 'center'

	// Keep it simple: helper to just return the style
	return style.Render(content)
}

// Logo
func ShowLogo() {
	logo := `
  ███████╗███╗   ██╗██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗
  ██╔════╝████╗  ██║██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝
  █████╗  ██╔██╗ ██║██║   ██║███████║██║   ██║██║     ██║   
  ██╔══╝  ██║╚██╗██║╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   
  ███████╗██║ ╚████║ ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   
  ╚══════╝╚═╝  ╚═══╝  ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   
`
	// Convert #10B981 to Lipgloss color
	colorStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#10B981")).Bold(true)
	fmt.Println(colorStyle.Render(logo))
	fmt.Println(ColorDim("  Secure Environment Variable Management\n"))
}
